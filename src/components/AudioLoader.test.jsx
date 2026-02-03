import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the audio module
vi.mock('../audio', () => ({
  audioEngine: {
    init: vi.fn().mockResolvedValue(undefined),
    loadInstrument: vi.fn().mockResolvedValue(undefined),
  },
}))

import AudioLoader from './AudioLoader'
import { audioEngine } from '../audio'

describe('AudioLoader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
    // Make loadInstrument take some time
    audioEngine.loadInstrument.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    )

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

  it('calls audioEngine.init and loadInstrument on tap', async () => {
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
      expect(audioEngine.loadInstrument).toHaveBeenCalledWith('piano')
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
    // Make loadInstrument return a promise that doesn't resolve immediately
    audioEngine.loadInstrument.mockImplementation(
      () => new Promise(() => {}) // Never resolves during test
    )

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
})
