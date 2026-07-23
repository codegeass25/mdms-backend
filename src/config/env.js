/**
 * Central env loader. Reads once at boot and validates required fields.
 * All other modules import from here — no `process.env` reads elsewhere.
 */
require('dotenv').config();

function required(name) {
  const v = process.env[name];
  if (!v || !String(v).trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v.trim();
}

const env = {
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  supabase: {
    url: required('SUPABASE_URL'),
    serviceKey: required('SUPABASE_SERVICE_ROLE_KEY'),
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

module.exports = env;
