const mongoose = require('mongoose');

const patientProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Patient name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    relationship: {
      type: String,
      enum: ['Self', 'Father', 'Mother', 'Spouse', 'Child', 'Sibling', 'Grandparent', 'Other'],
      default: 'Self',
    },
    dateOfBirth: {
      type: Date,
      default: null,
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer_not_to_say', ''],
      default: '',
    },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown', ''],
      default: '',
    },
    allergies: [{ type: String, trim: true }],
    chronicConditions: [{ type: String, trim: true }],
    isPrimary: {
      type: Boolean,
      default: false,
      index: true,
    },
    avatar: {
      type: String,
      default: '',
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

patientProfileSchema.index({ userId: 1, relationship: 1 });

module.exports = mongoose.model('PatientProfile', patientProfileSchema);
