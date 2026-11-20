# Marquee Specification

## Purpose

CSS-only infinite horizontal marquee displaying pueblo/community names with dot separators.

## Requirements

### Requirement: Pueblo Names

The marquee MUST display the following names verbatim: "Wichí", "Chorote", "Chulupí", "Toba", "Criollos", "Santa Victoria Este", "La Merced", "Alto La Sierra".

#### Scenario: All names present

- GIVEN the marquee renders
- WHEN inspecting its content
- THEN all 8 names MUST appear in order, each followed by a dot separator

### Requirement: CSS-Only Infinite Scroll

The marquee MUST animate continuously using CSS `@keyframes marquee` (translateX 0 to -50%) with no JavaScript.

#### Scenario: Marquee loops infinitely

- GIVEN the page is loaded
- WHEN observed over time
- THEN the content MUST scroll left continuously and loop seamlessly

#### Scenario: Reduced motion disables marquee

- GIVEN `prefers-reduced-motion: reduce` is active
- WHEN the page loads
- THEN the marquee MUST NOT animate (static display)

### Requirement: Content Duplication for Seamless Loop

The marquee MUST duplicate the name list so the CSS animation produces a seamless infinite loop.

#### Scenario: No visible jump at loop boundary

- GIVEN the marquee animates
- WHEN the animation completes one cycle
- THEN the transition MUST be seamless with no visible jump
