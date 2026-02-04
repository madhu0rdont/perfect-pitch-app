import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock the audio module
vi.mock('../audio', () => ({
  audioEngine: {
    init: vi.fn().mockResolvedValue(undefined),
    loadAllInstruments: vi.fn().mockResolvedValue(undefined),
    getLoadingProgress: vi.fn().mockReturnValue({
      loaded: 0,
      total: 3,
      instruments: {
        piano: 'pending',
        violin: 'pending',
        'guitar-acoustic': 'pending',
      },
    }),
  },
}))

import AudioLoader from './AudioLoader'
import { audioEngine } from '../audio'

describe('AudioLoader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset to default resolved value
    audioEngine.init.mockResolvedValue(undefined)
    audioEngine.loadAllInstruments.mockResolvedValue(undefined)
  })

  it('renders tap to start state initially', () => {
    render(
      <AudioLoader>
        <div>Game Content</div>
      </AudioLoader>
    )

    expect(screen.getByText('Tap to Start')).toBeInTheDocument()
    expect(screen.getByText('🎵')).toBeInTheDocument()
    expect(screen.queryByText('Game Content')).not.toBeInTheDocument()
  })

  it('shows loading state when tapped', async () => {
    // Make loadAllInstruments hang
    audioEngine.loadAllInstruments.mockReturnValue(new Promise(() => {}))

    render(
      <AudioLoader>
        <div>Game Content</div>
      </AudioLoader>
    )

    const loader = screen.getByRole('button')
    fireEvent.click(loader)

    expect(screen.getByText('Loading...')).toBeInTheDocument()
    expect(screen.getByText('🎹')).toBeInTheDocument()
  })

  it('calls audioEngine.init and loadAllInstruments on tap', async () => {
    render(
      <AudioLoader>
        <div>Game Content</div>
      </AudioLoader>
    )

    const loader = screen.getByRole('button')
    fireEvent.click(loader)

    await waitFor(() => {
      expect(audioEngine.init).toHaveBeenCalledTimes(1)
    })

    await waitFor(() => {
      expect(audioEngine.loadAllInstruments).toHaveBeenCalledTimes(1)
    })
  })

  it('renders children after initialization completes', async () => {
    render(
      <AudioLoader>
        <div>Game Content</div>
      </AudioLoader>
    )

    const loader = screen.getByRole('button')
    fireEvent.click(loader)

    await waitFor(() => {
      expect(screen.getByText('Game Content')).toBeInTheDocument()
    })

    expect(screen.queryByText('Tap to Start')).not.toBeInTheDocument()
  })

  it('shows error and returns to idle state on failure', async () => {
    audioEngine.init.mockRejectedValueOnce(new Error('Audio failed'))

    render(
      <AudioLoader>
        <div>Game Content</div>
      </AudioLoader>
    )

    const loader = screen.getByRole('button')
    fireEvent.click(loader)

    await waitFor(() => {
      expect(screen.getByText(/Failed to load audio/)).toBeInTheDocument()
    })

    // Should show tap to start again
    expect(screen.getByText('Tap to Start')).toBeInTheDocument()
  })

  it('ignores taps while loading', async () => {
    // Make loadAllInstruments hang
    audioEngine.loadAllInstruments.mockReturnValue(new Promise(() => {}))

    render(
      <AudioLoader>
        <div>Game Content</div>
      </AudioLoader>
    )

    const loader = screen.getByRole('button')

    // First tap starts loading
    fireEvent.click(loader)
    expect(audioEngine.init).toHaveBeenCalledTimes(1)

    // Additional taps should be ignored
    fireEvent.click(loader)
    fireEvent.click(loader)
    expect(audioEngine.init).toHaveBeenCalledTimes(1)
  })

  it('shows instrument loading progress', async () => {
    vi.useFakeTimers()

    // Make loadAllInstruments hang
    audioEngine.loadAllInstruments.mockReturnValue(new Promise(() => {}))
    audioEngine.getLoadingProgress.mockReturnValue({
      loaded: 1,
      total: 3,
      instruments: {
        piano: 'ready',
        violin: 'loading',
        'guitar-acoustic': 'pending',
      },
    })

    render(
      <AudioLoader>
        <div>Game Content</div>
      </AudioLoader>
    )

    const loader = screen.getByRole('button')
    fireEvent.click(loader)

    // Advance timer to trigger the progress polling
    await act(async () => {
      vi.advanceTimersByTime(100)
    })

    expect(screen.getByText(/Piano/)).toBeInTheDocument()
    expect(screen.getByText(/Violin/)).toBeInTheDocument()
    expect(screen.getByText(/Guitar/)).toBeInTheDocument()

    vi.useRealTimers()
  })
})
