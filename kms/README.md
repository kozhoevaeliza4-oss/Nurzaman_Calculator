# Асыл-Аманат — KMS (backend, Stage 1–2)

Backend for the "Асыл-Аманат" kindergarten management system, per
`ТЗ_AsylAmanat_KMS_v2.docx`. Covers Stage 1 (roadmap section 9 of the TZ:
Modules 1, 2, 14 — the data foundation) and Stage 2 (Module 3 — finance).

Stack: NestJS + TypeORM + PostgreSQL, matching section 5 of the TZ
(Backend / API: NestJS; DB: PostgreSQL).

## What's here

- **Auth & roles** (`src/auth`, `src/users`, `src/common`): JWT login,
  6 roles from section 2 of the TZ (`director`, `admin`, `accountant`,
  `teacher`, `medic`, `parent`), a `RolesGuard` + `@Roles()` decorator.
- **Audit log** (`src/audit`): every mutating endpoint records who did what
  to which entity — "журнал действий" required by Module 14.
- **Groups** (`src/groups`): kindergarten groups, capacity, assigned teacher.
- **Children** (`src/children`): Module 1 — child records, group
  assignment, status (active/left/academic_leave), enrollment/contract
  status, and an `allergies` field as a hook for Module 15. Teachers only
  ever see their own group; a searchable list is scoped by group/status/name.
- **Parents** (`src/parents`): Module 2 — parent/guardian records, and a
  `child_parents` link table supporting multiple parents per child with a
  relation type (mother/father/guardian/other). A parent's own login only
  ever sees `GET /parents/me/children` — never the general listing.
- **Finance** (`src/finance`): Module 3 — tariffs (fixed amount per group,
  optionally overridden per child — see the open question below),
  one-time/monthly/discount charges, a bulk "accrue this month's tariff for
  every active child in a group" endpoint, payments (`bank_qr`/`cash`/
  `bank_transfer`) that always create a sequentially-numbered receipt in
  the same transaction, per-child balance ("задолженность на текущую
  дату" — only charges due today or earlier count), and a debtors list.
  Parents get their own `GET /finance/me/children/:id/balance`,
  `.../history`, and `GET /finance/me/payments/:id/receipt`, each checking
  the child is actually linked to that parent before returning anything.

## What's intentionally not here yet

Everything from Stage 3 onward (section 9 of the TZ): 1C integration (4),
attendance/QR/face recognition (5), parent portal (6), AI assistant (7),
dashboard (8), notifications (9), reports (10), expenses (11), AI
analytics (12), mobile apps (13), and nutrition/allergies (15) beyond the
`allergies` field already on `Child`. Building those out is future work —
see the TZ's own open questions in section 8 before starting Module 4
(which 1C version/config).

The finance module also only implements the fixed-tariff half of the
open tariff question (see below) — attendance-based billing would need
Module 5 (attendance) to exist first anyway, so fixed tariffs unblock
real usage now without foreclosing the other option later.

## Getting started

```bash
cp .env.example .env   # fill in DB credentials + a real JWT_SECRET
npm install
npm run migration:run  # creates the Stage 1 + Stage 2 (finance) schema
npm run seed:director  # DIRECTOR_EMAIL=... DIRECTOR_PASSWORD=... npm run seed:director
npm run start:dev
```

Then `POST /auth/login` with the director account to get a JWT, and use it
to create groups, children, parent records, and tariffs via the API.

## Known open items from the TZ (section 8)

- Tariff logic (fixed amount vs. attendance-based) — this backend
  implements the fixed-amount option (`POST /finance/tariffs` per group
  or per child); switching to attendance-based billing later is still
  open and depends on Module 5 (attendance) existing.
- 1C version/configuration in use — blocks Module 4's integration protocol.
- Face recognition requires a written parental-consent process and legal
  sign-off before it can be built (see the TZ's legal-risk note on
  Module 5) — QR should ship first.
- WhatsApp notifications need the official WhatsApp Business API, not
  WhatsApp Web automation (ToS risk flagged in the TZ, Module 9).
