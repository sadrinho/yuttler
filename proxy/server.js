require('dotenv').config() // reads .env file

const express = require('express')
const cors = require('cors')
const fetch = require('node-fetch')

// import statements in node are "require()"
// edit: actualy this is outdated but we just downgraded the version of node-fetch we use to work with this

const app = express() // creates a server instance
app.use(cors()) // tells that server instance to attach CORS headers 
                // so we can actually send + receive the data we need



// note: .get requests are done in order, top to bottom, by matching; can be important if using some sort of wildcard operator

function normalizeLocation(location, source) { // given a list of raw location objects from a locationIQ or nominatim call (determined by source), return an array of objects {name; lat; lon}
  return location.map(locObj => ({ 
    name: source === 'locationIQ' // locationIQ and nominatim return different name formats
      ? locObj.display_place
      : locObj.display_name.split(',')[0], // simple split grabbing first word for now; could be inaccurate. TODO: brainstorm improvement
    lat: parseFloat(locObj.lat),
    lon: parseFloat(locObj.lon)
  }))
}


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
  const response = await fetch(`https://yale.downtownerapp.com/routes_eta.php?stop=${stopId}`) // we use route parameters since we don't want to hardcode a single stop w/ etas, nor load all the stops all the time.
  // note to self: backticks, not quotes!! 
  const data = await response.json()
  res.json(data)
})

// make a request to locationIQ's API based on a user query
app.get('/autocomplete', async (req, res) => {
  const q = req.query.q // our search query
  const iqResponse = await fetch(`https://api.locationiq.com/v1/autocomplete?key=${process.env.LOCATIONIQ_KEY}&q=${encodeURIComponent(q)}&viewbox=-72.8084514641751%2C41.41930017433788%2C-73.02641547890617%2C41.22302882412524&bounded=1&normalizeaddress=1`)
  
  if(!iqResponse.ok) { // if locationIQ's http status code flags an issue 
    // call nominatim
  const nomResponse = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&viewbox=-72.8084514641751,41.41930017433788,-73.02641547890617,41.22302882412524&bounded=1`) // note: format of viewbox coord pairs differs with locationIQ  
  const data = await nomResponse.json()  
  res.json(normalizeLocation(data, 'nominatim')) // clean nomimatim output according to normalizeLocation specs before sending it
  } 
  else { //else, we send locationiq's (hopefully) valid result
    const data = await iqResponse.json()
    res.json(normalizeLocation(data, 'locationIQ'))
  }
  


// encodeURIComponent to ensure we safely read text with special characters (like spaces)
/* query param breakdown:
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

})

app.get('/buses', async (req, res) => {
  const response = await fetch('https://yale.downtownerapp.com/routes_buses.php')
  const data = await response.json()
  res.json(data)
})




app.listen(3001, () => console.log('Proxy running on http://localhost:3001'))
// starts the server listening on port 3001. until this line runs, the server
// exists in memory but doesn't accept connections. 
// the console.log is just confirmation that it started in the terminal