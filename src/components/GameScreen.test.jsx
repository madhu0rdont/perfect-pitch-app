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

    it('applies single-row layout class for 2 circles', () => {
      render(<GameScreen />)

      const circlesContainer = document.querySelector('.game-screen__circles')
      expect(circlesContainer).toHaveClass('layout-single-row')
    })

    it('renders circles in row containers', () => {
      render(<GameScreen />)

      const rows = document.querySelectorAll('.game-screen__row')
      expect(rows.length).toBeGreaterThan(0)
    })

    it('applies CSS custom properties for circle size and gap', () => {
      render(<GameScreen />)

      const circlesContainer = document.querySelector('.game-screen__circles')
      expect(circlesContainer.style.getPropertyValue('--circle-size')).toBe('140px')
      expect(circlesContainer.style.getPropertyValue('--circle-gap')).toBe('30px')
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

  describe('layout', () => {
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
  })
})
