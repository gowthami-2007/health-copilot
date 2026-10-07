const express = require('express');
const router = express.Router();
const { successResponse } = require('../utils/apiResponse');

router.get('/ping', (req, res) => successResponse(res, 'Medication route active'));

module.exports = router;
