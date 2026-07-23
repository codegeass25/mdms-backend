/**
 * Automated billing reminder engine. Behavior preserved verbatim:
 *   - Skips tenants with no email, invalid email, or zero balance.
 *   - Fires configured schedule offsets (pre-due, due-today, post-due).
 *   - Weekly re-nag while overdue.
 *   - Dedupes by cycle key stored in tenant.reminderHistory.
 */

const { readStorage, writeStorageAtomic } = require('../db/store');
const { DEFAULT_SETTINGS } = require('../db/normalize');
const { EMAIL_REGEX } = require('../utils/validators');
const { sendEmailWithRetry } = require('./emailService');
const {
  tplUpcomingDue, tplDueToday, tplOverdue,
} = require('../templates/reminders');

function computeNextDueDate(tenant) {
  if (tenant.dueDate) {
    const explicit = new Date(tenant.dueDate + 'T00:00:00');
    if (!isNaN(explicit)) {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      while (explicit < today) explicit.setMonth(explicit.getMonth() + 1);
      return explicit;
    }
  }
  if (tenant.moveInDate) {
    const parts = tenant.moveInDate.split('-');
    if (parts.length === 3) {
      const dueDay = parseInt(parts[2], 10);
      if (!isNaN(dueDay)) {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        let cand = new Date(today.getFullYear(), today.getMonth(), dueDay);
        while (cand < today)
          cand = new Date(cand.getFullYear(), cand.getMonth() + 1, dueDay);
        return cand;
      }
    }
  }
  const t = new Date(); t.setHours(0, 0, 0, 0); return t;
}

const cycleKey = (dueDate) => dueDate.toISOString().split('T')[0];

async function executeAutomatedBillingReminderEngine() {
  console.log(`[SCHEDULER] Reminder pass @ ${new Date().toISOString()}`);
  let sent = 0, skipped = 0, failed = 0;

  const db = readStorage();
  const st = { ...DEFAULT_SETTINGS, ...(db.settings || {}) };

  if (!db.emailConfig || !db.emailConfig.enabled) {
    console.log('[SCHEDULER] Email disabled — skipping.');
    return { sent: 0, skipped: db.boarders.length, reason: 'email_disabled' };
  }
  if (st.autoRemindersEnabled === false) {
    console.log('[SCHEDULER] Auto reminders disabled in settings.');
    return { sent: 0, skipped: db.boarders.length, reason: 'auto_disabled' };
  }

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const schedule = (st.reminderSchedule || DEFAULT_SETTINGS.reminderSchedule)
    .slice()
    .map((n) => parseInt(n, 10))
    .filter((n) => !isNaN(n))
    .sort((a, b) => b - a);
  const weeklyInterval = Math.max(1, parseInt(st.weeklyOverdueInterval || 7, 10));

  for (const tenant of db.boarders) {
    if (!tenant.email || !EMAIL_REGEX.test(tenant.email)) { skipped++; continue; }
    if (!tenant.balance || tenant.balance <= 0) { skipped++; continue; }

    const dueDate = computeNextDueDate(tenant);
    const diffDays = Math.round((dueDate.getTime() - today.getTime()) / 86400000);
    const cycle = cycleKey(dueDate);
    if (!Array.isArray(tenant.reminderHistory)) tenant.reminderHistory = [];

    const milestones = [];
    for (const offset of schedule) {
      if (offset > 0 && diffDays <= offset && diffDays > 0) {
        milestones.push({ key: `PRE_${offset}_${cycle}`, tpl: tplUpcomingDue(db, tenant, dueDate, diffDays) });
      } else if (offset === 0 && diffDays === 0) {
        milestones.push({ key: `DUE_${cycle}`, tpl: tplDueToday(db, tenant, dueDate) });
      } else if (offset < 0 && diffDays <= offset) {
        milestones.push({ key: `POST_${Math.abs(offset)}_${cycle}`, tpl: tplOverdue(db, tenant, dueDate, Math.abs(diffDays)) });
      }
    }
    if (diffDays < 0) {
      const weekBucket = Math.floor(Math.abs(diffDays) / weeklyInterval);
      if (weekBucket >= 1) {
        milestones.push({ key: `WEEKLY_${weekBucket}_${cycle}`, tpl: tplOverdue(db, tenant, dueDate, Math.abs(diffDays)) });
      }
    }

    const seen = new Set();
    const unique = milestones.filter((m) => !seen.has(m.key) && seen.add(m.key));

    for (const m of unique) {
      if (tenant.reminderHistory.includes(m.key)) continue;
      const outcome = await sendEmailWithRetry({
        to: tenant.email, subject: m.tpl.subject, html: m.tpl.html,
        type: 'Reminder', config: db.emailConfig, settings: st,
      });
      if (outcome.success) { tenant.reminderHistory.push(m.key); sent++; }
      else failed++;
    }
  }

  writeStorageAtomic(db);
  console.log(`[SCHEDULER] Done. sent=${sent} failed=${failed} skipped=${skipped}`);
  return { sent, failed, skipped };
}

module.exports = { executeAutomatedBillingReminderEngine, computeNextDueDate };
