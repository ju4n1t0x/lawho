# Design Tokens Specification

## Purpose

Define the visual design system: Tailwind v4 `@theme inline` configuration with oklch color tokens, typography, radii, easing, shadows, 7 keyframe animations, and utility classes. Single source of truth shared by all section components.

## Requirements

### Requirement: Color Tokens in oklch

The system MUST define semantic color tokens using oklch format: `--primary`, `--accent`, `--secondary`, `--sun`, `--leaf`, `--sky`, `--violet`, `--background`, `--foreground`, `--card`, `--muted-foreground`, `--border`, plus their `-foreground` counterparts where applicable.

#### Scenario: Tokens resolve to oklch values

- GIVEN the global CSS is loaded
- WHEN `--primary` is inspected
- THEN its value MUST be in oklch format (e.g., `oklch(0.678 0.181 49.5)`)

### Requirement: Typography Tokens

The system MUST define `--font-display: "Raleway"` and `--font-sans: "Montserrat"` with system-ui fallbacks.

#### Scenario: Display font applies to headings

- GIVEN a heading element with `font-display` utility
- THEN it MUST render using Raleway

### Requirement: Radii, Easing, and Shadow

The system MUST define `--radius: 1.5rem`, `--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1)`, and `--shadow-soft`.

#### Scenario: Shadow token usable in utilities

- GIVEN `--shadow-soft` is defined
- WHEN a component references `shadow-soft`
- THEN the computed box-shadow MUST match `0 24px 60px -30px oklch(0.3 0.05 60 / 0.4)`

### Requirement: Seven Keyframe Animations

The system MUST define exactly 7 `@keyframes`: `fade-up`, `soft-pulse`, `slow-zoom`, `float-soft`, `drift`, `marquee`, `heartbeat`. Each MUST have a corresponding `@utility animate-*` class.

#### Scenario: All 7 utilities are available

- GIVEN the global CSS is loaded
- WHEN inspecting available utilities
- THEN `animate-fade-up`, `animate-soft-pulse`, `animate-slow-zoom`, `animate-float-soft`, `animate-drift`, `animate-marquee`, `animate-heartbeat` MUST all exist

### Requirement: Utility Classes

The system MUST define `photo-zoom` (overflow hidden + img scale on hover), `lift` (translateY(-6px) + shadow on hover), and `reveal` / `reveal.is-visible` base classes.

#### Scenario: photo-zoom scales image on hover

- GIVEN an element with `photo-zoom`
- WHEN hovered
- THEN its child `img` MUST scale to 1.05

### Requirement: Reduced Motion Fallback

Under `prefers-reduced-motion: reduce`, all infinite animations MUST be disabled, and `.reveal` MUST display immediately without transition.

#### Scenario: Reduced motion disables loops

- GIVEN `prefers-reduced-motion: reduce` is active
- WHEN the page loads
- THEN `animate-float-soft`, `animate-drift`, `animate-marquee`, `animate-heartbeat`, `animate-slow-zoom` MUST have `animation: none`
