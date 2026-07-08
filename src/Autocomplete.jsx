import { useState, useEffect, useRef } from 'react'
import { YALE_LANDMARKS, geocode } from './tripPlanner'

function Autocomplete({ placeholder, onSelect }) {
  // dropdown autocomplete for user inputs in the start/end fields
  
  // im assuming placeholder is just the greyed out text we use before we start typing
  const [input, setInput] = useState('')
  const [suggestions, setSuggestions] = useState([]) 
  const [show, setShow] = useState(false)
  const debounceTimer = useRef(null) 
  // useRef stores a value that persists between renders but doesn't trigger a re-render when changed
  // the timer ID needs to survive between keystrokes, but we don't need to re-render the component when we change it
  // useRef is perfect for "i need to remember x, but it's not UI data"

  useEffect(() => {
    if (input.length === 0) { 
    // Q: not sure why this is needed; if no input we clear suggestions manually? cant nominatim do that on its own
    // A: if we didn't clear manually, old suggestions linger on screen after the user deletes their input
      setSuggestions([])
      return
    }

    // always search landmarks instantly
    const normalized = input.toLowerCase().trim()
    const landmarkMatches = Object.keys(YALE_LANDMARKS) // Object.keys gives us an array of the keys
      .filter(name => name.startsWith(normalized)) //includes only the locations which match the normalized input
      .map(name => ({ name, source: 'landmark' })) 
      // Q: what is name? does this just create fields name and source in the landmarkMatches object?
      // A: yes, creates a new object for each match w/ fields name and source

    setSuggestions(landmarkMatches) 

    // debounce nominatim
    clearTimeout(debounceTimer.current) // cancel previous timer
    debounceTimer.current = setTimeout(async () => { // store timer ID
    // Q: the first part of this line, im assuming, is saying "set the current value of the debounce timer to," and the second part is saying "and use this async function as the param to setTimeout"
    // A: pretty much
      if (normalized.length < 4) return  
      const coords = await geocode(input) // pull the coordinates
      if (coords && !YALE_LANDMARKS[normalized]) {  
        // Q: if the coordinates exist and yale landmarks normalized isn't... is that shorthand?
        // A: two conditions: coords = nominatim found something, !YALE_LANDMARKS[normalized] = not in landmarks table
        setSuggestions(prev => [ 
            // Q: set the suggestions to the previous (which is blank if this is the first) plus the following fields(?)
            // A: when we need the current value of state to compute the next value, we pass a function instead of a value directly. we guarantee that prev is the actual current state and not a stale snapshot.
                // always use function form when new state depends on old state
          ...prev,
          { name: input, source: 'nominatim', coords }
        ])
      }
    }, 300) // 300 is the debounce timer in ms

  }, [input]) // update this on change to input

  function handleSelect(suggestion) { 
    // Q: im assuming this is if we select a suggestion?
    // A: pretty much
    setInput(suggestion.name) // set our user input to the suggestion
    setSuggestions([]) // clear suggestions
    setShow(false) // dont show suggestions
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
          {suggestions.map((s, i) => ( 
            <li
              key={i}
              onMouseDown={() => handleSelect(s)} 
              // Q: why do we use onMouseDown and not onClick?
              // A: if we use oCnClick, onBlur fires, closes dropdown, onClick then fires, but its gone.
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