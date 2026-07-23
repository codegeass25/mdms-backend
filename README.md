# MDMS Backend (v2 — Supabase-native)

Refactored backend for **Montesierra Dormitory Management System**.

- **Supabase** is the only persistent datastore. No `data.json`, no local mirror, no filesystem persistence.
- **Brevo SMTP** for all outbound email (any SMTP relay works; Brevo is the default).
- **100% API-compatible** with the existing frontend (`index.html`).

---

## Quick start

```bash
cp .env.example .env
# Fill in SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SMTP_USER, SMTP_PASS, SMTP_FROM_EMAIL
npm install
npm start
```

Then drop your existing `index.html` (and any static assets it needs) into `./public/` — Express serves it at `/`.

### First-time database setup

Run `sql/schema.sql` once in the Supabase SQL editor. That's it.
The backend seeds the initial JSONB row on first boot.

---

## Architecture

```
src/
├── index.js                Entry point; boot + graceful shutdown
├── config/
│   ├── env.js              Env loader (single source of truth)
│   └── supabase.js         Supabase client singleton (service role)
├── db/
│   ├── normalize.js        Canonical shape + DEFAULT_SETTINGS + DEFAULT_EMAIL_CONFIG
│   └── store.js            Sync read/write facade (in-memory cache + Supabase upsert queue)
├── middleware/
│   └── errorHandler.js     Centralized error handler + asyncHandler wrapper
├── utils/
│   ├── validators.js       EMAIL_REGEX, validateBoarderPayload
│   ├── format.js           fmtDate/Time/DateTime, parseContactInfo
│   └── email-ref.js        MDMS-<PREFIX>-YYYYMMDD-#### generator
├── services/
│   ├── auditService.js     appendAuditEntry
│   ├── emailLogService.js  appendEmailLog
│   ├── emailService.js     Brevo/nodemailer transport + verify + sendEmailWithRetry
│   ├── reminderService.js  Billing reminder engine
│   ├── schedulerService.js node-cron scheduler (per-minute + hourly)
│   └── paymentProviders.js Placeholder registry (GCash/Maya/PayMongo/Stripe/PayPal)
├── templates/
│   ├── shell.js            baseShell, header, footer, status badge, info card
│   ├── reminders.js        Upcoming, Due Today, Overdue
│   ├── receipt.js          Payment receipt
│   └── reservations.js     Confirmation, Cancellation, Expiration
└── routes/
    ├── data.js             GET/POST /api/data
    ├── boarders.js         GET/POST /api/boarders
    ├── billing.js          GET  /api/billing
    ├── payments.js         POST /api/payment
    ├── emails.js           GET /api/email-logs, POST /api/send-email, /test-email, /send-reservation-email
    ├── reminders.js        POST /api/run-billing-reminders, /reload-config
    └── paymentProviders.js GET/POST /api/payment-providers[/:provider/checkout]
```

---

## API compatibility

Every legacy endpoint is preserved. **Zero frontend changes required.**

| Method | Path | Behavior preserved |
|---|---|---|
| GET  | `/api/data` | Full state (SMTP password redacted for safety) |
| POST | `/api/data` | Merge + force-preserve `emailLogs`, `emailCounter`; union `reminderHistory` per boarder |
| GET  | `/api/boarders` | `db.boarders` |
| POST | `/api/boarders` | Validate; create (with `BRD-<ts>` id + audit) or update-in-place |
| GET  | `/api/billing` | `db.transactions` |
| POST | `/api/payment` | Decrement balance, clamp, `TX-<ts><rnd>` insert, audit, async receipt email |
| GET  | `/api/email-logs` | `db.emailLogs` |
| POST | `/api/send-email` | Manual send with retry + reference number |
| POST | `/api/test-email` | SMTP `verify()` then test send |
| POST | `/api/run-billing-reminders` | Trigger reminder engine on demand |
| POST | `/api/reload-config` | Clear scheduler last-run marker |
| POST | `/api/send-reservation-email` | `kind: confirmation \| cancellation \| expiration` |
| GET  | `/api/payment-providers` | Provider capability map |
| POST | `/api/payment-providers/:provider/checkout` | Stub |
| GET  | `/api/health` | New: Render health check |

---

## Brevo SMTP

The email service is provider-agnostic (`nodemailer` over any SMTP relay). Brevo defaults ship in `.env.example`:

```
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURE=false           # STARTTLS on 587; set true only for 465
SMTP_USER=<Brevo SMTP login>
SMTP_PASS=<Brevo SMTP key>
SMTP_FROM_NAME=Montesierra Dormitory
SMTP_FROM_EMAIL=noreply@yourdomain.com
```

The Settings module in the frontend still overrides these at runtime by sending an `emailConfig` object with the request. `GET /api/data` never returns the SMTP password.

To swap providers later, change the env values — no code change needed. The transport factory infers `secure` from the port (`465 → true`, everything else STARTTLS) and negotiates TLS ≥ 1.2.

---

## Removed legacy components

| Legacy | Replacement |
|---|---|
| `data.json`, `data.json.bak`, `data.json.tmp` | Supabase `app_state` row only |
| `writeLocalMirror`, `readLocalMirror`, `LOCAL_FILE/BAK/TMP` | Deleted |
| `recoverFromBackup`, `initializeDefaultDatabase` | Folded into `store.hydrate()` |
| Gmail-specific transport branch, `.service = 'gmail'`, `dns.setDefaultResultOrder` | Deleted (Brevo-first) |
| Monolithic `server.js` (1182 LOC) | Modular `src/` tree |
| Ad-hoc `setInterval` scheduler | `node-cron` schedules |
| Migration helper file `supabase.js` | Replaced by `src/db/store.js` (no filesystem code) |

---

## Deployment (Render)

1. Push this folder to a Git repo.
2. Create a new Render **Web Service** pointing at it.
3. Render reads `render.yaml` for build/start commands and health check.
4. Add secret env vars in Render: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM_EMAIL`.

`SUPABASE_KEEP_HISTORY=true` writes a snapshot to `app_state_history` on every save (best-effort). Turn it off to reduce writes.

---

## Notes / trade-offs

- **Single-row JSONB storage was kept intentionally.** The frontend does its own business logic and syncs the full merged blob via `POST /api/data`. Splitting the JSON into normalized tables would require touching the frontend, which the spec forbids. A future v3 that owns business logic server-side could migrate to relational tables without changing the API surface.
- **The Supabase service role key is server-only.** Never expose it to the browser.
- **The SMTP password is redacted from `GET /api/data`.** The frontend re-saves an empty `pass` field on sync; the merge in `POST /api/data` preserves the existing password automatically.
- **Scheduler:** `node-cron` gives us a 1-minute tick honoring `settings.dailyTime`, an hourly catch-up sweep, and a warm-up run at boot — same three triggers the legacy scheduler had.
