const User = require('../models/User');
const Document = require('../models/Document');
const Medication = require('../models/Medication');
const Appointment = require('../models/Appointment');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Timeline = require('../models/Timeline');
const documentService = require('../services/documentService');
const { successResponse } = require('../utils/apiResponse');
const { NotFoundError } = require('../utils/errors');

class ProfileController {
  async getProfile(req, res, next) {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        throw new NotFoundError('User not found');
      }
      return successResponse(res, 'User profile retrieved', { user: user.toJSON() }, 200);
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req, res, next) {
    try {
      const { name, dateOfBirth, gender, preferredLanguage } = req.body;
      const user = await User.findById(req.user.id);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      if (name) user.name = name.trim();
      if (dateOfBirth) user.dateOfBirth = new Date(dateOfBirth);
      if (gender !== undefined) user.gender = gender;
      if (preferredLanguage && ['en', 'te'].includes(preferredLanguage)) {
        user.preferredLanguage = preferredLanguage;
      }

      await user.save();

      return successResponse(res, 'Profile updated successfully', { user: user.toJSON() }, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mock ABHA / ABDM Sandbox Operations (Phase 7.2)
   */
  async linkMockAbha(req, res, next) {
    try {
      const { abhaAddress, abhaNumber } = req.body;
      const user = await User.findById(req.user.id);
      if (!user) throw new NotFoundError('User not found');

      user.mockAbha = {
        abhaAddress: abhaAddress || `${user.email.split('@')[0]}@abdm`,
        abhaNumber: abhaNumber || '91-4567-8901-2345',
        isLinked: true,
        linkedAt: new Date(),
        syncStatus: 'LINKED',
      };

      await user.save();
      return successResponse(res, 'Mock ABHA identity linked successfully (Sandbox Mode)', { user: user.toJSON() }, 200);
    } catch (error) {
      next(error);
    }
  }

  async unlinkMockAbha(req, res, next) {
    try {
      const user = await User.findById(req.user.id);
      if (!user) throw new NotFoundError('User not found');

      user.mockAbha = {
        abhaAddress: '',
        abhaNumber: '',
        isLinked: false,
        linkedAt: null,
        syncStatus: 'DISCONNECTED',
      };

      await user.save();
      return successResponse(res, 'Mock ABHA identity unlinked', { user: user.toJSON() }, 200);
    } catch (error) {
      next(error);
    }
  }

  async getSampleAbhaRecords(req, res, next) {
    try {
      const fhirService = require('../services/fhirService');
      const samples = fhirService.getSampleAbhaRecords();
      return successResponse(res, 'Sample ABDM Sandbox records retrieved', { records: samples }, 200);
    } catch (error) {
      next(error);
    }
  }

  async importSampleAbhaRecord(req, res, next) {
    try {
      const { recordId } = req.body;
      const fhirService = require('../services/fhirService');
      const medicalExtractionService = require('../services/medicalExtractionService');
      const samples = fhirService.getSampleAbhaRecords();
      const sample = samples.find((s) => s.id === recordId) || samples[0];

      const newDoc = new Document({
        userId: req.user.id,
        fileName: `${sample.title}.pdf`,
        fileUrl: `/api/documents/pending/file`,
        storagePath: `abdm-imported/${sample.id}.pdf`,
        fileType: 'application/pdf',
        fileSize: 125000,
        documentType: sample.type || 'Lab Report',
        status: 'PROCESSED',
        extractedText: `ABDM IMPORTED RECORD [${sample.source}]\nFacility: ${sample.facility}\nDate: ${sample.recordDate}\n\n${sample.contentSummary}`,
        structuredData: {
          patientName: req.user.name,
          documentDate: new Date(sample.recordDate),
          healthcareProvider: sample.facility,
          diagnoses: [],
          reviewStatus: 'VERIFIED',
          confidenceScore: 1.0,
          labResults: sample.simulatedLabResults || [],
          prescriptions: sample.simulatedPrescriptions || [],
          dischargeSummary: {
            admissionDate: null,
            dischargeDate: null,
            procedures: [],
            followUpInstructions: [],
          },
          allergies: [],
        },
      });

      const { summary, teluguSummary } = medicalExtractionService.generateSummaries({
        extractedText: newDoc.extractedText,
        structuredData: newDoc.structuredData,
        documentType: newDoc.documentType,
      });

      newDoc.summary = summary;
      newDoc.teluguSummary = teluguSummary;
      newDoc.fileUrl = `/api/documents/${newDoc._id}/file`;
      await newDoc.save();

      // Add to Health Timeline
      await Timeline.create({
        userId: req.user.id,
        eventType: 'DOCUMENT',
        title: `Imported via Mock ABHA: ${newDoc.documentType}`,
        description: `Imported verified health record from ${sample.facility} via ABDM Sandbox.`,
        date: newDoc.structuredData.documentDate || new Date(),
        referenceId: newDoc._id,
        metadata: {
          documentId: newDoc._id,
          fileName: newDoc.fileName,
          source: 'ABDM_SANDBOX',
        },
      });

      return successResponse(res, 'Record imported into HealthCopilot Vault', { document: newDoc }, 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Complete Patient Data Deletion (HIPAA / GDPR / Privacy requirement)
   */
  async deleteAccount(req, res, next) {
    try {
      const userId = req.user.id;

      // 1. Delete all user documents & physical files
      const userDocs = await Document.find({ userId });
      for (const doc of userDocs) {
        try {
          await documentService.deleteDocument(doc._id, userId);
        } catch (e) {
          console.warn(`Error deleting document during account purge: ${doc._id}`);
        }
      }

      // 2. Delete conversations and messages
      const conversations = await Conversation.find({ userId });
      const convIds = conversations.map((c) => c._id);
      await Message.deleteMany({ conversationId: { $in: convIds } });
      await Conversation.deleteMany({ userId });

      // 3. Delete medications & appointments
      await Medication.deleteMany({ userId });
      await Appointment.deleteMany({ userId });

      // 4. Delete timeline events
      await Timeline.deleteMany({ userId });

      // 5. Delete User record
      await User.findByIdAndDelete(userId);

      return successResponse(
        res,
        'Account and all associated healthcare records have been permanently erased.',
        {},
        200
      );
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ProfileController();
