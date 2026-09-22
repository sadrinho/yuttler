// standalone test harness for planTrip (graph.test.mjs covers buildGraph/findPath). run with: node planTrip.test.mjs
// uses toy stops ~1.1km apart so results are hand-verifiable, not live data
import assert from 'node:assert/strict'
import { planTrip } from './src/tripPlanner.js'

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

console.log(`\n${passed} passed`)
