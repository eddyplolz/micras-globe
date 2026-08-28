/* Micras Globe view tools: manual-sun terminator and shareable camera view. */
(function () {
  'use strict';

  var TERMINATOR_RADIUS = 101;
  var TERMINATOR_SEGMENTS = 256;
  var terminatorLine = null;
  var terminatorEnabled = false;
  var initAttempts = 0;
  var sunWorld = null;
  var centerWorld = null;
  var localSun = null;
  var localCenter = null;
  var reference = null;
  var axisA = null;
  var axisB = null;
  var lastSunDirection = null;
  var hasLastSunDirection = false;

  function ready() {
    return typeof THREE !== 'undefined' &&
      typeof sphere !== 'undefined' && sphere &&
      typeof camera !== 'undefined' && camera &&
      typeof controls !== 'undefined' && controls &&
      typeof render === 'function';
  }

  function setStatus(message, isError) {
    var status = document.getElementById('shareViewStatus');
    if (!status) return;
    status.textContent = message;
    status.className = isError ? 'viewStatusError' : '';
  }

  function localSunDirection() {
    if (typeof atmosphereEnabled !== 'undefined' && atmosphereEnabled &&
        sphere.material.uniforms && sphere.material.uniforms.v3LightPosition) {
      var atmosphereLight = sphere.material.uniforms.v3LightPosition.value;
      localSun.set(
        Number(atmosphereLight.x),
        Number(atmosphereLight.y),
        Number(atmosphereLight.z)
      );
      return localSun.lengthSq() ? localSun.normalize() : null;
    }

    camera.updateMatrixWorld(true);
    lightCamera.updateMatrixWorld(true);
    sphere.updateMatrixWorld(true);

    sunWorld.setFromMatrixPosition(lightCamera.matrixWorld);
    centerWorld.setFromMatrixPosition(sphere.matrixWorld);
    localSun.copy(sunWorld);
    localCenter.copy(centerWorld);
    sphere.worldToLocal(localSun);
    sphere.worldToLocal(localCenter);
    localSun.sub(localCenter);
    return localSun.lengthSq() ? localSun.normalize() : null;
  }

  function ensureTerminator() {
    if (terminatorLine || !ready()) return;

    var geometry = new THREE.Geometry();
    for (var i = 0; i <= TERMINATOR_SEGMENTS; i++) {
      geometry.vertices.push(new THREE.Vector3());
    }
    var material = new THREE.LineBasicMaterial({
      color: 0xFFE082,
      transparent: true,
      opacity: 0.95,
      depthTest: true
    });
    terminatorLine = new THREE.Line(geometry, material);
    terminatorLine.name = 'micrasDayNightBoundary';
    terminatorLine.visible = terminatorEnabled;
    sphere.add(terminatorLine);

    sunWorld = new THREE.Vector3();
    centerWorld = new THREE.Vector3();
    localSun = new THREE.Vector3();
    localCenter = new THREE.Vector3();
    reference = new THREE.Vector3();
    axisA = new THREE.Vector3();
    axisB = new THREE.Vector3();
    lastSunDirection = new THREE.Vector3();
  }

  function updateTerminator() {
    if (!terminatorEnabled || !ready()) return;
    ensureTerminator();

    var normal = localSunDirection();
    if (!normal) {
      terminatorLine.visible = false;
      hasLastSunDirection = false;
      return;
    }

    if (hasLastSunDirection && lastSunDirection.distanceToSquared(normal) < 1e-20) {
      terminatorLine.visible = true;
      return;
    }
    lastSunDirection.copy(normal);
    hasLastSunDirection = true;

    if (Math.abs(normal.y) < 0.9) reference.set(0, 1, 0);
    else reference.set(1, 0, 0);
    axisA.crossVectors(normal, reference).normalize();
    axisB.crossVectors(normal, axisA).normalize();

    for (var i = 0; i <= TERMINATOR_SEGMENTS; i++) {
      var angle = (i / TERMINATOR_SEGMENTS) * Math.PI * 2;
      var cos = Math.cos(angle);
      var sin = Math.sin(angle);
      terminatorLine.geometry.vertices[i].set(
        axisA.x * cos + axisB.x * sin,
        axisA.y * cos + axisB.y * sin,
        axisA.z * cos + axisB.z * sin
      ).multiplyScalar(TERMINATOR_RADIUS);
    }
    terminatorLine.geometry.verticesNeedUpdate = true;
    terminatorLine.visible = true;
  }

  window.updateMicrasTerminator = updateTerminator;

  function setTerminator(enabled) {
    terminatorEnabled = enabled;
    ensureTerminator();
    if (terminatorLine) terminatorLine.visible = enabled;
    if (enabled) updateTerminator();
    render();
  }

  function viewPayload() {
    return [
      '1',
      String(camera.position.x), String(camera.position.y), String(camera.position.z),
      String(controls.target.x), String(controls.target.y), String(controls.target.z)
    ].join(',');
  }

  function parseViewPayload(payload) {
    var parts = payload.split(',');
    if (parts.length !== 7 || parts[0] !== '1') return null;

    var values = [];
    for (var i = 1; i < parts.length; i++) {
      var value = Number(parts[i]);
      if (!isFinite(value)) return null;
      values.push(value);
    }

    var dx = values[0] - values[3];
    var dy = values[1] - values[4];
    var dz = values[2] - values[5];
    var distanceSquared = dx * dx + dy * dy + dz * dz;
    var maxDistance = Number(controls.maxDistance);
    if (!isFinite(distanceSquared) || distanceSquared === 0 ||
        (isFinite(maxDistance) && distanceSquared > maxDistance * maxDistance)) {
      return null;
    }
    return values;
  }

  function payloadFromHash() {
    if (window.location.hash.indexOf('#view=') !== 0) return undefined;
    var encodedPayload = window.location.hash.substring(6);
    if (!encodedPayload || encodedPayload.indexOf('&') !== -1) return null;
    try {
      return decodeURIComponent(encodedPayload);
    } catch (error) {
      return null;
    }
  }

  function restoreSharedView() {
    if (!ready()) return false;
    var payload = payloadFromHash();
    if (payload === undefined) return false;

    var values = payload === null ? null : parseViewPayload(payload);
    if (!values) {
      setStatus('This view link is not valid.', true);
      return false;
    }

    camera.position.set(values[0], values[1], values[2]);
    controls.target.set(values[3], values[4], values[5]);
    controls.update();
    render();
    setStatus('Shared view restored.', false);
    return true;
  }

  function fallbackCopy(text) {
    var input = document.createElement('textarea');
    input.value = text;
    input.setAttribute('readonly', '');
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.appendChild(input);
    input.select();
    var copied = document.execCommand('copy');
    document.body.removeChild(input);
    return copied;
  }

  function copyCurrentView() {
    var payload = viewPayload();
    var hash = '#view=' + encodeURIComponent(payload);
    history.replaceState(null, document.title, window.location.pathname + window.location.search + hash);
    var url = window.location.href;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () {
        setStatus('View link copied.', false);
      }).catch(function () {
        setStatus(fallbackCopy(url) ? 'View link copied.' : 'View link is ready in the address bar.', false);
      });
    } else {
      setStatus(fallbackCopy(url) ? 'View link copied.' : 'View link is ready in the address bar.', false);
    }
  }

  function init() {
    if (!ready()) {
      initAttempts++;
      if (initAttempts < 200) { setTimeout(init, 50); return; }
      // Gave up after ~10 s: the globe never became ready, so the terminator and
      // any shared view link can't be applied. Warn instead of failing silently
      // (audit H6).
      if (window.console) console.warn('Micras Globe: view tools could not initialize (globe not ready after 10 s); terminator and shared view were not applied.');
      return;
    }

    var terminatorToggle = document.getElementById('showTerminator');
    var shareButton = document.getElementById('copyViewLink');
    if (terminatorToggle) {
      terminatorToggle.addEventListener('change', function () {
        setTerminator(this.checked);
      });
    }
    if (shareButton) shareButton.addEventListener('click', copyCurrentView);
    window.addEventListener('hashchange', restoreSharedView);
    restoreSharedView();
  }

  if (document.readyState === 'complete') init();
  else window.addEventListener('load', init);
})();
