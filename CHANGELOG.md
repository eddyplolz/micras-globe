# Changelog

All notable changes to Micras Globe. Newest first.

## 2026-09-02 (mobile menu fix)

### Fixed
- **On phones, the "Distances are approximate…" note no longer overlaps an open menu panel.** The
  note is positioned at the top on mobile, right where the panels open, so it collided with panel
  text (most visibly the About panel's heading). It now hides while a panel is open and shows again
  when you close it.

## 2026-09-02 (About tab)

### Added
- **An About tab** with the tool's scale, coordinate convention, and known limitations in plain
  language — including the land-area quirk (the wiki's land-area figures imply a ~11% larger planet
  than its stated 6,875 km radius, which the tool uses as-is) and a note that the map is pulled live
  from the Micras Cartography Society with a bundled fallback.

## 2026-09-02 (generated-worlds tab & reference lines)

### Added
- **Show equator & prime meridian.** A new option in the View menu draws Micras's equator and prime
  meridian — the meridian runs through Norfolk Isles (old Tymaria City), where the two cross.

### Changed
- **The "Generate" and "Terrain" tools now live under one "Generated Worlds" menu**, with a note that
  they build or shape your own world and don't apply to the Micras political map. Same tools, grouped
  and labeled so it's clear what's for the Micras map and what's for a world of your own. No features
  were removed.

## 2026-09-02 (live map)

### Added
- **The globe now auto-updates from the live MCS map.** On load it fetches the current claims map
  straight from micras.org, automatically crops out the legend, title, and frame, and textures the
  globe with the clean 2:1 world rectangle — so the map stays current with every MCS update, with no
  manual crop or re-upload. The bundled map still shows instantly and remains the fallback if the
  live map can't be reached; you can still upload your own surface at any time.

## 2026-08-29 (mobile & housekeeping pass)

### Fixed
- **The map-projection control bar no longer collides with the menu bar.** The Projection dropdown,
  Download button, and note row sat too high and overlapped the top menu; the strip now sits cleanly
  below it.
- **The map-projection download button is visible again.** It relied on an icon image that was
  never shipped, so it rendered as an invisible gap; it is now a plain "Download PNG" button (and
  works with the keyboard). The outdated "click here for more info" link that pointed at a defunct
  page was removed.
- **The lat/long grid and world generator no longer break on narrow phone screens.** An offscreen
  drawing canvas could be sized to a negative width below ~350px wide, corrupting the grid, Generate,
  and GIF tools; its size is now floored to a valid minimum.
- **The "rotating sun" GIF progress now counts correctly.** It showed "1 of undefined" and never
  advanced; it now reads "3 of 126" and climbs as frames are captured.
- **The globe canvas resizes correctly after you leave the Map Projections view.** If you resized the
  window while that view was open, the globe now picks up the new size on return instead of staying
  at the old dimensions.
- **The image-upload dialog is steadier.** Choosing a non-image file (or canceling the file picker)
  no longer enables OK on a file that would silently do nothing, and canceling the picker no longer
  throws an error.
- **Saved pins are hardier against hand-edited browser storage.** Duplicate pin IDs no longer leave
  stray leftover markers on the globe, and a pin with an extremely long name no longer renders as a
  black label.

### Changed
- **Added a Content-Security-Policy and a no-referrer policy.** The app was already self-contained
  (no remote scripts, styles, images, or fonts); these make that guarantee explicit and enforced, and
  stop outbound links from leaking the page URL.

## 2026-08-28 (robustness pass)

### Fixed
- **Range rings and measured paths now stay put when you tilt or spin the globe.** They are anchored
  to the map by latitude and longitude instead of to a fixed point in space, so rotating the globe or
  changing its axial tilt no longer slides them off their target.
- **A corrupt saved pin can no longer break the whole Pins panel.** A pin with a damaged color value
  (from hand-edited browser storage) now falls back to a default color and is skipped if unreadable,
  instead of leaving the panel dead with no message.
- **Uploading a new surface or night map while the atmosphere is on now shows immediately.** Turning
  the atmosphere back off keeps the surface you uploaded, rather than reverting to the earlier one.
- **A shared view link can no longer drop you inside the globe.** Links that would place the camera
  under the surface (a black screen) are rejected and the default view is kept.

### Changed
- **The rotating-globe GIF export uses fewer frames** (100 instead of 200) to roughly halve its memory
  use, and now reports if the export is stopped or runs out of memory instead of hanging silently.
- **Long sessions use less video memory.** Drawing and clearing paths, redrawing rings, swapping the
  background image, and toggling the lat/long grid now free their old GPU buffers instead of leaking
  them.

## 2026-08-28 (reliability pass)

### Fixed
- **A failed map load no longer leaves an endless LOADING spinner.** If the map image can't be
  fetched (a bad connection, a temporary host hiccup), the spinner now stops and a short message asks
  you to check your connection and reload, instead of hanging over a blank green wireframe.
- **Browsers without WebGL get a real message, not a blank page.** On a device or browser that can't
  run WebGL, the globe now shows the standard "your browser doesn't support WebGL" note instead of
  failing silently to nothing.
- **Closing the Measure panel now clears what you drew.** Previously, drawing range rings or a
  path/area and then closing the Measure panel left the overlays stuck on the globe with no way to
  remove them. Closing the panel now clears them and returns to Distance mode.
- **A due-north bearing reads "0° N", never "360° N".** The compass bearing readout now normalizes
  to the 0–359° range.

### Changed
- **The globe now reports startup problems instead of failing quietly.** If the globe can't finish
  starting up, the map loader, saved pins, and shared-view features now log a clear warning rather
  than silently never appearing.
- **Removed a leftover "o" keyboard shortcut** inherited from the original MapToGlobe that overlaid an
  unrelated third-party image and interfered with typing the letter "o" into text fields.

## 2026-08-28

### Fixed
- **Nuclear blast rings now match the references they cite.** The overpressure rings were drawn about
  2.3x too small — a 1 Mt airburst put 5 psi at 3.1 km and 1 psi at 7.9 km. They are re-anchored to
  the standard OTA / Glasstone & Dolan 1 Mt airburst table: 5 psi at about 7.1 km, 1 psi at about
  18.7 km, and 20 psi at about 2.4 km. The fireball and thermal radii were already correct and are
  unchanged.
- **The fallout panel's wind label no longer contradicts the plume.** The plume stretches toward the
  heading you enter, so the readout now reads "Wind blowing toward 90° E" instead of "Wind 90° E,"
  which conventionally names a wind coming from the east — the opposite direction.
- **The radius field no longer flashes "NaN km · NaN mi · NaN nm."** Typing in the Planet radius box
  before placing two points, or clearing it entirely, used to run the distance math on missing
  values. It now waits for both points and falls back to the canonical 6,875 km when the box is blank.

### Changed
- **The Planet radius field starts at 6,875 km in the page itself,** so there is no brief "100" on
  first paint before the Micras default loads.
- **The measurement math moved into a tested core.** Distance, bearing, spherical area, and the
  blast / fallout scaling now live in `js/measure-core.js` as pure functions, pinned by a
  dependency-free Node suite (`tests/measure-core.test.js`, run with `node tests/measure-core.test.js`).
  The tool behaves exactly as before; the numbers are now guarded against regressions.

## 2026-08-18

### Added
- **Named pins.** A new **Pins** tab turns the globe into an annotation layer. Click **Add pin**,
  then click the globe to drop a labeled marker for a capital, landmark, or event site. Rename a pin
  in the list, click its color swatch to recolor it, or delete it. Pins are stored by geographic
  latitude and longitude, so they stay put as the globe rotates, and they are saved in your browser
  (localStorage) so they reload on your next visit. Pins are per-browser and are not part of the
  shareable view link.

## 2026-08-16

### Added
- **Day/night boundary.** An optional line follows the existing manual Sun Position controls and marks the exact light/dark boundary on the globe. It does not claim to show a canonical current time or season.
- **Shareable views.** The View panel can copy a link that restores the same camera angle, zoom, and panned center.
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

- **Model assumptions and sources.** The Measure panel now carries a collapsible note stating what
  each preset actually models — representative missile range classes, approximate cube-root blast
  scaling, an illustrative (not predictive) fallout footprint, and editable travel assumptions.

### Fixed
- **The menu bar works on phones.** Below 640 px every tool — Images, Generate, Measure, View,
  Environment, Terrain, Screenshots, Animations — was hidden, leaving only Help and Explore. The bar
  is now a horizontally scrollable strip with all items reachable.
- **Launch assist now uses Micras's rotation, not Earth's.** The rotational-assist readout was
  quoting Earth's equatorial speed of 465 m/s. Micras is larger, so its equator moves at about
  **500 m/s** (6,875 km radius, 24-hour solar day). The value is now derived from those canonical
  figures rather than hardcoded, so it cannot drift from the radius again.
- **Menus are keyboard-accessible.** The menu items are list elements and had no keyboard
  activation; Enter and Space now open them, and focused items show a visible outline.
- **Startup is no longer order-dependent.** Ten scripts loaded with `async`, letting them race each
  other despite real dependencies (OrbitControls before the globe wires controls, the polyhedron
  projections after d3). They now load with `defer`, which preserves order.
- **A resize before the scene is ready no longer throws.** `windowResize` now returns early if the
  camera or renderer does not exist yet.
- **Help and Explore menu links now work.** They used to point at dead `/help` and `/explore` pages
  (404 on the static site). **Help** now opens the "How to use it" guide in the README, and **Explore**
  opens MicrasWiki.
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
