const YALE_PLACES = [
  { name: 'Arthur K. Watson Hall', aliases: ['akw', 'watson hall'], lat: 41.3130777, lon: -72.9248518 },                      
  { name: 'Bass Center for Molecular and Structural Biology', aliases: [], lat: 41.317923, lon: -72.921371 }, 
  { name: 'Bass Library', aliases: ['bass'], lat: 41.3105908, lon: -72.9275784 },                            
  { name: 'Battell Chapel', aliases: ['battell'], lat: 41.309421, lon: -72.9275807 },                          
  { name: 'Boyer Center for Molecular Medicine', aliases: ['bcmm'], lat: 41.3022589, lon: -72.9332806 },       
  { name: 'Benjamin Franklin College', aliases: ['bf', 'ben frank', 'franklin'], lat: 41.3147338, lon: -72.9250155 },                   
  { name: 'Berkeley College', aliases: ['bk'], lat: 41.3110823, lon: -72.9273247 },                            
  { name: 'Brady Memorial Laboratory', aliases: ['bml'], lat: 41.3023256, lon: -72.9340548 },                  
  { name: 'Branford College', aliases: ['br'], lat: 41.3096707, lon: -72.9300833 },                            
  { name: 'Beinecke Rare Book and Manuscript Library', aliases: ['brbl'], lat: 41.3115974, lon: -72.9273243 }, 
  { name: 'Center for Collaborative Arts and Media', aliases: ['ccam'], lat: 41.3076367, lon: -72.9319387 },
  { name: 'Schwarzman Center', aliases: ['commons'], lat: 41.311762763735345, lon: -72.92571574274122 },
  { name: 'Class of 1954 Chemistry Research Building', aliases: ['crb', 'chemistry research building'], lat: 41.3192785, lon: -72.9225858 },  
  { name: 'Durfee Hall', aliases: [], lat: 41.309514, lon: -72.927884 },                                    
  { name: 'Davenport College', aliases: ['dc', 'dport'], lat: 41.3104885, lon: -72.9317443 },                           
  { name: 'Dunham Laboratory', aliases: ['dl'], lat: 41.3123239, lon: -72.9245401 },                           
  { name: 'Dow Hall', aliases: ['dow'], lat: 41.3113611, lon: -72.9238655 },                                   
  { name: 'Edwin McClellan Hall', aliases: ['em'], lat: 41.308349, lon: -72.929302 },                          
  { name: 'Ezra Stiles College', aliases: ['es', 'stiles', '#1 college', 'best college ever'], lat: 41.3127568, lon: -72.9316079 },                         
  { name: 'Class of 1954 Environmental Science Center', aliases: ['esc', 'environmental science center'], lat: 41.316159, lon: -72.9217787 },  
  { name: 'Edward P. Evans Hall', aliases: ['evans', 'som', 'school of management'], lat: 41.3151712, lon: -72.9204749 },                     
  { name: 'Farnam Hall', aliases: [], lat: 41.3090784, lon: -72.927675 },                                   
  { name: 'Grace Hopper College', aliases: ['gh', 'hopper'], lat: 41.30971715218283, lon: -72.92733629202301 },                          
  { name: 'Greeley Memorial Laboratory', aliases: ['gml'], lat: 41.3219469, lon: -72.9245192 },                
  { name: 'Hendrie Hall', aliases: ['hendrie'], lat: 41.3095281, lon: -72.9260516 },                           
  { name: 'Humanities Quadrangle', aliases: ['hq', 'humanities quad'], lat: 41.3123091, lon: -72.9291272 },                       
  { name: 'Jonathan Edwards College', aliases: ['je'], lat: 41.3090406, lon: -72.9299 },                       
  { name: 'Kirtland Hall', aliases: [], lat: 41.3119193, lon: -72.9246237 },                                
  { name: 'Kline Geology Laboratory', aliases: ['kgl'], lat: 41.3165822, lon: -72.9211001 },                   
  { name: 'Kroon Hall', aliases: ['krn'], lat: 41.3167961, lon: -72.9233517 },                                 
  { name: 'Kline Tower', aliases: ['kt'], lat: 41.3172392, lon: -72.9225493 },                                 
  { name: 'Linsly-Chittenden Hall', aliases: ['lc'], lat: 41.3085964, lon: -72.9294779 },                      
  { name: 'Laboratory of Epidemiology and Public Health', aliases: ['leph'], lat: 41.3037353, lon: -72.9321555 }, 
  { name: 'Leitner Family Observatory and Planetarium', aliases: ['lfop', 'planetarium'], lat: 41.3211158, lon: -72.9219502 }, 
  { name: 'Leet Oliver Memorial Hall', aliases: ['lom'], lat: 41.3127715, lon: -72.9243008 },                  
  { name: 'Henry R. Luce Hall', aliases: ['luce'], lat: 41.314648, lon: -72.924065 },                           
  { name: 'Lanman-Wright Memorial Hall', aliases: ['lwr'], lat: 41.309708, lon: -72.928789 },                  
  { name: 'Morse College', aliases: ['mc'], lat: 41.3128567, lon: -72.9296878 },                               
  { name: 'Malone Engineering Center', aliases: ['mec'], lat: 41.313325, lon: -72.924697 },                    
  { name: 'Mason Laboratory', aliases: ['ml'], lat: 41.3121581, lon: -72.9236386 },                            
  { name: 'Pauli Murray College', aliases: ['my', 'murray'], lat: 41.315712, lon: -72.9247213 },                         
  { name: 'Old Campus', aliases: ['oc'], lat: 41.309049230060644, lon: -72.92826663670874},
  { name: 'Osborn Memorial Laboratories', aliases: ['oml'], lat: 41.3164223, lon: -72.9239206 },               
  { name: 'Pierson College', aliases: ['pc'], lat: 41.3101937, lon: -72.9323827 },                             
  { name: 'Phelps Gate', aliases: ['phelps hall'], lat: 41.30844, lon: -72.9281459 },                                   
  { name: 'Payne Whitney Gymnasium', aliases: ['pwg', 'gym'], lat: 41.3137225, lon: -72.9310857 },                    
  { name: 'Rudolph Hall', aliases: ['rdh'], lat: 41.3087688, lon: -72.9318864 },                               
  { name: 'Rosenkranz Hall', aliases: ['rkz'], lat: 41.314701, lon: -72.9245511 },                             
  { name: 'Rosenfeld Hall', aliases: ['rsn'], lat: 41.3110976, lon: -72.9232544 },                             
  { name: 'Sage Hall', aliases: [], lat: 41.3171427, lon: -72.9237605 },                                    
  { name: 'Sterling Chemistry Laboratory', aliases: ['scl'], lat: 41.31804718295404, lon: -72.92307751905743 },                 
  { name: 'Sterling Divinity Quadrangle', aliases: ['sdq', 'div school', 'divinity school'], lat: 41.323479, lon: -72.922374 },                 
  { name: 'Sterling Hall of Medicine', aliases: ['shm', 'med school'], lat: 41.3031862, lon: -72.9337457 },                  
  { name: 'Sterling Law Building', aliases: ['slb', 'law school'], lat: 41.3120323, lon: -72.9277806 },                      
  { name: 'Silliman College', aliases: ['sm'], lat: 41.3104487, lon: -72.9249818 },                            
  { name: 'Sprague Memorial Hall', aliases: ['smh'], lat: 41.310772, lon: -72.9266331 },                       
  { name: 'Sterling Memorial Library', aliases: ['sml', 'sterling'], lat: 41.31109295215313, lon: -72.92840783623994 },                    
  { name: 'Sloane Physics Laboratory', aliases: ['spl'], lat: 41.3172833, lon: -72.9230225 },                  
  { name: 'Sheffield-Sterling-Strathcona Hall', aliases: ['sss'], lat: 41.3119403, lon: -72.9252192 },         
  { name: 'Stoeckel Hall', aliases: ['stoeck'], lat: 41.3104852, lon: -72.9259533 },                           
  { name: 'Saybrook College', aliases: ['sy'], lat: 41.3101499, lon: -72.9291503 },                            
  { name: 'The Anlyan Center', aliases: ['tac'], lat: 41.30118, lon: -72.9340723 },                            
  { name: 'Trumbull College', aliases: ['tc'], lat: 41.3106957, lon: -72.9295748 },                            
  { name: 'Timothy Dwight College', aliases: ['td', 'sux'], lat: 41.3103383, lon: -72.9236478 },                      
  { name: 'University Theatre', aliases: ['ut'], lat: 41.3097276, lon: -72.931185 },                           
  { name: 'Vanderbilt Hall', aliases: [], lat: 41.3079203, lon: -72.9290838 },                              
  { name: 'Welch Hall', aliases: [], lat: 41.3081378, lon: -72.9283577 },                                   
  { name: 'Whitney Grove Square', aliases: ['wgs'], lat: 41.3108682, lon: -72.9229203 },                       
  { name: 'Wright Laboratory', aliases: ['wl'], lat: 41.3190182, lon: -72.9207433 },                           
  { name: 'William L. Harkness Hall', aliases: ['wlh'], lat: 41.3106835, lon: -72.9269975 },                   
  { name: 'Watson Center', aliases: ['wts'], lat: 41.3156164, lon: -72.9235595 },                              
  { name: 'Yale Center for British Art', aliases: ['ycba', 'british art'], lat: 41.3078965, lon: -72.9308607 },               
  { name: 'Yale Science Building', aliases: ['ysb'], lat: 41.3174049, lon: -72.9217621 },                      
  { name: 'Yale University Art Gallery', aliases: ['yuag', 'art gallery'], lat: 41.3084354, lon: -72.9308795 },               
] 



function buildGraph(routes) { // given an array of route objects, builds a graph with the following structure: 
// nodes: {"#55": [ {to: "56", route: routeA}, {to: "57", route: routeA} ]
// edges: edges represent a ride/leg. for instance, node 55 is connected to 57, thus, it takes 1 ride to get from 55 to 57. if you wanted to get to stop x, and 57 was connected to x but 55 wasn't, you would go 55 -> 57 -> x; 2 edges = 2 legs = 1 transfer

  const graph = {}
  
  for(const route of routes) {

    for(let stop = 0; stop < route.stops.length; stop++) {
      
      const stopKey = route.stops[stop]
      if(!graph[stopKey]) { graph[stopKey] = [] } // if we haven't already initialized the value corresponding to our stop's key as an array, do so now
      for(let nextStop = stop + 1; nextStop < route.stops.length; nextStop++) {

        graph[stopKey].push({ to: route.stops[nextStop], route })

      }
    }
  } 
  return graph
}

function reconstructPath(prev, startStopId, endStopId) // helper for findPath; given our  prev table, we want to return an array of triples with the edges' .from and .route , + a new .to reconstructed from prev's .stop
{
  const pathTriple = []
  let current = endStopId

  while (prev[current]) {// terminates when we reach the start entry, since it doesn't have a prev entry
    pathTriple.push({
      from: prev[current].from,
      to: current, // confusing at first, but current is one step ahead of prev[current]'s values
      route: prev[current].route
    })
    current = prev[current].from // we're stepping backwards (until !prev[current], aka until we reach the start)
  }

  if(current !== startStopId) {return null} // something's very wrong if i trigger this lmao

  return pathTriple.reverse() // we built using .push, so it's backwards; reverse before returning
}

function findPath(graph, startStopId, endStopId) { // wrote "stopstop" at first lmao  
  if(!graph[startStopId] || !graph[endStopId]) {return null}
  const queue = [startStopId] // note: this + .shift() is actually O(n)... YIKES. should be OK for now
  const visited = new Set([startStopId]) // set so lookup is O(1)
  const prev = {} // maps prev[stopId] = {from: prevStopId, route: routeObj} so we can backtrack and recreate the path once we find our stop node

  while (queue.length > 0) {
    const nodeId = queue.shift();
    if(nodeId === endStopId) {
      return reconstructPath(prev, startStopId, endStopId)
      // todo: better comment here
    }
    for(const edge of graph[nodeId]) { // loops over the edge objects for our popped node {to: ... route: ...}(see buildGraph)
      const newNodeId = edge.to
      if(!visited.has(newNodeId))
      {
        queue.push(newNodeId)
        visited.add(newNodeId)
        prev[newNodeId] = {from: nodeId, route: edge.route}
      }
    }
  }
  return null;
}

function findPlaceMatches(query, places) { // finds matches in our YALE_PLACES table based on user query
  const normalized = query.toLowerCase().trim()
  return places // operating on YALE_PLACES
    .filter(place =>  
      [place.name.toLowerCase(), ...place.aliases.map(a => a.toLowerCase())] // this is some magic right here. it allocates a whole new array consisting of the name plus every alias (nromalized to lowecase)
      .some(str => str.startsWith(normalized))) // checks if any str in our array (so either a name or alias) starts with our normalized query
    .map(place => ({
      name: place.name,
      lat: place.lat,
      lon: place.lon
    }))
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
  const walkDistance = getDistance(startLat, startLon, endLat, endLon)

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

  const stopsById = {} // builds a lookup object for later o(1) lookup of stops by id number
  for(const stop of stops) {
    stopsById[stop.id] = stop 
  }

  const activeRoutes = routes.filter(route => route.active) // we only use routes which are marked as active
  const graph = buildGraph(activeRoutes)
  // builds our graph based on our routes + stops; see buildGraph implementation for more details

  const candidates = findCandidates(graph, stops, startLat, startLon, endLat, endLon)

  if (candidates.length === 0){
    // no route: work out why, so the app can say something more useful than "no route found"
    return { success: false, message: "No route found", ...explainNoRoute(activeRoutes, routes, stops, startLat, startLon, endLat, endLon) }
  }

  // we now have our populated candidates array. we find the best option (if it exists) based on minimum legs, and as a tiebreaker, least walking distance

  candidates.sort((a,b) => 
    a.path.length - b.path.length || // sort comparator returns 0 (falsy) on tie, in which case || falls through to return walkDistance
    a.walkDistance - b.walkDistance
  )

    // candidates[0] is now our winning path + distance wrapper, so we can store it:
  const finalPath = candidates[0]

  // ... and map the path component to our desired shape. we want to return an array legs[] where each object is one leg { boardStop, alightStop, route}. so:

  const legs = finalPath.path.map(leg => ({
    boardStop: stopsById[leg.from],
    alightStop: stopsById[leg.to],
    route: leg.route
  }))


  return {
    success: true,
    startCoords: { lat: startLat, lon: startLon },
    endCoords: { lat: endLat, lon: endLon },
    legs: legs // with our hydrated stop objects
  }

}

// every working path between the 5 nearest stops at each end, as { path, walkDistance }. only stops that are actually in the
// graph (i.e. served by one of its routes) count as "nearest": a stop no bus visits can never be part of a path, and before
// this, those dead stops were crowding real ones out of the top 5 (about half of all "no route found"s in testing)
function findCandidates(graph, stops, startLat, startLon, endLat, endLon) {
  const servedStops = stops.filter(stop => graph[stop.id]) // graph has an entry for every stop its routes visit

  // find the 5 nearest (served) stops to each location
  const startCandidates = getNearestStops(startLat, startLon, servedStops, 5)
  const endCandidates = getNearestStops(endLat, endLon, servedStops, 5)

  const candidates = []
  // candidates will later store every findPath(graph, startStopId, endStopId) result "path" as { path, walkDistance: startStop.distance + endStop.distance }
  // we store walkdistance for our tiebreak, which is based on overall lowest walking distance between our start + end locations and their respective stops

  // for every combo of start + end stops (25 total)
  for (const startStop of startCandidates) {
    for (const endStop of endCandidates) {
      const path = findPath(graph, startStop.id, endStop.id)
      if(path && path.length > 0) { // only push when path !null and has at least one leg (start === end gives [], which would sort first as "fewest legs")
        candidates.push({ path, walkDistance: startStop.distance + endStop.distance}) // see candidates initialization for more details
      }
    }
  }
  return candidates
}

const NEARBY_METERS = 800 // about a 10 minute walk: farther than this from any stop counts as "no shuttle near here"

// when there's no route, say why. checked in order, first match wins:
//   noService:    no routes are running at all right now
//   outOfArea:    no shuttle stop (running or not) anywhere near the start and/or end
//   notRunning:   there IS a route, but it uses routes that aren't running right now (routeNames says which)
//   nothingNearby: stops exist near there, just none on a running route right now
//   noConnection: running stops near both ends, but no way between them (e.g. the loop seam, see README)
// `which` is 'start', 'end' or 'both' for the two location-specific reasons
function explainNoRoute(activeRoutes, allRoutes, stops, startLat, startLon, endLat, endLon) {
  if (activeRoutes.length === 0) return { reason: 'noService' }

  const nearestServedBy = (routeList, lat, lon) => { // distance to the closest stop that one of routeList visits
    const ids = new Set(routeList.flatMap(route => route.stops))
    return getNearestStops(lat, lon, stops.filter(stop => ids.has(stop.id)), 1)[0]?.distance ?? Infinity
  }
  const which = (startFar, endFar) => (startFar && endFar ? 'both' : startFar ? 'start' : 'end')

  const startFarFromAny = nearestServedBy(allRoutes, startLat, startLon) > NEARBY_METERS
  const endFarFromAny = nearestServedBy(allRoutes, endLat, endLon) > NEARBY_METERS
  if (startFarFromAny || endFarFromAny) return { reason: 'outOfArea', which: which(startFarFromAny, endFarFromAny) }

  // same search again, but with every route including the ones not running right now
  const withInactive = findCandidates(buildGraph(allRoutes), stops, startLat, startLon, endLat, endLon)
  if (withInactive.length > 0) {
    withInactive.sort((a, b) => a.path.length - b.path.length || a.walkDistance - b.walkDistance) // same ranking as planTrip
    const routeNames = [...new Set(withInactive[0].path.filter(leg => !leg.route.active).map(leg => leg.route.name))]
    if (routeNames.length > 0) return { reason: 'notRunning', routeNames } // (rarely the best path picks different stops and needs no inactive route; then fall through)
  }

  const startFarFromActive = nearestServedBy(activeRoutes, startLat, startLon) > NEARBY_METERS
  const endFarFromActive = nearestServedBy(activeRoutes, endLat, endLon) > NEARBY_METERS
  if (startFarFromActive || endFarFromActive) return { reason: 'nothingNearby', which: which(startFarFromActive, endFarFromActive) }

  return { reason: 'noConnection' }
}

// the feed's route.active flag lags the real schedule around shift changes: at 6pm the daytime Blue was still "active" with
// no buses on it, and the night Blue "inactive" with one. so treat a route as running if a bus is on it right now.
// buses = null/undefined means no bus data yet (still loading): keep the flags as they are rather than saying nothing runs.
// an empty list is real data: no buses are running (e.g. after service ends), so no route counts as running
function markRunningRoutes(routes, buses) {
  if (!buses) return routes
  const routesWithBuses = new Set(buses.map(bus => bus.route))
  return routes.map(route => ({ ...route, active: routesWithBuses.has(route.id) }))
}

function getNearestStops(lat, lon, stops, count) { // self explanatory
  return stops 
    // return an array of stops but we've appended the distance between stops 
    .map(stop => ({
      ...stop,
      distance: getDistance(lat, lon, stop.lat, stop.lon)
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, count)
}

export { planTrip, markRunningRoutes, YALE_PLACES, findPlaceMatches, buildGraph, findPath, reconstructPath} // reminder: tells other files how to import this. named export as planTrip