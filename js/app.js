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

    areaError: document.getElementById("area-error"),
    pricePerM2Error: document.getElementById("pricePerM2-error"),
    downPaymentError: document.getElementById("downPayment-error"),

    resultTotal: document.getElementById("result-total"),
    resultDown: document.getElementById("result-down"),
    resultRemainder: document.getElementById("result-remainder"),
    resultMonthly: document.getElementById("result-monthly"),

    sendButton: document.getElementById("send-button"),
    sendError: document.getElementById("send-error"),

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

  function recalculate() {
    const input = readInput();
    const errors = validateInstallmentInput(input);

    renderErrors(errors);

    if (Object.keys(errors).length > 0) {
      renderEmptyResults();
      lastValidState = null;
      els.sendButton.disabled = true;
      return;
    }

    const result = calculateInstallment(input);
    renderResults(result);
    lastValidState = { input, result, currency: els.currency.value };
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

  async function handleSendClick() {
    if (!lastValidState) return;

    els.sendError.textContent = "";
    setSendButtonBusy(true);

    try {
      const doc = await buildOfferPdf(lastValidState);
      const fileName = "Nurzaman-rassrochka.pdf";
      const blob = doc.output("blob");

      let shared = false;
      if (typeof File !== "undefined" && navigator.canShare) {
        const file = new File([blob], fileName, { type: "application/pdf" });
        if (navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: "Nurzaman — расчёт рассрочки",
            });
            shared = true;
          } catch (shareErr) {
            if (shareErr && shareErr.name === "AbortError") {
              shared = true; // user cancelled the share sheet on purpose
            }
          }
        }
      }

      if (!shared) {
        doc.save(fileName);
      }
    } catch (err) {
      console.error(err);
      els.sendError.textContent =
        "Ката кетти, кайра аракет кылыңыз / Не удалось сформировать PDF, попробуйте ещё раз";
    } finally {
      setSendButtonBusy(false);
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

    [els.area, els.pricePerM2, els.downPayment].forEach((input) => {
      input.addEventListener("input", recalculate);
    });

    els.term.addEventListener("change", recalculate);
    els.currency.addEventListener("change", handleCurrencyChange);
    els.sendButton.addEventListener("click", handleSendClick);

    updateCurrencyPrefixes();
    recalculate();
    initInstallHint();
    registerServiceWorker();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
