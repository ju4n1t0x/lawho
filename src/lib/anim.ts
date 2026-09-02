const esArFormatter = new Intl.NumberFormat("es-AR");

/**
 * Ease-out cubic easing function (clamped to [0, 1]).
 * Mirrors the CountUp's `1 - Math.pow(1 - t, 3)` curve.
 */
export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Format a number using the Argentine Spanish locale ("es-AR").
 * Uses a period as the thousands separator: 2000 -> "2.000".
 */
export function formatEsAr(value: number): string {
  return esArFormatter.format(value);
}
