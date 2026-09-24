// helpers for the stop board and the nearby stops list. no react in here, so stops.test.mjs can run them in plain node
import { getDistance } from './tripPlanner.js'

const NEARBY_METERS = 400 // about a 5 minute walk
const NEARBY_COUNT = 5 // one /eta call per stop, so keep this small
const FALLBACK_COUNT = 3 // nothing within 400m: still show the closest few, with how far they are

// planTrip's walking pace: 80 m/min is about 3 mph
function walkMinutes(meters) {
  return Math.max(1, Math.round(meters / 80))
}

// stops near a point, closest first, each with .distance in meters. only stops a running route visits, unless nothing is
// running at all (then any route's stops, so you can still see what normally stops there; anyRunning says which).
// up to 5 within 400m; if there are none that close, the 3 closest anywhere and withinRadius is false
function nearbyStops(lat, lon, stops, routes) {
  const running = routes.filter(route => route.active)
  const anyRunning = running.length > 0
  const served = new Set((anyRunning ? running : routes).flatMap(route => route.stops))

  const byDistance = stops
    .filter(stop => served.has(stop.id))
    .map(stop => ({ ...stop, distance: getDistance(lat, lon, stop.lat, stop.lon) }))
    .sort((a, b) => a.distance - b.distance)

  const close = byDistance.filter(stop => stop.distance <= NEARBY_METERS).slice(0, NEARBY_COUNT)
  if (close.length > 0) return { stops: close, withinRadius: true, anyRunning }
  return { stops: byDistance.slice(0, FALLBACK_COUNT), withinRadius: false, anyRunning }
}

// stops whose name contains the query, for the search box. names that start with it come first, then alphabetical.
// only stops some route visits (running or not): the feed has a few stops no route uses
function searchStops(query, stops, routes, limit = 8) {
  const q = query.toLowerCase().trim()
  if (!q) return []
  const served = new Set(routes.flatMap(route => route.stops))
  return stops
    .filter(stop => served.has(stop.id) && stop.name.toLowerCase().includes(q))
    .sort((a, b) =>
      Number(b.name.toLowerCase().startsWith(q)) - Number(a.name.toLowerCase().startsWith(q)) ||
      a.name.localeCompare(b.name))
    .slice(0, limit)
}

// what the stop board shows. etas = the raw /eta list for this stop (every route that stops here, unsorted).
//   arriving: routes with a bus heading here, as { route, etas } with etas soonest first; the route with the soonest bus first
//   others:   routes that stop here with nothing heading this way, running ones (active) first
// etas for a route we don't know about are dropped, since there'd be no name or color to show
function boardForStop(stopId, etas, routes) {
  const here = routes.filter(route => route.stops.includes(stopId))
  const arriving = here
    .map(route => ({ route, etas: etas.filter(eta => eta.route === route.id).sort((a, b) => a.avg - b.avg) }))
    .filter(row => row.etas.length > 0)
    .sort((a, b) => a.etas[0].avg - b.etas[0].avg)
  const arrivingIds = new Set(arriving.map(row => row.route.id))
  const others = here
    .filter(route => !arrivingIds.has(route.id))
    .sort((a, b) => Number(Boolean(b.active)) - Number(Boolean(a.active)))
  return { arriving, others }
}

// the soonest bus at a stop, for the nearby list: { route, avg }, or null if nothing (we know of) is coming
function soonestArrival(etas, routes) {
  const routesById = new Map(routes.map(route => [route.id, route]))
  let best = null
  for (const eta of etas) {
    const route = routesById.get(eta.route)
    if (route && (!best || eta.avg < best.avg)) best = { route, avg: eta.avg }
  }
  return best
}

export { nearbyStops, searchStops, boardForStop, soonestArrival, walkMinutes, NEARBY_METERS }
