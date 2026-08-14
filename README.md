# Micras Globe

View the [Micras](https://micras.org/) world map as an interactive 3D globe, and measure distances
between any two points.

**Live:** https://eddyplolz.github.io/micras-globe/

## Use

- **Rotate:** left-click + drag · **Zoom:** mouse wheel · **Pan:** right-click + drag
- **Measure distance:** *Options → Measure distance*, then click two spots on the globe. Distances
  read in **kilometres** (Micras is ~Earth-sized). Regional/continental spans are accurate; very long
  (near-antipodal) spans currently undercount — a known limitation of the legacy distance formula.
- **Load a different map:** *Images* → upload your own equirectangular (2:1) surface image.

## About

This is a self-hosted, static build for Micras. It is based on the **legacy
[MapToGlobe](https://www.maptoglobe.com/)** (vanilla JS + jQuery + Three.js + D3) by its original
author — all credit for the globe engine, measurement, and projection tools is theirs. This build:

- preloads the current Micras world map as the default surface,
- sets the measure radius to Micras's (Earth-like) scale,
- removes the original's server-side save/share, imgur upload, and analytics so it runs as pure
  static files with no backend.

The default map is a no-border Micras map (an older revision; it will be updated). Micras cartography
is maintained by the [Micras Cartography Society](https://micras.org/mwiki/Micras_Cartography_Society).

## Credits & license

Globe engine, measurement, and projection code: the original MapToGlobe author. The legacy source
carried no explicit licence; this self-hosted adaptation is published with the owner's permission for
Micras community use. If you are the original author and would like attribution changed or the build
taken down, please open an issue.
