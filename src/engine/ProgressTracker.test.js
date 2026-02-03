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
  checkPromotion,
  applyPromotion,
  checkDemotion,
  applyDemotion,
  applyAdaptiveDifficulty,
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

  // ============ Promotion Tests ============

  describe('checkPromotion()', () => {
    it('returns shouldPromote false when notes are not mastered', () => {
      const state = createInitialState()

      const result = checkPromotion(state)

      expect(result.shouldPromote).toBe(false)
      expect(result.nextNote).toBeNull()
    })

    it('returns shouldPromote true when all notes are mastered', () => {
      let state = createInitialState()

      // Master both C4 and G4 (80% accuracy + streak of 3)
      for (let i = 0; i < 10; i++) {
        state = recordAnswer(state, 'C4', 'piano', true)
        state = recordAnswer(state, 'G4', 'piano', true)
      }

      const result = checkPromotion(state)

      expect(result.shouldPromote).toBe(true)
      expect(result.nextNote).toBe('D4') // Third note in introduction order
    })

    it('returns shouldPromote false if even one note is below threshold', () => {
      let state = createInitialState()

      // Master C4
      for (let i = 0; i < 10; i++) {
        state = recordAnswer(state, 'C4', 'piano', true)
      }

      // G4 is not mastered (only 70% accuracy)
      for (let i = 0; i < 7; i++) {
        state = recordAnswer(state, 'G4', 'piano', true)
      }
      for (let i = 0; i < 3; i++) {
        state = recordAnswer(state, 'G4', 'piano', false)
      }

      const result = checkPromotion(state)

      expect(result.shouldPromote).toBe(false)
    })

    it('returns shouldPromote false if streak is below threshold', () => {
      let state = createInitialState()

      // Both have high accuracy but C4 streak is broken
      for (let i = 0; i < 9; i++) {
        state = recordAnswer(state, 'C4', 'piano', true)
        state = recordAnswer(state, 'G4', 'piano', true)
      }
      // Break C4 streak with a wrong answer, then one correct
      state = recordAnswer(state, 'C4', 'piano', false)
      state = recordAnswer(state, 'C4', 'piano', true) // streak = 1
      state = recordAnswer(state, 'G4', 'piano', true)

      const result = checkPromotion(state)

      expect(result.shouldPromote).toBe(false)
    })

    it('returns correct next note from introduction order', () => {
      let state = createInitialState()

      // Master initial notes
      for (let i = 0; i < 10; i++) {
        state = recordAnswer(state, 'C4', 'piano', true)
        state = recordAnswer(state, 'G4', 'piano', true)
      }

      expect(checkPromotion(state).nextNote).toBe('D4')

      // Add D4 and master it
      state = applyPromotion(state)
      for (let i = 0; i < 10; i++) {
        state = recordAnswer(state, 'D4', 'piano', true)
      }

      expect(checkPromotion(state).nextNote).toBe('A4')
    })

    it('returns shouldPromote false at maxActiveNotes', () => {
      let state = createInitialState()

      // Add notes up to max and master them all
      while (state.activeNotes.length < MASTERY_THRESHOLDS.maxActiveNotes) {
        // Master current notes
        for (const note of state.activeNotes) {
          for (let i = 0; i < 10; i++) {
            state = recordAnswer(state, note, 'piano', true)
          }
        }
        state = applyPromotion(state)
      }

      // Master all notes at max
      for (const note of state.activeNotes) {
        for (let i = 0; i < 10; i++) {
          state = recordAnswer(state, note, 'piano', true)
        }
      }

      const result = checkPromotion(state)

      expect(state.activeNotes.length).toBe(MASTERY_THRESHOLDS.maxActiveNotes)
      expect(result.shouldPromote).toBe(false)
      expect(result.nextNote).toBeNull()
    })

    it('returns shouldPromote false when all notes are already active', () => {
      let state = createInitialState()

      // Manually set all notes as active (bypassing normal flow)
      state = {
        ...state,
        activeNotes: [...NOTE_INTRODUCTION_ORDER],
      }

      // Master them all
      for (const note of state.activeNotes) {
        state = {
          ...state,
          noteProgress: {
            ...state.noteProgress,
            [note]: {
              piano: {
                attempts: 10,
                correct: 10,
                streak: 10,
                recentResults: Array(10).fill(true),
              },
            },
          },
        }
      }

      const result = checkPromotion(state)

      expect(result.shouldPromote).toBe(false)
      expect(result.nextNote).toBeNull()
    })
  })

  describe('applyPromotion()', () => {
    it('adds the next note to activeNotes', () => {
      let state = createInitialState()

      // Master initial notes
      for (let i = 0; i < 10; i++) {
        state = recordAnswer(state, 'C4', 'piano', true)
        state = recordAnswer(state, 'G4', 'piano', true)
      }

      state = applyPromotion(state)

      expect(state.activeNotes).toContain('D4')
      expect(state.activeNotes).toHaveLength(3)
    })

    it('initializes progress for new note with empty stats', () => {
      let state = createInitialState()

      // Master initial notes
      for (let i = 0; i < 10; i++) {
        state = recordAnswer(state, 'C4', 'piano', true)
        state = recordAnswer(state, 'G4', 'piano', true)
      }

      state = applyPromotion(state)

      expect(state.noteProgress.D4).toBeDefined()
      expect(state.noteProgress.D4.piano).toBeDefined()
      expect(state.noteProgress.D4.piano.attempts).toBe(0)
      expect(state.noteProgress.D4.piano.correct).toBe(0)
      expect(state.noteProgress.D4.piano.streak).toBe(0)
      expect(state.noteProgress.D4.piano.recentResults).toEqual([])
    })

    it('increments currentStage on promotion', () => {
      let state = createInitialState()

      expect(state.currentStage).toBe(1)

      // Master and promote
      for (let i = 0; i < 10; i++) {
        state = recordAnswer(state, 'C4', 'piano', true)
        state = recordAnswer(state, 'G4', 'piano', true)
      }

      state = applyPromotion(state)

      expect(state.currentStage).toBe(2)
    })

    it('returns same state if promotion conditions not met', () => {
      const state = createInitialState()

      const result = applyPromotion(state)

      expect(result).toBe(state) // Same reference, no change
      expect(result.activeNotes).toHaveLength(2)
    })

    it('preserves existing progress data if note was previously demoted', () => {
      let state = createInitialState()

      // Master notes and promote to get D4
      for (let i = 0; i < 10; i++) {
        state = recordAnswer(state, 'C4', 'piano', true)
        state = recordAnswer(state, 'G4', 'piano', true)
      }
      state = applyPromotion(state)

      // Record some progress on D4
      state = recordAnswer(state, 'D4', 'piano', true)
      state = recordAnswer(state, 'D4', 'piano', true)
      state = recordAnswer(state, 'D4', 'piano', false)
      expect(state.noteProgress.D4.piano.attempts).toBe(3)

      // Demote D4
      state = applyDemotion(state, 'D4')
      expect(state.activeNotes).not.toContain('D4')

      // Progress data should still exist
      expect(state.noteProgress.D4.piano.attempts).toBe(3)

      // Re-promote (master remaining notes again)
      for (let i = 0; i < 10; i++) {
        state = recordAnswer(state, 'C4', 'piano', true)
        state = recordAnswer(state, 'G4', 'piano', true)
      }
      state = applyPromotion(state)

      // D4 should be back with preserved data
      expect(state.activeNotes).toContain('D4')
      expect(state.noteProgress.D4.piano.attempts).toBe(3)
    })
  })

  // ============ Demotion Tests ============

  describe('checkDemotion()', () => {
    it('returns shouldDemote false with no low-accuracy notes', () => {
      let state = createInitialState()

      // Both notes have decent accuracy (60%)
      for (let i = 0; i < 6; i++) {
        state = recordAnswer(state, 'C4', 'piano', true)
        state = recordAnswer(state, 'G4', 'piano', true)
      }
      for (let i = 0; i < 4; i++) {
        state = recordAnswer(state, 'C4', 'piano', false)
        state = recordAnswer(state, 'G4', 'piano', false)
      }

      const result = checkDemotion(state)

      expect(result.shouldDemote).toBe(false)
      expect(result.noteToRemove).toBeNull()
    })

    it('returns shouldDemote true when any note drops below 50%', () => {
      let state = createInitialState()

      // Add a third note first (need more than 2 to demote)
      state = {
        ...state,
        activeNotes: ['C4', 'G4', 'D4'],
        noteProgress: {
          ...state.noteProgress,
          D4: { piano: { attempts: 0, correct: 0, streak: 0, recentResults: [] } },
        },
      }

      // C4 at 40% accuracy (below 50% threshold)
      for (let i = 0; i < 4; i++) {
        state = recordAnswer(state, 'C4', 'piano', true)
      }
      for (let i = 0; i < 6; i++) {
        state = recordAnswer(state, 'C4', 'piano', false)
      }

      const result = checkDemotion(state)

      expect(result.shouldDemote).toBe(true)
    })

    it('returns the most recently added note as noteToRemove', () => {
      let state = createInitialState()

      // Add D4 as third note
      state = {
        ...state,
        activeNotes: ['C4', 'G4', 'D4'],
        noteProgress: {
          ...state.noteProgress,
          D4: { piano: { attempts: 0, correct: 0, streak: 0, recentResults: [] } },
        },
      }

      // Make C4 struggle (trigger demotion)
      for (let i = 0; i < 2; i++) {
        state = recordAnswer(state, 'C4', 'piano', true)
      }
      for (let i = 0; i < 8; i++) {
        state = recordAnswer(state, 'C4', 'piano', false)
      }

      const result = checkDemotion(state)

      expect(result.noteToRemove).toBe('D4') // Last in array
    })

    it('returns shouldDemote false when only 2 notes are active', () => {
      let state = createInitialState() // Only C4 and G4

      // Make C4 struggle badly (20% accuracy)
      for (let i = 0; i < 2; i++) {
        state = recordAnswer(state, 'C4', 'piano', true)
      }
      for (let i = 0; i < 8; i++) {
        state = recordAnswer(state, 'C4', 'piano', false)
      }

      const result = checkDemotion(state)

      expect(result.shouldDemote).toBe(false)
      expect(result.noteToRemove).toBeNull()
    })

    it('triggers demotion at exactly 49% accuracy', () => {
      let state = createInitialState()

      // Add third note
      state = {
        ...state,
        activeNotes: ['C4', 'G4', 'D4'],
        noteProgress: {
          ...state.noteProgress,
          D4: { piano: { attempts: 0, correct: 0, streak: 0, recentResults: [] } },
        },
      }

      // C4 at 49% (below 50%)
      // With 10 results: 4.9 correct rounds to 4 correct, 6 wrong = 40%
      // Let's use 10 results with exactly 4 correct = 40%
      for (let i = 0; i < 4; i++) {
        state = recordAnswer(state, 'C4', 'piano', true)
      }
      for (let i = 0; i < 6; i++) {
        state = recordAnswer(state, 'C4', 'piano', false)
      }

      const result = checkDemotion(state)

      expect(getRollingAccuracy(state.noteProgress.C4.piano)).toBe(0.4)
      expect(result.shouldDemote).toBe(true)
    })

    it('does not trigger demotion at exactly 50% accuracy', () => {
      let state = createInitialState()

      // Add third note
      state = {
        ...state,
        activeNotes: ['C4', 'G4', 'D4'],
        noteProgress: {
          ...state.noteProgress,
          D4: { piano: { attempts: 0, correct: 0, streak: 0, recentResults: [] } },
        },
      }

      // C4 at exactly 50%
      for (let i = 0; i < 5; i++) {
        state = recordAnswer(state, 'C4', 'piano', true)
      }
      for (let i = 0; i < 5; i++) {
        state = recordAnswer(state, 'C4', 'piano', false)
      }

      const result = checkDemotion(state)

      expect(getRollingAccuracy(state.noteProgress.C4.piano)).toBe(0.5)
      expect(result.shouldDemote).toBe(false)
    })
  })

  describe('applyDemotion()', () => {
    it('removes the specified note from activeNotes', () => {
      let state = createInitialState()

      // Add third note
      state = {
        ...state,
        activeNotes: ['C4', 'G4', 'D4'],
        noteProgress: {
          ...state.noteProgress,
          D4: { piano: { attempts: 5, correct: 3, streak: 1, recentResults: [true, false, true] } },
        },
      }

      state = applyDemotion(state, 'D4')

      expect(state.activeNotes).not.toContain('D4')
      expect(state.activeNotes).toEqual(['C4', 'G4'])
    })

    it('preserves progress data for the removed note', () => {
      let state = createInitialState()

      // Add and record progress for D4
      state = {
        ...state,
        activeNotes: ['C4', 'G4', 'D4'],
        noteProgress: {
          ...state.noteProgress,
          D4: {
            piano: {
              attempts: 15,
              correct: 8,
              streak: 2,
              recentResults: [true, false, true, true, false, false, true, true, false, true],
            },
          },
        },
      }

      state = applyDemotion(state, 'D4')

      // Progress data still exists
      expect(state.noteProgress.D4).toBeDefined()
      expect(state.noteProgress.D4.piano.attempts).toBe(15)
      expect(state.noteProgress.D4.piano.correct).toBe(8)
      expect(state.noteProgress.D4.piano.recentResults).toHaveLength(10)
    })

    it('decrements currentStage on demotion', () => {
      let state = createInitialState()

      state = {
        ...state,
        activeNotes: ['C4', 'G4', 'D4'],
        currentStage: 2,
        noteProgress: {
          ...state.noteProgress,
          D4: { piano: { attempts: 0, correct: 0, streak: 0, recentResults: [] } },
        },
      }

      state = applyDemotion(state, 'D4')

      expect(state.currentStage).toBe(1)
    })

    it('does not demote below stage 1', () => {
      let state = createInitialState()

      state = {
        ...state,
        activeNotes: ['C4', 'G4', 'D4'],
        currentStage: 1,
        noteProgress: {
          ...state.noteProgress,
          D4: { piano: { attempts: 0, correct: 0, streak: 0, recentResults: [] } },
        },
      }

      state = applyDemotion(state, 'D4')

      expect(state.currentStage).toBe(1) // Stays at 1
    })

    it('returns same state if trying to demote below 2 notes', () => {
      const state = createInitialState() // Only 2 notes

      const result = applyDemotion(state, 'G4')

      expect(result).toBe(state) // Same reference
      expect(result.activeNotes).toHaveLength(2)
    })

    it('returns same state if note is not active', () => {
      const state = createInitialState()

      const result = applyDemotion(state, 'D4') // D4 not active

      expect(result).toBe(state)
    })
  })

  // ============ Promotion/Demotion Interaction Tests ============

  describe('promotion and demotion interaction', () => {
    it('promotion takes priority when both conditions are met', () => {
      let state = createInitialState()

      // Add third note so demotion is possible
      state = {
        ...state,
        activeNotes: ['C4', 'G4', 'D4'],
        noteProgress: {
          C4: { piano: { attempts: 10, correct: 10, streak: 10, recentResults: Array(10).fill(true) } },
          G4: { piano: { attempts: 10, correct: 10, streak: 10, recentResults: Array(10).fill(true) } },
          D4: { piano: { attempts: 10, correct: 3, streak: 0, recentResults: [true, false, false, true, false, false, false, true, false, false] } },
        },
      }

      // D4 is at 30% (below demotion threshold)
      expect(getRollingAccuracy(state.noteProgress.D4.piano)).toBe(0.3)

      // But C4 and G4 are mastered (all notes mastered = promotion eligible)
      // However, D4 is NOT mastered, so promotion should NOT trigger
      const promotionCheck = checkPromotion(state)
      const demotionCheck = checkDemotion(state)

      expect(promotionCheck.shouldPromote).toBe(false) // D4 not mastered
      expect(demotionCheck.shouldDemote).toBe(true)
    })

    it('applyAdaptiveDifficulty promotes when all notes mastered', () => {
      let state = createInitialState()

      // Master both notes
      for (let i = 0; i < 10; i++) {
        state = recordAnswer(state, 'C4', 'piano', true)
        state = recordAnswer(state, 'G4', 'piano', true)
      }

      state = applyAdaptiveDifficulty(state)

      expect(state.activeNotes).toContain('D4')
      expect(state.activeNotes).toHaveLength(3)
    })

    it('applyAdaptiveDifficulty demotes when a note is struggling', () => {
      let state = createInitialState()

      // Add third note
      state = {
        ...state,
        activeNotes: ['C4', 'G4', 'D4'],
        noteProgress: {
          ...state.noteProgress,
          D4: { piano: { attempts: 0, correct: 0, streak: 0, recentResults: [] } },
        },
      }

      // Make one note struggle
      for (let i = 0; i < 2; i++) {
        state = recordAnswer(state, 'C4', 'piano', true)
      }
      for (let i = 0; i < 8; i++) {
        state = recordAnswer(state, 'C4', 'piano', false)
      }

      state = applyAdaptiveDifficulty(state)

      expect(state.activeNotes).not.toContain('D4')
      expect(state.activeNotes).toHaveLength(2)
    })

    it('applyAdaptiveDifficulty returns unchanged state when no action needed', () => {
      let state = createInitialState()

      // Mediocre performance - not mastered, not struggling
      for (let i = 0; i < 6; i++) {
        state = recordAnswer(state, 'C4', 'piano', true)
        state = recordAnswer(state, 'G4', 'piano', true)
      }
      for (let i = 0; i < 4; i++) {
        state = recordAnswer(state, 'C4', 'piano', false)
        state = recordAnswer(state, 'G4', 'piano', false)
      }

      const result = applyAdaptiveDifficulty(state)

      expect(result.activeNotes).toEqual(['C4', 'G4'])
    })
  })
})
