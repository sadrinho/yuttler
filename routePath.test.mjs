// standalone tests for the route drawing helpers. run with: node routePath.test.mjs
import assert from 'node:assert/strict'
import { pathPoints, stopPositions, pathBetween, legPath, arrowsAlong } from './src/routePath.js'

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

// a square loop, about 110m a side, driven A -> B -> C -> D -> A. one stop in the middle of each side
const A = [41.3, -72.93], B = [41.301, -72.93], C = [41.301, -72.929], D = [41.3, -72.929]
const square = [A, B, C, D, A]
const mid = (p, q, id) => ({ id, lat: (p[0] + q[0]) / 2, lon: (p[1] + q[1]) / 2 })
const s1 = mid(A, B, 1), s2 = mid(B, C, 2), s3 = mid(C, D, 3), s4 = mid(D, A, 4)
const near = (a, b) => Math.abs(a - b) < 1e-3

test('path points: pairs up the flat list', () => {
  assert.deepEqual(pathPoints([1, 2, 3, 4]), [[1, 2], [3, 4]])
})

test('stop positions: how far along the loop each stop is', () => {
  const pos = stopPositions(square, [s1, s2, s3, s4])
  assert.ok(pos.every((p, i) => near(p, i + 0.5)), JSON.stringify(pos))
})

test('path between: forward, and around the end of the loop', () => {
  const forward = pathBetween(square, 0.5, 2.5)
  assert.deepEqual(forward.slice(1, 3), [B, C])
  assert.equal(forward.length, 4)
  assert.deepEqual(pathBetween(square, 1, 2), [B, C]) // right on the corners: no doubled points
  const wrapped = pathBetween(square, 3.5, 0.5) // last side, past A, half way up the first
  assert.equal(wrapped.length, 3)
  assert.deepEqual(wrapped[1], A)
})

test('leg path: only the stretch you ride, the right way around', () => {
  const route = { id: 10, stops: [1, 2, 3, 4], path: square.flat() }
  const stops = [s1, s2, s3, s4]
  assert.equal(legPath(route, s1, s2, stops).length, 3) // s1, corner B, s2
  assert.equal(legPath(route, s2, s1, stops).length, 5) // the long way: C, D, A in between
  assert.deepEqual(legPath(route, s4, s1, stops)[1], A)
})

test('leg path: out and back takes the right pass of the street', () => {
  // up the street A -> B and straight back down it. stop 1 at the bottom, 2 half way (both directions), 3 at the top
  const street = [A, B, A]
  const bottom = { id: 1, lat: A[0], lon: A[1] }, half = mid(A, B, 2), top = { id: 3, lat: B[0], lon: B[1] }
  const route = { id: 11, stops: [1, 2, 3, 2], path: street.flat() }
  const stops = [bottom, half, top]
  const up = legPath(route, bottom, top, stops)
  assert.deepEqual([up[0], up[up.length - 1]], [A, B])
  const down = legPath(route, top, bottom, stops) // from the top back to the bottom: the second pass
  assert.deepEqual([down[0], down[down.length - 1]], [B, A])
  assert.equal(down.length, 2)
})

test('leg path: stop order that fights the path -> null, so the whole route gets drawn', () => {
  const route = { id: 13, stops: [1, 3, 2, 4], path: square.flat() } // says 3 comes before 2, the path says otherwise
  assert.equal(legPath(route, s1, s4, [s1, s2, s3, s4]), null)
})

test('leg path: stop not on the route, or no path -> null', () => {
  const route = { id: 10, stops: [1, 2], path: square.flat() }
  assert.equal(legPath(route, s3, s1, [s1, s2, s3]), null)
  assert.equal(legPath(route, s1, s3, [s1, s2, s3]), null)
  assert.equal(legPath({ id: 12, stops: [1, 2], path: [] }, s1, s2, [s1, s2]), null)
})

test('arrows: evenly spaced, pointing along the line', () => {
  const arrows = arrowsAlong([[0, 0], [100, 0], [100, 100]], 50) // right, then down the screen
  assert.deepEqual(arrows.map(a => [a.x, a.y, a.angle]), [[25, 0, 90], [75, 0, 90], [100, 25, 180], [100, 75, 180]])
  assert.deepEqual(arrowsAlong([[0, 0], [10, 0]], 50), []) // too short for any
  assert.equal(arrowsAlong([[0, 100], [0, 0]], 100)[0].angle, 0) // up the screen
})

console.log(`\n${passed} passed`)
