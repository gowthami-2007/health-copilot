class AppError extends Error {
  constructor(message, statusCode = 500, errorCode = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

class BadRequestError extends AppError {
  constructor(message = 'Bad Request', details = null) {
    super(message, 400, 'BAD_REQUEST', details);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized access', details = null) {
    super(message, 401, 'UNAUTHORIZED', details);
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Access forbidden', details = null) {
    super(message, 403, 'FORBIDDEN', details);
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found', details = null) {
    super(message, 404, 'NOT_FOUND', details);
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource conflict', details = null) {
    super(message, 409, 'CONFLICT', details);
  }
}

class ValidationError extends AppError {
  constructor(message = 'Validation error', details = null) {
    super(message, 422, 'VALIDATION_ERROR', details);
  }
}

class EmailNotVerifiedError extends AppError {
  constructor(emailOrMessage = 'Your email address has not been verified yet.', details = null) {
    const isEmail = typeof emailOrMessage === 'string' && emailOrMessage.includes('@');
    const message = isEmail
      ? 'Your email address has not been verified yet. Please check your inbox for your 6-digit verification code.'
      : emailOrMessage;
    const finalDetails = details || (isEmail ? { requiresVerification: true, email: emailOrMessage } : { requiresVerification: true });
    super(message, 403, 'EMAIL_NOT_VERIFIED', finalDetails);
  }
}

class NonMedicalDocumentError extends AppError {
  constructor(
    message = 'This file does not appear to be health-related. Please upload a medical prescription, laboratory report, medical certificate, discharge summary, or another healthcare document.',
    details = null
  ) {
    super(message, 422, 'NON_MEDICAL_DOCUMENT', details);
  }
}

class DocumentClassificationUncertainError extends AppError {
  constructor(
    message = "We couldn't confidently determine whether this document is health-related. Please upload a clearer image or a readable PDF.",
    details = null
  ) {
    super(message, 422, 'DOCUMENT_CLASSIFICATION_UNCERTAIN', details);
  }
}

class DocumentUnreadableError extends AppError {
  constructor(
    message = 'This file is empty, corrupted, or unreadable. Please upload a valid PDF or a clear image.',
    details = null
  ) {
    super(message, 400, 'DOCUMENT_UNREADABLE', details);
  }
}

module.exports = {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  EmailNotVerifiedError,
  NonMedicalDocumentError,
  DocumentClassificationUncertainError,
  DocumentUnreadableError,
};

