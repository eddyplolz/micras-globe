/* -------------------------------------------------------------------------
   Micras Globe — measure-core known-answer suite (plain Node, no deps).

   Run from the site/ root:  node tests/measure-core.test.js

   Every expected value here is an INDEPENDENT literal or a closed-form oracle
   derived differently from the code under test — never a re-run of the same
   expression. These pin the coordinate/geometry math and would have caught the
   C1 blast-ring and M8 compass bugs (and both historical radius bugs).
   ------------------------------------------------------------------------- */
'use strict';
var assert = require('assert');
var MC = require('../js/measure-core.js');

var R = 6875; // Micras canonical radius (km), settled 2026-08-16.
var passed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ok   ' + name); }
  catch (e) { console.error('  FAIL ' + name + '\n         ' + e.message); process.exitCode = 1; }
}
function near(actual, expected, tol, msg) {
  assert.ok(Math.abs(actual - expected) <= tol,
    (msg || '') + ' expected ' + expected + ' ± ' + tol + ', got ' + actual);
}

console.log('measure-core known-answer suite\n');

// --- gcKm: antipode = pi * R ------------------------------------------------
// Two points 180° apart on the render sphere span half the great circle, so the
// arc must be exactly pi * planetRadius, independent of the sphere's own radius.
test('gcKm antipode = pi*R', function () {
  var d = MC.gcKm({ x: 100, y: 0, z: 0 }, { x: -100, y: 0, z: 0 }, R);
  near(d, Math.PI * R, 1e-6, 'antipodal arc');
});
test('gcKm same point = 0', function () {
  var d = MC.gcKm({ x: 100, y: 0, z: 0 }, { x: 100, y: 0, z: 0 }, R);
  near(d, 0, 1e-9, 'zero distance');
});
test('gcKm quarter arc = pi*R/2', function () {
  // (100,0,0) and (0,100,0) are 90° apart -> quarter of the great circle.
  var d = MC.gcKm({ x: 100, y: 0, z: 0 }, { x: 0, y: 100, z: 0 }, R);
  near(d, Math.PI * R / 2, 1e-6, 'quarter arc');
});

// --- sphericalAreaKm2: meridian/parallel rectangle --------------------------
// Oracle: for a rectangle bounded by two meridians and two parallels, the exact
// area is R^2 * dLon(rad) * |sin(lat2) - sin(lat1)| — a closed form derived
// independently of the polygon edge-sum the code uses.
test('sphericalAreaKm2 rectangle vs closed form', function () {
  var rect = [
    { lat: 0,  lon: 0  },
    { lat: 0,  lon: 90 },
    { lat: 30, lon: 90 },
    { lat: 30, lon: 0  }
  ];
  var area = MC.sphericalAreaKm2(rect, R);
  var oracle = R * R * (Math.PI / 2) * Math.abs(Math.sin(30 * Math.PI / 180) - Math.sin(0));
  near(area, oracle, 1e-3, 'area vs oracle');
  // Independent literal sanity: pi*R^2/4 = pi*47,265,625/4.
  near(area, 37122335, 5, 'area literal');
});

// --- destPoint: quarter-circle due east from the origin ---------------------
test('destPoint 90deg quarter-arc lands at (0, 90)', function () {
  var p = MC.destPoint(0, 0, 90, Math.PI * R / 2, R);
  near(p.lat, 0, 1e-9, 'dest lat');
  near(p.lon, 90, 1e-9, 'dest lon');
});

// --- bearing ----------------------------------------------------------------
test('bearing due east on equator = 90', function () {
  near(MC.bearing({ lat: 0, lon: 0 }, { lat: 0, lon: 10 }), 90, 1e-9, 'east bearing');
});
test('bearing due north = 0', function () {
  near(MC.bearing({ lat: 0, lon: 0 }, { lat: 10, lon: 0 }), 0, 1e-9, 'north bearing');
});

// --- compass (M8: negative headings must wrap, not return undefined) --------
test('compass(-45) = NW', function () {
  assert.strictEqual(MC.compass(-45), 'NW'); // -45 deg == 315 deg == NW
});
test('compass cardinal points', function () {
  assert.strictEqual(MC.compass(0), 'N');
  assert.strictEqual(MC.compass(90), 'E');
  assert.strictEqual(MC.compass(180), 'S');
  assert.strictEqual(MC.compass(270), 'W');
  assert.strictEqual(MC.compass(360), 'N');
  assert.strictEqual(MC.compass(-90), 'W');  // -90 == 270 == W
});

// --- nukeRings: OTA 1 Mt airburst anchors (C1) ------------------------------
// OTA "Effects of Nuclear War" 1 Mt airburst: 20 psi ~ 1.5 mi (2.4 km),
// 5 psi ~ 4.4 mi (7.1 km), 1 psi ~ 11.6 mi (18.7 km). cube-root scaled, so the
// per-kt coefficients are those /10 (kt^(1/3) = 10 at 1 Mt).
test('nukeRings 1 Mt overpressure anchors (OTA)', function () {
  var rings = MC.nukeRings(1000);
  function ringKm(needle) {
    var m = rings.filter(function (r) { return r.label.indexOf(needle) !== -1; });
    assert.strictEqual(m.length, 1, 'one ring labeled ' + needle);
    return m[0].km;
  }
  near(ringKm('20 psi'), 2.4,  0.05, '20 psi @ 1 Mt');
  near(ringKm('5 psi'),  7.1,  0.05, '5 psi @ 1 Mt');
  near(ringKm('1 psi'),  18.7, 0.05, '1 psi @ 1 Mt');
  // Fireball and thermal are unchanged by C1 — pin them so a future edit can't drift them.
  near(ringKm('Fireball'), 0.8875, 0.001, 'fireball @ 1 Mt');   // 0.056 * 1000^0.40
  near(ringKm('Thermal'),  11.378, 0.01,  'thermal @ 1 Mt');    // 0.67 * 1000^0.41
});
test('nukeRings scale by cube root (8x yield -> 2x overpressure radius)', function () {
  var a = MC.nukeRings(1000), b = MC.nukeRings(8000);
  function km(rings, needle) { return rings.filter(function (r) { return r.label.indexOf(needle) !== -1; })[0].km; }
  near(km(b, '5 psi') / km(a, '5 psi'), 2, 1e-9, 'cube-root doubling');
});

// --- falloutBands -----------------------------------------------------------
test('falloutBands 1 Mt @ 24 km/h = base figures', function () {
  var bands = MC.falloutBands(1000, 24); // lenScale = widScale = 1
  near(bands[0].km, 22, 1e-9); near(bands[0].wideKm, 9, 1e-9);
  near(bands[1].km, 60, 1e-9); near(bands[2].km, 170, 1e-9);
});

// --- formatDuration ---------------------------------------------------------
test('formatDuration buckets', function () {
  assert.strictEqual(MC.formatDuration(0), '—');
  assert.strictEqual(MC.formatDuration(0.5), '12 hours');
  assert.strictEqual(MC.formatDuration(2.5), '2.5 days');
  assert.strictEqual(MC.formatDuration(21), '3 weeks');
});

// --- smallCircle: returns unit vectors, collapses to center as theta -> 0 ----
test('smallCircle points are unit vectors', function () {
  var frame = MC.circleFrame({ x: 1, y: 0, z: 0 });
  var pts = MC.smallCircle(frame, 0.3, 12);
  assert.strictEqual(pts.length, 13);
  pts.forEach(function (p) {
    near(Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z), 1, 1e-9, 'unit length');
  });
});
test('smallCircle collapses toward center as theta -> 0', function () {
  var frame = MC.circleFrame({ x: 0, y: 0, z: 1 });
  var pts = MC.smallCircle(frame, 1e-4, 8);
  pts.forEach(function (p) { near(p.z, 1, 1e-6, 'near +Z center'); });
});

console.log('\n' + passed + ' passed' + (process.exitCode ? ', with failures above' : ', all green'));
