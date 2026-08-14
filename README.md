# 🌍 Micras Globe

**View the [Micras](https://micras.org/) world map as an interactive 3D globe — and measure the
distance between any two points on it.**

**▶ Live: https://eddyplolz.github.io/micras-globe/**

![The Micras world map rendered as a 3D globe](img/preview.jpg)

Micras is a shared geofiction world. This tool wraps its flat map onto a sphere so you can spin it,
light it, and — the main event — click two locations and read the real surface distance between them.

---

## Features

- **3D globe** from the current Micras equirectangular map (loads by default, no upload needed).
- **Distance measurement** — click two points, get the great-circle distance in kilometres.
- **Lat/long grid**, adjustable meridian/parallel spacing, and a pole line.
- **Map projections** — re-project the equirectangular map (Mercator, Mollweide, and more) via D3.
- **Atmosphere, lighting, and axial tilt** controls; **screenshot** and **animated-GIF** export.

## Using it

| Action | How |
|---|---|
| Rotate | Left-click + drag |
| Zoom | Mouse wheel |
| Pan | Right-click + drag |
| **Measure distance** | *Options → Measure distance*, then click two spots on the globe |
| Load a different map | *Images* → upload your own **equirectangular (2:1)** image |

**About the distances:** measurements read in **kilometres** — Micras is canonically about the same
size as Earth (radius ≈ 6,371 km). Regional and continental distances are accurate; very long,
near-antipodal spans currently *under*-report, a known limitation of the legacy distance formula that
a future update may refine.

**About the map:** the default surface is a current no-border Micras map. Micras cartography is
maintained by the [Micras Cartography Society](https://micras.org/mwiki/Micras_Cartography_Society)
(MCS); the authoritative maps live at [micras.org](https://micras.org/).

## Run it yourself

It is a fully static site — no server, no build step. Clone the repo and serve the folder:

```bash
npx serve .
```

Then open the printed `http://localhost:...` URL. To deploy your own copy, push these files to any
static host (GitHub Pages, Netlify, etc.); no backend is required.

## Credits

This tool is a self-hosted, Micras-specific build of **MapToGlobe** — the globe engine, the
distance-measurement tool, the projection and export features, and the shaders are all its work.

- **[MapToGlobe](https://www.maptoglobe.com/)** — Copyright © **Kurt Peters** (original work) and
  Copyright © 2025 **Tom Bowyer** ([@Zeerg](https://github.com/Zeerg), modifications & enhancements).
  Released under the **[Mozilla Public License 2.0](https://choosealicense.com/licenses/mpl-2.0/)**.
  Source for the current version: <https://github.com/Zeerg/MapToGlobe>.
- **Glow / atmosphere shader** — adapted from Lee Stemkoski's Three.js "Shader – Glow Effect" example.
- **Micras map** — © the [Micras Cartography Society](https://micras.org/mwiki/Micras_Cartography_Society)
  and its member cartographers.

### This Micras build

Assembled and self-hosted by **Eddy** ([@eddyplolz](https://github.com/eddyplolz)), with
**[Claude](https://www.anthropic.com/claude)** (Anthropic's Claude Code) as a contributor — mirroring
the legacy source, adapting it for Micras, and setting up the static build and deployment.

### Third-party libraries

Bundled and used under their respective open-source licenses (MIT / ISC / BSD unless noted):
[Three.js](https://threejs.org/) · [jQuery](https://jquery.com/) · [D3](https://d3js.org/) +
d3-geo-projection · [gif.js](https://github.com/jnordberg/gif.js) ·
[JSZip](https://stuk.github.io/jszip/) · [Remodal](https://github.com/VodkaBears/Remodal) ·
[colpick](http://www.colpick.com/) · [seedrandom](https://github.com/davidbau/seedrandom) ·
simplex-noise · async.js · and the Three.js `OrbitControls` / `ShaderTerrain` / `Detector` examples.

## What this build changed

Relative to the original MapToGlobe, this Micras build:

1. Preloads the current Micras world map as the default surface and sets the measure radius to
   Micras's (Earth-like) scale.
2. Removes the original's server-side save/share, imgur screenshot upload, and analytics, so it runs
   as pure static files with no backend or third-party tracking.
3. Re-points assets for static hosting and lightly rebrands to "Micras Globe."

All Micras-specific behavior is isolated to a single file (`js/micras-defaults.js`); the underlying
MapToGlobe source is otherwise unchanged.

## License & takedown

MapToGlobe is under MPL-2.0 (see Credits); this build follows the same terms and is published for
Micras community use. If you are Kurt Peters or Tom Bowyer and would like attribution adjusted or this
build taken down, please [open an issue](https://github.com/eddyplolz/micras-globe/issues) — happy to
oblige promptly.
