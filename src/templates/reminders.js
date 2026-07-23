const { fmtDate } = require('../utils/format');
const { REF_PLACEHOLDER } = require('../utils/email-ref');
const {
  ctx, findRoom, baseShell,
  statusBadge, notificationTitle, tenantMetaBlock,
} = require('./shell');

function tplUpcomingDue(db, tenant, dueDate, daysAway) {
  const c = ctx(db);
  const room = findRoom(db, tenant);
  const accent = '#1d4ed8';
  const body = `
    ${statusBadge('&#9200;', 'Upcoming Reminder', accent)}
    ${notificationTitle('Upcoming Payment Reminder', accent)}
    <p style="margin:0 0 14px 0;color:#334155;">Dear <b style="color:#0f172a;">${tenant.name}</b>,</p>
    <p style="margin:0 0 6px 0;color:#334155;">This is a courteous reminder that your monthly rent payment is scheduled to be due in <b style="color:${accent};">${daysAway} day${daysAway === 1 ? '' : 's'}</b> — on <b style="color:#0f172a;">${fmtDate(dueDate)}</b>.</p>
    ${tenantMetaBlock(tenant, room)}
    <p style="margin:16px 0 0 0;color:#334155;">Kindly settle your balance on or before the due date. Thank you for your continued stay with us at ${c.dormName}.</p>`;
  return {
    subject: `[${c.dormName}] Upcoming Payment Due on ${fmtDate(dueDate)}`,
    html: baseShell({ title: 'Upcoming Payment Reminder', bodyInner: body, ...c, reference: REF_PLACEHOLDER, accent }),
  };
}

function tplDueToday(db, tenant, dueDate) {
  const c = ctx(db);
  const room = findRoom(db, tenant);
  const accent = '#ea580c';
  const body = `
    ${statusBadge('&#9888;', 'Payment Due Today', accent)}
    ${notificationTitle('Your Payment Is Due Today', accent)}
    <p style="margin:0 0 14px 0;color:#334155;">Dear <b style="color:#0f172a;">${tenant.name}</b>,</p>
    <p style="margin:0 0 6px 0;color:#334155;">Our records indicate that your monthly rent of <b style="color:${accent};">₱${Number(tenant.balance || 0).toLocaleString()}</b> is <b>due today, ${fmtDate(dueDate)}</b>.</p>
    ${tenantMetaBlock(tenant, room)}
    <p style="margin:16px 0 0 0;color:#334155;">If your payment has already been processed, kindly disregard this notice.</p>`;
  return {
    subject: `[${c.dormName}] Payment Due TODAY — ${fmtDate(dueDate)}`,
    html: baseShell({ title: 'Payment Due Today', bodyInner: body, ...c, reference: REF_PLACEHOLDER, accent }),
  };
}

function tplOverdue(db, tenant, dueDate, daysLate) {
  const c = ctx(db);
  const room = findRoom(db, tenant);
  const accent = '#b91c1c';
  const body = `
    ${statusBadge('&#10071;', 'Overdue Notice', accent)}
    ${notificationTitle('Overdue Payment Notice', accent)}
    <p style="margin:0 0 14px 0;color:#334155;">Dear <b style="color:#0f172a;">${tenant.name}</b>,</p>
    <p style="margin:0 0 6px 0;color:#334155;">Our records show that your rent payment was due on <b style="color:#0f172a;">${fmtDate(dueDate)}</b> and is now <b style="color:${accent};">${daysLate} day${daysLate === 1 ? '' : 's'} overdue</b>.</p>
    ${tenantMetaBlock(tenant, room)}
    <p style="margin:16px 0 0 0;color:#334155;">Please settle your outstanding balance as soon as possible to avoid additional penalties.</p>`;
  return {
    subject: `[${c.dormName}] OVERDUE — Balance Settlement Required`,
    html: baseShell({ title: 'Overdue Payment Notice', bodyInner: body, ...c, reference: REF_PLACEHOLDER, accent }),
  };
}

module.exports = { tplUpcomingDue, tplDueToday, tplOverdue };
