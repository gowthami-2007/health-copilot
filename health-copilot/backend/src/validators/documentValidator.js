const { BadRequestError } = require('../utils/errors');

const validateDocumentUpload = (req) => {
  if (!req.file) {
    throw new BadRequestError('No file was uploaded. Please attach a document.');
  }

  const allowedTypes = [
    'Blood Report',
    'Prescription',
    'Lab Report',
    'Doctor Note',
    'Imaging Report',
    'Other',
  ];

  let documentType = req.body.documentType || 'Other';
  if (!allowedTypes.includes(documentType)) {
    documentType = 'Other';
  }

  return {
    documentType,
  };
};

module.exports = {
  validateDocumentUpload,
};
