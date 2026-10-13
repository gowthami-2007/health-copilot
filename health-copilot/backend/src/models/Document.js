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
    rawOcrOutput: {
      type: String,
      default: '',
    },
    summary: {
      overview: { type: String, default: '' },
      keyFindings: [{ type: String }],
      abnormalResults: [{ type: String }],
      possibleMeanings: { type: String, default: '' },
      medicinesAndInstructions: [{ type: String }],
      questionsForDoctor: [{ type: String }],
      keyInformation: [{ type: String }],
      datesMentioned: [{ type: String }],
      medicationsMentioned: [{ type: String }],
      testsMentioned: [{ type: String }],
      doctorQuestions: [{ type: String }],
    },
    teluguSummary: {
      overview: { type: String, default: '' },
      keyFindings: [{ type: String }],
      abnormalResults: [{ type: String }],
      possibleMeanings: { type: String, default: '' },
      medicinesAndInstructions: [{ type: String }],
      questionsForDoctor: [{ type: String }],
    },
    structuredData: {
      patientName: { type: String, default: '' },
      patientAge: { type: Number, default: null },
      patientSex: { type: String, default: '' },
      patientAddress: { type: String, default: '' },
      documentDate: { type: Date, default: null },
      healthcareProvider: { type: String, default: '' },
      doctorRegistration: { type: String, default: '' },
      diagnoses: [{ type: String }],
      reviewStatus: {
        type: String,
        enum: ['AUTO_EXTRACTED', 'REVIEW_REQUIRED', 'VERIFIED'],
        default: 'AUTO_EXTRACTED',
      },
      confidenceScore: { type: Number, default: 0.9 },
      labResults: [
        {
          testName: { type: String, required: true },
          result: { type: String, required: true },
          numericValue: { type: Number, default: null },
          unit: { type: String, default: '' },
          referenceRange: { type: String, default: '' },
          abnormalFlag: {
            type: String,
            enum: ['NORMAL', 'HIGH', 'LOW', 'ABNORMAL', 'CRITICAL', 'UNKNOWN'],
            default: 'NORMAL',
          },
          interpretation: { type: String, default: '' },
        },
      ],
      prescriptions: [
        {
          medicationName: { type: String, required: true },
          dosage: { type: String, default: '' },
          frequency: { type: String, default: '' },
          route: { type: String, default: 'Oral' },
          duration: { type: String, default: '' },
          quantity: { type: String, default: '' },
          instructions: { type: String, default: '' },
          prescribingDoctor: { type: String, default: '' },
          registrationNumber: { type: String, default: '' },
          isCurrentMedication: { type: Boolean, default: false },
          verificationStatus: { type: String, default: 'UNVERIFIED' },
        },
      ],
      dischargeSummary: {
        admissionDate: { type: Date, default: null },
        dischargeDate: { type: Date, default: null },
        procedures: [{ type: String }],
        followUpInstructions: [{ type: String }],
      },
      allergies: [{ type: String }],
      appointments: [
        {
          doctorName: { type: String, default: '' },
          specialty: { type: String, default: 'General Practitioner' },
          date: { type: Date, default: null },
          time: { type: String, default: '10:00 AM' },
          location: { type: String, default: '' },
          reason: { type: String, default: '' },
          notes: { type: String, default: '' },
          type: { type: String, default: 'APPOINTMENT' },
        },
      ],
      consultations: [
        {
          doctorName: { type: String, default: '' },
          specialty: { type: String, default: 'General Practitioner' },
          date: { type: Date, default: null },
          time: { type: String, default: '10:00 AM' },
          location: { type: String, default: '' },
          reason: { type: String, default: '' },
          notes: { type: String, default: '' },
          type: { type: String, default: 'CONSULTATION' },
        },
      ],
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
