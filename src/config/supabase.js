/**
 * Single Supabase client instance (service role). Every DB operation
 * MUST import from here — no route/controller/service should ever call
 * `createClient` on its own.
 */
const { createClient } = require('@supabase/supabase-js');
const env = require('./env');

const supabase = createClient(env.supabase.url, env.supabase.serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

module.exports = { supabase, STATE_ID: env.supabase.stateId };
