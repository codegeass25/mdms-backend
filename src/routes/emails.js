/**
 * Email endpoints:
 *   GET  /api/email-logs
 *   POST /api/send-email
 *   POST /api/test-email
 *   POST /api/send-reservation-email
 */

const express = require('express');
const { readStorage } = require('../db/store');
const {
  sendEmailWithRetry,
  verifySmtpHandshake,
  resolveConfig,
} = require('../services/emailService');
const {
  tplReservationConfirmation,
  tplReservationCancellation,
  tplReservationExpiration,
} = require('../templates/reservations');
const { ctx, baseShell } = require('../templates/shell');
const { REF_PLACEHOLDER } = require('../utils/email-ref');
const { asyncHandler } = require('../middleware/errorHandler');
const { EMAIL_REGEX } = require('../utils/validators');

const router = express.Router();

router.get('/email-logs', asyncHandler(async (_req, res) => {
  res.status(200).json(readStorage().emailLogs);
}));

router.post('/send-email', asyncHandler(async (req, res) => {
  const { to, subject, body, html, type, config } = req.body || {};
  if (!to || !subject || (!body && !html)) {
    return res.status(400).json({ error: 'Missing to/subject/body.' });
  }
  const db = readStorage();
  const cfg = config || db.emailConfig;
  const outcome = await sendEmailWithRetry({
    to, subject,
    html: html || null,
    text: body || null,
    type: type || 'Manual',
    config: cfg,
    settings: db.settings,
  });
  if (outcome.success) {
    return res.status(200).json({
      success: true,
      message: 'Email dispatched.',
      reference: outcome.reference,
      accepted: outcome.accepted,
      rejected: outcome.rejected,
    });
  }
  return res.status(422).json({
    error: outcome.reason,
    reference: outcome.reference,
    accepted: outcome.accepted,
    rejected: outcome.rejected,
  });
}));

router.post('/test-email', asyncHandler(async (req, res) => {
  // FIX: separate the test recipient from the SMTP config.
  // The frontend should send { to: 'test@example.com', server, port, ... }.
  const { to, ...cfg } = req.body || {};

  if (!to || !EMAIL_REGEX.test(to)) {
    return res.status(400).json({ error: 'A valid test recipient ("to") is required.' });
  }

  const resolved = resolveConfig(cfg);
  if (!resolved.email) return res.status(400).json({ error: 'Invalid config.' });

  const handshake = await verifySmtpHandshake(cfg);
  if (!handshake.ok) return res.status(422).json({ error: handshake.reason });

  const db = readStorage();
  const c = ctx(db);
  const html = baseShell({
    title: 'SMTP Test',
    bodyInner: `<h2 style="color:#047857;margin:0 0 12px 0;">SMTP handshake successful</h2><p>Your automated email pipeline is fully operational.</p>`,
    ...c, reference: REF_PLACEHOLDER, accent: '#047857',
  });
  const outcome = await sendEmailWithRetry({
    to,                              // <-- send to the supplied test recipient
    subject: `[${c.dormName}] SMTP Test`,
    html,
    type: 'Test',
    config: cfg,
    settings: db.settings,
  });
  if (outcome.success) {
    return res.status(200).json({
      success: true,
      message: 'Handshake verified — test email delivered.',
      reference: outcome.reference,
      accepted: outcome.accepted,
      rejected: outcome.rejected,
    });
  }
  return res.status(422).json({
    error: outcome.reason,
    reference: outcome.reference,
    accepted: outcome.accepted,
    rejected: outcome.rejected,
  });
}));

router.post('/send-reservation-email', asyncHandler(async (req, res) => {
  const { kind, reservation, reason, daysLeft } = req.body || {};
  if (!reservation || !reservation.email) {
    return res.status(400).json({ error: 'Reservation with email required.' });
  }
  const db = readStorage();
  let tpl, type = 'Reservation';
  if (kind === 'confirmation') {
    tpl = tplReservationConfirmation(db, reservation);
    type = 'Reservation Confirmation';
  } else if (kind === 'cancellation') {
    tpl = tplReservationCancellation(db, reservation, reason);
    type = 'Reservation Cancellation';
  } else if (kind === 'expiration') {
    tpl = tplReservationExpiration(db, reservation, daysLeft || 1);
    type = 'Reservation Expiration';
  } else {
    return res.status(400).json({
      error: 'Unknown kind. Use confirmation|cancellation|expiration.',
    });
  }

  const outcome = await sendEmailWithRetry({
    to: reservation.email,
    subject: tpl.subject,
    html: tpl.html,
    type,
    config: db.emailConfig,
    settings: db.settings,
  });
  res
    .status(outcome.success ? 200 : 422)
    .json(outcome.success
      ? {
          success: true,
          reference: outcome.reference,
          accepted: outcome.accepted,
          rejected: outcome.rejected,
        }
      : {
          error: outcome.reason,
          reference: outcome.reference,
          accepted: outcome.accepted,
          rejected: outcome.rejected,
        });
}));

module.exports = router;
