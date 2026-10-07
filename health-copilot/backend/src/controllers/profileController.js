const User = require('../models/User');
const Document = require('../models/Document');
const Medication = require('../models/Medication');
const Appointment = require('../models/Appointment');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Timeline = require('../models/Timeline');
const documentService = require('../services/documentService');
const { successResponse } = require('../utils/apiResponse');
const { NotFoundError } = require('../utils/errors');

class ProfileController {
  async getProfile(req, res, next) {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        throw new NotFoundError('User not found');
      }
      return successResponse(res, 'User profile retrieved', { user: user.toJSON() }, 200);
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req, res, next) {
    try {
      const { name, dateOfBirth, gender } = req.body;
      const user = await User.findById(req.user.id);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      if (name) user.name = name.trim();
      if (dateOfBirth) user.dateOfBirth = new Date(dateOfBirth);
      if (gender !== undefined) user.gender = gender;

      await user.save();

      return successResponse(res, 'Profile updated successfully', { user: user.toJSON() }, 200);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Complete Patient Data Deletion (HIPAA / GDPR / Privacy requirement)
   */
  async deleteAccount(req, res, next) {
    try {
      const userId = req.user.id;

      // 1. Delete all user documents & physical files
      const userDocs = await Document.find({ userId });
      for (const doc of userDocs) {
        try {
          await documentService.deleteDocument(doc._id, userId);
        } catch (e) {
          console.warn(`Error deleting document during account purge: ${doc._id}`);
        }
      }

      // 2. Delete conversations and messages
      const conversations = await Conversation.find({ userId });
      const convIds = conversations.map((c) => c._id);
      await Message.deleteMany({ conversationId: { $in: convIds } });
      await Conversation.deleteMany({ userId });

      // 3. Delete medications & appointments
      await Medication.deleteMany({ userId });
      await Appointment.deleteMany({ userId });

      // 4. Delete timeline events
      await Timeline.deleteMany({ userId });

      // 5. Delete User record
      await User.findByIdAndDelete(userId);

      return successResponse(
        res,
        'Account and all associated healthcare records have been permanently erased.',
        {},
        200
      );
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ProfileController();
