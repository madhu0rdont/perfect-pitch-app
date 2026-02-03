import { useState, useCallback } from 'react'
import { audioEngine } from '../audio'
import NoteCircle from './NoteCircle'
import './GameScreen.css'

// Hardcoded active notes for now
const ACTIVE_NOTES = ['C4', 'G4']

/**
 * GameScreen — the main game view that displays NoteCircles.
 * Handles layout and audio playback when circles are tapped.
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

  // Determine layout class based on number of circles
  const layoutClass = ACTIVE_NOTES.length <= 3 ? 'single-row' : 'two-rows'

  return (
    <div className="game-screen">
      <div className="game-screen__header">
        <span className="game-screen__phase">Listen & Learn</span>
      </div>

      <div className={`game-screen__circles ${layoutClass}`}>
        {ACTIVE_NOTES.map((note) => (
          <NoteCircle
            key={note}
            note={note}
            onTap={handleNoteTap}
            state={playingNote === note ? 'playing' : 'idle'}
            disabled={false}
          />
        ))}
      </div>

      <div className="game-screen__footer">
        {/* Space reserved for future controls */}
      </div>
    </div>
  )
}

export default GameScreen
