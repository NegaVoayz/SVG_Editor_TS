const DISPLAY_PLACES = 6;

export function normalizeZero(value: number): number {
  return Object.is(value, -0) ? 0 : value;
}

export function exactNumberText(value: number): string {
  return String(normalizeZero(value));
}

export function numberText(value: number): string {
  const normalized = normalizeZero(value);
  const fixed = normalized.toFixed(DISPLAY_PLACES);
  const text = fixed.includes(".")
    ? fixed.replace(/0+$/u, "").replace(/\.$/u, "")
    : fixed;

  if (normalized !== 0 && (text === "0" || text === "-0")) {
    return exactNumberText(normalized);
  }
  return text;
}

