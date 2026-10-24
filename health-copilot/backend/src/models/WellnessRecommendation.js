const mongoose = require('mongoose');

const wellnessRecommendationSchema = new mongoose.Schema(
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
    title: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: [
        'NUTRITION',
        'PHYSICAL_ACTIVITY',
        'SLEEP',
        'HEALTHY_HABITS',
        'FOLLOWUP_PREP',
        'MEDICATION_ADHERENCE',
      ],
      required: true,
      index: true,
    },
    practicalAction: {
      type: String,
      required: true,
      trim: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    supportingRecords: [
      {
        recordType: { type: String, default: 'Document' },
        recordId: { type: mongoose.Schema.Types.ObjectId, default: null },
        description: { type: String, default: '' },
      },
    ],
    limitations: {
      type: String,
      default: 'This general wellness guidance is informational and does not replace medical advice from your physician.',
      trim: true,
    },
    nextStep: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'COMPLETED', 'DISMISSED'],
      default: 'ACTIVE',
      index: true,
    },
    urgency: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH'],
      default: 'MEDIUM',
    },
    completedAt: {
      type: Date,
      default: null,
    },
    dismissedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

wellnessRecommendationSchema.index({ userId: 1, status: 1 });
wellnessRecommendationSchema.index({ userId: 1, patientProfileId: 1, status: 1 });

module.exports = mongoose.model('WellnessRecommendation', wellnessRecommendationSchema);
