import { useState, useEffect, useCallback } from 'react'
import { audioEngine } from '../audio'
import './AudioLoader.css'

/**
 * AudioLoader handles the audio initialization flow required by mobile browsers.
 * Shows a tap-to-start prompt, initializes audio on user gesture, then renders children.
 */
function AudioLoader({ children }) {
  const [state, setState] = useState('idle') // 'idle' | 'loading' | 'ready'
  const [error, setError] = useState(null)
  const [loadingProgress, setLoadingProgress] = useState(null)

  // Poll loading progress during loading state
  useEffect(() => {
    if (state !== 'loading') return

    const interval = setInterval(() => {
      const progress = audioEngine.getLoadingProgress()
      setLoadingProgress(progress)
    }, 100)

    return () => clearInterval(interval)
  }, [state])

  const handleTap = async () => {
    if (state !== 'idle') return

    setState('loading')
    setError(null)

    try {
      await audioEngine.init()
      await audioEngine.loadAllInstruments()
      setState('ready')
    } catch (err) {
      console.error('AudioLoader: Failed to initialize audio', err)
      setError('Failed to load audio. Tap to try again.')
      setState('idle')
    }
  }

  // Get status icon for each instrument
  const getStatusIcon = useCallback((status) => {
    switch (status) {
      case 'ready':
        return '✓'
      case 'fallback':
        return '~' // Indicates fallback synth
      case 'loading':
        return '...'
      case 'error':
        return '✗'
      default:
        return ''
    }
  }, [])

  // Get display name for instrument
  const getDisplayName = useCallback((name) => {
    switch (name) {
      case 'piano':
        return 'Piano'
      case 'violin':
        return 'Violin'
      case 'guitar-acoustic':
        return 'Guitar'
      default:
        return name
    }
  }, [])

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
          {loadingProgress && (
            <div className="audio-loader-instruments">
              {Object.entries(loadingProgress.instruments).map(([name, status]) => (
                <span
                  key={name}
                  className={`audio-loader-instrument ${status === 'loading' ? 'loading' : ''}`}
                >
                  {getDisplayName(name)} {getStatusIcon(status)}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default AudioLoader
