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

    if (token) {
      const hashed = hashToken(token);
      user = await User.findOne({
        emailVerificationToken: hashed,
        emailVerificationExpires: { $gt: new Date() },
      }).select('+emailVerificationToken +emailVerificationExpires +emailVerificationAttempts');
    } else if (code && email) {
      const normalizedEmail = email.trim().toLowerCase();
      user = await User.findOne({
        email: normalizedEmail,
      }).select(
        '+emailVerificationOtpHash +emailVerificationCode +emailVerificationExpires +emailVerificationAttempts'
      );

      if (!user) {
        throw new BadRequestError('Invalid email or verification code. Please request a new code.');
      }

      // If already verified, allow login
      if (user.isEmailVerified) {
        const loginToken = generateToken(user._id.toString(), { email: user.email });
        return {
          user: user.toJSON(),
          token: loginToken,
          message: 'Email is already verified. You are now logged in.',
        };
      }

      // Enforce rate limiting: max 5 failed attempts
      if ((user.emailVerificationAttempts || 0) >= 5) {
        user.emailVerificationOtpHash = undefined;
        user.emailVerificationCode = undefined;
        user.emailVerificationExpires = undefined;
        await user.save();
        throw new BadRequestError(
          'Too many failed verification attempts. Please request a new verification code.'
        );
      }

      // Check 5-minute expiration
      if (!user.emailVerificationExpires || user.emailVerificationExpires < new Date()) {
        throw new BadRequestError(
          'Verification code has expired (5-minute limit). Please click Resend Code.'
        );
      }

      // Timing-safe OTP comparison
      const isOtpValid =
        verifyOtp(code.trim(), user.emailVerificationOtpHash) ||
        (user.emailVerificationCode && user.emailVerificationCode === code.trim());

      if (!isOtpValid) {
        user.emailVerificationAttempts = (user.emailVerificationAttempts || 0) + 1;
        await user.save();
        const remaining = Math.max(0, 5 - user.emailVerificationAttempts);
        throw new BadRequestError(
          `Invalid verification code. ${remaining} attempt(s) remaining.`
        );
      }
    }

    if (!user) {
      throw new BadRequestError(
        "We couldn't verify this email address. The link or code may be invalid, expired, or already used."
      );
    }

    // Mark user verified and clear verification tokens (enforces single-use)
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
   * Resends verification email with fresh 6-digit OTP code.
   * Enforces 60-second cooldown and anti-enumeration.
   */
  async resendVerification({ email }) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail }).select(
      '+emailVerificationLastSentAt +emailVerificationAttempts'
    );

    // Generic response to avoid email enumeration
    const genericResponse = {
      success: true,
      message:
        'If an account exists with this email address, a fresh 6-digit verification code has been sent.',
    };

    if (!user) {
      return genericResponse;
    }

    if (user.isEmailVerified) {
      return {
        success: true,
        message: 'This email is already verified. You can sign in directly.',
      };
    }

    // Enforce 60-second cooldown
    const now = Date.now();
    if (
      user.emailVerificationLastSentAt &&
      now - user.emailVerificationLastSentAt.getTime() < 60 * 1000
    ) {
      const remainingSeconds = Math.ceil(
        (60000 - (now - user.emailVerificationLastSentAt.getTime())) / 1000
      );
      throw new BadRequestError(
        `Please wait ${remainingSeconds} second(s) before requesting another verification code.`
      );
    }

    // Generate fresh OTP code and invalidate previous code
    const verificationCode = generateNumericCode();
    const otpHash = hashOtp(verificationCode);
    const { rawToken, hashedToken } = generateSecureToken();
    const expiresAt = new Date(now + 5 * 60 * 1000); // 5 minutes expiration

    user.emailVerificationOtpHash = otpHash;
    user.emailVerificationCode = verificationCode;
    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpires = expiresAt;
    user.emailVerificationAttempts = 0;
    user.emailVerificationLastSentAt = new Date(now);
    await user.save();

    await emailService.sendVerificationEmail({
      to: normalizedEmail,
      name: user.name,
      token: rawToken,
      code: verificationCode,
    });

    return {
      success: true,
      message: 'A fresh 6-digit verification code has been sent to your email.',
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
