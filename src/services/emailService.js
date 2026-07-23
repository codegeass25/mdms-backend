/**
 * Brevo-first SMTP pipeline. Provider-agnostic transport (works with any
 * SMTP relay); Brevo defaults ship in config/env.js.
 *
 * Behavior preserved:
 *   - Config precedence: request-body `config` > env defaults.
 *   - validate → verify → send with retry.
 *   - Per-dispatch Email Reference Number, logged win-or-lose.
 *   - `sendEmailWithRetry` NEVER throws — one failure must not halt
 *     the surrounding batch.
 */

const nodemailer = require('nodemailer');
const env = require('../config/env');
const { EMAIL_REGEX } = require('../utils/validators');
const { DEFAULT_SETTINGS } = require('../db/normalize');
const {
  generateEmailReference,
  injectReference,
} = require('../utils/email-ref');
const { appendEmailLog } = require('./emailLogService');

/**
 * Resolve the effective SMTP config: overlay the caller-provided config
 * on top of the env defaults. `enabled` defaults to true unless the
 * request explicitly disables it.
 */
function resolveConfig(cfg = {}) {
  const merged = {
    enabled: cfg.enabled !== undefined ? !!cfg.enabled : true,
    server: cfg.server || env.smtp.host,
    port: parseInt(cfg.port, 10) || env.smtp.port,
    secure:
      cfg.secure !== undefined
        ? !!cfg.secure
        : (parseInt(cfg.port, 10) || env.smtp.port) === 465 || env.smtp.secure,
    email: cfg.email || env.smtp.user,
    pass: cfg.pass || env.smtp.pass,
    name: cfg.name || env.smtp.fromName,
    fromEmail: cfg.fromEmail || env.smtp.fromEmail || cfg.email || env.smtp.user,
  };
  return merged;
}

function validateSmtpConfig(cfg) {
  if (!cfg) return 'SMTP config missing.';
  if (!cfg.enabled) return 'SMTP integration is disabled.';
  if (!cfg.email || !EMAIL_REGEX.test(cfg.email))
    return 'SMTP username is missing or invalid.';
  if (!cfg.pass) return 'SMTP password / API key is missing.';
  if (!cfg.server) return 'SMTP server host is missing.';
  if (!cfg.port || isNaN(parseInt(cfg.port, 10)))
    return 'SMTP port is invalid.';
  return null;
}

function buildTransport(cfg) {
  const host = String(cfg.server).trim();
  const user = String(cfg.email).trim();
  // Strip whitespace in the password — SMTP relays reject spaced tokens.
  const pass = String(cfg.pass).replace(/\s+/g, '');
  const port = parseInt(cfg.port, 10);
  const secure = cfg.secure === true || port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    requireTLS: !secure,
    auth: { user, pass },
    tls: { servername: host, minVersion: 'TLSv1.2' },
    family: 4,                 // force IPv4 — fixes ENETUNREACH on Render
    connectionTimeout: 20000,
    greetingTimeout: 15000,
    socketTimeout: 25000,
    pool: false,
  });
}

async function verifySmtpHandshake(rawCfg) {
  const cfg = resolveConfig(rawCfg);
  const invalid = validateSmtpConfig(cfg);
  if (invalid) return { ok: false, reason: invalid };
  try {
    const transport = buildTransport(cfg);
    await transport.verify();
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: 'SMTP verify failed: ' + e.message };
  }
}

async function sendEmailWithRetry({
  to,
  subject,
  html,
  text,
  type = 'Reminder',
  config,
  settings,
}) {
  const cfg = resolveConfig(config);
  const st = { ...DEFAULT_SETTINGS, ...(settings || {}) };
  const maxAttempts = Math.max(1, (st.retryAttempts || 3) + 1);
  const waitMs = Math.max(1000, (st.retryIntervalMinutes || 5) * 60 * 1000);

  const reference = generateEmailReference(type);
  const finalHtml = injectReference(html, reference);

  if (!to || !EMAIL_REGEX.test(to)) {
    const err = 'Invalid recipient email format.';
    appendEmailLog({ to: to || '', subject, type, status: 'Failed', retries: 0, error: err, reference });
    return { success: false, reason: err, reference };
  }

  const invalid = validateSmtpConfig(cfg);
  if (invalid) {
    appendEmailLog({ to, subject, type, status: 'Failed', retries: 0, error: invalid, reference });
    return { success: false, reason: invalid, reference };
  }

  let transport;
  try {
    transport = buildTransport(cfg);
  } catch (e) {
    appendEmailLog({ to, subject, type, status: 'Failed', retries: 0, error: 'Transport init: ' + e.message, reference });
    return { success: false, reason: e.message, reference };
  }

  const fromAddr = cfg.fromEmail || cfg.email;
  const mailOptions = {
    from: `"${cfg.name || 'MDMS'}" <${fromAddr}>`,
    to,
    subject,
    html: finalHtml || undefined,
    text: text || undefined,
    replyTo: st.replyTo || undefined,
    headers: { 'X-MDMS-Reference': reference, 'X-MDMS-Type': type },
  };

  let attempt = 0;
  let lastErr;
  while (attempt < maxAttempts) {
    try {
      const info = await transport.sendMail(mailOptions);
      appendEmailLog({
        to, subject, type, status: 'Sent',
        retries: attempt, error: '',
        reference, messageId: info.messageId || '',
      });
      return { success: true, reference, messageId: info.messageId };
    } catch (e) {
      lastErr = e;
      attempt++;
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, waitMs));
      }
    }
  }

  appendEmailLog({
    to, subject, type, status: 'Failed',
    retries: attempt - 1, error: (lastErr && lastErr.message) || 'Unknown SMTP failure',
    reference,
  });
  return { success: false, reason: (lastErr && lastErr.message) || 'SMTP failure', reference };
}

module.exports = {
  resolveConfig,
  validateSmtpConfig,
  verifySmtpHandshake,
  sendEmailWithRetry,
};
