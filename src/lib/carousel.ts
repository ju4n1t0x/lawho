/**
 * Pure helpers for the Terreno carousel.
 *
 * DOM wiring lives in Misiones.astro inline <script>.
 * These functions are unit-testable without a browser.
 */

/**
 * Resolve the scroll behavior based on reduced-motion preference.
 * When reduced motion is enabled, use "auto" (instant) instead of "smooth".
 */
export function resolveScrollBehavior(reducedMotion: boolean): ScrollBehavior {
  return reducedMotion ? "auto" : "smooth";
}

/**
 * Determine whether a pointer drag exceeds the horizontal threshold
 * and is predominantly horizontal (not a vertical scroll).
 *
 * Returns true when |dx| > threshold AND |dx| > |dy|.
 */
export function exceedsDragThreshold(
  dx: number,
  dy: number,
  threshold = 8,
): boolean {
  return Math.abs(dx) > threshold && Math.abs(dx) > Math.abs(dy);
}
