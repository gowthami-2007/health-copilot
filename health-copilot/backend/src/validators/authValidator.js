const { BadRequestError, ValidationError } = require('../utils/errors');

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const validateEmailFormat = (email) => {
  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    throw new ValidationError('Please enter a valid email address.');
  }
  return email.trim().toLowerCase();
};

const validatePasswordStrength = (password) => {
  if (!password || typeof password !== 'string') {
    throw new ValidationError('Password is required.');
  }
  if (password.length < 8) {
    throw new ValidationError('Password must be at least 8 characters long.');
  }
  if (!/[a-zA-Z]/.test(password) || !/[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    throw new ValidationError('Password must contain at least one letter and at least one number or symbol.');
  }
  return password;
};

const validateRegistration = (data) => {
  const { name, email, password, confirmPassword } = data || {};

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    throw new ValidationError('Name is required and must be at least 2 characters.');
  }

  const normalizedEmail = validateEmailFormat(email);
  validatePasswordStrength(password);

  if (confirmPassword !== undefined && password !== confirmPassword) {
    throw new ValidationError('Passwords do not match.');
  }

  return {
    name: name.trim(),
    email: normalizedEmail,
    password,
  };
};

const validateLogin = (data) => {
  const { email, password } = data || {};

  if (!email || typeof email !== 'string' || !email.trim()) {
    throw new BadRequestError('Email is required.');
  }

  if (!password || typeof password !== 'string') {
    throw new BadRequestError('Password is required.');
  }

  return {
    email: email.trim().toLowerCase(),
    password,
    rememberMe: data.rememberMe !== false,
  };
};

const validateEmailVerification = (data) => {
  const { token, code, email } = data || {};

  if (!token && !code) {
    throw new ValidationError('Verification token or 6-digit code is required.');
  }

  return {
    token: token ? String(token).trim() : null,
    code: code ? String(code).trim() : null,
    email: email ? email.trim().toLowerCase() : null,
  };
};

const validateResendVerification = (data) => {
  const { email } = data || {};
  return {
    email: validateEmailFormat(email),
  };
};

const validateForgotPassword = (data) => {
  const { email } = data || {};
  return {
    email: validateEmailFormat(email),
  };
};

const validateResetPassword = (data) => {
  const { token, code, email, password, confirmPassword } = data || {};

  if (!token && (!code || !email)) {
    throw new ValidationError('Password reset token or 6-digit verification code is required.');
  }

  validatePasswordStrength(password);

  if (confirmPassword !== undefined && password !== confirmPassword) {
    throw new ValidationError('Passwords do not match.');
  }

  return {
    token: token ? String(token).trim() : null,
    code: code ? String(code).trim() : null,
    email: email ? email.trim().toLowerCase() : null,
    password,
  };
};

module.exports = {
  validateRegistration,
  validateLogin,
  validateEmailVerification,
  validateResendVerification,
  validateForgotPassword,
  validateResetPassword,
};
