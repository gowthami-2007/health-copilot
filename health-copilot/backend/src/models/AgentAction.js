const mongoose = require('mongoose');

const agentActionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    patientProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PatientProfile',
      default: null,
      index: true,
    },
    triggerEvent: {
      type: String,
      enum: [
        'PRESCRIPTION_PROCESSED',
        'LAB_RESULT_ABNORMAL',
        'FOLLOWUP_OVERDUE',
        'APPOINTMENT_DETECTED',
        'TREND_RECALCULATED',
      ],
      required: true,
      index: true,
    },
    actionType: {
      type: String,
      enum: [
        'SCHEDULE_MEDICATION_REMINDER',
        'CREATE_APPOINTMENT',
        'FLAG_REPEAT_TEST',
        'DRAFT_DOCTOR_QUESTIONS',
        'NOTIFY_CAREGIVER',
      ],
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    rationale: {
      type: String,
      required: true,
      trim: true,
    },
    supportingData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      enum: ['PROPOSED', 'APPROVED', 'REJECTED', 'EXECUTED', 'FAILED'],
      default: 'PROPOSED',
      index: true,
    },
    idempotencyKey: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    approvalRequired: {
      type: Boolean,
      default: true,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    executedAt: {
      type: Date,
      default: null,
    },
    executionResult: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    errorMessage: {
      type: String,
      default: '',
    },
    auditTrail: [
      {
        timestamp: {
          type: Date,
          default: Date.now,
        },
        action: {
          type: String,
          required: true,
        },
        actor: {
          type: String,
          default: 'USER',
        },
        details: {
          type: mongoose.Schema.Types.Mixed,
          default: {},
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

agentActionSchema.index({ userId: 1, status: 1 });
agentActionSchema.index({ userId: 1, patientProfileId: 1, status: 1 });

module.exports = mongoose.model('AgentAction', agentActionSchema);
