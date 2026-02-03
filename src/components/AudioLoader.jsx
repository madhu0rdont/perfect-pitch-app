import { useState } from 'react'
import { audioEngine } from '../audio'
import './AudioLoader.css'

/**
 * AudioLoader handles the audio initialization flow required by mobile browsers.
 * Shows a tap-to-start prompt, initializes audio on user gesture, then renders children.
 */
function AudioLoader({ children }) {
  const [state, setState] = useState('idle') // 'idle' | 'loading' | 'ready'
  const [error, setError] = useState(null)

  const handleTap = async () => {
    if (state !== 'idle') return

    setState('loading')
    setError(null)

    try {
      await audioEngine.init()
      await audioEngine.loadInstrument('piano')
      setState('ready')
    } catch (err) {
      console.error('AudioLoader: Failed to initialize audio', err)
      setError('Failed to load audio. Tap to try again.')
      setState('idle')
    }
  }

  if (state === 'ready') {
    return children
  }

  return (
    <div className="audio-loader" onClick={handleTap} role="button" tabIndex={0}>
      {state === 'idle' && (
        <div className="audio-loader-content">
          <span className="audio-loader-emoji">🎵</span>
          <span className="audio-loader-text">Tap to Start</span>
          {error && <span className="audio-loader-error">{error}</span>}
        </div>
      )}

      {state === 'loading' && (
        <div className="audio-loader-content">
          <span className="audio-loader-emoji audio-loader-pulse">🎹</span>
          <span className="audio-loader-text audio-loader-pulse">Loading...</span>
        </div>
      )}
    </div>
  )
}

export default AudioLoader
