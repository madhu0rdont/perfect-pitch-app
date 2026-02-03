import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import NoteCircle from './NoteCircle'

describe('NoteCircle', () => {
  const defaultProps = {
    note: 'C4',
    onTap: vi.fn(),
    state: 'idle',
    disabled: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders with the note label', () => {
      render(<NoteCircle {...defaultProps} />)
      expect(screen.getByText('C')).toBeInTheDocument()
    })

    it('displays only the note letter without octave number', () => {
      render(<NoteCircle {...defaultProps} note="G4" />)
      expect(screen.getByText('G')).toBeInTheDocument()
      expect(screen.queryByText('G4')).not.toBeInTheDocument()
    })

    it('displays only the note letter without sharp symbol', () => {
      render(<NoteCircle {...defaultProps} note="F#4" />)
      expect(screen.getByText('F')).toBeInTheDocument()
      expect(screen.queryByText('F#')).not.toBeInTheDocument()
    })

    it('has correct aria-label', () => {
      render(<NoteCircle {...defaultProps} />)
      expect(screen.getByRole('button', { name: 'Play C' })).toBeInTheDocument()
    })
  })

  describe('visual states', () => {
    it('applies idle class by default', () => {
      render(<NoteCircle {...defaultProps} state="idle" />)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('note-circle--idle')
    })

    it('applies playing class when state is playing', () => {
      render(<NoteCircle {...defaultProps} state="playing" />)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('note-circle--playing')
    })

    it('applies correct class when state is correct', () => {
      render(<NoteCircle {...defaultProps} state="correct" />)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('note-circle--correct')
    })

    it('applies incorrect class when state is incorrect', () => {
      render(<NoteCircle {...defaultProps} state="incorrect" />)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('note-circle--incorrect')
    })

    it('applies dimmed class when state is dimmed', () => {
      render(<NoteCircle {...defaultProps} state="dimmed" />)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('note-circle--dimmed')
    })

    it('applies hidden class when state is hidden', () => {
      render(<NoteCircle {...defaultProps} state="hidden" />)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('note-circle--hidden')
    })

    it('exposes state via data attribute', () => {
      render(<NoteCircle {...defaultProps} state="playing" />)
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('data-state', 'playing')
    })
  })

  describe('state transitions', () => {
    it('returns to idle after correct state (600ms)', async () => {
      vi.useFakeTimers()
      render(<NoteCircle {...defaultProps} state="correct" />)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('note-circle--correct')

      await act(async () => {
        vi.advanceTimersByTime(600)
      })

      expect(button).toHaveClass('note-circle--idle')

      vi.useRealTimers()
    })

    it('returns to idle after incorrect state (500ms)', async () => {
      vi.useFakeTimers()
      render(<NoteCircle {...defaultProps} state="incorrect" />)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('note-circle--incorrect')

      await act(async () => {
        vi.advanceTimersByTime(500)
      })

      expect(button).toHaveClass('note-circle--idle')

      vi.useRealTimers()
    })
  })

  describe('tap handling', () => {
    it('fires onTap when clicked', () => {
      const onTap = vi.fn()
      render(<NoteCircle {...defaultProps} onTap={onTap} />)

      fireEvent.click(screen.getByRole('button'))

      expect(onTap).toHaveBeenCalledTimes(1)
      expect(onTap).toHaveBeenCalledWith('C4')
    })

    it('fires onTap with the note name', () => {
      const onTap = vi.fn()
      render(<NoteCircle {...defaultProps} note="E4" onTap={onTap} />)

      fireEvent.click(screen.getByRole('button'))

      expect(onTap).toHaveBeenCalledWith('E4')
    })

    it('fires onTap on touchStart', () => {
      const onTap = vi.fn()
      render(<NoteCircle {...defaultProps} onTap={onTap} />)

      fireEvent.touchStart(screen.getByRole('button'))

      expect(onTap).toHaveBeenCalledTimes(1)
    })

    it('does not double-fire on touch devices (touchStart + click)', () => {
      const onTap = vi.fn()
      render(<NoteCircle {...defaultProps} onTap={onTap} />)

      const button = screen.getByRole('button')

      // Simulate touch device behavior: touchStart fires first, then click
      fireEvent.touchStart(button)
      fireEvent.click(button)

      expect(onTap).toHaveBeenCalledTimes(1)
    })
  })

  describe('disabled state', () => {
    it('does not fire onTap when disabled', () => {
      const onTap = vi.fn()
      render(<NoteCircle {...defaultProps} onTap={onTap} disabled={true} />)

      fireEvent.click(screen.getByRole('button'))

      expect(onTap).not.toHaveBeenCalled()
    })

    it('applies disabled class when disabled', () => {
      render(<NoteCircle {...defaultProps} disabled={true} />)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('note-circle--disabled')
    })

    it('has disabled attribute when disabled', () => {
      render(<NoteCircle {...defaultProps} disabled={true} />)
      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
    })
  })

  describe('hidden state', () => {
    it('does not fire onTap when hidden', () => {
      const onTap = vi.fn()
      render(<NoteCircle {...defaultProps} onTap={onTap} state="hidden" />)

      fireEvent.click(screen.getByRole('button'))

      expect(onTap).not.toHaveBeenCalled()
    })

    it('is disabled when hidden', () => {
      render(<NoteCircle {...defaultProps} state="hidden" />)
      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
    })
  })
})
