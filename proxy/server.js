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
  const response = await fetch('https://yale.downtownerapp.com/routes_stops.php') // fetch and wait
  const data = await response.json() // wait for raw response, then parse it as JSON
  res.json(data) // send the data back
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
  const response = await fetch('https://yale.downtownerapp.com/routes_routes.php?inactive=true')
  const data = await response.json()
  res.json(data)
})

// fetch individual stop ETAs
// stop url looks like: https://yale.downtownerapp.com/routes_eta.php?stop=96
app.get('/eta/:stopId', async (req, res) => {
  const stopId = req.params.stopId // Express captures this from the URL's path
  if (!/^\d+$/.test(stopId)) return res.status(400).json({ error: 'Invalid stop id' }) //safeguard for non-integer stopid param
  const response = await fetch(`https://yale.downtownerapp.com/routes_eta.php?stop=${stopId}`) // we use route parameters since we don't want to hardcode a single stop w/ etas, nor load all the stops all the time.
  // note to self: backticks, not quotes!! 
  const data = await response.json()
  res.json(data)
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

// make a request to locationIQ's API based on a user query
app.get('/autocomplete', async (req, res) => {
  const q = req.query.q // our search query
  if (!q) return res.json([]) // so we don't waste an API call
  
  // the below block is for locationIQ

  try {
  const iqResponse = await fetch(`${iqURL}&q=${encodeURIComponent(q)}`) // add query to iqURL
  if(iqResponse.ok) {
    const data = await iqResponse.json()
    return res.json(normalizeLocation(data, 'locationIQ')) // send locationIQ result
  }
  // something's wrong, locationIQ sent back an error status
  console.error('LocationIQ returned status:', iqResponse.status)
} catch (err) {
  // big boy error, probably network related. request never cocmpleted at all
  console.error('LocationIQ request failed:', scrubKey(err.message))
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
  const response = await fetch('https://yale.downtownerapp.com/routes_buses.php')
  const data = await response.json()
  res.json(data)
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