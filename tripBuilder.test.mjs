// standalone tests for the trip builder helpers. run with: node tripBuilder.test.mjs
import assert from 'node:assert/strict'
import { stopsAfter, rideTimes, catchableBus, builtTrip } from './src/tripBuilder.js'

let passed = 0
function test(name, fn) {
  try {
    fn()
    passed++
    console.log(`ok - ${name}`)
  } catch (err) {
    console.error(`FAIL - ${name}\n  ${err.message}`)
    process.exitCode = 1 // keep running the rest, but exit non-zero
  }
}

const stops = [1, 2, 3, 4, 5].map(id => ({ id, name: `S${id}`, lat: 41.3 + id / 1000, lon: -72.93 }))
const names = list => list.map(stop => stop.name)

// ---- stops after boarding ----

test('stops after: carries on around the loop, once, without the board stop', () => {
  const loop = { id: 10, stops: [1, 2, 3, 4, 5] }
  assert.deepEqual(names(stopsAfter(loop, 3, stops)), ['S4', 'S5', 'S1', 'S2'])
  assert.deepEqual(names(stopsAfter(loop, 1, stops)), ['S2', 'S3', 'S4', 'S5'])
})

test('stops after: out-and-back route keeps the repeats but never lists the board stop again', () => {
  const west = { id: 11, stops: [1, 2, 3, 2, 1] } // 1 -> 3 and back
  assert.deepEqual(names(stopsAfter(west, 2, stops)), ['S3', 'S1', 'S1']) // from the first 2: 3, (2 skipped), 1, then around to 1
})

test('stops after: board stop not on the route, or unknown ids -> skipped', () => {
  assert.deepEqual(stopsAfter({ id: 12, stops: [1, 2] }, 9, stops), [])
  assert.deepEqual(names(stopsAfter({ id: 12, stops: [1, 99, 2] }, 1, stops)), ['S2'])
})

// ---- ride times ----

test('ride times: the chosen bus\'s time at each stop', () => {
  const after = [stops[3], stops[4]] // S4, S5
  const etas = {
    4: [{ bus_id: 7, avg: 9 }, { bus_id: 8, avg: 2 }],
    5: [{ bus_id: 7, avg: 12 }],
  }
  assert.deepEqual(rideTimes(after, etas, 7, 5), [9, 12]) // bus 8 is someone else's bus
})

test('ride times: a time before you board is the bus\'s earlier pass -> null', () => {
  const after = [stops[3], stops[4], stops[0]]
  const etas = { 4: [{ bus_id: 7, avg: 9 }], 5: [{ bus_id: 7, avg: 12 }], 1: [{ bus_id: 7, avg: 1 }] } // S1 comes before boarding
  assert.deepEqual(rideTimes(after, etas, 7, 5), [9, 12, null])
})

test('ride times: missing data, and a repeated stop\'s second listing -> null', () => {
  const after = [stops[2], stops[0], stops[2]]
  const etas = { 3: [{ bus_id: 7, avg: 8 }] }
  assert.deepEqual(rideTimes(after, etas, 7, 5), [8, null, null])
})

// ---- catching a bus ----

test('catchable bus: soonest on that route, not before you get there', () => {
  const etas = [{ route: 10, avg: 3, bus_id: 1 }, { route: 10, avg: 14, bus_id: 2 }, { route: 11, avg: 6, bus_id: 3 }, { route: 10, avg: 9, bus_id: 4 }]
  assert.equal(catchableBus(etas, 10).bus_id, 1)
  assert.equal(catchableBus(etas, 10, 8).bus_id, 4) // you arrive at 8 min, so the 3 min bus is gone
  assert.equal(catchableBus(etas, 10, 20), null)
})

// ---- the finished trip ----

test('built trip: same shape as planTrip, pins on the first board and last alight stop', () => {
  const route = { id: 10, name: 'Blue', stops: [1, 2, 3] }
  const trip = builtTrip([
    { route, boardStop: stops[0], alightStop: stops[1], busId: 7 },
    { route, boardStop: stops[1], alightStop: stops[2] },
  ])
  assert.equal(trip.success, true)
  assert.equal(trip.built, true)
  assert.equal(trip.legs.length, 2)
  assert.deepEqual(Object.keys(trip.legs[0]).sort(), ['alightStop', 'boardStop', 'route']) // builder-only fields dropped
  assert.deepEqual(trip.startCoords, { lat: stops[0].lat, lon: stops[0].lon })
  assert.deepEqual(trip.endCoords, { lat: stops[2].lat, lon: stops[2].lon })
})

console.log(`\n${passed} passed`)
