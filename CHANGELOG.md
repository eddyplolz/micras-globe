# Changelog

All notable changes to Micras Globe. Newest first.

## 2026-08-16

### Added
- **Footer disclaimer.** A short note in the bottom bar explains that distances are approximate (based
  on Micras's canonical 6,875 km radius) and that travel-time estimates are a work in progress.
- **Nuclear fallout plume.** A new Range Rings preset draws the downwind contamination footprint from
  ground zero — a teardrop of dose-rate bands (lethal / severe / detectable) stretching in the wind
  direction and speed you set. Illustrative, not a real fallout simulation.
- **Range Rings.** A new measure mode: click a center point and draw a circle at a chosen radius.
  Presets cover **missile ranges** (SRBM/MRBM/IRBM/ICBM), **nuclear blast rings by yield** (fireball,
  overpressure, and thermal radii — approximate, for scale), a **custom radius**, and a **launch site**
  readout (a point's eastward rotational assist to orbit, largest near the equator).
- **More travel modes.** The travel-time estimator gains a container ship, high-speed rail, a
  supersonic jet, and a low-orbit ground track alongside the existing land, sea, and air modes.
- **"What is Micras?" section in the README**, introducing the shared world to newcomers, plus links
  to Micras, MicrasWiki, the Micras Cartography Society, and the community forum.

### Fixed
- **Corrected the planet radius to canon.** The globe now uses Micras's canonical radius of
  **6,875 km** (per the MicrasWiki "Micras" infobox) instead of Earth's 6,371 km. Every distance,
  area, and travel-time reading was about 8% too small; they are now to scale.
- **Realistic modern travel times.** Car, railway, and high-speed rail were treated as slow daily
  distances, so short trips read far too long (400 km by high-speed rail showed 6+ hours). They now
  use real cruising speeds (~90 / ~100 / ~300 km/h), so that trip reads about 1.3 hours. Muscle-powered
  modes still measure in realistic daily marching distances.

### Changed
- **Range ring colors made easier to see.** Missile-range rings are now magenta instead of light
  blue, so they stand out against the ocean; the nuclear fireball ring is white and the light-blast
  ring brighter.
- **Menus reorganized.** The single, over-long Options panel is split into focused tabs —
  **Measure**, **View**, **Environment**, and **Terrain** — so no panel runs off the bottom of the
  screen. Panels now scroll if they are ever taller than the window.
- **Refreshed the interface** with a cleaner dark look: rounded panels, clearer section headers,
  and tidier controls.

## 2026-08-15

### Added
- **Measurement Pack.** The measure tool now does far more than one distance:
  - Distance shown in **kilometers, miles, and nautical miles** together.
  - **Latitude/longitude** of each clicked point and the **compass bearing** between them
    (latitude from the pole; longitude east/west of the map center — a tool convention).
  - **Travel-time** estimate with editable speed presets, from a marching army to an airliner.
  - **Path** mode — click many points for a running great-circle total (routes, borders, rivers).
  - **Area** mode — enclose a region to read its spherical-polygon area in km² and mi², plus perimeter.
- **Navigation links** — the "Micras Globe" title links to the source repo; a footer links out to
  MicrasWiki and the Micras Tools hub.
- **README preview image** — a framed screenshot of the globe.

### Changed
- Default surface swapped to the latest no-border Micras map.
- Self-hosted the Open Sans font; the page now makes no external requests.
- Removed the unused 2D Sketch-View drawing mode (the lat/long grid overlay it shared code with is kept).

### Fixed
- Distance measurement now uses a true great-circle arc, accurate at every range. It previously
  approximated the arc by the straight-line chord and read low toward the far side of the world.

## Initial release — 2026-08-15

- Self-hosted mirror of the legacy MapToGlobe (vanilla JS, jQuery, Three.js, D3), with the current
  Micras map on a 3D globe, distance measuring, a lat/long grid, map re-projections, atmosphere and
  lighting controls, and screenshot / spinning-GIF export. Trackers and server-side save/share/upload
  from the original were stripped for a fully client-side, static build.
