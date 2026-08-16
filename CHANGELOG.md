# Changelog

All notable changes to Micras Globe. Newest first.

## 2026-08-16

### Added
- **Range Rings.** A new measure mode: click a center point and draw a circle at a chosen radius.
  Presets cover **missile ranges** (SRBM/MRBM/IRBM/ICBM), **nuclear blast rings by yield** (fireball,
  overpressure, and thermal radii — approximate, for scale), a **custom radius**, and a **launch site**
  readout (a point's eastward rotational assist to orbit, largest near the equator).
- **More travel modes.** The travel-time estimator gains a container ship, high-speed rail, a
  supersonic jet, and a low-orbit ground track alongside the existing land, sea, and air modes.
- **"What is Micras?" section in the README**, introducing the shared world to newcomers, plus links
  to Micras, MicrasWiki, the Micras Cartography Society, and the community forum.

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
