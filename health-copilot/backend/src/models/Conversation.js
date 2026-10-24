const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
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
      default: 'Health Consultation',
      trim: true,
    },
    isCustomTitle: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

conversationSchema.index({ userId: 1, updatedAt: -1 });

module.exports = mongoose.model('Conversation', conversationSchema);
