var canvas, tool, ctx, isDrawing, width, height, controls;
var tool_default = 'pen';
var tools = {};
var curColor = {r: 0, g: 0, b:0};
var step = -1;
var pushArray = new Array();
function flatInit() {
	canvas = document.getElementById('flatCanvas');
	ctx = canvas.getContext('2d');
	width = window.innerWidth - 350;
	height = width / 2;

	canvas.width = width;
	canvas.height = height;

	$("table").css('height', height);
	$("table").css('width', width);

	if (tools[tool_default]) {
      tool = new tools[tool_default]();
    }

    //Temporary canvas
    var container = canvas.parentNode;
    tempCanvas = document.createElement('canvas');
    tempCanvas.id = 'tempCanvas';
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    container.appendChild(tempCanvas);
    tempCtx = tempCanvas.getContext('2d');

    //gridCanvas
    gridCanvas = document.getElementById('gridCanvas');
    gridCanvas.width = width;
    gridCanvas.height = height;

    $("#imgCanvas").attr('height', canvas.height);
    $("#imgCanvas").attr('width', canvas.width);

    tempCanvas.addEventListener('mousedown', ev_canvas, false);
    tempCanvas.addEventListener('mousemove', ev_canvas, false);
    tempCanvas.addEventListener('mouseup',   ev_canvas, false);
}

function ev_canvas(ev) {
	if (ev.layerX || ev.layerX == 0) {
      ev._x = ev.layerX;
      ev._y = ev.layerY;
    } else if (ev.offsetX || ev.offsetX == 0) {
      ev._x = ev.offsetX;
      ev._y = ev.offsetY;
    }

    // Call the event handler of the tool.
    var func = tool[ev.type];
    if (func) {
      func(ev);
    }
}

function canvasUpdate() {
	ctx.drawImage(tempCanvas, 0, 0);
	tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
}

function canvasToImage() {
	tempCtx.drawImage(canvas, 0, 0);
	tempCtx.drawImage(gridCanvas, 0, 0);
	var testimage = document.createElement('img');
	testimage.onload = function(e) {
		var testtexture = new THREE.Texture(testimage);
		testtexture.needsUpdate = true;
		drawSphere.material = new THREE.MeshPhongMaterial({map:testtexture, shininess: 6, transparent: true});
		drawSphere.geometry.buffersNeedUpdate = true;
		drawSphere.geometry.uvsNeedUpdate = true;
		scene.add(drawSphere);
		render();
	}
	testimage.src = tempCanvas.toDataURL('image/jpg');

	tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
}

function strokeSizeChange(value) {
	document.querySelector("#strokeSizeOutput").value = value;
}

function setStrokeColor(value) {
	//converts the input color to RGB values
	var color = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(document.querySelector("#strokeColor").value);
	curColor.r = parseInt(color[1], 16);
	curColor.g = parseInt(color[2], 16);
	curColor.b = parseInt(color[3], 16);
}

function cToArray(canvas) {
	step++;
	if (step < pushArray.length) {pushArray.length = step;}
	pushArray.push(canvas.toDataURL());
}

$(function() {
	$("#icons>div:not(#clearAll, #download, #undo, #redo, #gridToggle, #upload)").on('click', function() {
		$("#icons>div").removeClass("activeDraw");
		$(this).addClass('activeDraw');
		if (tools[this.title]) {
			tool = new tools[this.title]();
		}
	});

	tools.pen = function() {
		var tool = this;
	    this.started = false;

	    this.mousedown = function (ev) {
	        tempCtx.beginPath();
	        tempCtx.moveTo(ev._x, ev._y);
	        tool.started = true;
	    };

	    this.mousemove = function (ev) {
	      if (tool.started) {
	      	tempCtx.strokeStyle = document.querySelector("#strokeColor").value;
	      	tempCtx.lineWidth = document.querySelector("#strokeSizeOutput").value;
	      	tempCtx.lineJoin = tempCtx.lineCap = 'round';
	        tempCtx.lineTo(ev._x, ev._y);
	        tempCtx.stroke();
	      }
	    };

	    this.mouseup = function (ev) {
	      if (tool.started) {
	        tool.mousemove(ev);
	        tool.started = false;
	        canvasUpdate();
	        canvasToImage(canvas);
	        cToArray(canvas);
	      }
	    };
	};

	tools.line = function() {
		var tool = this;
		this.started = false;

		this.mousedown = function(e) {
			tool.started = true;
			tool.x0 = e._x;
			tool.y0 = e._y;
		};

		this.mousemove = function(e) {
			if (!tool.started) {
				return;
			}
			tempCtx.strokeStyle = document.querySelector("#strokeColor").value;
			tempCtx.clearRect(0, 0, canvas.width, canvas.height);
			tempCtx.beginPath();
			tempCtx.moveTo(tool.x0, tool.y0);
			tempCtx.lineTo(e._x, e._y);
			tempCtx.lineWidth = document.querySelector("#strokeSizeOutput").value;
			tempCtx.stroke();
			tempCtx.closePath();
		}

		this.mouseup = function(e) {
			if (tool.started) {
				tool.mousemove(e);
				tool.started = false;
				canvasUpdate();
				canvasToImage(canvas);
				cToArray(canvas);
			}
		}
	}

	tools.eraser = function() {
		var tool = this;
		this.started = false;

		this.mousedown = function (ev) {
	        tempCtx.beginPath();
	        tempCtx.moveTo(ev._x, ev._y);
	        tool.started = true;
	    };

	    this.mousemove = function (ev) {
	      if (tool.started) {
	        tempCtx.moveTo(ev._x, ev._y);
	        tempCtx.arc(ev._x, ev._y, document.querySelector("#strokeSizeOutput").value, 0, 2*Math.PI, false);
	        tempCtx.fillStyle = 'white';
	        tempCtx.fill();
	      }
	    };

	    this.mouseup = function (ev) {
	      if (tool.started) {
	        tool.mousemove(ev);
	        tool.started = false;
	        canvasUpdate();
	        canvasToImage(canvas);
	        cToArray(canvas);
	      }
	    };
	}

	tools.bucket = function() {
		var tool = this;

		this.mousedown = function(e) {
			var drawingBoundTop = 0;
			var imageData = ctx.getImageData(0, 0, width, height);
			pixelStack = [[e._x, e._y]];
			var mousePos = (e._y*width + e._x) * 4;
			var startR = imageData.data[mousePos];
			var startG = imageData.data[mousePos + 1];
			var startB = imageData.data[mousePos + 2];

			while(pixelStack.length)
			{
			  var newPos, x, y, pixelPos, reachLeft, reachRight;
			  newPos = pixelStack.pop();
			  x = newPos[0];
			  y = newPos[1];

			  pixelPos = (y * width + x) * 4;

			  while(y-- >= drawingBoundTop && matchStartColor(pixelPos))
			  {
			    pixelPos -= width * 4;
			  }
			  pixelPos += width * 4;
			  ++y;
			  reachLeft = false;
			  reachRight = false;
			  while(y++ < height-1 && matchStartColor(pixelPos))
			  {
			    colorPixel(pixelPos);

			    if(x > 0)
			    {
			      if(matchStartColor(pixelPos - 4))
			      {
			        if(!reachLeft){
			          pixelStack.push([x - 1, y]);
			          reachLeft = true;
			        }
			      }
			      else if(reachLeft)
			      {
			        reachLeft = false;
			      }
			    }

			    if(x < width-1)
			    {
			      if(matchStartColor(pixelPos + 4))
			      {
			        if(!reachRight)
			        {
			          pixelStack.push([x + 1, y]);
			          reachRight = true;
			        }
			      }
			      else if(reachRight)
			      {
			        reachRight = false;
			      }
			    }

			    pixelPos += width * 4;
			  }
			}
			ctx.putImageData(imageData, 0, 0);

			function matchStartColor(pixelPos)
			{
				var r = imageData.data[pixelPos];
				var g = imageData.data[pixelPos+1];
				var b = imageData.data[pixelPos+2];

				if (r === startR && g === startG && b === startB) {
					return true;
				}

				if (r === curColor.r && g === curColor.g && b === curColor.b) {
					return false;
				}
			}

			function colorPixel(pixelPos)
			{
			  imageData.data[pixelPos] = curColor.r;
			  imageData.data[pixelPos+1] = curColor.g;
			  imageData.data[pixelPos+2] = curColor.b;
			  imageData.data[pixelPos+3] = 255;
			}
		}

		this.mouseup = function() {
			canvasToImage(canvas);
			cToArray(canvas);
		}
	}

	$('#clearAll').on('click', function() {
		if (confirm("This will clear EVERYTHING. Are you sure?")) {
			canvas.width = canvas.width;
			canvasToImage();
		}
	});

	$('#download').on('click', function() {
		if (mapFile != undefined && mapFile.indexOf('imgur') == -1) {
			var zip = new JSZip();
			var content;
			tempCanvas.height = imageHeight;
			tempCanvas.width = imageWidth;
			var imgTemp = new Image();
			imgTemp.src = $("#imgCanvas").attr('src');
			tempCtx.globalCompositeOperation="destination-over";
			tempCtx.drawImage(canvas,0,0,imageWidth,imageHeight);

			var data = tempCanvas.toDataURL("image/png");
			data = data.replace(new RegExp("data:image.*base64,"), "");
			zip.file("sketch.png", data, {base64:true});

			tempCtx.drawImage(imgTemp,0,0,imageWidth,imageHeight);

			var data = tempCanvas.toDataURL("image/png");
			data = data.replace(new RegExp("data:image.*base64,"), "");
			zip.file("combined.png", data, {base64:true});

			content = zip.generate({type:"blob"});
			document.getElementById("exportLink").href = URL.createObjectURL(content);
		    document.getElementById("exportLink").download = "MapSketch.zip";
		    document.getElementById("exportLink").click();
		} else {
			var data = canvas.toDataURL("image/png");
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
		    document.getElementById("exportLink").download = "sketch.png";
		    document.getElementById("exportLink").click();
		}
	    tempCanvas.width = canvas.width;
    	tempCanvas.height = canvas.height;
    	tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
	});

	$("#undo").on('click', function() {
		if (step > 0) {
			step--;
			var canvasPic = new Image();
			canvasPic.src = pushArray[step];
			canvasPic.onload = function() {
				canvas.width = canvas.width;
				ctx.drawImage(canvasPic, 0, 0);
				canvasToImage(canvas);
			}

		}
	});

	$("#globeResize").on('click', function() {
		if ($(this).attr("title") == "Enlarge") {
			renderer.setSize(window.innerHeight - 75, window.innerHeight - 75);
			$(this).attr("title", "Shrink");
		} else {
			renderer.setSize(250, 250);
			$(this).attr("title", "Enlarge");
		}
	});

	$("#gridToggle").on('click', function() {
		$("#grid").toggle();
	});

	flatInit();
	cToArray(canvas);
})
