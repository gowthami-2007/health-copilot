const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
];

const ALLOWED_EXTENSIONS = ['.pdf', '.jpeg', '.jpg', '.png'];
const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const validateFile = (file, maxSize = DEFAULT_MAX_FILE_SIZE) => {
  if (!file) {
    return { isValid: false, error: 'No file provided' };
  }

  // Validate size
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: `File size exceeds the maximum limit of ${Math.round(maxSize / (1024 * 1024))}MB`,
    };
  }

  // Validate MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return {
      isValid: false,
      error: 'Invalid file format. Only PDF, JPG, and PNG documents are allowed.',
    };
  }

  // Validate extension
  const originalName = file.originalname || '';
  const extension = originalName.substring(originalName.lastIndexOf('.')).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return {
      isValid: false,
      error: `Invalid file extension (${extension}). Supported extensions: .pdf, .jpg, .jpeg, .png`,
    };
  }

  return { isValid: true, error: null };
};

module.exports = {
  validateFile,
  ALLOWED_MIME_TYPES,
  ALLOWED_EXTENSIONS,
  DEFAULT_MAX_FILE_SIZE,
};
