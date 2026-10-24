const mongoose = require('mongoose');

/**
 * Safely extracts and validates a MongoDB ObjectId string from any input
 * (string, object with patientProfileId / _id / id, or undefined/null).
 * Returns null if the value is missing, invalid, "[object Object]", "undefined", "null", or not a valid ObjectId hex.
 */
function sanitizeObjectId(val) {
  if (!val) return null;

  // Handle object inputs like { patientProfileId: '...' } or { _id: '...' }
  if (typeof val === 'object') {
    val = val.patientProfileId || val._id || val.id || null;
  }

  if (!val || typeof val !== 'string') return null;

  const trimmed = val.trim();
  if (
    trimmed === '' ||
    trimmed === 'undefined' ||
    trimmed === 'null' ||
    trimmed === '[object Object]' ||
    trimmed === 'NaN'
  ) {
    return null;
  }

  if (!mongoose.Types.ObjectId.isValid(trimmed)) {
    return null;
  }

  return trimmed;
}

module.exports = {
  sanitizeObjectId,
};
