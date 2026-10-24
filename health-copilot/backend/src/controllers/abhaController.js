const abhaService = require('../services/abhaService');
const { successResponse } = require('../utils/apiResponse');
const { BadRequestError } = require('../utils/errors');

class AbhaController {
  async getMyProfile(req, res, next) {
    try {
      const profile = await abhaService.getMyAbhaProfile(req.user.id);
      return successResponse(res, 'ABHA profile retrieved successfully', profile, 200);
    } catch (error) {
      next(error);
    }
  }

  async search(req, res, next) {
    try {
      const { identifier } = req.params;
      if (!identifier) {
        throw new BadRequestError('ABHA identifier is required for search.');
      }

      const result = await abhaService.searchIdentifier(req.user.id, identifier);
      return successResponse(res, result.message, result, 200);
    } catch (error) {
      next(error);
    }
  }

  async requestConsent(req, res, next) {
    try {
      const { targetIdentifier, purpose, purposeDescription, scope, durationDays } = req.body;
      if (!targetIdentifier) {
        throw new BadRequestError('Target patient ABHA identifier is required to request consent.');
      }

      const result = await abhaService.requestConsent(req.user.id, {
        targetIdentifier,
        purpose,
        purposeDescription,
        scope,
        durationDays,
        ipAddress: req.ip || req.headers['x-forwarded-for'] || '',
      });

      return successResponse(res, result.message, result, 201);
    } catch (error) {
      next(error);
    }
  }

  async getConsentRequests(req, res, next) {
    try {
      const requests = await abhaService.getConsentRequests(req.user.id);
      return successResponse(res, 'Consent requests retrieved', requests, 200);
    } catch (error) {
      next(error);
    }
  }

  async grantConsent(req, res, next) {
    try {
      const { consentId } = req.params;
      const result = await abhaService.grantConsent(
        req.user.id,
        consentId,
        req.ip || req.headers['x-forwarded-for'] || ''
      );
      return successResponse(res, result.message, result, 200);
    } catch (error) {
      next(error);
    }
  }

  async rejectConsent(req, res, next) {
    try {
      const { consentId } = req.params;
      const result = await abhaService.rejectConsent(
        req.user.id,
        consentId,
        req.ip || req.headers['x-forwarded-for'] || ''
      );
      return successResponse(res, result.message, result, 200);
    } catch (error) {
      next(error);
    }
  }

  async revokeConsent(req, res, next) {
    try {
      const { consentId } = req.params;
      const result = await abhaService.revokeConsent(
        req.user.id,
        consentId,
        req.ip || req.headers['x-forwarded-for'] || ''
      );
      return successResponse(res, result.message, result, 200);
    } catch (error) {
      next(error);
    }
  }

  async getAuthorizedDocuments(req, res, next) {
    try {
      const { patientId } = req.params;
      const documents = await abhaService.getAuthorizedDocuments(req.user.id, patientId);
      return successResponse(res, 'Authorized documents retrieved', { documents }, 200);
    } catch (error) {
      next(error);
    }
  }

  async getAuthorizedDocumentFile(req, res, next) {
    try {
      const { patientId, documentId } = req.params;
      const { doc, filePath } = await abhaService.getAuthorizedDocumentFile(
        req.user.id,
        patientId,
        documentId
      );

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

  async linkOfficial(req, res, next) {
    try {
      const { abhaNumber, abhaAddress } = req.body;
      const result = await abhaService.linkOfficialAbha(req.user.id, {
        abhaNumber,
        abhaAddress,
      });
      return successResponse(res, result.message, result, 200);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AbhaController();
