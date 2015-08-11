//Global Variables
var temp = 0;
var currentLayer  = null;
var canvas;
var points_bounds;
var timeseriesJSON;
var timeseriesWidth;
var tiles = 0;

//Global Variables to support construction of range queries
var rectX, mousedownpos, mov = 0;
var offsetX;
var offsetY;
var ctx;
var isRange, isMoving, isMouseDown, isDrawing = false;
var rangeWidth;

//Connection variables to the server
var myip = "localhost";
var myport = "8080";

var numberFeatures = 0;

//Workers Stuff
var points;

//Funcao que carrega o mapa e afins
function init() {
	init_map();
	zoomMap = map.getZoom();
	requestTimeUrl = "http://"+ myip + ":" + myport + "/timedata/timeseriesfires_portugal";
	getTimeSeriesJSON(requestTimeUrl);
}

function init_map() {
	console.log("Leaflet: " + L.version);

	if (map!= undefined) {
		map.remove();
		$("#map").empty();
		map = null;
	} 

//	map = new L.Map('map', {center: new L.LatLng(41, -93), zoom: 4}); //center usa
	map = new L.Map('map', {center: new L.LatLng(39.5, -8), zoom: 7}); //center usa


	var googleLayer = new L.Google('ROADMAP');
	map.addLayer(googleLayer);
//	new L.marker(new L.LatLng(39, -99)).addTo(map); //center USA
	new L.marker(new L.LatLng(39.5, -8)).addTo(map); //center Portugal

}

function clearCanvas(e) {
	var mapContext = mapCanvas.getContext("2d");
	mapContext.clearRect (0 , 0 , mapCanvas.width, mapCanvas.height );
}


function drawCanvas(geojson) {
	currentLayer = new L.TileLayer.RS();
	currentLayer.addData(geojson);
	map.addLayer(currentLayer);

	clearCanvas();
	points = geojson;
	numberFeatures = 0;
}

function getGeoJSON(url) {
	if(map!=null) {
		var start_time = new Date();
		console.log("request geodata: " + url);

		$.getJSON(url, function(data) {
			var getRequest_time = new Date();

			drawCanvas(data);

			var finishRequest_time = new Date();
			console.log("Apos a funcao de desenho: " + (finishRequest_time - start_time));

		});
	}
}

function getTimeSeriesJSON(url) {
	$.getJSON(url, function( data ) {
		console.log("request time data: " + data)  
		timeseriesJSON = data;
		initTimeSeries();
	});
}


//Cria os elementos html necessarios para representar todas as series temporais
function initTimeSeries() {
	loadCanvas();

	var colors = new Array('#FF0000', '#0000FF', '#FF00FF', '#FF9900', '#000000', '#336600', '#9933FF', '#AC7B62');
	var values = new Array();
	var index = 0;
	timeseriesWidth = Math.floor($('#timeseries').width());
	var widthTimeSerie = Math.floor($('#timeseries').width()).toString() + "px";

	var legendName = '<span style="position: absolute;	right:150px;font-size: 10pt" class="text">Date:</span>'; 
	var legendDate = '<input type="text" id="legend" style="position: absolute;	right: 1px;border: 0;font-size: 9pt" />';
	$('#timeseries').append(legendName);
	$('#timeseries').append(legendDate);

	for (var j = 0; j < timeseriesJSON.length; j++) {

		for (var i = 0; i <  timeseriesJSON[index].data.length; i++) {
			values[i] = timeseriesJSON[j].data[i].value;
		}

		var nameTimeSerie = timeseriesJSON[j].type;
		var elementName = '<span  style="font-size: 10pt" class="text">' + nameTimeSerie +": "+ '</span>'; 
		var inputValue = '<input type="text" id="numelements' + j +'" style="border: 0;font-size: 9pt" />';
		var elementTimeSerie = '<span id="sparkline'+j+'">&nbsp;</span>';

		$('#timeseries').append(elementName);
		$('#timeseries').append(inputValue);
		$('#timeseries').append(elementTimeSerie);

		$("#sparkline"+j).sparkline(values, {
			id: 1,
			type: 'line',
			width: widthTimeSerie,
			height: '50px',
			lineColor: colors[j],
			fillColor: colors[j],
			disableHiddenCheck: true
		});
	}
}


function loadCanvas() {
	canvas = document.createElement('canvas');
	canvas.id = 'chartscanvas';
	canvas.height = $('#timeseries').height();
	canvas.width = $('#timeseries').width();
	canvas.style.zIndex="100";
	canvas.style.position="absolute";
	var timeDiv = $('#timeseries');
	timeDiv.append(canvas);
	ctx = canvas.getContext('2d');

	var offset = $("#chartscanvas").offset();
	offsetX = offset.left;
	offsetY = offset.top;
	canvas.onselectstart = function () { return false; }

	// Handle with the event mouse move
	$('#chartscanvas').on('mousemove', function(e){
		if(isMouseDown) {
			if(isRange)
				isMoving = true;
			else {
				isDrawing = true;
			}
		}

		var pos = getMousePos(this, e);
		var x = pos.x;
		ctx.clearRect(0, 0, this.width, this.height);

		ctx.lineWidth = 0.5;
		ctx.beginPath();
		ctx.moveTo(x,0);
		ctx.lineTo(x,this.height);
		ctx.stroke();

		var pos = Math.round((x * timeseriesJSON[0].data.length) / timeseriesWidth);
		for (var j = 0; j < timeseriesJSON.length; j++) {

			if(pos >=0 && pos <= timeseriesJSON[0].data.length) {
				$("#numelements" + j + ":text").val(timeseriesJSON[j].data[pos].value);
				$("#legend:text").val(timeseriesJSON[0].data[pos].DateTime);
			}
		}

		// Draw a rectangle
		if(isDrawing) {
			rangeWidth = x-mousedownpos;
			ctx.fillStyle = 'rgba(205,201, 201, 0.5)';
			ctx.fillRect(mousedownpos,0,rangeWidth,this.height);
			ctx.fill();
			return;
		}
		else if(isMoving) {
			mov = x - mousedownpos;
			ctx.clearRect(0, 0, this.width, this.height);
			ctx.fillStyle = 'rgba(205,201, 201, 0.5)';
			ctx.fillRect(rectX + mov,0,rangeWidth,this.height);
			ctx.fill();
			return;
		}
		if(isRange) {
			ctx.fillStyle = 'rgba(205,201, 201, 0.5)';
			ctx.fillRect(rectX,0,rangeWidth,this.height);
			ctx.fill();
			return;
		}

	});

	//handle with the event mouse down
	$("#chartscanvas").mousedown(function (e) {
		isMouseDown= true;
		mousedownpos = parseInt(e.clientX - offsetX);
	});


	//handle with the event mouse up
	$("#chartscanvas").mouseup(function (e) {
		isMouseDown = false;

		if(isDrawing) {
			isRange = true;
			isDrawing= false;
			rectX = mousedownpos + mov;

			var posInit = Math.round((rectX * timeseriesJSON[0].data.length) / timeseriesWidth);
			var posEnd = Math.round(((rectX + rangeWidth) * timeseriesJSON[0].data.length) / timeseriesWidth);

			requesturl = "http://"+ myip + ":" + myport + "/spatialdata?posInit=" + posInit + "&posEnd=" + posEnd;
			getGeoJSON(requesturl);

		}

		if(isMoving) {
			rectX = rectX + mov;
			isRange = true;
			isDrawing= false;
			isMoving = false;

			var posInit = Math.round((rectX * timeseriesJSON[0].data.length) / timeseriesWidth);
			var posEnd = Math.round(((rectX + rangeWidth) * timeseriesJSON[0].data.length) / timeseriesWidth);

			requesturl = "http://"+ myip + ":" + myport + "/spatialdata?posInit=" + posInit + "&posEnd=" + posEnd;
			getGeoJSON(requesturl);

		}
		if(!isRange) {
			posMouse = getMousePos(this, e);
			var x = posMouse.x;
			var y = posMouse.y;
			var pos = Math.round((x * timeseriesJSON[0].data.length) / timeseriesWidth);

			requesturl = "http://"+ myip + ":" + myport + "/spatialdata?posInit=" + pos + "&posEnd=-1";
			getGeoJSON(requesturl);
		}
	});

	$("#chartscanvas").dblclick(function (e) {
		isMouseDown = false;
		isRange = false;
		isMoving = false;
		isDrawing = false;
		rectX = 0;
		mov = 0;
	});

}

function getMousePos(canvas, evt) {
	var rect = canvas.getBoundingClientRect();
	return {
		x: evt.clientX - rect.left,
		y: evt.clientY - rect.top
	};
}
