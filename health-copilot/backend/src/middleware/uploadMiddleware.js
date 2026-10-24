const multer = require('multer');
const path = require('path');
const fs = require('fs');
const config = require('../config/env');
const { BadRequestError } = require('../utils/errors');
const { ALLOWED_MIME_TYPES, ALLOWED_IMAGE_MIME_TYPES } = require('../../../document-service/src/validation/fileValidator');

// Ensure uploads directory exists
if (!fs.existsSync(config.uploadDir)) {
  fs.mkdirSync(config.uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userId = req.user && (req.user.id || req.user._id);
    const targetDir = userId
      ? path.join(config.uploadDir, userId.toString())
      : config.uploadDir;

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    cb(null, targetDir);
  },
  filename: (req, file, cb) => {
    // Generate safe unique filename
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    const cleanBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${cleanBase}-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new BadRequestError(
        'Invalid file type. Supported formats are PDF (.pdf) and images (.png, .jpg, .jpeg, .webp).'
      ),
      false
    );
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: config.maxFileSize, // 10MB configurable
  },
  fileFilter,
});

const uploadImageOnly = multer({
  storage,
  limits: {
    fileSize: config.maxFileSize,
  },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new BadRequestError(
          'Invalid file type. Prescription vision analysis requires an image (.png, .jpg, .jpeg, .webp). PDF and non-image files are not supported for image extraction.'
        ),
        false
      );
    }
  },
});

module.exports = upload;
module.exports.upload = upload;
module.exports.uploadImageOnly = uploadImageOnly;

