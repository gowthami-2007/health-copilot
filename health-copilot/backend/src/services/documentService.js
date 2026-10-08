const fs = require('fs');
const path = require('path');
const config = require('../config/env');
const Document = require('../models/Document');
const Timeline = require('../models/Timeline');
const aiServiceClient = require('./aiServiceClient');
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
   * Processes an uploaded document: text extraction, chunking, and AI summarization.
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
      // 1. Text extraction & chunking via document-service
      const procResult = await processDocumentFile(physicalPath, doc.fileType, doc.fileSize);

      if (!procResult.success) {
        doc.status = 'FAILED';
        doc.failureReason = procResult.error || "We couldn't extract readable text from this document.";
        await doc.save();
        return doc;
      }

      doc.extractedText = procResult.extractedText;
      doc.chunks = procResult.chunks;

      // 2. Generate structured medical summary via AI service
      const summaryResult = await aiServiceClient.summarizeDocument({
        extractedText: procResult.extractedText,
        documentType: doc.documentType,
      });

      doc.summary = summaryResult;
      doc.status = 'PROCESSED';
      await doc.save();

      // 3. Automatically record to Health Timeline
      await Timeline.create({
        userId,
        eventType: 'DOCUMENT',
        title: `Uploaded ${doc.documentType}`,
        description: `Analyzed "${doc.fileName}" with AI summary generated.`,
        date: doc.createdAt,
        referenceId: doc._id,
        metadata: {
          documentId: doc._id,
          fileName: doc.fileName,
          documentType: doc.documentType,
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
      .select('fileName fileUrl fileType fileSize documentType status summary failureReason createdAt');
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
    const filePath = this.resolvePhysicalPath(doc);

    if (!filePath || !fs.existsSync(filePath)) {
      throw new NotFoundError('Physical file could not be found on the server');
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

    // 3. Remove associated Timeline entries
    await Timeline.deleteMany({ referenceId: doc._id, userId });

    // 4. Secure delete document record enforcing ownership
    await Document.findOneAndDelete({ _id: documentId, userId });

    return { message: 'Document and associated data deleted successfully.' };
  }
}

module.exports = new DocumentService();
