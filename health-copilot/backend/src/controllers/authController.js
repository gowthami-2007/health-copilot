const authService = require('../services/authService');
const {
  validateRegistration,
  validateLogin,
  validateEmailVerification,
  validateResendVerification,
  validateForgotPassword,
  validateResetPassword,
} = require('../validators/authValidator');
const { successResponse } = require('../utils/apiResponse');
const { setAuthCookie, clearAuthCookie } = require('../utils/cookieHelper');
const { generateToken } = require('../utils/jwt');

class AuthController {
  async register(req, res, next) {
    try {
      const validatedData = validateRegistration(req.body);
      const result = await authService.register(validatedData);
      return successResponse(res, result.message, result, 201);
    } catch (error) {
      next(error);
    }
  }

  async verifyEmail(req, res, next) {
    try {
      // Support GET query params or POST body
      const inputData = {
        token: req.query.token || req.body.token,
        code: req.body.code,
        email: req.query.email || req.body.email,
      };
      const validatedData = validateEmailVerification(inputData);
      const result = await authService.verifyEmail(validatedData);
      if (result.token) {
        setAuthCookie(res, result.token, true, req);
      }
      return successResponse(res, result.message, result, 200);
    } catch (error) {
      next(error);
    }
  }

  async resendVerification(req, res, next) {
    try {
      const validatedData = validateResendVerification(req.body);
      const result = await authService.resendVerification(validatedData);
      return successResponse(res, result.message, result, 200);
    } catch (error) {
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const validatedData = validateLogin(req.body);
      const result = await authService.login(validatedData);
      const rememberMe = req.body.rememberMe !== false;
      if (result.token) {
        setAuthCookie(res, result.token, rememberMe, req);
      }
      return successResponse(res, 'Login successful', result, 200);
    } catch (error) {
      next(error);
    }
  }

  async googleAuth(req, res, next) {
    try {
      const idToken = req.body.idToken || req.body.credential;
      const result = await authService.googleAuth({ idToken });
      if (result.token) {
        setAuthCookie(res, result.token, true, req);
      }
      return successResponse(
        res,
        result.isNewUser ? 'Google account registered successfully' : 'Google sign-in successful',
        result,
        200
      );
    } catch (error) {
      next(error);
    }
  }

  async forgotPassword(req, res, next) {
    try {
      const validatedData = validateForgotPassword(req.body);
      const result = await authService.forgotPassword(validatedData);
      return successResponse(res, result.message, result, 200);
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req, res, next) {
    try {
      const validatedData = validateResetPassword(req.body);
      const result = await authService.resetPassword(validatedData);
      return successResponse(res, result.message, result, 200);
    } catch (error) {
      next(error);
    }
  }

  async getMe(req, res, next) {
    try {
      const user = await authService.getProfile(req.user.id);
      const token = generateToken(user._id.toString(), { email: user.email });
      setAuthCookie(res, token, true, req);
      return successResponse(res, 'User profile fetched successfully', { user, token }, 200);
    } catch (error) {
      next(error);
    }
  }

  async logout(req, res, next) {
    try {
      clearAuthCookie(res, req);
      return successResponse(res, 'Logged out successfully', {}, 200);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
