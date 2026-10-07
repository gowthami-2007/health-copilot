const fs = require('fs');
const path = require('path');
const Document = require('../models/Document');
const Timeline = require('../models/Timeline');
const aiServiceClient = require('./aiServiceClient');
const { processDocumentFile } = require('../../../document-service/src/processing/documentProcessor');
const { NotFoundError, ForbiddenError, BadRequestError } = require('../utils/errors');

class DocumentService {
  /**
   * Creates a new document record from an uploaded file and triggers processing.
   */
  async uploadDocument({ userId, file, documentType = 'Other' }) {
    const fileUrl = `/uploads/${file.filename}`;

    const newDoc = await Document.create({
      userId,
      fileName: file.originalname,
      fileUrl,
      fileType: file.mimetype,
      fileSize: file.size,
      documentType,
      status: 'UPLOADED',
    });

    // Run processing asynchronously or immediately
    this.processDocument(newDoc._id, userId).catch((err) => {
      console.error(`Document processing failed in background for ${newDoc._id}:`, err);
    });

    return newDoc;
  }

  /**
   * Processes an uploaded document: text extraction, chunking, and AI summarization.
   */
  async processDocument(documentId, userId) {
    const doc = await Document.findOne({ _id: documentId, userId });
    if (!doc) {
      throw new NotFoundError('Document not found');
    }

    doc.status = 'PROCESSING';
    await doc.save();

    const physicalPath = path.resolve(__dirname, '../../uploads', path.basename(doc.fileUrl));

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
    const doc = await Document.findById(documentId);
    if (!doc) {
      throw new NotFoundError('Document not found');
    }

    // STRICT PATIENT DATA ISOLATION CHECK
    if (doc.userId.toString() !== userId.toString()) {
      throw new ForbiddenError('You do not have permission to access this document.');
    }

    return doc;
  }

  /**
   * Deletes a document and its physical file.
   */
  async deleteDocument(documentId, userId) {
    const doc = await this.getDocumentById(documentId, userId);

    // Delete physical file from uploads folder
    const physicalPath = path.resolve(__dirname, '../../uploads', path.basename(doc.fileUrl));
    if (fs.existsSync(physicalPath)) {
      try {
        fs.unlinkSync(physicalPath);
      } catch (err) {
        console.warn(`Could not delete file from disk: ${physicalPath}`);
      }
    }

    // Remove from Timeline
    await Timeline.deleteMany({ referenceId: doc._id });

    // Delete document record
    await Document.findByIdAndDelete(documentId);

    return { message: 'Document and associated data deleted successfully.' };
  }
}

module.exports = new DocumentService();
