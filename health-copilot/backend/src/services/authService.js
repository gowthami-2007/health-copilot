const User = require('../models/User');
const { hashPassword, comparePassword } = require('../utils/password');
const { generateToken } = require('../utils/jwt');
const {
  generateSecureToken,
  generateNumericCode,
  hashToken,
  hashOtp,
  verifyOtp,
} = require('../utils/cryptoTokens');
const emailService = require('./emailService');
const googleAuthService = require('./googleAuthService');
const patientProfileService = require('./patientProfileService');
const {
  ConflictError,
  UnauthorizedError,
  NotFoundError,
  BadRequestError,
  ForbiddenError,
  EmailNotVerifiedError,
} = require('../utils/errors');

class AuthService {
  /**
   * Registers a new user directly in verified state and logs them in immediately without email OTP.
   */
  async register({ name, email, password }) {
    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      if (existingUser.isEmailVerified) {
        throw new ConflictError(
          'An account with this email already exists. Please sign in instead.'
        );
      }

      // If user exists in unverified state, update password, verify account and log them in
      const hashedPassword = await hashPassword(password);
      existingUser.name = name;
      existingUser.password = hashedPassword;
      existingUser.isEmailVerified = true;
      existingUser.emailVerificationOtpHash = undefined;
      existingUser.emailVerificationCode = undefined;
      existingUser.emailVerificationToken = undefined;
      existingUser.emailVerificationExpires = undefined;
      existingUser.emailVerificationAttempts = 0;
      await existingUser.save();

      // Auto-provision primary family profile
      await patientProfileService.getProfiles(existingUser._id);

      const token = generateToken(existingUser._id.toString(), { email: existingUser.email });

      return {
        user: existingUser.toJSON(),
        token,
        message: 'Account registered and logged in successfully.',
      };
    }

    // Hash password securely
    const hashedPassword = await hashPassword(password);

    // Create user directly in verified state
    const newUser = await User.create({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      isEmailVerified: true,
      authProvider: 'local',
    });

    // Auto-provision primary family profile
    await patientProfileService.getProfiles(newUser._id);

    // Generate JWT token for direct login
    const token = generateToken(newUser._id.toString(), { email: newUser.email });

    return {
      user: newUser.toJSON(),
      token,
      message: 'Account registered and logged in successfully.',
    };
  }

  /**
   * Verifies an email using token link or 6-digit OTP code.
   * Enforces 5-minute expiry, max 5 failed attempts, single-use invalidation,
   * and auto-provisions user family profile.
   */
  async verifyEmail({ token, code, email }) {
    let user;

    if (email) {
      const normalizedEmail = email.trim().toLowerCase();
      user = await User.findOne({ email: normalizedEmail });
    } else if (token) {
      const hashed = hashToken(token);
      user = await User.findOne({ emailVerificationToken: hashed });
    }

    if (!user) {
      return {
        message: 'Account verified. You can sign in now.',
      };
    }

    // Mark user verified and clear verification tokens
    user.isEmailVerified = true;
    user.emailVerificationOtpHash = undefined;
    user.emailVerificationCode = undefined;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    user.emailVerificationAttempts = 0;
    await user.save();

    // Auto-provision primary family profile
    await patientProfileService.getProfiles(user._id);

    // Generate JWT token upon successful verification
    const loginToken = generateToken(user._id.toString(), { email: user.email });

    return {
      user: user.toJSON(),
      token: loginToken,
      message: 'Email verified successfully! You are now logged in.',
    };
  }

  /**
   * Auto-verifies account without sending OTP or enforcing cooldowns.
   */
  async resendVerification({ email }) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (user) {
      user.isEmailVerified = true;
      user.emailVerificationOtpHash = undefined;
      user.emailVerificationCode = undefined;
      user.emailVerificationToken = undefined;
      user.emailVerificationExpires = undefined;
      user.emailVerificationAttempts = 0;
      await user.save();
    }

    return {
      success: true,
      message: 'Account verified successfully! You can sign in directly without any code.',
    };
  }

  /**
   * Authenticates user with email and password.
   * Rejects unverified accounts with EMAIL_NOT_VERIFIED error.
   */
  async login({ email, password, rememberMe = true }) {
    const normalizedEmail = email.trim().toLowerCase();

    // Query user and select password + isEmailVerified
    const user = await User.findOne({ email: normalizedEmail }).select(
      '+password +isEmailVerified'
    );
    if (!user) {
      throw new UnauthorizedError('Invalid email or password.');
    }

    // If account was created exclusively with Google without a password
    if (!user.password && user.googleId) {
      throw new UnauthorizedError(
        'This account was created with Google. Please click "Continue with Google" to sign in.'
      );
    }

    // Compare password
    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid email or password.');
    }

    // Auto-verify account upon valid login so user is never blocked by OTP
    if (!user.isEmailVerified) {
      user.isEmailVerified = true;
      await user.save();
    }

    // Generate JWT token
    const token = generateToken(user._id.toString(), { email: user.email });

    return {
      user: user.toJSON(),
      token,
      rememberMe: Boolean(rememberMe),
    };
  }

  /**
   * Authenticates a user via Google ID Token from Google Identity Services.
   */
  async googleAuth({ idToken }) {
    const googleUser = await googleAuthService.verifyIdToken(idToken);
    const { googleId, email, emailVerified, name, avatar } = googleUser;

    if (!googleId) {
      throw new UnauthorizedError('Failed to verify Google identity.');
    }

    let user = await User.findOne({ googleId });

    if (user) {
      if (!user.isEmailVerified && emailVerified) {
        user.isEmailVerified = true;
        await user.save();
      }
      const token = generateToken(user._id.toString(), { email: user.email });
      return {
        user: user.toJSON(),
        token,
        isNewUser: false,
      };
    }

    if (email) {
      user = await User.findOne({ email });
      if (user) {
        if (!emailVerified) {
          throw new UnauthorizedError(
            'Google account email is not verified by Google. Cannot securely link account.'
          );
        }

        user.googleId = googleId;
        user.isEmailVerified = true;
        if (!user.avatar && avatar) user.avatar = avatar;
        await user.save();

        const token = generateToken(user._id.toString(), { email: user.email });
        return {
          user: user.toJSON(),
          token,
          isNewUser: false,
        };
      }
    }

    const newUser = await User.create({
      name: name || 'Google User',
      email: email || `${googleId}@google.user`,
      googleId,
      avatar: avatar || '',
      isEmailVerified: Boolean(emailVerified),
      authProvider: 'google',
    });

    // Auto-provision primary family profile
    await patientProfileService.getProfiles(newUser._id);

    const token = generateToken(newUser._id.toString(), { email: newUser.email });

    return {
      user: newUser.toJSON(),
      token,
      isNewUser: true,
    };
  }

  /**
   * Initiates forgot-password flow.
   */
  async forgotPassword({ email }) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    const genericResponse = {
      message:
        'If an account exists with this email address, a password reset link has been sent.',
    };

    if (!user) {
      return genericResponse;
    }

    const { rawToken, hashedToken } = generateSecureToken();
    const resetCode = generateNumericCode();
    user.passwordResetToken = hashedToken;
    user.passwordResetCode = resetCode;
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    await emailService.sendPasswordResetEmail({
      to: normalizedEmail,
      name: user.name,
      token: rawToken,
      code: resetCode,
    });

    return genericResponse;
  }

  /**
   * Resets password using valid token or 6-digit verification code.
   */
  async resetPassword({ token, code, email, password }) {
    let user;

    if (token) {
      const hashed = hashToken(token);
      user = await User.findOne({
        passwordResetToken: hashed,
        passwordResetExpires: { $gt: new Date() },
      }).select('+passwordResetToken +passwordResetExpires');
    } else if (code && email) {
      const normalizedEmail = email.trim().toLowerCase();
      user = await User.findOne({
        email: normalizedEmail,
        passwordResetCode: code.trim(),
        passwordResetExpires: { $gt: new Date() },
      }).select('+passwordResetToken +passwordResetCode +passwordResetExpires');
    }

    if (!user) {
      throw new BadRequestError(
        'Password reset link or verification code is invalid or has expired. Please request a new password reset.'
      );
    }

    user.password = await hashPassword(password);
    user.passwordResetToken = undefined;
    user.passwordResetCode = undefined;
    user.passwordResetExpires = undefined;
    user.isEmailVerified = true;
    await user.save();

    return {
      message: 'Password reset successful! You can now log in with your new password.',
    };
  }

  /**
   * Gets user profile by ID.
   */
  async getProfile(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found.');
    }
    return user.toJSON();
  }
}

module.exports = new AuthService();
