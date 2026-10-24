const mongoose = require('mongoose');

const medicationSchema = new mongoose.Schema(
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
    name: {
      type: String,
      required: [true, 'Medication name is required'],
      trim: true,
    },
    dosage: {
      type: String,
      required: [true, 'Dosage is required (e.g., 500 mg)'],
      trim: true,
    },
    frequency: {
      type: String,
      required: [true, 'Frequency is required (e.g., Twice daily, Morning)'],
      trim: true,
    },
    instructions: {
      type: String,
      default: '',
      trim: true,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
      default: null,
    },
    prescribedBy: {
      type: String,
      default: '',
      trim: true,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'PAUSED', 'COMPLETED'],
      default: 'ACTIVE',
    },
    sourceDocumentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      default: null,
    },
    verificationStatus: {
      type: String,
      enum: ['AUTO_EXTRACTED', 'VERIFIED', 'MANUAL'],
      default: 'MANUAL',
    },
    reminderTimes: [
      {
        type: String, // e.g. "08:00", "14:00", "20:00" in 24hr format
        trim: true,
      },
    ],
    isReminderActive: {
      type: Boolean,
      default: true,
    },
    snoozeUntil: {
      type: Date,
      default: null,
    },
    nextOccurrence: {
      type: Date,
      default: null,
      index: true,
    },
    confirmationHistory: [
      {
        timestamp: {
          type: Date,
          default: Date.now,
        },
        action: {
          type: String,
          enum: ['TAKEN', 'SNOOZED', 'SKIPPED'],
          required: true,
        },
        scheduledTime: {
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

medicationSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Medication', medicationSchema);
