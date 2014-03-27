// Original source: http://tympanus.net/codrops/2012/10/11/real-time-geolocation-service-with-node-js/
// Uses leaflet.js
// http://leafletjs.com/

$(function(){
	// generate unique user id
	var userId = Math.random().toString(16).substring(2,15);
	var socket = io.connect("/");
	var map;

	var info = $('infobox');
	var doc = $(document);

	// custom marker's icon styles
	// Use f L.Icon from leaflet.js
	// https://stackoverflow.com/questions/16168188/leaflet-marker-icon-size-on-geojson-layer
	var tinyIcon = L.icon.extend({
		options: {
			shadowUrl: '../assets/marker-shadow.png',
			iconSize: [25, 39],
			iconAnchor: [12, 36],
			shadowSize: [41,41],
			shadowAnchor: [12,38],
			popupAnchor: [0, -30]
		}
	});

	var redIcon = new tinyIcon({ iconURL: "../assets/marker-red.png"});
	var yellowIcon = new tinyIcon({ iconURL: "../assets/marker-yellow.png"});

	var sentData = {};

	var connects = {};
	var markers = {};
	var active = false;

	socket.on("load:coords", function(data){
		//remember users id to sow marker only once
		if (!(data.id in connects)) {
			setMarker(data);
		}

		connects[data.id] = data;
		// shorthand for (new Date).getTime()
		connects[data.id].updated = $.now();  
	});

	// check whether the browser supports geolocation api
	if (navigator.geolocation) {
		navigator.geolocation.getCurrentPosition(positionSuccess, positionError, {enableHighAccuracy: true});	
	} else {
		$(".map").text("Your browser is out of fashion, there\'s no geolocation!");
	}

	function positionSuccess(position) {
		var lat = position.coords.latitude;
		var lng = position.coords.longitude;
		var acr = position.coords.accuracy;

		// mark user's position
		var userMarker = L.marker([lat, lng], {
			icon: redIcon
		});

		// load leaflet map
		map = L.map("map");

		// leaflet API key filter
		L.tileLayer("https://{s}.tile.cloudmade.com/BC9A493B41014CAABB98F0471D759707/997/256/{z}/{x}/{y}.png", { maxZoom: 18, detectRetina: true }).addTo(map))
		
		// set map bounds
		map.fitWorld();
		userMarker.addTo(map);
		userMarker.bindPopup("<p>Your are there! Your ID is " + + userId + "</p>").openPopup();

		// send coords on when user is active
		doc.on("moursemove", function(){
			active = true;
			sentData = {
				id:userId,
				active: active,
				coords: [{
					lat: lat,
					lng: lng,
					acr: acr
				}]
			}
			socket.emit("send:coords", sentData);
		})
	}

	doc.bind("mouseup mouseleave", function(){
		active = false;
	});

	// showing markers for connections

	function setMarker(data){
		for (i=0; i< data.coords.length; i++) {
			var marker = L.marker([data.coords[i].lat, data.coords])
			marker.bindPopUp("<p>One more external use is here!</p>");
			markers[data.id] = marker;
		}
	}

	// handle geolocation api errors
	function positionError(error) {
		var errors = {
			1: "Authorization fails", // permission denied
			2: "Can\'t detect your location", // position unavailable
			3: 'Connection timeout' //timeout
		};
		showError("Error:" + errors[error.code]);		
	}

	function showError(msg) {
		info.addClass("error").text(msg);
	}

	// delete inactive users every 15 sec
	setInterval(function() {
		for (ident in connects){
			if ($.now() - connects[ident].updated > 15000) {
				delete connects[ident];
				map.removeLayer(markers[ident]);
			}
		}
	}, 15000);

})