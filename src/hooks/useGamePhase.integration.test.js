import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useGamePhase } from './useGamePhase'
import { audioEngine } from '../audio'
import * as StorageManager from '../engine/StorageManager'
import * as ProgressTracker from '../engine/ProgressTracker'
import { PHASES } from '../engine/PhaseManager'

// Mock the audio engine
vi.mock('../audio', () => ({
  audioEngine: {
    playNote: vi.fn(),
    playReward: vi.fn(),
  },
}))

// Mock storage manager
vi.mock('../engine/StorageManager', () => ({
  loadProgress: vi.fn(),
  saveProgress: vi.fn(),
}))

describe('useGamePhase instrument integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    StorageManager.loadProgress.mockReturnValue(null)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('EXPLORE phase instrument cycling', () => {
    it('cycles through available instruments on repeated taps of the same circle', () => {
      // Create a progress state where C4 is eligible on piano and violin
      const masteredProgress = {
        activeNotes: ['C4', 'G4'],
        activeInstruments: ['piano'],
        noteProgress: {
          C4: {
            piano: {
              attempts: 10,
              correct: 10,
              streak: 10,
              recentResults: Array(10).fill(true),
            },
          },
          G4: {
            piano: {
              attempts: 10,
              correct: 10,
              streak: 10,
              recentResults: Array(10).fill(true),
            },
          },
        },
        currentStage: 1,
        sessionsPlayed: 0,
        introducedCombos: ['C4:piano', 'G4:piano'],
      }
      StorageManager.loadProgress.mockReturnValue(masteredProgress)

      const { result } = renderHook(() => useGamePhase())

      expect(result.current.phase).toBe(PHASES.LISTEN)

      // Advance through LISTEN phase (2 notes * 1500ms + completion)
      act(() => {
        vi.advanceTimersByTime(1500) // First note
      })
      act(() => {
        vi.advanceTimersByTime(1500) // Second note
      })
      act(() => {
        vi.advanceTimersByTime(1500) // Complete listen, start contrast
      })
      // Skip contrast notes (C4 and G4 both have violin eligible)
      act(() => {
        vi.advanceTimersByTime(1500) // C4 contrast
      })
      act(() => {
        vi.advanceTimersByTime(1500) // G4 contrast
      })

      expect(result.current.phase).toBe(PHASES.EXPLORE)

      // Clear mock to track explore taps
      audioEngine.playNote.mockClear()

      // First tap on C4 should play piano
      act(() => {
        result.current.onCircleTap('C4')
      })
      expect(audioEngine.playNote).toHaveBeenLastCalledWith('C4', 'piano')

      // Second tap on C4 should play violin (C4 is mastered on piano, so violin is eligible)
      act(() => {
        result.current.onCircleTap('C4')
      })
      expect(audioEngine.playNote).toHaveBeenLastCalledWith('C4', 'violin')

      // Third tap on C4 should loop back to piano
      act(() => {
        result.current.onCircleTap('C4')
      })
      expect(audioEngine.playNote).toHaveBeenLastCalledWith('C4', 'piano')
    })

    it('plays only piano for notes not yet mastered', () => {
      // Fresh progress - only piano eligible
      StorageManager.loadProgress.mockReturnValue(null)

      const { result } = renderHook(() => useGamePhase())

      // Advance through LISTEN phase
      act(() => {
        vi.advanceTimersByTime(1500) // First note
      })
      act(() => {
        vi.advanceTimersByTime(1500) // Second note
      })
      act(() => {
        vi.advanceTimersByTime(1500) // Complete
      })

      expect(result.current.phase).toBe(PHASES.EXPLORE)

      audioEngine.playNote.mockClear()

      // Multiple taps should all be piano
      act(() => {
        result.current.onCircleTap('C4')
      })
      expect(audioEngine.playNote).toHaveBeenLastCalledWith('C4', 'piano')

      act(() => {
        result.current.onCircleTap('C4')
      })
      expect(audioEngine.playNote).toHaveBeenLastCalledWith('C4', 'piano')
    })

    it('each note has independent instrument cycling', () => {
      // Create a progress state where both notes are eligible on piano and violin
      const masteredProgress = {
        activeNotes: ['C4', 'G4'],
        activeInstruments: ['piano'],
        noteProgress: {
          C4: {
            piano: {
              attempts: 10,
              correct: 10,
              streak: 10,
              recentResults: Array(10).fill(true),
            },
          },
          G4: {
            piano: {
              attempts: 10,
              correct: 10,
              streak: 10,
              recentResults: Array(10).fill(true),
            },
          },
        },
        currentStage: 1,
        sessionsPlayed: 0,
        introducedCombos: ['C4:piano', 'G4:piano'],
      }
      StorageManager.loadProgress.mockReturnValue(masteredProgress)

      const { result } = renderHook(() => useGamePhase())

      // Advance through LISTEN phase (2 notes * 1500ms + completion)
      act(() => {
        vi.advanceTimersByTime(1500) // First note
      })
      act(() => {
        vi.advanceTimersByTime(1500) // Second note
      })
      act(() => {
        vi.advanceTimersByTime(1500) // Complete listen, start contrast
      })
      // Skip contrast notes (C4 and G4 both have violin eligible)
      act(() => {
        vi.advanceTimersByTime(1500) // C4 contrast
      })
      act(() => {
        vi.advanceTimersByTime(1500) // G4 contrast - completes
      })

      expect(result.current.phase).toBe(PHASES.EXPLORE)

      audioEngine.playNote.mockClear()

      // Tap C4 twice (piano -> violin)
      act(() => {
        result.current.onCircleTap('C4')
      })
      expect(audioEngine.playNote).toHaveBeenLastCalledWith('C4', 'piano')

      act(() => {
        result.current.onCircleTap('C4')
      })
      expect(audioEngine.playNote).toHaveBeenLastCalledWith('C4', 'violin')

      // Tap G4 - should start at piano (independent of C4's cycling)
      act(() => {
        result.current.onCircleTap('G4')
      })
      expect(audioEngine.playNote).toHaveBeenLastCalledWith('G4', 'piano')
    })
  })

  describe('QUIZ phase instrument selection', () => {
    it('stores currentInstrument in game state for quiz questions', () => {
      const masteredProgress = {
        activeNotes: ['C4', 'G4'],
        activeInstruments: ['piano'],
        noteProgress: {
          C4: {
            piano: {
              attempts: 10,
              correct: 10,
              streak: 10,
              recentResults: Array(10).fill(true),
            },
          },
          G4: {
            piano: {
              attempts: 5,
              correct: 2,
              streak: 0,
              recentResults: [true, false, true, false, false],
            },
          },
        },
        currentStage: 1,
        sessionsPlayed: 0,
        introducedCombos: ['C4:piano', 'G4:piano'],
      }
      StorageManager.loadProgress.mockReturnValue(masteredProgress)

      const { result } = renderHook(() => useGamePhase())

      // Advance through LISTEN phase (2 notes + completion + 1 contrast for C4)
      act(() => {
        vi.advanceTimersByTime(1500) // First note
      })
      act(() => {
        vi.advanceTimersByTime(1500) // Second note
      })
      act(() => {
        vi.advanceTimersByTime(1500) // Complete, start contrast
      })
      act(() => {
        vi.advanceTimersByTime(1500) // C4 contrast completes
      })

      // Advance through EXPLORE timeout
      act(() => {
        vi.advanceTimersByTime(15000)
      })

      expect(result.current.phase).toBe(PHASES.QUIZ)

      // Quiz feedback should include instrument when answered
      const currentQuestion = result.current.currentQuestion

      act(() => {
        result.current.onCircleTap(currentQuestion)
      })

      // Check that quizFeedback includes instrument
      expect(result.current.quizFeedback).toBeDefined()
      expect(result.current.quizFeedback.instrument).toBeDefined()
      expect(['piano', 'violin', 'guitar-acoustic']).toContain(
        result.current.quizFeedback.instrument
      )
    })

    it('plays tapped note on same instrument as question', () => {
      const masteredProgress = {
        activeNotes: ['C4', 'G4'],
        activeInstruments: ['piano'],
        noteProgress: {
          C4: {
            piano: {
              attempts: 10,
              correct: 10,
              streak: 10,
              recentResults: Array(10).fill(true),
            },
          },
          G4: {
            piano: {
              attempts: 0,
              correct: 0,
              streak: 0,
              recentResults: [],
            },
          },
        },
        currentStage: 1,
        sessionsPlayed: 0,
        introducedCombos: ['C4:piano', 'G4:piano'],
      }
      StorageManager.loadProgress.mockReturnValue(masteredProgress)

      const { result } = renderHook(() => useGamePhase())

      // Advance through LISTEN phase (2 notes + completion + 1 contrast for C4)
      act(() => {
        vi.advanceTimersByTime(1500) // First note
      })
      act(() => {
        vi.advanceTimersByTime(1500) // Second note
      })
      act(() => {
        vi.advanceTimersByTime(1500) // Complete, start contrast
      })
      act(() => {
        vi.advanceTimersByTime(1500) // C4 contrast completes
      })

      // Advance through EXPLORE timeout
      act(() => {
        vi.advanceTimersByTime(15000)
      })

      expect(result.current.phase).toBe(PHASES.QUIZ)

      // Clear mocks after entering quiz
      audioEngine.playNote.mockClear()

      // Get the current question
      const currentQuestion = result.current.currentQuestion

      // Answer the question
      act(() => {
        result.current.onCircleTap(currentQuestion)
      })

      // The tap should play the note on an instrument
      expect(audioEngine.playNote).toHaveBeenCalled()
      const lastCall = audioEngine.playNote.mock.calls[0]
      expect(lastCall[0]).toBe(currentQuestion)
      expect(['piano', 'violin', 'guitar-acoustic']).toContain(lastCall[1])
    })
  })

  describe('LISTEN phase contrast playback', () => {
    it('plays notes with multiple instruments on newest instrument after piano sequence', () => {
      // Create a progress state where C4 is eligible on piano and violin
      const masteredProgress = {
        activeNotes: ['C4', 'G4'],
        activeInstruments: ['piano'],
        noteProgress: {
          C4: {
            piano: {
              attempts: 10,
              correct: 10,
              streak: 10,
              recentResults: Array(10).fill(true),
            },
          },
          G4: {
            piano: {
              attempts: 0,
              correct: 0,
              streak: 0,
              recentResults: [],
            },
          },
        },
        currentStage: 1,
        sessionsPlayed: 0,
        introducedCombos: ['C4:piano', 'G4:piano'],
      }
      StorageManager.loadProgress.mockReturnValue(masteredProgress)

      const { result } = renderHook(() => useGamePhase())

      expect(result.current.phase).toBe(PHASES.LISTEN)

      // Clear mocks after initial setup
      audioEngine.playNote.mockClear()

      // Play first note (C4 on piano) - already played on mount
      act(() => {
        vi.advanceTimersByTime(1500) // Advance to second note
      })

      // Play second note (G4 on piano)
      act(() => {
        vi.advanceTimersByTime(1500) // Complete regular sequence
      })

      // After regular sequence completes, C4 should play on violin (contrast)
      act(() => {
        vi.advanceTimersByTime(1500) // Contrast note
      })

      // Check that violin was played for C4 (contrast note)
      const calls = audioEngine.playNote.mock.calls
      const violinCalls = calls.filter((call) => call[1] === 'violin')
      expect(violinCalls.length).toBeGreaterThan(0)
      expect(violinCalls[0][0]).toBe('C4') // C4 played on violin
    })

    it('does not play contrast for notes with only piano eligible', () => {
      // Fresh progress - only piano eligible for all notes
      StorageManager.loadProgress.mockReturnValue(null)

      const { result } = renderHook(() => useGamePhase())

      expect(result.current.phase).toBe(PHASES.LISTEN)

      audioEngine.playNote.mockClear()

      // Advance through LISTEN phase
      act(() => {
        vi.advanceTimersByTime(1500) // First note
      })
      act(() => {
        vi.advanceTimersByTime(1500) // Second note
      })
      act(() => {
        vi.advanceTimersByTime(1500) // Complete - should go straight to explore
      })

      // Should now be in EXPLORE (no contrast notes needed)
      expect(result.current.phase).toBe(PHASES.EXPLORE)

      // All notes should have been played on piano only
      const calls = audioEngine.playNote.mock.calls
      const nonPianoCalls = calls.filter((call) => call[1] !== 'piano')
      expect(nonPianoCalls.length).toBe(0)
    })
  })
})
