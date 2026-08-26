/**
 * Core installment-plan math. Pure functions with no DOM access, so
 * the same logic can later be reused for other entry points (e.g. a
 * Bitrix24 payload builder or a WhatsApp message template) without
 * touching the UI code.
 */

/**
 * @typedef {Object} InstallmentInput
 * @property {number} area           Apartment area in m^2.
 * @property {number} pricePerM2     Price per m^2.
 * @property {number} downPayment    Down payment amount.
 * @property {number} termMonths     Installment term in months.
 */

/**
 * @typedef {Object} InstallmentResult
 * @property {number} totalPrice
 * @property {number} downPayment
 * @property {number} remainder
 * @property {number} monthlyPayment
 */

const AMOUNT_EPSILON = 1e-9;

/**
 * Validates raw installment input. Returns a map of field -> error
 * message for any invalid field. An empty object means the input is
 * valid and safe to pass to calculateInstallment().
 *
 * @param {InstallmentInput} input
 * @returns {{area?: string, pricePerM2?: string, downPayment?: string, termMonths?: string}}
 */
function validateInstallmentInput(input) {
  const errors = {};
  const { area, pricePerM2, downPayment, termMonths } = input;

  if (!Number.isFinite(area) || area <= 0) {
    errors.area = "Аянтты 0дон чоң киргизиңиз / Введите площадь больше 0";
  }

  if (!Number.isFinite(pricePerM2) || pricePerM2 <= 0) {
    errors.pricePerM2 = "Баасын 0дон чоң киргизиңиз / Введите цену больше 0";
  }

  if (!Number.isFinite(downPayment) || downPayment < 0) {
    errors.downPayment = "Төлөм терс сан боло албайт / Взнос не может быть отрицательным";
  }

  if (
    !errors.area &&
    !errors.pricePerM2 &&
    !errors.downPayment &&
    downPayment > area * pricePerM2 + AMOUNT_EPSILON
  ) {
    errors.downPayment =
      "Төлөм батирдин баасынан ашык боло албайт / Взнос не может превышать стоимость квартиры";
  }

  if (!Number.isFinite(termMonths) || termMonths <= 0) {
    errors.termMonths = "Мөөнөт 0дон чоң болушу керек / Срок должен быть больше 0";
  }

  return errors;
}

/**
 * Calculates the installment plan. Assumes input has already passed
 * validateInstallmentInput() (no errors).
 *
 * @param {InstallmentInput} input
 * @returns {InstallmentResult}
 */
function calculateInstallment(input) {
  const { area, pricePerM2, downPayment, termMonths } = input;

  const totalPrice = area * pricePerM2;
  const remainderRaw = totalPrice - downPayment;
  const remainder = Math.abs(remainderRaw) < AMOUNT_EPSILON ? 0 : remainderRaw;
  const monthlyPayment = remainder <= 0 ? 0 : remainder / termMonths;

  return {
    totalPrice,
    downPayment,
    remainder,
    monthlyPayment,
  };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { validateInstallmentInput, calculateInstallment };
}
