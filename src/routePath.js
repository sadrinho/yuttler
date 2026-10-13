// geometry for drawing routes: the stretch of a route you ride, and where to put direction arrows.
// no react or leaflet in here, so routePath.test.mjs can run it in plain node

const SAME_STREET_METERS = 40 // two spots on the path this close to a stop both count as "at the stop" (out-and-back streets; the feed sometimes puts a stop on the wrong side)

// the feed's flat [lat, lon, lat, lon, ...] as [[lat, lon], ...]. paths are closed loops, listed the way the bus drives them
function pathPoints(path) {
  const points = []
  for (let i = 0; i + 1 < path.length; i += 2) points.push([path[i], path[i + 1]])
  return points
}

// flat-earth meters, fine at campus scale
function toMeters([lat, lon]) {
  return [lon * 111320 * Math.cos(lat * Math.PI / 180), lat * 110540]
}

// every place the path passes a stop, as { pos, dist }: pos = segment index + how far along that segment (12.4 = 40% of the
// way from point 12 to 13), dist = meters from the stop. only spots within SAME_STREET_METERS of the closest one
function passes(meters, stop) {
  const [px, py] = toMeters([stop.lat, stop.lon])
  const all = []
  for (let i = 0; i + 1 < meters.length; i++) {
    const [ax, ay] = meters[i]
    const [bx, by] = meters[i + 1]
    const dx = bx - ax, dy = by - ay
    const len2 = dx * dx + dy * dy
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2))
    all.push({ pos: i + t, dist: Math.hypot(px - (ax + t * dx), py - (ay + t * dy)) })
  }
  const closest = Math.min(...all.map(pass => pass.dist))
  return all.filter(pass => pass.dist <= closest + SAME_STREET_METERS)
}

// where each stop sits along the path, in the order the bus visits them. on a street the bus drives twice a stop is near two
// spots on the path, so each stop takes the first spot after the stop before it. stopList = the stops in visiting order
function stopPositions(points, stopList) {
  const meters = points.map(toMeters)
  const loop = points.length - 1
  const positions = []
  stopList.forEach((stop, k) => {
    const options = passes(meters, stop)
    if (k === 0) {
      positions.push(options.reduce((a, b) => (b.dist < a.dist ? b : a)).pos)
      return
    }
    const prev = positions[k - 1]
    const ahead = pos => {
      const d = (pos - prev + loop) % loop
      return d > loop - 0.25 ? 0 : d // a hair behind the last stop is "the same spot", not a whole loop later
    }
    positions.push(options.reduce((a, b) => (ahead(b.pos) < ahead(a.pos) ? b : a)).pos)
  })
  return positions
}

// the point at a position on the path
function pointAt(points, pos) {
  const i = Math.min(Math.floor(pos), points.length - 2)
  const t = pos - i
  const [aLat, aLon] = points[i]
  const [bLat, bLon] = points[i + 1]
  return [aLat + (bLat - aLat) * t, aLon + (bLon - aLon) * t]
}

// the path from one position forward to another, going around the end of the loop if it has to
function pathBetween(points, from, to) {
  const out = [pointAt(points, from)]
  const last = points.length - 1
  if (to >= from) {
    for (let i = Math.floor(from) + 1; i <= Math.floor(to); i++) out.push(points[i])
  } else {
    for (let i = Math.floor(from) + 1; i <= last; i++) out.push(points[i])
    for (let i = 1; i <= Math.floor(to); i++) out.push(points[i]) // points[0] is points[last] again
  }
  out.push(pointAt(points, to))
  return out.filter((point, i) => i === 0 || point[0] !== out[i - 1][0] || point[1] !== out[i - 1][1]) // a position right on a corner lists it twice
}

// the stretch of a route you ride on one leg, as [[lat, lon], ...], or null if it can't be worked out (then draw the whole
// route). follows the stops in between, so on an out-and-back route it takes the right pass of the street.
// like the stop counter, it starts from the board stop's first listing.
// the feed's stop order doesn't always agree with its path (West Campus): if following the stops means jumping most of the way
// around the loop between two of them, or going around more than once, we don't trust it and return null
function legPath(route, boardStop, alightStop, stops) {
  const ids = route.stops ?? []
  const points = pathPoints(route.path ?? [])
  const start = ids.indexOf(boardStop.id)
  if (start === -1 || points.length < 2) return null
  const byId = new Map(stops.map(stop => [stop.id, stop]))
  const ridden = [boardStop]
  for (let k = 1; k < ids.length; k++) {
    const id = ids[(start + k) % ids.length]
    if (id === alightStop.id) {
      ridden.push(alightStop)
      const positions = stopPositions(points, ridden)
      const loop = points.length - 1
      const steps = positions.slice(1).map((pos, i) => (pos - positions[i] + loop) % loop)
      const total = steps.reduce((sum, step) => sum + step, 0)
      if (total === 0 || total >= loop || steps.some(step => step > loop / 2)) return null
      return pathBetween(points, positions[0], positions[positions.length - 1])
    }
    if (byId.has(id)) ridden.push(byId.get(id))
  }
  return null // you don't get off on this route
}

// where to draw direction arrows along a line: one every `spacing`, the first half a spacing in.
// xy = the line in screen pixels, [[x, y], ...]. returns [{ x, y, angle }], angle in degrees clockwise from straight up
function arrowsAlong(xy, spacing) {
  const arrows = []
  let next = spacing / 2 // distance along the line of the next arrow
  let walked = 0
  for (let i = 0; i + 1 < xy.length; i++) {
    const [ax, ay] = xy[i]
    const [bx, by] = xy[i + 1]
    const len = Math.hypot(bx - ax, by - ay)
    while (len > 0 && next <= walked + len) {
      const t = (next - walked) / len
      arrows.push({ x: ax + (bx - ax) * t, y: ay + (by - ay) * t, angle: (Math.atan2(bx - ax, ay - by) * 180 / Math.PI + 360) % 360 })
      next += spacing
    }
    walked += len
  }
  return arrows
}

export { pathPoints, stopPositions, pathBetween, legPath, arrowsAlong }
