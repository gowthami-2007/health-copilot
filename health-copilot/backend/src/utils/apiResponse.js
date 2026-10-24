/**
 * Standard API response format helper for consistent REST API responses.
 */

const successResponse = (res, message = 'Success', data = {}, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

const errorResponse = (res, message = 'An error occurred', errorCode = 'INTERNAL_ERROR', statusCode = 500, details = null) => {
  const code = typeof errorCode === 'object' && errorCode !== null ? errorCode.code || 'INTERNAL_ERROR' : errorCode;
  const msg = typeof errorCode === 'object' && errorCode !== null ? errorCode.message || message : message;

  const payload = {
    success: false,
    message: msg,
    error: {
      code,
      message: msg,
    },
    errorCode: code,
  };

  if (details && process.env.NODE_ENV !== 'production') {
    payload.details = details;
  }

  return res.status(statusCode).json(payload);
};


module.exports = {
  successResponse,
  errorResponse,
};
