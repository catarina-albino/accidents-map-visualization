function checkDate(date)
  {
    var allowBlank = true;
    var minYear = 1902;
    var maxYear = (new Date()).getFullYear();

    var errorMsg = "";

    // regular expression to match required date format
    re = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/;
	

    if(date != '') {
      if(regs = date.match(re)) {
        if(regs[1] < 1 || regs[3] > 31) {
          errorMsg = "Invalid value for day: " + regs[1];
        } else if(regs[2] < 1 || regs[2] > 12) {
          errorMsg = "Invalid value for month: " + regs[2];
        } else if(regs[1] < minYear || regs[1] > maxYear) {
          errorMsg = "Invalid value for year: " + regs[1] + " - must be between " + minYear + " and " + maxYear;
        }
      } else {
        errorMsg = "Invalid date format: " + date;
      }
    } else if(!allowBlank) {
      errorMsg = "Empty date not allowed!";
    }

    if(errorMsg != "") {
      alert(errorMsg);
      return false;
    }

    return true;
  }
  
 
function timeRange(initDate, finalDate){
	var oneDay = 24*60*60*1000; // hours*minutes*seconds*milliseconds
	var firstDate = new Date(initDate);
	var secondDate = new Date(finalDate);
	var diffDays = Math.round(Math.abs((firstDate.getTime() - secondDate.getTime())/(oneDay)));
	return diffDays+1;
}
 
function addDaysToDate(date,days) {
	var d = new Date(date);
	d.setHours(d.getHours() + (24 * days));
	var dd = d.getDate();
    var mm = d.getMonth()+1; //January is 0!
    var yyyy = d.getFullYear();
	
    if(dd<10){
        dd='0'+dd
    } 
    if(mm<10){
        mm='0'+mm
    } 
    d = yyyy+'/'+mm+'/'+dd;
	document.getElementById("time_range").innerHTML=d;
	return d;
}

function changeTimeMoment(){
	if (document.getElementById('r1').checked) {
			document.getElementById("from").disabled = false;
			document.getElementById("to").disabled = false;
			$("#time_slider").slider( "disable" );
	}
	else {
			document.getElementById("from").disabled = true;
			document.getElementById("to").disabled = true;
			$("#time_slider").slider( "enable" );
	}
	getTimeSeries();
}



function convertDate(date){
	// regular expression to match required date format
    var re = /^(\d{4})(\d{1,2})(\d{1,2})$/;
	var d;
	if(date != '') {
      if(regs = date.match(re)) d= regs[1]+'/'+regs[2]+'/'+regs[3];
	}
	return d;
}