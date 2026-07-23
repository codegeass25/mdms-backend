/**
 * Central env loader. Reads once at boot and validates required fields.
 * All other modules import from here — no `process.env` reads elsewhere.
 *
 * On Render, environment variables are injected by the platform (Dashboard
 * → Environment). A local `.env` file is optional and only loaded when
 * present — its absence is NOT an error in production.
 */
const path = require('path');
const fs = require('fs');

// Only load a .env file if one actually exists on disk. In Render production
// the env vars come from the dashboard; there is no .env file shipped.
const dotenvPath = path.join(process.cwd(), '.env');
if (fs.existsSync(dotenvPath)) {
  require('dotenv').config({ path: dotenvPath });
}

const missing = [];
function need(name) {
  const v = process.env[name];
  if (!v || !String(v).trim()) {
    missing.push(name);
    return '';
  }
  return String(v).trim();
}

const env = {
  port: parseInt(process.env.PORT, 10) || 3000,
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',

  supabase: {
    url: need('SUPABASE_URL'),
    serviceKey: need('SUPABASE_SERVICE_ROLE_KEY'),
    stateId: process.env.SUPABASE_STATE_ID || 'main',
    keepHistory: process.env.SUPABASE_KEEP_HISTORY !== 'false',
  },

  smtp: {
    host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    fromName: process.env.SMTP_FROM_NAME || 'Montesierra Dormitory',
    fromEmail: process.env.SMTP_FROM_EMAIL || '',
  },

  cors: {
    origins: (process.env.CORS_ORIGINS || '')
      .split(',').map(s => s.trim()).filter(Boolean),
  },
};

// Report — but don't crash — on missing required vars, so operators can
// see a clear diagnostic in the Render logs instead of a raw stack trace.
env.missingRequired = missing.slice();
env.hasFatalMissing = missing.length > 0;

if (missing.length) {
  console.error(
    '[env] Missing required environment variables: ' + missing.join(', ') +
    '\n[env] Set them in Render Dashboard → Environment before the app can serve traffic.'
  );
}

module.exports = env;
