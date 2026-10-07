const authService = require('../services/authService');
const { validateRegistration, validateLogin } = require('../validators/authValidator');
const { successResponse } = require('../utils/apiResponse');

class AuthController {
  async register(req, res, next) {
    try {
      const validatedData = validateRegistration(req.body);
      const result = await authService.register(validatedData);
      return successResponse(res, 'Account created successfully', result, 201);
    } catch (error) {
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const validatedData = validateLogin(req.body);
      const result = await authService.login(validatedData);
      return successResponse(res, 'Login successful', result, 200);
    } catch (error) {
      next(error);
    }
  }

  async getMe(req, res, next) {
    try {
      const user = await authService.getProfile(req.user.id);
      return successResponse(res, 'User profile fetched successfully', { user }, 200);
    } catch (error) {
      next(error);
    }
  }

  async logout(req, res, next) {
    try {
      return successResponse(res, 'Logged out successfully', {}, 200);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
