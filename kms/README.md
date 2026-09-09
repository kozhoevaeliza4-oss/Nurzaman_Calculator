# Асыл-Аманат — KMS (backend, all 15 modules)

Backend for the "Асыл-Аманат" kindergarten management system, per
`ТЗ_AsylAmanat_KMS_v2.docx`. Every module in the TZ's section 3 (1–15) has
a backend implementation here. Stack: NestJS + TypeORM + PostgreSQL, per
section 5 of the TZ.

**This is the backend only.** No web admin panel, no Flutter mobile apps
(Module 13) exist in this repo — see "What genuinely can't be finished
here" below for why, and what's needed to add them.

## Module-by-module status

| # | Module | Status |
|---|--------|--------|
| 1 | Воспитанники | Done — `src/children`, `src/groups`, `src/documents` |
| 2 | Родители | Done — `src/parents` |
| 3 | Финансы | Done (fixed tariff) — `src/finance` |
| 4 | 1С | Done, generic protocol — `src/onec` (needs a real 1C version to finalize the exact format, see below) |
| 5 | Посещаемость | Done, QR only — `src/attendance` (face recognition deliberately not built, see below) |
| 6 | Личный кабинет родителя | Done, web/API — `src/me` (the TZ's "React-style" web view itself isn't in this repo; see Module 13 note) |
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
  `medic`, `parent`), `RolesGuard` + `@Roles()`.
- **Audit log** (`src/audit`): every mutating endpoint across every module
  records who did what to which entity.
- **Groups** (`src/groups`): kindergarten groups, capacity, assigned
  teacher.
- **Children** (`src/children`): child records, group assignment, status,
  enrollment/contract status, `allergies`, an opaque per-child QR code.
  Teachers only ever see their own group.
- **Documents** (`src/documents`): birth certificate / medical clearance /
  contract file metadata per child, behind a swappable `StorageAdapter`
  (`LocalDiskStorage` by default — see the deployment note below).
- **Parents** (`src/parents`): parent/guardian records, multi-parent links
  with a relation type. `ParentsService.ownsChild()` is the one shared
  check every other module uses to scope a parent's own login to their
  linked children — finance, attendance, documents, assistant, `/me` all
  call it instead of re-deriving it.
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

```bash
cp .env.example .env   # fill in DB credentials, JWT_SECRET, and (optionally)
                        # the notification/AI provider keys — every one of
                        # them is optional and degrades gracefully if unset
npm install
npm run migration:run  # creates the full schema
npm run seed:director  # DIRECTOR_EMAIL=... DIRECTOR_PASSWORD=... npm run seed:director
npm run start:dev
```

Then `POST /auth/login` with the director account to get a JWT and start
creating groups, children, parents, tariffs, menu items, expense
categories, etc. via the API.

## Deployment checklist (what's actually left)

1. Provision PostgreSQL (managed, with disk encryption + automated
   backups — Module 14's "резервное копирование" + the encryption note
   above) and point `.env` at it.
2. Run `npm run migration:run`, then `npm run seed:director` once.
3. Set a real `JWT_SECRET`; put the app behind HTTPS.
4. Point `DOCUMENTS_STORAGE_PATH` at a persistent volume, or swap
   `LocalDiskStorage` (`src/documents/storage/local-disk-storage.ts`) for
   an S3-compatible `StorageAdapter` implementation — the interface is
   already there, nothing else needs to change.
5. Fill in whichever notification/AI keys the school actually wants live
   (`TELEGRAM_BOT_TOKEN`, `SMTP_*`, `WHATSAPP_API_TOKEN`/
   `WHATSAPP_PHONE_NUMBER_ID` once that account exists, `OPENAI_API_KEY`)
   — every one is optional at the code level.
6. Resolve the two remaining open TZ questions that are business/legal
   decisions, not engineering ones (tariff logic, 1C version — see below).
7. Deploy the NestJS app (`npm run build && npm run start`) behind a
   process manager/container orchestrator of choice.

Everything else — the Flutter apps, face recognition, and a real 1C
protocol — is separate work explained above, not a deployment step.

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
