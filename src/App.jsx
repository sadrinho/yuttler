import { useState, useEffect } from "react";
import { planTrip } from "./tripPlanner";
import Autocomplete from "./Autocomplete";
import Map from "./Map";

function ResultsCard({ result, leg, currentLeg, totalLegs, relevantEtas, trackedBus, onBoard, onAlight, boarded, stopsRemaining, etaFailed }) {
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

  // up until this point, we were operating on the result as a whole; below this point, we operate on each leg
  
  return (
    <div>

      {boarded? // user's boarded a bus?
      (
        <>
          <p> 
            Currently riding the <strong>{leg.route.name}</strong>. {/* TODO: verify transfer logic */}
          </p>
          <p>
          Get off at <strong>{leg.alightStop.name}</strong>.
          </p>
          <p>
            {stopsRemaining} stops remaining.
          </p>
          <p> {/* if the user is within a reasonable distance of their alight stop, and they are not on the last leg, we display this button */}
            {stopsRemaining !== null && stopsRemaining <= 4 && currentLeg !== (totalLegs - 1)  && (
              <button onClick={onAlight}>I'm off</button> // manually triggers logic dictating leg switch
            )}
          </p>
        </>
      )

      // user is not on board, and we couldn't load etas; show ... instead of wrongly saying no buses are coming
      : etaFailed ? (
        <>
          <p>
            Walk to <strong>{leg.boardStop.name}</strong>
          </p>
          <p>
            Board the <strong>{leg.route.name}</strong>
          </p>
          <p>
            Bus arriving in <strong>...</strong>
          </p>
        </>
      )

      // user is not on board, and NO buses (relevantEtas) are incoming for boardStop
      : relevantEtas.length === 0 ? ( 
        <p>
          {" "}
          No buses currently inbound for{" "}
          <strong>{leg.boardStop.name}.</strong>{" "}
        </p> // TODO: later, suggest alternative stops or pull nearby stops
      ) 
      
      : // user is not on board, but buses ARE incoming for boardStop 
      (
        <>
          <p>
            Walk to <strong>{leg.boardStop.name}</strong>
          </p>
          <p>
            Board the <strong>{leg.route.name}</strong>
          </p>
          <p>{stopsRemaining} stops until you board bus <strong>{trackedBus?.name}</strong></p>
        
        {relevantEtas.map((eta) => ( // TODO: perhaps this is inappropriate for a presentational component?
          <p key={eta.bus_id}>
            Bus <strong>{eta.bus_name}</strong> in <strong>{eta.avg}</strong>{" "}
            min.
          </p>
        ))}

        {stopsRemaining !== null && stopsRemaining <=4 && // TODO: potentially change 4 to realistic number after beta testing
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
  const [etaFailed, setEtaFailed] = useState(false); // true when the last eta fetch failed, so ResultsCard shows ... instead of "no buses"
  const [currentLeg, setCurrentLeg] = useState(0); // used to determine what leg of a trip a user is on (i.e. for direct trips, remains at 0)

  const [tripResult, setTripResult] = useState(null);
  const [startCoords, setStartCoords] = useState(null);
  const [endCoords, setEndCoords] = useState(null);
  const [boardedBusId, setBoardedBusId] = useState(null); // remains null until we board a bus

  const [darkMode, setDarkMode] = useState(false);

  const leg = tripResult?.legs?.[currentLeg] ?? null // this is the leg OBJECT, not the index (i.e. currentLeg, which is an index)
  // this replaced the variable tripResult in previous versions, to handle multiple legs in a tripresult


  // relevantEtas = sorted list of soonest arriving bus etas on our route
  // when we have no tripResult, relevantEtas === []
  
  const relevantEtas = leg?.route // valid leg? has route?
    ? boardEtas 
      .filter((eta) => eta.route === leg.route.id) // we filter for routes only relevant to our leg
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
      if (Array.isArray(stopsData)) setStops(stopsData); // proxy sends { error } instead of an array when downtowner is down; keep [] rather than storing that
      if (Array.isArray(routesData)) setRoutes(routesData);
    })
    .catch((err) => console.error("Failed to load stops/routes:", err)); // network failure or non-JSON body; without this it's an unhandled rejection
  }, []); // [] is the dependency array indicating that specific thing, but sicne it's empty, it runs exactly once


  useEffect(() => {
    function fetchBuses() {
      if (document.hidden) return; // tab's in the background, nobody's looking so skip this poll
      fetch(`${import.meta.env.VITE_PROXY_URL}/buses`)
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) setBuses(data); // on { error }, keep the last positions; stale buses beat a crash in Map.jsx's buses.filter
        })
        .catch((err) => console.error("Failed to load buses:", err)); // next poll in 10s gets another shot
    }

    fetchBuses();

    const intervalId = setInterval(fetchBuses, 10000); //10000ms = 10s interval for now
    document.addEventListener("visibilitychange", fetchBuses); // fetch right away when the tab comes back so positions aren't up to 10s stale

    return () => {
      clearInterval(intervalId); // stops timer when the component unmounts
      document.removeEventListener("visibilitychange", fetchBuses);
    };
  }, []);

  useEffect(() => {
    if (!tripResult || !tripResult.success || !leg) {
      setBoardEtas([]);
      setEtaFailed(false);
      return;
    }

    const stopId = boardedBusId
      ? leg.alightStop.id 
      : leg.boardStop.id;

    function fetchETA() {
      if (document.hidden) return; // same as buses, don't poll a background tab
      fetch(`${import.meta.env.VITE_PROXY_URL}/eta/${stopId}`) // fetches etas for our stopID
        .then((r) => r.json())
        .then((data) => {
          setEtaFailed(Boolean(data?.error)); // proxy sends { error } when downtowner is down
          setBoardEtas(data?.etas?.[stopId]?.etas || []); // note: 1) unsorted 2) returns etas for ALL routes containing boardStop
        })
        .catch((err) => { // network failure or non-JSON body
          console.error("Failed to load ETAs:", err);
          setEtaFailed(true);
          setBoardEtas([]); // clear rather than show stale arrival times
        });
      // )
    }

    fetchETA(); // immediate so it's not blank for the first 30s

    const intervalId = setInterval(fetchETA, 30000); // 30s interval for updates
    document.addEventListener("visibilitychange", fetchETA); // refresh etas right away when the tab comes back

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", fetchETA); // otherwise old listeners pile up and keep fetching old stops every time this effect re-runs
    };
  }, [tripResult, currentLeg, boardedBusId]); // effect re-runs when tripResult updates, when we change legs, or when our boardedBus updates (this usually should be whenever we select "im on board")

  function handleSearch() {
    setCurrentLeg(0) // clear our leg index
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

  function handleAlight() { // called when a user gets off their current bus to alight stops
    setBoardedBusId(null)
    setCurrentLeg(currentLeg + 1)
  }

  let stopsRemaining = null

  if(tripResult?.success && leg && trackedBus) // trackedBus guard incase no bus matches and therefore no etas
  {
    const targetStop = boardedBusId? leg.alightStop : leg.boardStop // switches target calculation between "stops to get on" and "stops to get off"
    const targetIndex = leg.route.stops.indexOf(targetStop.id)
    const busIndex = leg.route.stops.indexOf(trackedBus.lastStop)
    const routeLen = leg.route?.stops?.length
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
        result={tripResult} // really only useful for checking if walk-only or if null bc guard rn checks if tripresult is null, not leg (but if tripresult is null that should imply the latter is null too)
        leg={leg} // our leg object
        currentLeg={currentLeg} // our leg index
        totalLegs={tripResult?.legs?.length ?? 0} // incase somethings wrong w/ tr or legs, we pass 0
        relevantEtas={relevantEtas} 
        trackedBus={trackedBus} 
        onBoard={() => setBoardedBusId(trackedBusId)} // resultsCard tells react to call this when we trigger onBoard
        onAlight={handleAlight} // we call handleAlight when we trigger onAlight
        boarded={boardedBusId !== null} // true if boarded, false otherwise
        stopsRemaining= {stopsRemaining}
        etaFailed={etaFailed} // true if the last eta fetch failed
      />
    </div>
  );
}

export default App;
