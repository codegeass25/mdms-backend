const { readStorage, writeStorageAtomic } = require('../db/store');

function appendAuditEntry(module, action, req = null) {
  try {
    const db = readStorage();
    const ip = req
      ? req.headers['x-forwarded-for'] ||
        req.socket?.remoteAddress ||
        '127.0.0.1'
      : '127.0.0.1';
    db.audit.unshift({
      date: new Date().toLocaleString(),
      timestamp: new Date().toISOString(),
      user: 'Admin',
      ip,
      module,
      action,
      oldVal: '-',
      newVal: '-',
    });
    if (db.audit.length > 1000) db.audit.pop();
    writeStorageAtomic(db);
  } catch (e) {
    console.error('[audit] logging fault:', e && e.message);
  }
}

module.exports = { appendAuditEntry };
