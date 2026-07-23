const { fmtDate } = require('../utils/format');
const { REF_PLACEHOLDER } = require('../utils/email-ref');
const {
  ctx, baseShell, statusBadge, notificationTitle, infoCard,
} = require('./shell');

function tplReservationConfirmation(db, res) {
  const c = ctx(db);
  const accent = '#1d4ed8';
  const rows = [
    ['Tenant Name', res.name || '—'],
    ['Room Number', res.roomId || '—'],
    ['Bed Number', res.bedNo || '—'],
    ['Reservation Date', fmtDate(res.date || new Date())],
    ['Expiration', res.expiresOn ? fmtDate(res.expiresOn) : '—'],
    ['Payment Status', 'Reservation Confirmed'],
  ];
  const table = infoCard(rows, { label: 'Confirmed', color: accent });
  const body = `
    ${statusBadge('&#10004;', 'Reservation Confirmed', accent)}
    ${notificationTitle('Your Reservation Is Confirmed', accent)}
    <p style="margin:0 0 14px 0;color:#334155;">Dear <b style="color:#0f172a;">${res.name || 'Guest'}</b>,</p>
    <p style="margin:0 0 6px 0;color:#334155;">We are pleased to confirm that your reservation at ${c.dormName} has been successfully recorded.</p>
    ${table}
    <p style="margin:16px 0 0 0;color:#334155;">Kindly complete your check-in on or before the expiration date to secure your accommodation.</p>`;
  return {
    subject: `[${c.dormName}] Reservation Confirmation`,
    html: baseShell({ title: 'Reservation Confirmation', bodyInner: body, ...c, reference: REF_PLACEHOLDER, accent }),
  };
}

function tplReservationCancellation(db, res, reason) {
  const c = ctx(db);
  const accent = '#b91c1c';
  const rows = [
    ['Tenant Name', res.name || '—'],
    ['Room Number', res.roomId || '—'],
    ['Bed Number', res.bedNo || '—'],
    ['Reservation Date', fmtDate(res.date || new Date())],
    ['Reason', reason || 'Cancelled by administration'],
  ];
  const table = infoCard(rows, { label: 'Cancelled', color: accent });
  const body = `
    ${statusBadge('&#10060;', 'Reservation Cancelled', accent)}
    ${notificationTitle('Your Reservation Has Been Cancelled', accent)}
    <p style="margin:0 0 14px 0;color:#334155;">Dear <b style="color:#0f172a;">${res.name || 'Guest'}</b>,</p>
    <p style="margin:0 0 6px 0;color:#334155;">We regret to inform you that your reservation has been cancelled.</p>
    ${table}
    <p style="margin:16px 0 0 0;color:#334155;">For further information, kindly contact the dormitory administration.</p>`;
  return {
    subject: `[${c.dormName}] Reservation Cancellation`,
    html: baseShell({ title: 'Reservation Cancellation', bodyInner: body, ...c, reference: REF_PLACEHOLDER, accent }),
  };
}

function tplReservationExpiration(db, res, daysLeft) {
  const c = ctx(db);
  const accent = '#ea580c';
  const rows = [
    ['Tenant Name', res.name || '—'],
    ['Room Number', res.roomId || '—'],
    ['Bed Number', res.bedNo || '—'],
    ['Reservation Date', fmtDate(res.date || new Date())],
    ['Expiration', res.expiresOn ? fmtDate(res.expiresOn) : '—'],
    ['Days Remaining', String(daysLeft)],
  ];
  const table = infoCard(rows, { label: 'Action Required', color: accent });
  const body = `
    ${statusBadge('&#9888;', 'Reservation Expiring', accent)}
    ${notificationTitle('Your Reservation Is Expiring Soon', accent)}
    <p style="margin:0 0 14px 0;color:#334155;">Dear <b style="color:#0f172a;">${res.name || 'Guest'}</b>,</p>
    <p style="margin:0 0 6px 0;color:#334155;">Your reservation at ${c.dormName} will expire in <b style="color:${accent};">${daysLeft} day${daysLeft === 1 ? '' : 's'}</b>. Please complete your check-in to secure your bed.</p>
    ${table}
    <p style="margin:16px 0 0 0;color:#334155;">Failure to check in on time may result in the reservation being released.</p>`;
  return {
    subject: `[${c.dormName}] Reservation Expiring — ${daysLeft} day(s) left`,
    html: baseShell({ title: 'Reservation Expiration', bodyInner: body, ...c, reference: REF_PLACEHOLDER, accent }),
  };
}

module.exports = {
  tplReservationConfirmation,
  tplReservationCancellation,
  tplReservationExpiration,
};
