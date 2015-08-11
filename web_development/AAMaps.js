var at_type="Constant";
var unit=1;
var events;


function atenuate(ef){
	alert(ef);
}

/*Function to compute the exponential decay value for point i
  assuming an initial intensity = 1 */
function calcConstantDecay(ef){
    float val = ef - unit;
	alert(val);
	return (val > 0 ? val : 0);
}

/*Function to compute the exponential decay value for point i
  assuming an initial intensity = 1 */
/*function calcExpDecay(i){
    var elapsedTime = getElapsedTime(arrayOfMarkers[i].time, current);
    if (elapsedTime < decay) return Math.exp(-(elapsedTime/decay));
    return traceValue;
}*/

function calcAAEffect(points){
	var effect;
	events = points;
	for (var i = 0; i < events.features.length; i++) {
		effect = events.features[i].effect;
		events.features[i].effect = calcConstantDecay(effect);
	}
	return events;
}


