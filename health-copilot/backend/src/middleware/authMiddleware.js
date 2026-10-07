const { verifyToken } = require('../utils/jwt');
const { UnauthorizedError } = require('../utils/errors');
const User = require('../models/User');

const protect = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw new UnauthorizedError('Authentication token is missing. Please log in.');
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      throw new UnauthorizedError('Invalid or expired authentication token. Please log in again.');
    }

    if (!decoded || !decoded.id) {
      throw new UnauthorizedError('Invalid token payload.');
    }

    // Verify user still exists in database
    const user = await User.findById(decoded.id);
    if (!user) {
      throw new UnauthorizedError('User account associated with this token no longer exists.');
    }

    // Attach user to request for downstream controllers
    req.user = {
      id: user._id.toString(),
      _id: user._id,
      name: user.name,
      email: user.email,
    };

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Optional authentication middleware for endpoints like POST /api/chat.
 * Attaches req.user if a valid token is provided, but allows unauthenticated calls.
 */
const optionalAuth = async (req, res, next) => {
  try {
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      const decoded = verifyToken(token);
      if (decoded && decoded.id) {
        const user = await User.findById(decoded.id);
        if (user) {
          req.user = {
            id: user._id.toString(),
            _id: user._id,
            name: user.name,
            email: user.email,
          };
        }
      }
    }
  } catch (_) {
    // Optional auth ignores invalid tokens
  }
  next();
};

module.exports = {
  protect,
  optionalAuth,
};
