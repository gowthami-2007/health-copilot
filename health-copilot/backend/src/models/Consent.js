const mongoose = require('mongoose');

const consentSchema = new mongoose.Schema(
  {
    requesterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    targetHealthId: {
      type: String,
      required: true,
      index: true,
    },
    purpose: {
      type: String,
      enum: [
        'CLINICAL_CONSULTATION',
        'SECOND_OPINION',
        'EMERGENCY_CARE',
        'RECORD_TRANSFER',
        'GENERAL_CARE',
      ],
      default: 'CLINICAL_CONSULTATION',
    },
    purposeDescription: {
      type: String,
      default: '',
      maxlength: [300, 'Purpose description cannot exceed 300 characters'],
    },
    scope: {
      type: [String],
      enum: [
        'ALL_DOCUMENTS',
        'PRESCRIPTIONS',
        'LAB_REPORTS',
        'DISCHARGE_SUMMARIES',
        'AI_SUMMARIES',
      ],
      default: ['ALL_DOCUMENTS', 'AI_SUMMARIES'],
    },
    status: {
      type: String,
      enum: ['PENDING', 'GRANTED', 'REJECTED', 'REVOKED', 'EXPIRED'],
      default: 'PENDING',
      index: true,
    },
    durationDays: {
      type: Number,
      default: 7,
      min: 1,
      max: 90,
    },
    validUntil: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      index: true,
    },
    grantedAt: {
      type: Date,
      default: null,
    },
    rejectedAt: {
      type: Date,
      default: null,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    auditLog: [
      {
        action: {
          type: String,
          required: true,
          enum: [
            'CONSENT_REQUESTED',
            'CONSENT_GRANTED',
            'CONSENT_REJECTED',
            'CONSENT_REVOKED',
            'RECORDS_ACCESSED',
            'DOCUMENT_VIEWED',
          ],
        },
        performedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        ipAddress: {
          type: String,
          default: '',
        },
        notes: {
          type: String,
          default: '',
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Compound index for rapid authorization checks
consentSchema.index({ requesterId: 1, patientId: 1, status: 1 });
consentSchema.index({ patientId: 1, status: 1 });

const Consent = mongoose.model('Consent', consentSchema);

module.exports = Consent;
