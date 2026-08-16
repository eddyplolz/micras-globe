/* -------------------------------------------------------------------------
   Micras defaults — the only Micras-specific behavior layer.
   Kept OUT of the mirrored legacy source so the clone stays faithful and the
   customizations live in one auditable place.

   On page load it:
     1. Sets the Measure-distance radius to Micras's planetary radius. The
        canonical figure is 6,875 km (MicrasWiki, "Micras" infobox: Radius (Km)
        6,875 — https://micras.org/mwiki/Micras), so 6875 makes the measure tool
        read in kilometres. calcDistance() now computes a true great-circle arc
        (radius * central angle), accurate at all ranges including near-antipodal
        (the legacy chord approximation was fixed in Phase 4). The Measurement
        Pack (js/measure.js) layers km/mi/nm and travel-time readouts on top.
     2. Loads the current Micras world map as the default surface texture via the
        app's own fileSelect(), so the globe opens showing Micras with no upload.
   ------------------------------------------------------------------------- */
(function () {
  var MICRAS_RADIUS = 6875;           // km; canonical Micras radius (MicrasWiki "Micras" infobox)
  var MICRAS_MAP = 'img/micras-map.png';

  function applyMicrasDefaults() {
    var radiusField = document.getElementById('radius');
    if (radiusField) radiusField.value = MICRAS_RADIUS;

    // The globe sphere and fileSelect() are created by the app's own
    // window.onload (init()). Poll briefly until they exist, then load the map
    // through the app's real surface loader so all side effects run.
    var tries = 0;
    (function loadDefaultSurface() {
      if (typeof sphere !== 'undefined' && sphere && typeof fileSelect === 'function') {
        fileSelect([{ id: 'surfaceFile', src: MICRAS_MAP }]);
      } else if (tries++ < 200) {
        setTimeout(loadDefaultSurface, 50);
      }
    })();
  }

  if (document.readyState === 'complete') {
    applyMicrasDefaults();
  } else {
    window.addEventListener('load', applyMicrasDefaults);
  }
})();
