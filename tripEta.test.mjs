// standalone tests for the arrival time helpers. run with: node tripEta.test.mjs
import assert from 'node:assert/strict'
import { arrivalStopIds, tripArrival } from './src/tripEta.js'

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

const stop = id => ({ id, name: `S${id}` })
const blue = { id: 10, name: 'Blue' }
const red = { id: 11, name: 'Red' }
const oneLeg = [{ route: blue, boardStop: stop(1), alightStop: stop(2) }]
const twoLegs = [...oneLeg, { route: red, boardStop: stop(2), alightStop: stop(3) }]
const eta = (bus_id, route, avg) => ({ bus_id, route, avg })

test('stop ids: every board and alight stop left, minus the one you already boarded at', () => {
  assert.deepEqual(arrivalStopIds(twoLegs, 0, false), [1, 2, 3])
  assert.deepEqual(arrivalStopIds(twoLegs, 0, true), [2, 3])
  assert.deepEqual(arrivalStopIds(twoLegs, 1, false), [2, 3])
})

test('one leg, waiting: the soonest bus\'s time at your stop, plus the walk', () => {
  const etasByStop = { 1: [eta(7, 10, 4), eta(8, 10, 15)], 2: [eta(8, 10, 21), eta(7, 10, 10)] }
  assert.deepEqual(tripArrival({ legs: oneLeg, legIndex: 0, etasByStop, endWalkMinutes: 3 }), { alight: 10, arrive: 13 })
})

test('one leg, on board: follows the bus you\'re on, not the soonest one', () => {
  const etasByStop = { 2: [eta(7, 10, 2), eta(8, 10, 9)] }
  assert.deepEqual(tripArrival({ legs: oneLeg, legIndex: 0, boardedBusId: 8, etasByStop }), { alight: 9, arrive: 9 })
})

test('transfer: takes the first bus that comes after you get to the transfer stop', () => {
  const etasByStop = {
    1: [eta(7, 10, 4)],
    2: [eta(7, 10, 10), eta(20, 11, 6), eta(21, 11, 14)], // red bus 20 leaves before you get there
    3: [eta(20, 11, 11), eta(21, 11, 19)],
  }
  assert.deepEqual(tripArrival({ legs: twoLegs, legIndex: 0, etasByStop }), { alight: 10, arrive: 19 })
})

test('transfer with no bus to catch: still says when you get off this bus', () => {
  const etasByStop = { 1: [eta(7, 10, 4)], 2: [eta(7, 10, 10), eta(20, 11, 6)], 3: [eta(20, 11, 11)] }
  assert.deepEqual(tripArrival({ legs: twoLegs, legIndex: 0, etasByStop }), { alight: 10, arrive: null })
})

test('no bus, missing data, or the bus passes your stop before it reaches you -> null', () => {
  assert.deepEqual(tripArrival({ legs: oneLeg, legIndex: 0, etasByStop: {} }), { alight: null, arrive: null })
  assert.deepEqual(tripArrival({ legs: oneLeg, legIndex: 0, etasByStop: { 1: [eta(7, 10, 4)] } }), { alight: null, arrive: null })
  const earlier = { 1: [eta(7, 10, 8)], 2: [eta(7, 10, 3)] } // next visit to stop 2 is before it gets to you
  assert.deepEqual(tripArrival({ legs: oneLeg, legIndex: 0, etasByStop: earlier }), { alight: null, arrive: null })
})

test('same bus id on another route at the stop is not your bus', () => {
  const etasByStop = { 2: [eta(8, 11, 2)] }
  assert.deepEqual(tripArrival({ legs: oneLeg, legIndex: 0, boardedBusId: 8, etasByStop }), { alight: null, arrive: null })
})

console.log(`\n${passed} passed`)
