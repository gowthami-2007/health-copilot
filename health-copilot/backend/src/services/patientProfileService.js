const PatientProfile = require('../models/PatientProfile');
const User = require('../models/User');
const { NotFoundError, ForbiddenError, BadRequestError } = require('../utils/errors');
const { sanitizeObjectId } = require('../utils/idSanitizer');

class PatientProfileService {
  /**
   * Retrieves all family patient profiles belonging to the user.
   * Auto-provisions a primary 'Self' profile if none exist yet.
   */
  async getProfiles(userId) {
    let profiles = await PatientProfile.find({ userId }).sort({ isPrimary: -1, createdAt: 1 });

    if (profiles.length === 0) {
      const user = await User.findById(userId);
      if (user) {
        const primaryProfile = await PatientProfile.create({
          userId: user._id,
          name: user.name,
          relationship: 'Self',
          dateOfBirth: user.dateOfBirth || null,
          gender: user.gender || '',
          isPrimary: true,
          notes: 'Account Holder Profile',
        });
        profiles = [primaryProfile];
      }
    }

    return profiles;
  }

  /**
   * Retrieves a single patient profile by ID, strictly enforcing user ownership.
   */
  async getProfileById(userId, profileId) {
    const cleanId = sanitizeObjectId(profileId);
    if (!cleanId) {
      throw new NotFoundError('Patient profile not found or invalid ID.');
    }
    const profile = await PatientProfile.findOne({ _id: cleanId, userId });
    if (!profile) {
      throw new NotFoundError('Patient profile not found or access denied.');
    }
    return profile;
  }

  /**
   * Creates a new family member patient profile.
   */
  async createProfile(userId, data) {
    const { name, relationship, dateOfBirth, gender, bloodGroup, allergies, chronicConditions, notes } = data;

    if (!name || !name.trim()) {
      throw new BadRequestError('Patient name is required.');
    }

    const isFirst = (await PatientProfile.countDocuments({ userId })) === 0;

    const profile = await PatientProfile.create({
      userId,
      name: name.trim(),
      relationship: relationship || 'Other',
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      gender: gender || '',
      bloodGroup: bloodGroup || '',
      allergies: Array.isArray(allergies) ? allergies : [],
      chronicConditions: Array.isArray(chronicConditions) ? chronicConditions : [],
      isPrimary: isFirst,
      notes: notes || '',
    });

    return profile;
  }

  /**
   * Updates an existing patient profile.
   */
  async updateProfile(userId, profileId, data) {
    const profile = await this.getProfileById(userId, profileId);

    const allowedFields = [
      'name',
      'relationship',
      'dateOfBirth',
      'gender',
      'bloodGroup',
      'allergies',
      'chronicConditions',
      'notes',
      'avatar',
    ];

    allowedFields.forEach((field) => {
      if (data[field] !== undefined) {
        profile[field] = data[field];
      }
    });

    await profile.save();
    return profile;
  }

  /**
   * Sets a specific profile as the primary active profile.
   */
  async setPrimary(userId, profileId) {
    const target = await this.getProfileById(userId, profileId);

    await PatientProfile.updateMany({ userId }, { $set: { isPrimary: false } });
    target.isPrimary = true;
    await target.save();

    return target;
  }

  /**
   * Deletes a non-primary family profile.
   */
  async deleteProfile(userId, profileId) {
    const profile = await this.getProfileById(userId, profileId);

    if (profile.isPrimary) {
      const otherProfiles = await PatientProfile.find({ userId, _id: { $ne: profileId } });
      if (otherProfiles.length === 0) {
        throw new BadRequestError('Cannot delete the only primary patient profile.');
      }
      otherProfiles[0].isPrimary = true;
      await otherProfiles[0].save();
    }

    await PatientProfile.findByIdAndDelete(profileId);
    return { success: true, message: 'Patient profile removed successfully.' };
  }

  /**
   * Helper to resolve active profile ID for data queries.
   */
  async resolveProfileId(userId, requestedProfileId = null) {
    const cleanId = sanitizeObjectId(requestedProfileId);
    if (cleanId) {
      const profile = await PatientProfile.findOne({ _id: cleanId, userId });
      if (profile) return profile._id;
    }
    const primary = await PatientProfile.findOne({ userId, isPrimary: true });
    if (primary) return primary._id;

    const anyProfile = await PatientProfile.findOne({ userId });
    if (anyProfile) return anyProfile._id;

    // Auto-create if none exists
    const profiles = await this.getProfiles(userId);
    return profiles[0]?._id || null;
  }
}

module.exports = new PatientProfileService();
