const express = require('express');
const router = express.Router();
const { successResponse } = require('../utils/apiResponse');

router.get('/ping', (req, res) => successResponse(res, 'Timeline route active'));

module.exports = router;
