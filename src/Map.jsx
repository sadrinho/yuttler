import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import L from 'leaflet' // will be used in stop icons. L is just the base icon object


function makeIcon(color) { // setting up the pin icons for use on displaying stops
  return new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41], // the pixel point of the image that sits EXACTLY on the coordinate
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  })
}

function makeBusIcon(heading, color) { // creates the icons for the buses, given their headings
  return L.divIcon({
    className: 'bus-icon', // for css styling
    html: `<div style="transform: rotate(${heading}deg); color: ${color}; font-size: 20px;">▲</div>`, 
    iconSize: [20, 20], 
    iconAnchor: [10, 10] // anchored at the center
  })
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

const greenIcon = makeIcon('green')
const boardAlightIcon = makeIcon('red')
const startStopIcon = makeIcon('blue')
const destinationIcon = makeIcon('orange')

// stops = list of stops
// tripResult can be:
    // null = nothing searched yet
    // {success: false, message: ...} = search failed
    // {success: true, boardStop, alightSTop, route} = a valid trip
function Map( { stops, tripResult, routes, darkMode, buses }) {

  // we use a Set because lookup is o(1), we don't have any duplicates, and it makes sense to key our routes by insertion order
  const tripRouteIds = new Set(tripResult?.legs?.map(leg => leg.route.id)) 
  // we create a new Set tripRouteIds such that every item in the set is the ID of a route from each of our legs
  // also, if legs? returns null, set becomes empty set []

  // if our tripResult and legs are valid, we store only those routes. else, we store all routes. this helps with drawing polylines
  const routesToDraw = tripRouteIds.size > 0
    ? routes.filter(route => tripRouteIds.has(route.id)) // filters for ids in route matching our tripRouteIds
    : routes


  // same logic as above, but for storing all the bus objects that we have to draw
  const busesToDraw = tripRouteIds.size > 0
    ? buses.filter(bus => tripRouteIds.has(bus.route))
    : buses

  const routesById = {} // object mapping route id to route for instant lookup when drawing buses
  for (const route of routes) {
    routesById[route.id] = route
  }

  return ( //anytime we want to do anything within the map instance, we have to perform that within <MapContainer>, since it uses React Context to give its children access to the map instance
    <MapContainer center={[41.3116, -72.9271]} zoom={15} style={{ height: '500px', width: '100%' }}> 

      {/* creates the map tiles */}
      <TileLayer 
        key={darkMode ? 'dark' : 'light'} // force React to remount on change, safeguard
        url={darkMode
          ? `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=${import.meta.env.VITE_CARTO_API_KEY}` // map imagery source; CARTO's positron
          // ? "https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png" // possible 2nd choice in case Carto's is too dark. requires API key though
          : `https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png?key=${import.meta.env.VITE_CARTO_API_KEY}` }
        attribution='&copy; OpenStreetMap contributors &copy; CARTO' // legal requirement. 
      />

        {routesToDraw.map(route => ( // 
          <Polyline // TODO: omit offline routes by default
            key={route.id} // again, dynamically allocated; needs keys to track between renders
            positions={pairUp(route.path)} 
            color={`#${route.color}`} // learned an important lesson after debugging: ' is not the same as ` 
          />
        ))}

        {busesToDraw.map(bus => {
          const route = routesById[bus.route]
          const routeColor = `#${route?.color || '888888'}`
          const routeName = route?.name || 'Unknown'
          return (
          <Marker
            key={bus.id}
            position={[bus.lat, bus.lon]}
            icon={makeBusIcon(bus.heading, routeColor)}
          >
            <Popup>
              Bus {bus.name} <br />
              <span style ={{ color: routeColor }}>{routeName}</span>
            </Popup>
          </Marker>
          )
        })}

        {/* draws the 4 pins denoting your specific route start/stop and bus stops */}
        {tripResult && tripResult.success && ( // order matters incase tripResult = null.
            <>
                <Marker
                    position={[tripResult.startCoords.lat, tripResult.startCoords.lon]}
                    icon={startStopIcon}>
                    <Popup>You are here</Popup>
                </Marker>
          
                <Marker
                        position={[tripResult.endCoords.lat, tripResult.endCoords.lon]}
                        icon={destinationIcon}>
                        <Popup>Destination</Popup> 
                </Marker>

                {tripResult.legs && ( // excludes walkOnly case
                    <>
                    <Marker
                            position={[tripResult.legs[0].boardStop.lat, tripResult.legs[0].boardStop.lon]}
                            icon={boardAlightIcon}
                    >
                            <Popup>Board at: {tripResult.legs[0].boardStop.name}</Popup> 
                    </Marker>

                    {tripResult.legs.map((leg, i) => ( // index i starts at 0, leg = leg object
                      <Marker 
                        key={leg.alightStop.id}
                        position={[leg.alightStop.lat, leg.alightStop.lon]}
                        icon={boardAlightIcon}
                      >
                        <Popup>
                          {(i === (tripResult.legs.length - 1)) // are we at the final stop?
                            ? <p>Get off at: {leg.alightStop.name}</p> 
                            : <p>Transfer at: {leg.alightStop.name}</p>
                          }
                        </Popup>
                      </Marker>
                    ))}
                    </>
                )}
            </> 

        )} 


    </MapContainer>
    
  )
}

export default Map