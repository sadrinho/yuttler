import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import L from 'leaflet' // will be used in stop icons. L is just the base icon object


function makeIcon(color) {
  return new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41], // the pixel point of the image that sits EXACTLY on the coordinate
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  })
}

// takes the flat array of lat/lon positions (from /routes) and returns an array of [lat, lon] pairs; used to draw each route w/ polyline
function pairUp(flat)
{
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
const orangeIcon = makeIcon('orange')

// stops = list of stops
// tripResult can be:
    // null = nothing searched yet
    // {success: false, message: ...} = search failed
    // {success: true, boardStop, alightSTop, route} = a valid trip
function Map( { stops, tripResult, routes }) {

  // if tripResult is valid, we store only that route (one element array). else, we store all routes
  const routesToDraw = (tripResult && tripResult.success)
    ? routes.filter(route => route.id == tripResult.route.id ) // filters out all routes whose id doesn't match the tripResult's route ID (i.e. every route but one, atm)
    : routes

  return ( //anytime we want to do anything within the map instance, we have to perform that within <MapContainer>, since it uses React Context to give its children access to the map instance
    <MapContainer center={[41.3116, -72.9271]} zoom={15} style={{ height: '500px', width: '100%' }}> 

      {/* creates the map tiles */}
      <TileLayer 
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" // map imagery source 
        attribution='&copy; OpenStreetMap contributors' // legal requirement. 
      />

        {routesToDraw.map(route => ( // 
          <Polyline // TODO: omit offline routes by default
            key={route.id} // again, dynamically allocated; needs keys to track between renders
            positions={pairUp(route.path)} 
            color={`#${route.color}`} // learned an important lesson after debugging: ' is not the same as ` 
          />
        ))}

        {/* draws the 4 pins denoting your specific route start/stop and bus stops */}
        {tripResult && tripResult.success && ( // order matters incase tripResult = null.
        // we use the third && to ensure that it only evaluates when tripResult.success is true, and the same is true for tripResult
            <>
                <Marker
                    position={[tripResult.startCoords.lat, tripResult.startCoords.lon]}
                    icon={startStopIcon}>
                    <Popup>You are here</Popup>
                </Marker>

                <Marker
                        position={[tripResult.endCoords.lat, tripResult.endCoords.lon]}
                        icon={startStopIcon}>
                        <Popup>Destination</Popup> 
                </Marker>

                <Marker
                        position={[tripResult.boardStop.lat, tripResult.boardStop.lon]}
                        icon={boardAlightIcon}>
                        <Popup>Board at: {tripResult.boardStop.name}</Popup> 
                </Marker>

                <Marker
                        position={[tripResult.alightStop.lat, tripResult.alightStop.lon]}
                        icon={boardAlightIcon}>
                        <Popup>Get off at: {tripResult.alightStop.name}</Popup> 
                </Marker>



    
            </> // the <>...</> is a fragment, basically an invisible wrapper since && can only produce one element, but we ewant to render 4. we wrapthem 

        )} 


    </MapContainer>
    
  )
}

export default Map