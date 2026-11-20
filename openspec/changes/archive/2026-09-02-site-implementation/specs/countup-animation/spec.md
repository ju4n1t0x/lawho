# CountUp Animation Specification

## Purpose

rAF-driven eased integer counter with `Intl.NumberFormat("es-AR")` locale, gated by IntersectionObserver. Replaces the reference's React `CountUp` component with a vanilla Astro `<script>` island.

## Requirements

### Requirement: CountUp Component

The system MUST provide a `CountUp.astro` component that animates an integer from 0 to a target `value` using requestAnimationFrame with easing.

#### Scenario: Counter animates to target

- GIVEN a CountUp with `value={2000}`
- WHEN it scrolls into view
- THEN the displayed number MUST animate from 0 to 2000

### Requirement: es-AR Number Formatting

The system MUST format numbers using `Intl.NumberFormat("es-AR")` — e.g., 2000 → "2.000", 1500 → "1.500".

#### Scenario: Thousands separator is a period

- GIVEN a CountUp with `value={1500}`
- WHEN the animation completes
- THEN the displayed text MUST be "1.500" (not "1,500")

### Requirement: Prefix and Suffix Support

The component MUST accept `prefix` and `suffix` props that are displayed alongside the animated number.

#### Scenario: Prefix renders before number

- GIVEN a CountUp with `value={2000}` and `prefix="+"`
- WHEN the animation completes
- THEN the display MUST show "+2.000"

#### Scenario: Suffix renders after number

- GIVEN a CountUp with `value={100}` and `suffix="%"`
- WHEN the animation completes
- THEN the display MUST show "100%"

### Requirement: IntersectionObserver Gate

The animation MUST NOT start until the element is scrolled into view (threshold 0.4).

#### Scenario: Counter waits for visibility

- GIVEN a CountUp is below the fold
- WHEN the page loads
- THEN the counter MUST show 0 (or not start animating) until scrolled into view

### Requirement: Reduced Motion Fallback

When `prefers-reduced-motion: reduce` is active, the counter MUST immediately display the final value without animation.

#### Scenario: Reduced motion shows final value

- GIVEN `prefers-reduced-motion: reduce` is active
- WHEN the page loads
- THEN the CountUp MUST immediately show the target value (e.g., "2.000") without animating
