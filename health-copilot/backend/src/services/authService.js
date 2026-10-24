const User = require('../models/User');
const { hashPassword, comparePassword } = require('../utils/password');
const { generateToken } = require('../utils/jwt');
const { generateSecureToken, generateNumericCode, hashToken } = require('../utils/cryptoTokens');
const emailService = require('./emailService');
const googleAuthService = require('./googleAuthService');
const {
  ConflictError,
  UnauthorizedError,
  NotFoundError,
  BadRequestError,
  ForbiddenError,
} = require('../utils/errors');

class AuthService {
  /**
   * Registers a new user directly in verified state and returns active session JWT.
   */
  async register({ name, email, password }) {
    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      throw new ConflictError('An account with this email already exists. Please sign in instead.');
    }

    // Hash password securely
    const hashedPassword = await hashPassword(password);

    // Generate verification code and token
    const { rawToken, hashedToken } = generateSecureToken();
    const verificationCode = generateNumericCode();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Create user in verified state directly
    const newUser = await User.create({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      isEmailVerified: true,
      emailVerificationToken: hashedToken,
      emailVerificationCode: verificationCode,
      emailVerificationExpires: expiresAt,
      authProvider: 'local',
    });

    // Generate JWT session token immediately
    const token = generateToken(newUser._id.toString(), { email: newUser.email });

    return {
      user: newUser.toJSON(),
      token,
      requiresVerification: false,
      message: 'Account created successfully! Welcome to HealthCopilot.',
    };
  }

  /**
   * Verifies an email using token or 6-digit code.
   */
  async verifyEmail({ token, code, email }) {
    let user;

    if (token) {
      const hashed = hashToken(token);
      user = await User.findOne({
        emailVerificationToken: hashed,
        emailVerificationExpires: { $gt: new Date() },
      }).select('+emailVerificationToken +emailVerificationExpires');
    } else if (code && email) {
      const normalizedEmail = email.trim().toLowerCase();
      user = await User.findOne({
        email: normalizedEmail,
        emailVerificationCode: code.trim(),
        emailVerificationExpires: { $gt: new Date() },
      }).select('+emailVerificationCode +emailVerificationExpires');
    }

    if (!user) {
      throw new BadRequestError(
        "We couldn't verify this email address. The link or code may be invalid, expired, or already used. Please check the address or try another email."
      );
    }

    // Mark user verified and clear verification tokens (prevents reuse)
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationCode = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    // Generate JWT token upon successful verification
    const loginToken = generateToken(user._id.toString(), { email: user.email });

    return {
      user: user.toJSON(),
      token: loginToken,
      message: 'Email verified successfully! You are now logged in.',
    };
  }

  /**
   * Resends verification email with fresh token/code.
   */
  async resendVerification({ email }) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      throw new NotFoundError(
        "We couldn't verify this email address. Please check the address or try another email."
      );
    }

    // Generate new token & code
    const { rawToken, hashedToken } = generateSecureToken();
    const verificationCode = generateNumericCode();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    user.emailVerificationToken = hashedToken;
    user.emailVerificationCode = verificationCode;
    user.emailVerificationExpires = expiresAt;
    await user.save();

    await emailService.sendVerificationEmail({
      to: normalizedEmail,
      name: user.name,
      token: rawToken,
      code: verificationCode,
    });

    return {
      success: true,
      message: 'A fresh verification link and code have been sent to your email.',
    };
  }

  /**
   * Authenticates an existing user with email and password.
   */
  async login({ email, password }) {
    const normalizedEmail = email.trim().toLowerCase();

    // Query user and select password + isEmailVerified
    const user = await User.findOne({ email: normalizedEmail }).select('+password');
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

    // Auto-verify if legacy user hasn't been verified yet
    if (!user.isEmailVerified) {
      user.isEmailVerified = true;
      user.emailVerificationToken = undefined;
      user.emailVerificationCode = undefined;
      user.emailVerificationExpires = undefined;
      await user.save();
    }

    // Generate JWT token
    const token = generateToken(user._id.toString(), { email: user.email });

    return {
      user: user.toJSON(),
      token,
    };
  }

  /**
   * Authenticates a user via Google ID Token from Google Identity Services.
   */
  async googleAuth({ idToken }) {
    // Cryptographically verify Google token
    const googleUser = await googleAuthService.verifyIdToken(idToken);
    const { googleId, email, emailVerified, name, avatar } = googleUser;

    if (!googleId) {
      throw new UnauthorizedError('Failed to verify Google identity.');
    }

    // 1. Check if user already exists with this Google sub ID
    let user = await User.findOne({ googleId });

    if (user) {
      // Existing Google user -> Sign in
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

    // 2. Check if user already exists with this verified email
    if (email) {
      user = await User.findOne({ email });
      if (user) {
        // Only link if Google email is verified
        if (!emailVerified) {
          throw new UnauthorizedError(
            'Google account email is not verified by Google. Cannot securely link account.'
          );
        }

        // Secure account linking
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

    // 3. New Google User -> Create account
    const newUser = await User.create({
      name: name || 'Google User',
      email: email || `${googleId}@google.user`,
      googleId,
      avatar: avatar || '',
      isEmailVerified: Boolean(emailVerified),
      authProvider: 'google',
    });

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

    // Always return generic success to prevent account enumeration
    const genericResponse = {
      message: 'If an account exists with this email address, a password reset link has been sent.',
    };

    if (!user) {
      return genericResponse;
    }

    const { rawToken, hashedToken } = generateSecureToken();
    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    await emailService.sendPasswordResetEmail({
      to: normalizedEmail,
      name: user.name,
      token: rawToken,
    });

    return genericResponse;
  }

  /**
   * Resets password using valid token.
   */
  async resetPassword({ token, password }) {
    const hashed = hashToken(token);
    const user = await User.findOne({
      passwordResetToken: hashed,
      passwordResetExpires: { $gt: new Date() },
    }).select('+passwordResetToken +passwordResetExpires');

    if (!user) {
      throw new BadRequestError(
        'Password reset link is invalid or has expired. Please request a new password reset link.'
      );
    }

    // Hash new password and invalidate reset token
    user.password = await hashPassword(password);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    // Mark email verified since user verified ownership of the mailbox
    user.isEmailVerified = true;
    await user.save();

    return {
      message: 'Password reset successful. You can now sign in with your new password.',
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
