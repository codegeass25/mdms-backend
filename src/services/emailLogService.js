const { readStorage, writeStorageAtomic } = require('../db/store');

function appendEmailLog(entry) {
  try {
    const db = readStorage();
    db.emailLogs.push({
      date: new Date().toLocaleString(),
      timestamp: new Date().toISOString(),
      to: '', subject: '', type: '', status: 'Pending',
      retries: 0, error: '', reference: '',
      ...entry,
    });
    if (db.emailLogs.length > 5000) {
      db.emailLogs.splice(0, db.emailLogs.length - 5000);
    }
    writeStorageAtomic(db);
  } catch (e) {
    console.error('[email-log] write failure:', e && e.message);
  }
}

module.exports = { appendEmailLog };
