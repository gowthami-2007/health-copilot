const User = require('../models/User');
const { hashPassword, comparePassword } = require('../utils/password');
const { generateToken } = require('../utils/jwt');
const { ConflictError, UnauthorizedError, NotFoundError } = require('../utils/errors');

class AuthService {
  /**
   * Registers a new user.
   */
  async register({ name, email, password }) {
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new ConflictError('An account with this email already exists.');
    }

    // Hash password securely
    const hashedPassword = await hashPassword(password);

    // Create user
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    // Generate JWT token
    const token = generateToken(newUser._id.toString(), { email: newUser.email });

    return {
      user: newUser.toJSON(),
      token,
    };
  }

  /**
   * Authenticates an existing user.
   */
  async login({ email, password }) {
    // Query user and explicitly select password for verification
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      throw new UnauthorizedError('Invalid email or password.');
    }

    // Compare password
    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid email or password.');
    }

    // Generate JWT token
    const token = generateToken(user._id.toString(), { email: user.email });

    return {
      user: user.toJSON(),
      token,
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
