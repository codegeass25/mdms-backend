/**
 * GET  /api/data   — return full application state (SMTP password redacted).
 * POST /api/data   — merge incoming payload, force-preserve server-owned
 *                    collections (emailLogs, emailCounter), union
 *                    reminderHistory per boarder id.
 *
 * These merge semantics are identical to the legacy backend. The
 * frontend depends on them.
 */

const express = require('express');
const { readStorage, writeStorageAtomic } = require('../db/store');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

function redactSensitive(db) {
  // Never leak the SMTP password to the browser.
  if (db && db.emailConfig && db.emailConfig.pass) {
    return { ...db, emailConfig: { ...db.emailConfig, pass: '' } };
  }
  return db;
}

router.get('/', asyncHandler(async (_req, res) => {
  res.status(200).json(redactSensitive(readStorage()));
}));

router.post('/', asyncHandler(async (req, res) => {
  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({ error: 'Invalid payload.' });
  }
  const existing = readStorage();
  const incoming = req.body;
  const merged = { ...existing, ...incoming };

  // Force-preserve server-owned collections.
  merged.emailLogs = Array.isArray(existing.emailLogs) ? existing.emailLogs : [];
  merged.emailCounter =
    existing.emailCounter && typeof existing.emailCounter === 'object'
      ? existing.emailCounter
      : {};

  // If the frontend blanked the SMTP password (because we redact it on
  // GET), keep the existing one so a save from the UI doesn't wipe it.
  if (merged.emailConfig && !merged.emailConfig.pass && existing.emailConfig) {
    merged.emailConfig.pass = existing.emailConfig.pass || '';
  }

  // Union reminderHistory per boarder.
  if (Array.isArray(merged.boarders)) {
    const oldById = new Map((existing.boarders || []).map((b) => [b.id, b]));
    merged.boarders = merged.boarders.map((b) => {
      const prior = oldById.get(b.id);
      if (!prior) return b;
      const priorHist = Array.isArray(prior.reminderHistory) ? prior.reminderHistory : [];
      const curHist = Array.isArray(b.reminderHistory) ? b.reminderHistory : [];
      const union = Array.from(new Set([...priorHist, ...curHist]));
      return { ...b, reminderHistory: union };
    });
  }

  writeStorageAtomic(merged);
  res.status(200).json({ success: true, message: 'Data synced.' });
}));

module.exports = router;
