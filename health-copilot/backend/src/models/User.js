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
      required: [
        function () {
          return !this.googleId;
        },
        'Please provide a password',
      ],
      minlength: [8, 'Password must be at least 8 characters long'],
      select: false, // Never return password in queries by default
    },
    isEmailVerified: {
      type: Boolean,
      default: true,
      index: true,
    },
    emailVerificationToken: {
      type: String,
      select: false,
      index: true,
    },
    emailVerificationCode: {
      type: String,
      select: false,
    },
    emailVerificationOtpHash: {
      type: String,
      select: false,
    },
    emailVerificationAttempts: {
      type: Number,
      default: 0,
      select: false,
    },
    emailVerificationExpires: {
      type: Date,
      select: false,
    },
    emailVerificationLastSentAt: {
      type: Date,
      select: false,
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    authProvider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local',
    },
    passwordResetToken: {
      type: String,
      select: false,
      index: true,
    },
    passwordResetCode: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
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
    // Application-Level Health Identifier & ABHA Interoperability
    healthId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    healthIdType: {
      type: String,
      enum: ['DEMO_APPLICATION_ID', 'OFFICIAL_ABHA'],
      default: 'DEMO_APPLICATION_ID',
    },
    abhaNumber: {
      type: String,
      default: '',
      index: true,
    },
    abhaAddress: {
      type: String,
      default: '',
      index: true,
    },
    abhaStatus: {
      type: String,
      enum: [
        'DEMO_ASSIGNED',
        'OFFICIAL_VERIFIED',
        'OFFICIAL_NOT_LINKED',
        'VERIFICATION_PENDING',
        'VERIFICATION_FAILED',
      ],
      default: 'DEMO_ASSIGNED',
    },
    isAbhaVerified: {
      type: Boolean,
      default: false,
    },
    abhaLinkedAt: {
      type: Date,
      default: null,
    },
    abhaVerificationMethod: {
      type: String,
      default: 'DEMO_MODE',
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

const crypto = require('crypto');

function generateDemoHealthId() {
  const segment1 = crypto.randomInt(1000, 9999);
  const segment2 = crypto.randomInt(1000, 9999);
  return `ABHA-DEMO-${segment1}-${segment2}`;
}

// Ensure every user has a unique application-level health identifier
userSchema.pre('save', async function (next) {
  if (!this.healthId) {
    let uniqueId = null;
    let isUnique = false;
    let attempts = 0;
    while (!isUnique && attempts < 10) {
      attempts++;
      uniqueId = generateDemoHealthId();
      const existing = await mongoose.model('User').findOne({ healthId: uniqueId });
      if (!existing) {
        isUnique = true;
      }
    }
    this.healthId = uniqueId || `ABHA-DEMO-${Date.now().toString().slice(-8)}`;
  }
  next();
});

// Static helper to generate unique health ID
userSchema.statics.generateUniqueHealthId = async function () {
  let uniqueId = null;
  let isUnique = false;
  let attempts = 0;
  while (!isUnique && attempts < 15) {
    attempts++;
    uniqueId = generateDemoHealthId();
    const existing = await this.findOne({ healthId: uniqueId });
    if (!existing) {
      isUnique = true;
    }
  }
  return uniqueId || `ABHA-DEMO-${Date.now().toString().slice(-8)}`;
};

// Strip sensitive fields when converting to JSON
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  delete user.emailVerificationToken;
  delete user.emailVerificationCode;
  delete user.emailVerificationOtpHash;
  delete user.emailVerificationAttempts;
  delete user.emailVerificationExpires;
  delete user.emailVerificationLastSentAt;
  delete user.passwordResetToken;
  delete user.passwordResetExpires;
  delete user.__v;
  return user;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
