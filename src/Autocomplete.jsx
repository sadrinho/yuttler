import { useState, useEffect, useRef } from 'react'
import { YALE_PLACES, findPlaceMatches } from './tripPlanner'

function Autocomplete({ placeholder, onSelect }) {
  // dropdown autocomplete for user inputs in the start/end fields
  
  // placeholder is just the greyed out text we use before we start typing
  const [input, setInput] = useState('')
  const [suggestions, setSuggestions] = useState([]) 
  const [show, setShow] = useState(false)
  const debounceTimer = useRef(null) 
  // useRef stores a value that persists between renders but doesn't trigger a re-render when changed
  // the timer ID needs to survive between keystrokes, but we don't need to re-render the component when we change it
  // useRef is perfect for "i need to remember x, but it's not UI data"
  const justSelected = useRef(false) // so we don't burn an api call when updating input when the user makes a selection
  const [geocodedQuery, setGeocodedQuery] = useState(null) // last normalized query sent to locationIQ, so the search row hides once it's been used

  function geocode(query) { // asks the proxy for places matching query and appends them under the landmark matches
    setGeocodedQuery(query.toLowerCase().trim())

    // request a call to either locationIQ or nominatim to geocode our input
    fetch(`${import.meta.env.VITE_PROXY_URL}/autocomplete?q=${encodeURIComponent(query)}`)
      .then(r => r.json()) // array of location results {name, lat, lon}
      .then(results => {
        if (!Array.isArray(results)) return // e.g. { error } from the proxy's error handler; results.filter would crash, so keep the landmark matches
        setSuggestions(prev => [
        ...prev, // loads what was already existing in setSuggestions for this render cycle; this is always the keystroke's landmark matches
        ...results.filter(result => !prev.some(place => place.name === result.name)) // only if no match in previous
      ])
      })
      .catch(err => console.error('Autocomplete fetch failed:', err)) // network failure or non-JSON body
  }

  useEffect(() => {
    if (justSelected.current) { // if the user made a selection, we don't want to run the rest of this useEffect bc it'd waste a call
      justSelected.current = false
      return
    }

    if (input.length === 0) { 
    // if we didn't check manually, old suggestions linger on screen after the user deletes their input
      setSuggestions([])
      return
    }

    // always search landmarks instantly
    const normalized = input.toLowerCase().trim()
    const landmarkMatches = findPlaceMatches(normalized, YALE_PLACES) // normalized is redundant here but its fine
    setSuggestions(landmarkMatches)

    // debounced requests to make sure we don't blow through our request limits
    clearTimeout(debounceTimer.current) // cancel the previous timer
    if (landmarkMatches.length > 0) return // landmarks answered it; the user can still tap the search row to ask locationIQ
    debounceTimer.current = setTimeout(() => { // store timer ID
    // set the current value of the debounce timer to the following async function

    if (normalized.length < 3) return  // probably an abbreviation, fallback on landmark table. TODO: bug test

    geocode(input)

    }, 700) // 700 is the debounce timer in ms

  }, [input]) // update this on change to input

  function handleSelect(suggestion) { // called on mouse down
    justSelected.current = true;
    setInput(suggestion.name) // set our user input to the suggestion
    setShow(false) // hide suggestions
    onSelect(suggestion) // prop passed down from parent, just like onSearch
  }

  const normalizedInput = input.toLowerCase().trim()
  // show the search row when landmarks matched (auto-search skipped) and we haven't already searched this exact text
  const showSearchRow = normalizedInput.length >= 3 && suggestions.length > 0 && geocodedQuery !== normalizedInput
                  

  function handleUseLocation() { // gets the user's location and updates input accordingly
    if (!navigator.geolocation) return  // either no location permissions 

    navigator.geolocation.getCurrentPosition( // .getCurrentPosition(success, error) and each is treated like a callback
      (success) => { // on success, pass down a location object
        const location = {
          name: 'Current location',
          lat: success.coords.latitude, // 41.3147338, (hardcoded bf coords for tesitng)
          lon: success.coords.longitude // -72.9250155 
        }
        handleSelect(location)
      },
      (error) => { // on error,log in console
        // error.code: 1 = denied, 2 = unavailable, 3 = timeout
        console.log(error.code)
      },
      ({ // an options object so we can specify that,
        timeout: 10000 // 10s is the max amount of time we wait before calling our error callback
      })
    )
  }

  return (
    // not sure what position relative means
    // A: basically our anchor point for our later absolute position of the dropdown so it actually overlaps something
    <div style={{ position: 'relative' }}> 
      <input 
        placeholder={placeholder}
        value={input}
        onChange={e => { //updates shown text on input
          setInput(e.target.value) 
          setShow(true)
        }}
        onFocus={() => setShow(true)} // on focus of the bar, show suggestions
        onBlur={() => setTimeout(() => setShow(false), 150)}
        // 150ms timeout to help protect against the element disappearing when we need it (i.e. in the case of selecting smth)
        onKeyDown={e => { if (e.key === 'Enter' && showSearchRow) geocode(input) }} // enter does the same as tapping the search row
      />
      <button type="button" onClick={handleUseLocation}>📍</button>
      {show && suggestions.length > 0 && ( 
        // Q: not sure why we do the second &&
        // A: two separate conditions: show = user is focused, suggestions.length > 0 = theres something to show
        <ul style={{
          position: 'absolute',
          background: 'white',
          border: '1px solid #ccc',
          listStyle: 'none',
          margin: 0,
          padding: 0,
          width: '100%',
          zIndex: 1000
        }}>
          {suggestions.map(s => ( 
            <li //TODO: fix bug. stale fetch response can append to results when no longer helpful, "async race condition"
              key={`[${suggestions.indexOf(s)}]-${s.name}-${s.lat}`} // should be 100% unique
              onMouseDown={() => handleSelect(s)} 
              // Q: why do we use onMouseDown and not onClick?
              // A: if we use onClick, onBlur fires because we lost focus, closes the dropdown, onClick then fires, but our dropdown is gone.
              style={{ padding: '8px', cursor: 'pointer' }}
            >
              {s.name}
            </li>
          ))}
          {showSearchRow && (
            <li // not part of suggestions, so it can never be selected as a place
              key="search-row"
              onMouseDown={e => { e.preventDefault(); geocode(input) }} // preventDefault keeps focus in the input so the dropdown stays open for the results
              style={{ padding: '8px', cursor: 'pointer', borderTop: '1px solid #eee', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} // long queries get cut off with ... instead of wrapping on mobile
            >
              🔍 Search "{input.trim()}"
            </li>
          )}
        </ul>
      )}
    </div>
  )
}

export default Autocomplete