var renderer, mapFile, bgFile, heightFile, specularFile, scene, camera, lightCamera, controls, lightControls, material, sphere, lineMaterial, lineGeometry, line, backgroundScene, backgroundCamera, bgMaterial, backgroundMesh, light, lightIntensity, urlParams, heightMaterial, heightMesh, uniformsTerrain, heightSphere, curvedLine, atmosphere, atmosphereMaterial, nightMap, backgroundType, imageWidth, imageHeight, atmosphereEnabled, sky, lightVector, mousedown, atomsphereColor;
var hasOwnProperty = Object.prototype.hasOwnProperty;
var pointA = new Array();
var pointB = new Array();
var spherical = new Array();
var measureEnabled = false;
var canceled = false;
var atmosphereColor = "3289c7";

var urlParams;
(window.onpopstate = function () {
    var match,
        pl     = /\+/g,  // Regex for replacing addition symbol with a space
        search = /([^&=]+)=?([^&]*)/g,
        decode = function (s) { return decodeURIComponent(s.replace(pl, " ")); },
        query  = window.location.search.substring(1);

    urlParams = {};
    while (match = search.exec(query))
       urlParams[decode(match[1])] = decode(match[2]);
})();

function setOptions() {
	$.each(savedData.images, function(key,value) {
		if (key == "map") mapFile = value;
		if (key == "night") nightMap = value;
		if (key == "bg") bgFile = value;
		if (key == "hm") heightFile = value;
	});
	if (savedData.options.transparentBG == "true") $("#bgTransparent").click();
	if (savedData.options.showPole == "true") $("#poleOption").click();
	setSphereTilt(savedData.options.axialTilt); $("#axialTilt").val(savedData.options.axialTilt); $(".axialTiltLabel").val(savedData.options.axialTilt + "°");
	$("#" + savedData.options.bgViewType).prop("checked", true);
	$("#" + savedData.options.heightmapType).prop("checked", true);
	$("#heightScale").val(savedData.options.heightMapScale).trigger("oninput");
	$("#sunIntensity").val(savedData.options.lightIntensity).trigger("oninput");
	loadImgur(savedData.images);
	if (savedData.options.showGrid == "true") $("#showGrid").click();
}

function init() {
	if (Detector.webgl)
		renderer = new THREE.WebGLRenderer({canvas: document.getElementById('globeCanvas'), antialias: true, preserveDrawingBuffer: true, alpha:true});
	else
		renderer = new THREE.CanvasRenderer({canvas: document.getElementById('globeCanvas'), alpha:true});

	scene = new THREE.Scene();
	camera = new THREE.PerspectiveCamera(5, window.innerWidth / window.innerHeight, 0.1, 10000);
	lightCamera = new THREE.PerspectiveCamera(5, window.innerWidth / window.innerHeight, 0.1, 6000);

	renderer.setClearColor(0x000000,0);
	renderer.setSize(window.innerWidth, window.innerHeight);
	controls = new THREE.OrbitControls( camera, renderer.domElement );

	//Light
	light = new THREE.DirectionalLight(0xffffff, 1);
	lightAmbient = new THREE.AmbientLight(0x404040);
	light.position.set(0,0,0);
	lightCamera.position.z = 6000;
	lightCamera.add(light);
	camera.add(lightCamera);
	scene.add(lightAmbient);
	scene.add(camera);

	//Sphere
	var geometry = new THREE.SphereGeometry(100,100,100);
	material = new THREE.MeshPhongMaterial({color: 0x00ee00, wireframe: true, transparent: true});
	sphere = new THREE.Mesh(geometry, material);
	scene.add(sphere);

	//Second sphere to be used for drawing tool overlay
	drawGeo = new THREE.SphereGeometry(100,100,100);
	drawMat = new THREE.MeshPhongMaterial();
	drawSphere = new THREE.Mesh(drawGeo, drawMat);

	//Pole Line
	lineMaterial = new THREE.LineBasicMaterial({color:0x0000ff});
	lineGeometry = new THREE.Geometry();
	lineGeometry.vertices.push( new THREE.Vector3( 0, -150, 0 ) );
	lineGeometry.vertices.push( new THREE.Vector3( 0, 150, 0 ) );
	line = new THREE.Line( lineGeometry, lineMaterial );

	camera.position.z = 3000;

	//Create Background
	backgroundScene = new THREE.Scene();
	backgroundCamera = new THREE.Camera();
	bgMaterial = new THREE.MeshBasicMaterial({color: 0x0F0F0F});
	backgroundMesh = new THREE.Mesh(new THREE.PlaneGeometry(2,2,0), bgMaterial);
	backgroundMesh.material.depthTest = false;
	backgroundMesh.material.depthWrite = false;
	backgroundScene.add(backgroundCamera);
	backgroundScene.add(backgroundMesh);

	backgroundGeometry = new THREE.SphereGeometry(5000,100,100);
	backgroundSphereMesh = new THREE.MeshBasicMaterial({color: 0xE3E3E3, side: THREE.BackSide});
	backgroundSphere = new THREE.Mesh(backgroundGeometry, backgroundSphereMesh);

	controls.addEventListener('change', render);

	render();

	$(".loaderWrapper").hide();
}

function render() {
	if (typeof window.updateMicrasTerminator === 'function') window.updateMicrasTerminator();
	renderer.autoClear = false;
	renderer.clear();
	renderer.render(backgroundScene, backgroundCamera);
	renderer.clearDepth();
	renderer.render(scene, camera);
}

//File Reader
function fileSelect(files) {
	$(".loaderWrapper").show();
	$.each(files, function(index,file) {
		var type = file.id;
		THREE.ImageUtils.loadTexture(file.src, undefined, function(eResult) {
			if (type == "surfaceFile") {
				analyticsEvent('Load image from computer');
				if (mapFile == undefined) $("#imageUse").append($("<option></option>").attr("value", "heightmap").text("Heightmap"));
				mapFile = file.src;
				if (atmosphereEnabled) {
					sky.material.uniforms.tDiffuse.value = eResult;
					sphere.material.uniforms.tDiffuse.value = eResult;
					sky.material.uniforms.tDiffuseNight.value = eResult;
					sphere.material.uniforms.tDiffuseNight.value = eResult;
				} else {
					sphere.material = new THREE.MeshPhongMaterial({map: eResult, needsUpdate: true, shininess: 6});
					sphere.geometry.buffersNeedUpdate = true;
					sphere.geometry.uvsNeedUpdate = true;
				}
				var img = new Image();
				img.onload = function() {
					$("#imgCanvas").attr('src', file.src);
					imageWidth = this.width;
					imageHeight = this.height;
				}
				img.src = file.src;
				if ($("#projectionArea").is(":visible")) {
					var projCanvas = document.getElementById('projectionCanvas');
					var projCtx = projCanvas.getContext('2d');
					var tempImage = new Image();
					tempImage.src = mapFile;
					tempImage.onload = function() {
						projCtx.drawImage(tempImage,0,0, projCanvas.width, projCanvas.height);
						$("#projImage").attr('src', $("#imgCanvas").attr('src'));
						$("#projImage").css('width', projCanvas.width);
						$("#projImage").css('height', projCanvas.height);
					};
				}
			} else if (type == "specular") {
				specularFile = file.src;
				sphere.material.specularMap = eResult;
				sphere.material.specular = new THREE.Color('grey');
				sphere.material.needsUpdate = true;
			} else if (type == "backgroundFile") {
				analyticsEvent('Load background image');
				$("#blackBG").attr('checked', false);
				bgFile = file.src;
				backgroundMesh.material = new THREE.MeshBasicMaterial({map: eResult, needsUpdate: true});
				backgroundMesh.geometry.buffersNeedUpdate = true;
				backgroundMesh.geometry.uvsNeedUpdate = true;
				backgroundSphere.material = new THREE.MeshBasicMaterial({map: eResult, needsUpdate: true, side: THREE.BackSide});
				backgroundSphere.geometry.buffersNeedUpdate = true;
				backgroundSphere.geometry.uvsNeedUpdate = true;
			} else if (type == 'heightmapFile') {
				analyticsEvent('Load heightmap image');
				heightFile = THREE.ImageUtils.loadTexture(file.src);
				loadTerrain(heightFile, sphere.material.map);
			} else if (type == 'nightFile') {
				analyticsEvent('Load nightmap image');
				nightMap = THREE.ImageUtils.loadTexture(file.src);
			}
			window.setTimeout(function() {
				render();
				$(".loaderWrapper").hide();
			}, 10);
		});
	});
}

//Load from Imgur
function loadImgur(images) {
	$(".loaderWrapper").show();
	THREE.ImageUtils.crossOrigin = '';
	//var file = file.split("/")[3].slice(0,-4);
	async.eachOf(images, function(file, use, callback) {
		THREE.ImageUtils.loadTexture("https://i.imgur.com/" + file + ".jpg", {}, function(result) {
			if (use == "hm") {
				heightFile = result;
				$("<img>", {"src": heightFile.sourceFile,"class": "thumb-image","id": "heightmapFile"}).appendTo($("#heightmapFile").parent());
			}
			if (use == "map") {
				mapFile = result.sourceFile;
				$("<img>", {"src": mapFile,"class": "thumb-image","id": "surfaceFile"}).appendTo($("#surfaceFile").parent());
				sphere.material = new THREE.MeshPhongMaterial({map: result, shininess: 6});
				sphere.geometry.buffersNeedUpdate = true;
				sphere.geometry.uvsNeedUpdate = true;
				$("#imgCanvas").attr('src', result.sourceFile);
				imageWidth = this.width;
				imageHeight = this.height;
			}
			if (use == "night") {
				nightMap = result;
				$("<img>", {"src": nightMap.sourceFile,"class": "thumb-image","id": "nightFile"}).appendTo($("#nightFile").parent());
			}
			if (use == "bg") {
				bgFile = result.sourceFile;
				$("<img>", {"src": bgFile,"class": "thumb-image","id": "backgroundFile"}).appendTo($("#backgroundFile").parent());
				backgroundMesh.material = new THREE.MeshBasicMaterial({map: result});
				backgroundMesh.geometry.buffersNeedUpdate = true;
				backgroundMesh.geometry.uvsNeedUpdate = true;
				backgroundSphere.material = new THREE.MeshBasicMaterial({map: result, needsUpdate: true, side: THREE.BackSide});
				backgroundSphere.geometry.buffersNeedUpdate = true;
				backgroundSphere.geometry.uvsNeedUpdate = true;
				if (savedData.options.blackBG == "true") $("#blackBG").click();
			}
			callback();
		});
	}, function(err) {
		if (err) {
			showError();
			analyticsEvent('Load imgur error');
		}
		if (heightFile != undefined) {
			loadTerrain(heightFile, sphere.material.map);
		}
		if (savedData.options.atmosphere.enabled == "true") {
			$("#nightDarkness").val(savedData.options.atmosphere.darkness);
			$("#rScattering").val(savedData.options.atmosphere.rayleigh);
			$("#mScattering").val(savedData.options.atmosphere.mie);
			$("#atmosphere").click();
			$("#colorPick").colpickSetColor(savedData.options.atmosphere.color, true);
		}
		render();
		$(".loaderWrapper").hide();
	});
}

function loadTerrain(height, texture) {
	heightmap = height;
	build_terrain( height, texture );
	sphere.material.bumpMap = height;
	sphere.material.bumpScale = $("#heightScale").val();
	sphere.material.shininess = 6;
	sphere.material.needsUpdate = true;
	$("#heightOptions").show();
}

function build_terrain(height, texture) {
	// the following configuration defines how the terrain is rendered
    var terrainShader = THREE.ShaderLib[ "normalmap" ];
    uniformsTerrain = THREE.UniformsUtils.clone(terrainShader.uniforms);

    // displacement is heightmap (greyscale image)
    uniformsTerrain[ "tDisplacement" ].value = height;
    uniformsTerrain[ "uDisplacementScale" ].value = 15;
    uniformsTerrain[ "enableDisplacement" ].value = true;

    // diffuse is texture overlay
    uniformsTerrain[ "tDiffuse" ].value = texture;
    uniformsTerrain[ "enableDiffuse" ].value = true;

    uniformsTerrain[ "shininess" ].value = 0;

    var material = new THREE.ShaderMaterial({
        uniforms:       uniformsTerrain,
        vertexShader:   terrainShader.vertexShader,
        fragmentShader: terrainShader.fragmentShader,
        lights:         true,
        fog:            false
    });

    var geometry = new THREE.SphereGeometry(100,100,100);
    geometry.computeTangents();

    heightSphere = new THREE.Mesh(geometry, material);

    if ($("#Vheight").is(":checked")) {
	    scene.remove(sphere);
	    camera.remove(lightCamera);
	    scene.add(lightCamera);
	    lightCamera.position.z = -225;
	    scene.add(heightSphere);
	}
}

//Capture and download screenshot. Thanks to /u/jugdemon for part of this snipet.
function takeScreen() {
	var data = renderer.domElement.toDataURL("image/png");
    data = data.replace(new RegExp("data:image.*base64,"), "");
    //Convert to blob due to Chrome bug with long URIs
    var sliceSize = 512;
    var byteCharacters = atob(data);
    var byteArrays = [];
    for (var offset = 0; offset < byteCharacters.length; offset += sliceSize) {
        var slice = byteCharacters.slice(offset, offset + sliceSize);

        var byteNumbers = new Array(slice.length);
        for (var i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
        }

        var byteArray = new Uint8Array(byteNumbers);

        byteArrays.push(byteArray);
    }
    var blob = new Blob(byteArrays, {type: 'image/octet-stream'});
    return [data, blob];
}

//Capture and upload screenshot to imgur
function uploadScreen() {
	analyticsEvent('Upload screenshot to imgur');
	document.getElementById('imgurURL').style.display = 'none';
	document.getElementById('imgurScreenButton').disabled = true;
	document.getElementById('imgurMessage').style.display = 'inline';
	var data = renderer.domElement.toDataURL("image/jpg");
	data = data.replace(/^data:image\/.+;base64,/, "");
	$.ajax({
		url: 'https://api.imgur.com/3/image',
		method: 'POST',
		headers: {
			'Authorization': 'Client-ID e175e7594f479f8'
		},
		data: {
			image: data,
			type: 'base64'
		},
		success: function(result) {
			document.getElementById('imgurURL').style.display = 'inline';
			document.getElementById('imgurScreenButton').disabled = false;
			document.getElementById('imgurMessage').style.display = 'none';
			document.getElementById('imgurURL').setAttribute('href', result.data.link);
			document.getElementById('imgurURL').innerHTML = result.data.link;
			document.getElementById('imgurURL').click();
		},
		error: function(result) {
			console.log("Error: " + result.data.error);
			document.getElementById('imgurScreenButton').disabled = false;
			document.getElementById('imgurURL').style.display = 'inline';
			document.getElementById('imgurURL').innerHTML = "Error uploading";
		}
	});
}

//Upload to imgur and get unique URL ('saving')
function saveUrl() {
	if (mapFile == undefined) {
		alert("You must add a map image before you can save");
	} else {
		if (window.location.pathname.split('/')[1] != "" && Object.getOwnPropertyNames(urlParams).length == 0) {
			if (confirm("No key provided. If you save this, it will create a new save URL rather than updating the one you are currently on. If this is okay, select OK")) {
				goSave();
			}
		} else {
			goSave();
		}

		function goSave() {
			$(".loaderWrapper").show();
			$(".loaderWrapper > #loading").text("Saving");
			analyticsEvent('Save / Get URL');
			mapFile = mapFile.replace(/^data:image\/.+;base64,/, "");
			var toUpload = {};
			var imgurResults = {};
			var deletehashes = {};
			if (mapFile != undefined && (mapFile.match(/https\:\/\/i.imgur.com\/(.*)\.jpg/) == null || mapFile.match(/https\:\/\/i.imgur.com\/(.*)\.jpg/)[1] != savedData.images.map)) {
				toUpload['map'] = mapFile;
			} else {
				imgurResults["map"] = mapFile.match(/https\:\/\/i.imgur.com\/(.*)\.jpg/)[1];
			}
			if (nightMap != undefined && (nightMap.sourceFile.match(/https\:\/\/i.imgur.com\/(.*)\.jpg/) == null || nightMap.sourceFile.match(/https\:\/\/i.imgur.com\/(.*)\.jpg/)[1] != savedData.images.night)) {
				nightMap = nightMap.sourceFile.replace(/^data:image\/.+;base64,/, "");
				toUpload['night'] = nightMap;
			} else if (nightMap != undefined) {
				imgurResults["night"] = nightMap.sourceFile.match(/https\:\/\/i.imgur.com\/(.*)\.jpg/)[1];
			}
			if (bgFile != undefined && (bgFile.match(/https\:\/\/i.imgur.com\/(.*)\.jpg/) == null || bgFile.match(/https\:\/\/i.imgur.com\/(.*)\.jpg/)[1] != savedData.images.bg)) {
				bgFile = bgFile.replace(/^data:image\/.+;base64,/, "");
				toUpload['bg'] = bgFile;
			} else if (bgFile != undefined) {
				imgurResults["bg"] = bgFile.match(/https\:\/\/i.imgur.com\/(.*)\.jpg/)[1];
			}
			if (heightFile != undefined && (heightFile.sourceFile.match(/https\:\/\/i.imgur.com\/(.*)\.jpg/) == null || heightFile.sourceFile.match(/https\:\/\/i.imgur.com\/(.*)\.jpg/)[1] != savedData.images.hm)) {
				heightFile = heightFile.sourceFile.replace(/^data:image\/.+;base64,/, "");
				toUpload['hm'] = heightFile;
			} else if (heightFile != undefined) {
				imgurResults["hm"] = heightFile.sourceFile.match(/https\:\/\/i.imgur.com\/(.*)\.jpg/)[1];
			}
			var promises = [];
			Object.keys(toUpload).forEach(function(key) {
				var request = $.ajax({
					url: 'https://api.imgur.com/3/image',
					method: 'POST',
					headers: {
						'Authorization': 'Client-ID e175e7594f479f8'
					},
					data: {
						image: toUpload[key],
						type: 'base64'
					},
					success: function(result) {
						imgurResults[key] = result.data.id;
						deletehashes[key] = result.data.deletehash;
						$("#uploadIndex").text(parseInt($("#uploadIndex").text(), 10)+1);
					},
					error: function(result) {
						console.log("Error: " + result.data.error);
						document.getElementById('getsavedUrl').disabled = false;
						document.getElementById('savingMessage').style.display = 'inline';
						document.getElementById('savingMessage').innerHTML = "Error uploading";
					}
				});
				promises.push(request);
			});
			$.when.apply(null, promises).done(function() {
				$.ajax({
					type: 'POST',
					url: '/save',
					data: {
						id: window.location.pathname.split('/')[1],
						key: urlParams["key"],
						images: imgurResults,
						deletehashes: deletehashes,
						options: {
							blackBG: $("#blackBG").prop('checked'),
							transparentBG: $("#bgTransparent").prop('checked'),
							showPole: $("#poleOption").prop('checked'),
							showGrid: $("#showGrid").prop('checked'),
							atmosphere: {
								enabled: $("#atmosphere").prop('checked'),
								darkness: $("#nightDarkness").val(),
								rayleigh: $("#rScattering").val(),
								mie: $("#mScattering").val(),
								color: atmosphereColor
							},
							axialTilt: $("#axialTilt").val(),
							lightIntensity: $("#sunIntensity").val(),
							bgViewType: $("#bg2d").prop("checked") ? "2D" : "3D",
							heightmapType: $("#bumpHeight").prop("checked") ? "2D" : "3D",
							heightMapScale: $("#heightScale").val(),
							private: true
						}
					}
				}).done(function (data) {
					if (data.nModified == 1) {
						$(".loaderWrapper > #loading").text("LOADING");
						$(".loaderWrapper").hide();
						alert("Update successful");
					} else {
						$(".loaderWrapper > #loading").text("LOADING");
						$(".loaderWrapper").hide();
						history.pushState(data, "Map to Globe", "/" + data[0]);
						$("#saveURL").val("https://www.maptoglobe.com/" + data[0]);
						$("#keyURL").val("https://www.maptoglobe.com/" + data[0] + "?key=" + data[1]);
						$("[data-remodal-id=saveSuccess]").remodal().open();
					}
				}).fail(function(err) {
					$("#errorMessage").html("<h2>Error!</h2><p>There was an error while trying to save:</p><p>" + err.responseText + "</p><p>Please try again. If the issue persists, please contact me.</p>");
					$("[data-remodal-id=modalError]").remodal().open();
				});
			});
		}
	}
}

//Toggle Transparent Background
function toggleBGTransparent(check) {
	if (check.checked) {
		backgroundScene.remove(backgroundMesh);
	} else {
		backgroundScene.add(backgroundMesh);
	}
	backgroundMesh.geometry.buffersNeedUpdate = true;
	backgroundMesh.geometry.uvsNeedUpdate = true;
	render();
}

//Pole Hide/Show
function checkPoleOption(check) {
	if (check.checked) {
		scene.add(line);
	} else {
		scene.remove(line);
	}
	render();
}

//Toggle sun (adjust light position)
function resetSun() {
	lightCamera.position.set(0,0,6000);
	$("#sunPosY, #sunPosZ").val(0);
	$("#sunPosX").val(6000);
	if (atmosphereEnabled) {
		var atmosphereSettings = setAtmosphere();
		sky.material.uniforms.v3LightPosition.value = atmosphereSettings.atmosphereLight;
		sky.material.uniforms.fCameraHeight.value = atmosphereSettings.lightPosition.length();
		sky.material.uniforms.fCameraHeight2.value = atmosphereSettings.lightPosition.length() * atmosphereSettings.lightPosition.length();
		sphere.material.uniforms.v3LightPosition.value = atmosphereSettings.atmosphereLight;
		sphere.material.uniforms.fCameraHeight.value = atmosphereSettings.lightPosition.length();
		sphere.material.uniforms.fCameraHeight2.value = atmosphereSettings.lightPosition.length() * atmosphereSettings.lightPosition.length();
		render();
	}
	render();
}

function changeLightInt(intensity) {
	if (atmosphereEnabled) {
		atmosphere.ESun = intensity;
		sky.material.uniforms.fKrESun.value = atmosphere.Kr * intensity * 10;
		sphere.material.uniforms.fKmESun.value = atmosphere.Km * intensity * 10;
		render();
	} else {
		light.intensity = intensity;
	}
	render();
}

//Change heightmap scale
function heightScaleChange(value) {
	if (heightFile != null || heightFile != undefined) {
		uniformsTerrain["uDisplacementScale"].value = value;
		sphere.material.bumpScale = value;
		render();
	}
}

//Window resize
window.addEventListener('resize', windowResize, false);
function windowResize() {
	// A resize can fire before the scene finishes building; bail rather than throw.
	if (!camera || !renderer) return;
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);
	render();
}

function measureToggle() {
	$("#measureBox").slideToggle(400, function() {
		if (measureEnabled == true) {
			measureEnabled = false;
			$("#distance").text('Click two spots on the globe');
			pointA = [];
			pointB = [];
		}
		else
			measureEnabled = true;
	});
	if (curvedLine != undefined) {
		scene.remove(curvedLine);
		render();
	}
}

function coordinates(event) {
	var projector = new THREE.Projector();
	var vector = new THREE.Vector3(  ( event.clientX / window.innerWidth ) * 2 - 1, - ( event.clientY / window.innerHeight ) * 2 + 1, 1);
	projector.unprojectVector( vector, camera );

	var ray = new THREE.Raycaster( camera.position, vector.sub( camera.position ).normalize() );
	var intersect = ray.intersectObject( sphere );

	if ( intersect.length > 0) // !!
		return [intersect[0].point.x, intersect[0].point.y, intersect[0].point.z];
}

function placeDistancePoint(event) {
	// Measurement Pack (js/measure.js) handles Path/Area modes; it returns true to
	// consume the click, false to fall through to legacy 2-point Distance behavior.
	if (typeof measurePackClick === 'function' && measurePackClick(event)) return;
	var point = coordinates(event);
	if (point != undefined) {
		if (!('x' in pointA) || ('x' in pointB)) {
			if ('x' in pointB) {
				pointB = [];
				pointA = [];
				scene.remove(curvedLine);
				render();
			}
			pointA['x'] = point[0];
			pointA['y'] = point[1];
			pointA['z'] = point[2];
			$("#distance").text('Click a 2nd spot');
		} else {
			pointB['x'] = point[0];
			pointB['y'] = point[1];
			pointB['z'] = point[2];
			placeLine(point);
			calcDistance();
		}
	}
}

function placeLine(point) {
	var middle = [ (pointA['x'] + pointB['x']) / 2, (pointA['y'] + pointB['y']) / 2, (pointA['z'] + pointB['z']) / 2 ];
	var dist = Math.sqrt(Math.pow(middle[0] - pointA['x'],2) + Math.pow(middle[1] - pointA['y'],2) + Math.pow(middle[2] - pointA['z'],2));
	var sagitta = (100 - Math.sqrt( Math.pow(100,2) - Math.pow(dist,2) )) + 100;

	var sphereMid = CartToSphere(middle[0], middle[1], middle[2]);
	var sphereA = CartToSphere(pointA['x'], pointA['y'], pointA['z']);
	var sphereB = CartToSphere(pointB['x'], pointB['y'], pointB['z']);

	var newMiddle = SphereToCart(sagitta, sphereMid[1], sphereMid[2]);
	var newA = SphereToCart(101, sphereA[1], sphereA[2]);
	var newB = SphereToCart(101, sphereB[1], sphereB[2]);
	var tempMid = SphereToCart(101, sphereMid[1], sphereMid[2]);

	//newA => newMiddle
	var shortMiddle = [ (newA[0] + tempMid[0]) / 2, (newA[1] + tempMid[1]) / 2, (newA[2] + tempMid[2]) / 2 ];
	var newDist = Math.sqrt(Math.pow(shortMiddle[0] - newA[0],2) + Math.pow(shortMiddle[1] - newA[1],2) + Math.pow(shortMiddle[2] - newA[2],2));
	var newSagitta = (101 - Math.sqrt(Math.pow(101,2) - Math.pow(newDist,2))) + 101;
	var smallMid = CartToSphere(shortMiddle[0], shortMiddle[1], shortMiddle[2]);
	var newSmallMid = SphereToCart(newSagitta, smallMid[1], smallMid[2]);
	var curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(newA[0], newA[1], newA[2]), new THREE.Vector3(newSmallMid[0], newSmallMid[1], newSmallMid[2]), new THREE.Vector3(tempMid[0], tempMid[1], tempMid[2]));

	//newMiddle => newB
	var shortMid2 = [ (tempMid[0] + newB[0]) / 2, (tempMid[1] + newB[1]) / 2, (tempMid[2] + newB[2]) / 2 ];
	var smallMid2 = CartToSphere(shortMid2[0], shortMid2[1], shortMid2[2]);
	var newSmallMid2 = SphereToCart(newSagitta, smallMid2[1], smallMid2[2]);
	var curve2 = new THREE.QuadraticBezierCurve3(new THREE.Vector3(tempMid[0], tempMid[1], tempMid[2]), new THREE.Vector3(newSmallMid2[0], newSmallMid2[1], newSmallMid2[2]), new THREE.Vector3(newB[0], newB[1], newB[2]));

	//var curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(newA[0], newA[1], newA[2]), new THREE.Vector3(newMiddle[0], newMiddle[1], newMiddle[2]), new THREE.Vector3(newB[0], newB[1], newB[2]));
	var path = new THREE.CurvePath();
	path.add(curve);
	path.add(curve2);
	var curveMaterial = new THREE.LineBasicMaterial({color: 0xFF0000});
	curvedLine = new THREE.Line(path.createPointsGeometry(50), curveMaterial);
	scene.add(curvedLine);
	render();
}

function calcDistance() {
	var radius = parseFloat(document.getElementById('radius').value);
	// Chord (straight-line) length between the two picked surface points, in globe units.
	var chord = Math.sqrt( Math.pow(pointA['x'] - pointB['x'],2) + Math.pow(pointA['y'] - pointB['y'],2) + Math.pow(pointA['z'] - pointB['z'],2) );
	// Sphere radius the points sit on, derived from the points themselves (no magic constant).
	var rA = Math.sqrt(pointA['x']*pointA['x'] + pointA['y']*pointA['y'] + pointA['z']*pointA['z']);
	var rB = Math.sqrt(pointB['x']*pointB['x'] + pointB['y']*pointB['y'] + pointB['z']*pointB['z']);
	var sphereR = (rA + rB) / 2;
	// Great-circle arc = planetRadius * central angle, where the central angle comes from the chord:
	//   theta = 2 * asin(chord / 2R).  The legacy code returned the chord itself (asin arg used the
	//   planet radius, ~200x the globe radius, so asin(x)~=x and the arc collapsed to the chord),
	//   which undercounts increasingly toward antipodes. clamp guards floating point at exact antipodes.
	var theta = 2 * Math.asin( Math.min(1, chord / (2 * sphereR)) );
	var distance = radius * theta;
	// The Measurement Pack (js/measure.js), when present, renders the km/mi/nm
	// readout and travel-time estimate; fall back to the legacy single-unit text.
	if (typeof updateMeasureReadout === 'function') {
		updateMeasureReadout(distance);
	} else {
		$("#distance").text("Distance: " + +distance.toFixed(2) + " units");
	}
}

function CartToSphere(x,y,z) {
	var r = Math.sqrt(Math.pow(x,2) + Math.pow(y,2) + Math.pow(z,2));
	var theta = Math.acos(z/r);
	if (x > 0)
		var phi = Math.atan(y/x);
	else
		var phi = Math.PI + Math.atan(y/x);

	return [r, theta, phi];
}

function SphereToCart(r,theta,phi) {
	var x = r * Math.sin(theta) * Math.cos(phi);
	var y = r * Math.sin(theta) * Math.sin(phi);
	var z = r * Math.cos(theta);

	return [x,y,z];
}

function generateWorld() { //drawNoise and oSpherical (and related variables) Code from http://test.sjeiti.com/noiseTiling/
	analyticsEvent('Generate');
	var iSize = document.getElementById('simplexSize').value;
	var iPixNum = iSize * iSize;
	var fRdsSin = .5 * iSize / (2*Math.PI);
	var generatedMap;
	var coloredHeight;
	canceled = false;

	simplexLoad();

	var drawNoise = function(callback, fnctx) {
		$(".cancelGenerate").show();
		$("[data-remodal-id=generateWorking]").remodal().open();
		$("#counterValue").show();
		var loopNoise = function(i,x,y){
			var  fNX = (x+.5)/iSize // added half a pixel to get the center of the pixel instead of the top-left
				,fNY = (y+.5)/iSize
				,fRdx = fNX*2*Math.PI
				,fRdy = fNY*Math.PI // the vertical offset of a 3D sphere spans only half a circle, so that is one Pi radians
				,fYSin = Math.sin(fRdy+Math.PI) // a 3D sphere can be seen as a bunch of cicles stacked onto each other, the radius of each of these is defined by the vertical position (again one Pi radians)
				,a = fRdsSin*Math.sin(fRdx)*fYSin
				,b = fRdsSin*Math.cos(fRdx)*fYSin
				,c = fRdsSin*Math.cos(fRdy)
				,v = Simplex.noise(
					 123+a*fNoiseScale
					,132+b*fNoiseScale
					,312+c*fNoiseScale
				);
			;
			return v*255<<0;
		};
		if (loopNoise===undefined) loopNoise = function(){return (255*Math.random())<<0};
		var oReturn = {}
			,mCnv = document.createElement('canvas');
		mCnv.width = mCnv.height = iSize;
		var oCtx = mCnv.getContext('2d')
			,oImgData = oCtx.getImageData(0,0,iSize,iSize)
			,aPixels = oImgData.data
		;

		(function(callback) {
			document.getElementById('stepText').innerHTML = "Making noise";
			var startTime = new Date().getTime();
			var counterText = document.getElementById('counterValue');
			var incrementBy = 1000;
			(function(N) {
				return (function loop(i) {
					for (var j=i; j<=N && j<i+incrementBy; j++) {
						aPixels[4*j] = aPixels[4*j+1] = aPixels[4*j+2] = loopNoise(j,j%iSize,j/iSize<<0);
						aPixels[4*j+3] = 255;
					}
					if (i <= N && !canceled) {
						counterText.innerHTML = Math.round(((i/iPixNum)/2)*100)+"%";
						$("#generateProgress").val(Math.round(((i/iPixNum)/2)*100));
						window.setTimeout(function() {
							loop(i+incrementBy);
						}, 1000/60);
					} else if (canceled) {
						canceled = false;
					} else {
						callback();
					}
				})(0);
			})(iPixNum);
		})(function(data) {
			oCtx.putImageData(oImgData,0,0);
			fnctx&&fnctx(oCtx);
			var sData = mCnv.toDataURL("image/jpeg");
			oReturn.canvas = mCnv;
			oReturn.context = oCtx;
			oReturn.img = function(){
				document.createElement('img',{src:sData});
				return oReturn;
			};
			oReturn.div = function(w,h){
				document.createElement('div',{class:'img'}).css({
					background:'url('+sData+')'
					,width:  (w||1)*iSize+'px'
					,height: (h||1)*iSize+'px'
				});
				return oReturn;
			};
			oReturn.data = function(){
				return sData;
			};
			callback(null, oReturn);
		})
	};

	fNoiseScale = document.getElementById('noiseScale').value / iSize;

	async.waterfall([
		function(callback) {
			window.setTimeout(function() {
				drawNoise(callback);
			}, 100)
		},
		function(arg1, callback) {
			var items = [
				"Calculating universal constant",
				"Walking the dog",
				"Taking a coffee break",
				"Summoning Cthulhu from the depths",
				"Please take a number...",
				"Attaching differential girdle springs"
			];
			$("#stepText").text(items[Math.floor(Math.random()*items.length)]);
			generatedMap = arg1.context.getImageData(0,0,arg1.canvas.width, arg1.canvas.height);
			coloredHeight = generatedMap;
			window.setTimeout(function() {
				callback(null, coloredHeight, generatedMap, arg1);
			}, 100);
		},
		function(arg1, arg2, arg3, callback) {
			(function(callback) {
				$("#stepText").text("Converting noise to color");
				var counterText = document.getElementById('counterValue');
				var oceanLevel = document.getElementById('oceanLevel').value;
				var bwSelect = document.getElementById('genbw');
				var incrementBy = 1000;
				var pixelColor;
				(function(N) {
					if (!bwSelect.checked) {
						return (function loop(i) {
							for (var j=i; j<=N && j<i+incrementBy; j+=4) {
								pixelColor = arg2.data[j];
								if (pixelColor < oceanLevel) {
									arg1.data[j] = 60;
									arg1.data[j+1] = 126;
									arg1.data[j+2] = 212;
								}
								else {
									pixelColor = (1/360) * (255 - pixelColor);
									var color = HSVtoRGB(pixelColor,.85,.79);
									arg1.data[j] = color.r;
									arg1.data[j+1] = color.g;
									arg1.data[j+2] = color.b;
								}
							}
							if (i<=N && !canceled) {
								counterText.innerHTML = (Math.round(((i/N)/2)*100)+50)+"%";
								$("#generateProgress").val(Math.round(((i/N)/2)*100)+50);
								window.setTimeout(function() {
									loop(i+incrementBy);
								},1000/60);
							} else if (canceled) {
								canceled = false;
							} else {
								callback();
							}
						})(0);
					} else {
						return (function loop(i) {
							for (var j=i; j<=N && j<i+incrementBy; j+=4) {
								pixelColor = arg2.data[j];
								if (pixelColor < oceanLevel) {
									arg1.data[j] = 255;
									arg1.data[j+1] = 255;
									arg1.data[j+2] = 255;
								}
								else {
									arg1.data[j] = 0;
									arg1.data[j+1] = 0;
									arg1.data[j+2] = 0;
								}
							}
							if (i<=N && !canceled) {
								counterText.innerHTML = (Math.round(((i/N)/2)*100)+50)+"%";
								$("#generateProgress").val(Math.round(((i/N)/2)*100)+50);
								window.setTimeout(function() {
									loop(i+incrementBy);
								},1000/60);
							} else if (canceled) {
								canceled = false;
							} else {
								callback();
							}
						})(0);
					}
				})(arg2.data.length);
			})(function(data) {
				callback(null, arg1, arg3);
			});
		},
		function(arg1, arg2, callback) {
			$("#counterValue").hide();
			$("#stepText").text("Applying noise to globe");
			arg2.context.putImageData(arg1,0,0);

			var newWorld = THREE.ImageUtils.loadTexture(arg2.canvas.toDataURL());
			if (atmosphereEnabled) {
				sky.material.uniforms.tDiffuse.value = newWorld;
				sphere.material.uniforms.tDiffuse.value = newWorld;
				sky.material.uniforms.tDiffuseNight.value = newWorld;
				sphere.material.uniforms.tDiffuseNight.value = newWorld;
			} else {
				sphere.material = new THREE.MeshPhongMaterial({map: newWorld, shininess: 6});
				sphere.geometry.buffersNeedUpdate = true;
				sphere.geometry.uvsNeedUpdate = true;
			}

			var tempImage = new Image();
			tempImage.src = arg2.canvas.toDataURL();
			tempImage.onload = function() {
				tempCanvas.width = $("#worldWidth").val();
				tempCanvas.height = $("#worldHeight").val();
				tempCtx.drawImage(tempImage, 0,0, tempCanvas.width, tempCanvas.height);
				$("#imgCanvas").attr('src', tempCanvas.toDataURL());
				$("#imgCanvas").css('height', canvas.height);
				imageWidth = $("#worldWidth").val();
				imageHeight = $("#worldHeight").val();
				mapFile = tempCanvas.toDataURL();
				tempCanvas.width = canvas.width;
				tempCanvas.height = canvas.height;
				if ($("#projectionArea").is(":visible")) {
					var projCanvas = document.getElementById('projectionCanvas');
					var projCtx = projCanvas.getContext('2d');
					projCtx.drawImage(tempImage,0,0, projCanvas.width, projCanvas.height);
					$("#projImage").attr('src', $("#imgCanvas").attr('src'));
					$("#projImage").css('width', projCanvas.width);
					$("#projImage").css('height', projCanvas.height);
				}
			};

			tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);

			window.setTimeout(render, 10);

			$("#worldDownload").prop('disabled', false);
			$("#getsavedUrl").prop('disabled', false);
			$("[data-remodal-id=generateWorking]").remodal().close();
		}
	]);

	/*for (i=0; i<generatedMap.data.length;i+=4) { changing the ocean to be all a single height on the heightmap.
		pixelColor = generatedMap.data[i];
		var oceanLevel = document.getElementById('oceanLevel').value;
		if (pixelColor < (oceanLevel)) {
			generatedMap.data[i] = oceanLevel;
			generatedMap.data[i+1] = oceanLevel;
			generatedMap.data[i+2] = oceanLevel;
		}
	}*/

	//Uncomment the below to show heightmap on globe. Not sure if I want to enable this or not.
	/*oSpherical.context.putImageData(generatedMap,0,0);
	loadTerrain(THREE.ImageUtils.loadTexture(oSpherical.canvas.toDataURL()), sphere.material.map);
	heightFile = oSpherical.canvas.toDataURL();*/
}

function HSVtoRGB(h,s,v) {
	var r, g, b, i, f, p, q, t;
    if (h && s === undefined && v === undefined) {
        s = h.s, v = h.v, h = h.h;
    }
    i = Math.floor(h * 6);
    f = h * 6 - i;
    p = v * (1 - s);
    q = v * (1 - f * s);
    t = v * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
    }
    return {
        r: Math.floor(r * 255),
        g: Math.floor(g * 255),
        b: Math.floor(b * 255)
    };
}

function setAtmosphere() {
	if (lightVector == undefined) {
		var sunPosX = $("#sunPosX").val();
		var sunPosY = $("#sunPosY").val();
		var sunPosZ = $("#sunPosZ").val();
		var vector = new THREE.Vector3(sunPosX/6000, sunPosY/6000, sunPosZ/6000);
	} else {
		var sunPosX = lightVector.x;
		var sunPosY = lightVector.y;
		var sunPosZ = lightVector.z;
		var vector = new THREE.Vector3(sunPosX, sunPosY, sunPosZ);
	}
	var lightPosition = camera.position;
	var atmosphereLight = vector;
	return {'lightPosition': lightPosition, 'atmosphereLight': atmosphereLight};
}

function atmosphereToggle(value) {
	$("#atmosphereSettings").slideToggle();
	$(".loaderWrapper").show();
	if (value.checked) {
		atmosphereEnabled = true;

		// ---- The code for this section was taken from http://www.gamedev.net/topic/638762-atmospheric-scattering-planet-rendering-oneil/, which is a JavaScript implementation of the info found here: http://http.developer.nvidia.com/GPUGems2/gpugems2_chapter16.html ------
		vertexSky = "//\n// Atmospheric scattering vertex shader\n//\n// Author: Sean O'Neil\n//\n// Copyright (c) 2004 Sean O'Neil\n//\n\nuniform vec3 v3LightPosition;	// The direction vector to the light source\nuniform vec3 v3InvWavelength;	// 1 / pow(wavelength, 4) for the red, green, and blue channels\nuniform float fCameraHeight;	// The camera's current height\nuniform float fCameraHeight2;	// fCameraHeight^2\nuniform float fOuterRadius;		// The outer (atmosphere) radius\nuniform float fOuterRadius2;	// fOuterRadius^2\nuniform float fInnerRadius;		// The inner (planetary) radius\nuniform float fInnerRadius2;	// fInnerRadius^2\nuniform float fKrESun;			// Kr * ESun\nuniform float fKmESun;			// Km * ESun\nuniform float fKr4PI;			// Kr * 4 * PI\nuniform float fKm4PI;			// Km * 4 * PI\nuniform float fScale;			// 1 / (fOuterRadius - fInnerRadius)\nuniform float fScaleDepth;		// The scale depth (i.e. the altitude at which the atmosphere's average density is found)\nuniform float fScaleOverScaleDepth;	// fScale / fScaleDepth\n\nconst int nSamples = 3;\nconst float fSamples = 3.0;\n\nvarying vec3 v3Direction;\nvarying vec3 c0;\nvarying vec3 c1;\n\n\nfloat scale(float fCos)\n{\n	float x = 1.0 - fCos;\n	return fScaleDepth * exp(-0.00287 + x*(0.459 + x*(3.83 + x*(-6.80 + x*5.25))));\n}\n\nvoid main(void)\n{\n	// Get the ray from the camera to the vertex and its length (which is the far point of the ray passing through the atmosphere)\n	vec3 v3Ray = position - cameraPosition;\n	float fFar = length(v3Ray);\n	v3Ray /= fFar;\n\n	// Calculate the closest intersection of the ray with the outer atmosphere (which is the near point of the ray passing through the atmosphere)\n	float B = 2.0 * dot(cameraPosition, v3Ray);\n	float C = fCameraHeight2 - fOuterRadius2;\n	float fDet = max(0.0, B*B - 4.0 * C);\n	float fNear = 0.5 * (-B - sqrt(fDet));\n\n	// Calculate the ray's starting position, then calculate its scattering offset\n	vec3 v3Start = cameraPosition + v3Ray * fNear;\n	fFar -= fNear;\n	float fStartAngle = dot(v3Ray, v3Start) / fOuterRadius;\n	float fStartDepth = exp(-1.0 / fScaleDepth);\n	float fStartOffset = fStartDepth * scale(fStartAngle);\n	//c0 = vec3(1.0, 0, 0) * fStartAngle;\n\n	// Initialize the scattering loop variables\n	float fSampleLength = fFar / fSamples;\n	float fScaledLength = fSampleLength * fScale;\n	vec3 v3SampleRay = v3Ray * fSampleLength;\n	vec3 v3SamplePoint = v3Start + v3SampleRay * 0.5;\n\n	//gl_FrontColor = vec4(0.0, 0.0, 0.0, 0.0);\n\n	// Now loop through the sample rays\n	vec3 v3FrontColor = vec3(0.0, 0.0, 0.0);\n	for(int i=0; i<nSamples; i++)\n	{\n		float fHeight = length(v3SamplePoint);\n		float fDepth = exp(fScaleOverScaleDepth * (fInnerRadius - fHeight));\n		float fLightAngle = dot(v3LightPosition, v3SamplePoint) / fHeight;\n		float fCameraAngle = dot(v3Ray, v3SamplePoint) / fHeight;\n		float fScatter = (fStartOffset + fDepth * (scale(fLightAngle) - scale(fCameraAngle)));\n		vec3 v3Attenuate = exp(-fScatter * (v3InvWavelength * fKr4PI + fKm4PI));\n\n		v3FrontColor += v3Attenuate * (fDepth * fScaledLength);\n		v3SamplePoint += v3SampleRay;\n	}\n\n	// Finally, scale the Mie and Rayleigh colors and set up the varying variables for the pixel shader\n	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\n	c0 = v3FrontColor * (v3InvWavelength * fKrESun);\n	c1 = v3FrontColor * fKmESun;\n	v3Direction = cameraPosition - position;\n}";
	    fragmentSky = "//\n// Atmospheric scattering fragment shader\n//\n// Author: Sean O'Neil\n//\n// Copyright (c) 2004 Sean O'Neil\n//\n\nuniform vec3 v3LightPos;\nuniform float g;\nuniform float g2;\n\nvarying vec3 v3Direction;\nvarying vec3 c0;\nvarying vec3 c1;\n\n// Calculates the Mie phase function\nfloat getMiePhase(float fCos, float fCos2, float g, float g2)\n{\n	return 1.5 * ((1.0 - g2) / (2.0 + g2)) * (1.0 + fCos2) / pow(1.0 + g2 - 2.0 * g * fCos, 1.5);\n}\n\n// Calculates the Rayleigh phase function\nfloat getRayleighPhase(float fCos2)\n{\n	return 0.75 + 0.75 * fCos2;\n}\n\nvoid main (void)\n{\n	float fCos = dot(v3LightPos, v3Direction) / length(v3Direction);\n	float fCos2 = fCos * fCos;\n\n	vec3 color =	getRayleighPhase(fCos2) * c0 +\n					getMiePhase(fCos, fCos2, g, g2) * c1;\n\n 	gl_FragColor = vec4(color, 1.0);\n	gl_FragColor.a = gl_FragColor.b;\n}";
	    vertexGround = "//\n// Atmospheric scattering vertex shader\n//\n// Author: Sean O'Neil\n//\n// Copyright (c) 2004 Sean O'Neil\n//\n// Ported for use with three.js/WebGL by James Baicoianu\n\nuniform vec3 v3LightPosition;		// The direction vector to the light source\nuniform vec3 v3InvWavelength;	// 1 / pow(wavelength, 4) for the red, green, and blue channels\nuniform float fCameraHeight;	// The camera's current height\nuniform float fCameraHeight2;	// fCameraHeight^2\nuniform float fOuterRadius;		// The outer (atmosphere) radius\nuniform float fOuterRadius2;	// fOuterRadius^2\nuniform float fInnerRadius;		// The inner (planetary) radius\nuniform float fInnerRadius2;	// fInnerRadius^2\nuniform float fKrESun;			// Kr * ESun\nuniform float fKmESun;			// Km * ESun\nuniform float fKr4PI;			// Kr * 4 * PI\nuniform float fKm4PI;			// Km * 4 * PI\nuniform float fScale;			// 1 / (fOuterRadius - fInnerRadius)\nuniform float fScaleDepth;		// The scale depth (i.e. the altitude at which the atmosphere's average density is found)\nuniform float fScaleOverScaleDepth;	// fScale / fScaleDepth\nuniform sampler2D tDiffuse;\n\nvarying vec3 v3Direction;\nvarying vec3 c0;\nvarying vec3 c1;\nvarying vec3 vNormal;\nvarying vec2 vUv;\n\nconst int nSamples = 3;\nconst float fSamples = 3.0;\n\nfloat scale(float fCos)\n{\n	float x = 1.0 - fCos;\n	return fScaleDepth * exp(-0.00287 + x*(0.459 + x*(3.83 + x*(-6.80 + x*5.25))));\n}\n\nvoid main(void)\n{\n	// Get the ray from the camera to the vertex and its length (which is the far point of the ray passing through the atmosphere)\n	vec3 v3Ray = position - cameraPosition;\n	float fFar = length(v3Ray);\n	v3Ray /= fFar;\n\n	// Calculate the closest intersection of the ray with the outer atmosphere (which is the near point of the ray passing through the atmosphere)\n	float B = 2.0 * dot(cameraPosition, v3Ray);\n	float C = fCameraHeight2 - fOuterRadius2;\n	float fDet = max(0.0, B*B - 4.0 * C);\n	float fNear = 0.5 * (-B - sqrt(fDet));\n\n	// Calculate the ray's starting position, then calculate its scattering offset\n	vec3 v3Start = cameraPosition + v3Ray * fNear;\n	fFar -= fNear;\n	float fDepth = exp((fInnerRadius - fOuterRadius) / fScaleDepth);\n	float fCameraAngle = dot(-v3Ray, position) / length(position);\n	float fLightAngle = dot(v3LightPosition, position) / length(position);\n	float fCameraScale = scale(fCameraAngle);\n	float fLightScale = scale(fLightAngle);\n	float fCameraOffset = fDepth*fCameraScale;\n	float fTemp = (fLightScale + fCameraScale);\n\n	// Initialize the scattering loop variables\n	float fSampleLength = fFar / fSamples;\n	float fScaledLength = fSampleLength * fScale;\n	vec3 v3SampleRay = v3Ray * fSampleLength;\n	vec3 v3SamplePoint = v3Start + v3SampleRay * 0.5;\n\n	// Now loop through the sample rays\n	vec3 v3FrontColor = vec3(0.0, 0.0, 0.0);\n	vec3 v3Attenuate;\n	for(int i=0; i<nSamples; i++)\n	{\n		float fHeight = length(v3SamplePoint);\n		float fDepth = exp(fScaleOverScaleDepth * (fInnerRadius - fHeight));\n		float fScatter = fDepth*fTemp - fCameraOffset;\n		v3Attenuate = exp(-fScatter * (v3InvWavelength * fKr4PI + fKm4PI));\n		v3FrontColor += v3Attenuate * (fDepth * fScaledLength);\n		v3SamplePoint += v3SampleRay;\n	}\n\n	// Calculate the attenuation factor for the ground\n	c0 = v3Attenuate;\n	c1 = v3FrontColor * (v3InvWavelength * fKrESun + fKmESun);\n\n  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\n	//gl_TexCoord[0] = gl_TextureMatrix[0] * gl_MultiTexCoord0;\n	//gl_TexCoord[1] = gl_TextureMatrix[1] * gl_MultiTexCoord1;\n  vUv = uv;\n  vNormal = normal;\n}";
	    fragmentGround = "//\n// Atmospheric scattering fragment shader\n//\n// Author: Sean O'Neil\n//\n// Copyright (c) 2004 Sean O'Neil\n//\n// Ported for use with three.js/WebGL by James Baicoianu\n\n//uniform sampler2D s2Tex1;\n//uniform sampler2D s2Tex2;\n\nuniform float fNightScale;\nuniform vec3 v3LightPosition;\nuniform sampler2D tDiffuse;\nuniform sampler2D tDiffuseNight;\n\nvarying vec3 c0;\nvarying vec3 c1;\nvarying vec3 vNormal;\nvarying vec2 vUv;\n\nvoid main (void)\n{\n	//gl_FragColor = vec4(c0, 1.0);\n	//gl_FragColor = vec4(0.25 * c0, 1.0);\n	//gl_FragColor = gl_Color + texture2D(s2Tex1, gl_TexCoord[0].st) * texture2D(s2Tex2, gl_TexCoord[1].st) * gl_SecondaryColor;\n\n\n	vec3 diffuseTex = texture2D( tDiffuse, vUv ).xyz;\n	vec3 diffuseNightTex = texture2D( tDiffuseNight, vUv ).xyz;\n\n	vec3 day = diffuseTex * c0;\n	vec3 night = fNightScale * diffuseNightTex * diffuseNightTex * diffuseNightTex * (1.0 - c0);\n\n	gl_FragColor = vec4(c1, 1.0) + vec4(day + night, 1.0);\n\n}";

		atmosphere = {
			Kr: 0.0025,
			Km: 0.0010,
			ESun: 20,
			g: -0.950,
			innerRadius: 100,
			outerRadius: 103,
			wavelength: [0.650, 0.570, 0.475],
			scaleDepth: 0.25,
			mieScaleDepth: 0.1
		};

		//diffuse = THREE.ImageUtils.loadTexture(mapFile);
		diffuse = sphere.material.map;
		if (nightMap == undefined) {
			diffuseNight = sphere.material.map;
		} else {
			diffuseNight = nightMap;
		}
		maxAnisotropy = renderer.getMaxAnisotropy();

		diffuse.anisotropy = maxAnisotropy;

		diffuseNight.anisotropy = maxAnisotropy;

		var atmosphereSettings = setAtmosphere();

		uniforms = {
			v3LightPosition: {
				type: "v3",
				value: atmosphereSettings.atmosphereLight
			},
			v3InvWavelength: {
				type: "v3",
				value: new THREE.Vector3(1 / Math.pow(atmosphere.wavelength[0], 4), 1 / Math.pow(atmosphere.wavelength[1], 4), 1 / Math.pow(atmosphere.wavelength[2], 4))
			},
			fCameraHeight: {
				type: "f",
				value: atmosphereSettings.lightPosition.length()
			},
			fCameraHeight2: {
				type: "f",
				value: atmosphereSettings.lightPosition.length() * atmosphereSettings.lightPosition.length()
			},
			fInnerRadius: {
				type: "f",
				value: atmosphere.innerRadius
			},
			fInnerRadius2: {
				type: "f",
				value: atmosphere.innerRadius * atmosphere.innerRadius
			},
			fOuterRadius: {
				type: "f",
				value: atmosphere.outerRadius
			},
			fOuterRadius2: {
				type: "f",
				value: atmosphere.outerRadius * atmosphere.outerRadius
			},
			fKrESun: {
				type: "f",
				value: atmosphere.Kr * atmosphere.ESun
			},
			fKmESun: {
				type: "f",
				value: atmosphere.Km * atmosphere.ESun
			},
			fKr4PI: {
				type: "f",
				value: atmosphere.Kr * 4.0 * Math.PI
			},
			fKm4PI: {
				type: "f",
				value: atmosphere.Km * 4.0 * Math.PI
			},
			fScale: {
				type: "f",
				value: 1 / (atmosphere.outerRadius - atmosphere.innerRadius)
			},
			fScaleDepth: {
				type: "f",
				value: atmosphere.scaleDepth
			},
			fScaleOverScaleDepth: {
				type: "f",
				value: 1 / (atmosphere.outerRadius - atmosphere.innerRadius) / atmosphere.scaleDepth
			},
			g: {
				type: "f",
				value: atmosphere.g
			},
			g2: {
				type: "f",
				value: atmosphere.g * atmosphere.g
			},
			nSamples: {
				type: "i",
				value: 3
			},
			fSamples: {
				type: "f",
				value: 3.0
			},
			tDiffuse: {
				type: "t",
				value: diffuse
			},
			tDiffuseNight: {
				type: "t",
				value: diffuseNight
			},
			tDisplacement: {
				type: "t",
				value: 0
			},
			tSkyboxDiffuse: {
				type: "t",
				value: 0
			},
			fNightScale: {
				type: "f",
				value: $("#nightDarkness").val()
			}
		};

		sphere.material = new THREE.ShaderMaterial({
	        uniforms: uniforms,
	        vertexShader: vertexGround,
	        fragmentShader: fragmentGround
	    });

		sky = {
			geometry: new THREE.SphereGeometry(atmosphere.outerRadius, 200, 200),
			material: new THREE.ShaderMaterial({
				uniforms: uniforms,
				vertexShader: vertexSky,
				fragmentShader: fragmentSky
			})
		};
		sky.mesh = new THREE.Mesh(sky.geometry, sky.material);

		sky.material.side = THREE.BackSide;

		sky.material.transparent = true;
		var radAngle = $("#axialTilt").val() * (Math.PI/180);
		sky.mesh.rotateOnAxis(new THREE.Vector3(0,0,1), radAngle);

		scene.add(sky.mesh);

		$("#additionalAnim").show();
	}
	else {
		atmosphereEnabled = false;
		//scene.remove(atmosphere);
		sphere.material = new THREE.MeshPhongMaterial({map: diffuse, needsUpdate: true, shininess: 6});
		if (heightFile != undefined) {
			loadTerrain(heightFile, diffuse);
		}
		scene.remove(sky.mesh);
		render();
		$("#additionalAnim").hide();
	}
	window.setTimeout(function() {
		render();
		$(".loaderWrapper").hide();
	},500);
}

function updateAtmosphere(input) {
	if (input.id == "atmosphereC") {
		atmosphere.material.uniforms['c'].value = input.value;
	}
	else if (input.id == "atmosphereP") {
		atmosphere.material.uniforms['p'].value = input.value;
	}
	render();
}

function analyticsEvent(action) {
	ga('send', 'event', 'Button Click', action);
}

function showProjection() {
	analyticsEvent('Show Projection Area');
	$("#screenshotsContext").addClass('menuDisabled');
	window.removeEventListener('resize', windowResize, false);
	$("#contextMenu").css('display', 'none');
	$("#globalMenu > li").removeClass('menuSelected');
	$("#globalMenu > li").removeClass('menuSelected');
	$("#projectionArea").show();
	$("#globeCanvas").hide();
	initializeProjection();
}

function hideProjection() {
	$("#screenshotsContext").removeClass('menuDisabled');
	window.addEventListener('resize', windowResize, false);
	options.length = 0;
	$("#projectionArea").hide();
	$("#globeCanvas").show();
}

function initializeProjection() {
	document.getElementById('projectionCanvas').width = window.innerWidth - 150;
	document.getElementById('projectionCanvas').height = (window.innerWidth - 150) / 2;
	var scale = (projectionCanvas.width+1)/2/Math.PI;
	options = [
		//{name: "Aitoff", projection: d3.geo.aitoff().scale(scale).translate([projectionCanvas.width/2, projectionCanvas.height/2])},
		//{name: "Albers", projection: d3.geo.albers().scale(scale).translate([projectionCanvas.width/2, projectionCanvas.height/2])},
		{name: "August", projection: d3.geo.august().scale(scale*.4).translate([projectionCanvas.width/2, projectionCanvas.height/2])},
		{name: "Baker", projection: d3.geo.baker().scale(scale*.7).translate([projectionCanvas.width/2, projectionCanvas.height/2])},
		{name: "Boggs", projection: d3.geo.boggs().scale(scale*1.05).translate([projectionCanvas.width/2, projectionCanvas.height/2])},
		{name: "Bonne", projection: d3.geo.bonne().scale(scale*.75).translate([projectionCanvas.width/2, (projectionCanvas.height+180)/2])},
		//{name: "Bromley", projection: d3.geo.bromley().scale(scale).translate([projectionCanvas.width/2, projectionCanvas.height/2])},
		//{name: "Collignon", projection: d3.geo.collignon().scale(scale*.62).translate([projectionCanvas.width/2, (projectionCanvas.height+100)/2])},
		{name: "Craster Parabolic", projection: d3.geo.craster().scale(scale).translate([projectionCanvas.width/2, projectionCanvas.height/2])},
		{name: "Eckert I", projection: d3.geo.eckert1().scale(scale).translate([projectionCanvas.width/2, projectionCanvas.height/2])},
		//{name: "Eckert II", projection: d3.geo.eckert2().scale(scale).translate([projectionCanvas.width/2, projectionCanvas.height/2])},
		{name: "Eckert III", projection: d3.geo.eckert3().scale(scale*1.15).translate([projectionCanvas.width/2, projectionCanvas.height/2])},
		{name: "Eckert IV", projection: d3.geo.eckert4().scale(scale*1.181).translate([projectionCanvas.width/2, projectionCanvas.height/2])},
		{name: "Eckert V", projection: d3.geo.eckert5().scale(scale*1.12).translate([projectionCanvas.width/2, projectionCanvas.height/2])},
		{name: "Eckert VI", projection: d3.geo.eckert6().scale(scale*1.13).translate([projectionCanvas.width/2, projectionCanvas.height/2])},
		{name: "Eisenlohr", projection: d3.geo.eisenlohr().scale(scale*.37).translate([projectionCanvas.width/2, projectionCanvas.height/2])},
		{name: "Equirectangular (Plate Carrée)", projection: d3.geo.equirectangular().scale(scale).translate([projectionCanvas.width/2, projectionCanvas.height/2])},
		{name: "Fahey", projection: d3.geo.fahey().scale(scale*.865).translate([projectionCanvas.width/2, projectionCanvas.height/2])},
		{name: "Gall Stereographic", projection: d3.geo.cylindricalStereographic().parallel(45).scale(scale*.9).translate([projectionCanvas.width/2, projectionCanvas.height/2])},
		{name: "Goode Homolosine", projection: d3.geo.homolosine().scale(scale).translate([projectionCanvas.width/2, projectionCanvas.height/2])},
		{name: "Ginzburg IV", projection: d3.geo.ginzburg4().scale(scale*.94).translate([projectionCanvas.width/2, projectionCanvas.height/2])},
		{name: "Ginzburg V", projection: d3.geo.ginzburg5().scale(scale*.94).translate([projectionCanvas.width/2, projectionCanvas.height/2])},
		//{name: "Ginzburg VI", projection: d3.geo.ginzburg6().scale(scale*.8).translate([projectionCanvas.width/2, projectionCanvas.height/2])},
		//{name: "Ginzburg VIII", projection: d3.geo.ginzburg8().scale(scale).translate([projectionCanvas.width/2, projectionCanvas.height/2])},
		//{name: "Ginzburg IX", projection: d3.geo.ginzburg9().scale(scale*.8).translate([projectionCanvas.width/2, projectionCanvas.height/2])},
		//{name: "Gringorten", projection: d3.geo.gringorten().scale(scale).translate([projectionCanvas.width/2, projectionCanvas.height/2])},
		//{name: "Guyou", projection: d3.geo.guyou().scale(scale*.6).translate([projectionCanvas.width/2, projectionCanvas.height/2])},
		//{name: "Hammer", projection: d3.geo.hammer().scale(scale*1.1).translate([projectionCanvas.width/2, projectionCanvas.height/2])},
		//{name: "Hill", projection: d3.geo.hill().scale(scale).translate([projectionCanvas.width/2, projectionCanvas.height/2])},
		{name: "Kavrayskiy VII", projection: d3.geo.kavrayskiy7().scale(scale).translate([projectionCanvas.width/2, projectionCanvas.height/2])},
		{name: "Lagrange", projection: d3.geo.lagrange().scale(scale*.785).translate([projectionCanvas.width/2, projectionCanvas.height/2])},
		//{name: "Lambert cylindrical equal-area", projection: d3.geo.cylindricalEqualArea().scale(scale).translate([projectionCanvas.width/2, projectionCanvas.height/2])},
		//{name: "Larrivée", projection: d3.geo.larrivee().scale(scale*.6).translate([projectionCanvas.width/2, projectionCanvas.height/2])},
		{name: "Laskowski", projection: d3.geo.laskowski().scale(scale*.85).translate([projectionCanvas.width/2, projectionCanvas.height/2])},
		{name: "Loximuthal", projection: d3.geo.loximuthal().scale(scale).translate([projectionCanvas.width/2, projectionCanvas.height/2])},
		//{name: "Mercator", projection: d3.geo.mercator().scale(scale*.5).translate([projectionCanvas.width/2, projectionCanvas.height/2])},
		//{name: "Miller", projection: d3.geo.miller().scale(scale*.68).translate([projectionCanvas.width/2, projectionCanvas.height/2])},
		//{name: "McBryde–Thomas Flat-Polar Parabolic", projection: d3.geo.mtFlatPolarParabolic().scale(scale*1.07).translate([projectionCanvas.width/2, projectionCanvas.height/2])},
		{name: "McBryde–Thomas Flat-Polar Quartic", projection: d3.geo.mtFlatPolarQuartic().scale(scale*1.181).translate([projectionCanvas.width/2, projectionCanvas.height/2])},
		{name: "McBryde–Thomas Flat-Polar Sinusoidal", projection: d3.geo.mtFlatPolarSinusoidal().scale(scale*1.09).translate([projectionCanvas.width/2, projectionCanvas.height/2])},
		{name: "Mollweide", projection: d3.geo.mollweide().scale(scale*1.11).translate([projectionCanvas.width/2, projectionCanvas.height/2])},
		{name: "Natural Earth", projection: d3.geo.naturalEarth().scale(scale*1.1).translate([projectionCanvas.width/2, projectionCanvas.height/2])},
		//{name: "Nell–Hammer", projection: d3.geo.nellHammer().scale(scale).translate([projectionCanvas.width/2, projectionCanvas.height/2])},
		//{name: "Polyconic", projection: d3.geo.polyconic().scale(scale*.5).translate([projectionCanvas.width/2, projectionCanvas.height/2])},
		{name: "Rectangular Polyconic", projection: d3.geo.rectangularPolyconic().scale(scale*.82).translate([projectionCanvas.width/2, projectionCanvas.height/2])},
		{name: "Robinson", projection: d3.geo.robinson().scale(scale).translate([projectionCanvas.width/2, projectionCanvas.height/2])},
		{name: "Sinusoidal", projection: d3.geo.sinusoidal().scale(scale).translate([projectionCanvas.width/2, projectionCanvas.height/2])},
		//{name: "Sinu-Mollweide", projection: d3.geo.sinuMollweide().scale(scale).translate([projectionCanvas.width/2, projectionCanvas.height/2])},
		{name: "Times", projection: d3.geo.times().scale(scale*.925).translate([projectionCanvas.width/2, projectionCanvas.height/2])},
		{name: "Van der Grinten", projection: d3.geo.vanDerGrinten().scale(scale*.5).translate([projectionCanvas.width/2, projectionCanvas.height/2])},
		{name: "Van der Grinten II", projection: d3.geo.vanDerGrinten2().scale(scale*.5).translate([projectionCanvas.width/2, projectionCanvas.height/2])},
		//{name: "Van der Grinten III", projection: d3.geo.vanDerGrinten3().scale(scale*.5).translate([projectionCanvas.width/2, projectionCanvas.height/2])},
		//{name: "Van der Grinten IV", projection: d3.geo.vanDerGrinten4().scale(scale).translate([projectionCanvas.width/2, projectionCanvas.height/2])},
		{name: "Wagner IV", projection: d3.geo.wagner4().scale(scale*1.155).translate([projectionCanvas.width/2, projectionCanvas.height/2])},
		{name: "Wagner VI", projection: d3.geo.wagner6().scale(scale).translate([projectionCanvas.width/2, projectionCanvas.height/2])},
		//{name: "Wagner VII", projection: d3.geo.wagner7().scale(scale).translate([projectionCanvas.width/2, projectionCanvas.height/2])},
		{name: "Winkel Tripel", projection: d3.geo.winkel3().scale(scale).translate([projectionCanvas.width/2, projectionCanvas.height/2])},
		{name: "Waterman Butterfly", projection: d3.geo.polyhedron.waterman().scale(scale*.7).translate([projectionCanvas.width/2, projectionCanvas.height/2])},
		{name: "Gnomonic Butterfly", projection: d3.geo.polyhedron.butterfly().scale(scale*.62).translate([projectionCanvas.width/2, projectionCanvas.height/1.35])}
	];

	var select = document.getElementById('projectionSelect');
	if (select.options.length == 0) {
		for (var i=0; i<options.length; i++) {
			var element = document.createElement('option');
			element.textContent = options[i].name;
			element.value = options[i].name;
			select.appendChild(element);
		}
	}
	$("#projectionSelect").val("Equirectangular (Plate Carrée)");

	if (typeof mapFile != 'undefined') {
		var projCanvas = document.getElementById('projectionCanvas');
		var projCtx = projCanvas.getContext('2d');
		var tempImage = new Image();
		if (mapFile.indexOf("imgur.com") > -1) {
			tempImage.crossOrigin = "Anonymous";
		}
		tempImage.onload = function() {
			projCtx.drawImage(tempImage,0,0, projCanvas.width, projCanvas.height);
			$("#projImage").attr('src', $("#imgCanvas").attr('src'));
			$("#projImage").css('width', projCanvas.width);
			$("#projImage").css('height', projCanvas.height);
		};
		tempImage.src = mapFile;
	}
}

function updateMapProjection(selection) {
	var projection = options[selection.selectedIndex].projection;
	var projCanvas = document.getElementById('projectionCanvas');
	var projCtx = projCanvas.getContext('2d');
	projCtx.clearRect(0, 0, projCanvas.width, projCanvas.height);
	var tempImage = new Image();
	if (mapFile.indexOf("imgur.com") > -1) {
		tempImage.crossOrigin = "Anonymous";
	}
	tempImage.onload = function() {
		projCtx.drawImage(tempImage,0,0, projCanvas.width, projCanvas.height);

		var dx = projCanvas.width;
		var dy = projCanvas.height;

		var sourceData = projCtx.getImageData(0, 0, dx, dy).data;
	    var target = projCtx.createImageData(dx, dy);
	    var targetData = target.data;

		for (var y = 0, i = -1; y < dy; ++y) {
	        for (var x = 0; x < dx; ++x) {
	            var p = projection.invert([x, y]);
	            if (!p) {
	            	targetData[++i] = 0;
	            	targetData[++i] = 0;
	            	targetData[++i] = 0;
	            	targetData[++i] = 0;
	            	continue;
	            }
	            var λ = p[0],
	                φ = p[1];
	            if (λ > 180 || λ < -180 || φ > 90 || φ < -90) {
	                i += 4;
	                continue;
	            }
	            var q = ((90 - φ) / 180 * dy | 0) * dx + ((180 + λ) / 360 * dx | 0) << 2;
	            targetData[++i] = sourceData[q];
	            targetData[++i] = sourceData[++q];
	            targetData[++i] = sourceData[++q];
	            targetData[++i] = 255;
	        }
	    }
	    projCtx.clearRect(0, 0, dx, dy);
	    projCtx.putImageData(target, 0, 0);
	}
	tempImage.src = mapFile;
	$(".loaderWrapper").hide();
}

function setSphereTilt(angle) {
	var radAngle = angle * (Math.PI/180);
	sphere.rotateOnAxis(new THREE.Vector3(0,0,1), radAngle - sphere.rotation.z);
	render();
}

function drawGraticule(color) {
	var width = document.getElementById('gridCanvas').width,
		height = document.getElementById('gridCanvas').height,
		graticule = d3.geo.graticule();
	var gridCanvas = d3.select('#gridCanvas');
	var gridCtx = gridCanvas.node().getContext("2d");
	gridCtx.clearRect(0, 0, gridCanvas.node().width, gridCanvas.node().height);
	var projection = d3.geo.equirectangular().scale((width)/2/Math.PI).translate([width/2, height/2]);
	var path = d3.geo.path().projection(projection).context(gridCtx);

	//See here for dragging d3 canvas: https://stackoverflow.com/questions/18642664/using-d3-behavior-drag-to-pan-a-map

	// Style graticule
	graticule.step([$("#meridianInt").val(), $("#parallelInt").val()]);
    gridCtx.beginPath();
    path(graticule());
    gridCtx.lineWidth = 0.5;
    gridCtx.strokeStyle = (color != undefined) ? "#"+color : "#ddd";
    gridCtx.stroke();
    canvasToImage(gridCanvas[0][0]);
}

//Start looking for file uploads only after page has loaded
window.onload = function() {
	init();
	$("#showGrid").on('click', function() {
		$("#gridSettings").slideToggle();
		if (this.checked) {
			drawGraticule();
		} else {
			var gridCanvas = document.getElementById('gridCanvas');
			var gridCtx = gridCanvas.getContext("2d");
			gridCtx.clearRect(0, 0, gridCanvas.width, gridCanvas.height);
			canvasToImage(gridCanvas);
		}
	});
	$("#blackBG").on('click', function() {
		if (this.checked) {
			backgroundMesh.material.color.setHex(0x000000);
		} else {
			backgroundMesh.material.color.setHex(0x0F0F0F);
		}
		backgroundMesh.geometry.buffersNeedUpdate = true;
		backgroundMesh.geometry.uvsNeedUpdate = true;
		render();
	});

	if (savedData != undefined)	setOptions();

	var validImgExt = ["jpeg", "gif", "png", "jpg"];

	Math.seedrandom();
	var randomNum = Math.random() + '';
	$("#generateSeed").val(randomNum.replace("0.", ""));

	$("#worldWidth").val(canvas.width);
	$("#worldHeight").val(canvas.height);

	var a = document.createElement('a');
	if (typeof a.download == "undefined")
	    document.getElementById('takeScreenshot').disabled = true;

	$("#radius").on('input', function() {
		calcDistance();
	});

	$("#globalMenu > li.menuDropdown").on('click', function() {
		if (!$(this).hasClass('menuSpecial')) {
			if ($(this).hasClass('menuSelected')) {
				$("#contextMenu").fadeOut(75);
				$(this).removeClass('menuSelected');
			}
			else if (!$(this).hasClass('menuSelected') && !$("#contextMenu").is(":visible") && !$(this).hasClass('menuDisabled'))
			{
				$("#contextMenu").fadeIn(75);
				$(this).addClass('menuSelected');
				$("#contextMenu > div").removeClass('submenuSelected');
				$("#contextMenu > div." + $(this).attr('id')).addClass('submenuSelected');
			}
			else if (!$(this).hasClass('menuDisabled')) {
				$("#globalMenu > li").removeClass('menuSelected');
				$(this).addClass('menuSelected');
				$("#contextMenu > div").removeClass('submenuSelected');
				$("#contextMenu > div." + $(this).attr('id')).addClass('submenuSelected');
			}
		}
		else if ($(this).attr('id') == 'projections') {
			($("#projectionArea").is(':hidden')) ? showProjection() : hideProjection();
		}
	});

	// Menu items are <li>, so they get no keyboard activation for free.
	$("#globalMenu > li[role='button']").on('keydown', function(event) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			this.click();
		}
	});

	$("#save").on('click', function() {
		if (confirm("Save all settings and images?")) {
			saveUrl();
		}
	});

	$("#takeScreenshot").on('click', function() {
		analyticsEvent('Take screenshot');
		var screenArray = [];
		var screens = $("input[name=screenshotType]:checked").val();
		var rotationVector = new THREE.Vector3(0,1,0);
		var angle = ((360 / screens) * Math.PI) / 180;
		var j=0;
		for (var i=0; i < screens; i++) {
		    setTimeout(function() {
		        screenArray.push(takeScreen());
		        sphere.rotateOnAxis(rotationVector, angle);
		        render();
		        j++;
		        if (j == screens) processScreens();
		    }, 1);
		}
		function processScreens() {
			if (screenArray.length > 1) {
				var zip = new JSZip();
				var content;
				var i=1;
				screenArray.forEach(function(item) {
					zip.file("image" + i + ".png", item[0], {base64:true});
					i++;
				})
				content = zip.generate({type:"blob"});
				document.getElementById("exportLink").href = URL.createObjectURL(content);
			    document.getElementById("exportLink").download = "GlobeImages.zip";
			    document.getElementById("exportLink").click();
			} else {
				document.getElementById("exportLink").href = URL.createObjectURL(screenArray[0][1]);
			    document.getElementById("exportLink").download = "globe.png";
			    document.getElementById("exportLink").click();
			}
		}
	});

	$(".makeGif").on('click', function() {
		analyticsEvent('Make gif');
		canceled = false;
		$(".cancelGenerate").hide();
		$("[data-remodal-id=generateWorking]").remodal().open();
		$("#counterValue").show();
		document.getElementById('stepText').innerHTML = "Capturing frames...";
		var rotateDir = $("input[name=rotateDir]:checked").val();
		var thisValue = $(this).val();
		var gifAspect = window.innerWidth / window.innerHeight;
		var tempGifCanvas = document.createElement('canvas');
		tempGifCanvas.width = 1000;
		tempGifCanvas.height = tempGifCanvas.width / gifAspect;
		var tempGifCanvasCtx = tempGifCanvas.getContext('2d');
		var j = 0;
		var gif = new GIF({
			workers: 10,
			quality: 5,
			width: tempGifCanvas.width,
			height: tempGifCanvas.height
		});

		function getFrames() {
			if (thisValue == "Rotating globe (fixed sun)") {
				var frameCount = 200;
				var angle = rotateDir * ((360 / frameCount) * Math.PI) / 180;
				var sunPosX = $("#sunPosX").val();
				var sunPosY = $("#sunPosY").val();
				var sunPosZ = $("#sunPosZ").val();
				var vector = new THREE.Vector3(sunPosX/6000, sunPosY/6000, sunPosZ/6000);
				var axis = new THREE.Vector3(0,1,0);
				var rotateAxis = 1/(Math.cos(23));
				function rotateWorld() {
					$("#counterValue").text((j+1) + " of " + frameCount);
					tempGifCanvasCtx.clearRect ( 0 , 0 , canvas.width, canvas.height );
					var gifCanvas = document.getElementById('globeCanvas');
					tempGifCanvasCtx.drawImage(gifCanvas, 0, 0, tempGifCanvas.width, tempGifCanvas.height);
					gif.addFrame(tempGifCanvasCtx, {copy: true, delay: 50});
					sphere.rotateOnAxis(new THREE.Vector3(0,1,0), angle);
					if (atmosphereEnabled) {
						vector.applyAxisAngle(axis,angle);
						var atmosphereLight = vector;
						vector = vector;
						var lightPosition = camera.position;
						sky.material.uniforms.v3LightPosition.value = atmosphereLight;
						sky.material.uniforms.fCameraHeight.value = lightPosition.length();
						sky.material.uniforms.fCameraHeight2.value = lightPosition.length() * lightPosition.length();
						sphere.material.uniforms.v3LightPosition.value = atmosphereLight;
						sphere.material.uniforms.fCameraHeight.value = lightPosition.length();
						sphere.material.uniforms.fCameraHeight2.value = lightPosition.length() * lightPosition.length();
					}
					render();
					j++;
					if (j<frameCount && !canceled) {
						setTimeout(rotateWorld, 1);
					} else if (j==frameCount) {
						renderGif();
					} else if (canceled) {
						canceled = false;
					}
				}
				rotateWorld();
			}
			else if (thisValue == "Rotating sun (fixed globe)") {
				var sunPosX = $("#sunPosX").val();
				var sunPosY = $("#sunPosY").val();
				var sunPosZ = $("#sunPosZ").val();
				var vector = new THREE.Vector3(sunPosX/6000, sunPosY/6000, sunPosZ/6000);
				var rotateSpeed = $("#sunRotateSpeed").val();

				var quat = new THREE.Quaternion();
				var axis = new THREE.Vector3(-vector.y,vector.x,0);
				var angle = 0;

				function rotateSun() {
					$("#counterValue").text((j+1) + " of " + frameCount);
					tempGifCanvasCtx.clearRect ( 0 , 0 , canvas.width, canvas.height );
					var gifCanvas = document.getElementById('globeCanvas');
					tempGifCanvasCtx.drawImage(gifCanvas, 0, 0, tempGifCanvas.width, tempGifCanvas.height);
					gif.addFrame(tempGifCanvasCtx, {copy: true, delay: 50});
					var vector = new THREE.Vector3(sunPosX/6000, sunPosY/6000, sunPosZ/6000);
					var atmosphereLight = vector;
					var lightPosition = camera.position;
					angle -= rotateSpeed * rotateDir * -1;
					quat.setFromAxisAngle(axis,angle);
					atmosphereLight = atmosphereLight.applyQuaternion(quat);
					sky.material.uniforms.v3LightPosition.value = atmosphereLight;
					sky.material.uniforms.fCameraHeight.value = lightPosition.length();
					sky.material.uniforms.fCameraHeight2.value = lightPosition.length() * lightPosition.length();
					sphere.material.uniforms.v3LightPosition.value = atmosphereLight;
					sphere.material.uniforms.fCameraHeight.value = lightPosition.length();
					sphere.material.uniforms.fCameraHeight2.value = lightPosition.length() * lightPosition.length();
					render();
					if (Math.abs(angle)<(2*Math.PI)) {
						setTimeout(rotateSun, 1);
					} else {
						renderGif();
					}
				}
				rotateSun();
			}
		};
		getFrames();

		function renderGif() {
			document.getElementById('stepText').innerHTML = "Making gif from frames...";
			gif.on('progress', function(p) {
				$("#counterValue").text(Math.round(p*100) + "%");
				if (canceled) gif.abort();
			});
			gif.on('finished', function(blob) {
				$("#counterValue").hide();
				$(".cancelGenerate").show().html("Close");
				var gifUrl = URL.createObjectURL(blob);
				document.getElementById('stepText').innerHTML = "Finished! Click <a href='" + gifUrl + "' download='globeGif.gif'>here</a> to download the gif.";
				var gifImage = new Image();
				$("#stepText").after(gifImage);
				gifImage.src = URL.createObjectURL(blob);
				gifImage.id = "gifImage";
			});
			gif.render();
			$(tempGifCanvas).remove();
		}
	});

	//Heightmap type change
	$("input[name=heightMethod]:radio").change(function() {
		analyticsEvent('Heightmap method changed');
		if (heightFile != null || heightFile != undefined) {
			if (this.id == "Vheight") {
				scene.remove(sphere);
			    camera.remove(lightCamera);
			    scene.add(lightCamera);
			    lightCamera.position.z = -225;
			    scene.add(heightSphere);
			}
			else {
				scene.remove(heightSphere);
				scene.remove(lightCamera);
				scene.add(sphere);
				lightCamera.position.z = 225;
				lightCamera.add(light);
				camera.add(lightCamera);
			}
		}
		render();
	});

	$("input[name=bgType]:radio").change(function() {
		analyticsEvent('Background view changed');
		if (this.id =="bg2d") {
			//backgroundScene.remove(backgroundMesh);
			scene.remove(backgroundSphere);
		} else {
			scene.add(backgroundSphere);
		}
	})

	$("#worldReset").on('click', function() {
		$("#noiseScale, output[for='noiseScale'").val(10);
		$("#oceanLevel, output[for='oceanLevel'").val(140);
		$("#simplexSize, output[for='simplexSize'").val(300);
		$("#octaves, output[for='octaves'").val(5);
		$("#worldRough, output[for='worldRough'").val(0.6);
		$(".generateProp").change();
	})

	$("#worldDownload").on('click', function() {
		var data = $("#imgCanvas").attr('src');
		data = data.replace(new RegExp("data:image.*base64,"), "");
	    //Convert to blob due to Chrome bug with long URIs
	    var sliceSize = 512;
	    var byteCharacters = atob(data);
	    var byteArrays = [];
	    for (var offset = 0; offset < byteCharacters.length; offset += sliceSize) {
	        var slice = byteCharacters.slice(offset, offset + sliceSize);

	        var byteNumbers = new Array(slice.length);
	        for (var i = 0; i < slice.length; i++) {
	            byteNumbers[i] = slice.charCodeAt(i);
	        }

	        var byteArray = new Uint8Array(byteNumbers);

	        byteArrays.push(byteArray);
	    }
	    var blob = new Blob(byteArrays, {type: 'image/octet-stream'});
		document.getElementById("exportLink").href = URL.createObjectURL(blob);
	    document.getElementById("exportLink").download = "new world.png";
	    document.getElementById("exportLink").click();
	})

	$(".generateProp, #sunRotateSpeed").on('input', function() {
		var id = $(this).attr('id');
		var value = $(this).val();
		$("output[for=" + id + "]").text(value);
	})

	$("#worldWidth, #worldHeight").on('keydown', function(e) {
		// Allow: backspace, delete, tab, escape, enter and .
        if ($.inArray(e.keyCode, [46, 8, 9, 27, 13, 110, 190]) !== -1 ||
             // Allow: Ctrl+A
            (e.keyCode == 65 && e.ctrlKey === true) ||
             // Allow: home, end, left, right
            (e.keyCode >= 35 && e.keyCode <= 39)) {
                 // let it happen, don't do anything
                 return;
        }
        // Ensure that it is a number and stop the keypress
        if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
            e.preventDefault();
        }
	})

	$("#worldWidth, #worldHeight").on('change', function() {
		if ($(this).attr('id') == 'worldWidth') {
			if ($(this).val() == "" || $(this).val() < 200) {
				$(this).val($("#worldHeight").val() * 2);
			}
			else
				$("#worldHeight").val($(this).val() / 2);
		}
		else {
			if ($(this).val() == "" || $(this).val() < 100) {
				$(this).val($("#worldWidth").val() / 2);
			}
			else
				$("#worldWidth").val($(this).val() * 2);
		}
	})

	$("#newSeed").on('click', function() {
		Math.seedrandom();
		var seed = Math.random() + "";
		$("#generateSeed").val(seed.replace('0.', ''));
	})

	$("#colorPick").colpick({
		layout: 'hex',
		submit: false,
		onChange: function(hsb,hex,rgb,el,bySetColor) {
			atmosphereColor = hex;
			var r = parseFloat(rgb.r / 255).toFixed(3);
			var g = parseFloat(rgb.g / 255).toFixed(3);
			var b = parseFloat(rgb.b / 255).toFixed(3);
			sky.material.uniforms.v3InvWavelength.value = new THREE.Vector3(1 / Math.pow(r, 4), 1 / Math.pow(g, 4), 1 / Math.pow(b, 4));
			//sphere.material.uniforms.v3InvWavelength.value = new THREE.Vector3(1 / Math.pow(r, 4), 1 / Math.pow(g, 4), 1 / Math.pow(b, 4));
			//atmosphere.material.uniforms.glowColor.value.setHex("0x" + hex);
			render();
		}
	});

	$("#gridColor").colpick({
		layout: 'hex',
		color: "#ffffff",
		onSubmit: function(hsb,hex,rgb,el) {
			drawGraticule(hex),
			$(el).css('background-color', '#'+hex);
			$(el).colpickHide();
		}
	}).css('background-color', "#ffffff");

	$("#meridianInt, #parallelInt").on('change', function() {
		drawGraticule();
	});

	$(".closeButton").on('click', function() {
		$(this).parent().parent().parent().fadeOut(150);
	})

	$("#getImgurLabel").on('click', function() {
		analyticsEvent('Get image from Imgur');
	})

	$("#imgurUrlBox").on('input propertychange paste', function() {
		if (($.inArray($(this).val().split('.').pop(), validImgExt)) == -1)
			$("#getImgurUrl").hide();
		else
			$("#getImgurUrl").show();
	})

	$("#getImgurUrl").on('click', function() {
		var imageRegex = /imgur\.com\/(.+)\..+/;
		window.location.href = window.location.href.split('?')[0] + "?map=" + imageRegex.exec($("#imgurUrlBox").val())[1];
	})

	$(".cancelGenerate").on('click', function() {
		analyticsEvent('Generate canceled');
		//canceled = true;
	})

	$("#projDownload").on('click', function() {
		if (typeof mapFile != 'undefined') {
			analyticsEvent('Download Map Projection');
			var projCanvas = document.getElementById('projectionCanvas');
			var data = projCanvas.toDataURL("image/png");
			data = data.replace(new RegExp("data:image.*base64,"), "");
		    //Convert to blob due to Chrome bug with long URIs
		    var sliceSize = 512;
		    var byteCharacters = atob(data);
		    var byteArrays = [];
		    for (var offset = 0; offset < byteCharacters.length; offset += sliceSize) {
		        var slice = byteCharacters.slice(offset, offset + sliceSize);

		        var byteNumbers = new Array(slice.length);
		        for (var i = 0; i < slice.length; i++) {
		            byteNumbers[i] = slice.charCodeAt(i);
		        }

		        var byteArray = new Uint8Array(byteNumbers);

		        byteArrays.push(byteArray);
		    }
		    var blob = new Blob(byteArrays, {type: 'image/octet-stream'});
		    document.getElementById("exportLink").href = URL.createObjectURL(blob);
		    document.getElementById("exportLink").download = $("#projectionSelect option:selected").text() + ".png";
		    document.getElementById("exportLink").click();
		}
	})

	$(".sunPosition").on('change input', function() {
		var thisControl = this;
		if (atmosphereEnabled) {
			if (thisControl.id == "sunPosZ") {
				var sunPosX = $("#sunPosX").val();
				var sunPosY = $("#sunPosY").val();
				var sunPosZ = $("#sunPosZ").val();
				var vector = new THREE.Vector3(sunPosX/6000, sunPosY/6000, sunPosZ/6000);
				var axis = new THREE.Vector3(0,1,0);
				var angle = (thisControl.value/6000) * Math.PI * -1;
				vector.applyAxisAngle(axis,angle);
				var atmosphereLight = vector;
				lightVector = vector;
				var lightPosition = camera.position;
				sky.material.uniforms.v3LightPosition.value = atmosphereLight;
				sky.material.uniforms.fCameraHeight.value = lightPosition.length();
				sky.material.uniforms.fCameraHeight2.value = lightPosition.length() * lightPosition.length();
				sphere.material.uniforms.v3LightPosition.value = atmosphereLight;
				sphere.material.uniforms.fCameraHeight.value = lightPosition.length();
				sphere.material.uniforms.fCameraHeight2.value = lightPosition.length() * lightPosition.length();
			} else {
				var atmosphereSettings = setAtmosphere();
				sky.material.uniforms.v3LightPosition.value = atmosphereSettings.atmosphereLight;
				sky.material.uniforms.fCameraHeight.value = atmosphereSettings.lightPosition.length();
				sky.material.uniforms.fCameraHeight2.value = atmosphereSettings.lightPosition.length() * atmosphereSettings.lightPosition.length();
				sphere.material.uniforms.v3LightPosition.value = atmosphereSettings.atmosphereLight;
				sphere.material.uniforms.fCameraHeight.value = atmosphereSettings.lightPosition.length();
				sphere.material.uniforms.fCameraHeight2.value = atmosphereSettings.lightPosition.length() * atmosphereSettings.lightPosition.length();
			}
			render();
		} else {
			switch (thisControl.id) {
				case "sunPosX":
					lightCamera.position.x = thisControl.value;
					render();
					break;
				case "sunPosY":
					lightCamera.position.y = thisControl.value;
					render();
					break;
				case "sunPosZ":
					lightCamera.position.z = thisControl.value;
					render();
					break;
			}
		}
	})

	$(".atmosphereSettings").on('input', function() {
		var thisControl = this;
		switch (thisControl.id) {
			case "nightDarkness":
				sky.material.uniforms.fNightScale.value = thisControl.value;
				sphere.material.uniforms.fNightScale.value  = thisControl.value;
				render();
				break;
			case "rScattering":
				sky.material.uniforms.fKrESun.value = thisControl.value * atmosphere.ESun;
				sky.material.uniforms.fKr4PI.value = thisControl.value * 4.0 * Math.PI;
				sphere.material.uniforms.fKrESun.value = thisControl.value * atmosphere.ESun;
				sphere.material.uniforms.fKr4PI.value = thisControl.value * 4.0 * Math.PI;
				render();
				break;
			case "mScattering":
				sky.material.uniforms.fKmESun.value = thisControl.value * atmosphere.ESun;
				sky.material.uniforms.fKm4PI.value = thisControl.value * 4.0 * Math.PI;
				sphere.material.uniforms.fKmESun.value = thisControl.value * atmosphere.ESun;
				sphere.material.uniforms.fKm4PI.value = thisControl.value * 4.0 * Math.PI;
				render();
				break;
		}
	})

	$(window).on('keypress', function(e) {
		if (e.keyCode == 111) {
			earthObject = scene.getObjectByName("earthSphere");
			if (earthObject === undefined) {
				$("#imgCanvas").before("<img src='http://i.imgur.com/oeQ0op3.png' id='earthOverlay'>");
				$("#earthOverlay").css({
					'width': $("#imgCanvas").width(),
					'height': $("#imgCanvas").height(),
					'position': 'absolute',
					'left': $("#imgCanvas").css("left"),
					'top': $("#imgCanvas").css("top"),
					'z-index': '9',
					'opacity': '0.3'
				})
				THREE.ImageUtils.crossOrigin = '';
				var earthOverlay = THREE.ImageUtils.loadTexture("http://i.imgur.com/oeQ0op3.png", {}, function() {render()});
				var earthGeometry = new THREE.SphereGeometry(101,100,100);
				var earthMaterial = new THREE.MeshBasicMaterial({map: earthOverlay, transparent: true, opacity: 0.5});
				var earthSphere = new THREE.Mesh(earthGeometry, earthMaterial);
				earthSphere.name = "earthSphere";
				scene.add(earthSphere);
				render();
				$(window).on('mousemove', function(e) {
					if (!mousedown) {
						return;
					}
					e.preventDefault;
					var deltaX = e.clientX - mouseX;
					var deltaY = e.clientY - mouseY;
					mouseX = e.clientX;
					mouseY = e.clientY;
					rotateEarth(deltaX, deltaY);
				});
			} else {
				$("#earthOverlay").remove();
				scene.remove(earthObject);
				render();
				$(window).off('mousemove');
			}
		}
	})

	$(window).on('mousedown', function(e) {
		if (e.which == 3) {
			mousedown = true;
			mouseX = e.clientX;
			mouseY = e.clientY;
		}
	}).mouseup(function(e) {
		if (mousedown) {
			e.preventDefault();
			mousedown = false;
		}
	});

	function rotateEarth(deltaX, deltaY) {
		earthObject = scene.getObjectByName("earthSphere");
		earthObject.rotation.y += deltaX / 300;
		earthObject.rotation.x += deltaY / 300;
		render();
	}
}
