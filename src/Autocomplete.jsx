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

  useEffect(() => {
    if (input.length === 0) { 
    // if we didn't check manually, old suggestions linger on screen after the user deletes their input
      setSuggestions([])
      return
    }

    // always search landmarks instantly
    const normalized = input.toLowerCase().trim()
    setSuggestions(findPlaceMatches(normalized, YALE_PLACES)) // normalized is redundant here but its fine

    // debounced requests to make sure we don't blow through our request limits 
    clearTimeout(debounceTimer.current) // cancel the previous timer
    debounceTimer.current = setTimeout(async () => { // store timer ID
    // set the current value of the debounce timer to the following async function

    if (normalized.length < 3) return  // probably an abbreviation, fallback on landmark table. TODO: bug test
    
    // request a call to either locationIQ or nominatim to geocode our input
    fetch(`${import.meta.env.VITE_PROXY_URL}/autocomplete?q=${encodeURIComponent(input)}`)
      .then(r => r.json()) // array of location results {name, lat, lon}
      .then(results => setSuggestions(prev => [
        ...prev, // loads what was already existing in setSuggestions for this render cycle; this is always the keystroke's landmark matches
        ...results.filter(result => !prev.some(place => place.name === result.name)) // only if no match in previous
      ])
    )

    }, 500) // 500 is the debounce timer in ms

  }, [input]) // update this on change to input

  function handleSelect(suggestion) { // called on mouse down
    setInput(suggestion.name) // set our user input to the suggestion
    setSuggestions([]) // clear suggestions
    setShow(false) // hide suggestions
    onSelect(suggestion) // prop passed down from parent, just like onSearch
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
      />
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
              key={s.name} // stable enough to use as a key
              onMouseDown={() => handleSelect(s)} 
              // Q: why do we use onMouseDown and not onClick?
              // A: if we use onClick, onBlur fires because we lost focus, closes the dropdown, onClick then fires, but our dropdown is gone.
              style={{ padding: '8px', cursor: 'pointer' }}
            >
              {s.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default Autocomplete