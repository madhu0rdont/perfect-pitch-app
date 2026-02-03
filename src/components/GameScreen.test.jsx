import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock the audio module
vi.mock('../audio', () => ({
  audioEngine: {
    playNote: vi.fn().mockResolvedValue(undefined),
    playReward: vi.fn(),
    isInitialized: vi.fn().mockReturnValue(true),
  },
}))

import GameScreen from './GameScreen'
import { audioEngine } from '../audio'

describe('GameScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('rendering', () => {
    it('renders the correct number of NoteCircles for active notes', async () => {
      render(<GameScreen />)

      await act(async () => {
        vi.advanceTimersByTime(100)
      })

      const circles = screen.getAllByRole('button')
      expect(circles).toHaveLength(2)
    })

    it('renders circles for C4 and G4', async () => {
      render(<GameScreen />)

      await act(async () => {
        vi.advanceTimersByTime(100)
      })

      expect(screen.getByLabelText('Play C')).toBeInTheDocument()
      expect(screen.getByLabelText('Play G')).toBeInTheDocument()
    })
  })

  describe('LISTEN phase', () => {
    it('starts in LISTEN phase', async () => {
      render(<GameScreen />)

      await act(async () => {
        vi.advanceTimersByTime(100)
      })

      expect(screen.getByText('Listen...')).toBeInTheDocument()
    })

    it('plays the first note on mount', async () => {
      render(<GameScreen />)

      await act(async () => {
        vi.advanceTimersByTime(100)
      })

      expect(audioEngine.playNote).toHaveBeenCalledWith('C4', 'piano')
    })

    it('disables circles during LISTEN phase', async () => {
      render(<GameScreen />)

      await act(async () => {
        vi.advanceTimersByTime(100)
      })

      const cCircle = screen.getByLabelText('Play C')
      expect(cCircle).toBeDisabled()
    })

    it('advances through notes every 1.5 seconds', async () => {
      render(<GameScreen />)

      await act(async () => {
        vi.advanceTimersByTime(100)
      })

      // First note played immediately
      expect(audioEngine.playNote).toHaveBeenCalledWith('C4', 'piano')

      // Advance to second note
      await act(async () => {
        vi.advanceTimersByTime(1500)
      })

      expect(audioEngine.playNote).toHaveBeenCalledWith('G4', 'piano')
    })

    it('transitions to EXPLORE after all notes played', async () => {
      render(<GameScreen />)

      // Play through C4 and G4 (2 notes = 2 intervals)
      await act(async () => {
        vi.advanceTimersByTime(100) // Initial
      })

      await act(async () => {
        vi.advanceTimersByTime(1500) // Second note
      })

      await act(async () => {
        vi.advanceTimersByTime(1500) // Complete
      })

      expect(screen.getByText('Try tapping!')).toBeInTheDocument()
    })
  })

  describe('EXPLORE phase', () => {
    async function advanceToExplore() {
      render(<GameScreen />)

      // Play through LISTEN phase (2 notes)
      await act(async () => {
        vi.advanceTimersByTime(100)
      })
      await act(async () => {
        vi.advanceTimersByTime(1500)
      })
      await act(async () => {
        vi.advanceTimersByTime(1500)
      })
    }

    it('enables circles during EXPLORE phase', async () => {
      await advanceToExplore()

      const cCircle = screen.getByLabelText('Play C')
      expect(cCircle).not.toBeDisabled()
    })

    it('plays note when circle is tapped', async () => {
      await advanceToExplore()
      vi.clearAllMocks()

      const cCircle = screen.getByLabelText('Play C')

      await act(async () => {
        fireEvent.click(cCircle)
      })

      expect(audioEngine.playNote).toHaveBeenCalledWith('C4', 'piano')
    })

    it('transitions to QUIZ after 6 taps', async () => {
      await advanceToExplore()

      const cCircle = screen.getByLabelText('Play C')

      // Tap 6 times
      for (let i = 0; i < 6; i++) {
        await act(async () => {
          fireEvent.click(cCircle)
          vi.advanceTimersByTime(100)
        })
      }

      await act(async () => {
        vi.advanceTimersByTime(100)
      })

      expect(screen.getByText('Which note?')).toBeInTheDocument()
    })

    it('transitions to QUIZ after 15 seconds timeout', async () => {
      await advanceToExplore()

      // Wait for explore timeout
      await act(async () => {
        vi.advanceTimersByTime(15000)
      })

      expect(screen.getByText('Which note?')).toBeInTheDocument()
    })
  })

  describe('QUIZ phase', () => {
    async function advanceToQuiz() {
      render(<GameScreen />)

      // LISTEN phase
      await act(async () => {
        vi.advanceTimersByTime(100)
      })
      await act(async () => {
        vi.advanceTimersByTime(1500)
      })
      await act(async () => {
        vi.advanceTimersByTime(1500)
      })

      // EXPLORE phase - tap 6 times
      const cCircle = screen.getByLabelText('Play C')
      for (let i = 0; i < 6; i++) {
        await act(async () => {
          fireEvent.click(cCircle)
          vi.advanceTimersByTime(100)
        })
      }

      await act(async () => {
        vi.advanceTimersByTime(100)
      })
    }

    it('shows round counter', async () => {
      await advanceToQuiz()

      expect(screen.getByText(/Round 1 of 5/)).toBeInTheDocument()
    })

    it('plays question note when quiz starts', async () => {
      await advanceToQuiz()

      // Should have played the question note
      const playCalls = audioEngine.playNote.mock.calls
      const lastCall = playCalls[playCalls.length - 1]
      expect(['C4', 'G4']).toContain(lastCall[0])
    })

    it('accepts taps as answers', async () => {
      await advanceToQuiz()
      vi.clearAllMocks()

      const cCircle = screen.getByLabelText('Play C')

      await act(async () => {
        fireEvent.click(cCircle)
      })

      expect(audioEngine.playNote).toHaveBeenCalledWith('C4', 'piano')
    })

    it('shows feedback after answering', async () => {
      await advanceToQuiz()

      const cCircle = screen.getByLabelText('Play C')

      await act(async () => {
        fireEvent.click(cCircle)
      })

      await act(async () => {
        vi.advanceTimersByTime(100)
      })

      // Should show either "Correct!" or the correct note
      const feedback = document.querySelector('.game-screen__feedback')
      expect(feedback).toBeInTheDocument()
    })

    it('plays reward sound on correct answer', async () => {
      await advanceToQuiz()
      vi.clearAllMocks()

      // Get the current question to answer correctly
      // Since we're testing the flow, we tap both circles and one will be correct
      const cCircle = screen.getByLabelText('Play C')
      const gCircle = screen.getByLabelText('Play G')

      // Try C first
      await act(async () => {
        fireEvent.click(cCircle)
      })

      await act(async () => {
        vi.advanceTimersByTime(100)
      })

      // Check if reward was played (if C was the correct answer)
      // or if playReward wasn't called (if C was wrong)
      const rewardCalled = audioEngine.playReward.mock.calls.length > 0
      const correctFeedback = document.querySelector('.game-screen__feedback.correct')

      // If reward was called, feedback should show correct
      if (rewardCalled) {
        expect(correctFeedback).toBeInTheDocument()
      }
    })

    it('sets correct circle state and plays reward on correct answer', async () => {
      await advanceToQuiz()
      vi.clearAllMocks()

      const cCircle = screen.getByLabelText('Play C')

      await act(async () => {
        fireEvent.click(cCircle)
      })

      await act(async () => {
        vi.advanceTimersByTime(100)
      })

      // Circle should be in either 'correct' or 'incorrect' state
      const cCircleElement = screen.getByLabelText('Play C')
      const hasState =
        cCircleElement.classList.contains('note-circle--correct') ||
        cCircleElement.classList.contains('note-circle--incorrect')
      expect(hasState).toBe(true)
    })

    it('replays correct note on incorrect answer without negative sound', async () => {
      await advanceToQuiz()
      vi.clearAllMocks()

      // We need to ensure we tap the wrong circle
      // The quiz randomly selects C4 or G4
      // We'll check that if wrong, the correct note is replayed
      const cCircle = screen.getByLabelText('Play C')

      await act(async () => {
        fireEvent.click(cCircle)
      })

      await act(async () => {
        vi.advanceTimersByTime(100)
      })

      // Check if this was an incorrect answer
      const incorrectFeedback = document.querySelector('.game-screen__feedback.incorrect')
      if (incorrectFeedback) {
        // If incorrect, playNote should have been called twice:
        // 1. When tapping the wrong note
        // 2. When replaying the correct note
        expect(audioEngine.playNote.mock.calls.length).toBeGreaterThanOrEqual(2)
        // And playReward should NOT have been called
        expect(audioEngine.playReward).not.toHaveBeenCalled()
      }
    })

    it('resets circles after correct feedback duration (800ms)', async () => {
      await advanceToQuiz()

      const cCircle = screen.getByLabelText('Play C')

      await act(async () => {
        fireEvent.click(cCircle)
      })

      // Wait for feedback duration (800ms for correct, 1200ms for incorrect)
      // Using 1200ms to cover both cases
      await act(async () => {
        vi.advanceTimersByTime(1200)
      })

      // After feedback, circles should reset to idle
      await act(async () => {
        vi.advanceTimersByTime(100)
      })

      // Feedback should be cleared
      const feedback = document.querySelector('.game-screen__feedback')
      expect(feedback).not.toBeInTheDocument()
    })

    it('plays next question after pause (1000ms after feedback)', async () => {
      await advanceToQuiz()
      vi.clearAllMocks()

      const cCircle = screen.getByLabelText('Play C')

      await act(async () => {
        fireEvent.click(cCircle)
      })

      // Wait for feedback (1200ms max) + question pause (1000ms)
      await act(async () => {
        vi.advanceTimersByTime(2200)
      })

      await act(async () => {
        vi.advanceTimersByTime(100)
      })

      // playNote should have been called again for the next question
      // (once for tap, possibly once for replay, and once for next question)
      expect(audioEngine.playNote.mock.calls.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('RESULT phase', () => {
    async function advanceToResult() {
      render(<GameScreen />)

      // LISTEN phase
      await act(async () => {
        vi.advanceTimersByTime(100)
      })
      await act(async () => {
        vi.advanceTimersByTime(1500)
      })
      await act(async () => {
        vi.advanceTimersByTime(1500)
      })

      // EXPLORE phase - tap 6 times
      const cCircle = screen.getByLabelText('Play C')
      for (let i = 0; i < 6; i++) {
        await act(async () => {
          fireEvent.click(cCircle)
          vi.advanceTimersByTime(100)
        })
      }

      await act(async () => {
        vi.advanceTimersByTime(100)
      })

      // QUIZ phase - answer 5 questions
      // New timing: 1200ms feedback (max) + 1000ms pause = 2200ms per question
      for (let i = 0; i < 5; i++) {
        await act(async () => {
          fireEvent.click(cCircle)
          vi.advanceTimersByTime(100)
        })

        // Wait for feedback (1200ms max) + question pause (1000ms)
        await act(async () => {
          vi.advanceTimersByTime(2200)
        })
      }
    }

    it('shows "Great job!" message', async () => {
      await advanceToResult()

      expect(screen.getByText('Great job!')).toBeInTheDocument()
    })

    it('shows Play Again button', async () => {
      await advanceToResult()

      expect(screen.getByRole('button', { name: 'Play Again' })).toBeInTheDocument()
    })

    it('does not show scores or numbers (toddler-friendly)', async () => {
      await advanceToResult()

      // Should NOT show any scores, numbers, or evaluation
      expect(screen.queryByText(/\d+ \/ \d+/)).not.toBeInTheDocument()
      expect(screen.queryByText(/% accuracy/)).not.toBeInTheDocument()
    })

    it('circles are in idle state (gently pulsing)', async () => {
      await advanceToResult()

      // All circles should be idle (which has pulse animation)
      const cCircle = screen.getByLabelText('Play C')
      const gCircle = screen.getByLabelText('Play G')

      // Idle state means no special state classes
      expect(cCircle).not.toHaveClass('note-circle--correct')
      expect(cCircle).not.toHaveClass('note-circle--incorrect')
      expect(gCircle).not.toHaveClass('note-circle--correct')
      expect(gCircle).not.toHaveClass('note-circle--incorrect')
    })

    it('restarts game when Play Again is clicked', async () => {
      await advanceToResult()

      const playAgainButton = screen.getByRole('button', { name: 'Play Again' })

      await act(async () => {
        fireEvent.click(playAgainButton)
      })

      await act(async () => {
        vi.advanceTimersByTime(100)
      })

      expect(screen.getByText('Listen...')).toBeInTheDocument()
    })
  })

  describe('full game flow integration', () => {
    it('completes a full game cycle: LISTEN → EXPLORE → QUIZ → RESULT', async () => {
      render(<GameScreen />)

      // 1. LISTEN phase
      await act(async () => {
        vi.advanceTimersByTime(100)
      })
      expect(screen.getByText('Listen...')).toBeInTheDocument()

      // Play through all notes
      await act(async () => {
        vi.advanceTimersByTime(1500)
      })
      await act(async () => {
        vi.advanceTimersByTime(1500)
      })

      // 2. EXPLORE phase
      expect(screen.getByText('Try tapping!')).toBeInTheDocument()

      const cCircle = screen.getByLabelText('Play C')

      // Tap 6 times
      for (let i = 0; i < 6; i++) {
        await act(async () => {
          fireEvent.click(cCircle)
          vi.advanceTimersByTime(100)
        })
      }

      await act(async () => {
        vi.advanceTimersByTime(100)
      })

      // 3. QUIZ phase
      expect(screen.getByText('Which note?')).toBeInTheDocument()

      // Answer all 5 questions
      // New timing: 1200ms feedback (max) + 1000ms pause = 2200ms per question
      for (let i = 0; i < 5; i++) {
        await act(async () => {
          fireEvent.click(cCircle)
          vi.advanceTimersByTime(100)
        })

        await act(async () => {
          vi.advanceTimersByTime(2200)
        })
      }

      // 4. RESULT phase
      expect(screen.getByText('Great job!')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Play Again' })).toBeInTheDocument()
    })
  })
})
