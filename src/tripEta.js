// when you'll get there, worked out from live arrival times. no react in here, so tripEta.test.mjs can run it in plain node
import { catchableBus } from './tripBuilder.js'

// the stops whose arrival times we need: from the leg you're on to the end, each leg's board stop (not the one you've
// already boarded at) and the stop you get off at
function arrivalStopIds(legs, legIndex, boarded) {
  const ids = new Set()
  legs.slice(legIndex).forEach((leg, i) => {
    if (!(i === 0 && boarded)) ids.add(leg.boardStop.id)
    ids.add(leg.alightStop.id)
  })
  return [...ids]
}

// minutes from now until you get off the bus on this leg (alight) and until you're at your destination (arrive).
// either is null when the feed can't say. etasByStop = { [stopId]: raw /eta list }, boardedBusId = the bus you're on (null
// while waiting), endWalkMinutes = the walk from the last stop to the destination.
// it follows the buses you'd actually take: the soonest one at each board stop that comes after you get there, then that
// same bus's time at the stop you get off at. the feed gives each bus's NEXT visit to a stop, so a time earlier than when
// you board is the bus passing that stop before it reaches you: no honest answer then, so null
function tripArrival({ legs, legIndex, boardedBusId = null, etasByStop, endWalkMinutes = 0 }) {
  let now = 0 // minutes from now at which you're standing at the next board stop
  let alight = null
  for (let i = legIndex; i < legs.length; i++) {
    const leg = legs[i]
    let busId = boardedBusId
    let boardAt = 0
    if (i > legIndex || boardedBusId == null) {
      const bus = catchableBus(etasByStop[leg.boardStop.id] ?? [], leg.route.id, now)
      if (!bus) return { alight, arrive: null }
      busId = bus.bus_id
      boardAt = bus.avg
    }
    const off = (etasByStop[leg.alightStop.id] ?? []).find(eta => eta.bus_id === busId && eta.route === leg.route.id)
    if (!off || off.avg < boardAt) return { alight, arrive: null }
    now = off.avg
    if (i === legIndex) alight = now
  }
  return { alight, arrive: now + endWalkMinutes }
}

export { arrivalStopIds, tripArrival }
