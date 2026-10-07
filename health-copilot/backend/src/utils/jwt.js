const jwt = require('jsonwebtoken');
const config = require('../config/env');

const generateToken = (userId, additionalClaims = {}) => {
  return jwt.sign(
    {
      id: userId,
      ...additionalClaims,
    },
    config.jwtSecret,
    {
      expiresIn: config.jwtExpiresIn,
    }
  );
};

const verifyToken = (token) => {
  return jwt.verify(token, config.jwtSecret);
};

module.exports = {
  generateToken,
  verifyToken,
};
