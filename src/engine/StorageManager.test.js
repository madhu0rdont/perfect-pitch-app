import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  saveProgress,
  loadProgress,
  resetProgress,
  hasExistingProgress,
} from './StorageManager'

describe('StorageManager', () => {
  // Mock localStorage
  let mockStorage = {}

  const localStorageMock = {
    getItem: vi.fn((key) => mockStorage[key] ?? null),
    setItem: vi.fn((key, value) => {
      mockStorage[key] = value
    }),
    removeItem: vi.fn((key) => {
      delete mockStorage[key]
    }),
    clear: vi.fn(() => {
      mockStorage = {}
    }),
  }

  beforeEach(() => {
    // Clear mock storage and reset mocks
    mockStorage = {}
    vi.clearAllMocks()

    // Replace global localStorage
    Object.defineProperty(global, 'localStorage', {
      value: localStorageMock,
      writable: true,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('saveProgress()', () => {
    it('saves state to localStorage with correct key', () => {
      const state = { activeNotes: ['C4', 'G4'], sessionsPlayed: 5 }

      saveProgress(state)

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'progress-state',
        expect.any(String)
      )
    })

    it('serializes state to JSON', () => {
      const state = { activeNotes: ['C4', 'G4'], sessionsPlayed: 5 }

      saveProgress(state)

      const savedValue = localStorageMock.setItem.mock.calls[0][1]
      expect(JSON.parse(savedValue)).toEqual(state)
    })

    it('returns true on successful save', () => {
      const state = { activeNotes: ['C4'] }

      const result = saveProgress(state)

      expect(result).toBe(true)
    })

    it('returns false when localStorage throws', () => {
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('QuotaExceededError')
      })
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const result = saveProgress({ test: 'data' })

      expect(result).toBe(false)
      expect(warnSpy).toHaveBeenCalledWith(
        'StorageManager: Failed to save progress',
        expect.any(Error)
      )
      warnSpy.mockRestore()
    })

    it('handles complex nested state', () => {
      const complexState = {
        noteProgress: {
          C4: {
            piano: { attempts: 10, correct: 8, streak: 3, recentResults: [true, true, false] },
          },
          G4: {
            piano: { attempts: 5, correct: 5, streak: 5, recentResults: [true, true, true] },
          },
        },
        activeNotes: ['C4', 'G4'],
        activeInstruments: ['piano'],
        currentStage: 1,
        sessionsPlayed: 3,
      }

      saveProgress(complexState)

      const savedValue = localStorageMock.setItem.mock.calls[0][1]
      expect(JSON.parse(savedValue)).toEqual(complexState)
    })
  })

  describe('loadProgress()', () => {
    it('returns null when no saved progress exists', () => {
      const result = loadProgress()

      expect(result).toBeNull()
    })

    it('returns parsed state when progress exists', () => {
      const savedState = { activeNotes: ['C4', 'G4'], sessionsPlayed: 5 }
      mockStorage['progress-state'] = JSON.stringify(savedState)

      const result = loadProgress()

      expect(result).toEqual(savedState)
    })

    it('returns null when JSON parsing fails', () => {
      mockStorage['progress-state'] = 'not valid json {'
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const result = loadProgress()

      expect(result).toBeNull()
      expect(warnSpy).toHaveBeenCalledWith(
        'StorageManager: Failed to load progress',
        expect.any(Error)
      )
      warnSpy.mockRestore()
    })

    it('returns null when localStorage throws', () => {
      localStorageMock.getItem.mockImplementationOnce(() => {
        throw new Error('SecurityError')
      })
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const result = loadProgress()

      expect(result).toBeNull()
      warnSpy.mockRestore()
    })

    it('preserves complex nested data types', () => {
      const complexState = {
        noteProgress: {
          C4: {
            piano: { attempts: 10, correct: 8, streak: 3, recentResults: [true, false, true] },
          },
        },
        activeNotes: ['C4', 'G4', 'D4'],
        activeInstruments: ['piano'],
        currentStage: 2,
        sessionsPlayed: 10,
      }
      mockStorage['progress-state'] = JSON.stringify(complexState)

      const result = loadProgress()

      expect(result).toEqual(complexState)
      expect(result.noteProgress.C4.piano.recentResults).toEqual([true, false, true])
    })
  })

  describe('save/load roundtrip', () => {
    it('preserves data through save and load cycle', () => {
      const originalState = {
        noteProgress: {
          C4: {
            piano: { attempts: 15, correct: 12, streak: 4, recentResults: [true, true, true, true] },
          },
          G4: {
            piano: { attempts: 10, correct: 7, streak: 0, recentResults: [false, true, true] },
          },
        },
        activeNotes: ['C4', 'G4'],
        activeInstruments: ['piano'],
        currentStage: 1,
        sessionsPlayed: 7,
      }

      saveProgress(originalState)
      const loadedState = loadProgress()

      expect(loadedState).toEqual(originalState)
    })

    it('preserves boolean arrays correctly', () => {
      const state = {
        noteProgress: {
          C4: {
            piano: {
              recentResults: [true, false, true, false, true, true, true, false, true, true],
            },
          },
        },
      }

      saveProgress(state)
      const loaded = loadProgress()

      expect(loaded.noteProgress.C4.piano.recentResults).toEqual(
        state.noteProgress.C4.piano.recentResults
      )
      expect(loaded.noteProgress.C4.piano.recentResults[0]).toBe(true)
      expect(loaded.noteProgress.C4.piano.recentResults[1]).toBe(false)
    })

    it('preserves number types correctly', () => {
      const state = {
        sessionsPlayed: 42,
        currentStage: 3,
        noteProgress: {
          C4: { piano: { attempts: 100, correct: 80, streak: 5 } },
        },
      }

      saveProgress(state)
      const loaded = loadProgress()

      expect(typeof loaded.sessionsPlayed).toBe('number')
      expect(loaded.sessionsPlayed).toBe(42)
      expect(loaded.noteProgress.C4.piano.attempts).toBe(100)
    })
  })

  describe('resetProgress()', () => {
    it('removes the progress key from storage', () => {
      mockStorage['progress-state'] = JSON.stringify({ test: 'data' })

      resetProgress()

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('progress-state')
    })

    it('returns true on successful reset', () => {
      const result = resetProgress()

      expect(result).toBe(true)
    })

    it('returns false when localStorage throws', () => {
      localStorageMock.removeItem.mockImplementationOnce(() => {
        throw new Error('SecurityError')
      })
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const result = resetProgress()

      expect(result).toBe(false)
      expect(warnSpy).toHaveBeenCalledWith(
        'StorageManager: Failed to reset progress',
        expect.any(Error)
      )
      warnSpy.mockRestore()
    })

    it('makes loadProgress return null after reset', () => {
      // Save some progress
      mockStorage['progress-state'] = JSON.stringify({ sessionsPlayed: 5 })
      expect(loadProgress()).not.toBeNull()

      // Reset
      resetProgress()

      // Should be null now
      expect(loadProgress()).toBeNull()
    })
  })

  describe('hasExistingProgress()', () => {
    it('returns false when no progress exists', () => {
      const result = hasExistingProgress()

      expect(result).toBe(false)
    })

    it('returns true when progress exists', () => {
      mockStorage['progress-state'] = JSON.stringify({ test: 'data' })

      const result = hasExistingProgress()

      expect(result).toBe(true)
    })

    it('returns false when localStorage throws', () => {
      localStorageMock.getItem.mockImplementationOnce(() => {
        throw new Error('SecurityError')
      })
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const result = hasExistingProgress()

      expect(result).toBe(false)
      warnSpy.mockRestore()
    })

    it('returns true even for empty object', () => {
      mockStorage['progress-state'] = '{}'

      const result = hasExistingProgress()

      expect(result).toBe(true)
    })

    it('does not parse the JSON (quick check)', () => {
      // Even invalid JSON should return true (key exists)
      mockStorage['progress-state'] = 'invalid json'

      const result = hasExistingProgress()

      expect(result).toBe(true)
    })
  })

  describe('error handling in private browsing', () => {
    it('handles complete localStorage unavailability gracefully', () => {
      // Simulate private browsing where localStorage throws on any access
      const throwingStorage = {
        getItem: vi.fn(() => {
          throw new Error('Access denied')
        }),
        setItem: vi.fn(() => {
          throw new Error('Access denied')
        }),
        removeItem: vi.fn(() => {
          throw new Error('Access denied')
        }),
      }

      Object.defineProperty(global, 'localStorage', {
        value: throwingStorage,
        writable: true,
      })

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      // All operations should fail gracefully
      expect(saveProgress({ test: 'data' })).toBe(false)
      expect(loadProgress()).toBeNull()
      expect(resetProgress()).toBe(false)
      expect(hasExistingProgress()).toBe(false)

      warnSpy.mockRestore()
    })
  })
})
