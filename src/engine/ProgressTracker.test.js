import { describe, it, expect } from 'vitest'
import {
  createInitialState,
  recordAnswer,
  getRollingAccuracy,
  isNoteMastered,
  getWeightedNoteSelection,
  getNoteOverallAccuracy,
  canAddNewNote,
  addNextNote,
  incrementSessions,
} from './ProgressTracker'
import { MASTERY_THRESHOLDS, NOTE_INTRODUCTION_ORDER } from '../constants/notes'

describe('ProgressTracker', () => {
  describe('createInitialState()', () => {
    it('returns state with first two notes active', () => {
      const state = createInitialState()

      expect(state.activeNotes).toEqual(['C4', 'G4'])
    })

    it('starts with piano as the only active instrument', () => {
      const state = createInitialState()

      expect(state.activeInstruments).toEqual(['piano'])
    })

    it('initializes noteProgress for each active note/instrument', () => {
      const state = createInitialState()

      expect(state.noteProgress.C4).toBeDefined()
      expect(state.noteProgress.G4).toBeDefined()
      expect(state.noteProgress.C4.piano).toBeDefined()
      expect(state.noteProgress.G4.piano).toBeDefined()
    })

    it('initializes progress with zero values', () => {
      const state = createInitialState()
      const progress = state.noteProgress.C4.piano

      expect(progress.attempts).toBe(0)
      expect(progress.correct).toBe(0)
      expect(progress.streak).toBe(0)
      expect(progress.recentResults).toEqual([])
    })

    it('starts at stage 1 with zero sessions', () => {
      const state = createInitialState()

      expect(state.currentStage).toBe(1)
      expect(state.sessionsPlayed).toBe(0)
    })
  })

  describe('recordAnswer()', () => {
    it('increments attempts on each answer', () => {
      let state = createInitialState()

      state = recordAnswer(state, 'C4', 'piano', true)
      expect(state.noteProgress.C4.piano.attempts).toBe(1)

      state = recordAnswer(state, 'C4', 'piano', false)
      expect(state.noteProgress.C4.piano.attempts).toBe(2)

      state = recordAnswer(state, 'C4', 'piano', true)
      expect(state.noteProgress.C4.piano.attempts).toBe(3)
    })

    it('increments correct count only on correct answers', () => {
      let state = createInitialState()

      state = recordAnswer(state, 'C4', 'piano', true)
      expect(state.noteProgress.C4.piano.correct).toBe(1)

      state = recordAnswer(state, 'C4', 'piano', false)
      expect(state.noteProgress.C4.piano.correct).toBe(1)

      state = recordAnswer(state, 'C4', 'piano', true)
      expect(state.noteProgress.C4.piano.correct).toBe(2)
    })

    it('increments streak on correct answer', () => {
      let state = createInitialState()

      state = recordAnswer(state, 'C4', 'piano', true)
      expect(state.noteProgress.C4.piano.streak).toBe(1)

      state = recordAnswer(state, 'C4', 'piano', true)
      expect(state.noteProgress.C4.piano.streak).toBe(2)

      state = recordAnswer(state, 'C4', 'piano', true)
      expect(state.noteProgress.C4.piano.streak).toBe(3)
    })

    it('resets streak to 0 on wrong answer', () => {
      let state = createInitialState()

      // Build up a streak
      state = recordAnswer(state, 'C4', 'piano', true)
      state = recordAnswer(state, 'C4', 'piano', true)
      state = recordAnswer(state, 'C4', 'piano', true)
      expect(state.noteProgress.C4.piano.streak).toBe(3)

      // Wrong answer resets streak
      state = recordAnswer(state, 'C4', 'piano', false)
      expect(state.noteProgress.C4.piano.streak).toBe(0)
    })

    it('adds results to recentResults array', () => {
      let state = createInitialState()

      state = recordAnswer(state, 'C4', 'piano', true)
      expect(state.noteProgress.C4.piano.recentResults).toEqual([true])

      state = recordAnswer(state, 'C4', 'piano', false)
      expect(state.noteProgress.C4.piano.recentResults).toEqual([true, false])

      state = recordAnswer(state, 'C4', 'piano', true)
      expect(state.noteProgress.C4.piano.recentResults).toEqual([true, false, true])
    })

    it('caps recentResults at 10 entries (rollingWindow)', () => {
      let state = createInitialState()

      // Add 12 answers
      for (let i = 0; i < 12; i++) {
        state = recordAnswer(state, 'C4', 'piano', i % 2 === 0)
      }

      expect(state.noteProgress.C4.piano.recentResults).toHaveLength(10)
    })

    it('removes oldest result when exceeding 10', () => {
      let state = createInitialState()

      // Add 10 true results
      for (let i = 0; i < 10; i++) {
        state = recordAnswer(state, 'C4', 'piano', true)
      }
      expect(state.noteProgress.C4.piano.recentResults).toEqual(
        Array(10).fill(true)
      )

      // Add a false - should remove the first true
      state = recordAnswer(state, 'C4', 'piano', false)
      expect(state.noteProgress.C4.piano.recentResults).toHaveLength(10)
      expect(state.noteProgress.C4.piano.recentResults[9]).toBe(false)
      expect(state.noteProgress.C4.piano.recentResults.filter((r) => r).length).toBe(9)
    })

    it('does not mutate the original state', () => {
      const state = createInitialState()
      const originalProgress = state.noteProgress.C4.piano.attempts

      recordAnswer(state, 'C4', 'piano', true)

      expect(state.noteProgress.C4.piano.attempts).toBe(originalProgress)
    })

    it('handles recording for a note not in initial state', () => {
      let state = createInitialState()

      // D4 is not initially active
      state = recordAnswer(state, 'D4', 'piano', true)

      expect(state.noteProgress.D4).toBeDefined()
      expect(state.noteProgress.D4.piano.attempts).toBe(1)
      expect(state.noteProgress.D4.piano.correct).toBe(1)
    })

    it('tracks progress separately for different notes', () => {
      let state = createInitialState()

      state = recordAnswer(state, 'C4', 'piano', true)
      state = recordAnswer(state, 'C4', 'piano', true)
      state = recordAnswer(state, 'G4', 'piano', false)

      expect(state.noteProgress.C4.piano.correct).toBe(2)
      expect(state.noteProgress.C4.piano.streak).toBe(2)
      expect(state.noteProgress.G4.piano.correct).toBe(0)
      expect(state.noteProgress.G4.piano.streak).toBe(0)
    })
  })

  describe('getRollingAccuracy()', () => {
    it('returns 0 for no attempts', () => {
      const state = createInitialState()
      const accuracy = getRollingAccuracy(state.noteProgress.C4.piano)

      expect(accuracy).toBe(0)
    })

    it('returns 1.0 for all correct answers', () => {
      let state = createInitialState()

      for (let i = 0; i < 5; i++) {
        state = recordAnswer(state, 'C4', 'piano', true)
      }

      const accuracy = getRollingAccuracy(state.noteProgress.C4.piano)
      expect(accuracy).toBe(1.0)
    })

    it('returns 0 for all incorrect answers', () => {
      let state = createInitialState()

      for (let i = 0; i < 5; i++) {
        state = recordAnswer(state, 'C4', 'piano', false)
      }

      const accuracy = getRollingAccuracy(state.noteProgress.C4.piano)
      expect(accuracy).toBe(0)
    })

    it('calculates correctly with partial data (less than 10 results)', () => {
      let state = createInitialState()

      // 3 correct out of 5 = 60%
      state = recordAnswer(state, 'C4', 'piano', true)
      state = recordAnswer(state, 'C4', 'piano', true)
      state = recordAnswer(state, 'C4', 'piano', false)
      state = recordAnswer(state, 'C4', 'piano', true)
      state = recordAnswer(state, 'C4', 'piano', false)

      const accuracy = getRollingAccuracy(state.noteProgress.C4.piano)
      expect(accuracy).toBe(0.6)
    })

    it('calculates correctly with exactly 10 results', () => {
      let state = createInitialState()

      // 8 correct out of 10 = 80%
      for (let i = 0; i < 8; i++) {
        state = recordAnswer(state, 'C4', 'piano', true)
      }
      for (let i = 0; i < 2; i++) {
        state = recordAnswer(state, 'C4', 'piano', false)
      }

      const accuracy = getRollingAccuracy(state.noteProgress.C4.piano)
      expect(accuracy).toBe(0.8)
    })

    it('only considers last 10 results when more than 10 recorded', () => {
      let state = createInitialState()

      // First 5: all wrong (these will be pushed out)
      for (let i = 0; i < 5; i++) {
        state = recordAnswer(state, 'C4', 'piano', false)
      }

      // Next 10: all correct (these are the last 10)
      for (let i = 0; i < 10; i++) {
        state = recordAnswer(state, 'C4', 'piano', true)
      }

      const accuracy = getRollingAccuracy(state.noteProgress.C4.piano)
      expect(accuracy).toBe(1.0) // Only the 10 correct ones count
    })
  })

  describe('isNoteMastered()', () => {
    it('returns false with zero attempts', () => {
      const state = createInitialState()

      expect(isNoteMastered(state.noteProgress.C4.piano)).toBe(false)
    })

    it('returns false when accuracy is below threshold', () => {
      let state = createInitialState()

      // 7 correct, 3 wrong = 70% (below 80% threshold)
      for (let i = 0; i < 7; i++) {
        state = recordAnswer(state, 'C4', 'piano', true)
      }
      for (let i = 0; i < 3; i++) {
        state = recordAnswer(state, 'C4', 'piano', false)
      }

      expect(isNoteMastered(state.noteProgress.C4.piano)).toBe(false)
    })

    it('returns false when streak is below threshold', () => {
      let state = createInitialState()

      // 9 correct, 1 wrong = 90% accuracy, but streak is only 1
      for (let i = 0; i < 9; i++) {
        state = recordAnswer(state, 'C4', 'piano', true)
      }
      state = recordAnswer(state, 'C4', 'piano', false)
      state = recordAnswer(state, 'C4', 'piano', true) // streak = 1

      expect(isNoteMastered(state.noteProgress.C4.piano)).toBe(false)
    })

    it('returns true at exactly 80% accuracy and streak of 3', () => {
      let state = createInitialState()

      // Build up: 5 wrong, then 5 correct ending with streak of 5
      // But we need exactly 80% and streak of 3
      // 8 correct, 2 wrong, ending with 3 correct streak
      state = recordAnswer(state, 'C4', 'piano', true)
      state = recordAnswer(state, 'C4', 'piano', true)
      state = recordAnswer(state, 'C4', 'piano', true)
      state = recordAnswer(state, 'C4', 'piano', true)
      state = recordAnswer(state, 'C4', 'piano', true)
      state = recordAnswer(state, 'C4', 'piano', false)
      state = recordAnswer(state, 'C4', 'piano', false)
      // Now: 5 correct, 2 wrong = 71%, streak = 0
      // Need to get to 80% with streak of 3
      state = recordAnswer(state, 'C4', 'piano', true)
      state = recordAnswer(state, 'C4', 'piano', true)
      state = recordAnswer(state, 'C4', 'piano', true)
      // Now: 8 correct, 2 wrong = 80%, streak = 3

      const progress = state.noteProgress.C4.piano
      expect(getRollingAccuracy(progress)).toBe(0.8)
      expect(progress.streak).toBe(3)
      expect(isNoteMastered(progress)).toBe(true)
    })

    it('returns true when both thresholds are exceeded', () => {
      let state = createInitialState()

      // 10 correct = 100% accuracy, streak = 10
      for (let i = 0; i < 10; i++) {
        state = recordAnswer(state, 'C4', 'piano', true)
      }

      expect(isNoteMastered(state.noteProgress.C4.piano)).toBe(true)
    })

    it('returns false at 79% accuracy even with high streak', () => {
      let state = createInitialState()

      // Start with wrong answers to lower accuracy
      state = recordAnswer(state, 'C4', 'piano', false)
      state = recordAnswer(state, 'C4', 'piano', false)
      state = recordAnswer(state, 'C4', 'piano', false) // streak = 0

      // Now 7 correct for 70% accuracy, streak = 7
      for (let i = 0; i < 7; i++) {
        state = recordAnswer(state, 'C4', 'piano', true)
      }

      const progress = state.noteProgress.C4.piano
      expect(getRollingAccuracy(progress)).toBe(0.7)
      expect(progress.streak).toBe(7)
      expect(isNoteMastered(progress)).toBe(false)
    })
  })

  describe('getWeightedNoteSelection()', () => {
    it('returns the only note when there is just one active', () => {
      const state = {
        ...createInitialState(),
        activeNotes: ['C4'],
      }

      expect(getWeightedNoteSelection(state)).toBe('C4')
    })

    it('throws error when no active notes', () => {
      const state = {
        ...createInitialState(),
        activeNotes: [],
      }

      expect(() => getWeightedNoteSelection(state)).toThrow(
        'No active notes to select from'
      )
    })

    it('never returns a note that is not active', () => {
      const state = createInitialState() // Only C4 and G4 are active

      for (let i = 0; i < 100; i++) {
        const selected = getWeightedNoteSelection(state)
        expect(['C4', 'G4']).toContain(selected)
      }
    })

    it('gives maximum weight to notes with zero attempts', () => {
      let state = createInitialState()

      // G4 has 10 correct answers (100% accuracy, weight = 0.1)
      for (let i = 0; i < 10; i++) {
        state = recordAnswer(state, 'G4', 'piano', true)
      }
      // C4 has zero attempts (weight = 1.0)

      // Run 100 times and count distribution
      const counts = { C4: 0, G4: 0 }
      for (let i = 0; i < 100; i++) {
        counts[getWeightedNoteSelection(state)]++
      }

      // C4 should be selected much more often (weight 1.0 vs 0.1)
      // With weights 1.0 and 0.1, C4 should get ~91% of selections
      expect(counts.C4).toBeGreaterThan(counts.G4)
      expect(counts.C4).toBeGreaterThan(70) // At least 70% should be C4
    })

    it('favors lower-accuracy notes', () => {
      let state = createInitialState()

      // C4: 8 correct, 2 wrong = 80% accuracy (weight = 0.2)
      for (let i = 0; i < 8; i++) {
        state = recordAnswer(state, 'C4', 'piano', true)
      }
      for (let i = 0; i < 2; i++) {
        state = recordAnswer(state, 'C4', 'piano', false)
      }

      // G4: 2 correct, 8 wrong = 20% accuracy (weight = 0.8)
      for (let i = 0; i < 2; i++) {
        state = recordAnswer(state, 'G4', 'piano', true)
      }
      for (let i = 0; i < 8; i++) {
        state = recordAnswer(state, 'G4', 'piano', false)
      }

      // Run 100 times and check distribution
      const counts = { C4: 0, G4: 0 }
      for (let i = 0; i < 100; i++) {
        counts[getWeightedNoteSelection(state)]++
      }

      // G4 (weight 0.8) should be selected more than C4 (weight 0.2)
      // Expected: G4 ~80%, C4 ~20%
      expect(counts.G4).toBeGreaterThan(counts.C4)
      expect(counts.G4).toBeGreaterThan(50) // At least 50% should be G4
    })

    it('gives mastered notes minimum weight but still selects them', () => {
      let state = createInitialState()

      // Both notes mastered (100% accuracy, weight = 0.1 each)
      for (let i = 0; i < 10; i++) {
        state = recordAnswer(state, 'C4', 'piano', true)
        state = recordAnswer(state, 'G4', 'piano', true)
      }

      // Run 100 times - both should appear (roughly equal with same weight)
      const counts = { C4: 0, G4: 0 }
      for (let i = 0; i < 100; i++) {
        counts[getWeightedNoteSelection(state)]++
      }

      // Both should be selected (not zero)
      expect(counts.C4).toBeGreaterThan(0)
      expect(counts.G4).toBeGreaterThan(0)
    })

    it('distributes selections according to inverse accuracy weights', () => {
      let state = createInitialState()

      // C4: 50% accuracy (weight = 0.5)
      for (let i = 0; i < 5; i++) {
        state = recordAnswer(state, 'C4', 'piano', true)
        state = recordAnswer(state, 'C4', 'piano', false)
      }

      // G4: 0% accuracy (weight = 1.0)
      for (let i = 0; i < 10; i++) {
        state = recordAnswer(state, 'G4', 'piano', false)
      }

      // Total weight = 1.5, G4 should get ~67%, C4 ~33%
      const counts = { C4: 0, G4: 0 }
      for (let i = 0; i < 300; i++) {
        counts[getWeightedNoteSelection(state)]++
      }

      // G4 should be selected roughly twice as often as C4
      const ratio = counts.G4 / counts.C4
      expect(ratio).toBeGreaterThan(1.3) // Allow some variance
      expect(ratio).toBeLessThan(3.0)
    })
  })

  describe('getNoteOverallAccuracy()', () => {
    it('returns 0 for a note with no progress', () => {
      const state = createInitialState()

      expect(getNoteOverallAccuracy(state, 'D4')).toBe(0)
    })

    it('returns accuracy for a single instrument', () => {
      let state = createInitialState()

      // 8 correct, 2 wrong = 80%
      for (let i = 0; i < 8; i++) {
        state = recordAnswer(state, 'C4', 'piano', true)
      }
      for (let i = 0; i < 2; i++) {
        state = recordAnswer(state, 'C4', 'piano', false)
      }

      expect(getNoteOverallAccuracy(state, 'C4')).toBe(0.8)
    })
  })

  describe('canAddNewNote()', () => {
    it('returns false when notes are not mastered', () => {
      const state = createInitialState()

      expect(canAddNewNote(state)).toBe(false)
    })

    it('returns true when all notes are mastered', () => {
      let state = createInitialState()

      // Master both C4 and G4
      for (let i = 0; i < 10; i++) {
        state = recordAnswer(state, 'C4', 'piano', true)
        state = recordAnswer(state, 'G4', 'piano', true)
      }

      expect(canAddNewNote(state)).toBe(true)
    })

    it('returns false when max active notes reached', () => {
      let state = createInitialState()

      // Add notes up to max
      for (let i = 2; i < MASTERY_THRESHOLDS.maxActiveNotes; i++) {
        state = addNextNote(state)
      }

      // Master all notes
      for (const note of state.activeNotes) {
        for (let i = 0; i < 10; i++) {
          state = recordAnswer(state, note, 'piano', true)
        }
      }

      // Should be at max now
      expect(state.activeNotes.length).toBe(MASTERY_THRESHOLDS.maxActiveNotes)
      expect(canAddNewNote(state)).toBe(false)
    })
  })

  describe('addNextNote()', () => {
    it('adds the next note from introduction order', () => {
      let state = createInitialState()

      state = addNextNote(state)

      expect(state.activeNotes).toContain('D4') // Third note in order
      expect(state.activeNotes).toHaveLength(3)
    })

    it('initializes progress for the new note', () => {
      let state = createInitialState()

      state = addNextNote(state)

      expect(state.noteProgress.D4).toBeDefined()
      expect(state.noteProgress.D4.piano).toBeDefined()
      expect(state.noteProgress.D4.piano.attempts).toBe(0)
    })

    it('increments currentStage', () => {
      let state = createInitialState()

      expect(state.currentStage).toBe(1)

      state = addNextNote(state)
      expect(state.currentStage).toBe(2)

      state = addNextNote(state)
      expect(state.currentStage).toBe(3)
    })

    it('returns same state when all notes are active', () => {
      let state = createInitialState()

      // Add all notes
      for (let i = 0; i < NOTE_INTRODUCTION_ORDER.length; i++) {
        state = addNextNote(state)
      }

      const noteCount = state.activeNotes.length
      state = addNextNote(state) // Should be no-op

      expect(state.activeNotes.length).toBe(noteCount)
    })
  })

  describe('incrementSessions()', () => {
    it('increments session count', () => {
      let state = createInitialState()

      expect(state.sessionsPlayed).toBe(0)

      state = incrementSessions(state)
      expect(state.sessionsPlayed).toBe(1)

      state = incrementSessions(state)
      expect(state.sessionsPlayed).toBe(2)
    })

    it('does not mutate original state', () => {
      const state = createInitialState()
      const originalSessions = state.sessionsPlayed

      incrementSessions(state)

      expect(state.sessionsPlayed).toBe(originalSessions)
    })
  })
})
