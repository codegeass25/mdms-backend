/**
 * Email Reference Number generator.
 * Format: MDMS-<PREFIX>-YYYYMMDD-#### (sequence per prefix per day).
 * Counter persisted in db.emailCounter so numbers survive restarts.
 */
const { readStorage, writeStorageAtomic } = require('../db/store');

const REF_PREFIX_BY_TYPE = {
  Upcoming: 'REM',
  'Due Today': 'DUE',
  Overdue: 'OVD',
  Receipt: 'RCP',
  Reservation: 'RSV',
  'Reservation Confirmation': 'RSV',
  'Reservation Cancellation': 'CAN',
  'Reservation Expiration': 'EXP',
  Test: 'TST',
  Manual: 'MAN',
  Reminder: 'REM',
};

const REF_PLACEHOLDER = '__MDMS_EMAIL_REF__';

function refPrefixFor(type) {
  return REF_PREFIX_BY_TYPE[type] || 'GEN';
}

function generateEmailReference(type) {
  let db;
  try { db = readStorage(); } catch (_) { db = null; }
  if (!db) db = { emailCounter: {} };
  if (!db.emailCounter || typeof db.emailCounter !== 'object')
    db.emailCounter = {};

  const prefix = refPrefixFor(type);
  const yyyymmdd = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const counterKey = `${prefix}-${yyyymmdd}`;
  const next = (parseInt(db.emailCounter[counterKey], 10) || 0) + 1;
  db.emailCounter[counterKey] = next;

  try { writeStorageAtomic(db); } catch (_) { /* best effort */ }

  const seq = String(next).padStart(4, '0');
  return `MDMS-${prefix}-${yyyymmdd}-${seq}`;
}

function injectReference(html, reference) {
  return (html || '').split(REF_PLACEHOLDER).join(reference);
}

module.exports = {
  REF_PLACEHOLDER,
  generateEmailReference,
  injectReference,
  refPrefixFor,
};
