import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import InstrumentIndicator from './InstrumentIndicator'

describe('InstrumentIndicator', () => {
  describe('renders correct emoji for each instrument', () => {
    it('renders piano emoji for piano', () => {
      render(<InstrumentIndicator instrument="piano" visible={true} />)

      expect(screen.getByText('🎹')).toBeInTheDocument()
    })

    it('renders violin emoji for violin', () => {
      render(<InstrumentIndicator instrument="violin" visible={true} />)

      expect(screen.getByText('🎻')).toBeInTheDocument()
    })

    it('renders guitar emoji for guitar-acoustic', () => {
      render(<InstrumentIndicator instrument="guitar-acoustic" visible={true} />)

      expect(screen.getByText('🎸')).toBeInTheDocument()
    })

    it('defaults to piano emoji for unknown instrument', () => {
      render(<InstrumentIndicator instrument="unknown" visible={true} />)

      expect(screen.getByText('🎹')).toBeInTheDocument()
    })
  })

  describe('visibility', () => {
    it('has visible class when visible is true', () => {
      render(<InstrumentIndicator instrument="piano" visible={true} />)

      const indicator = screen.getByLabelText('Playing on piano')
      expect(indicator).toHaveClass('instrument-indicator--visible')
    })

    it('does not have visible class when visible is false', () => {
      render(<InstrumentIndicator instrument="piano" visible={false} />)

      const indicator = screen.getByLabelText('Playing on piano')
      expect(indicator).not.toHaveClass('instrument-indicator--visible')
    })
  })

  describe('quiz phase mode', () => {
    it('has quiz class when isQuizPhase is true', () => {
      render(<InstrumentIndicator instrument="piano" visible={true} isQuizPhase={true} />)

      const indicator = screen.getByLabelText('Playing on piano')
      expect(indicator).toHaveClass('instrument-indicator--quiz')
    })

    it('shows hint text in quiz phase when visible', () => {
      render(<InstrumentIndicator instrument="violin" visible={true} isQuizPhase={true} />)

      expect(screen.getByText('Listen...')).toBeInTheDocument()
    })

    it('does not show hint text when not in quiz phase', () => {
      render(<InstrumentIndicator instrument="violin" visible={true} isQuizPhase={false} />)

      expect(screen.queryByText('Listen...')).not.toBeInTheDocument()
    })

    it('does not show hint text when not visible in quiz phase', () => {
      render(<InstrumentIndicator instrument="violin" visible={false} isQuizPhase={true} />)

      expect(screen.queryByText('Listen...')).not.toBeInTheDocument()
    })
  })

  describe('celebration mode', () => {
    it('has celebration class when showCelebration is true', () => {
      render(
        <InstrumentIndicator
          instrument="piano"
          visible={true}
          showCelebration={true}
        />
      )

      const indicator = screen.getByLabelText('Playing on piano')
      expect(indicator).toHaveClass('instrument-indicator--celebration')
    })

    it('does not have celebration class when showCelebration is false', () => {
      render(
        <InstrumentIndicator
          instrument="piano"
          visible={true}
          showCelebration={false}
        />
      )

      const indicator = screen.getByLabelText('Playing on piano')
      expect(indicator).not.toHaveClass('instrument-indicator--celebration')
    })
  })

  describe('accessibility', () => {
    it('has aria-label indicating the instrument', () => {
      render(<InstrumentIndicator instrument="violin" visible={true} />)

      expect(screen.getByLabelText('Playing on violin')).toBeInTheDocument()
    })

    it('has correct aria-label for guitar-acoustic', () => {
      render(<InstrumentIndicator instrument="guitar-acoustic" visible={true} />)

      expect(screen.getByLabelText('Playing on guitar-acoustic')).toBeInTheDocument()
    })
  })
})
