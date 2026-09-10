# Асыл-Аманат — KMS (backend, all 15 modules)

Backend for the "Асыл-Аманат" kindergarten management system, per
`ТЗ_AsylAmanat_KMS_v2.docx`. Every module in the TZ's section 3 (1–15) has
a backend implementation here. Stack: NestJS + TypeORM + PostgreSQL, per
section 5 of the TZ.

Backend-first, but not backend-only: `kms/frontend` is a minimal, real,
branded web UI (staff panel + parent portal) served straight off this
same app — see "Web frontend" below. No Flutter mobile apps (Module 13)
exist in this repo — see "What genuinely can't be finished here" for why.

## Module-by-module status

| # | Module | Status |
|---|--------|--------|
| 1 | Воспитанники | Done — `src/children`, `src/groups`, `src/documents` |
| 2 | Родители | Done — `src/parents` |
| 3 | Финансы | Done (fixed tariff) — `src/finance` |
| 4 | 1С | Done, generic protocol — `src/onec` (needs a real 1C version to finalize the exact format, see below) |
| 5 | Посещаемость | Done, QR only — `src/attendance` (face recognition deliberately not built, see below) |
| 6 | Личный кабинет родителя | Done, API + a first minimal web view — `src/me`, `frontend/` |
| 7 | AI-помощник | Done — `src/assistant` |
| 8 | Dashboard руководителя | Done — `src/dashboard` |
| 9 | Авто-уведомления | Done — Telegram + Email real, Push (in-app) real, WhatsApp wired but needs a paid account — `src/notifications` |
| 10 | Автоматические отчёты | Done, JSON + CSV — `src/reports` |
| 11 | Управление расходами | Done — `src/expenses` |
| 12 | AI-аналитика | Done — `src/analytics` |
| 13 | Мобильное приложение | Not built — separate Flutter codebase, see below |
| 14 | Безопасность | Done — `src/auth`, `src/audit`, `src/common` |
| 15 | Питание и меню | Done — `src/menu` |

## What's here, module by module

- **Auth & roles** (`src/auth`, `src/users`, `src/common`): JWT login, the
  6 roles from section 2 (`director`, `admin`, `accountant`, `teacher`,
  `medic`, `parent`), `RolesGuard` + `@Roles()`, `POST /auth/change-password`
  for any logged-in user. `POST /users` (director/admin) is how every staff
  account past the seeded director actually gets created — with
  `PUT /users/:id` and `POST /users/:id/reset-password` alongside it. A
  parent's login is provisioned separately, once their `Parent` record
  exists, via `POST /parents/:id/create-login` (see Parents below) —
  deliberately two steps, since a parent record can exist (a staff member
  entered a family's details) before that family has ever logged in.
- **Audit log** (`src/audit`): every mutating endpoint across every module
  records who did what to which entity — and `GET /audit` (director-only,
  paginated, filterable by `entityType`/`userId`) is how it's actually
  read back; writing to a log nobody can read isn't a security control.
- **Groups** (`src/groups`): kindergarten groups, capacity, assigned
  teacher.
- **Children** (`src/children`): child records, group assignment, status,
  enrollment/contract status, `allergies`, an opaque per-child QR code.
  Teachers only ever see their own group.
- **Documents** (`src/documents`): birth certificate / medical clearance /
  contract files per child, uploaded as real `multipart/form-data`
  (`POST /documents/children/:id`, a `file` field + a `type` field — try
  it from `/docs`, Swagger renders a real file picker for it) and
  downloaded as the original bytes with correct `Content-Type`/
  `Content-Disposition`, not base64-in-JSON. Storage sits behind a
  swappable `StorageAdapter` (`LocalDiskStorage` by default — see the
  deployment note below).
- **Parents** (`src/parents`): parent/guardian records, multi-parent links
  with a relation type. `ParentsService.ownsChild()` is the one shared
  check every other module uses to scope a parent's own login to their
  linked children — finance, attendance, documents, assistant, `/me` all
  call it instead of re-deriving it. `POST /parents/:id/create-login`
  provisions the actual login (email + password, role `parent`) once the
  family record exists.
- **Finance** (`src/finance`): tariffs (fixed, per group or per child),
  one-time/monthly/discount charges, a bulk monthly-accrual endpoint,
  payments (`bank_qr`/`cash`/`bank_transfer`) that always create a
  sequentially-numbered receipt in the same DB transaction, per-child debt
  (only charges due today or earlier count), a debtors list. Parents get
  `GET /finance/me/children/:id/balance`, `.../history`,
  `GET /finance/me/payments/:id/receipt`.
- **Attendance** (`src/attendance`): `POST /attendance/scan` toggles
  check-in/check-out for the scanned QR code — a teacher can only scan
  their own group, a parent only their own child.
  `GET /attendance/groups/:id/today` is a live roster; history is
  available per-child and, for parents, at `/attendance/me/...`.
- **Menu** (`src/menu`): weekly/period menu by meal type
  (breakfast/lunch/snack), viewable by everyone including parents;
  `GET /menu/warnings?date=` flags any active child whose `allergies`
  overlap that day's `allergens`.
- **Expenses** (`src/expenses`): categories, a planned amount per
  category per month, actual expense entries, and
  `GET /expenses/plan-vs-fact?period=YYYY-MM` for the deviation report.
- **Dashboard** (`src/dashboard`): `GET /dashboard/summary?from=&to=` —
  income, expenses, profit, total debt + debtor count, today's
  present/absent attendance, and free spots per group, all in one call.
- **Reports** (`src/reports`): `GET /reports/attendance`,
  `/reports/finance`, `/reports/debt`, each for any `from`/`to` range
  (a day, a week, a month — the caller just picks the range) with
  `?format=csv` to download instead of JSON. CSV rather than a formatted
  PDF/Excel — see the note below on why.
- **Notifications** (`src/notifications`): a channel-adapter interface
  with real Telegram and SMTP email adapters, plus an always-on in-app
  "push" log (`GET /notifications/me`) that needs no external account.
  `POST /notifications/broadcast` sends kindergarten news to every
  parent. Hooked into attendance scans ("ребёнок пришёл/ушёл") and
  payment creation ("оплата получена") — both fire-and-forget, so a
  notification failure never blocks the underlying action. WhatsApp has
  a real adapter (`src/notifications/channels/whatsapp.adapter.ts`)
  against the official Business Cloud API, but it reports
  `not_configured` until `WHATSAPP_API_TOKEN`/`WHATSAPP_PHONE_NUMBER_ID`
  are set — see the legal note below on why WhatsApp Web automation was
  never an option.
- **`/me`** (`src/me`): `GET /me/dashboard` — one call for a parent's
  child(ren), balances, recent attendance, today's menu, and their
  notification inbox. This is Module 6's web personal cabinet as an API;
  see Module 13 below for why there's no rendered web page in this repo.
- **1C sync** (`src/onec`): `GET /onec/export/payments`,
  `GET /onec/export/contragents`, `POST /onec/import/reconciliation`, all
  logged to `one_c_sync_logs`. Protocol-agnostic JSON in/out — see the
  open item below on why it can't be more specific than that yet.
- **AI assistant** (`src/assistant`): `POST /assistant/chat` for a parent.
  Builds a de-identified context (child labeled "Ребёнок 1", not by name)
  from that parent's own balance/attendance/menu data and calls OpenAI
  Chat Completions. Answers only from the supplied context; degrades to a
  plain "unavailable" message if `OPENAI_API_KEY` isn't set.
- **AI analytics** (`src/analytics`): `GET /analytics/forecast?months=` —
  aggregated (not per-child) monthly income totals plus a debtor
  count/total sent to OpenAI for a forecast, patterns, and
  recommendations. Same graceful degradation without an API key.

## What genuinely can't be finished here

These aren't missing code — they're blocked on something outside a
backend repo (an account, a legal sign-off, a second codebase):

- **Face recognition** (the rest of Module 5): the TZ's own legal-risk
  note says this needs a parent consent form and a legal review of KR
  biometric-data law *before* any code is written. Building it anyway
  would mean shipping unlawful data processing. QR is fully implemented
  and was the TZ's own recommended starting point.
- **Mobile apps** (Module 13): a native Flutter app is a separate
  codebase, plus Apple Developer Program and Google Play developer
  accounts that only the school can create (the TZ says as much in its
  own text). Every mobile screen this app would need already has a
  backend endpoint here (`/me/dashboard`, `/attendance/scan`,
  `/finance/me/...`, `/assistant/chat`) — building the Flutter client
  against them is real, separate mobile development work.
- **1C's exact protocol** (Module 4): which 1C version/configuration is
  still an open TZ question (section 8). `src/onec` implements a
  reasonable generic shape (pull payments/contragents as JSON, push
  reconciliation confirmations as JSON) that any 1C-side integration
  (an обработка, or middleware) can adapt to the real exchange format —
  but the real format can't be nailed down without knowing the version.
- **WhatsApp Business API account**: the adapter is real code against
  Meta's Cloud API; it just has no credentials to run with until the
  school pays for a WhatsApp Business API account. WhatsApp Web
  automation (what the original КП proposed) was never implemented
  because it violates Meta's terms and risks the number being banned —
  flagged as a real risk in the TZ itself.
- **PDF/Excel report export** (Module 10): reports export as CSV, which
  Excel opens natively. A pixel-formatted PDF or native `.xlsx` (with
  headers, styling, printed layout) needs a real templating/reporting
  library — a presentation choice worth making with the school rather
  than guessing at a layout.
- **Encryption at rest for sensitive fields** (Module 14): the TZ asks
  for encryption of medical/biometric/financial data. The right way to
  do that is disk/volume-level encryption on the production database
  (every managed Postgres provider offers this) plus TLS in transit —
  that's a deployment setting, not application code, and is called out
  in the deployment checklist below.

## Getting started

### Option A — Docker (fastest)

```bash
cp .env.example .env   # fill in a real JWT_SECRET at minimum; DB_HOST is
                        # overridden to "postgres" by docker-compose already
docker compose run --rm migrate   # creates the full schema
docker compose run --rm migrate npm run seed:director   # one-off director account
docker compose up -d
```

The app is now on `http://localhost:3000`, with interactive API docs at
`http://localhost:3000/docs` (click "Authorize" and paste the JWT from
`POST /auth/login` to try authenticated endpoints) and a health check at
`http://localhost:3000/health`.

Optionally seed demo data to have something to look at immediately:
`docker compose run --rm migrate npm run seed:demo` — creates a group, a
teacher, a parent, a child (with an allergy), a tariff, and today's menu
(including one dish that deliberately triggers the allergy warning), so
you can exercise most of the API without manual setup. Login/password for
the demo accounts are printed by the script; never run it against
production data.

### Option B — local Node + Postgres

```bash
cp .env.example .env   # fill in DB credentials, JWT_SECRET, and (optionally)
                        # the notification/AI provider keys — every one of
                        # them is optional and degrades gracefully if unset
npm install
npm run migration:run  # creates the full schema
npm run seed:director  # DIRECTOR_EMAIL=... DIRECTOR_PASSWORD=... npm run seed:director
npm run seed:demo      # optional demo data, see above
npm run start:dev
```

### Running the e2e suite locally

Point it at any disposable Postgres database — never a database with real
data, since the suite truncates every table before it runs:

```bash
createdb asyl_amanat_kms_test   # or: docker run -e POSTGRES_PASSWORD=... postgres:16-alpine
cp .env.example .env.test       # set DB_NAME=asyl_amanat_kms_test (and matching DB_* creds)
DB_HOST=localhost DB_NAME=asyl_amanat_kms_test npm run migration:run
npm run test:e2e
```

Either way: `POST /auth/login` with the director account to get a JWT and
start creating groups, children, parents, tariffs, menu items, expense
categories, etc. — either via `/docs` (Swagger UI) or any HTTP client.

## Web frontend

`kms/frontend` is a small, real, branded web UI — not a mockup — served
by this same NestJS app (no separate server, no build step: it's plain
HTML/CSS/JS, wired in via `@nestjs/serve-static` in `app.module.ts`).
Open the app's root URL in a browser and it's there.

- **Login** (`/`): email/password against `POST /auth/login`, stores the
  JWT in `localStorage`, routes by the returned role.
- **Staff view** (director/admin/accountant/teacher/medic): this month's
  stat tiles (director/admin only — `GET /dashboard/summary`) plus a
  children table with group, status, and allergy badges
  (`GET /children`, `GET /groups`).
- **Parent view**: one call to `GET /me/dashboard` rendered as a card per
  child — balance, today's attendance, today's menu, recent
  notifications, allergy badge front and center.

This is deliberately a first cut, not the full Module 6/8 web experience
the TZ describes (charts, payment history, document upload from the
browser, etc.) — it exists so staff and parents have something to
actually click through today, on top of an API that already supports much
more than the UI surfaces yet. Extending it means adding more views/calls
to `frontend/app.js`, not new backend work.

## Deployment checklist (what's actually left)

1. Provision PostgreSQL (managed, with disk encryption + automated
   backups — Module 14's "резервное копирование" + the encryption note
   above). `docker-compose.yml` ships a local Postgres container for
   quick starts; swap it for a managed instance in production by pointing
   `DB_HOST`/`DB_*` at it instead.
2. Run migrations (`docker compose run --rm migrate`, or
   `npm run migration:run`), then seed the director account once.
3. Set a real `JWT_SECRET` (the app refuses to boot in
   `NODE_ENV=production` with the placeholder value — see
   `src/config/validate-env.ts`); put the app behind HTTPS/a reverse proxy.
4. Point `DOCUMENTS_STORAGE_PATH` at a persistent volume (already wired
   up in `docker-compose.yml`), or swap `LocalDiskStorage`
   (`src/documents/storage/local-disk-storage.ts`) for an S3-compatible
   `StorageAdapter` implementation — the interface is already there,
   nothing else needs to change.
5. Fill in whichever notification/AI keys the school actually wants live
   (`TELEGRAM_BOT_TOKEN`, `SMTP_*`, `WHATSAPP_API_TOKEN`/
   `WHATSAPP_PHONE_NUMBER_ID` once that account exists, `OPENAI_API_KEY`)
   — every one is optional at the code level.
6. Resolve the two remaining open TZ questions that are business/legal
   decisions, not engineering ones (tariff logic, 1C version — see below).
7. Deploy: `docker compose up -d` behind a reverse proxy is the fastest
   path; `Dockerfile` builds a standalone production image if the target
   host runs its own orchestrator instead. `GET /health` is what to point
   a load balancer/orchestrator's health check at (Docker's own
   `HEALTHCHECK` already does this).

### Deploying on a managed platform (Render, Railway, Fly.io, etc.)

The `Dockerfile` is the thing to point any Docker-build-from-GitHub
platform at — no platform-specific config file is committed here since
the right one depends on which platform ends up chosen, but every one of
them asks for the same four things:

- **Repo + branch**: this repo, `claude/new-session-oqeywm` (or wherever
  it's merged to).
- **Build context / root directory**: `kms` — the `Dockerfile`,
  `docker-compose.yml`, and `frontend/` all live under `kms/`, not the
  repo root (this repo also hosts an unrelated act-generator tool at the
  root).
- **Dockerfile path**: `kms/Dockerfile`.
- **Environment variables**: everything in `kms/.env.example`, at minimum
  `DB_HOST`/`DB_PORT`/`DB_USER`/`DB_PASSWORD`/`DB_NAME` (pointed at
  whatever Postgres add-on the platform provisions) and a real
  `JWT_SECRET`. Leave the notification/AI keys blank until wanted — the
  app degrades gracefully without them.

After the first deploy, run migrations once via the platform's one-off/
shell command feature: `npm run migration:run`, then
`npm run seed:director`. Point the platform's health check at `GET
/health`. Once it's live, the same `/` root serves the web frontend from
this session's screenshots — no extra step for that.

Everything else — the Flutter apps, face recognition, and a real 1C
protocol — is separate work explained above, not a deployment step.

## Exploring the API without writing a frontend

- `GET /docs` — Swagger UI, generated from the actual DTOs/routes. Click
  "Authorize", paste a bearer token from `POST /auth/login`, and every
  protected endpoint becomes clickable/testable from the browser.
- `GET /health` — `{ status: "ok", db: "ok" }` once Postgres is reachable;
  a 503 otherwise. Safe to leave public; it reveals nothing sensitive.
- CI (`.github/workflows/kms-ci.yml`) runs two jobs on every push/PR
  touching `kms/`: a `build` job (`tsc --noEmit`, the unit suite, `npm run
  build`) and a separate `e2e` job against a real `postgres:16-alpine`
  service container (migrations, then the e2e suite below).

## Testing

Two layers, each catching a different class of bug:

- **Unit tests** (`npm test`, `src/**/*.spec.ts`, 42 tests) — pure logic
  against mocked repositories: the attendance check-in/out toggle, debt
  calculation, CSV escaping, password hashing, RBAC, login provisioning.
  Fast, no database needed.
- **E2E tests** (`npm run test:e2e`, `test/app.e2e-spec.ts`, 20 tests) —
  real HTTP requests through the fully-wired app (guards, validation
  pipe, exception filter) against a real PostgreSQL database: login, RBAC
  rejection, a full group → child → parent → tariff → payment → balance
  lifecycle, a real multipart document upload/download round-trip, the
  dashboard, and the audit log. Needs `DB_*` pointed at a real (ideally
  disposable) Postgres — `.env.test` locally, the CI service container in
  `e2e` above.

**The e2e layer isn't redundant with unit tests — it already found a real
bug the mocked tests couldn't:** several entities declared a nullable
column as `@Column({ nullable: true })` on a TypeScript union type
(`string | null`). TypeScript's emitted reflection metadata collapses any
union type to `Object`, and TypeORM refused to boot against a real
database with `DataTypeNotSupportedError: Data type "Object" ... is not
supported`. Every unit test mocks the repository, so none of them ever
touched real entity metadata — only actually running migrations against
Postgres surfaced it. Fixed by giving all 13 affected columns (across 9
entities) an explicit `type: 'varchar'`; a mocked test suite alone would
have shipped this broken.

## Security hardening

- **Helmet** sets standard security headers on every response
  (`src/main.ts`).
- **Rate limiting** (`@nestjs/throttler`): 120 req/min per IP app-wide,
  10 req/min on `/auth/login` and `/auth/change-password` specifically —
  those are what brute-force/credential-stuffing attempts target.
- **A global exception filter** (`src/common/all-exceptions.filter.ts`)
  normalizes every error response to `{ statusCode, message, path,
  timestamp }` and logs 5xx errors server-side, so nothing leaks a raw
  stack trace to the client.
- **Passwords** are always bcrypt-hashed (`UsersService`); nothing ever
  returns a `passwordHash` in an API response (`user.presenter.ts` strips
  it explicitly rather than relying on callers to remember not to select it).
- **`validateEnv()`** refuses to boot with a placeholder `JWT_SECRET` in
  `NODE_ENV=production`, and fails fast with a clear message if any
  required DB/JWT variable is missing, instead of a confusing crash three
  layers down in TypeORM.
- **Request logging** (`src/common/request-logging.middleware.ts`): every
  request gets a UUID correlation id, echoed back as the `X-Request-Id`
  response header and included in error bodies from the exception filter,
  with one structured JSON log line per request (`{requestId, method,
  path, status, durationMs}`) — so a user-reported error and its server
  log line can actually be matched up, and logs stay greppable instead of
  Nest's default human-formatted console output.

## Pagination

List endpoints likely to grow over years of real use — `GET /children`,
`GET /parents`, `GET /notifications/me`, `GET /audit` — take `page`
(default 1) and `pageSize` (default 25, max 200) query params and return
`{ items, total, page, pageSize }`. Endpoints that other modules consume
internally in full (e.g. "every active child in a group" for a debt or
menu-warning calculation) intentionally stay unpaginated — pagination is
a list-UI concern, not a data-access one.

## Known open items from the TZ (section 8)

- **Tariff logic** (fixed amount vs. attendance-based): implemented as
  fixed amount (`POST /finance/tariffs`, per group or per child).
  Attendance data exists now, so attendance-based billing is a product
  decision away, not a technical blocker, if the school wants it later.
- **1C version/configuration**: still open; see above.
- **Face recognition legal sign-off**: still open, blocks that half of
  Module 5 by design.
- **WhatsApp Business API account**: still needs to be purchased/set up;
  the adapter is ready the moment it exists.
