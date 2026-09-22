# Yale Shuttle Trip Planner

A Google Maps style trip planner for the Yale Shuttle transit system. Enter where you are and where you're going, and it tells you which stop to walk to, which bus to board, where to transfer, and where to get off, with live bus positions, real-time arrival estimates, and the route drawn on an interactive map.

Built by reverse-engineering the undocumented API behind Yale's Downtowner shuttle web app, because no public API or documentation exists (as of 9/10/26).

**Note: The UI/UX has not been modified at all yet (as of 9/22) but the website is live at the link below!** 

[Visit Yuttler](https://www.yuttler.com)

**Note: The website is currently hosted on Render's free tier, which means the back end takes ~30-50 seconds to spin up following inactivity -- as of 9/22, I'm working to get funding for a higher tier! Expect to see 0 stops/routes/buses loaded until this brief period is over.**

## Features

**Multi-leg trip planning.** The planner runs a breadth-first search over a graph of the shuttle system, so trips requiring a transfer are found automatically. A direct trip is just a path of length 1.

**Live buses and arrival times.** Bus positions refresh every 10 seconds and render as heading-rotated arrows in their route's color. Arrival estimates for your boarding stop refresh every 30 seconds.

**Turn-by-turn ride guidance.** The results card shows only what you need to do right now: walk to a stop, board a named bus, ride until your alight stop, transfer, repeat. "I'm on board" and "I'm off" advance the state machine, and a live stop counter tracks how far your bus is from where you need it.

**Autocomplete search.** Campus landmarks resolve instantly from a curated table with aliases (`akw`, `som`, `div school`). Anything else is geocoded through LocationIQ, bounded roughly to the New Haven area, with results cached on the proxy for 24 hours. A Nominatim fallback exists but is off by default (see below).

**Interactive map** (Leaflet + OpenStreetMap data). Every route drawn in its official color; after a search the map narrows to just the routes your trip uses, with pins for your start, each boarding stop, each transfer, and your destination. Light and dark tiles.

## How it works

### The Downtowner API

The Downtowner web app exposes four undocumented endpoints, discovered via browser DevTools:

| Endpoint | Data |
|---|---|
| `routes_stops.php` | All 172 stops (id, name, coordinates) |
| `routes_routes.php?inactive=true` | All routes (name, color, full path polyline, ordered stop list, active flag) |
| `routes_buses.php` | Live bus positions (coordinates, heading, last stop, timestamp) |
| `routes_eta.php?stop=<id>` | Arrival estimates for one stop, per bus and per route |

### Why there's a proxy

Direct browser requests to those endpoints are blocked by CORS, so a small Express server sits between the React app and Downtowner and forwards requests on its behalf.

That started as a CORS workaround, but the proxy is permanent for a second reason: geocoding requires a LocationIQ API key, and any credential shipped in client-side code is visible to anyone who opens DevTools. The proxy is the only place a secret can actually stay secret. It's also the natural chokepoint for rate limiting, caching, and provider fallback — anything that's a policy about *how* the app talks to third parties belongs there rather than in the UI.

### Caching and failure handling

Every open tab polls `/buses` every 10 seconds and `/eta/:stopId` every 30. Without caching, a few hundred users would mean tens of requests per second from one IP to an undocumented API, which is our only data source. So the proxy keeps an in-memory cache (`Map`s, no library):

| Route | Cache key | TTL |
|---|---|---|
| `/buses` | single entry | 5s |
| `/eta/:stopId` | per stop | 15s |
| `/stops`, `/routes` | single entry each | 1 hour |
| `/autocomplete` | normalized query | 24h (1h for empty results) |

- **Request coalescing.** Concurrent requests for the same expired key share one in-flight upstream fetch instead of each firing their own.
- **Serve stale on failure.** If Downtowner fails and an older copy exists, the proxy returns it and waits a full TTL before retrying. With nothing cached, it responds `502 { error: 'Upstream unavailable' }` and stays up.
- **Only successes are cached.** Upstream fetches time out after 5 seconds, so one hung request can't stall every waiting client.
- **LocationIQ specifics.** Queries are lowercased and whitespace-collapsed before lookup. The cache is capped at 5,000 entries with least-recently-used eviction, and the 24h TTL stays under LocationIQ's 48h free-plan caching limit.
- Each real upstream call logs `Upstream fetch: <key>`, so caching is visible in the proxy's terminal.

**Nominatim is off by default.** Its usage policy caps clients at 1 request/second and forbids autocomplete use, so under load a LocationIQ outage spilling over to it would risk an IP ban. When LocationIQ fails, `/autocomplete` returns `[]`. Set `ENABLE_NOMINATIM=true` to re-enable the fallback.

The frontend treats any non-array response as a failure and keeps its previous state (stale bus positions beat a crash). A failed ETA fetch shows `...` in the results card rather than claiming no buses are inbound.

### Trip planning: stops are nodes, rides are edges

The planner builds a directed graph of the shuttle system.

There is an edge from stop `u` to stop `v` labeled with route `r` if route `r` visits `u` and then later visits `v`. The edge means: **board route `r` at `u`, stay on the bus, get off at `v`.** Intermediate stops are collapsed into the edge, because you aren't doing anything at them.

The obvious alternative — edges only between *consecutive* stops — was rejected because it changes what the search minimizes. With consecutive-stop edges, path length counts stops, so BFS would happily prefer a three-bus trip covering 5 stops over a one-bus trip covering 15. With ride edges, **path length equals the number of times you board a bus**, which is the thing actually worth minimizing.

Three properties of the graph matter:

- **Unweighted** — every edge costs 1. This is what makes BFS correct here: the first time the search reaches a stop is guaranteed to be the fewest-boardings way to reach it.
- **Labeled** — each edge carries the full route object, so the reconstructed path knows which bus to ride on each leg.
- **Multigraph** — two stops can be connected by more than one route, so each connection is its own edge. The adjacency list holds `{to, route}` pairs, not a set of destination IDs.

Measured on live data, before filtering to active routes: **140 nodes, 3,040 edges, average out-degree 21.7.** (32 of the 172 stops appear on no route at all.) A search over a graph this size is sub-millisecond.

### Why fewest boardings instead of fastest trip

Boardings is a proxy for travel time, and it's worth being honest that it's a proxy.

Downtowner headways run roughly 10–20 minutes. Each transfer therefore costs an expected 5–10 minute wait plus the risk of missing the connection entirely. Riding one extra stop costs about a minute, deterministically, with no risk. On a system with these headways, minimizing boardings approximates minimizing time better than minimizing stops does.

That is a claim about *this* system. On a subway with 3-minute headways the calculus reverses, and you'd rather transfer than ride around.

Minimizing actual travel time is a weighted shortest-path problem — Dijkstra with a transfer penalty, or a time-expanded graph for the properly correct version — and those need timetable data the API doesn't expose. See the roadmap for the achievable middle ground.

### Choosing among candidates

The planner takes the 5 nearest stops to your start and the 5 nearest to your destination (Haversine distance), runs the search on all 25 pairs, and collects every path that succeeds along with the total walking distance that pair implies.

Candidates are then sorted by fewest legs, tiebroken on least total walking:

```js
candidates.sort((a, b) =>
  a.path.length - b.path.length || a.walkDistance - b.walkDistance
)
```

Earlier versions returned the *first* match they found, which meant the nearest start stop won by accident of loop order — an extra 200m walk that saved a transfer was never even considered.

If your start and destination are less than 400m apart in a straight line, the planner short-circuits and tells you to walk.

### Layering

The graph layer is **ID-only**. `buildGraph`, `findPath`, and `reconstructPath` never learn that stops have names or coordinates; they operate purely on stop IDs. `planTrip` hydrates IDs into full stop objects at the boundary, using a `stopsById` lookup, and hands the UI this shape:

```js
{
  success: true,
  startCoords: { lat, lon },
  endCoords: { lat, lon },
  legs: [
    { boardStop: {...}, alightStop: {...}, route: {...} },
    ...
  ]
}
```

Walk-only results carry `walkOnly: true` and `distance` instead of `legs`. Failures are `{ success: false, message }`.

The invariant `legs[i].alightStop.id === legs[i+1].boardStop.id` holds by construction: the graph has no walk edges, so a transfer can only happen at a stop both routes serve.

The UI splits along the same seam. `App.jsx` owns `currentLeg` as state and derives the current leg object fresh on every render rather than storing both — two sources of truth that can disagree is how you end up showing one leg's route next to another leg's stop count. `ResultsCard` answers "what do I do right now" for the current leg; the map draws the whole trip, because it's the overview.

## Tech stack

**Frontend:** React (Vite), react-leaflet / Leaflet, CARTO basemap tiles over OpenStreetMap data
**Proxy:** Node.js, Express, node-fetch
**Geocoding:** curated landmark table → LocationIQ (→ Nominatim fallback, off by default)

## Running locally

Requires Node.js (LTS). Two processes, two terminals, two `.env` files.

**1. Configure the proxy.** Copy `proxy/.env.example` to `proxy/.env` and fill it in:

```
LOCATIONIQ_KEY=your_locationiq_key
ALLOWED_ORIGIN=http://localhost:5173
PORT=3001
ENABLE_NOMINATIM=
```

`ALLOWED_ORIGIN` is a comma-separated list with no spaces after the commas, and is **required** — the server reads it at startup and will not boot without it. `LOCATIONIQ_KEY` is free-tier; without it, place autocomplete returns no results (landmarks still work). `PORT` is optional (defaults to 3001; most hosts inject it). Leave `ENABLE_NOMINATIM` unset unless you specifically want the Nominatim fallback.

**2. Configure the frontend.** Create `.env` in the project root:

```
VITE_PROXY_URL=http://localhost:3001
VITE_CARTO_API_KEY=your_carto_key
```

Vite only exposes variables prefixed with `VITE_` to client code, so the names matter. They're also baked in at **build time**, so for production, set `VITE_PROXY_URL` to the production proxy URL *before* running `npm run build`. Anything `VITE_`-prefixed ends up in the public bundle.

**3. Install and start both** (React on port 5173, proxy on 3001):

```
npm install
cd proxy && npm install && cd ..
npm start
```

`npm start` runs the Vite dev server and the proxy together via `concurrently`. Then open `http://localhost:5173`.

### Deploying

The production proxy needs `LOCATIONIQ_KEY`, `ALLOWED_ORIGIN` (including the production frontend domain), and `PORT` if the host doesn't inject it. `.env` and `proxy/.env` are gitignored and must never be committed; `proxy/.env.example` lists the variable names only.

## Tests

The graph layer has a standalone test harness at the project root:

```
node graph.test.mjs
```

27 assertions over hand-verifiable toy routes rather than live data, covering edge counts and shape, adjacency accumulation when a stop is served by two routes, final stops getting an empty-but-present adjacency entry, direct and transfer paths, unreachable destinations, missing stop IDs, start-equals-end, and number/string ID mismatches. One test deliberately declares a two-hop route before a one-hop route, to catch a search that returns first-found rather than shortest.

`planTrip` has its own harness:

```
node planTrip.test.mjs
```

It covers the zero-length path case: when the same stop is the nearest to both ends, `planTrip` must return "No route found" rather than `success: true` with no legs, and a real path must still win when zero-length candidates exist alongside it.

## Known limitations

- **No loop wrap-around.** Routes are circular, but `route.stops` is a flat array and edges only run forward through it. A trip that crosses the loop's seam returns "no route found" even when a bus makes that exact trip. This is the highest-impact known bug.
- **No walk edges between nearby stops.** Directional variants like `130 Prospect Street (N)` and `(S)` are distinct IDs and unconnected in the graph, so a transfer that amounts to crossing the street is invisible to the search.
- **No terminal state.** On the final leg the "I'm off" button is suppressed, so there's no way to mark a trip complete.
- **Proximity thresholds are guesses.** The `stopsRemaining <= 4` gate on both the board and alight buttons was never calibrated against real values.
- **No ETA validation.** A trip can be planned whose boarding or alighting stop has no inbound buses, or only very distant ones. The planner doesn't check whether a structurally valid route is actually rideable.
- **No route segment trimming.** The map draws each leg's entire loop rather than just the segment you ride.
- **Inactive routes are drawn.** The graph filters to `route.active`, but the map's default view renders every route returned by `?inactive=true`, including ones nobody is currently driving.
- **Autocomplete race condition.** A stale geocoder response can append to the suggestion list after it's no longer relevant.
- **Dead code.** `greenIcon` is declared in `Map.jsx` and unused; `stops` is passed to `Map` and never read.
- **No retry for stops/routes.** They're fetched once on load; if that fails (e.g. the proxy is cold-starting on Render), the app shows 0 stops until the page is reloaded.
- **ETA cache is uncapped.** The proxy keeps one entry per distinct stop ID requested. Only a concern under abuse; there's no per-IP rate limiting yet.
- **Existing lint errors.** ESLint flags two synchronous `setState` calls inside effects (`App.jsx`, `Autocomplete.jsx`) and a missing `leg` dependency.

## Roadmap

### V4 (shipping version)

**Visual and UX overhaul.** The headline item: make it look like an actual app.
- A fullscreen map (Google Maps style) or a map with a side pane, fully responsive on mobile web.
- The user's live location on the map.
- Toggle which routes are shown, or isolate a single route.
- Real error and empty states: what the user sees when geocoding fails, no buses are running, or the proxy is down. This matters more as the app gets more real.

**Proxy caching.** ✅ Done — see [Caching and failure handling](#caching-and-failure-handling).

### If time allows

**Adjustable pins.** Let users drag their start/end pins when the geocoded location is inaccurate.

**Service alerts.** Surface error flags from Downtowner's `routes_announcements.php` endpoint (detours, suspended routes, etc.).

**Generate-and-score.** The architecture for making route choice reflect real time rather than a proxy for it. BFS and the graph do *candidate generation* — cheap and structural. A separate pass does *scoring* — expensive, using live ETAs. Keeping them separate means the scoring function can change without touching the traversal.

Scoring is possible because `/eta/:stopId` returns an estimate for every bus servicing that stop, not just imminent ones, so a full itinerary can be timed by chaining calls: when bus X reaches your boarding stop, when that same bus reaches the transfer, which leg-2 bus arrives after that, and when it reaches your destination. ETAs are snapshots and error compounds across legs, so late-leg estimates are soft.

Problems scoring should address:
- **Rideability.** A structurally valid trip can have no buses inbound at the boarding or alight stop, or only very late ones. Scoring should time the whole itinerary once a match is found and fall back to the next candidate if it isn't actually good.
- **Better transfer stops.** A transfer stop that doesn't share a route with the first leg, but is a short walk from one that does, is currently invisible (see walk edges below).
- **Slower equivalent routes.** Reported case: a direct Blue Line trip existed, but the planner returned a Red Line trip that also worked and took longer. Both are one leg, so they tie on boardings and the walking-distance tiebreak picks between them without looking at time. Scoring by chained ETAs would prefer the faster one *if* it's among the candidates. If it isn't (e.g. the Blue trip crosses the loop's seam, or BFS found only the Red path for that stop pair), it also needs wrap-around and wide-candidate search.

**Wide-candidate BFS.** Required for scoring to actually *choose* rather than just display. Same graph, same edges; the search drops its visited set and enumerates multiple paths, bounded by finishing one level past the depth at which the destination is first reached. The cost that bounds this design is scoring, not searching — each candidate costs roughly one proxy call per stop.

**Loop wrap-around**, landing together with scoring. The graph fix is one line. The reason to couple it: once routes wrap, every stop reaches every other stop on that route in one boarding, so a one-leg path might mean riding almost the entire loop. Shipping wrap-around alone trades "no route found" for "technically valid, absurdly slow."

**Walk edges between nearby stops**, also landing with scoring. A walk edge costing 1 boarding would make crossing the street look as expensive as riding a bus, and a genuinely zero-cost edge breaks the uniform-cost assumption BFS depends on. This is the Dijkstra threshold.

**Efficiency.** Skip the geocoder when the landmark table already answered — typing "beinecke" currently gets an instant local match *and* costs a LocationIQ request (now cached on the proxy, but still one per distinct query).

## A Note on the Usage of AI/LLMs

The core of Yuttler is hand-written. The trip planner (graph, BFS, candidate selection), the original proxy, the autocomplete, and the app's state logic were written by me, with Claude/LLMs acting as tutors rather than code generators. The workflow was: draft an idea; sketch its implementation; prompt the model to review the sketch; argue with it or change anything I disagreed with; read the documentation if I was confused; then implement and debug it myself. I can explain any line of that code: why it's there, why it's shaped the way it is, and why it behaves the way it does. I'm incredibly proud of the human effort that went into it.

Launch hardening was AI assisted. The pre-launch reliability work (proxy caching and request coalescing, upstream failure handling, frontend error guards, the zero-length path fix and its test) was written by Claude Code against a spec I wrote. Each change was proposed as a plan, explained line by line, and approved by me before it went in. I'm confident in the changes made here, too.

It's important to note that I am planning on using LLMs to generate code for the UI/UX, though I will still meticulously review changes and ensure I maintain the highest standards for Yuttler. If anyone reading this is interested in coming on board and helping design the website visually, I would be more than happy to oblige and remove the AI generated styling. Unfortunately, budget and time constraints mean I can't make this a reality on my own (at the moment).

I also used Claude to write and update the other parts of this README. I reviewed the output and everything looked correct. Yes, there are many, many em-dashes!

## Notes

LocationIQ and Nominatim are both used within their fair-use limits, appropriate for development. Thank you to Nominatim's contributors!

This project is not affiliated with Yale University or Downtowner.

## Contact

For questions, comments, or concerns:

sadra.aliakbarpour@yale.edu  
https://www.linkedin.com/in/sadraa
