const path = require('path');
const fs = require('fs');
const documentService = require('../services/documentService');
const prescriptionVisionService = require('../services/prescriptionVisionService');
const {
  validateFile,
  validatePrescriptionImage,
} = require('../../../document-service/src/validation/fileValidator');
const {
  classifyDocument,
} = require('../../../document-service/src/validation/medicalClassifier');
const { validateDocumentUpload } = require('../validators/documentValidator');
const { successResponse } = require('../utils/apiResponse');
const {
  BadRequestError,
  NonMedicalDocumentError,
  DocumentClassificationUncertainError,
  DocumentUnreadableError,
} = require('../utils/errors');

class DocumentController {
  /**
   * Safe helper to clean up rejected/unauthorized uploaded files from disk.
   */
  cleanupTempFile(file) {
    if (file && file.path && fs.existsSync(file.path)) {
      try {
        fs.unlinkSync(file.path);
      } catch (e) {
        // Ignore unlink failure if already removed
      }
    }
  }

  async upload(req, res, next) {
    try {
      const file = req.file;
      if (!file) {
        throw new BadRequestError('No file provided for upload');
      }

      const { documentType } = validateDocumentUpload(req);

      // 1. Deep file integrity & signature check
      const formatValidation = validateFile(file);
      if (!formatValidation.isValid) {
        this.cleanupTempFile(file);
        if (
          formatValidation.error.includes('empty') ||
          formatValidation.error.includes('signature') ||
          formatValidation.error.includes('truncated')
        ) {
          throw new DocumentUnreadableError(formatValidation.error);
        }
        throw new BadRequestError(formatValidation.error);
      }

      // 2. AI-Powered Medical Document Classification
      // Rejects non-medical documents BEFORE saving to database or running OCR/summaries
      const classification = await classifyDocument({
        filePath: file.path,
        buffer: file.buffer,
        mimeType: file.mimetype,
        originalName: file.originalname,
        documentType,
        fileSize: file.size,
      });

      if (classification.status === 'not_health_related') {
        this.cleanupTempFile(file);
        throw new NonMedicalDocumentError(classification.errorMessage);
      }

      if (classification.status === 'uncertain') {
        this.cleanupTempFile(file);
        throw new DocumentClassificationUncertainError(classification.errorMessage);
      }

      if (classification.status === 'unreadable') {
        this.cleanupTempFile(file);
        throw new DocumentUnreadableError(classification.errorMessage);
      }

      // 3. Document confirmed health-related: proceed to vault upload and extraction pipeline
      const doc = await documentService.uploadDocument({
        userId: req.user.id,
        file: req.file,
        documentType,
        patientProfileId: req.body.patientProfileId || null,
      });

      return successResponse(res, 'Document uploaded successfully', doc, 201);
    } catch (error) {
      this.cleanupTempFile(req.file);
      next(error);
    }
  }

  /**
   * Pre-validation endpoint to verify if a file is health-related before final upload.
   */
  async validate(req, res, next) {
    try {
      const file = req.file;
      if (!file) {
        throw new BadRequestError('No file provided for validation');
      }

      const classification = await classifyDocument({
        filePath: file.path,
        buffer: file.buffer,
        mimeType: file.mimetype,
        originalName: file.originalname,
        documentType: req.body.documentType || 'Other',
        fileSize: file.size,
      });

      this.cleanupTempFile(file);

      if (classification.status === 'health_related') {
        return successResponse(
          res,
          'Medical document detected. Processing can continue.',
          {
            classification: 'health_related',
            confidence: classification.confidence,
            detectedType: classification.detectedType,
            message: 'Medical document detected. Processing can continue.',
          },
          200
        );
      }

      if (classification.status === 'not_health_related') {
        throw new NonMedicalDocumentError(classification.errorMessage);
      }

      if (classification.status === 'uncertain') {
        throw new DocumentClassificationUncertainError(classification.errorMessage);
      }

      throw new DocumentUnreadableError(classification.errorMessage);
    } catch (error) {
      this.cleanupTempFile(req.file);
      next(error);
    }
  }

  /**
   * Analyzes an uploaded prescription image using multimodal AI vision.
   * Extracts structured clinical data without prior text-only OCR garbling.
   */
  async analyzePrescription(req, res, next) {
    try {
      const file = req.file;
      if (!file) {
        throw new BadRequestError('Prescription image is required. Please upload a JPG, PNG, or WEBP image.');
      }

      // Deep validate file type, signature, and size
      const validation = validatePrescriptionImage(file);
      if (!validation.isValid) {
        this.cleanupTempFile(file);
        if (validation.error.includes('empty') || validation.error.includes('truncated')) {
          throw new DocumentUnreadableError(validation.error);
        }
        throw new BadRequestError(validation.error);
      }

      // Verify medical relevance of image before multimodal extraction
      const classification = await classifyDocument({
        filePath: file.path,
        buffer: file.buffer,
        mimeType: file.mimetype,
        originalName: file.originalname,
        documentType: 'Prescription',
        fileSize: file.size,
      });

      if (classification.status === 'not_health_related') {
        this.cleanupTempFile(file);
        throw new NonMedicalDocumentError(classification.errorMessage);
      }

      if (classification.status === 'unreadable') {
        this.cleanupTempFile(file);
        throw new DocumentUnreadableError(classification.errorMessage);
      }

      // Analyze image via multimodal vision model
      const extraction = await prescriptionVisionService.analyzePrescriptionImage({
        filePath: file.path,
        buffer: file.buffer,
        mimeType: file.mimetype,
      });

      // Provide reference to uploaded image path so frontend can preview or save
      const relativeFilePath = file.filename
        ? `/api/documents/temp-preview/${encodeURIComponent(file.filename)}`
        : null;

      return successResponse(
        res,
        'Prescription analysis completed. Please review the extracted information.',
        {
          ...extraction,
          tempFileName: file.filename || null,
          tempFileUrl: relativeFilePath,
          originalName: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype,
        },
        200
      );
    } catch (error) {
      this.cleanupTempFile(req.file);
      next(error);
    }
  }

  /**
   * Saves a user-reviewed & verified prescription image along with its confirmed clinical data.

   */
  async saveReviewedPrescription(req, res, next) {
    try {
      const file = req.file;
      if (!file) {
        throw new BadRequestError('Prescription image file is required to save to vault.');
      }

      const doc = await documentService.saveReviewedPrescriptionDocument({
        userId: req.user.id,
        file,
        prescriptionData: req.body.prescriptionData,
        patientProfileId: req.body.patientProfileId || null,
      });

      return successResponse(res, 'Prescription saved to medical vault successfully', doc, 201);
    } catch (error) {
      next(error);
    }
  }

  async getAll(req, res, next) {
    try {
      const { type, search, sort, patientProfileId } = req.query;
      const documents = await documentService.getUserDocuments(req.user.id, {
        type,
        search,
        sort,
        patientProfileId: patientProfileId || null,
      });

      return successResponse(res, 'Documents retrieved successfully', { documents }, 200);
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const doc = await documentService.getDocumentById(req.params.id, req.user.id);
      return successResponse(res, 'Document details retrieved successfully', doc, 200);
    } catch (error) {
      next(error);
    }
  }

  async getFile(req, res, next) {
    try {
      const { doc, filePath } = await documentService.getDocumentFile(req.params.id, req.user.id);

      res.setHeader('Content-Type', doc.fileType || 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.fileName)}"`);
      res.removeHeader('X-Frame-Options');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Cache-Control', 'private, max-age=86400');

      return res.sendFile(filePath);
    } catch (error) {
      next(error);
    }
  }

  async downloadFile(req, res, next) {
    try {
      const { doc, filePath } = await documentService.getDocumentFile(req.params.id, req.user.id);

      return res.download(filePath, doc.fileName);
    } catch (error) {
      next(error);
    }
  }

  async process(req, res, next) {
    try {
      const doc = await documentService.processDocument(req.params.id, req.user.id);
      return successResponse(res, 'Document processed successfully', doc, 200);
    } catch (error) {
      next(error);
    }
  }

  async updateStructuredData(req, res, next) {
    try {
      const doc = await documentService.updateStructuredData(req.params.id, req.user.id, req.body);
      return successResponse(res, 'Structured clinical data verified and saved', doc, 200);
    } catch (error) {
      next(error);
    }
  }

  async getFhirBundle(req, res, next) {
    try {
      const fhirBundle = await documentService.getFhirBundle(req.params.id, req.user.id);
      return res.status(200).json(fhirBundle);
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const result = await documentService.deleteDocument(req.params.id, req.user.id);
      return successResponse(res, result.message, {}, 200);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new DocumentController();
