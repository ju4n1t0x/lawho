# Reveal Animation Specification

## Purpose

IntersectionObserver-driven fade-up animation for scroll-triggered element visibility. Replaces the reference's React `Reveal` component with a vanilla Astro `<script>` island.

## Requirements

### Requirement: Reveal Component

The system MUST provide a `Reveal.astro` component that wraps a `<slot />` and adds scroll-triggered fade-up animation via IntersectionObserver.

#### Scenario: Element fades in on scroll

- GIVEN a `Reveal` component wraps content below the fold
- WHEN the user scrolls the element into view
- THEN the content MUST fade from opacity 0 to 1 and translate from Y+28px to Y=0

### Requirement: Delay Prop

The component MUST accept a `delay` prop (in ms) that staggers the animation start.

#### Scenario: Staggered reveal

- GIVEN multiple `Reveal` components with delays 0, 120, 240
- WHEN they scroll into view
- THEN each MUST animate with its respective delay offset

### Requirement: Reduced Motion Fallback

When `prefers-reduced-motion: reduce` is active, revealed elements MUST be immediately visible with no transition.

#### Scenario: Reduced motion shows content immediately

- GIVEN `prefers-reduced-motion: reduce` is active
- WHEN the page loads
- THEN all `Reveal` content MUST be visible immediately without animation

### Requirement: Element Already in Viewport

When a `Reveal` element is already in the viewport on page load, it MUST become visible immediately without waiting for scroll.

#### Scenario: Above-fold Reveal shows immediately

- GIVEN a `Reveal` component is in the initial viewport
- WHEN the page loads
- THEN the content MUST be visible without requiring scroll
