import { useState, useEffect } from 'react'
import { planTrip, geocode, YALE_LANDMARKS } from './tripPlanner'
import Autocomplete from './Autocomplete'
import Map from './Map'

function ResultsCard({ result }) {
  if (!result) return <p>Enter a start and end location above</p>
  if (!result.success) return <p>{result.message}</p>
  if(result.walkOnly)
  {
    return (
      <div>
        <p> No transit needed. Walk <strong>~{Math.round(result.distance)} meters</strong>  to your destination.</p>
      </div>
    )
  }

  return (
    <div>
      <p>Walk to <strong>{result.boardStop.name}</strong></p>
      <p>Board the <strong>{result.route.name}</strong></p>
      <p>Get off at <strong>{result.alightStop.name}</strong></p>
    </div>
  )
}

function App() {
  const [stops, setStops] = useState([])
  /* useState() is a React function that creates a state variable (a piece of data that has a current value, and when that value is changed, react automatically re-renders it).
  we're saying "create a state variable, and its starting value is the empty array []"
  
  useState() returns two things back: the current value of the variable, and the function to update it.
  const [a, b] = something is called array destructuring; "give me item 1 as a and the second as b"
  so we're setting stops as [] and the fucntion to update it as setStops

  useEffect fires once on load -> fetches data from proxy -> stops variable now has 172 stops -> react re-renders the component -> stops.length now shows 172 on screen
  without useState(), react wouldn't know to update the screen.
  by using setStops(data), we're saying "update the value of data AND refresh the screen"
  */
  const [routes, setRoutes] = useState([])

  const [startInput, setStartInput] = useState('')
  const [endInput, setEndInput] = useState('')
  const [tripResult, setTripResult] = useState(null)

  const [startCoords, setStartCoords] = useState(null)
  const [endCoords, setEndCoords] = useState(null)

  useEffect(() => { // this runs in response to something SPECIFIC, not every render
    Promise.all([ // make sure both return something before moving on (both promises are fulfilled)
      fetch('http://localhost:3001/stops').then(r => r.json()), // fetch http response object, then parse and return r.json()
      fetch('http://localhost:3001/routes').then(r => r.json()) // index 1
    ]).then(([stopsData, routesData]) => { // ordered; stopsData = result[0], routesData = result[1]
      setStops(stopsData)
      setRoutes(routesData)
    })

  }, []) // [] is the dependency array indicating that specific thing, but sicne it's empty, it runs exactly once

  async function handleSearch() {

    setTripResult(null)  // clear previous result first

    if (!startCoords || !endCoords) {
      setTripResult({ success: false, message: "Please select a start and end location" })
      return
    }

    const result = planTrip(
      startCoords.lat, startCoords.lon,
      endCoords.lat, endCoords.lon,
      stops,
      routes
    )

    setTripResult(result)

  }


  return (
    <div>
      <h1>Yale Shuttle</h1>
      <p>Loaded {stops.length} stops, {routes.length} routes</p>
      <div>
        <Autocomplete
          placeholder="Where are you starting from?"
          onSelect={suggestion => {
            const coords = suggestion.coords || YALE_LANDMARKS[suggestion.name] // set to former unless falsy, in which case latter
            setStartCoords(coords)
          }}
        />
        <Autocomplete
          placeholder="Where are you going?"
          onSelect={suggestion => {
            const coords = suggestion.coords || YALE_LANDMARKS[suggestion.name]
            setEndCoords(coords)
          }}
        />
        <Map
          stops={stops}
          tripResult={tripResult}
          routes={routes}
        />
        <button onClick={handleSearch}>Find Route</button>
      </div>
      <ResultsCard
        result={tripResult}
      />
    </div>
  )
}

export default App