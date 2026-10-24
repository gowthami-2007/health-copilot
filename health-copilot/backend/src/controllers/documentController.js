const path = require('path');
const fs = require('fs');
const documentService = require('../services/documentService');
const { validateDocumentUpload } = require('../validators/documentValidator');
const { successResponse } = require('../utils/apiResponse');

class DocumentController {
  async upload(req, res, next) {
    try {
      const { documentType } = validateDocumentUpload(req);
      const doc = await documentService.uploadDocument({
        userId: req.user.id,
        file: req.file,
        documentType,
        patientProfileId: req.body.patientProfileId || null,
      });

      return successResponse(res, 'Document uploaded successfully', doc, 201);
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
