const express = require('express');
const { readStorage } = require('../db/store');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

router.get('/', asyncHandler(async (_req, res) => {
  res.status(200).json(readStorage().transactions);
}));

module.exports = router;
