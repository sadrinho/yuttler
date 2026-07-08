import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'


function Map( {stops}) {
  return ( //anytime we want to do anything within the map instance, we have to perform that within <MapContainer>, since it uses React Context to give its children access to the map instance
    <MapContainer center={[41.3116, -72.9271]} zoom={15} style={{ height: '500px', width: '100%' }}> 
      <TileLayer 
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" // map imagery source 
        attribution='&copy; OpenStreetMap contributors' // legal requirement
      />
      {stops.map(stop => (
        <Marker // 2 "props"; position formatted in leaflet's preferred [lat, lon]; key is required in React so each stop has unique ID to identify it upon refresh
        // key isnt really a prop, it's metadata for React's reconciler. it goes to react itself. 
            position={[stop.lat, stop.lon]} 
            key={stop.id}>
            <Popup>{[stop.name]}</Popup>
        </Marker>
        ))}
    </MapContainer>
    
  )
}

export default Map