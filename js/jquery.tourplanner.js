// Google Maps specific variable declaration
var geocoder;
var autocomplete;

// Variables for 'autocomplete' on the start and end location text boxes
var startLocation;
var destinationLocation;
var startMarker;
var destinationMarker;

var userLocation;
var userMarker;

// Map object storage variable
var map;

// Store the travel type
var travelType = "walking";
isLooping = false;

// End of time (for cookie storage purposes)
endOfTime = "expires=Fri, 31 Dec 9999 23:59:59 GMT;";
immediate = "expires=Thu, 01 Jan 1970 00:00:00 UTC;";

// Preset Locations
var australia = new google.maps.LatLng(-24.994167,134.866944)
var fullZoom = 4;
var reasonableZoom = 10;

// Transit, traffic, and bicycle layers
var transitLayer;
var trafficLayer;
var bicycleLayer;

/* FOR POPUP PAGE */
// Variables of the current location set by asynchronous method 
var currentLocationName;
var currentLocation;
var addedAttractionsArray = new Array();


function initialize() {
	//Map Specifications
	var mapProp = {
		center: australia,
		zoom: 4,
		mapTypeId: google.maps.MapTypeId.ROADMAP,
		disableDefaultUI: true,
		styles: [
			{
				stylers: [
					{ hue: "#2B167B" },
					{ saturation: 0 }
				]
			},{
				featureType: "road",
				elementType: "geometry",
				stylers: [
					{ lightness: 60 },
					{ visibility: "simplified" }
				]
			},{
				elementType: "labels",
				stylers: [
					{ visibility: "off" }
				]
			},{
				featureType: "road.highway",
				elementType: "geometry",
				stylers: [
					{ hue: "#F05329" }
				]
			},{
				featureType: "poi.attraction",
				elementType: "geometry",
				stylers: [
					{ hue: "#F05329" },
					{ saturation: 50 },
					{ lightness: -10 }
				]
			},{
				featureType: "poi.sports_complex",
				elementType: "geometry",
				stylers: [
					{ hue: "#F05329" },
					{ saturation: 50 },
					{ lightness: -10 }
				]
			},{
				featureType: "poi.park",
				elementType: "geometry",
				stylers: [
					{ hue: "#08CA74" },
					{ saturation: 50 }
				]
			},{
				featureType: "poi",
				elementType: "labels",
				stylers: [
					{ visibility: "on" }
				]
			},{
				featureType: "poi",
				elementType: "labels.text.stroke",
				stylers: [
					{ lightness: -100 }
				]
			},{
				featureType: "poi",
				elementType: "labels.text.fill",
				stylers: [
					{ lightness: 100 }
				]
			},{
				featureType: "administrative",
				elementType: "labels",
				stylers: [
					{ visibility: "on" }
				]
			}
		]
	};
	
	// Detect browser location support
	if (navigator.geolocation) {
		navigator.geolocation.getCurrentPosition(function(position) {
			userLocation = new google.maps.LatLng(position.coords.latitude,position.coords.longitude);
			map.setCenter(userLocation);
			map.setZoom(reasonableZoom);
		}, function() {
			console.log("Geolocation service failed");
		});
	} else {
		console.log("Browser does not support Geolocation");
	}
		
	//Add Map to Div
	map = new google.maps.Map(document.getElementById("map-canvas"),mapProp);

	//Initialise Geocoder object
	geocoder = new google.maps.Geocoder();

	// Initialising the autocomplete objects, restricting the search
	// to geographical location types.
	startLocationAutocomplete = new google.maps.places.Autocomplete((document.getElementById('start-location')),{ types: ['geocode'] });
	destinationLocationAutocomplete = new google.maps.places.Autocomplete((document.getElementById('end-location')),{ types: ['geocode'] });


	// When the user selects an address from the dropdown,
	// populate the address fields in the form.
	// start location autocomplete event
	google.maps.event.addListener(startLocationAutocomplete, 'place_changed', function() {
		geocodeAddress(document.getElementById('start-location').value, 1);
	});

	// destination location autocomplete event
	google.maps.event.addListener(destinationLocationAutocomplete, 'place_changed', function() {
		geocodeAddress(document.getElementById('end-location').value, 2);
	});
	
	
	//------------------------------------------------------------------------------------------------------------------------
	//POPUPWINDOW 
	//------------------------------------------------------------------------------------------------------------------------

	//POPUPWINDOW: Initialise date picker for departure time
	if (!Modernizr.inputtypes['datetime-local']  || navigator.userAgent.toLowerCase().indexOf('chrome') > -1) {
		$("#departure-time").datetimepicker({
			sideBySide: true,
			format: "D MMM YYYY h:mm a"
		});
	} else {
		// Remove the button and place the input field in the parent
		// styling breaks if the button is removed without reordering DOM
		$("#departure-time>span").remove();
		$("#departure-time>input").attr("type", "datetime-local");
		$("#departure-time>input").appendTo($("#departure-time").parent());
	}


	//POPUPWINDOW: Autocomplete search filtering conditions set to only establishments within australia
	var options = {
		types: ['establishment'],
		componentRestrictions: {country: "aus"}
	};


	//POPUPWINDOW: Textfield input
	var input = document.getElementById('attraction-location');
	
					
	// Initialising the autocomplete objects, restricting the search
	// to geographical location types.
	startLocationAutocomplete = new google.maps.places.Autocomplete(input,options);
		
	// When the user selects an address from the dropdown,
	// populate the address fields in the form.
	//start location autocomplete event
	google.maps.event.addListener(startLocationAutocomplete, 'place_changed', function() {
		currentLocationName = document.getElementById('attraction-location').value;
		geocodeAddress(document.getElementById('attraction-location').value, 3);
		
		$("#add-attraction").removeAttr("disabled");
	});
	
	transitLayer = new google.maps.TransitLayer();
	trafficLayer = new google.maps.TrafficLayer();
	bicycleLayer = new google.maps.BicyclingLayer();
	
	startMarker = new google.maps.Marker({
		animation: google.maps.Animation.DROP,
		draggable: true
	});
	destinationMarker = new google.maps.Marker({
		animation: google.maps.Animation.DROP,
		draggable: true
	});
	
	$('[data-toggle="tooltip"]').tooltip()
}

//Takes the entered address and set the start and end location latitude and longitude
//The assign variable being a 1 or a 2 determines whether the locations is the start or destination
function geocodeAddress(location, assign) {
	geocoder.geocode( { 'address': location}, function(results, status) {
		if (status == google.maps.GeocoderStatus.OK) {
			//global variable assignment
			if (assign == 1) {
				startLocation = results[0].geometry.location;
				startMarker.setMap(map);
				startMarker.setPosition(startLocation);
			} else if (assign == 2) {
				destinationLocation = results[0].geometry.location;
				destinationMarker.setMap(map);
				destinationMarker.setPosition(destinationLocation);
			} else if (assign == 3) {
				currentLocation = results[0].geometry.location;
			}
			
			setMapViewport(startLocation, destinationLocation);
			
			calculateRoute();
		} else {
			console.log('Geocode was not successful for the following reason: ' + status);
		}
	});
}

/** Pass nulls for zooming on singular objects **/
function setMapViewport(start, end) {
	// TODO: Proper error handling and functionality
	if (start || end) {
		var mapBounds = new google.maps.LatLngBounds();
		if (start) {
			mapBounds.extend(start);
		}
		if (end) {
			mapBounds.extend(end);
		}
		
		map.fitBounds(mapBounds);
		
		if (!end) {
			map.setZoom(reasonableZoom);
		}
	}
}

function addAttraction() {
	var location = {name:currentLocationName, lat:currentLocation.lat(), lng:currentLocation.lng()};
	addedAttractionsArray.push(location);

	// Clears the attractions auto complete box 
	document.getElementById("attraction-location").value = '';
	$("#add-attraction").attr("disabled", true);

	generateTable();
}


function generateTable() {
	var table = document.getElementById("attraction-table");

	// Delete contents of table
	table.innerHTML = "";
	
	for (i = 0; i < addedAttractionsArray.length; i++) {
		var row = table.insertRow(-1);

		var locationNameCell = row.insertCell(0);
		var travelInfoCell = row.insertCell(1);
		var infoButtonCell = row.insertCell(2);
		var closeButtonCell = row.insertCell(3);

		locationNameCell.innerHTML = addedAttractionsArray[i].name;
		travelInfoCell.innerHTML = "00:00 0km";
		infoButtonCell.innerHTML = "<span class='glyphicon glyphicon-info-sign'></span>"
		closeButtonCell.innerHTML = "<button type='button' class='close' onclick='deleteAttraction(this)'>&times;</button>";
	}
}


// Fixed and shortened
function deleteAttraction(button) {
	var row = $(button).parent().parent();
	addedAttractionsArray.splice(row.index(), 1);
	
	generateTable();
}	

function placeAttractions() {
	
}

function shareRoute() {
	
}

function calculateRoute() {
	if(travelType == "driving") {
		
	}
	else if(travelType == "walking") {
		
	}
	else if(travelType == "cycling") {
		
	}
	else if(travelType == "transit") {
		
	}
}

function setTravelType(originElement, newTravelType) {
	travelType = newTravelType;
	$("#travel-mode>.btn-group").each(function() {
		$(this).children().first().attr("class", "btn btn-default");
	});
	$(originElement).attr("class", "btn btn-success");
	
	transitLayer.setMap(null);
	bicycleLayer.setMap(null);
	trafficLayer.setMap(null);
	
	switch (travelType) {
		case "transit":
			transitLayer.setMap(map);
			break;
		case "cycling":
			bicycleLayer.setMap(map);
			break;
		case "driving":
			trafficLayer.setMap(map);
			break;
	}
}

function setRoundTrip(button) {
	// Returns a string rather than a boolean
	// ALSO is inverted
	if ($(button).attr("aria-pressed") != "true") {
		isLooping = true;
		$("#end-location").hide();
		$(button).addClass("btn-success");
		$(button).removeClass("btn-default");
		
		destinationLocation = null;
		$("#end-location").val("");
		
		setMapViewport(startLocation, null);
	} else {
		isLooping = false;
		$("#end-location").show();
		$(button).addClass("btn-default");
		$(button).removeClass("btn-success");
	}
}

/** Save and load the trip at the beginning and end of each session, 
	Save/load buttons are not user friendly
**/
function saveTrip() {
	
}

function loadTrip() {
	
}

function changeTab(tabName) {
	var tabs = $("[aria-controls='" + tabName + "']");
	console.log(tabs);
}

