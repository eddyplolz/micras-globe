/* -------------------------------------------------------------------------
   Micras Globe — Measurement Pack.

   Enhancements layered on top of the legacy 2-click measure tool, kept OUT of
   the mirrored legacy source so the clone stays faithful. The legacy
   calcDistance() (globe-v-1.1.js) computes the great-circle distance in km and,
   if this module is present, hands it to updateMeasureReadout(km) below.

   Increment 1 (this file): dual-unit readout (km / mi / nm) + travel-time
   estimate. Later increments add lat/long, bearing, multi-segment paths, area,
   and a unified Range Rings mode (missile ranges, nuclear blast rings by yield,
   custom radius, and launch-site rotational assist) — all on the same hook.
   ------------------------------------------------------------------------- */
(function () {
  // Pure math + formatting live in measure-core.js (loaded first in index.html),
  // so the browser and the Node test suite share one implementation. This file
  // keeps only the DOM/THREE glue and delegates the algebra to MeasureCore.
  var MC = window.MeasureCore;

  var KM_TO_MI = MC.KM_TO_MI;
  var KM_TO_NM = MC.KM_TO_NM; // nautical miles

  // Travel presets — speed in km/day. Editable in the UI. Muscle-powered rows are
  // realistic daily campaign distances (a day's march or ride, with rest), so
  // "how long to cross X" reads in days. Every mechanical mode is a sustained
  // cruising speed (km/h x 24), so a short trip reads like a nonstop journey.
  var TRAVEL_PRESETS = [
    { name: 'Marching army',    kmday: 30 },      // ~30 km/day campaign pace
    { name: 'On horseback',     kmday: 60 },      // ~60 km/day campaign pace
    { name: 'Sailing ship',     kmday: 220 },     // ~5 knots, continuous
    { name: 'Steamship',        kmday: 500 },     // ~11 knots, continuous
    { name: 'Container ship',   kmday: 1050 },    // ~24 knots, continuous
    { name: 'Automobile',       kmday: 2160 },    // ~90 km/h
    { name: 'Railway',          kmday: 2400 },    // ~100 km/h
    { name: 'High-speed rail',  kmday: 7200 },    // ~300 km/h
    { name: 'Airliner',         kmday: 21600 },   // ~900 km/h
    { name: 'Supersonic jet',   kmday: 52000 },   // ~2,150 km/h (Mach 2)
    { name: 'Orbital (LEO)',    kmday: 674000 }   // ~7.8 km/s low-orbit ground track
  ];

  var KM2_TO_MI2 = MC.KM2_TO_MI2; // square miles per square km

  var lastKm = null;

  // Path / Area mode state (Distance mode keeps the legacy 2-click behavior).
  var mode = 'distance';        // 'distance' | 'path' | 'area' | 'rings'
  var pathPoints = [];          // world-space {x,y,z} clicked in path/area mode
  var pathLine = null;          // THREE.Line rendering the polyline/loop

  // Range Rings mode state.
  var ringCenter = null;        // world-space {x,y,z} of the last-clicked center
  var ringLines = [];           // THREE.Line objects for the drawn rings
  // Canon comes from micras-defaults.js, which loads first. The literal fallback only
  // covers that file being absent (e.g. a bare legacy build).
  var CANON = window.MicrasCanon || { radiusKm: 6875, solarDayHours: 24 };
  // Equatorial rotation speed = circumference / solar day. Derived, never typed, so it
  // cannot drift from the radius the way an inherited Earth constant did.
  var RING_V_EQ = 2 * Math.PI * CANON.radiusKm * 1000 / (CANON.solarDayHours * 3600);  // ~500 m/s
  var RING_PROMPT = 'Click a center point on the globe';

  function fmt(n, dp) { return MC.fmt(n, dp); }

  function setText(id, s) {
    var el = document.getElementById(id);
    if (el) el.textContent = s;
  }

  // --- Geographic coordinates -------------------------------------------------
  // Convert a world-space point on the globe to Micras lat/long. The picked point
  // is transformed into the sphere's LOCAL frame (undoing rotation/axial tilt),
  // where the geographic pole is the +Y axis (Three.js SphereGeometry) and 0°
  // longitude is anchored to +X = the horizontal center of the equirectangular
  // Micras map (a stated tool convention; E positive, W negative). Latitude is
  // absolute and reliable; longitude is measured E/W from map center.
  function geoCoords(p) {
    var v = new THREE.Vector3(p.x, p.y, p.z);
    sphere.updateMatrixWorld();
    sphere.worldToLocal(v);
    var r = v.length() || 1;
    var lat = Math.asin(Math.max(-1, Math.min(1, v.y / r))) * 180 / Math.PI;
    var lon = Math.atan2(-v.z, v.x) * 180 / Math.PI;
    return { lat: lat, lon: lon };
  }

  function formatCoord(c) {
    return Math.abs(c.lat).toFixed(1) + '°' + (c.lat >= 0 ? 'N' : 'S') + ', ' +
           Math.abs(c.lon).toFixed(1) + '°' + (c.lon >= 0 ? 'E' : 'W');
  }

  // Initial great-circle bearing A -> B (deg cw from north) and its 16-point
  // compass label; both in MeasureCore (independent of the prime-meridian anchor).
  function bearing(a, b) { return MC.bearing(a, b); }
  function compass(deg) { return MC.compass(deg); }

  // Called by the legacy calcDistance() with the great-circle distance in km.
  function updateMeasureReadout(km) {
    lastKm = km;
    setText('distance', fmt(km) + ' km  ·  ' + fmt(km * KM_TO_MI) + ' mi  ·  ' +
                        fmt(km * KM_TO_NM) + ' nm');
    if (typeof sphere !== 'undefined' && sphere &&
        pointA && ('x' in pointA) && pointB && ('x' in pointB)) {
      var ca = geoCoords(pointA), cb = geoCoords(pointB);
      setText('coordA', formatCoord(ca));
      setText('coordB', formatCoord(cb));
      var brg = bearing(ca, cb);
      setText('bearing', Math.round(brg) + '° ' + compass(brg));
    }
    updateTravel();
  }
  window.updateMeasureReadout = updateMeasureReadout;

  function formatDuration(days) { return MC.formatDuration(days); }

  function updateTravel() {
    var out = document.getElementById('travelTime');
    var speedField = document.getElementById('travelSpeed');
    if (!out || !speedField || lastKm == null) return;
    var kmday = parseFloat(speedField.value);
    out.textContent = (kmday > 0) ? formatDuration(lastKm / kmday) : '—';
  }

  // --- Path & Area geometry ---------------------------------------------------
  // Great-circle length (km) between two world-space surface points, using the
  // live radius field (MeasureCore.gcKm holds the arc-from-chord math).
  function gcKm(p1, p2) { return MC.gcKm(p1, p2, planetRadiusKm()); }

  // Points along the great circle between two surface points, lifted just above
  // the globe (radius 101) so the traced line hugs the surface at any length.
  function slerpArc(p1, p2, steps) {
    var v1 = new THREE.Vector3(p1.x, p1.y, p1.z).normalize();
    var v2 = new THREE.Vector3(p2.x, p2.y, p2.z).normalize();
    var omega = Math.acos(Math.max(-1, Math.min(1, v1.dot(v2))));
    var pts = [];
    if (omega < 1e-6) { pts.push(v1.multiplyScalar(101)); return pts; }
    var sinO = Math.sin(omega);
    for (var i = 0; i <= steps; i++) {
      var t = i / steps;
      var a = Math.sin((1 - t) * omega) / sinO, b = Math.sin(t * omega) / sinO;
      pts.push(new THREE.Vector3(a * v1.x + b * v2.x, a * v1.y + b * v2.y, a * v1.z + b * v2.z).multiplyScalar(101));
    }
    return pts;
  }

  // Spherical-polygon area (km^2) from world-space vertices: convert each to
  // lat/long here (needs the live sphere), then hand the geographic ring to
  // MeasureCore for the anchor-independent area sum.
  function sphericalAreaKm2(pts) {
    var coords = [];
    for (var k = 0; k < pts.length; k++) coords.push(geoCoords(pts[k]));
    return MC.sphericalAreaKm2(coords, planetRadiusKm());
  }

  // --- Range Rings ------------------------------------------------------------
  // A circle of ground radius R centered on a point is the locus of surface
  // points at central angle theta = R / planetRadius from the center. Build it
  // from an orthonormal frame (C, U, V) with C = the center's unit vector:
  //   point(phi) = cos(theta)*C + sin(theta)*(cos(phi)*U + sin(phi)*V)
  // which is a unit vector for every phi; lift to 101 so it hugs the surface.
  // The orthonormal frame depends only on the center, so it is built once per
  // center (circleFrame) and shared by all concentric rings. MeasureCore does the
  // vector algebra on plain {x,y,z}; here we bridge THREE and lift to the render
  // radius (101) so the ring hugs the globe surface.
  function circleFrame(centerVec) {
    return MC.circleFrame({ x: centerVec.x, y: centerVec.y, z: centerVec.z });
  }

  function smallCircle(frame, thetaRad, steps) {
    return MC.smallCircle(frame, thetaRad, steps).map(function (p) {
      return new THREE.Vector3(p.x, p.y, p.z).multiplyScalar(101);
    });
  }

  function planetRadiusKm() {
    var r = parseFloat(document.getElementById('radius').value);
    return (isFinite(r) && r > 0) ? r : CANON.radiusKm;
  }

  // --- Geodesic helpers (for the fallout plume) -------------------------------
  // Inverse of geoCoords: a lat/long back to a world-space surface point (lifted
  // to 101), through the sphere's current rotation/tilt.
  function latLonToWorld(lat, lon) {
    var la = lat * Math.PI / 180, lo = lon * Math.PI / 180;
    var v = new THREE.Vector3(Math.cos(la) * Math.cos(lo), Math.sin(la), -Math.cos(la) * Math.sin(lo));
    sphere.updateMatrixWorld();
    sphere.localToWorld(v);
    return v.normalize().multiplyScalar(101);
  }

  // Direct geodesic: the lat/long reached from (lat,lon) on compass bearing brgDeg
  // after distKm along the surface (uses the live radius; math in MeasureCore).
  function destPoint(lat, lon, brgDeg, distKm) {
    return MC.destPoint(lat, lon, brgDeg, distKm, planetRadiusKm());
  }

  // Nuclear fallout — a downwind contamination plume drawn as dose-rate contours.
  // The dose-band model (illustrative, NOT a simulation) lives in MeasureCore;
  // this dropdown maps a yield key to it.
  var FALLOUT_YIELDS = {
    fallout20:   { title: '20 kt fallout', kt: 20 },
    fallout1mt:  { title: '1 Mt fallout',  kt: 1000 },
    fallout50mt: { title: '50 Mt fallout', kt: 50000 }
  };
  function windDir()   { var v = parseFloat(document.getElementById('windDir').value);   return isFinite(v) ? v : 90; }
  function windSpeed() { var v = parseFloat(document.getElementById('windSpeed').value); return (isFinite(v) && v > 0) ? v : 24; }

  function falloutBands(kt, kmh) { return MC.falloutBands(kt, kmh); }

  // Teardrop outline (world-space points) for one dose band: pinched at ground
  // zero, widest about a third of the way downwind, tapering to a point at the end.
  function falloutPlume(gz, brgDeg, lengthKm, widthKm) {
    var STEPS = 40, right = [], left = [], i;
    for (i = 0; i <= STEPS; i++) {
      var t = i / STEPS;
      var cp = destPoint(gz.lat, gz.lon, brgDeg, t * lengthKm);
      var halfW = 0.5 * widthKm * Math.sin(Math.PI * Math.pow(t, 0.65));
      right.push(destPoint(cp.lat, cp.lon, brgDeg + 90, halfW));
      left.push(destPoint(cp.lat, cp.lon, brgDeg - 90, halfW));
    }
    var outline = [];
    for (i = 0; i < right.length; i++) outline.push(latLonToWorld(right[i].lat, right[i].lon));
    for (i = left.length - 1; i >= 0; i--) outline.push(latLonToWorld(left[i].lat, left[i].lon));
    outline.push(outline[0].clone()); // close the loop
    return outline;
  }

  // Missile presets — representative maximum ranges (single ring each).
  var RING_PRESETS = {
    srbm: { title: 'SRBM range',  rings: [{ km: 1000,  color: 0xFF10D0, label: 'SRBM ~1,000 km' }] },
    mrbm: { title: 'MRBM range',  rings: [{ km: 3000,  color: 0xFF10D0, label: 'MRBM ~3,000 km' }] },
    irbm: { title: 'IRBM range',  rings: [{ km: 5500,  color: 0xFF10D0, label: 'IRBM ~5,500 km' }] },
    icbm: { title: 'ICBM range',  rings: [{ km: 12000, color: 0xFF10D0, label: 'ICBM ~12,000 km' }] }
  };

  // Nuclear blast rings by yield (kt) — cube-root scaled, math in MeasureCore.
  function nukeRings(kt) { return MC.nukeRings(kt); }
  var NUKE_YIELDS = {
    nuke20:   { title: '20 kt airburst (fission)',      kt: 20 },
    nuke1mt:  { title: '1 Mt airburst (thermonuclear)', kt: 1000 },
    nuke50mt: { title: '50 Mt airburst (Tsar-class)',   kt: 50000 }
  };

  function selectedPreset() {
    var sel = document.getElementById('ringPreset');
    return sel ? sel.value : 'custom';
  }

  // Resolve the current dropdown selection to a { title, rings[], nuke?, launch? }.
  function ringSetFor(key) {
    if (key === 'custom') {
      var km = parseFloat(document.getElementById('ringRadius').value);
      return { title: 'Custom radius',
               rings: (isFinite(km) && km > 0) ? [{ km: km, color: 0xFFFF00, label: fmt(km) + ' km' }] : [] };
    }
    if (RING_PRESETS[key]) return RING_PRESETS[key];
    if (NUKE_YIELDS[key]) {
      var y = NUKE_YIELDS[key];
      var rings = nukeRings(y.kt).filter(function (r) { return r.km > 0; })
                    .sort(function (a, b) { return a.km - b.km; });
      return { title: y.title, rings: rings, nuke: true };
    }
    if (FALLOUT_YIELDS[key]) {
      var f = FALLOUT_YIELDS[key];
      var dir = windDir(), spd = windSpeed();
      return { title: f.title, fallout: true, kt: f.kt, windDir: dir, windSpeed: spd,
               bands: falloutBands(f.kt, spd) };
    }
    if (key === 'launch') return { title: 'Launch site', rings: [], launch: true };
    return { title: '', rings: [] };
  }

  function clearRings() {
    for (var i = 0; i < ringLines.length; i++) {
      scene.remove(ringLines[i]);
      if (ringLines[i].geometry) ringLines[i].geometry.dispose();
      if (ringLines[i].material) ringLines[i].material.dispose();
    }
    ringLines = [];
  }

  function drawRings(rings) {
    clearRings();
    if (!ringCenter) { render(); return; }
    var frame = circleFrame(new THREE.Vector3(ringCenter.x, ringCenter.y, ringCenter.z));
    var Rp = planetRadiusKm();
    for (var i = 0; i < rings.length; i++) {
      var theta = rings[i].km / Rp;         // central angle, radians
      if (!(theta > 0)) continue;
      if (theta > Math.PI) theta = Math.PI; // cap at the antipode
      var geom = new THREE.Geometry();
      geom.vertices = smallCircle(frame, theta, 96);
      var line = new THREE.Line(geom, new THREE.LineBasicMaterial({ color: rings[i].color, linewidth: 2 }));
      scene.add(line);
      ringLines.push(line);
    }
    render();
  }

  // Draw the fallout plume: one teardrop loop per dose band. Outer bands first so
  // the smaller, higher-dose bands render on top.
  function drawFalloutSet(set) {
    clearRings();
    if (!ringCenter) { render(); return; }
    var gz = geoCoords(ringCenter);
    for (var i = set.bands.length - 1; i >= 0; i--) {
      var b = set.bands[i];
      if (!(b.km > 0)) continue;
      var geom = new THREE.Geometry();
      geom.vertices = falloutPlume(gz, set.windDir, b.km, b.wideKm);
      var line = new THREE.Line(geom, new THREE.LineBasicMaterial({ color: b.color, linewidth: 2 }));
      scene.add(line);
      ringLines.push(line);
    }
    render();
  }

  function fmtRingKm(km) {
    if (km < 10) return km.toFixed(2) + ' km · ' + (km * KM_TO_MI).toFixed(2) + ' mi';
    return fmt(km) + ' km · ' + fmt(km * KM_TO_MI) + ' mi';
  }

  function swatch(color) {
    return '<span class="ringSwatch" style="background:#' +
           ('000000' + color.toString(16)).slice(-6) + '"></span>';
  }

  function renderRingReadout(set) {
    var info = document.getElementById('ringInfo');
    if (!ringCenter) {
      setText('distance', RING_PROMPT);
      if (info) info.innerHTML = '';
      return;
    }
    var c = geoCoords(ringCenter);
    setText('distance', set.title + '  ·  center ' + formatCoord(c));
    if (!info) return;
    var latRad = Math.abs(c.lat) * Math.PI / 180;
    var vAssist = RING_V_EQ * Math.cos(latRad);
    var html = '';
    if (set.launch) {
      html += '<div class="ringLaunch">Rotational assist at ' + Math.abs(c.lat).toFixed(1) + '°: ' +
              '<b>' + Math.round(vAssist) + ' m/s</b> eastward (' +
              Math.round(100 * Math.cos(latRad)) + '% of the equatorial maximum).<br>' +
              'Launch <b>east</b>, from a low latitude on an eastern coast, for the biggest boost to orbit.</div>';
    } else if (set.fallout) {
      html += '<div class="ringWind">Wind blowing toward ' + Math.round(set.windDir) + '° ' + compass(set.windDir) +
              ' at ' + fmt(set.windSpeed) + ' km/h — the plume drifts downwind of ground zero.</div>';
      for (var j = 0; j < set.bands.length; j++) {
        var bd = set.bands[j];
        html += '<div class="ringRow">' + swatch(bd.color) + bd.label + ' — ' +
                fmt(bd.km) + ' km downwind, ' + fmt(bd.wideKm) + ' km wide</div>';
      }
      html += '<div class="ringNote">Illustrative downwind footprint, not a fallout simulation. ' +
              'Set wind direction and speed above.</div>';
    } else {
      for (var i = 0; i < set.rings.length; i++) {
        var r = set.rings[i];
        html += '<div class="ringRow">' + swatch(r.color) + r.label + ' — ' + fmtRingKm(r.km) + '</div>';
      }
      if (set.nuke) html += '<div class="ringNote">Approximate airburst radii, cube-root scaled ' +
                            '(after Glasstone &amp; Dolan). For scale, not targeting.</div>';
    }
    info.innerHTML = html;
  }

  function updateRings() {
    if (mode !== 'rings') return;
    var set = ringSetFor(selectedPreset());
    if (set.fallout) drawFalloutSet(set);
    else drawRings(set.rings);
    renderRingReadout(set);
  }

  function resetRings() {
    clearRings();
    ringCenter = null;
    var info = document.getElementById('ringInfo');
    if (info) info.innerHTML = '';
  }

  // Click router — called first by the legacy placeDistancePoint(). Returns true
  // to consume the click (path/area/rings modes), false to fall through to legacy
  // 2-point Distance behavior.
  function measurePackClick(event) {
    if (mode === 'distance') return false;
    var p = coordinates(event);
    if (mode === 'rings') {
      if (p) { ringCenter = { x: p[0], y: p[1], z: p[2] }; updateRings(); }
      return true;
    }
    if (p) {
      pathPoints.push({ x: p[0], y: p[1], z: p[2] });
      redrawPath();
      updatePathReadout();
    }
    return true;
  }
  window.measurePackClick = measurePackClick;

  function redrawPath() {
    if (pathLine) { scene.remove(pathLine); pathLine = null; }
    if (pathPoints.length >= 2) {
      var n = pathPoints.length;
      var loop = (mode === 'area');
      var segs = loop ? n : n - 1;
      var verts = [];
      for (var i = 0; i < segs; i++) {
        var seg = slerpArc(pathPoints[i], pathPoints[(i + 1) % n], 24);
        if (i > 0) seg.shift(); // drop duplicate join vertex
        verts = verts.concat(seg);
      }
      var geom = new THREE.Geometry();
      geom.vertices = verts;
      pathLine = new THREE.Line(geom, new THREE.LineBasicMaterial({ color: 0xFFFF00 }));
      scene.add(pathLine);
    }
    render();
  }

  function updatePathReadout() {
    var n = pathPoints.length;
    var perim = 0, i;
    for (i = 0; i < n - 1; i++) perim += gcKm(pathPoints[i], pathPoints[i + 1]);
    if (mode === 'path') {
      lastKm = perim;
      setText('distance', n < 2 ? 'Click points to trace a path' :
        'Path: ' + fmt(perim) + ' km · ' + fmt(perim * KM_TO_MI) + ' mi · ' +
        fmt(perim * KM_TO_NM) + ' nm  (' + n + ' pts)');
      updateTravel();
    } else if (mode === 'area') {
      var closeLeg = (n > 2) ? gcKm(pathPoints[n - 1], pathPoints[0]) : 0;
      lastKm = perim + closeLeg;
      var areaKm2 = (n >= 3) ? sphericalAreaKm2(pathPoints) : 0;
      setText('distance', n < 3 ? 'Click at least 3 points to enclose an area' :
        'Area: ' + fmt(areaKm2) + ' km² · ' + fmt(areaKm2 * KM2_TO_MI2) + ' mi²' +
        '  |  perimeter ' + fmt(lastKm) + ' km');
    }
  }

  function clearPath() {
    pathPoints = [];
    if (pathLine) { scene.remove(pathLine); pathLine = null; render(); }
    lastKm = null;
  }

  function setMode(m) {
    mode = m;
    clearPath();
    resetRings();
    if (typeof curvedLine !== 'undefined' && curvedLine) { scene.remove(curvedLine); render(); }
    if (typeof pointA !== 'undefined') pointA = [];
    if (typeof pointB !== 'undefined') pointB = [];
    toggle('coordBox', m === 'distance');
    toggle('travelBox', m === 'distance' || m === 'path');
    toggle('pathControls', m === 'path' || m === 'area');
    toggle('ringControls', m === 'rings');
    toggle('ringInfo', m === 'rings');
    setText('coordA', '—'); setText('coordB', '—'); setText('bearing', '—');
    setText('travelTime', '—');
    setText('distance',
      m === 'distance' ? 'Click two spots on the globe' :
      m === 'path'     ? 'Click points to trace a path' :
      m === 'area'     ? 'Click at least 3 points to enclose an area' :
                         RING_PROMPT);
  }

  function toggle(id, show) {
    var el = document.getElementById(id);
    if (el) el.style.display = show ? '' : 'none';
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

    // Mode radios (Distance / Path / Area) + path controls.
    var radios = document.querySelectorAll('input[name="measureMode"]');
    for (var i = 0; i < radios.length; i++) {
      radios[i].addEventListener('change', function () {
        if (this.checked) setMode(this.value);
      });
    }
    var undo = document.getElementById('measureUndo');
    var clr = document.getElementById('measureClear');
    if (undo) undo.addEventListener('click', function () {
      pathPoints.pop(); redrawPath(); updatePathReadout();
    });
    if (clr) clr.addEventListener('click', function () {
      clearPath();
      setText('distance', mode === 'path' ? 'Click points to trace a path' : 'Click at least 3 points to enclose an area');
    });

    // Range Rings controls: preset dropdown, custom-radius field, wind controls, clear.
    var ringPreset = document.getElementById('ringPreset');
    var ringRadius = document.getElementById('ringRadius');
    var ringClear = document.getElementById('ringClear');
    var windDirField = document.getElementById('windDir');
    var windSpeedField = document.getElementById('windSpeed');
    function updateRingControlsVisibility() {
      var k = selectedPreset();
      toggle('ringCustomWrap', k === 'custom');
      toggle('windControls', k in FALLOUT_YIELDS);
    }
    if (ringPreset) ringPreset.addEventListener('change', function () {
      updateRingControlsVisibility();
      updateRings();
    });
    if (ringRadius) ringRadius.addEventListener('input', updateRings);
    if (windDirField) windDirField.addEventListener('input', updateRings);
    if (windSpeedField) windSpeedField.addEventListener('input', updateRings);
    if (ringClear) ringClear.addEventListener('click', function () {
      resetRings();
      updateRings();
    });
    updateRingControlsVisibility();
  }

  if (document.readyState === 'complete') initUI();
  else window.addEventListener('load', initUI);
})();
