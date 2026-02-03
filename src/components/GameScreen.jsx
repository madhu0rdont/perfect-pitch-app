import { useState, useCallback } from 'react'
import { audioEngine } from '../audio'
import NoteCircle from './NoteCircle'
import { getLayoutConfig, getLayoutClassName } from '../utils/layoutHelper'
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

  // Get layout configuration based on number of circles
  const layoutConfig = getLayoutConfig(ACTIVE_NOTES.length)
  const layoutClass = getLayoutClassName(ACTIVE_NOTES.length)

  // CSS custom properties for dynamic sizing
  const layoutStyle = {
    '--circle-size': `${layoutConfig.circleSize}px`,
    '--circle-gap': `${layoutConfig.gap}px`,
  }

  return (
    <div className="game-screen">
      <div className="game-screen__header">
        <span className="game-screen__phase">Listen & Learn</span>
      </div>

      <div
        className={`game-screen__circles ${layoutClass}`}
        style={layoutStyle}
      >
        {layoutConfig.rows.map((rowIndices, rowIndex) => (
          <div key={rowIndex} className="game-screen__row">
            {rowIndices.map((noteIndex) => {
              const note = ACTIVE_NOTES[noteIndex]
              if (!note) return null
              return (
                <NoteCircle
                  key={note}
                  note={note}
                  onTap={handleNoteTap}
                  state={playingNote === note ? 'playing' : 'idle'}
                  disabled={false}
                />
              )
            })}
          </div>
        ))}
      </div>

      <div className="game-screen__footer">
        {/* Space reserved for future controls */}
      </div>
    </div>
  )
}

export default GameScreen
