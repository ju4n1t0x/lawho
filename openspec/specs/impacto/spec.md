# Impacto Specification

## Purpose

Section with 4 stat counters in a green (`bg-leaf`) panel, each using the CountUp animation with `es-AR` locale formatting.

## Requirements

### Requirement: Four Stat Counters

The system MUST render 4 counters with verbatim data:
- Value: 2000, prefix: "+", suffix: "", label: "Consultas por operativo"
- Value: 2, prefix: "", suffix: "", label: "Operativos por año"
- Value: 1500, prefix: "", suffix: " km", label: "De Córdoba a Santa Victoria Este"
- Value: 100, prefix: "", suffix: "%", label: "Ad honorem, siempre"

#### Scenario: All 4 counters render

- GIVEN the impacto section renders
- WHEN inspecting the counters
- THEN each counter MUST display its label and animated value with correct prefix/suffix

### Requirement: Green Panel Background

The counters MUST be contained in a `bg-leaf` rounded panel with `text-leaf-foreground`.

#### Scenario: Panel uses leaf color

- GIVEN the impacto section renders
- WHEN inspecting the container
- THEN it MUST use the `--leaf` background color

### Requirement: CountUp Integration

Each counter MUST use the CountUp component (see `countup-animation` spec) to animate from 0 to the target value when scrolled into view.

#### Scenario: Counter animates on scroll

- GIVEN the impacto section is below the fold
- WHEN the user scrolls to it
- THEN each counter MUST animate from 0 to its target value using CountUp

#### Scenario: es-AR number formatting

- GIVEN a counter with value 2000
- WHEN the animation completes
- THEN the displayed number MUST be "2.000" (es-AR locale with thousands separator)
