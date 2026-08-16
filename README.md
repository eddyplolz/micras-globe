# 🌍 Micras Globe

Spin the Micras map as a 3D globe and measure the real distance between any two places on it.

**Live: https://eddyplolz.github.io/micras-globe/**

![The Micras map wrapped on a 3D globe with the lat/long grid enabled](img/preview.jpg)

The Micras map is flat. This wraps it around a sphere you can turn, light, and click to measure.

## What is Micras?

New here? Micras is a made-up world that a community of online worldbuilders has built together over
the past couple of decades. People start their own countries on it, draw the borders, and write the
history, agreeing among themselves where everything sits on the map.

It began as a micronationalism hobby (running small, mostly-online "nations" for fun) and grew into a
full shared planet with its own geography and politics. The map here is the community's official one,
looked after by the Micras Cartography Society (MCS).

Explore Micras:

- [Micras](https://micras.org): the community's main site.
- [MicrasWiki](https://micras.org/mwiki/): the encyclopedia. Nations, history, geography, lore.
- [Micras Cartography Society](https://micras.org/mwiki/Micras_Cartography_Society): the people who make and keep the map.
- [Community forum](https://hub.mn/forum): where members talk, plan, and roleplay.

## What it does

- Shows the current Micras map on a globe, loaded automatically. No upload needed.
- Measures true great-circle distance in kilometers, miles, and nautical miles.
- Reads out latitude, longitude, and the compass bearing for each point.
- Estimates travel time, from a marching army to an airliner (speeds are editable).
- Traces multi-leg paths with a running total, and measures the area of a region you draw.
- Adds a lat/long grid, flat-map projections (Mercator, Mollweide, more), atmosphere and lighting, and screenshot and GIF export.

## How to use it

- Rotate: left-click and drag.
- Zoom: mouse wheel.
- Pan: right-click and drag.
- Measure: open the **Measure** tab, click **Measure distance**, then pick **Distance**, **Path**, or **Area**.
- Different map: open **Images** and upload any 2:1 (equirectangular) picture.

The controls sit in tabs: Measure, View, Environment, Terrain, plus Images, Generate, Screenshots,
Animations, and Map Projections.

About the numbers: distances are true great-circle and accurate at every range, because Micras is
about Earth-sized (radius around 6,371 km). Latitude runs from the pole. Longitude is measured east or
west of the map's center, a convention of this tool since Micras has no official prime meridian.

## Run it yourself

Just static files. No server, no build step.

```bash
npx serve .
```

Open the link it prints. To host your own copy, drop these files on any static host (GitHub Pages,
Netlify, whatever you like).

## Credits

The globe, the measuring, the projections, the exports, and the shaders are all the work of
MapToGlobe. This project just wraps it for Micras.

- MapToGlobe by Kurt Peters (the original) and Tom Bowyer ([@Zeerg](https://github.com/Zeerg), current
  maintainer). Released under the [Mozilla Public License 2.0](https://choosealicense.com/licenses/mpl-2.0/).
  Source: [github.com/Zeerg/MapToGlobe](https://github.com/Zeerg/MapToGlobe). Try the original at
  [maptoglobe.com](https://www.maptoglobe.com/).
- The glow and atmosphere shader is adapted from Lee Stemkoski's Three.js "Shader Glow Effect" example.
- The Micras map is by the [Micras Cartography Society](https://micras.org/mwiki/Micras_Cartography_Society)
  and its mapmakers.

Built and hosted by Eddy ([@eddyplolz](https://github.com/eddyplolz)), with
[Claude](https://www.anthropic.com/claude) (Anthropic's Claude Code) helping pull the source, adapt it
for Micras, and set up the static build and deployment.

Libraries used, each under its own open license: Three.js, jQuery, D3 with d3-geo-projection, gif.js,
JSZip, Remodal, colpick, seedrandom, simplex-noise, async.js, and the Three.js OrbitControls,
ShaderTerrain, and Detector helpers.

## What's different here

Compared to the original MapToGlobe:

1. Opens straight onto the Micras map, at Micras scale.
2. Drops everything that needed a server: the old save and share links, the imgur upload, and the
   analytics. It runs as plain files, no backend, no tracking.
3. Fixes the file paths for static hosting and renames itself "Micras Globe."

Everything specific to Micras lives in one small file, `js/micras-defaults.js`. The rest of MapToGlobe
is left as it was.

## License and takedown

MapToGlobe is under the MPL-2.0 (see Credits), and this build follows the same terms. It is here for
the Micras community to use. If you are Kurt Peters or Tom Bowyer and want the credit changed, or this
copy taken down, [open an issue](https://github.com/eddyplolz/micras-globe/issues) and it will be
sorted out quickly.
