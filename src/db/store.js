/**
 * Centralized data-access layer.
 *
 * The entire application state is a single JSONB row in Supabase
 * (`app_state.id = <STATE_ID>`). It is hydrated once at boot into an
 * in-memory cache. All reads are served synchronously from the cache;
 * all writes update the cache immediately and enqueue a serialized
 * upsert to Supabase (retry with exponential backoff).
 *
 * No filesystem persistence. No data.json. No local mirror. Supabase
 * is the sole persistent datastore.
 */

const { supabase, STATE_ID } = require('../config/supabase');
const env = require('../config/env');
const { normalizeStructure } = require('./normalize');

const clone = (x) => JSON.parse(JSON.stringify(x));

let cache = null;
let hydrated = false;
let writeSeq = 0;
let inFlight = Promise.resolve();

async function fetchRemote() {
  const { data, error } = await supabase
    .from('app_state')
    .select('data')
    .eq('id', STATE_ID)
    .maybeSingle();
  if (error) throw error;
  return data ? data.data : null;
}

async function pushRemote(payload) {
  const { error } = await supabase
    .from('app_state')
    .upsert({ id: STATE_ID, data: payload }, { onConflict: 'id' });
  if (error) throw error;

  if (env.supabase.keepHistory) {
    try {
      await supabase
        .from('app_state_history')
        .insert({ state_id: STATE_ID, data: payload });
    } catch (_) {
      /* best-effort audit; never blocks the primary write */
    }
  }
}

async function pushRemoteWithRetry(payload) {
  let attempt = 0;
  let lastErr;
  while (attempt < 5) {
    try {
      await pushRemote(payload);
      return;
    } catch (e) {
      lastErr = e;
      attempt++;
      const wait = Math.min(4000, 250 * Math.pow(2, attempt));
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  console.error(
    '[store] Persistent write failed after 5 retries:',
    lastErr && lastErr.message
  );
}

/**
 * Call ONCE before app.listen(). Hydrates cache from Supabase; seeds
 * a fresh normalized document when the row is missing (new install).
 */
async function hydrate() {
  let remote = null;
  try {
    remote = await fetchRemote();
  } catch (e) {
    console.error('[store] Initial fetch failed:', e && e.message);
    throw e;
  }

  if (!remote) {
    const seed = normalizeStructure({});
    await pushRemote(seed);
    cache = seed;
  } else {
    cache = normalizeStructure(remote);
  }
  hydrated = true;
  return cache;
}

/**
 * Synchronous read of the full state. Returns the live cache reference
 * — callers may mutate freely and then call writeStorageAtomic().
 */
function readStorage() {
  if (!hydrated) {
    throw new Error(
      'Store accessed before hydration. Call store.hydrate() during boot.'
    );
  }
  return cache;
}

/**
 * Persist the given payload. Normalizes, stamps `lastUpdate`, updates
 * the cache, and enqueues a durable Supabase upsert.
 */
function writeStorageAtomic(payload) {
  const norm = normalizeStructure(payload);
  norm.lastUpdate = new Date().toISOString();
  cache = norm;

  const snapshot = clone(norm);
  const seq = ++writeSeq;
  inFlight = inFlight
    .then(() => pushRemoteWithRetry(snapshot))
    .catch((e) =>
      console.error(`[store] write #${seq} failed:`, e && e.message)
    );
  return true;
}

/** Await all queued Supabase writes. Call before process exit. */
async function flush() {
  await inFlight;
}

module.exports = {
  hydrate,
  readStorage,
  writeStorageAtomic,
  flush,
  STATE_ID,
};
