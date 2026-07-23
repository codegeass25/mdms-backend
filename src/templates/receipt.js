const { fmtDate } = require('../utils/format');
const { REF_PLACEHOLDER } = require('../utils/email-ref');
const {
  ctx, findRoom, baseShell,
  statusBadge, notificationTitle, infoCard,
} = require('./shell');

function tplPaymentReceipt(db, tenant, tx, prevBalance) {
  const c = ctx(db);
  const room = findRoom(db, tenant);
  const accent = '#059669';
  const fullyPaid = (parseFloat(tenant.balance) || 0) <= 0;
  const rows = [
    ['Tenant Name', tenant.name || '—'],
    ['Room Number', room ? (room.roomName || `Room ${room.roomNumber}`) : (tenant.roomId || '—')],
    ['Bed Number', tenant.bedNo || '—'],
    ['Monthly Rent', `₱${Number(tenant.monthlyRent || tenant.rentRate || 0).toLocaleString()}`],
    ['Amount Paid', `₱${Number(tx.amount).toLocaleString()}`],
    ['Previous Balance', `₱${Number(prevBalance).toLocaleString()}`],
    ['Outstanding Balance', `₱${Number(tenant.balance || 0).toLocaleString()}`],
    ['Due Date', tenant.dueDate ? fmtDate(tenant.dueDate) : '—'],
    ['Payment Reference', tx.reference || 'N/A'],
    ['Official Receipt No.', tx.orNumber || tx.id],
    ['Payment Date', fmtDate(tx.date || new Date())],
  ];
  const statusRow = {
    label: fullyPaid ? 'Fully Paid' : 'Partial Payment',
    color: fullyPaid ? '#059669' : '#ea580c',
  };
  const table = infoCard(rows, statusRow);
  const body = `
    ${statusBadge('&#10004;', 'Payment Received', accent)}
    ${notificationTitle('Payment Confirmation & Receipt', accent)}
    <p style="margin:0 0 14px 0;color:#334155;">Dear <b style="color:#0f172a;">${tenant.name}</b>,</p>
    <p style="margin:0 0 6px 0;color:#334155;">Thank you! We have successfully received your payment. Below is the official record of your transaction.</p>
    ${table}
    <p style="margin:16px 0 0 0;color:#334155;">${fullyPaid ? 'Your account is now fully settled.' : 'Your remaining balance is reflected above.'}</p>`;
  return {
    subject: `[${c.dormName}] Payment Receipt — ₱${Number(tx.amount).toLocaleString()}`,
    html: baseShell({ title: 'Payment Confirmation / Receipt', bodyInner: body, ...c, reference: REF_PLACEHOLDER, accent }),
  };
}

module.exports = { tplPaymentReceipt };
