const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    fileName: {
      type: String,
      required: [true, 'File name is required'],
      trim: true,
    },
    fileUrl: {
      type: String,
      required: [true, 'File URL is required'],
    },
    storagePath: {
      type: String,
      default: '',
    },
    fileType: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    documentType: {
      type: String,
      enum: ['Blood Report', 'Prescription', 'Lab Report', 'Doctor Note', 'Imaging Report', 'Other'],
      default: 'Other',
    },
    extractedText: {
      type: String,
      default: '',
    },
    summary: {
      overview: { type: String, default: '' },
      keyInformation: [{ type: String }],
      datesMentioned: [{ type: String }],
      medicationsMentioned: [{ type: String }],
      testsMentioned: [{ type: String }],
      doctorQuestions: [{ type: String }],
    },
    chunks: [
      {
        chunkText: { type: String, required: true },
        embedding: [{ type: Number }],
      },
    ],
    status: {
      type: String,
      enum: ['UPLOADED', 'PROCESSING', 'PROCESSED', 'FAILED'],
      default: 'UPLOADED',
    },
    failureReason: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

documentSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Document', documentSchema);
