/* -------------------------------------------------------------------------
   Micras Globe — Measurement Pack.

   Enhancements layered on top of the legacy 2-click measure tool, kept OUT of
   the mirrored legacy source so the clone stays faithful. The legacy
   calcDistance() (globe-v-1.1.js) computes the great-circle distance in km and,
   if this module is present, hands it to updateMeasureReadout(km) below.

   Increment 1 (this file): dual-unit readout (km / mi / nm) + travel-time
   estimate. Later increments (lat/long, bearing, multi-segment paths, area)
   build on the same hook.
   ------------------------------------------------------------------------- */
(function () {
  var KM_TO_MI = 0.621371;
  var KM_TO_NM = 0.539957; // nautical miles

  // Travel presets — sustained cross-country speed in km/day. Editable in the UI.
  var TRAVEL_PRESETS = [
    { name: 'Marching army', kmday: 30 },
    { name: 'On horseback',  kmday: 60 },
    { name: 'Sailing ship',  kmday: 220 },   // ~5 knots, age of sail
    { name: 'Steamship',     kmday: 500 },
    { name: 'Railway',       kmday: 800 },
    { name: 'Automobile',    kmday: 900 },
    { name: 'Airliner',      kmday: 21600 }   // ~900 km/h
  ];

  var lastKm = null;

  function fmt(n, dp) {
    return (+n.toFixed(dp === undefined ? 0 : dp)).toLocaleString('en-US');
  }

  // Called by the legacy calcDistance() with the great-circle distance in km.
  function updateMeasureReadout(km) {
    lastKm = km;
    var el = document.getElementById('distance');
    if (el) {
      el.textContent = fmt(km) + ' km  ·  ' + fmt(km * KM_TO_MI) + ' mi  ·  ' +
                       fmt(km * KM_TO_NM) + ' nm';
    }
    updateTravel();
  }
  window.updateMeasureReadout = updateMeasureReadout;

  function formatDuration(days) {
    if (!isFinite(days) || days <= 0) return '—';
    if (days >= 14) return fmt(days / 7, 1) + ' weeks';
    if (days >= 1)  return fmt(days, 1) + ' days';
    return fmt(days * 24, 1) + ' hours';
  }

  function updateTravel() {
    var out = document.getElementById('travelTime');
    var speedField = document.getElementById('travelSpeed');
    if (!out || !speedField || lastKm == null) return;
    var kmday = parseFloat(speedField.value);
    out.textContent = (kmday > 0) ? formatDuration(lastKm / kmday) : '—';
  }

  function initUI() {
    var sel = document.getElementById('travelMode');
    var speedField = document.getElementById('travelSpeed');
    if (!sel || !speedField) return;
    TRAVEL_PRESETS.forEach(function (p, i) {
      var o = document.createElement('option');
      o.value = i;
      o.textContent = p.name;
      sel.appendChild(o);
    });
    sel.value = 0;
    speedField.value = TRAVEL_PRESETS[0].kmday;
    sel.addEventListener('change', function () {
      speedField.value = TRAVEL_PRESETS[+sel.value].kmday;
      updateTravel();
    });
    speedField.addEventListener('input', updateTravel);
  }

  if (document.readyState === 'complete') initUI();
  else window.addEventListener('load', initUI);
})();
