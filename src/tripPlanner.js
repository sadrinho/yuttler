const YALE_LANDMARKS = {
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
  //TODO: implement in V2
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

async function geocode(query) { 
  // using nominatim's free API to geocode user queries.
  // also, uses async so we can use "await"

  //first, checks landmarks list for a match
  const normalized = query.toLowerCase().trim()
  if (YALE_LANDMARKS[normalized]) {
    return YALE_LANDMARKS[normalized]
  }

  // no match, uses nominatim

  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&viewbox=-73.0,41.28,-72.9,41.33&bounded=1`
  const response = await fetch(url)
  const results = await response.json()

  // console.log('Geocode results:', results)
  
  if (results.length === 0) return null
  
  return {
    lat: parseFloat(results[0].lat),
    lon: parseFloat(results[0].lon)
  }
}

function findPlace(query, places) { 
  //TODO: implement in V2
  const normalized = query.toLowerCase().trim()

  for(const candidate of places)
  {
    
    if([candidate.name.toLowerCase(), ...candidate.aliases].includes(normalized)) { // spread ... operator to unpack
      return candidate;
    }
  }
  return null;
    // query: what the user typed, e.g. "med school"
  // places: the YALE_PLACES array
  // 
  // Return the matching place object, or null if no match.
  // A place matches if the query matches its name OR any of its aliases.
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
  
  /*const startStop = findNearestStop(startLat, startLon, stops)
  const endStop = findNearestStop(endLat, endLon, stops)*/

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
            route: route.name
          }
        }
      }
    }
  }

  return { success: false, message: "No direct route found" }
}
  /*
  let bestRoute = null 
  for (const route of routes) { // for every route we have,
    const startIndex = route.stops.indexOf(startStop.id) // record at what index the startstop occurs
    const endIndex = route.stops.indexOf(endStop.id) // record at what index the end stop occurs

    if (startIndex !== -1 && endIndex !== -1 && startIndex < endIndex) { // if the two indexes are in the list (!= -1) in order,
      bestRoute = route
      break
    } // no else yet it seems
  }

  // C: Step 3: return the result
  // surely this block is where we add more cases
  if (!bestRoute) {
    return { success: false, message: "No direct route found" }
  }

  return { 
    // Q: never seen a return statement like this, how does it return these things/how does wherever we called it expect these?
    // A: this is an object, just like we saw in the .json files earlier. 
    success: true, 
    boardAt: startStop.name, 
    alightAt: endStop.name,
    route: bestRoute.name
  }
}*/

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

export { planTrip, geocode, YALE_LANDMARKS } // reminder: tells other files how to import this. named export as planTrip