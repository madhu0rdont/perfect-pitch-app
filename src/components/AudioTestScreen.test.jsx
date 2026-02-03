import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the audio module
vi.mock('../audio', () => ({
  audioEngine: {
    playNote: vi.fn().mockResolvedValue(undefined),
    isInitialized: vi.fn().mockReturnValue(true),
    getLoadingStatus: vi.fn().mockReturnValue({
      loaded: ['piano'],
      loading: [],
    }),
  },
}))

import AudioTestScreen from './AudioTestScreen'
import { audioEngine } from '../audio'

describe('AudioTestScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the correct number of note circles', () => {
    render(<AudioTestScreen />)

    // Should render 3 circles for C4, E4, G4
    const circles = screen.getAllByRole('button')
    expect(circles).toHaveLength(3)
  })

  it('renders circles with correct note labels', () => {
    render(<AudioTestScreen />)

    expect(screen.getByLabelText('Play C')).toBeInTheDocument()
    expect(screen.getByLabelText('Play E')).toBeInTheDocument()
    expect(screen.getByLabelText('Play G')).toBeInTheDocument()
  })

  it('displays note labels on circles', () => {
    render(<AudioTestScreen />)

    expect(screen.getByText('C')).toBeInTheDocument()
    expect(screen.getByText('E')).toBeInTheDocument()
    expect(screen.getByText('G')).toBeInTheDocument()
  })

  it('calls audioEngine.playNote with correct arguments when circle is tapped', async () => {
    render(<AudioTestScreen />)

    const cCircle = screen.getByLabelText('Play C')
    fireEvent.click(cCircle)

    await waitFor(() => {
      expect(audioEngine.playNote).toHaveBeenCalledWith('C4', 'piano')
    })
  })

  it('calls playNote with different notes for different circles', async () => {
    render(<AudioTestScreen />)

    const eCircle = screen.getByLabelText('Play E')
    fireEvent.click(eCircle)

    await waitFor(() => {
      expect(audioEngine.playNote).toHaveBeenCalledWith('E4', 'piano')
    })

    const gCircle = screen.getByLabelText('Play G')
    fireEvent.click(gCircle)

    await waitFor(() => {
      expect(audioEngine.playNote).toHaveBeenCalledWith('G4', 'piano')
    })
  })

  it('displays the last note played', async () => {
    render(<AudioTestScreen />)

    // Initially shows "None"
    expect(screen.getByText('None')).toBeInTheDocument()

    const cCircle = screen.getByLabelText('Play C')
    fireEvent.click(cCircle)

    await waitFor(() => {
      expect(screen.getByText('C4')).toBeInTheDocument()
    })
  })

  it('displays audio context status', () => {
    render(<AudioTestScreen />)

    expect(screen.getByText('Audio Context:')).toBeInTheDocument()
    expect(screen.getByText('Running')).toBeInTheDocument()
  })

  it('displays piano loaded status', () => {
    render(<AudioTestScreen />)

    expect(screen.getByText('Piano:')).toBeInTheDocument()
    expect(screen.getByText('Loaded')).toBeInTheDocument()
  })

  it('shows not loaded when piano is not in loaded list', () => {
    audioEngine.getLoadingStatus.mockReturnValue({
      loaded: [],
      loading: ['piano'],
    })

    render(<AudioTestScreen />)

    expect(screen.getByText('Not Loaded')).toBeInTheDocument()
  })

  it('shows not started when audio context is not initialized', () => {
    audioEngine.isInitialized.mockReturnValue(false)

    render(<AudioTestScreen />)

    expect(screen.getByText('Not Started')).toBeInTheDocument()
  })
})
