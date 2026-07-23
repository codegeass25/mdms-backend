/**
 * MDMS Backend — entry point.
 * Boots Express, mounts the routers, hydrates the Supabase-backed
 * store, arms the reminder scheduler, and begins accepting traffic.
 *
 * Render-ready: binds to 0.0.0.0 on process.env.PORT, dynamic CORS, and
 * clear startup diagnostics for logs.
 */

const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dns = require('dns');

// Force Node.js to prefer IPv4 over IPv6
dns.setDefaultResultOrder('ipv4first');

const env = require('./config/env');
const store = require('./db/store');
const scheduler = require('./services/schedulerService');
const { errorHandler } = require('./middleware/errorHandler');

const dataRoutes = require('./routes/data');
const boardersRoutes = require('./routes/boarders');
const billingRoutes = require('./routes/billing');
const paymentsRoutes = require('./routes/payments');
const emailsRoutes = require('./routes/emails');
const remindersRoutes = require('./routes/reminders');
const paymentProvidersRoutes = require('./routes/paymentProviders');

const app = express();
app.set('trust proxy', 1); // Render sits behind a proxy

app.use(
  helmet({
    contentSecurityPolicy: false, // frontend uses inline scripts + CDNs
    crossOriginEmbedderPolicy: false,
  })
);

// --- CORS -----------------------------------------------------------------
// Allow-list from env (comma-separated). Empty list → reflect any origin
// (safe for a service-role backend fronted by trusted clients only).
const allowList = env.cors.origins;
const corsOptions = {
  origin(origin, cb) {
    if (!origin) return cb(null, true);                // curl / same-origin
    if (!allowList.length) return cb(null, true);      // permissive default
    if (allowList.includes(origin)) return cb(null, true);
    // Always allow *.onrender.com and localhost during development.
    if (/^https?:\/\/localhost(:\d+)?$/i.test(origin)) return cb(null, true);
    if (/^https?:\/\/127\.0\.0\.1(:\d+)?$/i.test(origin)) return cb(null, true);
    if (/\.onrender\.com$/i.test(new URL(origin).hostname)) return cb(null, true);
    return cb(new Error('CORS blocked: ' + origin));
  },
  credentials: true,
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
if (env.nodeEnv !== 'test') app.use(morgan('tiny'));

// Serve the frontend from /public (drop index.html + assets there).
app.use(express.static(path.join(__dirname, '..', 'public')));

// Health check for Render.
app.get('/api/health', (_req, res) =>
  res.json({
    ok: true,
    uptime: process.uptime(),
    env: env.nodeEnv,
    supabaseConfigured: Boolean(env.supabase.url && env.supabase.serviceKey),
    smtpConfigured: Boolean(env.smtp.user && env.smtp.pass),
  })
);

// API — every legacy endpoint preserved verbatim.
app.use('/api/data', dataRoutes);
app.use('/api/boarders', boardersRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/payment', paymentsRoutes);
app.use('/api', emailsRoutes);        // /email-logs, /send-email, /test-email, /send-reservation-email
app.use('/api', remindersRoutes);     // /run-billing-reminders, /reload-config
app.use('/api/payment-providers', paymentProvidersRoutes);

app.use(errorHandler);

function bannerLine(label, ok, detail) {
  const mark = ok ? '✔' : '✖';
  return `   ${mark} ${label}${detail ? ' — ' + detail : ''}`;
}

async function boot() {
  // Fail fast with a clean message if required env is missing.
  if (env.hasFatalMissing) {
    console.error('[boot] Refusing to start: missing required env vars.');
    process.exit(1);
  }

  let dbOk = false;
  try {
    await store.hydrate();
    dbOk = true;
  } catch (e) {
    console.error('[boot] Supabase hydrate failed:', e && e.message);
  }

  const server = app.listen(env.port, env.host, () => {
    console.log('========================================================================');
    console.log(`   MDMS BACKEND ACTIVE`);
    console.log(`   Listening: http://${env.host}:${env.port}`);
    console.log(`   Env: ${env.nodeEnv}`);
    console.log(bannerLine('Supabase', dbOk, dbOk ? `state="${store.STATE_ID}"` : 'DEGRADED (see log above)'));
    console.log(bannerLine('SMTP relay', Boolean(env.smtp.user && env.smtp.pass), `${env.smtp.host}:${env.smtp.port}`));
    console.log(bannerLine('CORS allow-list', true, allowList.length ? allowList.join(', ') : 'permissive (any origin)'));
    console.log('========================================================================');
    try { scheduler.start(); } catch (e) { console.error('[boot] scheduler start failed:', e && e.message); }
  });

  server.on('error', (e) => console.error('[server] listen error:', e && e.message));

  ['SIGINT', 'SIGTERM'].forEach((sig) => {
    process.on(sig, async () => {
      console.log(`[${sig}] flushing pending writes…`);
      try { await store.flush(); } catch (_) {}
      server.close(() => process.exit(0));
      setTimeout(() => process.exit(0), 5000).unref();
    });
  });
}

process.on('unhandledRejection', (r) => console.error('[unhandledRejection]', r));
process.on('uncaughtException', (e) => console.error('[uncaughtException]', e));

boot().catch((err) => {
  console.error('FATAL: boot failed.', err);
  process.exit(1);
});
