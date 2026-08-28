/* -------------------------------------------------------------------------
   Micras Globe — Measurement Pack CORE (pure math).

   The vector-algebra and formatting core of the Measurement Pack, split out of
   measure.js so it can be pinned by a plain-Node assert suite (no browser, no
   THREE.js — every function here is pure). measure.js loads this file first
   (index.html) and wraps these functions with the DOM/THREE glue (reading the
   live radius field, converting plain vectors to THREE.Vector3, etc.).

   Design contract:
     * No DOM, no THREE, no globals. Planet radius is always an explicit
       argument, never read from the page here.
     * Vectors are plain {x, y, z} objects (or {lat, lon} for geographic pairs).
     * Exported as window.MeasureCore in the browser and module.exports in Node.

   Tested by tests/measure-core.test.js.
   ------------------------------------------------------------------------- */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MeasureCore = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var KM_TO_MI = 0.621371;
  var KM_TO_NM = 0.539957;   // nautical miles
  var KM2_TO_MI2 = 0.386102; // square miles per square km

  // --- Number formatting ------------------------------------------------------
  function fmt(n, dp) {
    return (+n.toFixed(dp === undefined ? 0 : dp)).toLocaleString('en-US');
  }

  function formatDuration(days) {
    if (!isFinite(days) || days <= 0) return '—';
    if (days >= 14) return fmt(days / 7, 1) + ' weeks';
    if (days >= 1)  return fmt(days, 1) + ' days';
    return fmt(days * 24, 1) + ' hours';
  }

  // --- Compass / bearing ------------------------------------------------------
  var COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
                 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  function compass(deg) {
    // Wrap into [0,16) so negative headings (e.g. a -45 deg wind) map correctly
    // instead of indexing COMPASS with a negative and returning undefined (M8).
    return COMPASS[((Math.round(deg / 22.5) % 16) + 16) % 16];
  }

  // Initial great-circle bearing A -> B, degrees clockwise from north. Uses only
  // latitude and the longitude DIFFERENCE, so it is independent of the arbitrary
  // prime-meridian anchor. a, b are {lat, lon} in degrees.
  function bearing(a, b) {
    var d = Math.PI / 180;
    var la1 = a.lat * d, la2 = b.lat * d, dLon = (b.lon - a.lon) * d;
    var y = Math.sin(dLon) * Math.cos(la2);
    var x = Math.cos(la1) * Math.sin(la2) - Math.sin(la1) * Math.cos(la2) * Math.cos(dLon);
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  }

  // --- Great-circle distance --------------------------------------------------
  // Arc length (km) between two world-space surface points p1, p2 (plain
  // {x,y,z}). arc = radiusKm * central angle, with the central angle recovered
  // from the chord: theta = 2*asin(chord / 2R), R = the points' own mean radius.
  function gcKm(p1, p2, radiusKm) {
    var chord = Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2) + Math.pow(p1.z - p2.z, 2));
    var rA = Math.sqrt(p1.x * p1.x + p1.y * p1.y + p1.z * p1.z);
    var rB = Math.sqrt(p2.x * p2.x + p2.y * p2.y + p2.z * p2.z);
    var R = (rA + rB) / 2 || 1;
    return radiusKm * 2 * Math.asin(Math.min(1, chord / (2 * R)));
  }

  // --- Spherical-polygon area -------------------------------------------------
  // Area (km^2) of a polygon given its vertices as {lat, lon} in degrees.
  // Independent of the longitude anchor (uses only longitude DIFFERENCES and
  // latitude). |sum| so winding order does not flip the sign.
  function sphericalAreaKm2(coords, radiusKm) {
    var d = Math.PI / 180;
    var sum = 0;
    for (var i = 0; i < coords.length; i++) {
      var a = coords[i], b = coords[(i + 1) % coords.length];
      var dLon = (b.lon - a.lon) * d;
      if (dLon > Math.PI) dLon -= 2 * Math.PI;
      if (dLon < -Math.PI) dLon += 2 * Math.PI;
      sum += dLon * (2 + Math.sin(a.lat * d) + Math.sin(b.lat * d));
    }
    return Math.abs(sum) * radiusKm * radiusKm / 2;
  }

  // --- Direct geodesic --------------------------------------------------------
  // The {lat, lon} reached from (lat, lon) on compass bearing brgDeg after
  // distKm along the surface (same bearing convention as bearing()).
  function destPoint(lat, lon, brgDeg, distKm, radiusKm) {
    var d = distKm / radiusKm;
    var la1 = lat * Math.PI / 180, lo1 = lon * Math.PI / 180, th = brgDeg * Math.PI / 180;
    var la2 = Math.asin(Math.min(1, Math.max(-1,
      Math.sin(la1) * Math.cos(d) + Math.cos(la1) * Math.sin(d) * Math.cos(th))));
    var lo2 = lo1 + Math.atan2(Math.sin(th) * Math.sin(d) * Math.cos(la1),
      Math.cos(d) - Math.sin(la1) * Math.sin(la2));
    return { lat: la2 * 180 / Math.PI, lon: lo2 * 180 / Math.PI };
  }

  // --- Nuclear fallout bands --------------------------------------------------
  // Illustrative parametric model (NOT a real fallout simulation): each band's
  // downwind length scales with sqrt(yield) and wind speed, its width with
  // sqrt(yield). Base figures are for ~1 Mt at 24 km/h wind.
  var FALLOUT_BANDS = [
    { label: 'Lethal dose',     L0: 22,  W0: 9,  color: 0xFF1744 },
    { label: 'Severe dose',     L0: 60,  W0: 22, color: 0xFFEA00 },
    { label: 'Detectable dose', L0: 170, W0: 45, color: 0x69F0AE }
  ];
  function falloutBands(kt, kmh) {
    var lenScale = Math.sqrt(kt / 1000) * (kmh / 24);
    var widScale = Math.sqrt(kt / 1000);
    return FALLOUT_BANDS.map(function (b) {
      return { label: b.label, color: b.color, km: b.L0 * lenScale, wideKm: b.W0 * widScale };
    });
  }

  // --- Nuclear blast rings ----------------------------------------------------
  // Overpressure radii use cube-root scaling anchored to the OTA "Effects of
  // Nuclear War" 1 Mt airburst table (Glasstone & Dolan): 20 psi ~ 1.5 mi
  // (2.4 km), 5 psi ~ 4.4 mi (7.1 km), 1 psi ~ 11.6 mi (18.7 km). Since
  // kt^(1/3) = 10 at 1 Mt, the per-kt coefficients are those figures / 10 (C1).
  // Fireball and thermal use their own exponents and match the references as-is.
  // Approximate, for worldbuilding scale — clearly labeled in the readout.
  function nukeRings(kt) {
    var cbrt = Math.pow(kt, 1 / 3);
    return [
      { km: 0.056 * Math.pow(kt, 0.40), color: 0xFFFFFF, label: 'Fireball' },
      { km: 0.24  * cbrt,               color: 0xFF7043, label: 'Severe blast ~20 psi' },
      { km: 0.71  * cbrt,               color: 0xFFB300, label: 'Moderate blast ~5 psi' },
      { km: 0.67  * Math.pow(kt, 0.41), color: 0xEF5350, label: 'Thermal, 3rd-degree burns' },
      { km: 1.87  * cbrt,               color: 0xFFD24A, label: 'Light blast ~1 psi' }
    ];
  }

  // --- Small-circle geometry (range rings) ------------------------------------
  // Plain-vector helpers replacing THREE for the pure math. A circle of ground
  // radius R about a center is the locus of unit points at central angle theta
  // from the center; build it from an orthonormal frame (C, U, V), C = the
  // center's unit vector. measure.js scales the returned unit vectors to the
  // render radius and wraps them in THREE.Vector3.
  function vlen(v) { return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z); }
  function vnorm(v) { var l = vlen(v) || 1; return { x: v.x / l, y: v.y / l, z: v.z / l }; }
  function vcross(a, b) {
    return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x };
  }

  function circleFrame(centerVec) {
    var C = vnorm(centerVec);
    var up = Math.abs(C.y) > 0.99 ? { x: 1, y: 0, z: 0 } : { x: 0, y: 1, z: 0 };
    var U = vnorm(vcross(C, up));
    var V = vnorm(vcross(C, U));
    return { C: C, U: U, V: V };
  }

  // Returns steps+1 UNIT points {x,y,z} around the small circle (caller scales to
  // the render radius). point(phi) = cos(theta)*C + sin(theta)*(cos(phi)*U + sin(phi)*V).
  function smallCircle(frame, thetaRad, steps) {
    var C = frame.C, U = frame.U, V = frame.V;
    var cosT = Math.cos(thetaRad), sinT = Math.sin(thetaRad);
    var pts = [];
    for (var i = 0; i <= steps; i++) {
      var phi = 2 * Math.PI * i / steps, w = Math.cos(phi), z = Math.sin(phi);
      pts.push({
        x: cosT * C.x + sinT * (w * U.x + z * V.x),
        y: cosT * C.y + sinT * (w * U.y + z * V.y),
        z: cosT * C.z + sinT * (w * U.z + z * V.z)
      });
    }
    return pts;
  }

  return {
    KM_TO_MI: KM_TO_MI,
    KM_TO_NM: KM_TO_NM,
    KM2_TO_MI2: KM2_TO_MI2,
    fmt: fmt,
    formatDuration: formatDuration,
    compass: compass,
    bearing: bearing,
    gcKm: gcKm,
    sphericalAreaKm2: sphericalAreaKm2,
    destPoint: destPoint,
    falloutBands: falloutBands,
    nukeRings: nukeRings,
    circleFrame: circleFrame,
    smallCircle: smallCircle
  };
});
