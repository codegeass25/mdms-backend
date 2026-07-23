/**
 * MDMS Backend — entry point.
 * Boots Express, mounts the routers, hydrates the Supabase-backed
 * store, arms the reminder scheduler, and begins accepting traffic.
 */

const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

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

app.use(
  helmet({
    contentSecurityPolicy: false, // frontend uses inline scripts + CDNs
    crossOriginEmbedderPolicy: false,
  })
);
app.use(
  cors({
    origin: env.cors.origins.length ? env.cors.origins : true,
    credentials: true,
  })
);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
if (env.nodeEnv !== 'test') app.use(morgan('tiny'));

// Serve the frontend from /public (drop index.html + assets there).
app.use(express.static(path.join(__dirname, '..', 'public')));

// Health check for Render.
app.get('/api/health', (_req, res) =>
  res.json({ ok: true, uptime: process.uptime() })
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

async function boot() {
  await store.hydrate();
  const server = app.listen(env.port, () => {
    console.log('========================================================================');
    console.log(`   MDMS BACKEND ACTIVE ON PORT: ${env.port}`);
    console.log(`   Storage: Supabase (state id="${store.STATE_ID}")`);
    console.log(`   SMTP relay: ${env.smtp.host}:${env.smtp.port}`);
    console.log('========================================================================');
    scheduler.start();
  });

  ['SIGINT', 'SIGTERM'].forEach((sig) => {
    process.on(sig, async () => {
      console.log(`[${sig}] flushing pending writes…`);
      try { await store.flush(); } catch (_) {}
      server.close(() => process.exit(0));
      setTimeout(() => process.exit(0), 5000).unref();
    });
  });
}

boot().catch((err) => {
  console.error('FATAL: boot failed.', err);
  process.exit(1);
});
