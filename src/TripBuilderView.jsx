import { stopsAfter, rideTimes } from './tripBuilder'
import { routeColor } from './routeColor'
import { useStopEtas } from './useStopEtas'
import { BackButton, Chevron, Dot } from './StopView'
import stopStyles from './StopView.module.css'
import routesStyles from './RoutesView.module.css'
import styles from './TripBuilderView.module.css'
import app from './App.module.css'

const MAX_TIMED_STOPS = 20 // one /eta call per stop; further along than this we just don't show a time

// step 1 of each leg: you picked a bus on a stop board, now pick where to get off.
// ride = { route, boardStop, bus } (bus = the /eta entry for the bus you'll catch). onPick(alightStop, arriveAvg)
export function RideView({ ride, stops, darkMode, legNumber, onPick, onBack }) {
  const { route, boardStop, bus } = ride
  const color = routeColor(route.color, darkMode)
  const after = stopsAfter(route, boardStop.id, stops)
  const timedIds = [...new Set(after.slice(0, MAX_TIMED_STOPS).map(stop => stop.id))]
  const answers = useStopEtas(timedIds)
  const etasByStop = Object.fromEntries(Object.entries(answers).map(([id, answer]) => [id, answer.etas]))
  const times = rideTimes(after, etasByStop, bus.bus_id, bus.avg)

  return (
    <div className={stopStyles.view}>
      <div className={stopStyles.head}>
        <BackButton onClick={onBack} />
        <div className={stopStyles.headText}>
          <div className={`${stopStyles.title} ${routesStyles.routeTitle}`}>
            <Dot color={color} />
            Ride the {route.name}
          </div>
          <div className={stopStyles.subtitle}>
            {legNumber > 1 && `Leg ${legNumber} · `}Bus {bus.bus_name} at {boardStop.name} in {bus.avg} min
          </div>
        </div>
      </div>

      <div className={stopStyles.sectionLabel}>Where do you get off?</div>
      <ol className={`${stopStyles.list} ${routesStyles.stopList}`} style={{ '--c': color }}>
        {after.map((stop, i) => {
          const timed = i < MAX_TIMED_STOPS
          const loading = timed && !answers[stop.id]
          return (
            <li key={i /* a stop can be listed twice on out-and-back routes */}>
              <button type="button" className={stopStyles.row} onClick={() => onPick(stop, times[i])}>
                <span className={routesStyles.stopMark} aria-hidden="true" />
                <span className={stopStyles.rowName}>{stop.name}</span>
                {loading ? (
                  <span className={stopStyles.skelLine} style={{ width: 44 }} />
                ) : times[i] != null ? (
                  <span className={styles.time}>~{times[i]} min</span>
                ) : null}
                <Chevron />
              </button>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

// after each leg: the trip so far, with Start trip and (up to 2 transfers) Transfer here.
// legs = [{ route, boardStop, alightStop, bus, arriveAvg }]; onTransfer is null once there's no transfer left
export function TripSummary({ legs, darkMode, onStart, onTransfer, onBack }) {
  const last = legs[legs.length - 1]
  return (
    <div className={stopStyles.view}>
      <div className={stopStyles.head}>
        <BackButton onClick={onBack} />
        <div className={stopStyles.headText}>
          <div className={stopStyles.title}>Your trip</div>
          <div className={stopStyles.subtitle}>
            {legs.length === 1 ? 'No transfers' : `${legs.length - 1} ${legs.length === 2 ? 'transfer' : 'transfers'}`}
            {last.arriveAvg != null && ` · there in ~${last.arriveAvg} min`}
          </div>
        </div>
      </div>

      <ol className={styles.legs}>
        {legs.map((leg, i) => (
          <li key={i} className={styles.leg} style={{ '--c': routeColor(leg.route.color, darkMode) }}>
            <div className={styles.legLine}>
              <span className={styles.legWhat}>
                {i === 0 ? 'Board' : 'Transfer to'} the <strong>{leg.route.name}</strong> at {leg.boardStop.name}
              </span>
              <span className={styles.legTime}>{leg.bus.avg} min</span>
            </div>
            <div className={styles.legLine}>
              <span className={styles.legWhat}>Get off at <strong>{leg.alightStop.name}</strong></span>
              <span className={styles.legTime}>{leg.arriveAvg != null ? `~${leg.arriveAvg} min` : ''}</span>
            </div>
          </li>
        ))}
      </ol>

      <div className={styles.actions}>
        <button type="button" className={app.primaryButton} onClick={onStart}>
          Start trip
        </button>
        {onTransfer && (
          <button type="button" className={app.secondaryButton} onClick={onTransfer}>
            Transfer at {last.alightStop.name}
          </button>
        )}
      </div>
    </div>
  )
}
