import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  PHASES,
  createInitialState,
  startListenPhase,
  advanceListenNote,
  getCurrentListenNote,
  startExplorePhase,
  recordExploreTap,
  startQuizPhase,
  answerQuiz,
  getCurrentQuizQuestion,
  startResultPhase,
  getResults,
  isPhaseComplete,
  getNextPhase,
} from './PhaseManager'

describe('PhaseManager', () => {
  describe('createInitialState', () => {
    it('returns state with null phase', () => {
      const state = createInitialState()
      expect(state.phase).toBeNull()
    })

    it('returns state with null phase-specific data', () => {
      const state = createInitialState()
      expect(state.listen).toBeNull()
      expect(state.explore).toBeNull()
      expect(state.quiz).toBeNull()
      expect(state.result).toBeNull()
    })
  })

  describe('PHASES', () => {
    it('exports all phase constants', () => {
      expect(PHASES.LISTEN).toBe('LISTEN')
      expect(PHASES.EXPLORE).toBe('EXPLORE')
      expect(PHASES.QUIZ).toBe('QUIZ')
      expect(PHASES.RESULT).toBe('RESULT')
    })
  })

  describe('LISTEN phase', () => {
    const activeNotes = ['C4', 'G4', 'E4']

    describe('startListenPhase', () => {
      it('sets phase to LISTEN', () => {
        const state = createInitialState()
        const newState = startListenPhase(state, activeNotes)
        expect(newState.phase).toBe(PHASES.LISTEN)
      })

      it('initializes listen state with activeNotes', () => {
        const state = createInitialState()
        const newState = startListenPhase(state, activeNotes)
        expect(newState.listen.activeNotes).toEqual(activeNotes)
      })

      it('starts at index 0', () => {
        const state = createInitialState()
        const newState = startListenPhase(state, activeNotes)
        expect(newState.listen.currentIndex).toBe(0)
      })

      it('initializes isComplete as false', () => {
        const state = createInitialState()
        const newState = startListenPhase(state, activeNotes)
        expect(newState.listen.isComplete).toBe(false)
      })

      it('throws if activeNotes is empty', () => {
        const state = createInitialState()
        expect(() => startListenPhase(state, [])).toThrow()
      })

      it('throws if activeNotes is null/undefined', () => {
        const state = createInitialState()
        expect(() => startListenPhase(state, null)).toThrow()
        expect(() => startListenPhase(state, undefined)).toThrow()
      })

      it('copies activeNotes array (no mutation)', () => {
        const state = createInitialState()
        const notes = ['C4', 'G4']
        const newState = startListenPhase(state, notes)
        notes.push('E4')
        expect(newState.listen.activeNotes).toHaveLength(2)
      })
    })

    describe('advanceListenNote', () => {
      it('increments currentIndex', () => {
        let state = createInitialState()
        state = startListenPhase(state, activeNotes)
        const { state: newState } = advanceListenNote(state)
        expect(newState.listen.currentIndex).toBe(1)
      })

      it('returns status "playing" when not complete', () => {
        let state = createInitialState()
        state = startListenPhase(state, activeNotes)
        const { status } = advanceListenNote(state)
        expect(status).toBe('playing')
      })

      it('advances through all notes', () => {
        let state = createInitialState()
        state = startListenPhase(state, activeNotes)

        // Advance through first two notes
        let result = advanceListenNote(state)
        expect(result.status).toBe('playing')
        state = result.state

        result = advanceListenNote(state)
        expect(result.status).toBe('playing')
        state = result.state

        // Third advance completes the sequence
        result = advanceListenNote(state)
        expect(result.status).toBe('complete')
      })

      it('sets isComplete to true when sequence ends', () => {
        let state = createInitialState()
        state = startListenPhase(state, ['C4', 'G4']) // Only 2 notes

        let result = advanceListenNote(state)
        state = result.state
        result = advanceListenNote(state)

        expect(result.state.listen.isComplete).toBe(true)
      })

      it('throws if not in LISTEN phase', () => {
        const state = createInitialState()
        expect(() => advanceListenNote(state)).toThrow()
      })

      it('throws if in EXPLORE phase', () => {
        let state = createInitialState()
        state = startExplorePhase(state)
        expect(() => advanceListenNote(state)).toThrow(/EXPLORE/)
      })
    })

    describe('getCurrentListenNote', () => {
      it('returns the current note', () => {
        let state = createInitialState()
        state = startListenPhase(state, activeNotes)
        expect(getCurrentListenNote(state)).toBe('C4')
      })

      it('returns correct note after advancing', () => {
        let state = createInitialState()
        state = startListenPhase(state, activeNotes)
        const { state: newState } = advanceListenNote(state)
        expect(getCurrentListenNote(newState)).toBe('G4')
      })

      it('returns null if not in LISTEN phase', () => {
        const state = createInitialState()
        expect(getCurrentListenNote(state)).toBeNull()
      })
    })
  })

  describe('EXPLORE phase', () => {
    describe('startExplorePhase', () => {
      it('sets phase to EXPLORE', () => {
        const state = createInitialState()
        const newState = startExplorePhase(state)
        expect(newState.phase).toBe(PHASES.EXPLORE)
      })

      it('initializes tapCount to 0', () => {
        const state = createInitialState()
        const newState = startExplorePhase(state)
        expect(newState.explore.tapCount).toBe(0)
      })

      it('initializes isComplete as false', () => {
        const state = createInitialState()
        const newState = startExplorePhase(state)
        expect(newState.explore.isComplete).toBe(false)
      })

      it('records startTime', () => {
        const state = createInitialState()
        const before = Date.now()
        const newState = startExplorePhase(state)
        const after = Date.now()
        expect(newState.explore.startTime).toBeGreaterThanOrEqual(before)
        expect(newState.explore.startTime).toBeLessThanOrEqual(after)
      })
    })

    describe('recordExploreTap', () => {
      it('increments tapCount', () => {
        let state = createInitialState()
        state = startExplorePhase(state)
        const { state: newState } = recordExploreTap(state)
        expect(newState.explore.tapCount).toBe(1)
      })

      it('returns status "exploring" when not complete', () => {
        let state = createInitialState()
        state = startExplorePhase(state)
        const { status } = recordExploreTap(state)
        expect(status).toBe('exploring')
      })

      it('completes after 6 taps by default', () => {
        let state = createInitialState()
        state = startExplorePhase(state)

        for (let i = 0; i < 5; i++) {
          const result = recordExploreTap(state)
          expect(result.status).toBe('exploring')
          state = result.state
        }

        const result = recordExploreTap(state)
        expect(result.status).toBe('complete')
        expect(result.state.explore.isComplete).toBe(true)
      })

      it('respects custom maxTaps parameter', () => {
        let state = createInitialState()
        state = startExplorePhase(state)

        for (let i = 0; i < 2; i++) {
          const result = recordExploreTap(state, 3)
          state = result.state
        }

        const result = recordExploreTap(state, 3)
        expect(result.status).toBe('complete')
      })

      it('throws if not in EXPLORE phase', () => {
        const state = createInitialState()
        expect(() => recordExploreTap(state)).toThrow()
      })

      it('throws if in QUIZ phase', () => {
        let state = createInitialState()
        state = startQuizPhase(state, ['C4', 'G4'], 3)
        expect(() => recordExploreTap(state)).toThrow(/QUIZ/)
      })
    })
  })

  describe('QUIZ phase', () => {
    const activeNotes = ['C4', 'G4', 'E4']

    describe('startQuizPhase', () => {
      it('sets phase to QUIZ', () => {
        const state = createInitialState()
        const newState = startQuizPhase(state, activeNotes, 5)
        expect(newState.phase).toBe(PHASES.QUIZ)
      })

      it('initializes with first question from activeNotes', () => {
        const state = createInitialState()
        const newState = startQuizPhase(state, activeNotes, 5)
        expect(activeNotes).toContain(newState.quiz.currentQuestion)
      })

      it('starts at round 1', () => {
        const state = createInitialState()
        const newState = startQuizPhase(state, activeNotes, 5)
        expect(newState.quiz.roundNumber).toBe(1)
      })

      it('sets totalRounds', () => {
        const state = createInitialState()
        const newState = startQuizPhase(state, activeNotes, 5)
        expect(newState.quiz.totalRounds).toBe(5)
      })

      it('initializes empty results array', () => {
        const state = createInitialState()
        const newState = startQuizPhase(state, activeNotes, 5)
        expect(newState.quiz.results).toEqual([])
      })

      it('initializes isComplete as false', () => {
        const state = createInitialState()
        const newState = startQuizPhase(state, activeNotes, 5)
        expect(newState.quiz.isComplete).toBe(false)
      })

      it('throws if activeNotes is empty', () => {
        const state = createInitialState()
        expect(() => startQuizPhase(state, [], 5)).toThrow()
      })

      it('throws if totalRounds is less than 1', () => {
        const state = createInitialState()
        expect(() => startQuizPhase(state, activeNotes, 0)).toThrow()
      })
    })

    describe('answerQuiz', () => {
      it('returns correct: true for correct answer', () => {
        let state = createInitialState()
        state = startQuizPhase(state, activeNotes, 5)
        const correctAnswer = state.quiz.currentQuestion

        const result = answerQuiz(state, correctAnswer)
        expect(result.correct).toBe(true)
      })

      it('returns correct: false for incorrect answer', () => {
        let state = createInitialState()
        state = startQuizPhase(state, ['C4', 'G4'], 5)
        const currentQuestion = state.quiz.currentQuestion
        const wrongAnswer = currentQuestion === 'C4' ? 'G4' : 'C4'

        const result = answerQuiz(state, wrongAnswer)
        expect(result.correct).toBe(false)
      })

      it('returns the correctNote', () => {
        let state = createInitialState()
        state = startQuizPhase(state, activeNotes, 5)
        const expectedCorrectNote = state.quiz.currentQuestion

        const result = answerQuiz(state, 'X4') // wrong answer
        expect(result.correctNote).toBe(expectedCorrectNote)
      })

      it('advances round number', () => {
        let state = createInitialState()
        state = startQuizPhase(state, activeNotes, 5)
        const { state: newState } = answerQuiz(state, 'C4')
        expect(newState.quiz.roundNumber).toBe(2)
      })

      it('records result in results array', () => {
        let state = createInitialState()
        state = startQuizPhase(state, activeNotes, 5)
        const question = state.quiz.currentQuestion

        const { state: newState } = answerQuiz(state, 'C4')

        expect(newState.quiz.results).toHaveLength(1)
        expect(newState.quiz.results[0]).toEqual({
          round: 1,
          question: question,
          answer: 'C4',
          correct: question === 'C4',
        })
      })

      it('generates new question after each round', () => {
        let state = createInitialState()
        state = startQuizPhase(state, activeNotes, 5)
        const firstQuestion = state.quiz.currentQuestion

        const { state: newState } = answerQuiz(state, 'C4')

        // New question should be from activeNotes (may be same by chance, but valid)
        expect(activeNotes).toContain(newState.quiz.currentQuestion)
      })

      it('completes after totalRounds answers', () => {
        let state = createInitialState()
        state = startQuizPhase(state, activeNotes, 3)

        // Answer rounds 1 and 2
        let result = answerQuiz(state, 'C4')
        expect(result.status).toBe('continue')
        state = result.state

        result = answerQuiz(state, 'C4')
        expect(result.status).toBe('continue')
        state = result.state

        // Answer round 3 (final)
        result = answerQuiz(state, 'C4')
        expect(result.status).toBe('complete')
        expect(result.state.quiz.isComplete).toBe(true)
      })

      it('accumulates all results', () => {
        let state = createInitialState()
        state = startQuizPhase(state, activeNotes, 3)

        for (let i = 0; i < 3; i++) {
          const result = answerQuiz(state, 'C4')
          state = result.state
        }

        expect(state.quiz.results).toHaveLength(3)
      })

      it('throws if not in QUIZ phase', () => {
        const state = createInitialState()
        expect(() => answerQuiz(state, 'C4')).toThrow()
      })

      it('throws if in LISTEN phase', () => {
        let state = createInitialState()
        state = startListenPhase(state, ['C4', 'G4'])
        expect(() => answerQuiz(state, 'C4')).toThrow(/LISTEN/)
      })
    })

    describe('getCurrentQuizQuestion', () => {
      it('returns the current question', () => {
        let state = createInitialState()
        state = startQuizPhase(state, activeNotes, 5)
        const question = getCurrentQuizQuestion(state)
        expect(activeNotes).toContain(question)
      })

      it('returns null if not in QUIZ phase', () => {
        const state = createInitialState()
        expect(getCurrentQuizQuestion(state)).toBeNull()
      })
    })
  })

  describe('RESULT phase', () => {
    describe('startResultPhase', () => {
      it('sets phase to RESULT', () => {
        const state = createInitialState()
        const newState = startResultPhase(state)
        expect(newState.phase).toBe(PHASES.RESULT)
      })

      it('calculates correctCount from quiz results', () => {
        let state = createInitialState()
        state = startQuizPhase(state, ['C4', 'G4'], 3)

        // Simulate answering: first correct, second wrong, third correct
        const q1 = state.quiz.currentQuestion
        let result = answerQuiz(state, q1) // correct
        state = result.state

        const q2 = state.quiz.currentQuestion
        const wrongAnswer = q2 === 'C4' ? 'G4' : 'C4'
        result = answerQuiz(state, wrongAnswer) // wrong
        state = result.state

        const q3 = state.quiz.currentQuestion
        result = answerQuiz(state, q3) // correct
        state = result.state

        const resultState = startResultPhase(state)
        expect(resultState.result.correctCount).toBe(2)
      })

      it('calculates totalCount from quiz results', () => {
        let state = createInitialState()
        state = startQuizPhase(state, ['C4', 'G4'], 3)

        for (let i = 0; i < 3; i++) {
          const result = answerQuiz(state, 'C4')
          state = result.state
        }

        const resultState = startResultPhase(state)
        expect(resultState.result.totalCount).toBe(3)
      })

      it('calculates accuracy correctly', () => {
        let state = createInitialState()
        state = startQuizPhase(state, ['C4'], 4) // Only C4, all answers will be correct

        for (let i = 0; i < 4; i++) {
          const result = answerQuiz(state, 'C4')
          state = result.state
        }

        const resultState = startResultPhase(state)
        expect(resultState.result.accuracy).toBe(1) // 100%
      })

      it('handles zero results (accuracy = 0)', () => {
        const state = createInitialState()
        const resultState = startResultPhase(state)
        expect(resultState.result.accuracy).toBe(0)
        expect(resultState.result.totalCount).toBe(0)
      })

      it('includes exploreTapCount', () => {
        let state = createInitialState()
        state = startExplorePhase(state)

        for (let i = 0; i < 4; i++) {
          const result = recordExploreTap(state)
          state = result.state
        }

        const resultState = startResultPhase(state)
        expect(resultState.result.exploreTapCount).toBe(4)
      })

      it('includes detailed results array', () => {
        let state = createInitialState()
        state = startQuizPhase(state, ['C4', 'G4'], 2)

        for (let i = 0; i < 2; i++) {
          const result = answerQuiz(state, 'C4')
          state = result.state
        }

        const resultState = startResultPhase(state)
        expect(resultState.result.results).toHaveLength(2)
        expect(resultState.result.results[0]).toHaveProperty('round')
        expect(resultState.result.results[0]).toHaveProperty('question')
        expect(resultState.result.results[0]).toHaveProperty('answer')
        expect(resultState.result.results[0]).toHaveProperty('correct')
      })
    })

    describe('getResults', () => {
      it('returns result object in RESULT phase', () => {
        let state = createInitialState()
        state = startResultPhase(state)
        const results = getResults(state)
        expect(results).not.toBeNull()
        expect(results).toHaveProperty('correctCount')
        expect(results).toHaveProperty('totalCount')
        expect(results).toHaveProperty('accuracy')
      })

      it('returns null if not in RESULT phase', () => {
        const state = createInitialState()
        expect(getResults(state)).toBeNull()
      })
    })
  })

  describe('isPhaseComplete', () => {
    it('returns false for initial state', () => {
      const state = createInitialState()
      expect(isPhaseComplete(state)).toBe(false)
    })

    it('returns false for incomplete LISTEN phase', () => {
      let state = createInitialState()
      state = startListenPhase(state, ['C4', 'G4', 'E4'])
      expect(isPhaseComplete(state)).toBe(false)
    })

    it('returns true for complete LISTEN phase', () => {
      let state = createInitialState()
      state = startListenPhase(state, ['C4'])
      const { state: newState } = advanceListenNote(state)
      expect(isPhaseComplete(newState)).toBe(true)
    })

    it('returns false for incomplete EXPLORE phase', () => {
      let state = createInitialState()
      state = startExplorePhase(state)
      expect(isPhaseComplete(state)).toBe(false)
    })

    it('returns true for complete EXPLORE phase', () => {
      let state = createInitialState()
      state = startExplorePhase(state)
      for (let i = 0; i < 6; i++) {
        const result = recordExploreTap(state)
        state = result.state
      }
      expect(isPhaseComplete(state)).toBe(true)
    })

    it('returns false for incomplete QUIZ phase', () => {
      let state = createInitialState()
      state = startQuizPhase(state, ['C4', 'G4'], 3)
      expect(isPhaseComplete(state)).toBe(false)
    })

    it('returns true for complete QUIZ phase', () => {
      let state = createInitialState()
      state = startQuizPhase(state, ['C4'], 2)
      for (let i = 0; i < 2; i++) {
        const result = answerQuiz(state, 'C4')
        state = result.state
      }
      expect(isPhaseComplete(state)).toBe(true)
    })

    it('returns true for RESULT phase', () => {
      let state = createInitialState()
      state = startResultPhase(state)
      expect(isPhaseComplete(state)).toBe(true)
    })
  })

  describe('getNextPhase', () => {
    it('returns EXPLORE after LISTEN', () => {
      expect(getNextPhase(PHASES.LISTEN)).toBe(PHASES.EXPLORE)
    })

    it('returns QUIZ after EXPLORE', () => {
      expect(getNextPhase(PHASES.EXPLORE)).toBe(PHASES.QUIZ)
    })

    it('returns RESULT after QUIZ', () => {
      expect(getNextPhase(PHASES.QUIZ)).toBe(PHASES.RESULT)
    })

    it('returns LISTEN after RESULT (loop)', () => {
      expect(getNextPhase(PHASES.RESULT)).toBe(PHASES.LISTEN)
    })

    it('returns LISTEN for unknown phase', () => {
      expect(getNextPhase('UNKNOWN')).toBe(PHASES.LISTEN)
      expect(getNextPhase(null)).toBe(PHASES.LISTEN)
    })
  })

  describe('full game flow', () => {
    it('completes a full game cycle', () => {
      const activeNotes = ['C4', 'G4']

      // 1. Start with LISTEN
      let state = createInitialState()
      state = startListenPhase(state, activeNotes)
      expect(state.phase).toBe(PHASES.LISTEN)

      // Play through all notes
      while (!isPhaseComplete(state)) {
        const { state: newState } = advanceListenNote(state)
        state = newState
      }
      expect(isPhaseComplete(state)).toBe(true)

      // 2. Transition to EXPLORE
      state = startExplorePhase(state)
      expect(state.phase).toBe(PHASES.EXPLORE)

      // Tap 6 times
      for (let i = 0; i < 6; i++) {
        const { state: newState } = recordExploreTap(state)
        state = newState
      }
      expect(isPhaseComplete(state)).toBe(true)

      // 3. Transition to QUIZ
      state = startQuizPhase(state, activeNotes, 3)
      expect(state.phase).toBe(PHASES.QUIZ)

      // Answer all questions
      let correctAnswers = 0
      for (let i = 0; i < 3; i++) {
        const question = getCurrentQuizQuestion(state)
        const result = answerQuiz(state, question) // Always answer correctly
        if (result.correct) correctAnswers++
        state = result.state
      }
      expect(isPhaseComplete(state)).toBe(true)
      expect(correctAnswers).toBe(3)

      // 4. Transition to RESULT
      state = startResultPhase(state)
      expect(state.phase).toBe(PHASES.RESULT)

      const results = getResults(state)
      expect(results.correctCount).toBe(3)
      expect(results.totalCount).toBe(3)
      expect(results.accuracy).toBe(1)
      expect(results.exploreTapCount).toBe(6)

      // 5. Can loop back to LISTEN
      expect(getNextPhase(state.phase)).toBe(PHASES.LISTEN)
    })
  })
})
