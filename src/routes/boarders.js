const express = require('express');
const { readStorage, writeStorageAtomic } = require('../db/store');
const { validateBoarderPayload } = require('../utils/validators');
const { appendAuditEntry } = require('../services/auditService');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

router.get('/', asyncHandler(async (_req, res) => {
  res.status(200).json(readStorage().boarders);
}));

router.post('/', (req, res) => {
  try {
    const db = readStorage();
    const record = req.body;
    validateBoarderPayload(record);

    if (!record.id) {
      record.id = 'BRD-' + Date.now();
      db.boarders.push(record);
      appendAuditEntry('Boarder Directory', `Created new tenant: ${record.name}`, req);
    } else {
      const idx = db.boarders.findIndex((b) => b.id === record.id);
      if (idx !== -1) {
        db.boarders[idx] = { ...db.boarders[idx], ...record };
        appendAuditEntry('Boarder Directory', `Updated tenant: ${record.name}`, req);
      } else {
        db.boarders.push(record);
      }
    }
    writeStorageAtomic(db);
    res.status(200).json({ success: true, record });
  } catch (e) {
    res.status(400).json({ error: 'Persistence rejected.', details: e.message });
  }
});

module.exports = router;
