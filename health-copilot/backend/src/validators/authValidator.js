const { BadRequestError, ValidationError } = require('../utils/errors');

const validateRegistration = (data) => {
  const { name, email, password, confirmPassword } = data || {};

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    throw new ValidationError('Name is required and must be at least 2 characters.');
  }

  if (!email || typeof email !== 'string') {
    throw new ValidationError('A valid email address is required.');
  }

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email.trim())) {
    throw new ValidationError('Please enter a valid email address format.');
  }

  if (!password || typeof password !== 'string' || password.length < 8) {
    throw new ValidationError('Password is required and must be at least 8 characters long.');
  }

  if (confirmPassword !== undefined && password !== confirmPassword) {
    throw new ValidationError('Passwords do not match.');
  }

  return {
    name: name.trim(),
    email: email.trim().toLowerCase(),
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
  };
};

module.exports = {
  validateRegistration,
  validateLogin,
};
