import { useState, useEffect } from "react";
import { planTrip } from "./tripPlanner";
import Autocomplete from "./Autocomplete";
import Map from "./Map";

function ResultsCard({ result, boardEtas, relevantEtas, trackedBus, onBoard, boarded, stopsRemaining }) {
  if (!result) return <p>Enter a start and end location above</p>;
  if (!result.success) return <p>{result.message}</p>;
  if (result.walkOnly) {
    return (
      <div>
        <p>
          {" "}
          No transit needed. Walk{" "}
          <strong>~{Math.round(result.distance)} meters</strong> to your
          destination.
        </p>
      </div>
    );
  }
  
  return (
    <div>
      {boarded? // user is on board
      (
        <>
          <p> 
            Currently riding the <strong>{result.route.name}</strong>. {/* TODO: verify transfer logic */}
          </p>
          <p>
          Get off at <strong>{result.alightStop.name}</strong>.
          </p>
          <p>
            {stopsRemaining} stops remaining.
          </p>
        </>
      )
      : relevantEtas.length === 0 ? ( // user is not on board, no relevantEtas for boardStop
        <p>
          {" "}
          No buses currently inbound for{" "}
          <strong>{result.boardStop.name}.</strong>{" "}
        </p> // TODO: later, suggest alternative stops or pull nearby stops
      ) : // user is not on board but buses incoming for boardStop 
      (
        <>
          <p>
            Walk to <strong>{result.boardStop.name}</strong>
          </p>
          <p>
            Board the <strong>{result.route.name}</strong>
          </p>
          <p>{stopsRemaining} stops until you board bus <strong>{trackedBus?.name}</strong></p>
        
        {relevantEtas.map((eta) => ( // TODO: perhaps this is inappropriate for a presentational component?
          <p key={eta.bus_id}>
            Bus <strong>{eta.bus_name}</strong> in <strong>{eta.avg}</strong>{" "}
            min.
          </p>
        ))}

        {stopsRemaining !== null && stopsRemaining <= 30 && // TODO: change 30 to realistic number after testing
        (
          <button onClick={onBoard}>I'm on board</button>
        )
        }
        </>
      )}
      
    </div>
  );
}

function App() {
  const [stops, setStops] = useState([]);
  /* useState() is a React function that creates a state variable (a piece of data that has a current value, and when that value is changed, react automatically re-renders it).
  we're saying "create a state variable, and its starting value is the empty array []"
  
  useState() returns two things back: the current value of the variable, and the function to update it.
  const [a, b] = something is called array destructuring; "give me item 1 as a and the second as b"
  so we're setting stops as [] and the fucntion to update it as setStops

  useEffect fires once on load -> fetches data from proxy -> stops variable now has 172 stops -> react re-renders the component -> stops.length now shows 172 on screen
  without useState(), react wouldn't know to update the screen.
  by using setStops(data), we're saying "update the value of data AND refresh the screen"
  */
  const [routes, setRoutes] = useState([]);
  const [buses, setBuses] = useState([]);
  const [boardEtas, setBoardEtas] = useState([]);

  const [tripResult, setTripResult] = useState(null);
  const [startCoords, setStartCoords] = useState(null);
  const [endCoords, setEndCoords] = useState(null);
  const [boardedBusId, setBoardedBusId] = useState(null); // remains null until we board a bus
  const [darkMode, setDarkMode] = useState(false);

  // relevantEtas = sorted list of soonest arriving bus etas on our route
  // when we have no tripResult, relevantEtas === []
  
  const relevantEtas = tripResult?.route // valid trip? has route?
    ? boardEtas 
      .filter((eta) => eta.route === tripResult.route.id) // we filter for routes only relevant to our trip result
      .sort((a, b) => a.avg - b.avg) // sorts where a (eta obj 1)'s avg min comes before b's avg min
    : []

  // our "tracked bus ID" should be the ID of the soonest arriving bus for our stop (relevantEtas[0].bus_id), unless we have boarded a bus, in which case it should remain pinned as that bus' ID.
  // boardedBusId is null until we board a bus
  const trackedBusId = boardedBusId ?? 
  relevantEtas[0]?.bus_id

  const trackedBus = buses.find(bus => bus.id === trackedBusId)


  useEffect(() => {
    // this runs in response to something SPECIFIC, not every render
    Promise.all([
      // make sure both return something before moving on (both promises are fulfilled)
      fetch(`${import.meta.env.VITE_PROXY_URL}/stops`).then((r) => r.json()), // fetch http response object, then parse and return r.json()
      // import.meta.env.VITE_PROXY_URL for referencing the correct back-end url according to VITE_PROXY_URL in our dotenv
      fetch(`${import.meta.env.VITE_PROXY_URL}/routes`).then((r) => r.json()), // index 1
    ]).then(([stopsData, routesData]) => {
      // ordered; stopsData = result[0], routesData = result[1]
      setStops(stopsData);
      setRoutes(routesData);
    });
  }, []); // [] is the dependency array indicating that specific thing, but sicne it's empty, it runs exactly once


  useEffect(() => {
    function fetchBuses() {
      fetch(`${import.meta.env.VITE_PROXY_URL}/buses`)
        .then((r) => r.json())
        .then((data) => setBuses(data));
    }

    fetchBuses();

    const intervalId = setInterval(fetchBuses, 10000); //10000ms = 10s interval for now

    return () => clearInterval(intervalId); // stops timer when the component unmounts
  }, []);

  useEffect(() => {
    if (!tripResult || !tripResult.success || !tripResult.boardStop) {
      setBoardEtas([]);
      return;
    }

    const stopId = boardedBusId? tripResult.alightStop.id : tripResult.boardStop.id;

    function fetchETA() {
      fetch(`${import.meta.env.VITE_PROXY_URL}/eta/${stopId}`) // fetches etas for our stopID
        .then((r) => r.json())
        .then((data) => {
          setBoardEtas(data?.etas?.[stopId]?.etas || []); // note: 1) unsorted 2) returns etas for ALL routes containing boardStop
        });
      // )
    }

    fetchETA(); // immediate so it's not blank for the first 30s

    const intervalId = setInterval(fetchETA, 30000); // 30s interval for updates

    return () => clearInterval(intervalId);
  }, [tripResult, boardedBusId]); // effect re-runs when tripResult updates or when our boardedBus updates (this usually should be whenever we select "im on board")

  function handleSearch() {
    setTripResult(null); // clear previous result first
    setBoardedBusId(null) // reset boarding status

    if (!startCoords || !endCoords) {
      setTripResult({
        success: false,
        message: "Please select a start and end location",
      });
      return;
    }

    const result = planTrip(
      startCoords.lat,
      startCoords.lon,
      endCoords.lat,
      endCoords.lon,
      stops,
      routes,
    );

    setTripResult(result);
  }

  let stopsRemaining = null

  if(tripResult?.success && tripResult.boardStop && trackedBus) // trackedBus guard incase no bus matches and therefore no etas
  {
    const targetStop = boardedBusId? tripResult.alightStop : tripResult.boardStop // switches target calculation between "stops to get on" and "stops to get off"
    const targetIndex = tripResult.route.stops.indexOf(targetStop.id)
    const busIndex = tripResult.route.stops.indexOf(trackedBus.lastStop)
    const routeLen = tripResult.route?.stops?.length
    stopsRemaining = (busIndex === -1 || targetIndex === -1 || !routeLen)
    ? null
    : (targetIndex - busIndex + routeLen) % routeLen
  }

  return (
    <div>
      <h1>Yale Shuttle</h1>
      <p>
        Loaded {stops.length} stops, {routes.length} routes, {buses.length}{" "}
        buses
      </p>
      <div>
        <Autocomplete
          placeholder="Where are you starting from?"
          onSelect={(suggestion) => setStartCoords (suggestion)}
        /> 
        <Autocomplete
          placeholder="Where are you going?"
          onSelect={(suggestion) => setEndCoords(suggestion)}
        />

        <button onClick={handleSearch}>Find Route</button>

        <Map
          stops={stops}
          tripResult={tripResult}
          routes={routes}
          darkMode={darkMode}
          buses={buses}
        />

        <button onClick={() => setDarkMode(!darkMode)}>
          {darkMode ? "Toggle Light Mode" : "Toggle Dark Mode"}
        </button>
      </div>

      <ResultsCard 
        result={tripResult} 
        boardEtas={boardEtas} 
        relevantEtas={relevantEtas} 
        trackedBus={trackedBus} 
        onBoard={() => setBoardedBusId(trackedBusId)} // resultsCard tells react to call this when we trigger onBoard
        boarded={boardedBusId !== null} // true if boarded, false otherwise
        stopsRemaining= {stopsRemaining}
      />
    </div>
  );
}

export default App;
