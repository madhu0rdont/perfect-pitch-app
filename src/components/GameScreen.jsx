import { useState, useCallback } from 'react'
import { audioEngine } from '../audio'
import NoteCircle from './NoteCircle'
import { NOTE_CONFIGS, getCircleAngle } from '../constants/notes'
import './GameScreen.css'

// Hardcoded active notes for now
const ACTIVE_NOTES = ['C4', 'G4']

/**
 * Calculate circle size based on number of active notes.
 * Fewer notes = larger circles.
 */
function getCircleSize(count) {
  if (count <= 2) return 120
  if (count <= 4) return 100
  if (count <= 6) return 85
  return 70
}

/**
 * GameScreen — the main game view that displays NoteCircles
 * arranged in a Circle of Fifths layout.
 */
function GameScreen() {
  const [playingNote, setPlayingNote] = useState(null)

  const handleNoteTap = useCallback(async (note) => {
    // Set circle to playing state
    setPlayingNote(note)

    // Play the note
    await audioEngine.playNote(note, 'piano')

    // Return to idle after 400ms
    setTimeout(() => {
      setPlayingNote(null)
    }, 400)
  }, [])

  const circleSize = getCircleSize(ACTIVE_NOTES.length)

  // Calculate radius based on circle size and viewport
  // Radius should be large enough to fit circles with spacing
  const radius = Math.max(120, circleSize * 1.8)

  return (
    <div className="game-screen">
      <div className="game-screen__header">
        <span className="game-screen__phase">Listen & Learn</span>
      </div>

      <div className="game-screen__circle-container">
        <div
          className="game-screen__circle-of-fifths"
          style={{
            '--circle-size': `${circleSize}px`,
            '--circle-radius': `${radius}px`,
          }}
        >
          {ACTIVE_NOTES.map((note) => {
            const angle = getCircleAngle(note)
            const config = NOTE_CONFIGS[note]

            return (
              <div
                key={note}
                className="game-screen__note-position"
                style={{
                  '--angle': `${angle}deg`,
                }}
              >
                <NoteCircle
                  note={note}
                  onTap={handleNoteTap}
                  state={playingNote === note ? 'playing' : 'idle'}
                  disabled={false}
                />
              </div>
            )
          })}
        </div>
      </div>

      <div className="game-screen__footer">
        {/* Space reserved for future controls */}
      </div>
    </div>
  )
}

export default GameScreen
