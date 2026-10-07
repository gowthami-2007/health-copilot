const express = require('express');
const router = express.Router();
const { successResponse } = require('../utils/apiResponse');

router.get('/ping', (req, res) => successResponse(res, 'Document route active'));

module.exports = router;
