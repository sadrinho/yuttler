// standalone tests for the routes menu helpers. run with: node routeList.test.mjs
import assert from 'node:assert/strict'
import { DEFAULT_PREFS, readPrefs, routeRows, visibleRouteIds, stopsOnRoutes, routeStopsInOrder } from './src/routeList.js'

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

const blue = { id: 10, name: 'Blue', active: true, stops: [1, 2] }
const red = { id: 11, name: 'Red', active: true, stops: [2, 3] }
const night = { id: 12, name: 'Night', active: false, stops: [3] }
const buses = [{ id: 100, route: 10 }, { id: 101, route: 10 }, { id: 102, route: 11 }]

test('prefs: garbage or nothing saved -> defaults; saved values survive', () => {
  assert.deepEqual(readPrefs(null), DEFAULT_PREFS)
  assert.deepEqual(readPrefs('not json'), DEFAULT_PREFS)
  assert.deepEqual(readPrefs('{"showAll":"yes","hidden":"x"}'), DEFAULT_PREFS) // wrong types fall back field by field
  assert.deepEqual(readPrefs('{"showAll":true,"hidden":[11],"showStops":true}'), { showAll: true, hidden: [11], showStops: true })
})

test('rows: running only by default, with bus counts, and how many were left out', () => {
  const { rows, notRunningCount } = routeRows([night, red, blue], buses, false)
  assert.deepEqual(rows.map(r => [r.route.name, r.busCount]), [['Blue', 2], ['Red', 1]])
  assert.equal(notRunningCount, 1)
})

test('rows: show all lists every route, running ones first', () => {
  const { rows } = routeRows([night, red, blue], buses, true)
  assert.deepEqual(rows.map(r => r.route.name), ['Blue', 'Red', 'Night'])
  assert.equal(rows[2].busCount, 0)
})

test('visible: running minus hidden; show all adds the rest', () => {
  assert.deepEqual([...visibleRouteIds([blue, red, night], { showAll: false, hidden: [11] })], [10])
  assert.deepEqual([...visibleRouteIds([blue, red, night], { showAll: true, hidden: [11] })], [10, 12])
})

test('stops on routes: each stop once, only stops those routes visit', () => {
  assert.deepEqual(stopsOnRoutes([blue, red], [A, B, C, { id: 9, name: 'Dead' }]).map(s => s.name), ['A', 'B', 'C'])
  assert.deepEqual(stopsOnRoutes([blue], [A, B, C]).map(s => s.name), ['A', 'B'])
})

test('route stops in order: follows route.stops, repeats kept, unknown ids skipped', () => {
  const outAndBack = { id: 13, name: 'West', active: true, stops: [3, 1, 99, 2, 1] }
  assert.deepEqual(routeStopsInOrder(outAndBack, [A, B, C]).map(s => s.name), ['C', 'A', 'B', 'A'])
})

console.log(`\n${passed} passed`)
