# Navbar Specification

## Purpose

Sticky pill navbar with logo "LAWHO" + tagline "Fundación sanitaria", section links, "Doná" CTA, and a mobile hamburger/drawer menu (deliberate improvement over the reference which lacks mobile navigation).

## Requirements

### Requirement: Sticky Pill Navbar

The system MUST render a sticky top navbar with rounded-full shape, backdrop blur, logo block, section links, and a "Doná" CTA button.

#### Scenario: Navbar visible on scroll

- GIVEN the page is rendered
- WHEN the user scrolls down
- THEN the navbar MUST remain fixed at the top with backdrop blur

### Requirement: Logo and Tagline

The logo block MUST display "LAWHO" in `font-display` bold and "Fundación sanitaria" as a small uppercase tracking-widest subtitle.

#### Scenario: Logo text matches verbatim

- GIVEN the navbar renders
- WHEN inspecting the logo block
- THEN it MUST contain the text "LAWHO" and "Fundación sanitaria"

### Requirement: Section Links

The navbar MUST contain anchor links to `#historia` (Historia), `#infancias` (Infancias), `#misiones` (Terreno), `#voluntariado` (Sumate).

#### Scenario: Links navigate to sections

- GIVEN the navbar is rendered
- WHEN a user clicks "Historia"
- THEN the page MUST scroll to the `#historia` section

### Requirement: Doná CTA

The navbar MUST include a "Doná" button linking to `#donar` with accent background.

#### Scenario: Doná links to donation section

- GIVEN the navbar renders
- WHEN "Doná" is clicked
- THEN navigation MUST target `#donar`

### Requirement: Mobile Hamburger Drawer

The system MUST provide a hamburger menu button visible below `md` breakpoint that opens a drawer with the same section links and "Doná" CTA.

#### Scenario: Mobile drawer opens on hamburger click

- GIVEN viewport width is below `md` breakpoint
- WHEN the hamburger button is clicked
- THEN a drawer MUST slide in containing all section links

#### Scenario: Mobile drawer closes after link click

- GIVEN the mobile drawer is open
- WHEN a section link is clicked
- THEN the drawer MUST close and the page MUST scroll to the target section

#### Scenario: Desktop hides hamburger

- GIVEN viewport width is at or above `md`
- WHEN the navbar renders
- THEN the hamburger button MUST NOT be visible
