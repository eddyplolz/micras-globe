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

  var KM2_TO_MI2 = 0.386102; // square miles per square km

  var lastKm = null;

  // Path / Area mode state (Distance mode keeps the legacy 2-click behavior).
  var mode = 'distance';        // 'distance' | 'path' | 'area'
  var pathPoints = [];          // world-space {x,y,z} clicked in path/area mode
  var pathLine = null;          // THREE.Line rendering the polyline/loop

  function fmt(n, dp) {
    return (+n.toFixed(dp === undefined ? 0 : dp)).toLocaleString('en-US');
  }

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

  // Initial great-circle bearing A -> B, in degrees clockwise from north. Uses
  // only latitude and the longitude DIFFERENCE, so it is independent of the
  // arbitrary prime-meridian anchor above.
  function bearing(a, b) {
    var d = Math.PI / 180;
    var la1 = a.lat * d, la2 = b.lat * d, dLon = (b.lon - a.lon) * d;
    var y = Math.sin(dLon) * Math.cos(la2);
    var x = Math.cos(la1) * Math.sin(la2) - Math.sin(la1) * Math.cos(la2) * Math.cos(dLon);
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  }

  var COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
                 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  function compass(deg) {
    return COMPASS[Math.round(deg / 22.5) % 16];
  }

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

  // --- Path & Area geometry ---------------------------------------------------
  // Great-circle length (km) between two world-space surface points, same math
  // as the legacy calcDistance(): arc = planetRadius * central angle from chord.
  function gcKm(p1, p2) {
    var radius = parseFloat(document.getElementById('radius').value);
    var chord = Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2) + Math.pow(p1.z - p2.z, 2));
    var rA = Math.sqrt(p1.x * p1.x + p1.y * p1.y + p1.z * p1.z);
    var rB = Math.sqrt(p2.x * p2.x + p2.y * p2.y + p2.z * p2.z);
    var R = (rA + rB) / 2 || 1;
    return radius * 2 * Math.asin(Math.min(1, chord / (2 * R)));
  }

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

  // Spherical-polygon area (km^2) from the vertices' lat/long. Independent of the
  // longitude anchor (uses only longitude DIFFERENCES and latitude).
  function sphericalAreaKm2(pts) {
    var radius = parseFloat(document.getElementById('radius').value);
    var d = Math.PI / 180;
    var c = [];
    for (var k = 0; k < pts.length; k++) c.push(geoCoords(pts[k]));
    var sum = 0;
    for (var i = 0; i < c.length; i++) {
      var a = c[i], b = c[(i + 1) % c.length];
      var dLon = (b.lon - a.lon) * d;
      if (dLon > Math.PI) dLon -= 2 * Math.PI;
      if (dLon < -Math.PI) dLon += 2 * Math.PI;
      sum += dLon * (2 + Math.sin(a.lat * d) + Math.sin(b.lat * d));
    }
    return Math.abs(sum) * radius * radius / 2;
  }

  // Click router — called first by the legacy placeDistancePoint(). Returns true
  // to consume the click (path/area modes), false to fall through to legacy
  // 2-point Distance behavior.
  function measurePackClick(event) {
    if (mode === 'distance') return false;
    var p = coordinates(event);
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
    if (typeof curvedLine !== 'undefined' && curvedLine) { scene.remove(curvedLine); render(); }
    if (typeof pointA !== 'undefined') pointA = [];
    if (typeof pointB !== 'undefined') pointB = [];
    toggle('coordBox', m === 'distance');
    toggle('travelBox', m !== 'area');
    toggle('pathControls', m !== 'distance');
    setText('coordA', '—'); setText('coordB', '—'); setText('bearing', '—');
    setText('travelTime', '—');
    setText('distance', m === 'distance' ? 'Click two spots on the globe' :
      m === 'path' ? 'Click points to trace a path' : 'Click at least 3 points to enclose an area');
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
  }

  if (document.readyState === 'complete') initUI();
  else window.addEventListener('load', initUI);
})();
