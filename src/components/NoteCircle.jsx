import { useState, useEffect, useRef } from 'react'
import { NOTE_CONFIGS } from '../constants/notes'
import './NoteCircle.css'

/**
 * NoteCircle — the primary UI element of the app.
 * A large, tappable colored circle that represents a single note.
 *
 * @param {Object} props
 * @param {string} props.note - The note name (e.g. 'C4')
 * @param {Function} props.onTap - Callback when tapped
 * @param {'idle'|'playing'|'correct'|'incorrect'|'dimmed'|'hidden'|'hint'} props.state - Visual state
 * @param {boolean} props.disabled - Whether the circle is tappable
 */
function NoteCircle({ note, onTap, state = 'idle', disabled = false }) {
  const [internalState, setInternalState] = useState(state)
  const touchHandled = useRef(false)
  const config = NOTE_CONFIGS[note]

  // Sync internal state with prop, but allow temporary overrides for animations
  useEffect(() => {
    setInternalState(state)
  }, [state])

  // Handle correct state animation (return to idle after 600ms)
  useEffect(() => {
    if (state === 'correct') {
      const timer = setTimeout(() => {
        setInternalState('idle')
      }, 600)
      return () => clearTimeout(timer)
    }
  }, [state])

  // Handle incorrect state animation (return to idle after 500ms)
  useEffect(() => {
    if (state === 'incorrect') {
      const timer = setTimeout(() => {
        setInternalState('idle')
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [state])

  const handleTap = () => {
    if (disabled || state === 'hidden') return
    onTap?.(note)
  }

  const handleTouchStart = (e) => {
    // Prevent double-firing on touch devices
    touchHandled.current = true
    handleTap()
  }

  const handleClick = (e) => {
    // Only fire click if touch didn't already handle it
    if (touchHandled.current) {
      touchHandled.current = false
      return
    }
    handleTap()
  }

  // Extract just the note letter (no octave or sharp symbol)
  const noteLabel = config?.label?.charAt(0) || note.charAt(0)

  const className = [
    'note-circle',
    `note-circle--${internalState}`,
    disabled ? 'note-circle--disabled' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      className={className}
      style={{ '--note-color': config?.color || '#888' }}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      disabled={disabled || state === 'hidden'}
      aria-label={`Play ${config?.label || note}`}
      data-state={internalState}
    >
      <span className="note-circle__label">{noteLabel}</span>
    </button>
  )
}

export default NoteCircle
