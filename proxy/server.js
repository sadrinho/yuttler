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
app.get('/autocomplete/:searchQuery', async (req, res) => {
  const searchQuery = req.query.searchQuery 
  const response = await fetch(`https://api.locationiq.com/v1/autocomplete?key=${process.env.LOCATIONIQ_KEY}&q=${searchQuery}`)
  const data = await response.json()
  res.json(data)
// TODO: bound this to new haven using &viewbox=FILTERNAME
/*
viewbox
string
The preferred area to find search results. Any two corner points of the box - max_lon,max_lat,min_lon,min_lat or min_lon,min_lat,max_lon,max_lat - are accepted in any order as long as they span a real box. To restrict results to those within the viewbox, use along with the bounded option.

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