// standalone tests for the stop board / nearby stops helpers. run with: node stops.test.mjs
// same toy stops as planTrip.test.mjs (~1.1km apart), plus a few close ones for the 400m radius
import assert from 'node:assert/strict'
import { nearbyStops, searchStops, boardForStop, soonestArrival, walkMinutes } from './src/stops.js'

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

const A = { id: 1, name: 'Alpha', lat: 41.300, lon: -72.93 }
const A2 = { id: 4, name: 'Alpha Annex', lat: 41.301, lon: -72.93 } // ~110m north of A
const A3 = { id: 5, name: 'Beta Corner', lat: 41.302, lon: -72.93 } // ~220m north of A
const B = { id: 2, name: 'Bravo', lat: 41.310, lon: -72.93 }
const C = { id: 3, name: 'Charlie', lat: 41.320, lon: -72.93 }
const DEAD = { id: 9, name: 'Alpha Dead', lat: 41.3001, lon: -72.93 } // on no route

// ---- nearby ----

test('nearby: stops within 400m on a running route, closest first', () => {
  const run = { id: 1, name: 'Run', active: true, stops: [1, 4, 5, 2] }
  const result = nearbyStops(41.300, -72.93, [C, A3, B, A, A2, DEAD], [run])
  assert.equal(result.withinRadius, true)
  assert.deepEqual(result.stops.map(s => s.name), ['Alpha', 'Alpha Annex', 'Beta Corner']) // Bravo is ~1.1km away, Alpha Dead is on no route
  assert.ok(result.stops[1].distance > 100 && result.stops[1].distance < 120)
})

test('nearby: stops only a non-running route visits are left out', () => {
  const run = { id: 1, name: 'Run', active: true, stops: [1] }
  const off = { id: 2, name: 'Off', active: false, stops: [4, 5] }
  const result = nearbyStops(41.300, -72.93, [A, A2, A3], [run, off])
  assert.deepEqual(result.stops.map(s => s.name), ['Alpha'])
  assert.equal(result.anyRunning, true)
})

test('nearby: at most 5 stops', () => {
  const close = [0, 1, 2, 3, 4, 5, 6].map(i => ({ id: 20 + i, name: `S${i}`, lat: 41.300 + i * 0.0003, lon: -72.93 }))
  const run = { id: 1, name: 'Run', active: true, stops: close.map(s => s.id) }
  assert.equal(nearbyStops(41.300, -72.93, close, [run]).stops.length, 5)
})

test('nearby: nothing within 400m -> the 3 closest anyway, withinRadius false', () => {
  const run = { id: 1, name: 'Run', active: true, stops: [1, 2, 3, 4] }
  const result = nearbyStops(41.290, -72.93, [A, A2, B, C], [run]) // ~1.1km south of A
  assert.equal(result.withinRadius, false)
  assert.deepEqual(result.stops.map(s => s.name), ['Alpha', 'Alpha Annex', 'Bravo'])
})

test('nearby: nothing running at all -> any route\'s stops, anyRunning false', () => {
  const off = { id: 1, name: 'Off', active: false, stops: [1, 4] }
  const result = nearbyStops(41.300, -72.93, [A, A2, DEAD], [off])
  assert.equal(result.anyRunning, false)
  assert.deepEqual(result.stops.map(s => s.name), ['Alpha', 'Alpha Annex'])
})

// ---- search ----

test('search: case-insensitive substring, names starting with the query first', () => {
  const r = { id: 1, name: 'R', active: false, stops: [1, 4, 5, 9] } // running or not doesn't matter for search
  // "Alpha Dead" is on r here, so it's found; "Beta Corner" contains "a" but not "alpha"
  assert.deepEqual(searchStops('ALPHA', [A3, A2, A, DEAD], [r]).map(s => s.name), ['Alpha', 'Alpha Annex', 'Alpha Dead'])
  assert.deepEqual(searchStops('corner', [A, A3], [r]).map(s => s.name), ['Beta Corner'])
})

test('search: stops no route visits are never shown, empty query gives nothing', () => {
  const r = { id: 1, name: 'R', active: true, stops: [1] }
  assert.deepEqual(searchStops('alpha', [A, DEAD], [r]).map(s => s.name), ['Alpha'])
  assert.deepEqual(searchStops('   ', [A], [r]), [])
})

// ---- board ----

const blue = { id: 10, name: 'Blue', active: true, stops: [1, 2] }
const red = { id: 11, name: 'Red', active: true, stops: [1, 3] }
const night = { id: 12, name: 'Night', active: false, stops: [1] }
const elsewhere = { id: 13, name: 'Elsewhere', active: true, stops: [2, 3] } // doesn't stop at A

test('board: routes with buses coming, each sorted, soonest route first', () => {
  const etas = [
    { route: 10, avg: 12, bus_id: 1 },
    { route: 11, avg: 7, bus_id: 2 },
    { route: 10, avg: 3, bus_id: 3 },
  ]
  const { arriving, others } = boardForStop(1, etas, [blue, red, night, elsewhere])
  assert.deepEqual(arriving.map(row => row.route.name), ['Blue', 'Red']) // Blue's 3 min beats Red's 7
  assert.deepEqual(arriving[0].etas.map(e => e.avg), [3, 12])
  assert.deepEqual(others.map(r => r.name), ['Night'])
})

test('board: nothing coming -> every route here is in others, running ones first', () => {
  const { arriving, others } = boardForStop(1, [], [night, blue, elsewhere])
  assert.deepEqual(arriving, [])
  assert.deepEqual(others.map(r => r.name), ['Blue', 'Night'])
})

test('board: etas for a route we don\'t know are dropped', () => {
  const { arriving } = boardForStop(1, [{ route: 99, avg: 1 }, { route: 10, avg: 5 }], [blue])
  assert.deepEqual(arriving.map(row => row.route.name), ['Blue'])
})

// ---- soonest + walk time ----

test('soonest: the smallest avg across routes, null when nothing is coming', () => {
  const best = soonestArrival([{ route: 10, avg: 9 }, { route: 11, avg: 4 }, { route: 99, avg: 1 }], [blue, red])
  assert.equal(best.route.name, 'Red')
  assert.equal(best.avg, 4)
  assert.equal(soonestArrival([], [blue]), null)
})

test('walk minutes: 80 m/min, never less than 1', () => {
  assert.equal(walkMinutes(10), 1)
  assert.equal(walkMinutes(400), 5)
})

console.log(`\n${passed} passed`)
