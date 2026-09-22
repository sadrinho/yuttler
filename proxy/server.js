require('dotenv').config() // reads .env file

const express = require('express')
const cors = require('cors')
const fetch = require('node-fetch')
const { version } = require('./package.json')

// import statements in node are "require()"
// edit: we just downgraded the version of node-fetch we use to work with this

const app = express() // creates a server instance

const allowedOrigin = process.env.ALLOWED_ORIGIN.split(',') //handles multiple allowed origins
app.use(cors({ origin: allowedOrigin })) // tells that server instance to attach CORS headers 
                // so we can actually send + receive the data we need

function scrubKey(text) { // had an issue where errors would reveal the API key; found this fix
  const str = String(text)
  return process.env.LOCATIONIQ_KEY
    ? str.replaceAll(process.env.LOCATIONIQ_KEY, '[super-ultra-secret-key, pal]')
    : str
}

// in-memory cache for downtowner responses, so hundreds of polling clients become a handful of upstream requests
const cache = new Map() // key -> { data, fetchedAt }
const inFlight = new Map() // key -> promise for an upstream fetch that's currently running

async function cachedFetch(key, url, ttlMs) { // returns data for key, only hitting url if our copy is older than ttlMs
  const entry = cache.get(key)
  if (entry && Date.now() - entry.fetchedAt < ttlMs) return entry.data // fresh enough, skip upstream
  if (inFlight.has(key)) return inFlight.get(key) // someone's already fetching this; wait on their result

  const promise = (async () => {
    try {
      console.log('Upstream fetch:', key)
      const response = await fetch(url, { timeout: 5000 }) // give up after 5s so one hung request can't stall every waiting client
      if (!response.ok) throw new Error(`status ${response.status}`)
      const data = await response.json()
      cache.set(key, { data, fetchedAt: Date.now() }) // only successes get cached
      return data
    } catch (err) {
      if (!entry) throw err // nothing stale to fall back on
      console.error(`Upstream fetch failed for ${key}, serving stale:`, scrubKey(err.message))
      entry.fetchedAt = Date.now() // pretend it's fresh so we retry once per ttl, not on every request
      return entry.data
    } finally {
      inFlight.delete(key) // done either way; next expiry starts a new fetch
    }
  })()
  inFlight.set(key, promise)
  return promise
}


// note: .get requests are done in order, top to bottom, by matching; can be important if using some sort of wildcard operator

function normalizeLocation(location, source) { // given a list of raw location objects from a locationIQ or nominatim call (determined by source), return an array of objects {name; lat; lon}
  return location.map(locObj => ({ 
    name: source === 'locationIQ' // locationIQ and nominatim return different name formats
      ? locObj.display_place
      : locObj.display_name.split(',')[0], // simple split grabbing first segment for now; could be inaccurate. TODO: brainstorm improvement
    lat: parseFloat(locObj.lat),
    lon: parseFloat(locObj.lon)
  }))
}

app.get('/', (req, res) => res.send(`what's up chat, we're live`)) // default page lol


// when we make a GET request to /stops, run this function.
// req is the incoming request
// res is our response
app.get('/stops', async (req, res) => {
  try {
    const data = await cachedFetch('stops', 'https://yale.downtownerapp.com/routes_stops.php', 60 * 60 * 1000) // fetch and wait (cached for 1h; cachedFetch parses the JSON)
    res.json(data) // send the data back
  } catch (err) { // downtowner failed and we had nothing cached to fall back on
    console.error('Upstream fetch failed for stops:', scrubKey(err.message))
    res.status(502).json({ error: 'Upstream unavailable' }) // 502 = the server we depend on failed, not us
  }
})

/*
    the flow is this:
        - react app asks localhost:3001/stops (or whatever it is we need)
        - express takes the request and runs the corresponding function
        - function fetches data from yale's server
        - gets the data back and parses it
        - forwards it to our react app
*/
app.get('/routes', async (req, res) => {
  try {
    const data = await cachedFetch('routes', 'https://yale.downtownerapp.com/routes_routes.php?inactive=true', 60 * 60 * 1000) // cached for 1h
    res.json(data)
  } catch (err) {
    console.error('Upstream fetch failed for routes:', scrubKey(err.message))
    res.status(502).json({ error: 'Upstream unavailable' })
  }
})

// fetch individual stop ETAs
// stop url looks like: https://yale.downtownerapp.com/routes_eta.php?stop=96
app.get('/eta/:stopId', async (req, res) => {
  const stopId = req.params.stopId // Express captures this from the URL's path
  if (!/^\d+$/.test(stopId)) return res.status(400).json({ error: 'Invalid stop id' }) //safeguard for non-integer stopid param
  try {
    const data = await cachedFetch(`eta:${stopId}`, `https://yale.downtownerapp.com/routes_eta.php?stop=${stopId}`, 15 * 1000) // we use route parameters since we don't want to hardcode a single stop w/ etas, nor load all the stops all the time. cached 15s per stop
    // note to self: backticks, not quotes!! 
    res.json(data)
  } catch (err) {
    console.error(`Upstream fetch failed for eta:${stopId}:`, scrubKey(err.message))
    res.status(502).json({ error: 'Upstream unavailable' })
  }
})

const iqURL = `https://api.locationiq.com/v1/autocomplete?key=${process.env.LOCATIONIQ_KEY}&viewbox=-72.8084514641751%2C41.41930017433788%2C-73.02641547890617%2C41.22302882412524&bounded=1&normalizeaddress=1` //locationIQ's endpoint. see below for details

/* query param breakdown:
  // encodeURIComponent to ensure we safely read text with special characters (like spaces)
   // viewbox=... 
    // New Haven + North Haven + ~Woodmont coordinates (from https://geojson.io/?map=9.34/41.377/-72.94183)
    
    https://geojson.io/?map=9.34/41.377/-72.94183

                  -73.02641547890617, <- lon
                  41.22302882412524 <- lat
                ], <-- lower left
                [
                  -72.8084514641751,
                  41.22302882412524
                ],
                [
                  -72.8084514641751,
                  41.41930017433788 <- top right
                ],
                [
                  -73.02641547890617,
                  41.41930017433788
                ],
                [
                  -73.02641547890617,
                  41.22302882412524


  
  // bounded=1 means we strictly limit results to our viewbox
  // normalizeaddress=1 "makes parsing of the address object easier by returning a predictable and defined list of elements. Defaults to 0 for backward compatibility. We recommend setting this to 1 for new projects" 
*/

const nomURL = `https://nominatim.openstreetmap.org/search?&format=json&limit=1&viewbox=-72.8084514641751,41.41930017433788,-73.02641547890617,41.22302882412524&bounded=1` // nominatim's endpoint. note: format of viewbox coord pairs differs with locationIQ 
const nominatimEnabled = process.env.ENABLE_NOMINATIM === 'true' // off unless explicitly set to 'true'; nominatim's policy caps us at 1 req/s and forbids autocomplete use

// in-memory cache for locationIQ results, keyed by the cleaned-up query (never the url, since that has our key in it)
const iqCache = new Map() // query -> { data, fetchedAt }. Map keeps insertion order, so the first key is always the least recently used
const iqInFlight = new Map() // query -> promise for a locationIQ call that's currently running
const iqTTL = 24 * 60 * 60 * 1000 // 24h; locationIQ's free plan allows caching for up to 48h
const iqEmptyTTL = 60 * 60 * 1000 // 1h for queries with no results, in case the place shows up later
const iqMaxEntries = 5000 // ~1KB per entry, so roughly 5MB at most

async function fetchLocationIQ(query) { // one real locationIQ call, shared by everyone asking for the same query. returns results, or null if locationIQ sent an error status
  try {
    console.log('Upstream fetch: locationIQ') // query left out on purpose so user searches don't end up in our logs
    const iqResponse = await fetch(`${iqURL}&q=${encodeURIComponent(query)}`, { timeout: 5000 }) // add query to iqURL. 5s timeout so one hung call can't stall everyone waiting on this query
    if (!iqResponse.ok) {
      // something's wrong, locationIQ sent back an error status
      console.error('LocationIQ returned status:', iqResponse.status)
      return null
    }
    const data = normalizeLocation(await iqResponse.json(), 'locationIQ')
    iqCache.delete(query) // so the set below puts it at the back of the line
    iqCache.set(query, { data, fetchedAt: Date.now() }) // only successes get cached
    if (iqCache.size > iqMaxEntries) iqCache.delete(iqCache.keys().next().value) // over the cap: evict the least recently used
    return data
  } finally {
    iqInFlight.delete(query) // done either way; the next miss starts a new call
  }
}

// make a request to locationIQ's API based on a user query
app.get('/autocomplete', async (req, res) => {
  const q = req.query.q // our search query
  if (!q) return res.json([]) // so we don't waste an API call
  const query = q.toLowerCase().trim().replace(/\s+/g, ' ') // "Chapel  St " and "chapel st" share one cache entry

  const cached = iqCache.get(query)
  if (cached && Date.now() - cached.fetchedAt < (cached.data.length ? iqTTL : iqEmptyTTL)) {
    iqCache.delete(query) // move it to the back of the line so popular queries never get evicted
    iqCache.set(query, cached)
    return res.json(cached.data)
  }
  
  // the below block is for locationIQ

  try {
  if (!iqInFlight.has(query)) iqInFlight.set(query, fetchLocationIQ(query)) // start a call unless one's already running for this query
  const data = await iqInFlight.get(query)
  if (data) return res.json(data) // send locationIQ result
} catch (err) {
  // big boy error, probably network related. request never cocmpleted at all
  console.error('LocationIQ request failed:', scrubKey(err.message))
}

if (!nominatimEnabled) { // fallback is off by default so launch traffic can't get our IP banned by nominatim
  console.error('Nominatim fallback disabled, returning []')
  return res.json([])
}

// call nominatim, our fallback option
try {
      const nomResponse = await fetch(`${nomURL}&q=${encodeURIComponent(q)}`, 
      { headers: { 'User-Agent': `YaleShuttleTripPlanner/${version} (sadra.aliakbarpour@yale.edu)`} // we send a User-Agent header because nominatim's policy blocks us otherwise
    }) 
    if (!nomResponse.ok) { // ya we're probably cooked
      console.error('Nominatim returned status:', nomResponse.status)
      return res.json([])
    }
    const data = await nomResponse.json()
    return res.json(normalizeLocation(data, 'nominatim'))
} catch (err) {
  console.error('Nominatim request failed:', scrubKey(err.message))
  return res.json([])
}})

app.get('/buses', async (req, res) => {
  try {
    const data = await cachedFetch('buses', 'https://yale.downtownerapp.com/routes_buses.php', 5 * 1000) // cached 5s
    res.json(data)
  } catch (err) {
    console.error('Upstream fetch failed for buses:', scrubKey(err.message))
    res.status(502).json({ error: 'Upstream unavailable' })
  }
})

app.use((err, req, res, next) => { // express skips everything above this and calls this when a function calls next() with an argument (next(err))
  console.error('Unhandled error:', scrubKey(err.stack)) // server side only. also, hopefully scrubKey is redundant here since nothing uses a key other than autocomplete, but that could change
  res.status(500).json({ error: 'Internal server error' }) // generic verison
})


const PORT = process.env.PORT || 3001 // either our provider injects process.env.PORT or we default it to 3001 for local development

app.listen(PORT, () => console.log(`Proxy running on ${PORT}`))
// starts the server listening on port PORT. until this line runs, the server
// exists in memory but doesn't accept connections. 
// the console.log is just confirmation that it started in the terminal