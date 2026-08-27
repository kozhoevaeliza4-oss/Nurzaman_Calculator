/**
 * DOM binding layer. Reads form fields, calls the pure calculator
 * functions, and renders the result. Kept separate from calculator.js
 * so the math stays reusable and testable on its own.
 */
(function () {
  const els = {
    currency: document.getElementById("currency"),
    pricePerM2Prefix: document.getElementById("pricePerM2-prefix"),
    downPaymentPrefix: document.getElementById("downPayment-prefix"),

    area: document.getElementById("area"),
    pricePerM2: document.getElementById("pricePerM2"),
    downPayment: document.getElementById("downPayment"),
    term: document.getElementById("term"),

    block: document.getElementById("block"),
    floor: document.getElementById("floor"),
    rooms: document.getElementById("rooms"),

    clientName: document.getElementById("clientName"),
    clientPhone: document.getElementById("clientPhone"),
    managerName: document.getElementById("managerName"),
    managerPhone: document.getElementById("managerPhone"),

    areaError: document.getElementById("area-error"),
    pricePerM2Error: document.getElementById("pricePerM2-error"),
    downPaymentError: document.getElementById("downPayment-error"),

    resultTotal: document.getElementById("result-total"),
    resultDown: document.getElementById("result-down"),
    resultRemainder: document.getElementById("result-remainder"),
    resultMonthly: document.getElementById("result-monthly"),

    floorplanPickerGrid: document.getElementById("floorplan-picker-grid"),
    blockHint: document.getElementById("block-hint"),

    saveContactButton: document.getElementById("save-contact-button"),
    contactError: document.getElementById("contact-error"),

    sendButton: document.getElementById("send-button"),
    sendError: document.getElementById("send-error"),
    sendStatus: document.getElementById("send-status"),
    sendDownloadButton: document.getElementById("send-download-button"),

    installButton: document.getElementById("install-button"),
    installHintText: document.getElementById("install-hint-text"),
  };

  // Tracks the currency the amount fields are currently expressed in,
  // so a currency switch can convert the existing numbers exactly
  // once instead of re-interpreting them (which would silently change
  // the apartment price, or double-convert on repeated switches).
  let activeCurrency = els.currency.value;

  // Populated by recalculate() whenever the current input is valid, so
  // the "send to client" button can build the PDF from the exact same
  // numbers already on screen instead of re-deriving them.
  let lastValidState = null;

  // The most recently generated PDF, kept so the "download again" button
  // can re-save it without regenerating (and re-fetching the images).
  let lastGeneratedPdf = null;

  function parseNumber(rawValue) {
    if (rawValue === "" || rawValue === null || rawValue === undefined) {
      return NaN;
    }
    const value = Number(rawValue);
    return Number.isFinite(value) ? value : NaN;
  }

  function readInput() {
    return {
      area: parseNumber(els.area.value),
      pricePerM2: parseNumber(els.pricePerM2.value),
      downPayment: parseNumber(els.downPayment.value),
      termMonths: parseNumber(els.term.value),
    };
  }

  // Apartment identity + client/manager contact details. These never
  // block the calculation or the send button — they only enrich the PDF
  // and drive the genplan/floor-plan lookups — so they're read separately
  // from the validated financial input above.
  function readExtras() {
    return {
      block: els.block.value.trim(),
      floor: els.floor.value.trim(),
      rooms: els.rooms.value.trim(),
      clientName: els.clientName.value.trim(),
      clientPhone: els.clientPhone.value.trim(),
      managerName: els.managerName.value.trim(),
      managerPhone: els.managerPhone.value.trim(),
    };
  }

  function clearErrors() {
    els.areaError.textContent = "";
    els.pricePerM2Error.textContent = "";
    els.downPaymentError.textContent = "";
  }

  function renderErrors(errors) {
    clearErrors();

    if (errors.area && els.area.value !== "") {
      els.areaError.textContent = errors.area;
    }
    if (errors.pricePerM2 && els.pricePerM2.value !== "") {
      els.pricePerM2Error.textContent = errors.pricePerM2;
    }
    if (errors.downPayment && els.downPayment.value !== "") {
      els.downPaymentError.textContent = errors.downPayment;
    }
  }

  function renderResults(result) {
    const currency = els.currency.value;
    els.resultTotal.textContent = formatCurrency(result.totalPrice, currency);
    els.resultDown.textContent = formatCurrency(result.downPayment, currency);
    els.resultRemainder.textContent = formatCurrency(result.remainder, currency);
    els.resultMonthly.textContent = formatCurrency(result.monthlyPayment, currency);
  }

  function renderEmptyResults() {
    const currency = els.currency.value;
    els.resultTotal.textContent = formatCurrency(0, currency);
    els.resultDown.textContent = formatCurrency(0, currency);
    els.resultRemainder.textContent = formatCurrency(0, currency);
    els.resultMonthly.textContent = formatCurrency(0, currency);
  }

  // Visual floor-plan picker: the manager doesn't need to know a unit's
  // exact area or room count by heart — picking its thumbnail fills area
  // + rooms in automatically. Manual entry in the fields below still
  // works untouched for anything not in the catalogue.
  function buildFloorplanPicker() {
    const plans = CONFIG.floorPlans || [];
    els.floorplanPickerGrid.innerHTML = "";

    plans.forEach((plan, index) => {
      const blocks = Array.isArray(plan.block) ? plan.block : plan.block ? [plan.block] : [];

      const card = document.createElement("button");
      card.type = "button";
      card.className = "floorplan-picker__card";
      card.dataset.index = String(index);
      card.innerHTML =
        `<img class="floorplan-picker__thumb" src="${plan.image}" alt="Планировка ${formatNumber(plan.area)} м²" loading="lazy" />` +
        '<span class="floorplan-picker__meta">' +
        `${formatNumber(plan.area)} м² · ${plan.rooms}-комн.` +
        "</span>" +
        (blocks.length > 0 ? `<span class="floorplan-picker__blocks">Блок ${blocks.join(", ")}</span>` : "");

      card.addEventListener("click", () => {
        els.area.value = String(plan.area);
        els.rooms.value = String(plan.rooms);
        if (blocks.length === 1 && !els.block.value.trim()) {
          els.block.value = blocks[0];
        }
        recalculate();
      });

      els.floorplanPickerGrid.appendChild(card);
    });
  }

  // Highlights the picker card matching the currently typed area + rooms
  // (and block, when the plan is scoped to specific blocks) so manual
  // edits and picker clicks stay visually in sync.
  function syncFloorplanPickerSelection(input, extras) {
    const cards = els.floorplanPickerGrid.querySelectorAll(".floorplan-picker__card");
    const plans = CONFIG.floorPlans || [];

    cards.forEach((card) => {
      const plan = plans[Number(card.dataset.index)];
      const blocks = Array.isArray(plan.block) ? plan.block : plan.block ? [plan.block] : [];
      const roomsMatch = String(plan.rooms) === extras.rooms || !extras.rooms;
      const blockMatch = blocks.length === 0 || !extras.block || blocks.includes(extras.block);
      const isMatch = Number.isFinite(input.area) && input.area === plan.area && roomsMatch && blockMatch;
      card.classList.toggle("floorplan-picker__card--active", isMatch);
    });
  }

  // Tells the manager which blocks a picked (or manually typed) plan
  // actually exists in, and flags it when the typed block doesn't match —
  // catches exactly the case of picking e.g. "58,37 м²" (only blocks
  // 1, 6, 9, 10) while "Блок" still has an unrelated value in it.
  function updateBlockHint(input, extras) {
    const plans = CONFIG.floorPlans || [];
    const matches = plans.filter(
      (plan) => plan.area === input.area && (!extras.rooms || String(plan.rooms) === extras.rooms)
    );

    const allowedBlocks = Array.from(
      new Set(matches.flatMap((plan) => (Array.isArray(plan.block) ? plan.block : plan.block ? [plan.block] : [])))
    );

    if (!Number.isFinite(input.area) || allowedBlocks.length === 0) {
      els.blockHint.textContent = "";
      els.blockHint.classList.remove("field__hint--warning");
      return;
    }

    const blocksText = allowedBlocks.join(", ");
    if (extras.block && !allowedBlocks.includes(extras.block)) {
      els.blockHint.textContent = `Бул план блок ${extras.block}-до жок / Этой планировки нет в блоке ${extras.block} — доступна в блоках: ${blocksText}`;
      els.blockHint.classList.add("field__hint--warning");
    } else {
      els.blockHint.textContent = `Бул план ушул блокторго гана тиешелүү / Доступна только в блоках: ${blocksText}`;
      els.blockHint.classList.remove("field__hint--warning");
    }
  }

  // The suggested amount is only ever shown as a placeholder hint — the
  // manager still types in whatever down payment the client actually
  // agrees to. Falls back to the generic example once area/price aren't
  // both known yet.
  function updateDownPaymentPlaceholder(area, pricePerM2) {
    if (Number.isFinite(area) && area > 0 && Number.isFinite(pricePerM2) && pricePerM2 > 0) {
      const suggested = formatCurrency(area * pricePerM2 * 0.3, els.currency.value);
      els.downPayment.placeholder = `Сунуш: ${suggested} (30%) / Рекомендуем: ${suggested} (30%)`;
    } else {
      els.downPayment.placeholder = "Мисалы, 10 000 / Например, 10 000";
    }
  }

  function recalculate() {
    const input = readInput();
    const extras = readExtras();
    const errors = validateInstallmentInput(input);

    renderErrors(errors);
    hideSendStatus(); // the numbers are changing — any previously generated PDF is now stale
    syncFloorplanPickerSelection(input, extras);
    updateBlockHint(input, extras);
    updateDownPaymentPlaceholder(input.area, input.pricePerM2);
    updateSaveContactButtonState();

    if (Object.keys(errors).length > 0) {
      renderEmptyResults();
      lastValidState = null;
      els.sendButton.disabled = true;
      return;
    }

    const result = calculateInstallment(input);
    renderResults(result);
    lastValidState = { input, result, currency: els.currency.value, extras };
    els.sendButton.disabled = false;
  }

  function updateCurrencyPrefixes() {
    const symbol = getCurrencySymbol(els.currency.value);
    els.pricePerM2Prefix.textContent = symbol;
    els.downPaymentPrefix.textContent = symbol;
  }

  function handleCurrencyChange() {
    const nextCurrency = els.currency.value;

    if (nextCurrency !== activeCurrency) {
      [els.pricePerM2, els.downPayment].forEach((input) => {
        const raw = parseNumber(input.value);
        if (Number.isFinite(raw)) {
          input.value = convertAmount(raw, activeCurrency, nextCurrency);
        }
      });
      activeCurrency = nextCurrency;
    }

    updateCurrencyPrefixes();
    recalculate();
  }

  function setSendButtonBusy(isBusy) {
    els.sendButton.classList.toggle("send-button--busy", isBusy);
    els.sendButton.disabled = isBusy || !lastValidState;
  }

  function hideSendStatus() {
    els.sendStatus.hidden = true;
  }

  function showSendStatus() {
    els.sendStatus.hidden = false;
  }

  /**
   * Real phones and tablets (iOS/Android) have a native share sheet that
   * actually handles files (WhatsApp, Telegram, AirDrop, ...). Desktop
   * Chrome on Windows/macOS/Linux can *report* navigator.share/canShare
   * as present, but the OS-level share picker for files is unreliable
   * there (Windows in particular throws "couldn't show all the ways to
   * share" for PDFs) — so desktop always uses direct download instead of
   * trusting feature detection alone.
   */
  function isIosDevice() {
    const ua = navigator.userAgent || "";
    return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  }

  function isTouchPrimaryDevice() {
    const ua = navigator.userAgent || "";
    const isIos = isIosDevice();
    const isAndroid = /Android/.test(ua);
    return isIos || isAndroid;
  }

  /**
   * Tries the native share sheet. Returns true when the situation is
   * "handled" (shared, or the user deliberately closed the sheet) and
   * false when the caller should fall back to a direct download instead.
   */
  async function tryNativeShare(blob, fileName) {
    if (!isTouchPrimaryDevice()) return false;
    if (typeof File === "undefined" || !navigator.share || !navigator.canShare) return false;

    const file = new File([blob], fileName, { type: "application/pdf" });
    if (!navigator.canShare({ files: [file] })) return false;

    try {
      await navigator.share({ files: [file], title: "Nurzaman — расчёт рассрочки" });
      return true;
    } catch (shareErr) {
      return shareErr && shareErr.name === "AbortError"; // user cancelled on purpose — otherwise fall back
    }
  }

  function triggerDownload(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function handleSendClick() {
    if (!lastValidState) return;

    els.sendError.textContent = "";
    hideSendStatus();
    setSendButtonBusy(true);

    try {
      const doc = await buildOfferPdf(lastValidState);
      const fileName = buildOfferPdfFileName(lastValidState);
      const blob = doc.output("blob");
      lastGeneratedPdf = { blob, fileName };

      const handledByShare = await tryNativeShare(blob, fileName);
      if (!handledByShare) {
        triggerDownload(blob, fileName);
        showSendStatus();
      }
    } catch (err) {
      console.error(err);
      els.sendError.textContent =
        "Ката кетти, кайра аракет кылыңыз / Не удалось сформировать PDF, попробуйте ещё раз";
    } finally {
      setSendButtonBusy(false);
    }
  }

  function handleDownloadAgainClick() {
    if (!lastGeneratedPdf) return;
    triggerDownload(lastGeneratedPdf.blob, lastGeneratedPdf.fileName);
  }

  // --- Save client to contacts ---

  function updateSaveContactButtonState() {
    const hasName = els.clientName.value.trim() !== "";
    const hasPhone = els.clientPhone.value.trim() !== "";
    els.saveContactButton.disabled = !(hasName && hasPhone);
  }

  function buildVCard(name, phone) {
    return ["BEGIN:VCARD", "VERSION:3.0", `N:;${name};;;`, `FN:${name}`, `TEL;TYPE=CELL:${phone}`, "END:VCARD"].join(
      "\r\n"
    );
  }

  // Hands the client's name + phone to the phone's own "add contact"
  // screen instead of saving anything ourselves — the manager still has
  // to tap save there, so nothing is created without their confirmation.
  async function handleSaveContactClick() {
    const name = els.clientName.value.trim();
    const phone = els.clientPhone.value.trim();
    if (!name || !phone) return;

    els.contactError.textContent = "";

    try {
      const vcard = buildVCard(name, phone);
      const blob = new Blob([vcard], { type: "text/vcard" });
      const safeName = toSafeFileName(name) || "contact";
      const fileName = `${safeName}.vcf`;

      if (isIosDevice()) {
        // iOS Safari only shows its native "Create New Contact" preview
        // when IT is the one opening the vCard (a direct navigation it
        // can intercept) — a vCard handed to navigator.share() instead
        // just lands in the generic file-sharing sheet with no contact
        // actions, and a forced download (the `download` attribute)
        // skips the preview entirely. So on iOS this deliberately opens
        // the vCard in place rather than sharing or downloading it.
        //
        // Must be a blob: URL, not data: — Safari blocks top-level
        // navigation to data: URLs outright (a long-standing anti-phishing
        // restriction), so that version never even opens.
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.target = "_blank";
        link.rel = "noopener";
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
        return;
      }

      if (isTouchPrimaryDevice() && typeof File !== "undefined" && navigator.share && navigator.canShare) {
        // Android's share sheet commonly lists the Contacts app itself as
        // a target for a shared .vcf, so this is worth trying there.
        const file = new File([blob], fileName, { type: "text/vcard" });
        if (navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({ files: [file] });
            return;
          } catch (shareErr) {
            if (shareErr && shareErr.name === "AbortError") return;
            // Share sheet failed for some other reason — fall through to
            // a plain download below instead of leaving the manager stuck.
          }
        }
      }

      // No (working) share sheet — a downloaded .vcf is the one thing
      // every remaining platform handles the same way: on desktop
      // (Windows/macOS) double-clicking it opens the system
      // Contacts/Outlook add-contact screen. window.open() on a blob:
      // URL is unreliable here (many desktop browsers just silently
      // fail to display an unknown MIME type), so this reuses the same
      // proven download path as the PDF button instead.
      triggerDownload(blob, fileName);
    } catch (err) {
      console.error(err);
      els.contactError.textContent =
        "Ката кетти, кайра аракет кылыңыз / Не удалось сохранить контакт, попробуйте ещё раз";
    }
  }

  // --- PWA install prompt (Android/Chrome) + manual instructions (iOS) ---

  function isRunningStandalone() {
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true
    );
  }

  function initInstallHint() {
    if (isRunningStandalone()) return;

    let deferredPrompt = null;

    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      deferredPrompt = event;
      els.installButton.hidden = false;
    });

    els.installButton.addEventListener("click", async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      els.installButton.hidden = true;
    });

    window.addEventListener("appinstalled", () => {
      els.installButton.hidden = true;
      els.installHintText.hidden = true;
    });

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (isIos) {
      els.installHintText.hidden = false;
      els.installHintText.textContent =
        "Сафаридеги 'Бөлүшүү' баскычын басып, 'Башкы экранга кошуу' тандаңыз / В Safari нажмите «Поделиться» → «На экран «Домой»»";
    }
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("service-worker.js").catch((err) => {
        console.error("Service worker registration failed:", err);
      });
    });
  }

  function init() {
    const yearEl = document.getElementById("year");
    if (yearEl) yearEl.textContent = String(new Date().getFullYear());

    [
      els.area,
      els.pricePerM2,
      els.downPayment,
      els.block,
      els.floor,
      els.rooms,
      els.clientName,
      els.clientPhone,
      els.managerName,
      els.managerPhone,
    ].forEach((input) => {
      input.addEventListener("input", recalculate);
    });

    els.term.addEventListener("change", recalculate);
    els.currency.addEventListener("change", handleCurrencyChange);
    els.sendButton.addEventListener("click", handleSendClick);
    els.sendDownloadButton.addEventListener("click", handleDownloadAgainClick);
    els.saveContactButton.addEventListener("click", handleSaveContactClick);

    buildFloorplanPicker();
    updateCurrencyPrefixes();
    recalculate();
    initInstallHint();
    registerServiceWorker();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
