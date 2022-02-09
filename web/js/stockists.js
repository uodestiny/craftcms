var map;
var originalStores = [];
var markersArr = [];
var geocoder = new google.maps.Geocoder();

var typingTimer; //timer identifier
var doneTypingInterval = 1000; //time in ms, 5 second for example
var $location = $('#location');

const infowindow = new google.maps.InfoWindow();

$location.on('keyup', function(e) {
  clearTimeout(typingTimer);
  typingTimer = setTimeout(queryLocation, doneTypingInterval);
});

$location.on('keydown', function() {
  clearTimeout(typingTimer);
});

function queryLocation(urlParamLocation) {
  var queryingLocation = (urlParamLocation) ? urlParamLocation : $('#location').val();
  getLatLong(queryingLocation, function(discoveredLatLng) {
    replotMap(discoveredLatLng);
  });
}

function getLatLong(address, cb) {
  var tempCurrentPosition = {
    latitude: "",
    longitude: ""
  };
  geocoder.geocode({
    'address': address
  }, function(results, status) {
    if (status == google.maps.GeocoderStatus.OK) {
      tempCurrentPosition.latitude = results[0].geometry.location.lat();
      tempCurrentPosition.longitude = results[0].geometry.location.lng();
      cb(tempCurrentPosition);
    }
  });
}

function replotMap(locationValue) {
  if (locationValue) {
    $.each(originalStores, function(index, thisLocale) {
      thisLocale.distance = getDistanceFromLatLon(locationValue.latitude, locationValue.longitude, thisLocale.latitude, thisLocale.longitude);
    });
    var sdCompliant = withinOneSD(originalStores, standardDeviation(originalStores));
    addMapMarkers(sdCompliant);
  }
}

function initialize() {
  var input = document.getElementById('location');
  var autocomplete = new google.maps.places.Autocomplete(input);
}

initialize();

function initializeMap() {
  var myLatlng = new google.maps.LatLng(56.68006936815838, -3.9595722498721955);
  var mapOptions = {
    zoom: 7,
    center: myLatlng,
    scrollwheel: false,
    navigationControl: false,
    mapTypeControl: false,
    scaleControl: false,
    draggable: true,
  };
  map = new google.maps.Map(document.getElementById('map-canvas'),
    mapOptions);
  plotAllMarkers();
}

initializeMap();

function plotAllMarkers() {
  removeExtraneousMarkers();
  $.each($('#locations-ul li'), function(index, store) {
    var thisStoreObj = {};
    thisStoreObj.product = $(store).attr('data-product');
    thisStoreObj.url = $(store).attr('data-url');
    thisStoreObj.latitude = $(store).attr('data-latitude');
    thisStoreObj.longitude = $(store).attr('data-longitude');
    thisStoreObj.Store = $(store).attr('data-store');
    thisStoreObj.address1 = $(store).attr('data-address1');
    thisStoreObj.address2 = $(store).attr('data-address2');
    thisStoreObj.address3 = $(store).attr('data-address3');
    thisStoreObj.address4 = $(store).attr('data-address4');
    thisStoreObj.zoom = $(store).attr('data-zoom');
    thisStoreObj.products_stocked = $(store).attr('data-stockists-string');
    thisStoreObj.distance = "";
    originalStores.push(thisStoreObj);
  });
  originalStores = originalStores.sort(compare);
  $.each(originalStores, function(index, thisStore) {
    if (thisStore.Store) {
      plotTableRow(thisStore);
    }
  });
  addMapMarkers(originalStores);
}

function addMapMarkers(arr, allArr) {
  removeExtraneousMarkers();
  deleteMarkers();
  var bounds = new google.maps.LatLngBounds();
  $.each(arr, function(index, thisLocation) {
    plotTableRow(thisLocation);

    var currLatlng = new google.maps.LatLng(thisLocation.latitude, thisLocation.longitude);
    var marker = new google.maps.Marker({
      position: currLatlng,
      map: map,
      title: thisLocation.Store,
      state: thisLocation.product
    });
    
    marker.addListener("click", () => {
        
        var products_stocked = thisLocation.products_stocked.split(",");
        var products_stocked_as_links;
        $.each(products_stocked,function(i){
            if(products_stocked[i] != '' || products_stocked[i] != undefined) {
                products_stocked_as_links = products_stocked_as_links + '<a href=/product/' + products_stocked[i] + '>' + products_stocked[i].replace(/-/g, ' ') + '</a><br>';
            }
        });
        
        infowindow.setContent('<h1><a href="/stockist/' + thisLocation.url + '">' + thisLocation.Store + '</a></h1><h3>Address</h3>' + thisLocation.address1 + '<br>' + thisLocation.address2 + '<br>' + thisLocation.address3 + '<br>' + thisLocation.address4 + '<br>' + currLatlng + '<h3>Products Stocked</h3>' + products_stocked_as_links.replace('undefined', ''));
        infowindow.open({
          anchor: marker,
          map,
          shouldFocus: false,
        });
      });

    markersArr.push(marker);
  });
  for (var i = 0; i < markersArr.length; i++) {
    bounds.extend(markersArr[i].getPosition());
  }
  
  if($('#map-canvas').data('zoom') == 0) {
    
      map.fitBounds(bounds);
      adjustPlottedMarkersToBounds(markersArr);
      
  } else {
      map.setZoom($('#map-canvas').data('zoom'));
  }
}

function filterByState(stateMarkerArr) {
    $('#state-select').on('change', function() {
        var selected_product = $(this).val();
        
        for (i = 0; i < markersArr.length; i++) {
          marker = markersArr[i];
    
          // If is same category or category not picked
          if(marker.state == selected_product || selected_product == '')
          {
              marker.setVisible(true);
          }
          // Categories don't match 
          else
          {          
              marker.setVisible(false);
          }
        }

    });
    
    
    $('#stockist_name').on('change', function() {
        
        var stockist_name = $(this).val().toLowerCase();
        
        for (i = 0; i < markersArr.length; i++) {
          marker = markersArr[i];
              console.log(marker.title);
    
          // If is same category or category not picked
          if (marker.title.toLowerCase().indexOf(stockist_name) >= 0 || stockist_name == '')
          {
              marker.setVisible(true);
          }
          // Categories don't match 
          else
          {          
              marker.setVisible(false);
          }
        }
    });
}

function adjustPlottedMarkersToBounds(allArr) {
  google.maps.event.addListener(map, 'bounds_changed', function() {
    removeExtraneousMarkers();
    var markersArrStateFilter = [];
    for (var i = 0; i < allArr.length; i++) {
      if (map.getBounds().contains(allArr[i].getPosition())) {
        // markers[i] in visible bounds
        markersArrStateFilter.push(allArr[i]);
        allArr[i].setMap(map);
        $.each(originalStores, function(index, thisStore) {
          if (thisStore.Store == allArr[i].title) {
            plotTableRow(thisStore, "filtered-location");
          }
        });
      } else {
        // markers[i] is not in visible bounds
        allArr[i].setMap(null);
      }
    }
    filterByState(markersArrStateFilter);
  });
};

function removeExtraneousMarkers() {
  $('.locations-div').remove()
  $('#state-select').val('').change();
}

// Sets the map on all markers in the array.
function setMapOnAll(map) {
  for (var i = 0; i < markersArr.length; i++) {
    markersArr[i].setMap(map);
  }
}

// Removes the markers from the map, but keeps them in the array.
function clearMarkers() {
  setMapOnAll(null);
}

function deleteMarkers() {
  clearMarkers();
  markersArr = [];
}

function plotTableRow(thisStore, addedClass) {
  $('.locations-table').append('<div class="columns small-12 medium-6 locations-div ' + addedClass + '"><div class="row"><div class="columns small-3"><img src="https://cdn1.iconfinder.com/data/icons/mirrored-twins-icon-set-hollow/512/PixelKit_point_marker_icon.png"></div><div class="columns small-9"><h3>Marker</h3><h4>' + thisStore.product + '</h4></div></div></div>');
};

function compare(a, b) {
  if (a.distance < b.distance)
    return -1;
  if (a.distance > b.distance)
    return 1;
  return 0;
}

function getDistanceFromLatLon(lat1, lon1, lat2, lon2) {
  var R = 6371; // Radius of the earth in km
  var dLat = deg2rad(lat2 - lat1); // deg2rad below
  var dLon = deg2rad(lon2 - lon1);
  var a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  var d = R * c; // Distance in km
  return getMiles(d);
}

function deg2rad(deg) {
  return deg * (Math.PI / 180)
}
//converts to miles
function getMiles(i) {
  return i * 0.621371192;
}

function withinOneSD(arr, sd) {
  var tempArr = [];
  var arrMax = Math.max.apply(Math, numArr);
  var arrMin = Math.min.apply(Math, numArr);
  $.each(arr, function(index, currValue) {
    if (currValue.distance <= (arrMin + sd)) {
      tempArr.push(currValue);
    }
  });
  return tempArr;
}
var numArr;

function standardDeviation(values) {
  numArr = [];
  $.each(values, function(index, currentValue) {
    numArr.push(currentValue.distance);
  })
  var avg = average(numArr);

  var squareDiffs = numArr.map(function(value) {
    var diff = value - avg;
    var sqrDiff = diff * diff;
    return sqrDiff;
  });

  var avgSquareDiff = average(squareDiffs);

  var stdDev = Math.sqrt(avgSquareDiff);
  return stdDev;
}

function average(data) {
  var sum = data.reduce(function(sum, value) {
    return sum + value;
  }, 0);

  var avg = sum / data.length;
  return avg;
}