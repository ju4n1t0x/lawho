# Delta for Navbar

## MODIFIED Requirements

### Requirement: Section Links

The navbar MUST contain anchor links to `#historia` (Historia), `#infancias` (Infancias), `#misiones` (Terreno), `#voluntariado` (Sumate), and a navigation link to `/operativos-de-salud/` labeled "Operativos de salud".
(Previously: only anchor links to in-page sections; no link to the blog index.)

#### Scenario: Links navigate to sections

- GIVEN the navbar is rendered
- WHEN a user clicks "Historia"
- THEN the page MUST scroll to the `#historia` section

#### Scenario: Blog link navigates to blog index

- GIVEN the navbar is rendered on desktop
- WHEN a user clicks "Operativos de salud"
- THEN navigation MUST target `/operativos-de-salud/`

### Requirement: Mobile Hamburger Drawer

The system MUST provide a hamburger menu button visible below `md` breakpoint that opens a drawer with the same section links, the "Operativos de salud" blog link, and the "Doná" CTA.
(Previously: drawer contained only section anchor links and the "Doná" CTA, with no blog link.)

#### Scenario: Mobile drawer opens on hamburger click

- GIVEN viewport width is below `md` breakpoint
- WHEN the hamburger button is clicked
- THEN a drawer MUST slide in containing all section links and the blog link

#### Scenario: Mobile drawer closes after section link click

- GIVEN the mobile drawer is open
- WHEN a section anchor link is clicked
- THEN the drawer MUST close and the page MUST scroll to the target section

#### Scenario: Mobile drawer blog link navigates

- GIVEN the mobile drawer is open
- WHEN "Operativos de salud" is clicked
- THEN the drawer MUST close and navigation MUST target `/operativos-de-salud/`

#### Scenario: Desktop hides hamburger

- GIVEN viewport width is at or above `md`
- WHEN the navbar renders
- THEN the hamburger button MUST NOT be visible
