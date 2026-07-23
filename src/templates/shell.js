/**
 * Shared HTML shell + building blocks for every notification template.
 * Fully inline CSS for maximum email-client compatibility.
 */

const { fmtDate, fmtTime, parseContactInfo } = require('../utils/format');
const { DEFAULT_SETTINGS } = require('../db/normalize');

function ctx(db) {
  const s = { ...DEFAULT_SETTINGS, ...(db.settings || {}) };
  return {
    settings: s,
    dormName: s.dormName || 'Montesierra Dormitory',
    logoUrl: s.dormLogoUrl || '',
    footer: s.footer,
    signature: s.signature,
    contactInfo: s.contactInfo || '',
  };
}

function findRoom(db, tenant) {
  return db.rooms.find(
    (r) =>
      String(r.id) === String(tenant.roomId) ||
      String(r.roomNumber) === String(tenant.roomId)
  );
}

function corporateHeader(c, reference) {
  const info = parseContactInfo(c.contactInfo);
  const now = new Date();
  const logoCell = c.logoUrl
    ? `<img src="${c.logoUrl}" alt="${c.dormName}" width="60" height="60" style="width:60px;height:60px;border-radius:12px;object-fit:cover;display:block;border:1px solid #e2e8f0;">`
    : `<div style="width:60px;height:60px;border-radius:12px;background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);color:#ffffff;text-align:center;line-height:60px;font-size:26px;font-weight:800;font-family:Georgia,serif;">M</div>`;
  return `
    <tr><td style="padding:0;background:#ffffff;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="padding:26px 28px 18px 28px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
            <td style="vertical-align:top;" width="60%">
              <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                <td style="vertical-align:top;padding-right:14px;">${logoCell}</td>
                <td style="vertical-align:top;font-family:Arial,Helvetica,sans-serif;">
                  <div style="font-size:20px;font-weight:800;color:#0f172a;letter-spacing:0.4px;text-transform:uppercase;">${c.dormName}</div>
                  <div style="font-size:11px;color:#64748b;margin-top:3px;letter-spacing:1.2px;text-transform:uppercase;font-weight:600;">Dormitory Management System</div>
                  ${info.address ? `<div style="font-size:12px;color:#334155;margin-top:8px;line-height:1.5;">${info.address}</div>` : ''}
                  <div style="font-size:12px;color:#334155;line-height:1.5;">${info.city}</div>
                  ${info.phone ? `<div style="font-size:12px;color:#334155;line-height:1.5;">Tel: ${info.phone}</div>` : ''}
                  ${info.email ? `<div style="font-size:12px;color:#334155;line-height:1.5;">${info.email}</div>` : ''}
                </td>
              </tr></table>
            </td>
            <td style="vertical-align:top;text-align:right;font-family:Arial,Helvetica,sans-serif;" width="40%">
              <table role="presentation" cellpadding="0" cellspacing="0" align="right"><tr><td style="text-align:right;">
                <div style="font-size:10px;color:#94a3b8;letter-spacing:1.4px;text-transform:uppercase;font-weight:700;">Date Generated</div>
                <div style="font-size:13px;font-weight:700;color:#0f172a;margin-top:3px;">${fmtDate(now)}</div>
                <div style="font-size:10px;color:#94a3b8;letter-spacing:1.4px;text-transform:uppercase;font-weight:700;margin-top:10px;">Current Time</div>
                <div style="font-size:13px;font-weight:700;color:#0f172a;margin-top:3px;">${fmtTime(now)}</div>
                <div style="font-size:10px;color:#94a3b8;letter-spacing:1.4px;text-transform:uppercase;font-weight:700;margin-top:10px;">Email Reference No.</div>
                <div style="display:inline-block;margin-top:4px;padding:5px 10px;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:6px;font-family:'Courier New',Consolas,monospace;font-size:12px;font-weight:700;color:#0f172a;">${reference}</div>
              </td></tr></table>
            </td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:0 28px;"><div style="height:1px;background:#e2e8f0;line-height:1px;font-size:1px;">&nbsp;</div></td></tr>
      </table>
    </td></tr>`;
}

function corporateFooter(c) {
  const info = parseContactInfo(c.contactInfo);
  const year = new Date().getFullYear();
  return `
    <tr><td style="padding:0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;">
        <tr><td style="padding:28px 28px 22px 28px;text-align:center;font-family:Arial,Helvetica,sans-serif;">
          <div style="font-size:14px;font-weight:700;color:#ffffff;letter-spacing:0.6px;text-transform:uppercase;">${c.signature || 'Dormitory Administration'}</div>
          <div style="height:1px;background:#334155;margin:14px auto 16px auto;width:56px;line-height:1px;font-size:1px;">&nbsp;</div>
          ${info.phone ? `<div style="font-size:12px;color:#cbd5e1;line-height:1.7;">Contact: ${info.phone}</div>` : ''}
          ${info.email ? `<div style="font-size:12px;color:#cbd5e1;line-height:1.7;">Email: <a href="mailto:${info.email}" style="color:#93c5fd;text-decoration:none;">${info.email}</a></div>` : ''}
          <div style="font-size:12px;color:#cbd5e1;line-height:1.7;">Office Hours: Monday – Saturday, 8:00 AM – 5:00 PM</div>
          <div style="height:1px;background:#334155;margin:16px auto;width:70%;line-height:1px;font-size:1px;">&nbsp;</div>
          <div style="font-size:11px;color:#94a3b8;line-height:1.6;">© ${year} ${c.dormName}. All rights reserved.</div>
          <div style="font-size:10.5px;color:#64748b;margin-top:8px;line-height:1.6;font-style:italic;max-width:460px;margin-left:auto;margin-right:auto;">
            This is an automated email generated by ${c.dormName} Management System. Please do not reply directly to this email.
          </div>
        </td></tr>
      </table>
    </td></tr>`;
}

function baseShell({ title, bodyInner, dormName, logoUrl, footer, signature, contactInfo, reference, accent }) {
  const c = { dormName, logoUrl, footer, signature, contactInfo };
  const accentColor = accent || '#1d4ed8';
  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#eef2f7;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;">${title} — ${dormName}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f7;padding:28px 12px;">
  <tr><td align="center">
    <table role="presentation" width="620" cellpadding="0" cellspacing="0" style="max-width:620px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 10px 32px rgba(15,23,42,0.10);border:1px solid #e2e8f0;">
      ${corporateHeader(c, reference)}
      <tr><td style="padding:0;"><div style="height:5px;background:${accentColor};line-height:5px;font-size:5px;">&nbsp;</div></td></tr>
      <tr><td style="padding:30px 28px;font-size:15px;line-height:1.65;color:#1e293b;font-family:Arial,Helvetica,sans-serif;">
        ${bodyInner}
      </td></tr>
      ${corporateFooter(c)}
    </table>
  </td></tr>
</table></body></html>`;
}

function statusBadge(icon, label, color) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 18px 0;"><tr>
    <td style="background:${color};padding:8px 16px;border-radius:999px;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#ffffff;letter-spacing:1.2px;text-transform:uppercase;">
      <span style="display:inline-block;margin-right:6px;font-size:14px;line-height:1;">${icon}</span>${label}
    </td>
  </tr></table>`;
}

function notificationTitle(text, color) {
  return `<h1 style="margin:0 0 10px 0;color:${color};font-size:22px;font-weight:800;font-family:Arial,Helvetica,sans-serif;line-height:1.25;">${text}</h1>`;
}

function infoCard(rows, statusRow) {
  const body = rows.map((r, i) => `
    <tr style="background:${i % 2 ? '#f8fafc' : '#ffffff'};">
      <td style="padding:13px 18px;font-size:12.5px;color:#64748b;width:46%;border-bottom:1px solid #eef2f7;font-family:Arial,Helvetica,sans-serif;letter-spacing:0.3px;text-transform:uppercase;font-weight:600;">${r[0]}</td>
      <td style="padding:13px 18px;font-size:14px;font-weight:700;color:#0f172a;width:54%;border-bottom:1px solid #eef2f7;font-family:Arial,Helvetica,sans-serif;text-align:right;">${r[1]}</td>
    </tr>`).join('');
  const statusBlock = statusRow ? `
    <tr><td colspan="2" style="padding:16px 18px;background:#f8fafc;border-top:1px solid #eef2f7;text-align:right;">
      <span style="display:inline-block;padding:7px 16px;border-radius:999px;font-size:11.5px;font-weight:800;color:#ffffff;background:${statusRow.color};letter-spacing:1.3px;text-transform:uppercase;font-family:Arial,Helvetica,sans-serif;">${statusRow.label}</span>
    </td></tr>` : '';
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin:20px 0;background:#ffffff;">${body}${statusBlock}</table>`;
}

function tenantMetaBlock(tenant, room) {
  const rows = [
    ['Tenant Name', tenant.name || '—'],
    ['Room Number', room ? (room.roomName || `Room ${room.roomNumber}`) : (tenant.roomId || '—')],
    ['Bed Number', tenant.bedNo || '—'],
    ['Monthly Rent', `₱${Number(tenant.monthlyRent || tenant.rentRate || 0).toLocaleString()}`],
    ['Outstanding Balance', `₱${Number(tenant.balance || 0).toLocaleString()}`],
    ['Due Date', tenant.dueDate ? fmtDate(tenant.dueDate) : '—'],
    ['Payment Status', tenant.balance > 0 ? 'Outstanding' : 'Settled'],
  ];
  const statusRow = {
    label: tenant.balance > 0 ? 'Payment Required' : 'Paid',
    color: tenant.balance > 0 ? '#dc2626' : '#059669',
  };
  return infoCard(rows, statusRow);
}

module.exports = {
  ctx, findRoom, baseShell,
  statusBadge, notificationTitle, infoCard, tenantMetaBlock,
};
