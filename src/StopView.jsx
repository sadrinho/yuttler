import { useState, useEffect } from 'react'
import { searchStops, boardForStop, soonestArrival, walkMinutes } from './stops'
import { routeColor } from './routeColor'
import styles from './StopView.module.css'
import app from './App.module.css'
import field from './Autocomplete.module.css'

// arrival times for a few stops at once, one /eta call each (the feed only takes one stop per request; the proxy caches each for 15s).
// returns { [stopId]: { etas, failed } }; a stop that isn't in there yet is still loading.
// polls every 30s and on tab focus, like the trip view
function useStopEtas(stopIds) {
  const key = stopIds.join(',') // effect deps compare by value, not a new array every render
  const [result, setResult] = useState({ key: null, byStop: {} })

  useEffect(() => {
    if (!key) return
    const ids = key.split(',')
    let stale = false // set on cleanup, so a slow answer for the old stops can't land after we've moved on

    function save(id, answer) {
      if (stale) return
      setResult(prev => ({ key, byStop: { ...(prev.key === key ? prev.byStop : {}), [id]: answer } }))
    }

    function fetchAll() {
      if (document.hidden) return // nobody's looking
      for (const id of ids) {
        fetch(`${import.meta.env.VITE_PROXY_URL}/eta/${id}`)
          .then(r => r.json())
          .then(data => save(id, { etas: data?.etas?.[id]?.etas || [], failed: Boolean(data?.error) })) // { error } when downtowner is down
          .catch(err => {
            console.error('Failed to load ETAs:', err)
            save(id, { etas: [], failed: true })
          })
      }
    }

    fetchAll()
    const intervalId = setInterval(fetchAll, 30000)
    document.addEventListener('visibilitychange', fetchAll)
    return () => {
      stale = true
      clearInterval(intervalId)
      document.removeEventListener('visibilitychange', fetchAll)
    }
  }, [key])

  return result.key === key ? result.byStop : {}
}

export function BackButton({ onClick }) {
  return (
    <button type="button" className={app.iconButton} aria-label="Back" onClick={onClick}>
      <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
        <polyline points="15,5 8,12 15,19" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
}

export function Chevron() {
  return (
    <svg className={styles.chevron} viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
      <polyline points="9,5 16,12 9,19" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function Dot({ color }) {
  return <span className={styles.dot} style={{ background: color }} aria-hidden="true" />
}

const SOURCE_LABEL = {
  start: 'Near your starting point',
  device: 'Near you',
  map: 'Near the spot you picked on the map',
}

// the list of stops around a point, plus a search box for any stop by name.
// view.near is { lat, lon }, 'locating' (waiting on the device location) or 'failed'. nearby = nearbyStops()'s answer, or null
export function NearbyList({ view, nearby, stops, routes, darkMode, onQueryChange, onPickStop, onBack }) {
  const nearbyIds = nearby ? nearby.stops.map(stop => stop.id) : []
  const etas = useStopEtas(nearbyIds)
  const query = view.query ?? ''
  const matches = searchStops(query, stops, routes)

  return (
    <div className={styles.view}>
      <div className={styles.head}>
        <BackButton onClick={onBack} />
        <div className={styles.headText}>
          <div className={styles.title}>Nearby stops</div>
          <div className={styles.subtitle}>{SOURCE_LABEL[view.source]}</div>
        </div>
      </div>

      {/* same look as the start/end fields. 16px text so ios doesn't zoom in */}
      <div className={`${field.field} ${styles.searchField}`}>
        <input
          className={field.input}
          placeholder="Search stops by name"
          value={query}
          onChange={e => onQueryChange(e.target.value)}
          aria-label="Search stops by name"
        />
      </div>

      {query.trim() ? (
        matches.length > 0 ? (
          <ul className={styles.list}>
            {matches.map(stop => (
              <li key={stop.id}>
                <button type="button" className={styles.row} onClick={() => onPickStop(stop.id)}>
                  <span className={styles.rowName}>{stop.name}</span>
                  <Chevron />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.note}>No stops match "{query.trim()}".</p>
        )
      ) : view.near === 'locating' ? (
        <>
          <p className={styles.note}>Finding your location…</p>
          <SkeletonRows count={3} />
        </>
      ) : view.near === 'failed' ? (
        <p className={styles.note}>Couldn't get your location. Search for a stop above, or tap the map.</p>
      ) : !nearby || nearby.stops.length === 0 ? (
        <p className={styles.note}>{stops.length === 0 ? 'Loading stops…' : 'No stops found.'}</p>
      ) : (
        <>
          {!nearby.anyRunning && <p className={styles.note}>No shuttles are running right now.</p>}
          {!nearby.withinRadius && <p className={styles.note}>No stops within a 5 min walk. The closest ones:</p>}
          <ul className={styles.list}>
            {nearby.stops.map(stop => {
              const answer = etas[stop.id]
              const soonest = answer && !answer.failed ? soonestArrival(answer.etas, routes) : null
              return (
                <li key={stop.id}>
                  <button type="button" className={styles.row} onClick={() => onPickStop(stop.id)}>
                    <span className={styles.rowMain}>
                      <span className={styles.rowName}>{stop.name}</span>
                      <span className={styles.rowMeta}>{walkMinutes(stop.distance)} min walk</span>
                    </span>
                    <span className={styles.rowSide}>
                      {!answer ? (
                        <>
                          <span className={styles.skelLine} style={{ width: 44 }} />
                          <span className={styles.skelLine} style={{ width: 64 }} />
                        </>
                      ) : answer.failed ? (
                        <span className={styles.rowNone}>Times unavailable</span>
                      ) : soonest ? (
                        <>
                          <span className={styles.rowEta}>{soonest.avg} min</span>
                          <span className={styles.rowRoute}>
                            <Dot color={routeColor(soonest.route.color, darkMode)} />
                            <span className={styles.rowRouteName}>{soonest.route.name}</span>
                          </span>
                        </>
                      ) : (
                        <span className={styles.rowNone}>Nothing coming</span>
                      )}
                    </span>
                    <Chevron />
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </div>
  )
}

function SkeletonRows({ count }) {
  return (
    <div className={styles.list} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={styles.skelRow}>
          <span className={styles.skelLine} style={{ width: '55%' }} />
          <span className={styles.skelLine} style={{ width: 48 }} />
        </div>
      ))}
    </div>
  )
}

// everything coming to one stop, grouped by route. distance is meters from the nearby point, or null if we came from search
export function StopBoard({ stop, distance, routes, darkMode, onBack }) {
  const answer = useStopEtas([stop.id])[stop.id]
  const loading = !answer
  const failed = answer?.failed
  const { arriving, others } = boardForStop(stop.id, failed ? [] : answer?.etas ?? [], routes)
  const colorOf = route => routeColor(route.color, darkMode)

  return (
    <div className={styles.view}>
      <div className={styles.head}>
        <BackButton onClick={onBack} />
        <div className={styles.headText}>
          <div className={styles.title}>{stop.name}</div>
          <div className={styles.subtitle}>{distance == null ? 'Shuttle stop' : `${walkMinutes(distance)} min walk`}</div>
        </div>
      </div>

      {loading ? (
        <SkeletonRows count={2} />
      ) : (
        <>
          {failed && <p className={styles.note}>Can't load arrival times right now.</p>}
          {!failed && arriving.length === 0 && <p className={styles.note}>No buses heading here right now.</p>}

          {arriving.length > 0 && (
            <ul className={styles.list}>
              {arriving.map(({ route, etas }) => (
                <li key={route.id} className={styles.routeRow}>
                  <Dot color={colorOf(route)} />
                  <span className={styles.routeName}>{route.name}</span>
                  <span className={styles.times}>
                    <span className={styles.next}>{etas[0].avg} min</span>
                    {etas.length > 1 && (
                      <span className={styles.later}>then {etas.slice(1, 3).map(eta => eta.avg).join(', ')} min</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {others.length > 0 && (
            <>
              <div className={styles.sectionLabel}>
                {failed ? 'Routes at this stop' : arriving.length > 0 ? 'Also stops here' : 'Stops here'}
              </div>
              <ul className={`${styles.list} ${styles.dim}`}>
                {others.map(route => (
                  <li key={route.id} className={styles.routeRow}>
                    <Dot color={colorOf(route)} />
                    <span className={styles.routeName}>{route.name}</span>
                    {!failed && <span className={styles.status}>{route.active ? 'Nothing coming' : 'Not running'}</span>}
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  )
}
