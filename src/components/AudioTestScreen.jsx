import { useState } from 'react'
import { audioEngine } from '../audio'
import { NOTE_CONFIGS } from '../constants/notes'
import './AudioTestScreen.css'

const TEST_NOTES = ['C4', 'E4', 'G4']

/**
 * Temporary test screen to verify audio playback works correctly.
 * Will be replaced with the real game screen in Step 2.
 */
function AudioTestScreen() {
  const [lastNotePlayed, setLastNotePlayed] = useState(null)
  const [activeNote, setActiveNote] = useState(null)

  const handleNoteTap = async (noteName) => {
    setActiveNote(noteName)
    setLastNotePlayed(noteName)

    await audioEngine.playNote(noteName, 'piano')

    // Reset active state after animation completes
    setTimeout(() => {
      setActiveNote(null)
    }, 200)
  }

  const loadingStatus = audioEngine.getLoadingStatus()
  const isPianoLoaded = loadingStatus.loaded.includes('piano')

  return (
    <div className="audio-test-screen">
      <h1 className="audio-test-title">Audio Test</h1>

      <div className="note-circles">
        {TEST_NOTES.map((noteName) => {
          const config = NOTE_CONFIGS[noteName]
          const isActive = activeNote === noteName

          return (
            <button
              key={noteName}
              className={`note-circle ${isActive ? 'note-circle-active' : ''}`}
              style={{ backgroundColor: config.color }}
              onClick={() => handleNoteTap(noteName)}
              aria-label={`Play ${config.label}`}
            >
              <span className="note-label">{config.label}</span>
            </button>
          )
        })}
      </div>

      <div className="status-display">
        <div className="status-item">
          <span className="status-label">Audio Context:</span>
          <span className="status-value">
            {audioEngine.isInitialized() ? 'Running' : 'Not Started'}
          </span>
        </div>
        <div className="status-item">
          <span className="status-label">Piano:</span>
          <span className="status-value">
            {isPianoLoaded ? 'Loaded' : 'Not Loaded'}
          </span>
        </div>
        <div className="status-item">
          <span className="status-label">Last Note:</span>
          <span className="status-value">
            {lastNotePlayed || 'None'}
          </span>
        </div>
      </div>
    </div>
  )
}

export default AudioTestScreen
