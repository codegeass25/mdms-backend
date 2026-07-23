/**
 * Locale formatters + contact-info parser used by the email templates.
 * Behavior preserved verbatim from the legacy backend.
 */

function fmtDate(d) {
  try {
    return new Date(d).toLocaleDateString('en-PH', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  } catch (_) { return String(d); }
}
function fmtTime(d) {
  try {
    return new Date(d).toLocaleTimeString('en-PH', {
      hour: '2-digit', minute: '2-digit',
    });
  } catch (_) { return String(d); }
}
function fmtDateTime(d) {
  try {
    return new Date(d).toLocaleString('en-PH', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch (_) { return String(d); }
}

function parseContactInfo(raw) {
  const out = {
    address: '', city: 'City, Philippines',
    phone: '', email: '', raw: raw || '',
  };
  if (!raw) return out;
  const parts = String(raw)
    .split(/\s*[|•·,]\s*|\s{2,}|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  parts.forEach((p) => {
    if (/^\+?\d[\d\s\-()]{5,}$/.test(p) || /(tel|phone|contact)[:\s]/i.test(p)) {
      out.phone = out.phone || p.replace(/^(tel|phone|contact)[:\s]*/i, '');
    } else if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p)) {
      out.email = out.email || p;
    } else if (
      /philippines|city|province|street|st\.|road|rd\.|ave|barangay|brgy/i.test(p) &&
      !out.address
    ) {
      out.address = p;
    } else if (!out.address) {
      out.address = p;
    }
  });
  return out;
}

module.exports = { fmtDate, fmtTime, fmtDateTime, parseContactInfo };
