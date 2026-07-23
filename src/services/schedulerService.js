/**
 * Scheduler:
 *   - 1-minute tick honors settings.dailyTime (HH:MM 24h).
 *   - Hourly catch-up sweep so a missed daily tick still fires.
 *   - Warm-up run at boot (catches missed cycles across restarts).
 *
 * `reloadConfig()` clears the last-run marker so newly-saved settings
 * take effect immediately.
 */

const cron = require('node-cron');
const { readStorage } = require('../db/store');
const { DEFAULT_SETTINGS } = require('../db/normalize');
const {
  executeAutomatedBillingReminderEngine,
} = require('./reminderService');

const state = { lastDailyRunDate: null };

function tick() {
  try {
    const db = readStorage();
    const st = { ...DEFAULT_SETTINGS, ...(db.settings || {}) };
    if (st.autoRemindersEnabled === false) return;

    const now = new Date();
    const [hh, mm] = (st.dailyTime || '08:00').split(':').map((x) => parseInt(x, 10));
    const todayKey = now.toISOString().split('T')[0];

    if (
      state.lastDailyRunDate !== todayKey &&
      (now.getHours() > hh || (now.getHours() === hh && now.getMinutes() >= mm))
    ) {
      state.lastDailyRunDate = todayKey;
      executeAutomatedBillingReminderEngine().catch((e) =>
        console.error('[DAILY]', e.message)
      );
    }
  } catch (e) {
    console.error('[SCHEDULER TICK]', e.message);
  }
}

function start() {
  // Warm-up
  executeAutomatedBillingReminderEngine().catch((e) =>
    console.error('[STARTUP]', e.message)
  );
  // Every minute
  cron.schedule('* * * * *', tick);
  // Hourly catch-up sweep
  cron.schedule('0 * * * *', () => {
    executeAutomatedBillingReminderEngine().catch((e) =>
      console.error('[HOURLY]', e.message)
    );
  });
  console.log('[SCHEDULER] Armed (per-minute tick + hourly sweep).');
}

function reloadConfig() {
  state.lastDailyRunDate = null;
}

module.exports = { start, reloadConfig };
