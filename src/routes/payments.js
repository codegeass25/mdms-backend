/**
 * POST /api/payment — record a payment.
 *
 * Behavior preserved verbatim from the legacy backend:
 *   - Decrement balance; clamp to 0.
 *   - When paid off: status='Paid' + reminderHistory reset.
 *   - Insert TX-<timestamp><rand> transaction.
 *   - Append audit entry.
 *   - Fire receipt email asynchronously (fire-and-forget, retry-aware).
 */

const express = require('express');
const { readStorage, writeStorageAtomic } = require('../db/store');
const { appendAuditEntry } = require('../services/auditService');
const { sendEmailWithRetry } = require('../services/emailService');
const { tplPaymentReceipt } = require('../templates/receipt');

const router = express.Router();

router.post('/', (req, res) => {
  try {
    const db = readStorage();
    const { boarderId, amount, reference, orNumber } = req.body || {};
    const numericAmount = parseFloat(amount);

    if (!boarderId || isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ error: 'Payment amount must be positive.' });
    }
    const tenant = db.boarders.find((b) => b.id === boarderId);
    if (!tenant) return res.status(404).json({ error: 'Tenant not found.' });

    const prevBalance = parseFloat(tenant.balance) || 0;
    tenant.balance = prevBalance - numericAmount;
    if (tenant.balance <= 0) {
      tenant.balance = 0;
      tenant.status = 'Paid';
      tenant.reminderHistory = [];
    }

    const tx = {
      id: 'TX-' + Date.now() + Math.floor(Math.random() * 10),
      type: 'Payment',
      boarderId,
      date: new Date().toISOString().split('T')[0],
      amount: numericAmount,
      reference: reference || '',
      orNumber: orNumber || '',
      details: `Payment recorded. Ref: ${reference || 'None'}`,
    };
    db.transactions.push(tx);
    appendAuditEntry('Billing Ledger', `Payment ₱${numericAmount} for ${tenant.name}`, req);
    writeStorageAtomic(db);

    // Async receipt email — never blocks the response.
    (async () => {
      try {
        const fresh = readStorage();
        const cfg = (req.body && req.body.emailConfig) || fresh.emailConfig;
        if (cfg && cfg.enabled && tenant.email) {
          const { subject, html } = tplPaymentReceipt(fresh, tenant, tx, prevBalance);
          await sendEmailWithRetry({
            to: tenant.email, subject, html,
            type: 'Receipt', config: cfg, settings: fresh.settings,
          });
        }
      } catch (e) {
        console.error('[receipt] async failure:', e.message);
      }
    })();

    res.status(200).json({ success: true, transaction: tx });
  } catch (e) {
    res.status(500).json({ error: 'Payment processing failed.', details: e.message });
  }
});

module.exports = router;
