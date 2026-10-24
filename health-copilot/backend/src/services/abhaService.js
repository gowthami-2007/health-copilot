const mongoose = require('mongoose');
const User = require('../models/User');
const Document = require('../models/Document');
const Consent = require('../models/Consent');
const documentService = require('./documentService');
const {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
} = require('../utils/errors');

class AbhaService {
  /**
   * Safe helper to normalize ABHA identifiers without accidental collisions.
   */
  normalizeIdentifier(raw) {
    if (!raw || typeof raw !== 'string') return '';
    return raw.trim();
  }

  /**
   * Validates whether an identifier adheres to supported formats:
   * 1. Application/Demo Health ID: ABHA-DEMO-XXXX-XXXX
   * 2. Official 14-digit ABHA Number: XX-XXXX-XXXX-XXXX or 14 digits
   * 3. Official ABHA Address: username@abdm
   */
  validateIdentifierFormat(identifier) {
    const clean = this.normalizeIdentifier(identifier);
    if (!clean) {
      return { isValid: false, type: null, error: 'ABHA identifier cannot be empty' };
    }

    // 1. Application-level Demo Health ID format
    if (/^ABHA-DEMO-\d{4}-\d{4}$/i.test(clean) || /^ABHA-DEMO-[a-zA-Z0-9_-]+$/i.test(clean)) {
      return { isValid: true, type: 'DEMO_HEALTH_ID', normalized: clean.toUpperCase() };
    }

    // 2. Official 14-digit ABHA Number format: 12-3456-7890-1234
    if (/^\d{2}-\d{4}-\d{4}-\d{4}$/.test(clean)) {
      return { isValid: true, type: 'ABHA_NUMBER', normalized: clean };
    }

    // 14 digits without dashes
    if (/^\d{14}$/.test(clean)) {
      const formatted = `${clean.slice(0, 2)}-${clean.slice(2, 6)}-${clean.slice(6, 10)}-${clean.slice(10, 14)}`;
      return { isValid: true, type: 'ABHA_NUMBER', normalized: formatted };
    }

    // 3. Official ABHA Address format: name@abdm
    if (/^[a-zA-Z0-9._%+-]+@abdm$/i.test(clean)) {
      return { isValid: true, type: 'ABHA_ADDRESS', normalized: clean.toLowerCase() };
    }

    return {
      isValid: false,
      type: null,
      error:
        'Invalid ABHA identifier format. Supported formats: Demo Health ID (e.g. ABHA-DEMO-1234-5678), 14-digit ABHA Number (e.g. 91-4567-8901-2345), or ABHA Address (e.g. user@abdm).',
    };
  }

  /**
   * Ensures the user has an initialized unique application-level health identifier.
   */
  async getOrCreateUserHealthId(userId) {
    const user = await User.findById(userId);
    if (!user) throw new NotFoundError('User not found');

    if (!user.healthId) {
      user.healthId = await User.generateUniqueHealthId();
      user.healthIdType = 'DEMO_APPLICATION_ID';
      user.abhaStatus = 'DEMO_ASSIGNED';
      await user.save();
    }

    return user;
  }

  /**
   * Retrieves the authenticated user's complete health identity profile.
   */
  async getMyAbhaProfile(userId) {
    const user = await this.getOrCreateUserHealthId(userId);

    // Calculate document counts and active consent records
    const linkedDocumentsCount = await Document.countDocuments({ userId: user._id });
    const activeConsentsCount = await Consent.countDocuments({
      patientId: user._id,
      status: 'GRANTED',
      validUntil: { $gt: new Date() },
    });
    const pendingRequestsCount = await Consent.countDocuments({
      patientId: user._id,
      status: 'PENDING',
    });

    return {
      fullName: user.name,
      dateOfBirth: user.dateOfBirth || null,
      gender: user.gender || null,
      healthId: user.healthId,
      healthIdType: user.healthIdType || 'DEMO_APPLICATION_ID',
      abhaNumber: user.abhaNumber || user.mockAbha?.abhaNumber || null,
      abhaAddress: user.abhaAddress || user.mockAbha?.abhaAddress || null,
      abhaStatus: user.abhaStatus || 'DEMO_ASSIGNED',
      isAbhaVerified: Boolean(user.isAbhaVerified),
      verificationMethod: user.abhaVerificationMethod || 'DEMO_MODE',
      abhaLinkedAt: user.abhaLinkedAt || user.mockAbha?.linkedAt || null,
      createdAt: user.createdAt,
      linkedDocumentsCount,
      activeConsentsCount,
      pendingRequestsCount,
      // Clear distinction between application-generated ID and official government ABHA
      provenanceNotice:
        user.abhaStatus === 'OFFICIAL_VERIFIED'
          ? 'Officially linked and verified through national ABDM gateway.'
          : 'Application-level demo health identifier assigned for interoperability simulation.',
    };
  }

  /**
   * Searches for a patient by ABHA identifier and checks authorization.
   * Enforces privacy: unauthorized requesters only receive a masked identity with a consent request option.
   */
  async searchIdentifier(requesterId, identifier) {
    const format = this.validateIdentifierFormat(identifier);
    if (!format.isValid) {
      throw new BadRequestError(format.error);
    }

    const clean = format.normalized;

    // Search query resolving across healthId, abhaNumber, abhaAddress, or mockAbha
    const query = {
      $or: [
        { healthId: clean },
        { abhaNumber: clean },
        { abhaAddress: clean },
        { 'mockAbha.abhaNumber': clean },
        { 'mockAbha.abhaAddress': clean },
      ],
    };

    const targetUser = await User.findOne(query);
    if (!targetUser) {
      throw new NotFoundError(
        `No patient found with ABHA identifier "${identifier}". Please check the ID and try again.`
      );
    }

    const isSelf = requesterId.toString() === targetUser._id.toString();

    // 1. SELF ACCESS: Authenticated user is searching their own records
    if (isSelf) {
      const documents = await Document.find({ userId: targetUser._id })
        .sort({ createdAt: -1 })
        .select(
          '_id userId fileName fileType fileUrl documentType status fileSize createdAt documentDate hospitalName summary extractedMedicalData failureReason'
        );

      return {
        accessLevel: 'FULL_SELF_ACCESS',
        isAuthorized: true,
        consentStatus: 'SELF',
        patient: {
          id: targetUser._id,
          fullName: targetUser.name,
          healthId: targetUser.healthId,
          abhaNumber: targetUser.abhaNumber || targetUser.mockAbha?.abhaNumber || null,
          abhaAddress: targetUser.abhaAddress || targetUser.mockAbha?.abhaAddress || null,
          gender: targetUser.gender || 'Not specified',
          dateOfBirth: targetUser.dateOfBirth || null,
          abhaStatus: targetUser.abhaStatus || 'DEMO_ASSIGNED',
          isAbhaVerified: Boolean(targetUser.isAbhaVerified),
        },
        documents: documents.map((d) => this.formatAuthorizedDocument(d, targetUser._id)),
        message: 'Viewing your own health records.',
      };
    }

    // 2. THIRD-PARTY ACCESS: Check if an active, non-expired GRANTED consent exists
    const activeConsent = await Consent.findOne({
      requesterId,
      patientId: targetUser._id,
      status: 'GRANTED',
      validUntil: { $gt: new Date() },
    });

    if (activeConsent) {
      // Record access audit
      activeConsent.auditLog.push({
        action: 'RECORDS_ACCESSED',
        performedBy: requesterId,
        timestamp: new Date(),
        notes: 'Medical records accessed via ABHA lookup with active consent.',
      });
      await activeConsent.save();

      // Filter documents by granted scope
      let docQuery = { userId: targetUser._id };
      if (!activeConsent.scope.includes('ALL_DOCUMENTS')) {
        const types = [];
        if (activeConsent.scope.includes('PRESCRIPTIONS')) types.push('Prescription');
        if (activeConsent.scope.includes('LAB_REPORTS')) types.push('Lab Report', 'Blood Report');
        if (activeConsent.scope.includes('DISCHARGE_SUMMARIES')) types.push('Doctor Note', 'Other');
        docQuery.documentType = { $in: types };
      }

      const documents = await Document.find(docQuery)
        .sort({ createdAt: -1 })
        .select(
          '_id userId fileName fileType fileUrl documentType status fileSize createdAt documentDate hospitalName summary extractedMedicalData failureReason'
        );

      return {
        accessLevel: 'CONSENT_GRANTED',
        isAuthorized: true,
        consentStatus: 'GRANTED',
        consent: {
          id: activeConsent._id,
          purpose: activeConsent.purpose,
          purposeDescription: activeConsent.purposeDescription,
          scope: activeConsent.scope,
          validUntil: activeConsent.validUntil,
          grantedAt: activeConsent.grantedAt,
        },
        patient: {
          id: targetUser._id,
          fullName: targetUser.name,
          healthId: targetUser.healthId,
          gender: targetUser.gender || 'Not specified',
          dateOfBirth: targetUser.dateOfBirth || null,
          abhaStatus: targetUser.abhaStatus || 'DEMO_ASSIGNED',
        },
        documents: documents.map((d) => this.formatAuthorizedDocument(d, targetUser._id)),
        message: 'Access authorized by patient consent.',
      };
    }

    // 3. UNAUTHORIZED / CONSENT REQUIRED: Protect patient privacy
    // Mask name e.g. "R***** K****"
    const maskedName = this.maskPatientName(targetUser.name);

    // Check if requester has a pending request
    const pendingConsent = await Consent.findOne({
      requesterId,
      patientId: targetUser._id,
      status: 'PENDING',
    });

    return {
      accessLevel: 'MASKED_PREVIEW',
      isAuthorized: false,
      consentStatus: pendingConsent ? 'PENDING' : 'NONE',
      hasPendingRequest: Boolean(pendingConsent),
      pendingConsentId: pendingConsent?._id || null,
      patient: {
        id: targetUser._id,
        maskedName,
        healthId: targetUser.healthId,
        healthIdType: targetUser.healthIdType || 'DEMO_APPLICATION_ID',
        abhaStatus: targetUser.abhaStatus || 'DEMO_ASSIGNED',
        isAbhaVerified: Boolean(targetUser.isAbhaVerified),
      },
      documents: [], // Strict zero document disclosure
      message: pendingConsent
        ? 'A consent request is already pending approval from this patient.'
        : 'Patient found. In compliance with patient privacy and ABDM consent standards, medical records are protected. You must request and obtain patient consent to view health records.',
    };
  }

  /**
   * Creates a formal consent request for access to a patient's medical records.
   */
  async requestConsent(
    requesterId,
    { targetIdentifier, purpose = 'CLINICAL_CONSULTATION', purposeDescription = '', scope = ['ALL_DOCUMENTS', 'AI_SUMMARIES'], durationDays = 7, ipAddress = '' }
  ) {
    const format = this.validateIdentifierFormat(targetIdentifier);
    if (!format.isValid) {
      throw new BadRequestError(format.error);
    }

    const clean = format.normalized;
    const targetUser = await User.findOne({
      $or: [
        { healthId: clean },
        { abhaNumber: clean },
        { abhaAddress: clean },
        { 'mockAbha.abhaNumber': clean },
        { 'mockAbha.abhaAddress': clean },
      ],
    });

    if (!targetUser) {
      throw new NotFoundError('Target patient not found for consent request.');
    }

    if (requesterId.toString() === targetUser._id.toString()) {
      throw new BadRequestError('You cannot request consent from yourself.');
    }

    // Check for existing pending request
    let consent = await Consent.findOne({
      requesterId,
      patientId: targetUser._id,
      status: 'PENDING',
    });

    const validDuration = Math.min(Math.max(parseInt(durationDays, 10) || 7, 1), 90);
    const validUntil = new Date(Date.now() + validDuration * 24 * 60 * 60 * 1000);

    if (consent) {
      // Refresh pending request
      consent.purpose = purpose;
      consent.purposeDescription = purposeDescription;
      consent.scope = scope;
      consent.durationDays = validDuration;
      consent.validUntil = validUntil;
      consent.auditLog.push({
        action: 'CONSENT_REQUESTED',
        performedBy: requesterId,
        timestamp: new Date(),
        ipAddress,
        notes: 'Updated existing pending access request.',
      });
      await consent.save();
    } else {
      consent = new Consent({
        requesterId,
        patientId: targetUser._id,
        targetHealthId: targetUser.healthId || clean,
        purpose,
        purposeDescription,
        scope,
        durationDays: validDuration,
        validUntil,
        status: 'PENDING',
        auditLog: [
          {
            action: 'CONSENT_REQUESTED',
            performedBy: requesterId,
            timestamp: new Date(),
            ipAddress,
            notes: `Requested ${validDuration}-day access for ${purpose}.`,
          },
        ],
      });
      await consent.save();
    }

    return {
      consentId: consent._id,
      patientName: this.maskPatientName(targetUser.name),
      status: consent.status,
      purpose: consent.purpose,
      validUntil: consent.validUntil,
      message: 'Consent request submitted successfully. The patient will review your request.',
    };
  }

  /**
   * Retrieves all incoming (patient view) and outgoing (requester view) consent requests.
   */
  async getConsentRequests(userId) {
    const incoming = await Consent.find({ patientId: userId })
      .populate('requesterId', 'name email healthId avatar')
      .sort({ createdAt: -1 });

    const outgoing = await Consent.find({ requesterId: userId })
      .populate('patientId', 'name email healthId avatar')
      .sort({ createdAt: -1 });

    return {
      incoming: incoming.map((c) => this.formatConsentRecord(c, 'incoming')),
      outgoing: outgoing.map((c) => this.formatConsentRecord(c, 'outgoing')),
    };
  }

  /**
   * Patient grants access to a requester.
   */
  async grantConsent(patientId, consentId, ipAddress = '') {
    const consent = await Consent.findOne({ _id: consentId, patientId });
    if (!consent) {
      throw new NotFoundError('Consent request not found or not owned by you.');
    }

    if (consent.status === 'REVOKED') {
      throw new BadRequestError('Cannot grant a revoked consent. Requester must submit a new request.');
    }

    const durationDays = consent.durationDays || 7;
    consent.status = 'GRANTED';
    consent.grantedAt = new Date();
    consent.validUntil = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
    consent.auditLog.push({
      action: 'CONSENT_GRANTED',
      performedBy: patientId,
      timestamp: new Date(),
      ipAddress,
      notes: `Patient approved ${durationDays}-day record access.`,
    });

    await consent.save();
    return {
      consentId: consent._id,
      status: consent.status,
      validUntil: consent.validUntil,
      message: 'Consent granted successfully. Requester can now view permitted health records.',
    };
  }

  /**
   * Patient rejects an incoming consent request.
   */
  async rejectConsent(patientId, consentId, ipAddress = '') {
    const consent = await Consent.findOne({ _id: consentId, patientId });
    if (!consent) {
      throw new NotFoundError('Consent request not found or not owned by you.');
    }

    consent.status = 'REJECTED';
    consent.rejectedAt = new Date();
    consent.auditLog.push({
      action: 'CONSENT_REJECTED',
      performedBy: patientId,
      timestamp: new Date(),
      ipAddress,
      notes: 'Patient rejected record access request.',
    });

    await consent.save();
    return {
      consentId: consent._id,
      status: consent.status,
      message: 'Consent request rejected.',
    };
  }

  /**
   * Patient revokes previously granted access.
   * Immediately prevents subsequent unauthorized access.
   */
  async revokeConsent(patientId, consentId, ipAddress = '') {
    const consent = await Consent.findOne({ _id: consentId, patientId });
    if (!consent) {
      throw new NotFoundError('Consent record not found.');
    }

    consent.status = 'REVOKED';
    consent.revokedAt = new Date();
    consent.auditLog.push({
      action: 'CONSENT_REVOKED',
      performedBy: patientId,
      timestamp: new Date(),
      ipAddress,
      notes: 'Patient revoked access. Further record lookup blocked immediately.',
    });

    await consent.save();
    return {
      consentId: consent._id,
      status: consent.status,
      message: 'Access revoked successfully. The user can no longer view your health records.',
    };
  }

  /**
   * Retrieves authorized patient documents if requester is authorized.
   */
  async getAuthorizedDocuments(requesterId, patientId) {
    const isSelf = requesterId.toString() === patientId.toString();

    if (!isSelf) {
      const activeConsent = await Consent.findOne({
        requesterId,
        patientId,
        status: 'GRANTED',
        validUntil: { $gt: new Date() },
      });

      if (!activeConsent) {
        throw new ForbiddenError(
          'Access forbidden: You do not have active patient consent to access these medical documents.'
        );
      }
    }

    const docs = await Document.find({ userId: patientId })
      .sort({ createdAt: -1 })
      .select(
        '_id userId fileName fileType fileUrl documentType status fileSize createdAt documentDate hospitalName summary extractedMedicalData failureReason'
      );

    return docs.map((d) => this.formatAuthorizedDocument(d, patientId));
  }

  /**
   * Securely streams an authorized document file.
   */
  async getAuthorizedDocumentFile(requesterId, patientId, documentId) {
    const isSelf = requesterId.toString() === patientId.toString();

    if (!isSelf) {
      const activeConsent = await Consent.findOne({
        requesterId,
        patientId,
        status: 'GRANTED',
        validUntil: { $gt: new Date() },
      });

      if (!activeConsent) {
        throw new ForbiddenError('Access forbidden: Patient consent required to view this file.');
      }

      // Record file view audit
      activeConsent.auditLog.push({
        action: 'DOCUMENT_VIEWED',
        performedBy: requesterId,
        timestamp: new Date(),
        notes: `Viewed document ID ${documentId}`,
      });
      await activeConsent.save();
    }

    return await documentService.getDocumentFile(documentId, patientId);
  }

  /**
   * Links or updates an official or mock ABHA identifier.
   */
  async linkOfficialAbha(userId, { abhaNumber, abhaAddress }) {
    const cleanNumber = this.normalizeIdentifier(abhaNumber);
    const cleanAddress = this.normalizeIdentifier(abhaAddress).toLowerCase();

    if (!cleanNumber && !cleanAddress) {
      throw new BadRequestError('Either an ABHA Number or ABHA Address must be provided.');
    }

    // Validate duplicate linking
    if (cleanNumber) {
      const existing = await User.findOne({
        _id: { $ne: userId },
        $or: [{ abhaNumber: cleanNumber }, { 'mockAbha.abhaNumber': cleanNumber }],
      });
      if (existing) {
        throw new ConflictError('This ABHA number is already linked to another account.');
      }
    }

    if (cleanAddress) {
      const existing = await User.findOne({
        _id: { $ne: userId },
        $or: [{ abhaAddress: cleanAddress }, { 'mockAbha.abhaAddress': cleanAddress }],
      });
      if (existing) {
        throw new ConflictError('This ABHA address is already registered to another account.');
      }
    }

    const user = await User.findById(userId);
    if (!user) throw new NotFoundError('User not found');

    user.abhaNumber = cleanNumber || user.abhaNumber;
    user.abhaAddress = cleanAddress || user.abhaAddress;
    user.abhaStatus = 'DEMO_ASSIGNED'; // In demo mode, clearly distinguish from real govt verification
    user.isAbhaVerified = false; // Real verification requires ABDM Gateway M1 OTP credentials
    user.abhaLinkedAt = new Date();
    user.abhaVerificationMethod = 'DEMO_MODE';

    // Keep mockAbha updated for backward compatibility with FHIR export
    user.mockAbha = {
      abhaAddress: user.abhaAddress,
      abhaNumber: user.abhaNumber,
      isLinked: true,
      linkedAt: new Date(),
      syncStatus: 'LINKED',
    };

    await user.save();

    return {
      user: user.toJSON(),
      message:
        'ABHA identity linked in demonstration mode. (Note: Official government verification requires ABDM Sandbox Gateway credentials).',
    };
  }

  // Helper: Masks a patient name for privacy e.g. "Ramesh Kumar" -> "R***** K****"
  maskPatientName(name) {
    if (!name || typeof name !== 'string') return 'Patient';
    return name
      .split(' ')
      .map((part) => (part.length <= 1 ? part : part[0] + '*'.repeat(Math.min(part.length - 1, 5))))
      .join(' ');
  }

  // Helper: Standardized format for authorized document response
  formatAuthorizedDocument(doc, targetPatientId = null) {
    const patientId = targetPatientId || doc.userId;
    const isPdf = doc.fileType?.includes('pdf') || doc.fileName?.toLowerCase().endsWith('.pdf');
    return {
      id: doc._id,
      patientId,
      fileName: doc.fileName,
      documentType: doc.documentType,
      fileType: doc.fileType || (isPdf ? 'application/pdf' : 'image/jpeg'),
      fileUrl: `/api/abha/patients/${patientId}/documents/${doc._id}/file`,
      status: doc.status,
      fileSize: doc.fileSize,
      createdAt: doc.createdAt,
      documentDate: doc.documentDate || null,
      hospitalName: doc.hospitalName || null,
      aiSummary: doc.summary?.overview || null,
      keyPoints: Array.isArray(doc.summary?.keyPoints) ? doc.summary.keyPoints : [],
      hasAIInterpretation: Boolean(doc.summary?.overview),
      isAIGeneratedNotice:
        'AI-assisted extraction for informational reference only. Review original medical document with healthcare professional.',
    };
  }

  // Helper: Standardized format for consent records
  formatConsentRecord(consent, perspective = 'incoming') {
    const isIncoming = perspective === 'incoming';
    const party = isIncoming ? consent.requesterId : consent.patientId;

    const isExpired = consent.validUntil && new Date(consent.validUntil) < new Date();
    const effectiveStatus = isExpired && consent.status === 'GRANTED' ? 'EXPIRED' : consent.status;

    return {
      id: consent._id,
      party: {
        id: party?._id,
        name: isIncoming ? party?.name : this.maskPatientName(party?.name),
        email: isIncoming ? party?.email : undefined,
        healthId: party?.healthId,
        avatar: party?.avatar,
      },
      purpose: consent.purpose,
      purposeDescription: consent.purposeDescription,
      scope: consent.scope,
      status: effectiveStatus,
      durationDays: consent.durationDays,
      validUntil: consent.validUntil,
      grantedAt: consent.grantedAt,
      rejectedAt: consent.rejectedAt,
      revokedAt: consent.revokedAt,
      createdAt: consent.createdAt,
      isExpired,
    };
  }
}

module.exports = new AbhaService();
