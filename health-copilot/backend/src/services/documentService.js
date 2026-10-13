const fs = require('fs');
const path = require('path');
const config = require('../config/env');
const Document = require('../models/Document');
const Timeline = require('../models/Timeline');
const User = require('../models/User');
const aiServiceClient = require('./aiServiceClient');
const medicalExtractionService = require('./medicalExtractionService');
const fhirService = require('./fhirService');
const { processDocumentFile } = require('../../../document-service/src/processing/documentProcessor');
const { NotFoundError, ForbiddenError, BadRequestError } = require('../utils/errors');

class DocumentService {
  /**
   * Resolves the verified physical server path for a document, preventing path traversal.
   * Checks user-isolated directory first, then legacy/seed path.
   */
  resolvePhysicalPath(doc) {
    if (!doc) return null;

    const rawFileName = doc.storagePath || doc.fileUrl || '';
    const fileName = path.basename(rawFileName);
    if (!fileName) return null;

    // 1. Check user-specific subdirectory: uploads/<userId>/<fileName>
    const userSpecificPath = path.resolve(config.uploadDir, doc.userId.toString(), fileName);
    if (userSpecificPath.startsWith(config.uploadDir) && fs.existsSync(userSpecificPath)) {
      return userSpecificPath;
    }

    // 2. Check storagePath directly if defined
    if (doc.storagePath) {
      const explicitPath = path.resolve(config.uploadDir, doc.storagePath);
      if (explicitPath.startsWith(config.uploadDir) && fs.existsSync(explicitPath)) {
        return explicitPath;
      }
    }

    // 3. Fallback to flat upload directory: uploads/<fileName> (for demo/seed files)
    const legacyPath = path.resolve(config.uploadDir, fileName);
    if (legacyPath.startsWith(config.uploadDir) && fs.existsSync(legacyPath)) {
      return legacyPath;
    }

    return null;
  }

  /**
   * Creates a new document record from an uploaded file and triggers processing.
   * Strictly associates ownership with the authenticated userId.
   */
  async uploadDocument({ userId, file, documentType = 'Other' }) {
    if (!file) {
      throw new BadRequestError('No file provided for upload');
    }

    const cleanFilename = path.basename(file.filename);
    const storagePath = path.join(userId.toString(), cleanFilename);

    const newDoc = new Document({
      userId,
      fileName: file.originalname,
      fileUrl: '/api/documents/pending/file',
      storagePath,
      fileType: file.mimetype,
      fileSize: file.size,
      documentType,
      status: 'UPLOADED',
    });

    // Canonical authenticated file streaming URL
    newDoc.fileUrl = `/api/documents/${newDoc._id}/file`;
    await newDoc.save();

    // Run processing asynchronously or immediately
    this.processDocument(newDoc._id, userId).catch((err) => {
      console.error(`Document processing failed in background for ${newDoc._id}:`, err);
    });

    return newDoc;
  }

  /**
   * Processes an uploaded document: text extraction, chunking, OCR classification,
   * structured medical extraction, and bilingual AI summarization.
   * Strictly enforces patient ownership before any processing.
   */
  async processDocument(documentId, userId) {
    const doc = await Document.findOne({ _id: documentId, userId });
    if (!doc) {
      throw new NotFoundError('Document not found');
    }

    doc.status = 'PROCESSING';
    await doc.save();

    const physicalPath = this.resolvePhysicalPath(doc);
    if (!physicalPath) {
      doc.status = 'FAILED';
      doc.failureReason = "We couldn't locate the file on disk for processing.";
      await doc.save();
      return doc;
    }

    try {
      // 1. Text extraction & chunking via document-service (Tesseract OCR / PDF parser)
      const procResult = await processDocumentFile(physicalPath, doc.fileType, doc.fileSize);

      if (!procResult.success) {
        doc.status = 'FAILED';
        doc.failureReason = procResult.error || "We couldn't extract readable text from this document.";
        await doc.save();
        return doc;
      }

      doc.extractedText = procResult.extractedText;
      doc.chunks = procResult.chunks;

      // 2. Structured Clinical Intelligence & Bilingual Health Summaries
      const extractionResult = await medicalExtractionService.processMedicalContent(
        procResult.extractedText,
        doc.documentType
      );

      if (doc.documentType === 'Other' && extractionResult.classifiedType) {
        doc.documentType = extractionResult.classifiedType;
      }

      doc.structuredData = extractionResult.structuredData;
      doc.summary = extractionResult.summary;
      doc.teluguSummary = extractionResult.teluguSummary;
      doc.status = 'PROCESSED';
      await doc.save();

      // 3. Automatically synchronize extracted Appointments & Doctor Consultations
      const Appointment = require('../models/Appointment');
      const extractedApts = doc.structuredData.appointments || [];
      const extractedCons = doc.structuredData.consultations || [];

      // Process extracted scheduled appointments
      for (const item of extractedApts) {
        if (item.doctorName && item.date) {
          const aptDate = new Date(item.date);
          if (!isNaN(aptDate.getTime())) {
            const existing = await Appointment.findOne({
              userId,
              doctorName: item.doctorName.trim(),
              date: aptDate,
              type: 'APPOINTMENT',
            });

            if (!existing) {
              const newApt = await Appointment.create({
                userId,
                doctorName: item.doctorName.trim(),
                specialty: item.specialty || 'General Practitioner',
                date: aptDate,
                time: item.time || '10:00 AM',
                location: item.location || '',
                reason: item.reason || `Follow-up visit (${doc.fileName})`,
                notes: item.notes || `Auto-extracted from document: ${doc.fileName}`,
                status: 'UPCOMING',
                type: 'APPOINTMENT',
                sourceDocumentId: doc._id,
                autoExtracted: true,
              });

              await Timeline.create({
                userId,
                eventType: 'APPOINTMENT',
                title: `Scheduled Visit: ${newApt.doctorName}`,
                description: `Specialty: ${newApt.specialty}. Time: ${newApt.time}. Auto-scheduled from document "${doc.fileName}".`,
                date: newApt.date,
                referenceId: newApt._id,
                metadata: {
                  appointmentId: newApt._id,
                  documentId: doc._id,
                  type: 'APPOINTMENT',
                  autoExtracted: true,
                },
              });
            }
          }
        }
      }

      // Process extracted doctor consultations
      for (const item of extractedCons) {
        if (item.doctorName && item.date) {
          const conDate = new Date(item.date);
          if (!isNaN(conDate.getTime())) {
            const existing = await Appointment.findOne({
              userId,
              doctorName: item.doctorName.trim(),
              date: conDate,
              type: 'CONSULTATION',
            });

            if (!existing) {
              const isPast = conDate < new Date();
              const newCon = await Appointment.create({
                userId,
                doctorName: item.doctorName.trim(),
                specialty: item.specialty || 'General Practitioner',
                date: conDate,
                time: item.time || '10:00 AM',
                location: item.location || '',
                reason: item.reason || `Clinical Consultation (${doc.fileName})`,
                notes: item.notes || `Clinical consultation details extracted from: ${doc.fileName}`,
                status: isPast ? 'COMPLETED' : 'UPCOMING',
                type: 'CONSULTATION',
                sourceDocumentId: doc._id,
                autoExtracted: true,
              });

              await Timeline.create({
                userId,
                eventType: 'APPOINTMENT',
                title: `Doctor Consultation: ${newCon.doctorName}`,
                description: `Specialty: ${newCon.specialty}. Time: ${newCon.time}. ${newCon.notes}`,
                date: newCon.date,
                referenceId: newCon._id,
                metadata: {
                  appointmentId: newCon._id,
                  documentId: doc._id,
                  type: 'CONSULTATION',
                  autoExtracted: true,
                },
              });
            }
          }
        }
      }

      // 4. Automatically record to Health Timeline (idempotent / deduplicated)
      await Timeline.deleteMany({ referenceId: doc._id, userId });
      const countsDesc = [];
      if (doc.structuredData.labResults?.length) countsDesc.push(`${doc.structuredData.labResults.length} lab values`);
      if (doc.structuredData.prescriptions?.length) countsDesc.push(`${doc.structuredData.prescriptions.length} prescription(s)`);
      if (extractedApts.length) countsDesc.push(`${extractedApts.length} appointment(s)`);
      if (extractedCons.length) countsDesc.push(`${extractedCons.length} consultation(s)`);

      await Timeline.create({
        userId,
        eventType: 'DOCUMENT',
        title: `Uploaded ${doc.documentType}`,
        description: `Analyzed "${doc.fileName}". ${countsDesc.length > 0 ? countsDesc.join(', ') + ' extracted.' : 'Clinical documentation processed.'}`,
        date: doc.structuredData?.documentDate || doc.createdAt,
        referenceId: doc._id,
        metadata: {
          documentId: doc._id,
          fileName: doc.fileName,
          documentType: doc.documentType,
          reviewStatus: doc.structuredData.reviewStatus,
          appointmentsCount: extractedApts.length,
          consultationsCount: extractedCons.length,
        },
      });

      return doc;
    } catch (error) {
      console.error(`Error processing document ${documentId}:`, error);
      doc.status = 'FAILED';
      doc.failureReason = error.message || 'Processing failed unexpectedly';
      await doc.save();
      return doc;
    }
  }

  /**
   * User validation and correction of structured medical data (Phase 2.4)
   */
  async updateStructuredData(documentId, userId, updateData) {
    const doc = await this.getDocumentById(documentId, userId);

    if (updateData.labResults) {
      doc.structuredData.labResults = updateData.labResults;
    }
    if (updateData.prescriptions) {
      doc.structuredData.prescriptions = updateData.prescriptions;
    }
    if (updateData.diagnoses) {
      doc.structuredData.diagnoses = updateData.diagnoses;
    }
    if (updateData.documentDate) {
      doc.structuredData.documentDate = new Date(updateData.documentDate);
    }
    if (updateData.healthcareProvider !== undefined) {
      doc.structuredData.healthcareProvider = updateData.healthcareProvider;
    }

    doc.structuredData.reviewStatus = 'VERIFIED';

    // Refresh summaries reflecting verified data
    const { summary, teluguSummary } = medicalExtractionService.generateSummaries({
      extractedText: doc.extractedText,
      structuredData: doc.structuredData,
      documentType: doc.documentType,
    });

    doc.summary = summary;
    doc.teluguSummary = teluguSummary;
    await doc.save();

    // Synchronize verified prescriptions to Medication vault
    const Medication = require('../models/Medication');
    for (const rx of doc.structuredData.prescriptions || []) {
      if (rx.medicationName && rx.isCurrentMedication) {
        const existing = await Medication.findOne({ userId, name: rx.medicationName.trim() });
        if (!existing) {
          await Medication.create({
            userId,
            name: rx.medicationName.trim(),
            dosage: rx.dosage || 'As prescribed',
            frequency: rx.frequency || 'Once daily',
            instructions: rx.instructions || '',
            prescribedBy: rx.prescribingDoctor || doc.structuredData.healthcareProvider || '',
            sourceDocumentId: doc._id,
            verificationStatus: 'VERIFIED',
            status: 'ACTIVE',
          });
        }
      }
    }

    return doc;
  }

  /**
   * Export document and patient record as an HL7 FHIR R4 Bundle (Phase 7.1)
   */
  async getFhirBundle(documentId, userId) {
    const doc = await this.getDocumentById(documentId, userId);
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User record not found');
    }

    return fhirService.mapToFhirBundle(user, doc);
  }

  /**
   * Gets all documents belonging to the authenticated user.
   */
  async getUserDocuments(userId, { type, search, sort = 'desc' } = {}) {
    const query = { userId };

    if (type && type !== 'all') {
      query.documentType = type;
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [{ fileName: regex }, { extractedText: regex }];
    }

    const sortOption = sort === 'asc' ? { createdAt: 1 } : { createdAt: -1 };

    return await Document.find(query)
      .sort(sortOption)
      .select('fileName fileUrl fileType fileSize documentType status summary teluguSummary structuredData failureReason createdAt');
  }

  /**
   * Gets a specific document by ID, strictly enforcing patient ownership.
   */
  async getDocumentById(documentId, userId) {
    if (!documentId || !userId) {
      throw new NotFoundError('Document not found');
    }

    // STRICT OWNER CHECK: findOne with BOTH _id and userId
    const doc = await Document.findOne({ _id: documentId, userId });
    if (!doc) {
      const otherDoc = await Document.findById(documentId).select('_id userId');
      if (otherDoc && otherDoc.userId.toString() !== userId.toString()) {
        throw new ForbiddenError('You do not have permission to access this document.');
      }
      throw new NotFoundError('Document not found');
    }

    return doc;
  }

  /**
   * Retrieves document and verified physical file path for secure streaming.
   * Strictly enforces patient ownership before serving any file content.
   */
  async getDocumentFile(documentId, userId) {
    const doc = await this.getDocumentById(documentId, userId);
    let filePath = this.resolvePhysicalPath(doc);

    if (!filePath || !fs.existsSync(filePath)) {
      // Graceful on-demand synthesis for ABDM imported records or ephemeral hosting restarts
      try {
        const { generateClinicalReportPdf } = require('../utils/pdfGenerator');
        const userDir = path.resolve(config.uploadDir, userId.toString());
        if (!fs.existsSync(userDir)) {
          fs.mkdirSync(userDir, { recursive: true });
        }
        const safeName = (doc.fileName || 'Clinical_Report.pdf').replace(/[^a-zA-Z0-9_\-\.]/g, '_');
        const generatedPath = path.resolve(userDir, safeName);

        const pdfBuffer = generateClinicalReportPdf({
          hospitalName: doc.structuredData?.healthcareProvider || 'Accredited Clinical Facility',
          patientName: doc.structuredData?.patientName || 'Patient',
          reportTitle: doc.fileName ? doc.fileName.replace(/\.pdf$/i, '') : doc.documentType || 'Clinical Medical Report',
          reportDate: (doc.structuredData?.documentDate || doc.createdAt).toLocaleDateString(),
          provenance: 'ABDM-SANDBOX-DIGITAL-RECORD',
          labResults: doc.structuredData?.labResults || [],
          prescriptions: doc.structuredData?.prescriptions || [],
        });

        fs.writeFileSync(generatedPath, pdfBuffer);
        filePath = generatedPath;
        doc.fileType = 'application/pdf';
      } catch (genErr) {
        console.error('Failed to synthesize clinical PDF:', genErr);
        throw new NotFoundError('Physical file could not be found on the server');
      }
    }

    return { doc, filePath };
  }

  /**
   * Deletes a document and its physical file.
   * Verifies ownership strictly BEFORE removing file from disk.
   */
  async deleteDocument(documentId, userId) {
    // 1. Strictly verify ownership BEFORE deleting physical file
    const doc = await this.getDocumentById(documentId, userId);

    // 2. Delete physical file from disk if it exists
    const physicalPath = this.resolvePhysicalPath(doc);
    if (physicalPath && fs.existsSync(physicalPath)) {
      try {
        fs.unlinkSync(physicalPath);
      } catch (err) {
        console.warn(`Could not delete file from disk: ${physicalPath}`, err.message);
      }
    }

    // 3. Remove associated Timeline entries and linked auto-extracted appointments/consultations
    await Timeline.deleteMany({ referenceId: doc._id, userId });
    const Appointment = require('../models/Appointment');
    const autoApts = await Appointment.find({ sourceDocumentId: doc._id, userId });
    for (const a of autoApts) {
      await Timeline.deleteMany({ referenceId: a._id });
    }
    await Appointment.deleteMany({ sourceDocumentId: doc._id, userId });

    // 4. Secure delete document record enforcing ownership
    await Document.findOneAndDelete({ _id: documentId, userId });

    return { message: 'Document and associated data deleted successfully.' };
  }
}

module.exports = new DocumentService();
