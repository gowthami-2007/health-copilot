const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide your full name'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Please provide an email address'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        'Please provide a valid email address',
      ],
      index: true,
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [8, 'Password must be at least 8 characters long'],
      select: false, // Never return password in queries by default
    },
    avatar: {
      type: String,
      default: '',
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
    preferredLanguage: {
      type: String,
      enum: ['en', 'te'],
      default: 'en',
    },
    mockAbha: {
      abhaAddress: { type: String, default: '' },
      abhaNumber: { type: String, default: '' },
      isLinked: { type: Boolean, default: false },
      linkedAt: { type: Date, default: null },
      syncStatus: {
        type: String,
        enum: ['DISCONNECTED', 'LINKED', 'SYNCING', 'SIMULATED_RECORDS_ACTIVE'],
        default: 'DISCONNECTED',
      },
    },
  },
  {
    timestamps: true,
  }
);

// Strip sensitive fields when converting to JSON
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  delete user.__v;
  return user;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
