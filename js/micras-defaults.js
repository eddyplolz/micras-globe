/* -------------------------------------------------------------------------
   Micras defaults — the only Micras-specific behavior layer.
   Kept OUT of the mirrored legacy source so the clone stays faithful and the
   customizations live in one auditable place.

   On page load it:
     1. Sets the Measure-distance radius to Micras's planetary radius.
        Micras is canonically "approximately the same size as Earth" (MCS), so
        6371 (km) makes the measure tool read in kilometres. The legacy
        calcDistance() reduces to ~= radius * central-angle for regional spans,
        so this is accurate for normal (regional/continental) measurements;
        only near-antipodal spans undercount (a chord approximation baked into
        the legacy formula — a Phase-4 calibration candidate, not a Phase-2 bug).
     2. Loads the current Micras world map as the default surface texture via the
        app's own fileSelect(), so the globe opens showing Micras with no upload.
   ------------------------------------------------------------------------- */
(function () {
  var MICRAS_RADIUS = 6371;           // km; Micras ~= Earth
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
