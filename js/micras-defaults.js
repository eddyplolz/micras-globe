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
        The bundled img/micras-map.png shows instantly; then the LIVE MCS map is
        fetched + auto-cropped (js/live-map.js) and swapped in, so the globe
        auto-populates from every MCS update. If the live fetch fails for any
        reason, the bundled map stays — it is a fallback, not a hard dependency.
   ------------------------------------------------------------------------- */
// Canonical Micras figures, published once so every layer reads the same numbers.
// Both have already drifted in shipped code — the radius once sat at Earth's 6,371 km
// and the rotational assist at Earth's 465 m/s — so derive from here, never re-type.
// Source: MicrasWiki "Micras" infobox — https://micras.org/mwiki/Micras
window.MicrasCanon = Object.freeze({
  radiusKm: 6875,
  solarDayHours: 24
});

(function () {
  var MICRAS_RADIUS = window.MicrasCanon.radiusKm;   // km
  var MICRAS_MAP = 'img/micras-map.png';

  // The globe sphere and fileSelect() are created by the app's own window.onload
  // (init()). Run cb once they exist; call onGiveUp after ~10 s if they never do.
  function whenGlobeReady(cb, onGiveUp) {
    var tries = 0;
    (function poll() {
      if (typeof sphere !== 'undefined' && sphere && typeof fileSelect === 'function') {
        cb();
      } else if (tries++ < 200) {
        setTimeout(poll, 50);
      } else if (onGiveUp) {
        onGiveUp();
      }
    })();
  }

  function applyMicrasDefaults() {
    var radiusField = document.getElementById('radius');
    if (radiusField) radiusField.value = MICRAS_RADIUS;

    // 1. Bundled map first — instant, and the fallback if the live fetch fails.
    //    Loaded through the app's real surface loader so all side effects run.
    whenGlobeReady(function () {
      fileSelect([{ id: 'surfaceFile', src: MICRAS_MAP }]);
    }, function () {
      // Gave up after ~10 s: the globe never initialized (e.g. init() threw), so
      // the default map was never loaded. Fail loud instead of leaving the user
      // staring at a silent LOADING spinner (audit H6).
      if (window.console) console.warn('Micras Globe: globe did not initialize within 10 s; the default map was not loaded.');
      var loadingMsg = document.getElementById('loading');
      if (loadingMsg) loadingMsg.innerHTML = 'The globe failed to start. Try reloading the page.';
    });

    // 2. Live MCS map — fetch + auto-crop in the background, then swap it in. The
    //    network fetch always finishes after the local bundled load above, so the
    //    live map ends up on top; on any failure the bundled map simply stays.
    if (window.MicrasLiveMap) {
      window.MicrasLiveMap.fetchCropped(function (err, dataUrl) {
        if (err || !dataUrl) {
          if (window.console) console.info('Micras Globe: using the bundled map (live MCS map unavailable: ' + err + ').');
          return;
        }
        whenGlobeReady(function () {
          fileSelect([{ id: 'surfaceFile', src: dataUrl }]);
          if (window.console) console.info('Micras Globe: loaded the live MCS map.');
        });
      });
    }
  }

  if (document.readyState === 'complete') {
    applyMicrasDefaults();
  } else {
    window.addEventListener('load', applyMicrasDefaults);
  }
})();
