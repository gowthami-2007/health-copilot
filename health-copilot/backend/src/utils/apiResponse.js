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
  const payload = {
    success: false,
    message,
    error: errorCode,
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
