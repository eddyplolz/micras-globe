// Canvas-support module — retained remnant of the former Sketch View.
//
// The interactive 2D drawing mode (pen/line/bucket/eraser tools, undo stack, sketch
// export) was removed for the Micras Globe build. What is kept here is the offscreen-
// canvas plumbing that the REST of the frozen legacy app still depends on:
//   - flatInit()      sizes the hidden #flatCanvas / #gridCanvas / #imgCanvas and builds
//                     the temporary compositing canvas, then runs once on page load.
//   - canvasToImage() composites the canvas + grid layers onto the transparent overlay
//                     sphere (drawSphere, defined in globe-v-1.1.js).
//
// DO NOT delete these globals or the hidden canvases as "grid-only" — they are
// load-bearing beyond the lat/long grid. In the untouched globe-v-1.1.js:
//   - canvas / tempCanvas / tempCtx are used by generateWorld() (terrain "Generate")
//     and by the GIF-export path (they read canvas.width/height and draw via tempCtx).
//   - canvasToImage() is called by BOTH drawGraticule() (grid on) and the #showGrid
//     un-check handler (grid off), so its contract must stay stable for both.
// The always-blank #flatCanvas is composited as a harmless no-op layer; removing it
// would require a deeper rewrite of the frozen compositing path.

var canvas, tempCanvas, tempCtx, gridCanvas;

function flatInit() {
	canvas = document.getElementById('flatCanvas');
	var width = window.innerWidth - 350;
	var height = width / 2;

	canvas.width = width;
	canvas.height = height;

	// Temporary canvas used to composite the map + grid layers before texturing.
	var container = canvas.parentNode;
	tempCanvas = document.createElement('canvas');
	tempCanvas.id = 'tempCanvas';
	tempCanvas.width = canvas.width;
	tempCanvas.height = canvas.height;
	container.appendChild(tempCanvas);
	tempCtx = tempCanvas.getContext('2d');

	gridCanvas = document.getElementById('gridCanvas');
	gridCanvas.width = width;
	gridCanvas.height = height;

	$("#imgCanvas").attr('height', canvas.height);
	$("#imgCanvas").attr('width', canvas.width);
}

function canvasToImage() {
	tempCtx.drawImage(canvas, 0, 0);
	tempCtx.drawImage(gridCanvas, 0, 0);
	var testimage = document.createElement('img');
	testimage.onload = function(e) {
		var testtexture = new THREE.Texture(testimage);
		testtexture.needsUpdate = true;
		// Free the previous grid material + its texture before replacing it; the
		// grid overlay owns them exclusively, so every toggle otherwise leaks a
		// full-size texture on the GPU (audit M5).
		if (drawSphere.material) {
			if (drawSphere.material.map) drawSphere.material.map.dispose();
			drawSphere.material.dispose();
		}
		drawSphere.material = new THREE.MeshPhongMaterial({map:testtexture, shininess: 6, transparent: true});
		drawSphere.geometry.buffersNeedUpdate = true;
		drawSphere.geometry.uvsNeedUpdate = true;
		scene.add(drawSphere);
		render();
	}
	testimage.src = tempCanvas.toDataURL('image/jpg');

	tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
}

$(function() {
	flatInit();
});
