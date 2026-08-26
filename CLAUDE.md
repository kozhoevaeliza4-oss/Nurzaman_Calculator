# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A static, installable PWA (no build step, no bundler, no package.json) that lets a Nurzaman sales
manager calculate an apartment installment plan for one project ("Европейский квартал") and generate
a bilingual (Kyrgyz/Russian) client-facing PDF offer on the spot. Everything runs client-side; there
is no backend and no framework — plain HTML/CSS/JS loaded via `<script>` tags in `index.html`.

## Running / developing

There is no build or install step. Serve the directory with any static file server and open it,
e.g.:

```bash
python3 -m http.server 8000
# or
npx serve .
```

Then open `http://localhost:8000/`. A plain `file://` open mostly works too, except the service
worker (`service-worker.js`) requires being served over http(s).

There are no linters, formatters, or automated tests configured in this repo — verify changes
manually in the browser (open the calculator, fill the form, check the results panel, and generate
a PDF via the send button).

**After editing any file listed in `APP_SHELL` inside `service-worker.js`** (i.e. almost any CSS/JS/
asset change), bump `CACHE_NAME` in that file, otherwise returning users keep getting the stale
cached version.

## Architecture

Scripts are loaded in dependency order at the bottom of `index.html` and all attach globals to
`window` (no modules/bundler) — order matters, don't reorder the `<script>` tags:

```
config.js → currency.js → format.js → calculator.js → genplan.js → floorplans.js → pdf.js → app.js
```

- **`js/config.js`** — the single source of truth / de facto data layer: exchange rate, installment
  terms, the active project's copy (fit-out checklist, nearby infrastructure, why-this-apartment /
  closing text), the genplan block→highlight-rectangle map, and the block+area→floor-plan-image
  lookup table. Almost all future content/data changes (new blocks, new floor plans, wording tweaks,
  a new project) should go here rather than into the logic files. There's a commented-out `projects`
  array showing the intended shape for multi-project support later.
- **`js/calculator.js`, `js/currency.js`, `js/format.js`, `js/genplan.js`, `js/floorplans.js`** —
  pure functions, no DOM access, each independently reusable/testable (also each exports via
  `module.exports` when `module` exists, even though there's currently no test runner wired up).
  - `calculator.js`: `validateInstallmentInput()` / `calculateInstallment()` — the installment math.
  - `currency.js`: USD⇄KGS conversion using `CONFIG.currency.usdToKgsRate` as the only place the
    rate is defined.
  - `genplan.js` / `floorplans.js`: block→region and block+area→image lookups against `CONFIG`.
    Floor-plan matching is **exact area match only, on purpose** — no nearest-match fallback, since
    attaching the wrong layout to a client offer is considered worse than showing none.
- **`js/app.js`** — the only file that touches the DOM. Wires form inputs to `recalculate()`, renders
  results/errors, updates the genplan highlight and floor-plan preview as the user types, builds the
  PDF via `pdf.js` on send, and handles the PWA install prompt + native share-sheet vs. direct-download
  logic for the "send to client" button (touch devices try `navigator.share` with the generated PDF
  file first; desktop always falls back to direct download since desktop file-sharing support is
  unreliable).
- **`js/pdf.js`** — builds the 2-page client offer PDF with `jsPDF` (vendored in `js/vendor/`, plus
  vendored Roboto font data so Cyrillic renders correctly — the default jsPDF fonts don't support
  Cyrillic). Page 1 is the apartment + financial breakdown; page 2 is genplan + location map +
  infrastructure + floor plan + fit-out checklist + client/manager contact cards. Pure drawing logic;
  takes an already-validated `{ input, result, currency, extras }` state object built by `app.js`.
- **`service-worker.js`** — cache-first app-shell service worker; `APP_SHELL` must be kept in sync
  with every file the app actually loads, and `CACHE_NAME` must be bumped on any content change (see
  above).

## Conventions to follow

- **Bilingual UI text everywhere**: nearly every user-facing string (labels, errors, PDF copy) is
  Kyrgyz + Russian side by side, typically `"<ky> / <ru>"` or separate `.ky`/`.ru` spans/keys. Follow
  this pattern for any new user-facing text instead of adding Russian- or English-only strings.
- **Keep math/lookup logic DOM-free.** `calculator.js`, `currency.js`, `format.js`, `genplan.js`, and
  `floorplans.js` must stay pure functions with no `document`/`window` access, so they stay reusable
  outside the current UI (e.g. a future WhatsApp/Bitrix24 integration) — DOM work belongs in `app.js`.
- **`CONFIG` is the extension point.** Adding a block, a floor plan, fit-out items, infrastructure
  entries, or adjusting the exchange rate/terms should be a `config.js` edit, not a change to the
  calculation/rendering logic.
- New content-only changes to `komplectation`/`infrastructure`/`whyThisApartment`/`closingMessage` in
  `config.js` should stay factual and contract-accurate — these are edited freely per the existing
  comments, but only to reflect what's actually contractually true.
