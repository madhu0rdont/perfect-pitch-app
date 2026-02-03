import { useState, useEffect } from 'react'
import { audioEngine } from '../audio'
import { NOTE_CONFIGS } from '../constants/notes'
import './AudioTestScreen.css'

const TEST_NOTES = ['C4', 'E4', 'G4']

const INSTRUMENT_LABELS = {
  piano: 'Piano',
  xylophone: 'Xylophone',
  'guitar-acoustic': 'Guitar',
}

/**
 * Temporary test screen to verify audio playback works correctly.
 * Will be replaced with the real game screen in Step 2.
 */
function AudioTestScreen() {
  const [lastNotePlayed, setLastNotePlayed] = useState(null)
  const [activeNote, setActiveNote] = useState(null)
  const [selectedInstrument, setSelectedInstrument] = useState('piano')
  const [loadedInstruments, setLoadedInstruments] = useState(['piano'])

  // Load additional instruments on mount
  useEffect(() => {
    const loadInstruments = async () => {
      await audioEngine.loadInstrument('xylophone')
      await audioEngine.loadInstrument('guitar-acoustic')
      setLoadedInstruments(audioEngine.getLoadingStatus().loaded)
    }
    loadInstruments()
  }, [])

  const handleNoteTap = async (noteName) => {
    setActiveNote(noteName)
    setLastNotePlayed(noteName)

    await audioEngine.playNote(noteName, selectedInstrument)

    // Reset active state after animation completes
    setTimeout(() => {
      setActiveNote(null)
    }, 200)
  }

  const handleInstrumentSelect = (instrumentName) => {
    setSelectedInstrument(instrumentName)
  }

  const loadingStatus = audioEngine.getLoadingStatus()
  const availableInstruments = audioEngine.getAvailableInstruments()

  return (
    <div className="audio-test-screen">
      <h1 className="audio-test-title">Audio Test</h1>

      <div className="instrument-selector">
        {availableInstruments.map((instrumentName) => {
          const isSelected = selectedInstrument === instrumentName
          const isLoaded = loadedInstruments.includes(instrumentName)

          return (
            <button
              key={instrumentName}
              className={`instrument-button ${isSelected ? 'instrument-button-selected' : ''} ${!isLoaded ? 'instrument-button-loading' : ''}`}
              onClick={() => handleInstrumentSelect(instrumentName)}
              disabled={!isLoaded}
              aria-pressed={isSelected}
            >
              {INSTRUMENT_LABELS[instrumentName]}
              {!isLoaded && ' ...'}
            </button>
          )
        })}
      </div>

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
          <span className="status-label">Instrument:</span>
          <span className="status-value">
            {INSTRUMENT_LABELS[selectedInstrument]}
          </span>
        </div>
        <div className="status-item">
          <span className="status-label">Loaded:</span>
          <span className="status-value">
            {loadingStatus.loaded.map((i) => INSTRUMENT_LABELS[i]).join(', ') || 'None'}
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
