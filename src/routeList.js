// helpers for the routes menu and what the map shows outside a trip. no react in here, so routeList.test.mjs can run them in plain node

// the saved map settings (localStorage "routePrefs"). hidden is an opt-out list of route ids, so a route the feed adds later shows up by default
const DEFAULT_PREFS = { showAll: false, hidden: [], showStops: false }

function readPrefs(raw) {
  try {
    const saved = JSON.parse(raw)
    return {
      showAll: saved?.showAll === true,
      hidden: Array.isArray(saved?.hidden) ? saved.hidden : [],
      showStops: saved?.showStops === true,
    }
  } catch {
    return DEFAULT_PREFS // nothing saved yet, or garbage
  }
}

// the routes menu's rows: { route, busCount }, running routes first, then by name.
// with showAll off it only lists running routes (same as the map), and notRunningCount says how many it left out
function routeRows(routes, buses, showAll) {
  const counts = new Map()
  for (const bus of buses) counts.set(bus.route, (counts.get(bus.route) ?? 0) + 1)
  const listed = showAll ? routes : routes.filter(route => route.active)
  const rows = listed
    .map(route => ({ route, busCount: counts.get(route.id) ?? 0 }))
    .sort((a, b) => Number(Boolean(b.route.active)) - Number(Boolean(a.route.active)) || a.route.name.localeCompare(b.route.name))
  return { rows, notRunningCount: routes.length - routes.filter(route => route.active).length }
}

// ids of the routes the map draws outside a trip: running ones (or all, with showAll), minus the ones switched off
function visibleRouteIds(routes, prefs) {
  const hidden = new Set(prefs.hidden)
  return new Set(routes.filter(route => (prefs.showAll || route.active) && !hidden.has(route.id)).map(route => route.id))
}

// every stop at least one of these routes visits, once each (for the stop dots)
function stopsOnRoutes(routeList, stops) {
  const ids = new Set(routeList.flatMap(route => route.stops))
  return stops.filter(stop => ids.has(stop.id))
}

// a route's stops in the order the bus visits them. some routes list a stop twice (out-and-back), so it can appear twice.
// ids with no stop in the feed are skipped
function routeStopsInOrder(route, stops) {
  const byId = new Map(stops.map(stop => [stop.id, stop]))
  return route.stops.map(id => byId.get(id)).filter(Boolean)
}

export { DEFAULT_PREFS, readPrefs, routeRows, visibleRouteIds, stopsOnRoutes, routeStopsInOrder }
