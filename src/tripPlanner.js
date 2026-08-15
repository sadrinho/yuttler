const YALE_LANDMARKS = { //TODO: fix location coordinates. many are incorrect (oc for certain)
  'beinecke': { lat: 41.3116, lon: -72.9271 },
  'beinecke library': { lat: 41.3116, lon: -72.9271 },
  'yale medical school': { lat: 41.3024, lon: -72.9348 },
  'medical school': { lat: 41.3024, lon: -72.9348 },
  'yms': { lat: 41.3024, lon: -72.9348 },
  'bass library': { lat: 41.3098, lon: -72.9290 },
  'bass': { lat: 41.3098, lon: -72.9290 },
  'sterling library': { lat: 41.3113, lon: -72.9288 },
  'sterling': { lat: 41.3113, lon: -72.9288 },
  'yale station': { lat: 41.3074, lon: -72.9271 },
  'old campus': { lat: 41.3105, lon: -72.9264 },
  'oc': { lat: 41.3105, lon: -72.9264 },
  'cross campus': { lat: 41.3108, lon: -72.9282 },
  'science hill': { lat: 41.3203, lon: -72.9225 },
  'payne whitney': { lat: 41.3163, lon: -72.9212 },
  'divinity school': { lat: 41.3248, lon: -72.9220 },
}

const YALE_PLACES = [ 
  //TODO: implement
  {
    name: 'Yale School of Medicine',
    aliases: ['yms', 'med school', 'school of medicine', 'medical'],
    lat: 41.3024,
    lon: -72.9348
  },
  {
    name: 'Beinecke Library',
    aliases: ['beinecke', 'beinecke library'],
    lat: 41.3116,
    lon: -72.9271
  },
]

function findPlaceMatches(query, places) { // finds matches in our YALE_PLACES table based on user query
  const normalized = query.toLowerCase().trim()
  return places // operating on YALE_PLACES
    .filter(place =>  
      [place.name.toLowerCase(), ...place.aliases] // this is some magic right here. it allocates a whole new array consisting of the name plus every alias
      .some(str => str.startsWith(normalized))) // checks if any str in our array (so either a name or alias) starts with our normalized query
    .map(place => ({
      name: place.name,
      lat: place.lat,
      lon: place.lon
    }))
}

function findNearestStop(lat, lon, stops) { // rerturns nearest stop, self explanatory
// lat + lon self explanatory, stops is ... the list of all 172 stops?
  let nearest = null 
    // Q: why let? do we not need to define var type?
    // A: not in javascript, dynamic typing. we use let because the value changes later
  let shortestDistance = Infinity

  for (const stop of stops) { 
    // Q: why do we use const by default?
    // A: the value is never being reassigned
    const distance = getDistance(lat, lon, stop.lat, stop.lon) 
    // Q: how can we access .lat and .lon w/o having defined a stop object?
    // A: actually, the stops.json already has each stop object defined with properties. that's the purpose of a json file
    if (distance < shortestDistance) {
      shortestDistance = distance 
      nearest = stop
    }
  }

  return nearest
}

function getDistance(lat1, lon1, lat2, lon2) { // haversine formula. input 2 lat/lon pairs, receive distance in meters
  const R = 6371000 // C: Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180 
  const φ2 = lat2 * Math.PI / 180
  const Δφ = (lat2 - lat1) * Math.PI / 180
  const Δλ = (lon2 - lon1) * Math.PI / 180

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + 
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2)

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)) 
}

function planTrip(startLat, startLon, endLat, endLon, stops, routes) {

  // store the direct distance between stops (to check if we should walk instead)
  const walkDistance = getDistance(startLat, startLon, endLat, endLon);

  if (walkDistance < 400) // 400 meters is a safe minimum for a bus route for now; a bit on the shorter side if anything
  {
    return { 
      success: true,
      walkOnly: true,
      startCoords: { lat: startLat, lon: startLon },
      endCoords: { lat: endLat, lon: endLon },
      distance: walkDistance
    }
  }

  // find the 5 nearest stops to each location
  const startCandidates = getNearestStops(startLat, startLon, stops, 5)
  const endCandidates = getNearestStops(endLat, endLon, stops, 5)




  // "In the right order" means that since the list of stops in a given route doesn't "jump" at the end i.e. the bus
  //    doesn't just teleport to the starting stop after it finishes the last stop, we want to make sure we
  //    avoid traveling much more than we need to in case both stops are in the route but not in order
  

  // try every combo of start and end candidates
  for (const startStop of startCandidates) {
    for (const endStop of endCandidates) {
      for (const route of routes) {
        const startIndex = route.stops.indexOf(startStop.id)
        const endIndex = route.stops.indexOf(endStop.id)

        if (startIndex !== -1 && endIndex !== -1 && startIndex < endIndex) {
          return {
            success: true,
            startCoords: { lat: startLat, lon: startLon },
            endCoords: { lat: endLat, lon: endLon },
            boardStop: startStop,
            alightStop: endStop, // added a new word to my vocabulary
            route: route
          }
        }
      }
    }
  }

  return { success: false, message: "No direct route found" }
}

function getNearestStops(lat, lon, stops, count) { // self explanatory
  return [...stops] // ... is the spread operator, meaning "unpack everything about this thing." in this case we made a copy of the array stops
    // return an array of stops but we've appended the distance between stops 
    .map(stop => ({
      ...stop,
      distance: getDistance(lat, lon, stop.lat, stop.lon)
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, count)
}

export { planTrip, YALE_LANDMARKS } // reminder: tells other files how to import this. named export as planTrip