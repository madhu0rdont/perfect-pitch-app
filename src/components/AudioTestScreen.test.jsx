import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the audio module
vi.mock('../audio', () => ({
  audioEngine: {
    playNote: vi.fn().mockResolvedValue(undefined),
    isInitialized: vi.fn().mockReturnValue(true),
    getLoadingStatus: vi.fn().mockReturnValue({
      loaded: ['piano', 'xylophone', 'guitar-acoustic'],
      loading: [],
    }),
    getAvailableInstruments: vi.fn().mockReturnValue([
      'piano',
      'xylophone',
      'guitar-acoustic',
    ]),
    loadInstrument: vi.fn().mockResolvedValue(undefined),
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
    const circles = screen.getAllByLabelText(/Play [CEG]/)
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

  it('shows not started when audio context is not initialized', () => {
    audioEngine.isInitialized.mockReturnValue(false)

    render(<AudioTestScreen />)

    expect(screen.getByText('Not Started')).toBeInTheDocument()
  })

  describe('instrument selector', () => {
    it('renders instrument buttons', async () => {
      render(<AudioTestScreen />)

      await waitFor(() => {
        const buttons = screen.getAllByRole('button')
        // 3 instrument buttons + 3 note circles
        expect(buttons.length).toBeGreaterThanOrEqual(6)
      })
    })

    it('has piano selected by default', async () => {
      render(<AudioTestScreen />)

      await waitFor(() => {
        const pianoButton = screen.getByRole('button', { name: 'Piano' })
        expect(pianoButton).toHaveAttribute('aria-pressed', 'true')
      })
    })

    it('changes selected instrument when button is clicked', async () => {
      render(<AudioTestScreen />)

      await waitFor(() => {
        const xyloButton = screen.getByRole('button', { name: 'Xylophone' })
        fireEvent.click(xyloButton)
        expect(xyloButton).toHaveAttribute('aria-pressed', 'true')
      })
    })

    it('plays note on selected instrument', async () => {
      render(<AudioTestScreen />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Xylophone' })).toBeInTheDocument()
      })

      // Select xylophone
      const xyloButton = screen.getByRole('button', { name: 'Xylophone' })
      fireEvent.click(xyloButton)

      // Play a note
      const cCircle = screen.getByLabelText('Play C')
      fireEvent.click(cCircle)

      await waitFor(() => {
        expect(audioEngine.playNote).toHaveBeenCalledWith('C4', 'xylophone')
      })
    })

    it('plays note on guitar when selected', async () => {
      render(<AudioTestScreen />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Guitar' })).toBeInTheDocument()
      })

      // Select guitar
      const guitarButton = screen.getByRole('button', { name: 'Guitar' })
      fireEvent.click(guitarButton)

      // Play a note
      const eCircle = screen.getByLabelText('Play E')
      fireEvent.click(eCircle)

      await waitFor(() => {
        expect(audioEngine.playNote).toHaveBeenCalledWith('E4', 'guitar-acoustic')
      })
    })

    it('displays currently selected instrument in status', async () => {
      render(<AudioTestScreen />)

      await waitFor(() => {
        expect(screen.getByText('Instrument:')).toBeInTheDocument()
      })
    })

    it('shows loading state for instruments not yet loaded', () => {
      audioEngine.getLoadingStatus.mockReturnValue({
        loaded: ['piano'],
        loading: ['xylophone'],
      })

      render(<AudioTestScreen />)

      const xyloButton = screen.getByRole('button', { name: /Xylophone/ })
      expect(xyloButton).toBeDisabled()
    })
  })

  describe('loads additional instruments on mount', () => {
    it('calls loadInstrument for xylophone and guitar', async () => {
      render(<AudioTestScreen />)

      await waitFor(() => {
        expect(audioEngine.loadInstrument).toHaveBeenCalledWith('xylophone')
        expect(audioEngine.loadInstrument).toHaveBeenCalledWith('guitar-acoustic')
      })
    })
  })
})
