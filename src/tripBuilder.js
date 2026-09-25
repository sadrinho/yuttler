// helpers for building a trip by hand from stop boards. no react in here, so tripBuilder.test.mjs can run them in plain node

const MAX_LEGS = 3 // at most 2 transfers

// the stops a bus visits after boardStopId, in order, going once around the loop (routes are loops, so after the last
// listed stop it carries on from the first). stops once around that are the board stop again are left out.
// if the board stop is listed twice (out-and-back routes), this starts from its first listing, same as the stop counter
function stopsAfter(route, boardStopId, stops) {
  const byId = new Map(stops.map(stop => [stop.id, stop]))
  const ids = route.stops
  const start = ids.indexOf(boardStopId)
  if (start === -1) return []
  const after = []
  for (let k = 1; k < ids.length; k++) {
    const id = ids[(start + k) % ids.length]
    if (id !== boardStopId && byId.has(id)) after.push(byId.get(id))
  }
  return after
}

// when the bus you're riding (busId) gets to each stop in `after`, in minutes from now, or null where we can't say.
// etasByStop = { [stopId]: raw /eta list } for those stops. the feed gives each bus's NEXT visit to a stop, so a time
// earlier than when you board (or than the stop before) is the bus passing that stop before it reaches you, not after:
// those, and a stop's second listing on an out-and-back route (same next-visit time again), come back as null
function rideTimes(after, etasByStop, busId, boardAvg) {
  const used = new Set()
  let last = boardAvg
  return after.map(stop => {
    const eta = (etasByStop[stop.id] ?? []).find(e => e.bus_id === busId)
    if (!eta || eta.avg < last || used.has(stop.id)) return null
    used.add(stop.id)
    last = eta.avg
    return eta.avg
  })
}

// the first bus on routeId you can actually catch: arriving no sooner than notBefore minutes from now (when you get to the
// stop, on a transfer). etas = the raw /eta list at the stop. null if there isn't one
function catchableBus(etas, routeId, notBefore = 0) {
  return etas
    .filter(eta => eta.route === routeId && eta.avg >= notBefore)
    .sort((a, b) => a.avg - b.avg)[0] ?? null
}

// the hand-built legs as a trip result the trip view already understands (same shape as planTrip's).
// legs = [{ route, boardStop, alightStop }]. start/end pins go on the first stop you board at and the last you get off at
function builtTrip(legs) {
  const first = legs[0].boardStop
  const last = legs[legs.length - 1].alightStop
  return {
    success: true,
    built: true, // no start/end search behind it, so the app hides the search fields during the trip
    startCoords: { lat: first.lat, lon: first.lon },
    endCoords: { lat: last.lat, lon: last.lon },
    legs: legs.map(({ route, boardStop, alightStop }) => ({ route, boardStop, alightStop })),
  }
}

export { MAX_LEGS, stopsAfter, rideTimes, catchableBus, builtTrip }
