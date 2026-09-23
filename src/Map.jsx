import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import L from 'leaflet' // for L.divIcon. every marker is plain html now (styled in Map.module.css), no more png pins
import { routeColor } from './routeColor'
import styles from './Map.module.css'

// icons are cached so a re-render (every keystroke, every 10s bus poll) reuses the same icon object.
// react-leaflet only swaps a marker's icon when the object changes, so this keeps the existing marker dom in place
const iconCache = {}
function cachedIcon(key, make) {
  if (!iconCache[key]) iconCache[key] = make()
  return iconCache[key]
}

function makeBusIcon(heading, color) { // circle in the route color with a little triangle pointing where the bus is headed
  const deg = Math.round(heading || 0)
  return cachedIcon(`bus|${color}|${deg}`, () => L.divIcon({
    className: styles.markerReset,
    html: `<div class="${styles.bus}" style="--c: ${color}"><div class="${styles.busHeading}" style="transform: rotate(${deg}deg)"></div></div>`,
    iconSize: [32, 32], // 26px circle + 3px border each side
    iconAnchor: [16, 16], // anchored at the center
    popupAnchor: [0, -17],
  }))
}

function makeStopIcon(color) { // white dot with a ring in the route color (board / transfer / get off)
  return cachedIcon(`stop|${color}`, () => L.divIcon({
    className: styles.markerReset,
    html: `<div class="${styles.stop}" style="--c: ${color}"></div>`,
    iconSize: [22, 22], // 14px + 4px ring each side
    iconAnchor: [11, 11],
    popupAnchor: [0, -12],
  }))
}

function makePinIcon(kind) { // teardrop; its colors come from the theme tokens, so one icon works in both themes
  return cachedIcon(`pin|${kind}`, () => L.divIcon({
    className: styles.markerReset,
    html: `<div class="${styles.pin} ${kind === 'start' ? styles.pinStart : styles.pinDest}"></div>`,
    iconSize: [30, 30], // 26px + 2px border each side
    iconAnchor: [15, 36], // the sharp corner, which sits half a diagonal (15 * sqrt 2 = 21) below the center
  }))
}

// takes the flat array of lat/lon positions (from /routes) and returns an array of [lat, lon] pairs; used to draw each route w/ polyline
function pairUp(flat)
{
  if(!Array.isArray(flat)) return [] // to catch null or undefined
  const pairs = []
  for(let i = 0; i < flat.length; i += 2) //TODO: handle bad input (null flat or odd length)
  {
    pairs.push([flat[i], flat[i+1]])
  }
  return pairs
}

// legal requirement for the map data + tiles. leaflet's own attribution control is off (the bottom sheet would cover it),
// so App renders this itself in the map's top-right corner, where it's always visible.
// the LocationIQ credit (search results) lives in the hamburger menu instead, which their TOS allows
export const ATTRIBUTION = '© OpenStreetMap contributors © CARTO'

// tripResult can be:
    // null = nothing searched yet
    // {success: false, message: ...} = search failed
    // {success: true, walkOnly: true, ...} = close enough to walk
    // {success: true, legs, startCoords, endCoords} = a valid trip
function Map( { tripResult, routes, darkMode, buses }) {

  // we use a Set because lookup is o(1), we don't have any duplicates, and it makes sense to key our routes by insertion order
  const tripRouteIds = new Set(tripResult?.legs?.map(leg => leg.route.id)) 
  // we create a new Set tripRouteIds such that every item in the set is the ID of a route from each of our legs
  // also, if legs? returns null, set becomes empty set []

  const walkOnly = Boolean(tripResult?.walkOnly) // walking: just the two pins, no routes or buses

  // if our tripResult and legs are valid, we store only those routes. else, only the routes running right now
  const routesToDraw = walkOnly ? []
    : tripRouteIds.size > 0
    ? routes.filter(route => tripRouteIds.has(route.id)) // filters for ids in route matching our tripRouteIds
    : routes.filter(route => route.active) // before a search: skip routes that aren't running

  const routesById = {} // object mapping route id to route for instant lookup when drawing buses
  for (const route of routes) {
    routesById[route.id] = route
  }

  // same logic as above, but for storing all the bus objects that we have to draw
  const busesToDraw = walkOnly ? []
    : tripRouteIds.size > 0
    ? buses.filter(bus => tripRouteIds.has(bus.route))
    : buses.filter(bus => routesById[bus.route]?.active)

  const legs = tripResult?.success ? tripResult.legs ?? [] : [] // walkOnly has no legs
  const colorOf = (route) => routeColor(route?.color, darkMode) // api color in light, lightened in dark (see routeColor.js)

  return ( //anytime we want to do anything within the map instance, we have to perform that within <MapContainer>, since it uses React Context to give its children access to the map instance
    // fills its wrapper in App, which never changes size. no +/- buttons (pinch/scroll/double-tap still zoom) and no built-in attribution (see ATTRIBUTION)
    <MapContainer center={[41.3116, -72.9271]} zoom={15} zoomControl={false} attributionControl={false} style={{ height: '100%', width: '100%' }}>

      {/* creates the map tiles */}
      <TileLayer 
        key={darkMode ? 'dark' : 'light'} // force React to remount on change, safeguard
        url={darkMode
          ? `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=${import.meta.env.VITE_CARTO_API_KEY}` // map imagery source; CARTO's positron
          // ? "https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png" // possible 2nd choice in case Carto's is too dark. requires API key though
          : `https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png?key=${import.meta.env.VITE_CARTO_API_KEY}` }
        attribution={ATTRIBUTION} // kept on the layer too, so it's still correct if leaflet's control ever comes back
        updateWhenIdle={false} // on phones leaflet waits until you stop panning to load tiles (blank edges while dragging); load them as you go instead
        keepBuffer={4} // keep more off-screen tiles around (default 2) so panning back doesn't re-download them
      />

        {/* every route's casing first, then every route's line on top, so where routes cross no casing cuts through another line */}
        {routesToDraw.map(route => (
          <Polyline
            key={`casing-${route.id}`} // again, dynamically allocated; needs keys to track between renders
            positions={pairUp(route.path)} 
            pathOptions={darkMode
              ? { color: '#0B0D11', opacity: 0.7, weight: 9 }
              : { color: '#FFFFFF', opacity: 0.85, weight: 9 }}
            interactive={false} // lines never eat taps meant for the map
          />
        ))}
        {routesToDraw.map(route => (
          <Polyline
            key={route.id}
            positions={pairUp(route.path)} 
            pathOptions={{ color: colorOf(route), opacity: 1, weight: 5 }} // learned an important lesson after debugging: ' is not the same as ` 
            interactive={false}
          />
        ))}

        {busesToDraw.map(bus => {
          const route = routesById[bus.route]
          const color = colorOf(route)
          const routeName = route?.name || 'Unknown'
          return (
          <Marker
            key={bus.id}
            position={[bus.lat, bus.lon]}
            icon={makeBusIcon(bus.heading, color)}
          >
            <Popup className={styles.popup} closeButton={false}> {/* no close button: tapping the map dismisses it */}
              <div className={styles.busPopup}>
                <span className={styles.busName}>Bus {bus.name}</span>
                <span className={styles.busRoute} style={{ color }}>{routeName}</span>
              </div>
            </Popup>
          </Marker>
          )
        })}

        {/* trip stops: where you board, transfer, and get off. bus trips only; ring in the color of the route you're catching there */}
        {legs.map((leg, i) => (
          <Marker
            key={`board-${i}-${leg.boardStop.id}`}
            position={[leg.boardStop.lat, leg.boardStop.lon]}
            icon={makeStopIcon(colorOf(leg.route))}
            zIndexOffset={10000} // above buses, so a bus parked at your stop can't hide it (leaflet adds this to a z-index based on screen position, so it has to be bigger than any screen height)
          >
            <Popup className={styles.popup} closeButton={false}>
              {i === 0 ? `Board at ${leg.boardStop.name}` : `Transfer at ${leg.boardStop.name}`} {/* a transfer stop is the next leg's board stop */}
            </Popup>
          </Marker>
        ))}
        {legs.length > 0 && ( // final stop
          <Marker
            position={[legs[legs.length - 1].alightStop.lat, legs[legs.length - 1].alightStop.lon]}
            icon={makeStopIcon(colorOf(legs[legs.length - 1].route))}
            zIndexOffset={10000}
          >
            <Popup className={styles.popup} closeButton={false}>
              Get off at {legs[legs.length - 1].alightStop.name}
            </Popup>
          </Marker>
        )}

        {/* start + destination pins, on top of everything. no popups (the design has none) */}
        {tripResult?.success && ( // order matters incase tripResult = null.
          <>
            <Marker
              position={[tripResult.startCoords.lat, tripResult.startCoords.lon]}
              icon={makePinIcon('start')}
              zIndexOffset={20000}
              interactive={false}
            />
            <Marker
              position={[tripResult.endCoords.lat, tripResult.endCoords.lon]}
              icon={makePinIcon('dest')}
              zIndexOffset={20000}
              interactive={false}
            />
          </>
        )}

    </MapContainer>
    
  )
}

export default Map
