import { useState, useEffect } from 'react'

// arrival times for a few stops at once, one /eta call each (the feed only takes one stop per request; the proxy caches each for 15s).
// returns { [stopId]: { etas, failed } }; a stop that isn't in there yet is still loading.
// polls every 30s and on tab focus, like the trip view
export function useStopEtas(stopIds) {
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
