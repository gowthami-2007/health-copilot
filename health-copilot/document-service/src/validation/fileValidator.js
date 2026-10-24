const fs = require('fs');

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

const ALLOWED_EXTENSIONS = ['.pdf', '.jpeg', '.jpg', '.png', '.webp'];
const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_IMAGE_EXTENSIONS = ['.jpeg', '.jpg', '.png', '.webp'];
const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MIN_FILE_SIZE = 8; // At least enough bytes for magic header check

/**
 * Validates the file signature (magic numbers) of a file or buffer.
 * Protects against RangeError by checking buffer length before offset reads.
 *
 * @param {Buffer|string} bufferOrPath - File buffer or absolute disk path
 * @returns {{ isValid: boolean, detectedType: string|null, error: string|null }}
 */
const validateFileSignature = (bufferOrPath) => {
  try {
    let buf;
    if (Buffer.isBuffer(bufferOrPath)) {
      buf = bufferOrPath;
    } else if (typeof bufferOrPath === 'string' && fs.existsSync(bufferOrPath)) {
      const fd = fs.openSync(bufferOrPath, 'r');
      const tempBuf = Buffer.alloc(32);
      const bytesRead = fs.readSync(fd, tempBuf, 0, 32, 0);
      fs.closeSync(fd);
      buf = tempBuf.subarray(0, bytesRead);
    } else {
      return { isValid: false, detectedType: null, error: 'File content unavailable for signature check' };
    }

    if (!buf || buf.length < 4) {
      return { isValid: false, detectedType: null, error: 'File is too small or truncated to contain a valid signature' };
    }

    // 1. PDF signature: %PDF (0x25 0x50 0x44 0x46)
    if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) {
      return { isValid: true, detectedType: 'application/pdf', error: null };
    }

    // 2. JPEG signature: 0xFF 0xD8 0xFF
    if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) {
      return { isValid: true, detectedType: 'image/jpeg', error: null };
    }

    // 3. PNG signature: 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A (8 bytes)
    if (
      buf.length >= 8 &&
      buf[0] === 0x89 &&
      buf[1] === 0x50 &&
      buf[2] === 0x4E &&
      buf[3] === 0x47 &&
      buf[4] === 0x0D &&
      buf[5] === 0x0A &&
      buf[6] === 0x1A &&
      buf[7] === 0x0A
    ) {
      return { isValid: true, detectedType: 'image/png', error: null };
    }

    // 4. WEBP signature: 'RIFF' at 0..3 and 'WEBP' at 8..11
    if (
      buf.length >= 12 &&
      buf[0] === 0x52 &&
      buf[1] === 0x49 &&
      buf[2] === 0x46 &&
      buf[3] === 0x46 &&
      buf[8] === 0x57 &&
      buf[9] === 0x45 &&
      buf[10] === 0x42 &&
      buf[11] === 0x50
    ) {
      return { isValid: true, detectedType: 'image/webp', error: null };
    }

    return {
      isValid: false,
      detectedType: null,
      error: 'File signature mismatch. The file content does not match supported PDF, JPEG, PNG, or WEBP formats.',
    };
  } catch (err) {
    return {
      isValid: false,
      detectedType: null,
      error: `Signature validation failed: ${err.message}`,
    };
  }
};

/**
 * Validates uploaded file metadata and optionally checks binary signature.
 */
const validateFile = (file, maxSize = DEFAULT_MAX_FILE_SIZE) => {
  if (!file) {
    return { isValid: false, error: 'No file provided' };
  }

  // Validate size
  const size = typeof file.size === 'number' ? file.size : 0;
  if (size <= 0) {
    return { isValid: false, error: 'File is empty (0 bytes). Please upload a valid document.' };
  }

  if (size > maxSize) {
    const maxMb = Math.round(maxSize / (1024 * 1024));
    return {
      isValid: false,
      error: `File size (${(size / (1024 * 1024)).toFixed(1)}MB) exceeds the maximum limit of ${maxMb}MB`,
    };
  }

  // Validate MIME type
  const mimetype = (file.mimetype || '').toLowerCase();
  if (!ALLOWED_MIME_TYPES.includes(mimetype)) {
    return {
      isValid: false,
      error: `Invalid file format (${mimetype || 'unknown'}). Only PDF, JPG, PNG, and WEBP documents are allowed.`,
    };
  }

  // Validate extension safely without negative slice/out-of-bounds
  const originalName = String(file.originalname || file.name || '');
  const dotIndex = originalName.lastIndexOf('.');
  if (dotIndex === -1 || dotIndex === originalName.length - 1) {
    return {
      isValid: false,
      error: 'Missing file extension. Supported extensions: .pdf, .jpg, .jpeg, .png, .webp',
    };
  }

  const extension = originalName.substring(dotIndex).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return {
      isValid: false,
      error: `Invalid file extension (${extension}). Supported extensions: .pdf, .jpg, .jpeg, .png, .webp`,
    };
  }

  // If buffer or physical path is provided, perform deep signature check
  if (file.buffer || (file.path && typeof file.path === 'string')) {
    const sigResult = validateFileSignature(file.buffer || file.path);
    if (!sigResult.isValid) {
      return { isValid: false, error: sigResult.error };
    }
  }

  return { isValid: true, error: null };
};

/**
 * Dedicated validator for Prescription Image Extraction.
 * Strictly accepts images only (JPEG, PNG, WEBP) and rejects PDFs, executables, or corrupted files.
 */
const validatePrescriptionImage = (file, maxSize = DEFAULT_MAX_FILE_SIZE) => {
  if (!file) {
    return { isValid: false, error: 'No prescription image provided. Please select an image to upload.' };
  }

  const size = typeof file.size === 'number' ? file.size : 0;
  if (size <= 0) {
    return { isValid: false, error: 'The uploaded file is empty (0 bytes). Please select a valid prescription image.' };
  }

  if (size > maxSize) {
    const maxMb = Math.round(maxSize / (1024 * 1024));
    return {
      isValid: false,
      error: `Prescription image size (${(size / (1024 * 1024)).toFixed(1)}MB) exceeds the maximum limit of ${maxMb}MB.`,
    };
  }

  const mimetype = (file.mimetype || '').toLowerCase();
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(mimetype)) {
    return {
      isValid: false,
      error: `Unsupported format (${mimetype || 'unknown'}). Please upload a prescription image in JPG, PNG, or WEBP format. PDF files are not supported for direct vision extraction.`,
    };
  }

  const originalName = String(file.originalname || file.name || '');
  const dotIndex = originalName.lastIndexOf('.');
  if (dotIndex === -1 || dotIndex === originalName.length - 1) {
    return {
      isValid: false,
      error: 'The uploaded file is missing a valid image extension (.jpg, .jpeg, .png, .webp).',
    };
  }

  const extension = originalName.substring(dotIndex).toLowerCase();
  if (!ALLOWED_IMAGE_EXTENSIONS.includes(extension)) {
    return {
      isValid: false,
      error: `Invalid image extension (${extension}). Supported image formats: .jpg, .jpeg, .png, .webp`,
    };
  }

  // Verify binary magic numbers
  if (file.buffer || (file.path && typeof file.path === 'string')) {
    const sigResult = validateFileSignature(file.buffer || file.path);
    if (!sigResult.isValid) {
      return { isValid: false, error: `Invalid image content: ${sigResult.error}` };
    }
    if (sigResult.detectedType === 'application/pdf') {
      return {
        isValid: false,
        error: 'PDF documents cannot be analyzed by the image vision model. Please upload a clear photo or scan of the prescription (JPG, PNG, or WEBP).',
      };
    }
  }

  return { isValid: true, error: null };
};

module.exports = {
  validateFile,
  validateFileSignature,
  validatePrescriptionImage,
  ALLOWED_MIME_TYPES,
  ALLOWED_EXTENSIONS,
  ALLOWED_IMAGE_MIME_TYPES,
  ALLOWED_IMAGE_EXTENSIONS,
  DEFAULT_MAX_FILE_SIZE,
  MIN_FILE_SIZE,
};
