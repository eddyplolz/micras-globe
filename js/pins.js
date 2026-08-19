/* -------------------------------------------------------------------------
   Micras Globe — Named Pins.

   A worldbuilder annotation layer: click the globe to drop a labeled pin
   (a capital, a landmark, an event site). Pins are stored by geographic
   lat/long (the invariant as the globe rotates), rendered as a marker dot
   plus a floating label sprite parented to the globe sphere (so they turn
   with it, exactly like the day/night terminator in view-tools.js), and
   persisted to localStorage so they reload on the next visit.

   Kept OUT of the mirrored legacy source, like measure.js / view-tools.js /
   micras-defaults.js, so the clone stays faithful and the customizations live
   in one auditable place. The only legacy touch-point is a single gated call
   in OrbitControls' mouse-up (window.pinModeClick), which no-ops unless pin
   placement is armed.
   ------------------------------------------------------------------------- */
(function () {
  'use strict';

  var STORAGE_KEY = 'micrasGlobePins.v1'; // gitleaks:allow — localStorage key name, not a secret
  var MARKER_RADIUS = 101;   // just outside the globe surface (radius 100)
  var LABEL_RADIUS = 106;    // floats the label above the marker dot
  var LABEL_HEIGHT = 9;      // label world height; camera is far (z=3000, 5deg FOV)

  // High-contrast-on-blue-ocean palette (the ring-visibility lesson: light blue
  // vanishes on the water map). New pins cycle through these; a list swatch click
  // advances to the next color.
  var PALETTE = ['#FF10D0', '#FFD24A', '#69F0AE', '#FF7043',
                 '#FFFFFF', '#B388FF', '#FFEA00', '#FF5252'];

  var pins = [];             // [{ id, name, lat, lon, color }]
  var objects = {};          // id -> { marker, label } (transient, not persisted)
  var placing = false;       // placement mode armed?
  var idCounter = 0;
  var initAttempts = 0;

  function ready() {
    return typeof THREE !== 'undefined' &&
      typeof sphere !== 'undefined' && sphere &&
      typeof scene !== 'undefined' && scene &&
      typeof render === 'function';
  }

  function newId() {
    return 'p' + Date.now().toString(36) + (idCounter++).toString(36);
  }

  // --- Persistence ------------------------------------------------------------
  function load() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var data = JSON.parse(raw);
      if (data && data.pins && data.pins.length) {
        pins = data.pins.filter(function (p) {
          return p && isFinite(p.lat) && isFinite(p.lon);
        }).map(function (p) {
          return { id: p.id || newId(), name: String(p.name || ''),
                   lat: +p.lat, lon: +p.lon, color: p.color || PALETTE[0] };
        });
      }
    } catch (e) { /* corrupt or storage disabled — start empty */ }
  }

  function save() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: 1, pins: pins }));
    } catch (e) { /* storage full or disabled — pins stay for this session only */ }
  }

  // --- Coordinates ------------------------------------------------------------
  // World-space picked point -> Micras lat/long, matching measure.js's geoCoords
  // convention (sphere-local frame: +Y = geographic pole, +X = map center = 0 lon,
  // E positive). Stored as geography so pins stay put when the globe is rotated.
  function worldToGeo(point) {
    var v = new THREE.Vector3(point[0], point[1], point[2]);
    sphere.updateMatrixWorld();
    sphere.worldToLocal(v);
    var r = v.length() || 1;
    var lat = Math.asin(Math.max(-1, Math.min(1, v.y / r))) * 180 / Math.PI;
    var lon = Math.atan2(-v.z, v.x) * 180 / Math.PI;
    return { lat: lat, lon: lon };
  }

  // Inverse: lat/long -> a unit vector in the sphere's LOCAL frame. Objects are
  // parented to the sphere, so local coordinates (not world) are correct here.
  function latLonToLocalUnit(lat, lon) {
    var la = lat * Math.PI / 180, lo = lon * Math.PI / 180;
    return new THREE.Vector3(
      Math.cos(la) * Math.cos(lo),
      Math.sin(la),
      -Math.cos(la) * Math.sin(lo)
    ).normalize();
  }

  // --- Label sprite -----------------------------------------------------------
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // A canvas-textured sprite: white text in a translucent pill outlined in the
  // pin color, legible over any map color. Sprites always face the camera.
  function makeLabelSprite(text, colorHex) {
    var FS = 48, padX = 18, padY = 12;
    var font = '700 ' + FS + 'px "Open Sans", Arial, sans-serif';
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    ctx.font = font;
    var label = text || '(unnamed)';
    var w = Math.ceil(ctx.measureText(label).width) + padX * 2;
    var h = FS + padY * 2;
    canvas.width = w;
    canvas.height = h;

    ctx = canvas.getContext('2d');  // re-fetch: resizing the canvas resets state
    ctx.font = font;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(15, 20, 30, 0.72)';
    roundRect(ctx, 1, 1, w - 2, h - 2, 14);
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = colorHex;
    roundRect(ctx, 1.5, 1.5, w - 3, h - 3, 13);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(label, padX, h / 2 + 1);

    var tex = new THREE.Texture(canvas);
    // The canvas is non-power-of-two; without LinearFilter + ClampToEdge it
    // renders black in WebGL.
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.needsUpdate = true;

    var mat = new THREE.SpriteMaterial({ map: tex });
    mat.depthTest = true;   // occluded by the globe when the pin is on the far side
    var sprite = new THREE.Sprite(mat);
    sprite.scale.set(LABEL_HEIGHT * (w / h), LABEL_HEIGHT, 1);
    return sprite;
  }

  // --- 3D objects -------------------------------------------------------------
  var markerGeom = null;   // shared across markers; created once, never disposed
  function markerGeometry() {
    if (!markerGeom) markerGeom = new THREE.SphereGeometry(1.3, 12, 12);
    return markerGeom;
  }

  function colorInt(hex) {
    return parseInt(hex.replace('#', ''), 16);
  }

  function buildObjects(pin) {
    var dir = latLonToLocalUnit(pin.lat, pin.lon);
    var marker = new THREE.Mesh(markerGeometry(),
      new THREE.MeshBasicMaterial({ color: colorInt(pin.color) }));
    marker.position.copy(dir).multiplyScalar(MARKER_RADIUS);
    sphere.add(marker);

    var label = makeLabelSprite(pin.name, pin.color);
    label.position.copy(dir).multiplyScalar(LABEL_RADIUS);
    sphere.add(label);

    objects[pin.id] = { marker: marker, label: label };
  }

  function disposeObjects(id) {
    var o = objects[id];
    if (!o) return;
    if (o.marker) {
      sphere.remove(o.marker);
      if (o.marker.material) o.marker.material.dispose();
    }
    if (o.label) {
      sphere.remove(o.label);
      if (o.label.material) {
        if (o.label.material.map) o.label.material.map.dispose();
        o.label.material.dispose();
      }
    }
    delete objects[id];
  }

  function renderGlobe() {
    for (var id in objects) if (objects.hasOwnProperty(id)) disposeObjects(id);
    for (var i = 0; i < pins.length; i++) buildObjects(pins[i]);
    render();
  }

  // --- Side-panel list --------------------------------------------------------
  function setStatus(message) {
    var el = document.getElementById('pinStatus');
    if (el) el.textContent = message || '';
  }

  function renderList() {
    var list = document.getElementById('pinsList');
    if (!list) return;
    list.innerHTML = '';
    if (!pins.length) {
      var empty = document.createElement('p');
      empty.className = 'pinEmpty';
      empty.textContent = 'No pins yet. Click "Add pin", then click the globe.';
      list.appendChild(empty);
      return;
    }
    pins.forEach(function (pin) {
      var row = document.createElement('div');
      row.className = 'pinRow';

      var swatch = document.createElement('button');
      swatch.type = 'button';
      swatch.className = 'pinSwatch';
      swatch.style.background = pin.color;
      swatch.title = 'Change color';
      swatch.setAttribute('aria-label', 'Change color');
      swatch.addEventListener('click', function () { cycleColor(pin.id); });

      var name = document.createElement('input');
      name.type = 'text';
      name.className = 'pinName';
      name.value = pin.name;
      name.placeholder = 'Name this pin';
      name.addEventListener('change', function () { renamePin(pin.id, this.value); });

      var del = document.createElement('button');
      del.type = 'button';
      del.className = 'pinDelete';
      del.textContent = '×';
      del.title = 'Delete pin';
      del.setAttribute('aria-label', 'Delete pin');
      del.addEventListener('click', function () { deletePin(pin.id); });

      row.appendChild(swatch);
      row.appendChild(name);
      row.appendChild(del);
      list.appendChild(row);
    });
  }

  // --- Mutations --------------------------------------------------------------
  function addPinAt(lat, lon) {
    var pin = { id: newId(), name: 'Pin ' + (pins.length + 1),
                lat: lat, lon: lon, color: PALETTE[pins.length % PALETTE.length] };
    pins.push(pin);
    save();
    renderGlobe();
    renderList();
    setStatus('Pin added. Click the globe for another, or press Done.');
  }

  function renamePin(id, value) {
    var pin = find(id);
    if (!pin) return;
    pin.name = String(value);
    save();
    renderGlobe();
  }

  function cycleColor(id) {
    var pin = find(id);
    if (!pin) return;
    var i = PALETTE.indexOf(pin.color);
    pin.color = PALETTE[(i + 1) % PALETTE.length];
    save();
    renderGlobe();
    renderList();
  }

  function deletePin(id) {
    pins = pins.filter(function (p) { return p.id !== id; });
    save();
    renderGlobe();   // disposes every object (the removed one included) and rebuilds from pins
    renderList();
  }

  function clearAll() {
    if (!pins.length) return;
    if (!window.confirm('Delete all ' + pins.length + ' pins? This cannot be undone.')) return;
    pins = [];
    renderGlobe();
    save();
    renderList();
    setStatus('All pins cleared.');
  }

  function find(id) {
    for (var i = 0; i < pins.length; i++) if (pins[i].id === id) return pins[i];
    return null;
  }

  // --- Placement mode ---------------------------------------------------------
  function setPlacing(on) {
    placing = on;
    var btn = document.getElementById('addPin');
    if (btn) {
      btn.textContent = on ? 'Done adding' : 'Add pin';
      btn.classList.toggle('pinAdding', on);
    }
    setStatus(on ? 'Click the globe to drop a pin.' : '');
    document.body.classList.toggle('pinPlacing', on);
  }

  // Called by OrbitControls' mouse-up (a non-drag click). No-ops unless armed, so
  // ordinary clicks and rotation are untouched when pin placement is off.
  function pinModeClick(event) {
    if (!placing) return false;
    if (typeof coordinates !== 'function') return false;
    var point = coordinates(event);   // legacy raycaster -> [x, y, z] or undefined
    if (!point) return false;
    var geo = worldToGeo(point);
    addPinAt(geo.lat, geo.lon);
    return true;
  }
  window.pinModeClick = pinModeClick;

  // --- Init -------------------------------------------------------------------
  function initUI() {
    var addBtn = document.getElementById('addPin');
    var clearBtn = document.getElementById('pinsClear');
    if (addBtn) addBtn.addEventListener('click', function () { setPlacing(!placing); });
    if (clearBtn) clearBtn.addEventListener('click', clearAll);
    renderList();
  }

  function init() {
    if (!ready()) {
      if (initAttempts++ < 200) setTimeout(init, 50);
      return;
    }
    load();
    renderGlobe();
    initUI();
  }

  if (document.readyState === 'complete') init();
  else window.addEventListener('load', init);
})();
