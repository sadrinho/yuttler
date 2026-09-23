// standalone test harness for planTrip. run with: node planTrip.test.mjs
// uses toy stops ~1.1km apart so results are hand-verifiable, not live data
import assert from 'node:assert/strict'
import { planTrip, markRunningRoutes } from './src/tripPlanner.js'

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

const A = { id: 1, name: 'A', lat: 41.300, lon: -72.93 }
const B = { id: 2, name: 'B', lat: 41.310, lon: -72.93 }
const C = { id: 3, name: 'C', lat: 41.320, lon: -72.93 }

test('same stop as the only start and end candidate returns "No route found", not success with no legs', () => {
  // A is the only stop, so it's the nearest stop to both ends; findPath(A, A) returns []
  const onlyA = { id: 9, name: 'OnlyA', active: true, stops: [1] }
  const result = planTrip(41.300, -72.93, 41.320, -72.93, [A], [onlyA]) // ~2.2km apart, so not walk-only
  assert.equal(result.success, false)
  assert.equal(result.message, 'No route found')
})

test('real path still wins when zero-length candidates also exist', () => {
  // with 3 stops, every stop is a candidate for both ends, so A->A, B->B, C->C would all give []
  const fwd = { id: 9, name: 'Fwd', active: true, stops: [1, 2, 3] }
  const result = planTrip(41.300, -72.93, 41.320, -72.93, [A, B, C], [fwd])
  assert.equal(result.success, true)
  assert.equal(result.legs.length, 1)
  assert.equal(result.legs[0].boardStop.name, 'A')
  assert.equal(result.legs[0].alightStop.name, 'C')
})

test('stops no running route visits do not crowd real stops out of the nearest 5', () => {
  // 5 dead stops (on no route) sit right next to the start, closer than A. before, they filled all 5 start candidates
  const dead = [11, 12, 13, 14, 15].map((id, i) => ({ id, name: `Dead${i}`, lat: 41.2992 + i * 0.0001, lon: -72.93 }))
  const fwd = { id: 9, name: 'Fwd', active: true, stops: [1, 2, 3] }
  const result = planTrip(41.299, -72.93, 41.320, -72.93, [...dead, A, B, C], [fwd])
  assert.equal(result.success, true)
  assert.equal(result.legs[0].boardStop.name, 'A')
})

// ---- no route: the reason why ----

test('no routes running at all -> noService', () => {
  const fwd = { id: 9, name: 'Fwd', active: false, stops: [1, 2, 3] }
  const result = planTrip(41.300, -72.93, 41.320, -72.93, [A, B, C], [fwd])
  assert.equal(result.success, false)
  assert.equal(result.reason, 'noService')
})

test('destination nowhere near any shuttle stop -> outOfArea, end', () => {
  // only A is served, so the nearest stop to both ends is A and there's no route; the end is ~11km from A
  const onlyA = { id: 9, name: 'OnlyA', active: true, stops: [1] }
  const result = planTrip(41.300, -72.93, 41.400, -72.93, [A], [onlyA])
  assert.equal(result.reason, 'outOfArea')
  assert.equal(result.which, 'end')
})

test('a route goes there but is not running -> notRunning, with its name', () => {
  const fwd = { id: 9, name: 'Fwd', active: false, stops: [1, 2, 3] }
  const onlyB = { id: 10, name: 'OnlyB', active: true, stops: [2] } // something is running, just not the right route
  const result = planTrip(41.300, -72.93, 41.320, -72.93, [A, B, C], [fwd, onlyB])
  assert.equal(result.reason, 'notRunning')
  assert.deepEqual(result.routeNames, ['Fwd'])
})

test('stops near both ends, but none on a running route -> nothingNearby, both', () => {
  const x = { id: 20, name: 'X', active: false, stops: [1] } // near the start, not running
  const y = { id: 21, name: 'Y', active: false, stops: [3] } // near the end, not running
  const z = { id: 22, name: 'Z', active: true, stops: [2] } // running, but B is ~1.1km from both ends
  const result = planTrip(41.300, -72.93, 41.320, -72.93, [A, B, C], [x, y, z])
  assert.equal(result.reason, 'nothingNearby')
  assert.equal(result.which, 'both')
})

test('running stops near both ends but no way between them -> noConnection', () => {
  // A and C are each on their own running route, and nothing links them
  const onlyA = { id: 9, name: 'OnlyA', active: true, stops: [1] }
  const onlyC = { id: 10, name: 'OnlyC', active: true, stops: [3] }
  const result = planTrip(41.300, -72.93, 41.320, -72.93, [A, C], [onlyA, onlyC])
  assert.equal(result.reason, 'noConnection')
})

// ---- "running" = has a bus on it right now ----

test('at a shift change, the route with a bus wins over the stale "active" one', () => {
  // the 6pm hopper -> pwg case: Day is flagged active with no buses, Night is flagged inactive with a bus on it
  const day = { id: 30, name: 'Day', active: true, stops: [1, 2, 3] }
  const night = { id: 31, name: 'Night', active: false, stops: [1, 2, 3] }
  const buses = [{ id: 100, route: 31 }]
  const result = planTrip(41.300, -72.93, 41.320, -72.93, [A, B, C], markRunningRoutes([day, night], buses))
  assert.equal(result.success, true)
  assert.equal(result.legs[0].route.name, 'Night')
})

test('no bus data yet -> keep the feed\'s active flags instead of saying nothing runs', () => {
  const routes = [{ id: 30, name: 'Day', active: true, stops: [1, 2, 3] }]
  assert.equal(markRunningRoutes(routes, null), routes) // the very same list, untouched
  assert.equal(markRunningRoutes(routes, undefined), routes)
})

test('bus data loaded but empty (service over) -> nothing counts as running, even if flagged active', () => {
  // the end-of-service case: every bus has gone home but the feed still flags Day as active
  const day = { id: 30, name: 'Day', active: true, stops: [1, 2, 3] }
  const result = planTrip(41.300, -72.93, 41.320, -72.93, [A, B, C], markRunningRoutes([day], []))
  assert.equal(result.success, false)
  assert.equal(result.reason, 'noService')
})

console.log(`\n${passed} passed`)
