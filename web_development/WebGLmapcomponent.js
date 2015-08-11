//Global Variables
var currentLayer  = null;
var points_bounds;
var log;

var timeseriesWidth;
var tiles = 0;

//Connection variables to the server
var myip = "localhost";
var myport = "8080";

//Visual variables
var red = "FF0000";
var standoutColor = "000000";
var opacity = 0.3;
var numberFeatures = 0;

var mapCanvas;
var map = null; 
var points;
var defaultZoom = 7;
var maxColor = 255;
var maxMapSize = 256;
var igMax= 0;
var autoOpacity = true;

//Restricted Area
var isRestricted = false;
var geometryRestriction;

var aamaps = false;
var curDate;

// Variables under the context of Web GL 
var gl;
var pointProgram;
var pointArrayBuffer;
var pointColorBuffer;
var rawData; //Data Buffer
var colorData; //Color Buffer

var pixelsToWebGLMatrix = new Float32Array(16);
var mapMatrix = new Float32Array(16);
var pi_180 = Math.PI / 180.0;
var pi_4 = Math.PI * 4;




function resetFields(){
	log = document.getElementById("log");
	log.value = "";
	document.getElementById("color_picker").value=red;
	var slider = document.getElementById("opacity");
	slider.value=opacity;
	slider.disabled=true;
	autoOpacity=true;
	document.getElementById("op_calc").value="op_auto";
	document.getElementById('r1').checked;
	$("#time_slider").slider('disable');
}


function createTimeSlider(){
	var posInit =  document.getElementById("from").value;
	var posEnd = document.getElementById("to").value;
	var nDays = timeRange(posInit,posEnd);
	$("#time_slider").slider({
        range: "min",
        min: 0,
        max: nDays-1,
        value: 0,
		create: function( event, ui ) {
			document.getElementById("time_range").innerHTML=posInit;
			curDate = posInit;
		},
        change: function(e, ui) {
          curDate = addDaysToDate(posInit,ui.value);
		  getTimeSeries();
        }
    });
}


//Funcao que carrega o mapa e inicializa os fields
function init() {
	createTimeSlider();
	resetFields();
	init_map();
	zoomMap = map.getZoom();
	defineSaveForm();
	initShaders();
}


function clearPoints(){
	resetFields();
	map.off('move', drawPoints);
	map.setZoom(defaultZoom);
	map.panTo(new L.LatLng(39.5, -8));
	clearColorBuffer();
}

function clearColorBuffer(){
	gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
}


function createMapCanvas() {
	mapCanvas = document.createElement('canvas');
	mapCanvas.id = 'mapCanvas'
	mapCanvas.style.position = 'absolute';
	mapCanvas.height = map.getSize().y;
	mapCanvas.width = map.getSize().x;
	var mapDiv = map.getContainer();
	mapDiv.appendChild(mapCanvas);
}


function save(e) {
	 $("#saveForm").dialog( "open" );
}

function defineSaveForm() {
	$( "#saveForm" ).dialog({
	      autoOpen: false,
	      height: 280,
	      width: 350,
	      modal: true,
	      buttons: {
	        "Save": function() {
	            $( this ).dialog( "close" );
	        },
	        Cancel: function() {
	          $( this ).dialog( "close" );
	        }
	      },
	      close: function() {
	    	  $( this ).dialog( "close" );
	      }
	    });
}

function init_map() {

	if (map!= undefined) {
		map.remove();
		$("#map").empty();
		map = null;
	} 
	map = new L.Map('map', {center: new L.LatLng(39.5, -8), 
		zoom: defaultZoom,
		contextmenu: true,
		contextmenuWidth: 140,
		contextmenuItems: [{
			text: 'Save Perspective',
			callback: save
		}]	}
	); 

	var googleLayer = new L.Google('ROADMAP');
	map.addLayer(googleLayer);
	map.on('move', drawPoints);
	createMapCanvas();
	
	// Initialise the FeatureGroup to store editable layers
	var drawnItems = new L.FeatureGroup();

	var options = {
			position: 'topleft',
			draw: {
				polyline: false,
				polygon: {
					showArea: true,
					zIndexOffset:50,
					allowIntersection: false, // Restricts shapes to simple polygons
					drawError: {
						color: '#e1e100', // Color the shape will turn when intersects
						message: '<strong>Oh snap!<strong> you can\'t draw that!' // Message that will show when intersect
					},
					shapeOptions: {
						color: '#333366',
						fillOpacity: ' 0.1'
					}
				},
				marker: false,
				circle:false,
				rectangle: {
					zIndexOffset:50,
					shapeOptions: {
						color: '#333366',
						fillOpacity: ' 0.1'
					}
				}
			},
			edit: {
				featureGroup: drawnItems
			}
	};

	var drawControl = new L.Control.Draw(options);
	map.addControl(drawControl);
	map.addLayer(drawnItems);

	map.on('draw:created', function (e) {
		var type = e.layerType,
		layer = e.layer;

		var dataset = ($("#dataset").val() != undefined) ? $("#dataset").val() : undefined;
		geometryRestriction = layer.toGeoJSON().geometry.coordinates.toString();
		isRestricted = true;
		console.log(geometryRestriction);
		
		contextUrl = "http://"+ myip + ":" + myport + "/context?isRestricted=true&geometry=" + geometryRestriction + "&dataset=" + dataset;
		$.post(contextUrl);
				
		drawnItems.addLayer(layer);
	});

	// TODO: Here, it is the assumption that i only have a geometry which can be false. To be improved :)
	map.on('draw:deleted', function (e) {
		var dataset = ($("#dataset").val() != undefined) ? $("#dataset").val() : undefined;
		var layers = e.layers;
		layers.eachLayer(function (layer) {
		});

		isRestricted = false;
		contextUrl = "http://"+ myip + ":" + myport + "/context?isRestricted=false&geometry=null&dataset=" + dataset ;
		$.post(contextUrl);
		drawnItems.addLayer(layer);
	});

	map.on('draw:drawstart', function (e) {
		$( "#mapCanvas" ).remove();

	});
	map.on('draw:drawstop', function (e) {
		createMapCanvas();
	});
	map.on('draw:editstart', function (e) {
		$("#mapCanvas").remove();

	});
	map.on('draw:editstop', function (e) {
		createMapCanvas();
	});
	map.on('draw:deletestart', function (e) {
		$("#mapCanvas").remove();
	});
	map.on('draw:deletestop', function (e) {
		createMapCanvas();
	});
}

//Draw Points with Google Maps
function drawGMPoints(){
	for (var i = 0; i < numberFeatures; i++) {
			var loc = points.features[i].geometry.coordinates;
			var circle = L.circle(new L.LatLng(loc[0], loc[1]), 500, {
    			color: 'red',
    			fillColor: '#f03',
    			fillOpacity: 0.5
			}).addTo(map);
    		}
}


/** Add a new log message*/
function addMessage(message, milliseconds) {
    if (milliseconds === undefined) {}
    else message = message + ' [' + milliseconds.toString() + ' ms]';
    log.value = log.value + message + '\n';
}


function getGeoJSON(url) {
	if(map!=null) {
		map.on('move', drawPoints);
		var start_time = performance.now();
		addMessage("Loading Points...", undefined);
		$.getJSON(url, function(data) {
			var getRequest_time = new Date();
			drawCanvas(data);
			//drawGMPoints();
			var finishRequest_time = performance.now();
			addMessage(numberFeatures + " Points Loaded", Math.round(finishRequest_time - start_time));
		});
	}
}


function resize() {
	gl.viewport(0, 0, map.getContainer().offsetWidth, map.getContainer().offsetHeight);
}

function drawCanvas(geojson) {
	points = geojson;
	numberFeatures = points.features.length;
	webGLStart(null);

	 // Set the matrix to some that makes 1 unit 1 pixel.
	pixelsToWebGLMatrix.set([2/mapCanvas.width, 0, 0, 0, 0, -2/mapCanvas.height, 0, 0, 0, 0, 0, 0, -1, 1, 0, 1]);
	drawPoints();
	//drawGMPoints();
	mapCanvas.style.zIndex='10';
}


function webGLStart() {
	var canvas = document.getElementById("mapCanvas");
	document.getElementById("opacity").disabled=false;
	initGL(canvas);
	resize();
	initShaders();
	initBuffers();
}


//Precalculated constants for PI operations optimization
var pi_180 = Math.PI / 180.0;
var pi_4 = Math.PI * 4;


function latLongToPixelXY(latitude, longitude) {
	var sinLatitude = Math.sin(latitude * pi_180);
	var pixelY = (0.5 - Math.log((1 + sinLatitude) / (1 - sinLatitude)) /(pi_4)) * maxMapSize;
	var pixelX = ((longitude + 180) / 360) * maxMapSize;
	var pixel =  { x: pixelX, y: pixelY};
	return pixel;
}

/*function igOpacity(ig){
	return ig/igMax;
}*/


function initAAMapsColorBuffer(){
	//The rest of the data
		color = hexToRgb(document.getElementById("color_picker").value);
		for (var i = 0; i < points.features.length; i++) {
			colorData[(i * 4)] = color[0];
			colorData[(i * 4) + 1] = color[1];
			colorData[(i * 4) + 2] = color[2];
			//alert(points.features[i].date);
			var date = convertDate(""+points.features[i].date);
			if (date == curDate) {

				colorData[(i * 4) + 3] = 1;
			}
			else {
				colorData[(i * 4) + 3] = 0;
			}
		}
		// create webgl buffer, bind it, and load rawData into it
		pointColorBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, pointColorBuffer);
		
		gl.bufferData(gl.ARRAY_BUFFER, colorData, gl.STATIC_DRAW);
		var vertexColorAttribute = gl.getAttribLocation(pointProgram, "aVertexColor");
		gl.enableVertexAttribArray(vertexColorAttribute);
		
		// tell webgl how buffer is laid out (pairs of (R,G,B,A) coords)
		gl.vertexAttribPointer(vertexColorAttribute, 4, gl.FLOAT, false, 0, 0);
}


function initColorBuffer(){
	var color = hexToRgb(document.getElementById("color_picker").value);
	colorData = new Float32Array( (4 * points.features.length) );
	if (aamaps) {
		initAAMapsColorBuffer();
	}
	else {
		if(autoOpacity) {
			var colorLocation = gl.getUniformLocation(pointProgram, "uColor");
			// Set the color
			gl.uniform4f(colorLocation, color[0], color[1], color[2], opacity);
		}
		else{
			igMax = points.maxEffect;
			addMessage("Max IG value: " + igMax + "\n");
			//IG max point
			color = hexToRgb(standoutColor);
			colorData[0] = color[0];
			colorData[1] = color[1];
			colorData[2] = color[2];
			colorData[3] = 1;
			
			//The rest of the data
			color = hexToRgb(document.getElementById("color_picker").value);
			for (var i = 1; i < points.features.length; i++) {
				colorData[(i * 4)] = color[0];
				colorData[(i * 4) + 1] = color[1];
				colorData[(i * 4) + 2] = color[2];
				colorData[(i * 4) + 3] = points.features[i].effect;
			}
			// create webgl buffer, bind it, and load rawData into it
			pointColorBuffer = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, pointColorBuffer);
			
			gl.bufferData(gl.ARRAY_BUFFER, colorData, gl.STATIC_DRAW);
			var vertexColorAttribute = gl.getAttribLocation(pointProgram, "aVertexColor");
			gl.enableVertexAttribArray(vertexColorAttribute);
			
			// tell webgl how buffer is laid out (pairs of (R,G,B,A) coords)
			gl.vertexAttribPointer(vertexColorAttribute, 4, gl.FLOAT, false, 0, 0);
		}
	}
}


function initDataBuffer() {
	rawData = new Float32Array( (2 * points.features.length) );
	for (var i = 0; i < points.features.length; i++) {
		var loc = points.features[i].geometry.coordinates;
		var pixelCoordinate = latLongToPixelXY(loc[0], loc[1]);		
		rawData[(i * 2)] = pixelCoordinate.x;
		rawData[(i * 2) + 1] = pixelCoordinate.y;
	}
	// create webgl buffer, bind it, and load rawData into it
	pointArrayBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, pointArrayBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, rawData, gl.STATIC_DRAW);

	// enable the 'worldCoord' attribute in the shader to receive buffer
	var attributeLoc = gl.getAttribLocation(pointProgram, 'worldCoord');
	gl.enableVertexAttribArray(attributeLoc);

	// tell webgl how buffer is laid out (pairs of x,y coords)
	gl.vertexAttribPointer(attributeLoc, 2, gl.FLOAT, false, 0, 0);
}


function initBuffers(e) {
	if (aamaps || !autoOpacity) gl.uniform1i(gl.isUniform, 0);
	else gl.uniform1i(gl.isUniform, 1);
	initDataBuffer();
	initColorBuffer();
}


function initGL(canvas) {
	try {
		gl = canvas.getContext('webgl');
		gl.viewport(0, 0, canvas.width, canvas.height);
		gl.disable(gl.DEPTH_TEST);
	} catch(e) {}
	if (!gl) alert("Could not initialise WebGL, sorry :-( ");
}



 function hexToRgb(hex) {
    r = parseInt(hex.substring(0,2), 16) / maxColor;
    g = parseInt(hex.substring(2,4), 16) / maxColor;
    b = parseInt(hex.substring(4,6), 16) / maxColor;
    return [r,g,b];
 }



function initShaders() {
	var fragmentShader = getShader(gl, "pointFragmentShader");
	var vertexShader = getShader(gl, "pointVertexShader");
	
	// link shaders to create our program
	pointProgram = gl.createProgram();
	gl.attachShader(pointProgram, vertexShader);
	gl.attachShader(pointProgram, fragmentShader);
	gl.linkProgram(pointProgram);
	gl.useProgram(pointProgram);
	gl.aPointSize = gl.getAttribLocation(pointProgram, "aPointSize");
	gl.isUniform = gl.getUniformLocation(pointProgram, "isUniform");
}


function getShader(gl, id) {
	var shaderScript = document.getElementById(id);
	if (!shaderScript) return null;
	
	var str = "";
	var k = shaderScript.firstChild;
	while (k) {
		if (k.nodeType == 3)
			str += k.textContent;
		k = k.nextSibling;
	}
	var shader;
	if (shaderScript.type == "x-shader/x-fragment") {
		shader = gl.createShader(gl.FRAGMENT_SHADER);
	} else if (shaderScript.type == "x-shader/x-vertex") {
		shader = gl.createShader(gl.VERTEX_SHADER);
	} else {
		return null;
	}

	gl.shaderSource(shader, str);
	gl.compileShader(shader);

	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		alert(gl.getShaderInfoLog(shader));
		return null;
	}
	return shader;
}  


function scaleMatrix(matrix, scaleX, scaleY) {
	// scaling x and y, which is just scaling first two columns of matrix
	matrix[0] *= scaleX;
	matrix[1] *= scaleX;
	matrix[2] *= scaleX;
	matrix[3] *= scaleX;

	matrix[4] *= scaleY;
	matrix[5] *= scaleY;
	matrix[6] *= scaleY;
	matrix[7] *= scaleY;
}


function translateMatrix(matrix, tx, ty) {
	// translation is in last column of matrix
	matrix[12] += matrix[0]*tx + matrix[4]*ty;
	matrix[13] += matrix[1]*tx + matrix[5]*ty;
	matrix[14] += matrix[2]*tx + matrix[6]*ty;
	matrix[15] += matrix[3]*tx + matrix[7]*ty;
}


function drawPoints(e) {
	if (points == null) return;
	gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
	gl.enable(gl.BLEND);
	gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
	//gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
   
	gl.disable(gl.DEPTH_TEST);
	
	var currentZoom = map.getZoom();
	var pointSize = Math.max(currentZoom - 4.0, 1.0);
	gl.vertexAttrib1f(gl.aPointSize, pointSize);

	/* We need to create a transformation that takes world coordinate
	 * points in the pointArrayBuffer to the coodinates WebGL expects.
	 * 1. Start with second half in pixelsToWebGLMatrix, which takes pixel
	 *     coordinates to WebGL coordinates.
	 * 2. Scale and translate to take world coordinates to pixel coords
	 * see https://developers.google.com/maps/documentation/javascript/maptypes#MapCoordinate
	 */
	
	// copy pixel->webgl matrix
	mapMatrix.set(pixelsToWebGLMatrix);
	
	// Scale to current zoom (worldCoords * 2^zoom)
	var scale = Math.pow(2, currentZoom);
	scaleMatrix(mapMatrix, scale, scale);
	
	var offset = latLongToPixelXY(map.getBounds().getNorthWest().lat, map.getBounds().getNorthWest().lng);
	translateMatrix(mapMatrix, -offset.x, -offset.y);
	
	// attach matrix value to 'mapMatrix' uniform in shader
	var matrixLoc = gl.getUniformLocation(pointProgram, 'mapMatrix');
	gl.uniformMatrix4fv(matrixLoc, false, mapMatrix);
	
	// draw!
	gl.drawArrays(gl.POINTS, 0, points.features.length);
}


function changeOpacity(newValue){
	document.getElementById("range").innerHTML=newValue;
	opacity = newValue;
	initBuffers();
	drawPoints();
}

function redrawOpacity(autoOp){
	aamaps = false;
	autoOpacity = autoOp;
	addMessage("Changing opacity representation...");
	//clearColorBuffer();
	initBuffers();
	drawPoints();
}

function redrawAAOpacity(autoOp){
	autoOpacity = autoOp;
	aamaps = true;
	$("#time_slider").slider('enable');
	addMessage("Changing opacity representation...");
	getTimeSeries();
	initBuffers();
	drawPoints();
}

