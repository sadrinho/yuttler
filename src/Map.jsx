import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
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

const startIcon = makeIcon('green')
const endIcon = makeIcon('red')
const boardIcon = makeIcon('blue')
const alightIcon = makeIcon('orange')


// stops = list of stops
// tripResult can be
    // null = nothing searched yet
    // {success: false, message: ...} = search failed
    // {success: true, boardStop, alightSTop, route} = a valid trip
function Map( { stops, tripResult }) {
  return ( //anytime we want to do anything within the map instance, we have to perform that within <MapContainer>, since it uses React Context to give its children access to the map instance
    <MapContainer center={[41.3116, -72.9271]} zoom={15} style={{ height: '500px', width: '100%' }}> 
      <TileLayer 
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" // map imagery source 
        attribution='&copy; OpenStreetMap contributors' // legal requirement
      />
      {stops.map(stop => (
        <Marker // 2 "props"; position formatted in leaflet's preferred [lat, lon]; key is required in React so each stop has unique ID to identify it, since we're creating a dyanmically generated list and #x last render must evaluate to #x this render
        // key isnt really a prop, it's metadata for React's reconciler. it goes to react itself. 
            position={[stop.lat, stop.lon]} 
            key={stop.id}>
            <Popup>{[stop.name]}</Popup>
        </Marker>
        ))}

        {tripResult && tripResult.success && ( // order matters incase tripResult = null.
        // we use the third && to ensure that it only evaluates when tripResult.success is true, and the same is true for tripResult
            <>
                <Marker
                    position={[tripResult.startCoords.lat, tripResult.startCoords.lon]}
                    icon={startIcon}>
                    <Popup>"You are here"</Popup>
                </Marker>

                <Marker
                        position={[tripResult.endCoords.lat, tripResult.endCoords.lon]}
                        icon={endIcon}>
                        <Popup>"Destination"</Popup> 
                </Marker>

                <Marker
                        position={[tripResult.boardStop.lat, tripResult.boardStop.lon]}
                        icon={boardIcon}>
                        <Popup>Board at: {tripResult.boardStop.name}</Popup> 
                </Marker>

                <Marker
                        position={[tripResult.alightStop.lat, tripResult.alightStop.lon]}
                        icon={alightIcon}>
                        <Popup>Get off at: {tripResult.alightStop.name}</Popup> 
                </Marker>



    
            </> // the <>...</> is a fragment, basically an invisible wrapper since && can only produce one element, but we ewant to render 4. we wrapthem 

        )} 
    </MapContainer>
    
  )
}

export default Map