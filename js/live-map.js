/* -------------------------------------------------------------------------
   Micras Globe — live MCS map fetch + auto-crop.

   The MCS Claims Map at https://micras.org/maps/claimsmap.png is regenerated
   whenever the political map changes, but it ships with a legend strip, a
   title bar, and a black frame around the world rectangle — none of which
   belong on the globe. This module pulls the live map on load, crops out the
   2:1 equirectangular world rectangle, and returns it as a same-origin data
   URL that the app's own fileSelect() can texture the globe with. So the tool
   auto-populates from every MCS update with no manual crop.

   Why it works without tainting the canvas: micras.org serves the map with
   `Access-Control-Allow-Origin: *`, so an Image loaded with
   crossOrigin='anonymous' can be drawn into a 2D canvas and read back
   (getImageData / toDataURL) cleanly. The cropped result is a data URL, i.e.
   same-origin, so the globe's own screenshot export (canvas.toDataURL) is
   never tainted.

   Anything that can go wrong here — micras.org down, the CORS header dropped,
   a frame layout we can't detect — is caught and reported to the callback so
   the caller can fall back to the bundled img/micras-map.png. The live map is
   an enhancement over a map that already works, never a hard dependency.
   ------------------------------------------------------------------------- */
(function () {
  'use strict';

  var CLAIMS_MAP_URL = 'https://micras.org/maps/claimsmap.png';

  // Ocean blue dominates the world rectangle and is absent from the grey legend
  // and dark frame/title bars, so it is the reliable landmark for the map bounds.
  function isOcean(r, g, b) {
    return b > 120 && b > r + 20 && b > g + 10;
  }

  // Find the world rectangle inside the raw claims map. Horizontal extent comes
  // from the ocean field (it reaches both side frames on the sampled rows); the
  // vertical extent is anchored at the ocean top and taken as width/2, because
  // the map is equirectangular 2:1. Deriving height from the 2:1 ratio — rather
  // than the ocean's bottom — is what keeps the crop correct even if the legend
  // strip below it grows or the image is regenerated at a different height.
  function detectCropBox(img) {
    var w = img.naturalWidth, h = img.naturalHeight;
    if (!w || !h) return null;

    var canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    var ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    var data = ctx.getImageData(0, 0, w, h).data;   // throws if the source tainted the canvas

    function oceanAt(x, y) {
      var i = (y * w + x) * 4;
      return isOcean(data[i], data[i + 1], data[i + 2]);
    }

    var lefts = [], rights = [], tops = [];
    var rowFracs = [0.1, 0.25, 0.5, 0.7, 0.8];
    var colFracs = [0.2, 0.4, 0.5, 0.6, 0.8];
    var x, y, f;

    for (f = 0; f < rowFracs.length; f++) {
      y = Math.floor(h * rowFracs[f]);
      for (x = 0; x < w; x++) { if (oceanAt(x, y)) { lefts.push(x); break; } }
      for (x = w - 1; x >= 0; x--) { if (oceanAt(x, y)) { rights.push(x); break; } }
    }
    for (f = 0; f < colFracs.length; f++) {
      x = Math.floor(w * colFracs[f]);
      for (y = 0; y < h; y++) { if (oceanAt(x, y)) { tops.push(y); break; } }
    }
    if (!lefts.length || !rights.length || !tops.length) return null;

    var left = Math.min.apply(null, lefts);
    var right = Math.max.apply(null, rights);
    var top = Math.min.apply(null, tops);
    var width = right - left + 1;
    var height = Math.round(width / 2);

    // Sanity: a real world rectangle is most of the image width, and the 2:1
    // box must fit inside the source. If not, we did not find the map — bail so
    // the caller keeps the bundled fallback rather than texturing garbage.
    if (width < w * 0.5 || left + width > w || top + height > h) return null;

    return { left: left, top: top, width: width, height: height };
  }

  function cropToDataUrl(img, box) {
    var canvas = document.createElement('canvas');
    canvas.width = box.width;
    canvas.height = box.height;
    canvas.getContext('2d').drawImage(
      img, box.left, box.top, box.width, box.height, 0, 0, box.width, box.height);
    return canvas.toDataURL('image/png');   // throws if tainted; data URL is same-origin
  }

  // fetchCropped(cb): cb(errorOrNull, dataUrlOrNull). Never throws to the caller.
  // A cache-buster forces a fresh copy each load so a new MCS map is picked up
  // immediately rather than served from the browser cache.
  function fetchCropped(cb) {
    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function () {
      try {
        var box = detectCropBox(img);
        if (!box) { cb('could not detect the map rectangle', null); return; }
        cb(null, cropToDataUrl(img, box));
      } catch (e) {
        // Most likely a tainted canvas (CORS header missing/changed) — surface it
        // so the caller falls back, and name the cause for the console.
        cb(e && e.message ? e.message : 'crop failed', null);
      }
    };
    img.onerror = function () { cb('could not load ' + CLAIMS_MAP_URL, null); };
    img.src = CLAIMS_MAP_URL + '?_=' + Date.now();
  }

  window.MicrasLiveMap = { url: CLAIMS_MAP_URL, fetchCropped: fetchCropped };
})();
