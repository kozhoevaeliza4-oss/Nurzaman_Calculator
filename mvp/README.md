# Асыл Аманат — Kindergarten Finance MVP

Upload a children list + a bank statement, get automatic payment matching
and a dashboard. A deliberately simplified, standalone application — see
"Relationship to the main system" below.

Four blocks: **Дети** (children), **Оплаты** (payments), **Расходы**
(expenses), **Dashboard**. Plus supporting views: **Банковские операции**
(every imported bank transaction with its match status) and **История
загрузок** (import history).

## Relationship to the main system

This is a separate application (`mvp/`), not a mode of the existing
`kms/` system. The full-featured Асыл-Аманат KMS (`kms/`) is untouched and
keeps developing independently — this MVP intentionally does **not**
include CRM, payroll, attendance, the school block, parent portal,
messaging, or any of the other `kms/` modules (see раздел 21 of the spec).
It is meant to be deployed as its own site/service with its own database.

## Local development

```bash
cd mvp
npm install
cp .env.example .env   # fill in DB credentials, JWT_SECRET, ADMIN_EMAIL/ADMIN_PASSWORD
npm run migration:run
npm run seed:admin     # creates the one admin/owner account from .env
npm run start:dev      # http://localhost:4000
```

## Deploying as a new, separate Render service

Per the project decision, this MVP runs on its **own** Render web service
and its **own** Postgres database — not a path on the existing
`asyl-amanat-kms` service.

### 1. Push this branch

The `mvp/` folder is already committed on `claude/new-session-oqeywm` in
this repository. Render can build directly from that branch (or merge it
to your default branch first, whichever you prefer).

### 2. Create a new Postgres database

In the Render dashboard: **New → PostgreSQL**.
- Name: e.g. `asyl-amanat-finance-mvp-db`
- Note the **Internal Database URL** after it's created — you'll need the
  host/port/user/password/database pieces for step 3 (or just the full
  connection string, see the note below).

### 3. Create a new Web Service

**New → Web Service** → connect this repository.
- **Root Directory**: `mvp`
- **Environment**: Docker (it will pick up `mvp/Dockerfile` automatically)
- **Branch**: `claude/new-session-oqeywm` (or wherever you merge it)

### 4. Environment variables

Set these on the web service (Render → your service → Environment):

| Key | Value |
|---|---|
| `DB_HOST` | from the Postgres instance's connection info |
| `DB_PORT` | `5432` |
| `DB_USER` | from the Postgres instance |
| `DB_PASSWORD` | from the Postgres instance |
| `DB_NAME` | from the Postgres instance |
| `JWT_SECRET` | any long random string |
| `JWT_EXPIRES_IN` | `12h` (or your preference) |
| `ADMIN_EMAIL` | the owner's login email |
| `ADMIN_PASSWORD` | the owner's login password (changed after first login is recommended) |
| `PORT` | `4000` (Render sets `PORT` itself on some plans — the app reads `process.env.PORT`, so either works) |

`ADMIN_EMAIL`/`ADMIN_PASSWORD` only need to stay set for the first deploy;
`start.sh` seeds the admin account idempotently on every boot (it skips
silently if that email already exists), so it's safe to leave them in
permanently too.

### 5. Deploy

Render builds the Docker image, and `start.sh` runs pending migrations
automatically before starting the server — no manual migration step
needed on the platform. Once live, open the service URL and log in with
`ADMIN_EMAIL`/`ADMIN_PASSWORD`.

### 6. First use

1. **Дети** → upload the children list (xlsx/xls/csv/docx) or add manually.
2. **Оплаты** → upload the bank statement — matches are scored automatically
   (🟢 auto-confirmed / 🟡 needs review / 🔴 needs review, weak match).
   Confirm or reassign anything in "Требуют подтверждения".
3. **Расходы** → log expenses (manual or file upload).
4. **Dashboard** → plan/received/unpaid/expenses/balance, collection rate,
   debtors, average payment — switch the period picker to any month.

Re-uploading the same bank statement is safe — already-seen transactions
are skipped automatically (раздел 19).
