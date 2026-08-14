# 🌍 Micras Globe

Spin the Micras map as a 3D globe, and measure the real distance between any two places on it.

**Live: https://eddyplolz.github.io/micras-globe/**

Micras is a shared, made-up world, and its map is flat. This tool wraps that flat map around a
sphere so you can turn it, light it, and click two spots to see how far apart they actually are.

## What it does

- Shows the current Micras map as a 3D globe. It loads on its own, no upload needed.
- Measures distance. Click two points, get the answer in kilometers.
- Draws a latitude/longitude grid you can adjust.
- Re-projects the map into other styles (Mercator, Mollweide, and more) if you want a flat view.
- Has atmosphere, lighting, and tilt controls, plus screenshot and spinning-GIF export.

## How to use it

- Rotate: left-click and drag.
- Zoom: mouse wheel.
- Pan: right-click and drag.
- Measure: open **Options**, click **Measure distance**, then click two spots on the globe.
- Use a different map: open **Images** and upload any 2:1 (equirectangular) picture.

A note on the numbers: distances come out in kilometers, because Micras is about the size of Earth
(radius around 6,371 km). Short and medium distances are accurate. Very long ones, close to halfway
around the world, read a little low for now. That is a rough edge in the old distance math that a
later update can smooth out.

A note on the map: the default is a current no-border Micras map. The maps are made by the Micras
Cartography Society, and the newest ones live at [micras.org](https://micras.org/).

## Run it yourself

It is just static files. No server, no build step.

```bash
npx serve .
```

Open the link it prints. To put your own copy online, drop these files on any static host (GitHub
Pages, Netlify, whatever you like). Nothing else is needed.

## Credits

The globe itself, the measuring tool, the projections, the exports, and the shaders are all the work
of **MapToGlobe**. This project just wraps it for Micras.

- **MapToGlobe** by Kurt Peters (who made the original) and Tom Bowyer ([@Zeerg](https://github.com/Zeerg),
  who maintains it today). It is released under the [Mozilla Public License 2.0](https://choosealicense.com/licenses/mpl-2.0/).
  Current source: [github.com/Zeerg/MapToGlobe](https://github.com/Zeerg/MapToGlobe). Try the original at
  [maptoglobe.com](https://www.maptoglobe.com/).
- The glow and atmosphere shader is adapted from Lee Stemkoski's Three.js "Shader Glow Effect" example.
- The Micras map is made by the [Micras Cartography Society](https://micras.org/mwiki/Micras_Cartography_Society)
  and its mapmakers.

Built and hosted by Eddy ([@eddyplolz](https://github.com/eddyplolz)), with
[Claude](https://www.anthropic.com/claude) (Anthropic's Claude Code) helping put it together: pulling
the original source, adapting it for Micras, and setting up the static build and deployment.

The libraries it uses, each under its own open license: Three.js, jQuery, D3 (with d3-geo-projection),
gif.js, JSZip, Remodal, colpick, seedrandom, simplex-noise, async.js, and the Three.js OrbitControls,
ShaderTerrain, and Detector helpers.

## What is different here

Compared to the original MapToGlobe, this version:

1. Opens straight onto the Micras map and measures at Micras scale.
2. Drops everything that needed a server: the old save and share links, the imgur upload, and the
   analytics. So it runs as plain files with no backend and no tracking.
3. Fixes the file paths for static hosting and renames itself "Micras Globe."

Everything specific to Micras lives in one small file, `js/micras-defaults.js`. The rest of MapToGlobe
is left as it was.

## License and takedown

MapToGlobe is under the MPL-2.0 (see Credits), and this build follows the same terms. It is here for
the Micras community to use. If you are Kurt Peters or Tom Bowyer and want the credit changed, or this
copy taken down, just [open an issue](https://github.com/eddyplolz/micras-globe/issues) and it will be
sorted out quickly.
