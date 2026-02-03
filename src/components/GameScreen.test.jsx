import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the audio module
vi.mock('../audio', () => ({
  audioEngine: {
    playNote: vi.fn().mockResolvedValue(undefined),
    isInitialized: vi.fn().mockReturnValue(true),
  },
}))

import GameScreen from './GameScreen'
import { audioEngine } from '../audio'

describe('GameScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders the correct number of NoteCircles for active notes', () => {
      render(<GameScreen />)

      // Should have 2 circles for C4 and G4
      const circles = screen.getAllByRole('button')
      expect(circles).toHaveLength(2)
    })

    it('renders circles for C4 and G4', () => {
      render(<GameScreen />)

      expect(screen.getByLabelText('Play C')).toBeInTheDocument()
      expect(screen.getByLabelText('Play G')).toBeInTheDocument()
    })

    it('displays note labels on circles', () => {
      render(<GameScreen />)

      expect(screen.getByText('C')).toBeInTheDocument()
      expect(screen.getByText('G')).toBeInTheDocument()
    })

    it('renders the phase indicator', () => {
      render(<GameScreen />)

      expect(screen.getByText('Listen & Learn')).toBeInTheDocument()
    })
  })

  describe('circle of fifths layout', () => {
    it('renders circle of fifths container', () => {
      render(<GameScreen />)

      const container = document.querySelector('.game-screen__circle-of-fifths')
      expect(container).toBeInTheDocument()
    })

    it('positions notes with angle CSS variables', () => {
      render(<GameScreen />)

      const positions = document.querySelectorAll('.game-screen__note-position')
      expect(positions).toHaveLength(2)

      // C4 should be at 0 degrees (12 o'clock)
      // G4 should be at 30 degrees (1 o'clock)
      const angles = Array.from(positions).map(
        (el) => el.style.getPropertyValue('--angle')
      )
      expect(angles).toContain('0deg')
      expect(angles).toContain('30deg')
    })

    it('applies CSS custom properties for circle size and radius', () => {
      render(<GameScreen />)

      const container = document.querySelector('.game-screen__circle-of-fifths')
      expect(container.style.getPropertyValue('--circle-size')).toBe('120px')
      expect(container.style.getPropertyValue('--circle-radius')).toBe('216px')
    })
  })

  describe('audio playback', () => {
    it('calls audioEngine.playNote when circle is tapped', async () => {
      render(<GameScreen />)

      const cCircle = screen.getByLabelText('Play C')
      fireEvent.click(cCircle)

      await waitFor(() => {
        expect(audioEngine.playNote).toHaveBeenCalledWith('C4', 'piano')
      })
    })

    it('calls playNote with correct note for different circles', async () => {
      render(<GameScreen />)

      const gCircle = screen.getByLabelText('Play G')
      fireEvent.click(gCircle)

      await waitFor(() => {
        expect(audioEngine.playNote).toHaveBeenCalledWith('G4', 'piano')
      })
    })

    it('sets circle to playing state when tapped', async () => {
      render(<GameScreen />)

      const cCircle = screen.getByLabelText('Play C')
      fireEvent.click(cCircle)

      // Circle should have playing state
      expect(cCircle).toHaveAttribute('data-state', 'playing')
    })

    it('returns circle to idle state after 400ms', async () => {
      vi.useFakeTimers()
      render(<GameScreen />)

      const cCircle = screen.getByLabelText('Play C')

      await act(async () => {
        fireEvent.click(cCircle)
      })

      expect(cCircle).toHaveAttribute('data-state', 'playing')

      // Advance time by 400ms
      await act(async () => {
        vi.advanceTimersByTime(400)
      })

      expect(cCircle).toHaveAttribute('data-state', 'idle')

      vi.useRealTimers()
    })
  })

  describe('layout structure', () => {
    it('has dark background color applied via CSS class', () => {
      render(<GameScreen />)

      const gameScreen = document.querySelector('.game-screen')
      expect(gameScreen).toBeInTheDocument()
    })

    it('has header section for phase indicator', () => {
      render(<GameScreen />)

      const header = document.querySelector('.game-screen__header')
      expect(header).toBeInTheDocument()
    })

    it('has footer section for future controls', () => {
      render(<GameScreen />)

      const footer = document.querySelector('.game-screen__footer')
      expect(footer).toBeInTheDocument()
    })

    it('has circle container for centering', () => {
      render(<GameScreen />)

      const container = document.querySelector('.game-screen__circle-container')
      expect(container).toBeInTheDocument()
    })
  })
})
