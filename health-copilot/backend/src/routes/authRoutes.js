const express = require('express');
const router = express.Router();
const { successResponse } = require('../utils/apiResponse');

// Health/placeholder route for auth
router.get('/ping', (req, res) => successResponse(res, 'Auth route active'));

module.exports = router;
