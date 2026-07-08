# Yale Shuttle Trip Planner

A Google Maps style trip planner for the Yale Shuttle transit system. Enter where you are and where you're going, and it tells you which stop to walk to, which bus to board, and where to get off, with the route drawn on an interactive map.

Built by reverse-engineering the undocumented API behind Yale's Downtowner shuttle web app, since no public API or documentation exists.

## Features

**Trip planning:** Enter a start and destination; the app finds the 5 nearest shuttle stops to each, checks all routes for a direct connection in the correct direction of travel, and returns walk/board/alight instructions
**Autocomplete search:** Campus landmarks resolve instantly from a curated list; other queries fall back to OpenStreetMap's Nominatim geocoder (bounded roughly to the New Haven area)
**Interactive map:** (Leaflet + OpenStreetMap). All 15 shuttle routes drawn in their official colors; after a search, the map clears to show only your route with color-coded pins for your start, boarding stop, alighting stop, and destination

## How it works

The Downtowner web app exposes three undocumented endpoints, discovered via browser DevTools:

| Endpoint | Data |
|---|---|
| `routes_stops.php` | All 172 stops (id, name, coordinates) |
| `routes_routes.php` | All 15 routes (name, color, full path polyline, ordered stop list) |
| `routes_buses.php` | Live bus positions (coordinates, heading, last stop, timestamp) |

Direct browser requests to these endpoints are blocked by CORS, so a small Express proxy server sits between the React app and Downtowner, acting as a middleman and forwarding requests from `localhost`.

Trip planning takes the 5 nearest stops to both the start and end points (Haversine distance), then searches every start-candidate × end-candidate × route combination for the first route that serves both stops in the correct order.

## Tech stack

**Frontend:** React (Vite), react-leaflet/Leaflet, OpenStreetMap tiles
**Proxy:** Node.js, Express, node-fetch
**Geocoding:** curated landmark table, Nominatim (OpenStreetMap) fallback

## Running locally

Requires Node.js (LTS). Two processes run in separate terminals.

**1. Start the proxy server** (port 3001):

```
cd proxy
npm install
node server.js
```

**2. Start the React app** (port 5173):

```
npm install
npm run dev
```

Then open `http://localhost:5173`.

## Known limitations (v1)

- **Direct routes only:** no transfers between routes
- **No loop wrap-around:** routes are circular, but trips that cross the loop's "seam" aren't found
- **No walk-only suggestions:** very short trips (e.g. two adjacent buildings) either return "no route found" or a redundant route, rather than "just walk"
- **No ETAs or time comparison:** the first valid route is returned, not the fastest one right now. Furthermore, bus ETAs are not displayed.
- **Route display shows the full loop:** not trimmed to just the segment between your stops

## v2 roadmap

- Live bus positions on the map
- Real-time ETAs (a per-stop ETA endpoint, `routes_eta.php?stop=`, has been identified for this)
- Transfers and loop wrap-around
- Walk-only threshold for short trips
- Expanded landmark database with aliases (scaffolding exists in `tripPlanner.js`)
- Route segment trimming between boarding and alighting stops

## Notes

Nominatim is used within its fair-use limits, appropriate for development. Thank you to Nominatim's contributors.

This project is not affiliated with Yale University or Downtowner.

## Contact Information

For questions, comments, or concerns, please contact me at:

sadra.aliakbarpour@yale.edu  
www.linkedin.com/in/sadraa
