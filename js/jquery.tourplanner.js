"use strict";

// Global functions
/*global google, console, Modernizr, $*/

// Function list
/*global initialize, geocodeAddress, setMapViewport, calculateRoute, generateTable, setAttractionMarkers*/

// Google Maps specific variable declaration
var geocoder;
var autocomplete;

// Variables for 'autocomplete' on the start and end location text boxes
var startLocation;
var destinationLocation;
var userLocation;

var startMarker;
var destinationMarker;
var userMarker;
var attractionMarkers = [];

// Map object storage variable
var map;

// Store the travel type
var travelType = "walking";
var isLooping = false;

// End of time (for cookie storage purposes)
var endOfTime = "expires=Fri, 31 Dec 9999 23:59:59 GMT;";
var immediate = "expires=Thu, 01 Jan 1970 00:00:00 UTC;";

// Preset Locations
var australia = new google.maps.LatLng(-24.994167, 134.866944);
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
var addedAttractionsArray = [];


function initialize() {
	//Map Specifications
    
    // Function scope variables
    var mapProp,
        startLocationAutocomplete,
        destinationLocationAutocomplete,
        options,
        input;
    
	mapProp = {
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
			}, {
				featureType: "road",
				elementType: "geometry",
				stylers: [
					{ lightness: 60 },
					{ visibility: "simplified" }
				]
			}, {
				elementType: "labels",
				stylers: [
					{ visibility: "off" }
				]
			}, {
				featureType: "road.highway",
				elementType: "geometry",
				stylers: [
					{ hue: "#F05329" }
				]
			}, {
				featureType: "poi.attraction",
				elementType: "geometry",
				stylers: [
					{ hue: "#F05329" },
					{ saturation: 50 },
					{ lightness: -10 }
				]
			}, {
				featureType: "poi.sports_complex",
				elementType: "geometry",
				stylers: [
					{ hue: "#F05329" },
					{ saturation: 50 },
					{ lightness: -10 }
				]
			}, {
				featureType: "poi.park",
				elementType: "geometry",
				stylers: [
					{ hue: "#08CA74" },
					{ saturation: 50 }
				]
			}, {
				featureType: "poi",
				elementType: "labels",
				stylers: [
					{ visibility: "on" }
				]
			}, {
				featureType: "poi",
				elementType: "labels.text.stroke",
				stylers: [
					{ lightness: -100 }
				]
			}, {
				featureType: "poi",
				elementType: "labels.text.fill",
				stylers: [
					{ lightness: 100 }
				]
			}, {
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
		navigator.geolocation.getCurrentPosition(function (position) {
			userLocation = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
			map.setCenter(userLocation);
			map.setZoom(reasonableZoom);
		}, function () {
			console.log("Geolocation service failed");
		});
	} else {
		console.log("Browser does not support Geolocation");
	}
		
	//Add Map to Div
	map = new google.maps.Map(document.getElementById("map-canvas"), mapProp);

	//Initialise Geocoder object
	geocoder = new google.maps.Geocoder();

	// Initialising the autocomplete objects, restricting the search
	// to geographical location types.
	startLocationAutocomplete = new google.maps.places.Autocomplete((document.getElementById('start-location')), { types: ['geocode'] });
	destinationLocationAutocomplete = new google.maps.places.Autocomplete((document.getElementById('end-location')), { types: ['geocode'] });


	// When the user selects an address from the dropdown,
	// populate the address fields in the form.
	// start location autocomplete event
	google.maps.event.addListener(startLocationAutocomplete, 'place_changed', function () {
		geocodeAddress(document.getElementById('start-location').value, 1);
	});

	// destination location autocomplete event
	google.maps.event.addListener(destinationLocationAutocomplete, 'place_changed', function () {
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
	options = {
		types: ['establishment'],
		componentRestrictions: {country: "aus"}
	};


	//POPUPWINDOW: Textfield input
	input = document.getElementById('attraction-location');
	
					
	// Initialising the autocomplete objects, restricting the search
	// to geographical location types.
	startLocationAutocomplete = new google.maps.places.Autocomplete(input, options);
		
	// When the user selects an address from the dropdown,
	// populate the address fields in the form.
	//start location autocomplete event
	google.maps.event.addListener(startLocationAutocomplete, 'place_changed', function () {
		currentLocationName = document.getElementById('attraction-location').value;
		geocodeAddress(document.getElementById('attraction-location').value, 3);
		
		
		
		$("#add-attraction").removeAttr("disabled");
	});
	
	transitLayer = new google.maps.TransitLayer();
	trafficLayer = new google.maps.TrafficLayer();
	bicycleLayer = new google.maps.BicyclingLayer();
	
	startMarker = new google.maps.Marker({
		animation: google.maps.Animation.DROP
	});
	destinationMarker = new google.maps.Marker({
		animation: google.maps.Animation.DROP
	});
	
	$('[data-toggle="tooltip"]').tooltip();
}

//Takes the entered address and set the start and end location latitude and longitude
//The assign variable being a 1 or a 2 determines whether the locations is the start or destination
function geocodeAddress(location, assign) {
	geocoder.geocode({ 'address': location }, function (results, status) {
		if (status === google.maps.GeocoderStatus.OK) {
			//global variable assignment
			if (assign === 1) {
				startLocation = results[0].geometry.location;
				startMarker.setMap(map);
				startMarker.setPosition(startLocation);
			} else if (assign === 2) {
				destinationLocation = results[0].geometry.location;
				destinationMarker.setMap(map);
				destinationMarker.setPosition(destinationLocation);
			} else if (assign === 3) {
				currentLocation = results[0].geometry.location;
			}
			
			if (assign !== 3) {
				calculateRoute();
			}
		} else {
			console.log('Geocode was not successful for the following reason: ' + status);
		}
	});
}


function setMapViewport(arrayOfLocations) {
	var i, mapBounds;
	mapBounds = new google.maps.LatLngBounds();
	if (arrayOfLocations.length > 0) {
		for (i = 0; i < arrayOfLocations.length; i += 1) {
			mapBounds.extend(arrayOfLocations[i]);
		}
		
		map.fitBounds(mapBounds);
		
		if (arrayOfLocations.length === 1) {
			map.setZoom(reasonableZoom);
		}
	}
}

function addAttraction() {
	var location = {name: currentLocationName, location: currentLocation};
	addedAttractionsArray.push(location);

	// Clears the attractions auto complete box 
	document.getElementById("attraction-location").value = '';
	$("#add-attraction").attr("disabled", true);

	generateTable();
	setAttractionMarkers();
	calculateRoute();
}


function generateTable() {
    var table,
        row,
        locationNameCell,
        travelInfoCell,
        infoButtonCell,
        closeButtonCell,
        i;
    
	table = document.getElementById("attraction-table");

	// Delete contents of table
	table.innerHTML = "";
	
	for (i = 0; i < addedAttractionsArray.length; i += 1) {
		row = table.insertRow(-1);

		locationNameCell = row.insertCell(0);
		travelInfoCell = row.insertCell(1);
		infoButtonCell = row.insertCell(2);
		closeButtonCell = row.insertCell(3);

		locationNameCell.innerHTML = addedAttractionsArray[i].name;
		travelInfoCell.innerHTML = "00:00 0km";
		infoButtonCell.innerHTML = "<span class='glyphicon glyphicon-info-sign'></span>";
		closeButtonCell.innerHTML = "<button type='button' class='close' onclick='deleteAttraction(this)'>&times;</button>";
	}
}


// Fixed and shortened
function deleteAttraction(button) {
	var row = $(button).parent().parent();
	addedAttractionsArray.splice(row.index(), 1);
	
	generateTable();
	setAttractionMarkers();
}

function placeAttractions() {
	
}

function shareRoute() {
	
}

function calculateRoute() {
	// Calculate and draw directions
	
	// Set the maps view
	var allLocations, i;
	allLocations = [];
	if (startLocation !== undefined) {
		allLocations.push(startLocation);
	}
	if (destinationLocation !== undefined) {
		allLocations.push(destinationLocation);
	}
	if (addedAttractionsArray.length !== 0) {
		for (i = 0; i < addedAttractionsArray.length; i += 1) {
			allLocations.push(addedAttractionsArray[i].location);
		}
	}
	
    setMapViewport(allLocations);
}

/** Generates and regenerates all the attraction markers **/
function setAttractionMarkers() {
	var i;
	// Clear current markers
	attractionMarkers.splice(0, attractionMarkers.length)
	for (i = 0; i < addedAttractionsArray.length; i += 1) {
		var newMarker = new google.maps.Marker({
			animation: google.maps.Animation.DROP,
			map: map,
			position: addedAttractionsArray[i].location
		});
		attractionMarkers.push(newMarker);
	}
}

function setTravelType(originElement, newTravelType) {
	travelType = newTravelType;
	$("#travel-mode>.btn-group").each(function () {
		$(this).children().first().attr("class", "btn btn-default");
	});
	$(originElement).attr("class", "btn btn-success");
	
	transitLayer.setMap(undefined);
	bicycleLayer.setMap(undefined);
	trafficLayer.setMap(undefined);
	
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
	if ($(button).attr("aria-pressed") !== "true") {
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

