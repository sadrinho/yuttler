import { routeRows, routeStopsInOrder } from './routeList'
import { routeColor } from './routeColor'
import { BackButton, Chevron, Dot } from './StopView'
import stopStyles from './StopView.module.css'
import styles from './RoutesView.module.css'

// on/off switch. a real button with role="switch", so screen readers say "on"/"off"
function Switch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`${styles.switch} ${checked ? styles.switchOn : ''}`}
      onClick={() => onChange(!checked)}
    >
      <span className={styles.thumb} />
    </button>
  )
}

// busesLoaded false = no bus data yet (the feed's own "running" flags are in use), so don't claim "0 buses"
function busLine(route, busCount, busesLoaded) {
  if (!route.active) return 'Not running'
  if (!busesLoaded) return 'Running'
  return `${busCount} ${busCount === 1 ? 'bus' : 'buses'} running`
}

// the routes menu: which routes (and stops) the map shows, and each route's stops in order.
// prefs = { showAll, hidden, showStops } (see routeList.js); focusRouteId = the route whose stops we're listing, or null
export function RoutesView({ prefs, onPrefsChange, routes, buses, busesLoaded, stops, darkMode, focusRouteId, onFocus, onPickStop, onBack }) {
  const colorOf = route => routeColor(route.color, darkMode)
  const focusRoute = focusRouteId != null ? routes.find(route => route.id === focusRouteId) : null

  if (focusRoute) {
    const busCount = buses.filter(bus => bus.route === focusRoute.id).length
    const routeStops = routeStopsInOrder(focusRoute, stops)
    return (
      <div className={stopStyles.view}>
        <div className={stopStyles.head}>
          <BackButton onClick={() => onFocus(null)} />
          <div className={stopStyles.headText}>
            <div className={`${stopStyles.title} ${styles.routeTitle}`}>
              <Dot color={colorOf(focusRoute)} />
              {focusRoute.name}
            </div>
            <div className={stopStyles.subtitle}>{busLine(focusRoute, busCount, busesLoaded)} · {routeStops.length} stops</div>
          </div>
        </div>
        <ol className={`${stopStyles.list} ${styles.stopList}`} style={{ '--c': colorOf(focusRoute) }}>
          {routeStops.map((stop, i) => (
            <li key={i /* a stop can be on the list twice, so the position is the key */}>
              <button type="button" className={stopStyles.row} onClick={() => onPickStop(stop.id)}>
                <span className={styles.stopMark} aria-hidden="true" />
                <span className={stopStyles.rowName}>{stop.name}</span>
                <Chevron />
              </button>
            </li>
          ))}
        </ol>
      </div>
    )
  }

  const { rows, notRunningCount } = routeRows(routes, buses, prefs.showAll)
  const hidden = new Set(prefs.hidden)
  const runningCount = routes.filter(route => route.active).length
  function setHidden(routeId, isHidden) {
    const next = prefs.hidden.filter(id => id !== routeId)
    onPrefsChange({ ...prefs, hidden: isHidden ? [...next, routeId] : next })
  }

  return (
    <div className={stopStyles.view}>
      <div className={stopStyles.head}>
        <BackButton onClick={onBack} />
        <div className={stopStyles.headText}>
          <div className={stopStyles.title}>Routes</div>
          <div className={stopStyles.subtitle}>
            {runningCount} running{busesLoaded && ` · ${buses.length} ${buses.length === 1 ? 'bus' : 'buses'}`}
          </div>
        </div>
      </div>

      {/* same pill as the theme toggle in the menu */}
      <div className={styles.segmented} role="group" aria-label="Which routes to show">
        <button
          type="button"
          className={!prefs.showAll ? styles.selected : ''}
          aria-pressed={!prefs.showAll}
          onClick={() => onPrefsChange({ ...prefs, showAll: false })}
        >
          Running now
        </button>
        <button
          type="button"
          className={prefs.showAll ? styles.selected : ''}
          aria-pressed={prefs.showAll}
          onClick={() => onPrefsChange({ ...prefs, showAll: true })}
        >
          All routes
        </button>
      </div>

      <div className={styles.settingRow}>
        <span className={styles.settingText} id="show-stops-label">Show stops on the map</span>
        <Switch
          checked={prefs.showStops}
          onChange={showStops => onPrefsChange({ ...prefs, showStops })}
          label="Show stops on the map"
        />
      </div>

      {rows.length === 0 ? (
        <p className={stopStyles.note}>No shuttles are running right now.</p>
      ) : (
        <ul className={stopStyles.list}>
          {rows.map(({ route, busCount }) => {
            const shown = !hidden.has(route.id)
            return (
              <li key={route.id} className={`${styles.routeItem} ${shown ? '' : styles.off}`}>
                <button type="button" className={stopStyles.row} onClick={() => onFocus(route.id)}>
                  <Dot color={colorOf(route)} />
                  <span className={stopStyles.rowMain}>
                    <span className={stopStyles.rowName}>{route.name}</span>
                    <span className={stopStyles.rowMeta}>{busLine(route, busCount, busesLoaded)}</span>
                  </span>
                  <Chevron />
                </button>
                <Switch checked={shown} onChange={on => setHidden(route.id, !on)} label={`Show ${route.name} on the map`} />
              </li>
            )
          })}
        </ul>
      )}

      {!prefs.showAll && notRunningCount > 0 && (
        <button type="button" className={styles.textButton} onClick={() => onPrefsChange({ ...prefs, showAll: true })}>
          {notRunningCount} more {notRunningCount === 1 ? "route isn't" : "routes aren't"} running. Show all
        </button>
      )}
    </div>
  )
}
