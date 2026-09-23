import { useState, useEffect, useRef } from "react";
import { planTrip } from "./tripPlanner";
import Autocomplete from "./Autocomplete";
import Map, { ATTRIBUTION } from "./Map";
import styles from "./App.module.css";
import card from "./ResultsCard.module.css";
import { routeColor } from "./routeColor";
import Splash from "./Splash";

function MenuIcon() {
  // the three hamburger bars, used by both the floating (mobile) and in-pane (desktop) menu buttons
  return (
    <span className={styles.menuBars} aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}

// everything below the divider in a trip state. App works out which view we're in (tripView) from the existing
// state, this just draws it. stays one component with stable elements so 10s/30s updates don't remount anything
function ResultsCard({
  result,
  view,
  leg,
  isTransfer,
  isFinalLeg,
  relevantEtas,
  onBoard,
  onAlight,
  onDone,
  stopsRemaining,
  legColor,
}) {
  if (view === "noRoute") {
    return (
      <div className={card.title}>No route found between these locations.</div>
    );
  }

  if (view === "walk") {
    // planTrip gives meters; 80 m/min is about 3 mph
    const ft = Math.round((result.distance * 3.281) / 10) * 10;
    const min = Math.max(1, Math.round(result.distance / 80));
    return (
      <div className={card.block}>
        <div className={card.title}>No bus needed.</div>
        <div className={card.subtitle}>
          Walk{" "}
          <span className={card.accentStrong}>
            ~{ft} ft (~{min} min)
          </span>{" "}
          to your destination.
        </div>
      </div>
    );
  }

  // up until this point, we were operating on the result as a whole; below this point, we operate on each leg
  const routeDot = (
    <span
      className={card.dot}
      style={{ background: legColor }}
      aria-hidden="true"
    />
  );
  const closeEnough = stopsRemaining !== null && stopsRemaining <= 4; // TODO: potentially change 4 to realistic number after beta testing

  if (view === "riding") {
    return (
      <>
        <div className={card.block}>
          <div className={`${card.routeLine} ${card.routeLineSmall}`}>
            {routeDot}
            <span className={card.subtitle}>Riding the {leg.route.name}</span>
          </div>
          <div className={card.title}>
            Get off at{" "}
            <span className={card.accent}>{leg.alightStop.name}</span>
          </div>
        </div>

        <div className={card.hero}>
          {stopsRemaining === null ? ( // no bus position yet: same-size placeholder so nothing jumps when it arrives
            <span className={card.skelHero} />
          ) : (
            <>
              <span className={card.heroValue}>{stopsRemaining}</span>
              <span className={card.heroUnit}>
                {stopsRemaining === 1 ? "stop left" : "stops left"}
              </span>
            </>
          )}
        </div>

        <div className={card.actions}>
          {isFinalLeg ? (
            <button className={styles.primaryButton} onClick={onDone}>
              Done
            </button>
          ) : (
            // always rendered (disabled until the bus is close) so its space is reserved and nothing jumps
            <button
              className={styles.primaryButton}
              disabled={!closeEnough}
              onClick={onAlight}
            >
              I'm off
            </button> // manually triggers logic dictating leg switch
          )}
        </div>
      </>
    );
  }

  // waiting, skeleton, no buses, eta unavailable (and transfer, which is just waiting for the next leg)
  const loading = view === "skeleton";
  const next = relevantEtas[0];
  const later = [relevantEtas[1], relevantEtas[2]]; // always 2 slots so the row height never changes

  return (
    <>
      <div className={card.block}>
        {!isTransfer && ( // on a transfer you're already at the stop, the banner says so
          <div className={card.subtitle}>
            Walk to{" "}
            <span className={card.accentStrong}>{leg.boardStop.name}</span>
          </div>
        )}
        <div className={card.routeLine}>
          {routeDot}
          <span className={card.title}>Board the {leg.route.name}</span>
        </div>
      </div>

      {view === "noBuses" || view === "etaUnavailable" ? (
        <p className={card.message}>
          {
            view === "noBuses"
              ? `No buses heading to ${leg.boardStop.name} right now.` // TODO: later, suggest alternative stops or pull nearby stops
              : "Can't load arrival times right now." // don't wrongly say no buses are coming; the next 30s poll retries
          }
        </p>
      ) : (
        <div className={card.etaRow}>
          <div className={card.heroCol}>
            <div className={card.hero}>
              {loading ? (
                <span className={card.skelHero} />
              ) : (
                <>
                  <span className={card.heroValue}>{next.avg}</span>
                  <span className={card.heroUnit}>min</span>
                </>
              )}
            </div>
            <div className={card.meta}>
              {loading ? (
                <span className={card.skelLine} style={{ width: 132 }} />
              ) : (
                <>
                  Bus {next.bus_name}
                  {stopsRemaining !== null &&
                    ` · ${stopsRemaining} ${stopsRemaining === 1 ? "stop" : "stops"} away`}
                </>
              )}
            </div>
          </div>
          <div className={card.later}>
            {later.map((eta, i) => (
              <div key={i} className={card.laterSlot}>
                {" "}
                {/* keyed by slot, not bus, so rows update in place */}
                {i === 1 && (
                  <div
                    className={card.divider}
                    style={{
                      visibility: loading || eta ? "visible" : "hidden",
                    }}
                  />
                )}
                <div className={card.meta}>
                  {loading ? (
                    <span className={card.skelLine} style={{ width: 118 }} />
                  ) : eta ? (
                    `Bus ${eta.bus_name} · ${eta.avg} min`
                  ) : (
                    " "
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={card.actions}>
        {/* never hidden, just disabled until the bus is 4 or fewer stops away */}
        <button
          className={styles.primaryButton}
          disabled={loading || !closeEnough}
          onClick={onBoard}
        >
          I'm on board
        </button>
        {/* kept in place (just invisible) once the button enables, so nothing moves */}
        <p
          className={card.helper}
          style={{ visibility: !loading && closeEnough ? "hidden" : "visible" }}
        >
          Available when your bus is closer
        </p>
      </div>
    </>
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
  const [loading, setLoading] = useState(true); // true until stops + routes have loaded (or failed): shows the splash
  const [loadError, setLoadError] = useState(null); // { status } if they failed (status is null for a network error): shows load failed
  const [etasFor, setEtasFor] = useState(null); // { trip, stopId } the current boardEtas came from, so we know when they're for the stop we're showing (skeleton until then)
  const [currentLeg, setCurrentLeg] = useState(0); // used to determine what leg of a trip a user is on (i.e. for direct trips, remains at 0)

  const [tripResult, setTripResult] = useState(null);
  const [startCoords, setStartCoords] = useState(null);
  const [endCoords, setEndCoords] = useState(null);
  const [boardedBusId, setBoardedBusId] = useState(null); // remains null until we board a bus

  // index.html already picked the theme from localStorage before react loaded, so just read it back
  const [panelExpanded, setPanelExpanded] = useState(true); // mobile only: bottom sheet open vs collapsed to its one-line bar. desktop ignores it
  const [cancelArmed, setCancelArmed] = useState(false); // true after the first tap on the X: it's showing "Cancel trip" and the next tap ends the trip
  const cancelRef = useRef(null);

  // an armed cancel button goes back to the X after 5s, or as soon as you tap anywhere else
  useEffect(() => {
    if (!cancelArmed) return;
    const timer = setTimeout(() => setCancelArmed(false), 5000);
    function disarmOnOutsideTap(e) {
      if (!cancelRef.current?.contains(e.target)) setCancelArmed(false);
    }
    document.addEventListener("pointerdown", disarmOnOutsideTap);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("pointerdown", disarmOnOutsideTap);
    };
  }, [cancelArmed]);

  const [darkMode, setDarkMode] = useState(
    () => document.documentElement.dataset.theme === "dark",
  );

  // whenever the theme changes, apply it to <html> (the css tokens key off data-theme) and remember it
  useEffect(() => {
    const theme = darkMode ? "dark" : "light";
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("theme", theme);
    } catch {
      // storage blocked (e.g. private mode), theme just won't persist
    }
  }, [darkMode]);

  const leg = tripResult?.legs?.[currentLeg] ?? null; // this is the leg OBJECT, not the index (i.e. currentLeg, which is an index)
  // this replaced the variable tripResult in previous versions, to handle multiple legs in a tripresult

  // relevantEtas = sorted list of soonest arriving bus etas on our route
  // when we have no tripResult, relevantEtas === []

  const relevantEtas = leg?.route // valid leg? has route?
    ? boardEtas
        .filter((eta) => eta.route === leg.route.id) // we filter for routes only relevant to our leg
        .sort((a, b) => a.avg - b.avg) // sorts where a (eta obj 1)'s avg min comes before b's avg min
    : [];

  // our "tracked bus ID" should be the ID of the soonest arriving bus for our stop (relevantEtas[0].bus_id), unless we have boarded a bus, in which case it should remain pinned as that bus' ID.
  // boardedBusId is null until we board a bus
  const trackedBusId = boardedBusId ?? relevantEtas[0]?.bus_id;

  const trackedBus = buses.find((bus) => bus.id === trackedBusId);

  useEffect(() => {
    // this runs in response to something SPECIFIC, not every render

    // fetches one list from the proxy. anything other than an OK response with an array in it counts as a failure,
    // so the splash can switch to "couldn't reach the server" instead of the app quietly showing 0 stops
    function getList(path) {
      return fetch(`${import.meta.env.VITE_PROXY_URL}${path}`) // import.meta.env.VITE_PROXY_URL for referencing the correct back-end url according to VITE_PROXY_URL in our dotenv
        .then((r) => {
          if (!r.ok) throw Object.assign(new Error(`HTTP ${r.status}`), { status: r.status }); // e.g. the proxy's 502 when downtowner is down; keep the code to show
          return r.json(); // parse and return the body
        })
        .then((data) => {
          if (!Array.isArray(data)) throw new Error("Expected a list"); // proxy sends { error } instead of an array when downtowner is down
          return data;
        });
    }

    Promise.all([
      // make sure both return something before moving on (both promises are fulfilled)
      getList("/stops"),
      getList("/routes"), // index 1
    ])
      .then(([stopsData, routesData]) => {
        // ordered; stopsData = result[0], routesData = result[1]
        setStops(stopsData);
        setRoutes(routesData);
      })
      .catch((err) => {
        console.error("Failed to load stops/routes:", err); // network failure, non-OK status, or non-JSON body
        setLoadError({ status: err.status ?? null }); // no status = network error
      })
      .finally(() => setLoading(false)); // splash goes away either way (to the app, or to the load failed screen)
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

    const stopId = boardedBusId ? leg.alightStop.id : leg.boardStop.id;

    function fetchETA() {
      if (document.hidden) return; // same as buses, don't poll a background tab
      fetch(`${import.meta.env.VITE_PROXY_URL}/eta/${stopId}`) // fetches etas for our stopID
        .then((r) => r.json())
        .then((data) => {
          setEtaFailed(Boolean(data?.error)); // proxy sends { error } when downtowner is down
          setBoardEtas(data?.etas?.[stopId]?.etas || []); // note: 1) unsorted 2) returns etas for ALL routes containing boardStop
          setEtasFor({ trip: tripResult, stopId }); // first answer for this trip + stop is in, so the skeleton can go
        })
        .catch((err) => {
          // network failure or non-JSON body
          console.error("Failed to load ETAs:", err);
          setEtaFailed(true);
          setBoardEtas([]); // clear rather than show stale arrival times
          setEtasFor({ trip: tripResult, stopId }); // a failure is still an answer: show "can't load arrival times" instead of the skeleton
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
    setCurrentLeg(0); // clear our leg index
    setTripResult(null); // clear previous result first
    setBoardedBusId(null); // reset boarding status

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

  // done (final leg) and cancel both end the trip. the fields keep what you typed since the Autocompletes never unmount
  function resetTrip() {
    setTripResult(null);
    setCurrentLeg(0);
    setBoardedBusId(null);
    setCancelArmed(false); // so the next trip starts with a plain X
  }

  // cancelling a bus trip takes two taps: the X turns into a red "Cancel trip" pill, and tapping that cancels.
  // walk only / no route have no trip to lose, so the X clears straight away
  function handleCancel() {
    const inBusTrip = tripResult?.success && !tripResult.walkOnly;
    if (inBusTrip && !cancelArmed) {
      setCancelArmed(true);
      return;
    }
    resetTrip();
  }

  function handleAlight() {
    // called when a user gets off their current bus to alight stops
    setBoardedBusId(null);
    setCurrentLeg(currentLeg + 1);
  }

  let stopsRemaining = null;

  if (
    tripResult?.success &&
    leg &&
    trackedBus
  ) // trackedBus guard incase no bus matches and therefore no etas
  {
    const targetStop = boardedBusId ? leg.alightStop : leg.boardStop; // switches target calculation between "stops to get on" and "stops to get off"
    const targetIndex = leg.route.stops.indexOf(targetStop.id);
    const busIndex = leg.route.stops.indexOf(trackedBus.lastStop);
    const routeLen = leg.route?.stops?.length;
    stopsRemaining =
      busIndex === -1 || targetIndex === -1 || !routeLen
        ? null
        : (targetIndex - busIndex + routeLen) % routeLen;
  }

  // search state = nothing searched yet, or handleSearch's "please select" message (which shows in the hint slot, not as a result)
  const isValidationMessage =
    tripResult?.success === false &&
    tripResult.message === "Please select a start and end location";
  const inSearchState = !tripResult || isValidationMessage;
  // only warn while a field is actually still missing, so picking the missing place clears the warning straight away
  const showValidation = isValidationMessage && (!startCoords || !endCoords);

  // which stop the eta effect is polling right now, and whether its first answer (for this trip) is in yet
  const etaStopId = leg
    ? boardedBusId
      ? leg.alightStop.id
      : leg.boardStop.id
    : null;
  const etasLoaded =
    etasFor?.trip === tripResult && etasFor?.stopId === etaStopId;

  // which trip view to draw. no new state machine, it's all worked out from what we already have (see the design readme's table)
  let tripView = null; // null = search state
  if (!inSearchState) {
    if (!tripResult.success) tripView = "noRoute";
    else if (tripResult.walkOnly) tripView = "walk";
    else if (boardedBusId) tripView = "riding";
    else if (!etasLoaded) tripView = "skeleton";
    else if (etaFailed) tripView = "etaUnavailable";
    else if (relevantEtas.length === 0) tripView = "noBuses";
    else tripView = "waiting";
  }
  const totalLegs = tripResult?.legs?.length ?? 0; // incase somethings wrong w/ tr or legs, we pass 0
  const inBusTrip =
    tripView !== null && tripView !== "noRoute" && tripView !== "walk";
  const isTransfer = inBusTrip && !boardedBusId && currentLeg > 0; // off one bus, waiting for the next at the same stop
  const legColor = leg ? routeColor(leg.route.color, darkMode) : null; // same color the map uses for this route

  // the one-liner on the collapsed mobile bar
  function collapsedSummary() {
    const eta = relevantEtas[0]?.avg;
    switch (tripView) {
      case null:
        return "Where to?";
      case "walk":
        return `Walk ~${Math.max(1, Math.round(tripResult.distance / 80))} min`;
      case "noRoute":
        return "No route found";
      case "riding":
        return stopsRemaining === null
          ? `Get off at ${leg.alightStop.name}`
          : `${stopsRemaining} ${stopsRemaining === 1 ? "stop" : "stops"} to ${leg.alightStop.name}`;
      case "noBuses":
        return `No buses heading to ${leg.boardStop.name}`;
      case "etaUnavailable":
        return "Arrival times unavailable";
      case "skeleton": // eta not in yet
      default:
        return (
          <>
            {isTransfer ? "Transfer: board" : "Board"}{" "}
            {/* route name in its own color, like the dot */}
            <span style={{ color: legColor }}>{leg.route.name}</span>
            {tripView !== "skeleton" && ` in ${eta} min`}
          </>
        );
    }
  }

  // mobile vs desktop is decided purely in App.module.css (one breakpoint at 1024px), so everything below renders on both
  // and css hides whatever doesn't belong. no js width checks = nothing jumps on load
  return (
    <>
      {/* the map sits behind everything and its box never changes size, the sheet just slides over it */}
      <div className={styles.mapArea}>
        <Map
          tripResult={tripResult}
          routes={routes}
          darkMode={darkMode}
          buses={buses}
        />
      </div>

      {/* desktop: attribution in the map's bottom-right corner. on mobile it rides on top of the sheet instead (below) */}
      <div
        className={styles.mapAttribution}
        dangerouslySetInnerHTML={{ __html: ATTRIBUTION }}
      />

      {/* mobile: floating menu button over the map. the menu itself comes later, so this does nothing yet */}
      <button
        type="button"
        className={styles.floatingMenuButton}
        aria-label="Menu"
      >
        <MenuIcon />
      </button>

      {/* mobile: the one-line bar you see when the sheet is hidden. the whole bar is the tap target */}
      <div
        className={`${styles.collapsedBar} ${panelExpanded ? "" : styles.collapsedBarShown}`}
      >
        <div
          className={styles.sheetAttribution}
          dangerouslySetInnerHTML={{ __html: ATTRIBUTION }}
        />
        <button
          type="button"
          className={styles.summaryButton}
          aria-expanded={false}
          onClick={() => setPanelExpanded(true)}
        >
          <span className={styles.summary}>{collapsedSummary()}</span>
          <span className={styles.chevron} aria-hidden="true">
            <svg viewBox="0 0 24 24" width="17" height="17">
              <polyline
                points="5,15 12,8 19,15"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </button>
      </div>

      {/* the panel: bottom sheet on mobile, fixed 400px left pane on desktop */}
      <aside
        className={`${styles.panel} ${panelExpanded ? "" : styles.panelCollapsed}`}
        // pressing a button normally steals focus from the field you're typing in, which shrinks the sheet mid-tap
        // and the click lands somewhere else. stopping that focus move keeps everything still until the click happens
        onMouseDown={(e) => {
          if (e.target.closest("button")) e.preventDefault();
        }}
      >
        <div
          className={styles.sheetAttribution}
          dangerouslySetInnerHTML={{ __html: ATTRIBUTION }}
        />

        <div className={styles.panelHeader}>
          {/* desktop only: menu button + wordmark at the top of the pane */}
          <button
            type="button"
            className={styles.paneMenuButton}
            aria-label="Menu"
          >
            <MenuIcon />
          </button>
          <div className={styles.wordmark}>yuttler.</div>

          {/* cancel X: left on mobile, far right on desktop. shown in every result state; the only way out of a trip.
              same button element in both looks (X, then the armed "Cancel trip" pill), so it doesn't remount between taps */}
          {tripView !== null && (
            <button
              ref={cancelRef}
              type="button"
              className={`${cancelArmed ? styles.cancelArmed : styles.iconButton} ${styles.cancelButton}`}
              onClick={handleCancel}
              aria-label={cancelArmed ? undefined : inBusTrip ? "Cancel trip" : "Clear"}
            >
              {cancelArmed ? (
                "Cancel trip"
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  width="17"
                  height="17"
                  aria-hidden="true"
                >
                  <path
                    d="M5 5 L19 19 M19 5 L5 19"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    fill="none"
                  />
                </svg>
              )}
            </button>
          )}

          {/* mobile only: slides the sheet down to the collapsed bar */}
          <button
            type="button"
            className={styles.hideButton}
            aria-expanded={true}
            onClick={() => setPanelExpanded(false)}
          >
            Hide
          </button>
        </div>

        <div className={styles.panelBody}>
          {isTransfer && ( // calm, not alarming: tinted card, accent text, no icon
            <p className={styles.transferBanner}>
              Transfer: stay at <strong>{leg.boardStop.name}</strong> and board
              the <strong>{leg.route.name}</strong>
            </p>
          )}

          <div
            className={`${styles.fields} ${tripView !== null ? styles.fieldsCompact : ""}`}
          >
            {inBusTrip && totalLegs > 1 && (
              <div className={styles.legLabel}>
                Leg {currentLeg + 1} of {totalLegs}
              </div>
            )}
            {/* same components in every state (so what you typed survives), just shrunk to fixed chips once there's a result */}
            <Autocomplete
              placeholder="Where are you starting from?"
              onSelect={(suggestion) => setStartCoords(suggestion)}
              invalid={showValidation && !startCoords}
              compact={tripView !== null}
            />
            <Autocomplete
              placeholder="Where are you going?"
              onSelect={(suggestion) => setEndCoords(suggestion)}
              invalid={showValidation && !endCoords}
              compact={tripView !== null}
            />
          </div>

          {/* search state: find route + the hint (or the warning, in the same one-line slot so nothing moves). any other state: the results */}
          {inSearchState ? (
            <>
              <button
                className={styles.primaryButton}
                onClick={() => {
                  document.activeElement?.blur();
                  handleSearch();
                }}
              >
                Find route
              </button>{" "}
              {/* blur so the keyboard closes and the sheet settles once the search runs */}
              <p
                className={`${styles.hint} ${showValidation ? styles.hintWarning : ""}`}
              >
                {showValidation
                  ? "Please select a start and end location"
                  : "Enter a start and end location above"}
              </p>
            </>
          ) : (
            <>
              <div className={styles.divider} />
              <ResultsCard
                result={tripResult} // walk-only distance
                view={tripView} // which state to draw, worked out above
                leg={leg} // our leg object
                isTransfer={isTransfer}
                isFinalLeg={currentLeg === totalLegs - 1}
                relevantEtas={relevantEtas}
                onBoard={() => setBoardedBusId(trackedBusId)} // resultsCard tells react to call this when we trigger onBoard
                onAlight={handleAlight} // we call handleAlight when we trigger onAlight
                onDone={resetTrip} // final leg: trip's over, back to search
                stopsRemaining={stopsRemaining}
                legColor={legColor} // route color, lightened in dark theme
              />
            </>
          )}

          {/* both of these move into the hamburger menu later, they just live here for now */}
          <button onClick={() => setDarkMode(!darkMode)}>
            {darkMode ? "Toggle Light Mode" : "Toggle Dark Mode"}
          </button>
          <p>
            Loaded {stops.length} stops, {routes.length} routes, {buses.length}{" "}
            buses
          </p>
        </div>
      </aside>

      {/* over everything until stops + routes are in; stays up as "load failed" if they never arrive */}
      {(loading || loadError) && <Splash error={loadError} />}
    </>
  );
}

export default App;
