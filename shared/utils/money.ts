/**
 * All monetary values are stored and calculated as integers in the currency's
 * minor unit (e.g. cents). Floats are only used at the display/input boundary.
 */

const fractionDigitsCache = new Map<string, number>();

/** Number of minor-unit digits for an ISO 4217 currency (USD → 2, JPY → 0). */
export function currencyFractionDigits(currency: string): number {
  const code = currency.toUpperCase();
  let digits = fractionDigitsCache.get(code);
  if (digits === undefined) {
    digits =
      new Intl.NumberFormat("en", {
        style: "currency",
        currency: code,
      }).resolvedOptions().maximumFractionDigits ?? 2;
    fractionDigitsCache.set(code, digits);
  }
  return digits;
}

export function isMinorAmount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

/** Converts a major-unit amount (e.g. 12.5 from an input field) to minor units. */
export function toMinorUnits(major: number, currency: string): number {
  if (!Number.isFinite(major))
    throw new RangeError("Amount must be a finite number");
  const digits = currencyFractionDigits(currency);
  const text = String(major);
  // Shift the decimal point via the string form to avoid float artefacts
  // like 1.005 * 100 = 100.49999; fall back for exponent notation.
  const shifted = text.includes("e")
    ? major * 10 ** digits
    : Number(`${text}e${digits}`);
  return Math.round(shifted);
}

export function toMajorUnits(minor: number, currency: string): number {
  return minor / 10 ** currencyFractionDigits(currency);
}

export function formatMoney(
  minor: number,
  currency: string,
  locale = "en-US",
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(toMajorUnits(minor, currency));
}

/** Percentage of an amount in minor units, rounded half-up to a whole minor unit. */
export function percentOf(minor: number, percent: number): number {
  if (percent < 0 || percent > 100)
    throw new RangeError("Percent must be between 0 and 100");
  return Math.round((minor * percent) / 100);
}
