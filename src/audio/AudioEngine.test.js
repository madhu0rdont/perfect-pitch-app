import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Create mock sampler instance
const mockSamplerInstance = {
  toDestination: vi.fn().mockReturnThis(),
  triggerAttackRelease: vi.fn(),
  releaseAll: vi.fn(),
  dispose: vi.fn(),
}

// Mock Tone.js before importing AudioEngine
vi.mock('tone', () => {
  // Create a mock class for Sampler
  class MockSampler {
    constructor({ onload }) {
      Object.assign(this, mockSamplerInstance)
      // Simulate async loading
      setTimeout(() => onload?.(), 0)
    }
  }

  return {
    start: vi.fn().mockResolvedValue(undefined),
    Sampler: MockSampler,
  }
})

// Import after mocking
import { AudioEngine } from './AudioEngine'
import * as Tone from 'tone'

describe('AudioEngine', () => {
  let engine

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset mock sampler methods
    mockSamplerInstance.toDestination.mockClear().mockReturnThis()
    mockSamplerInstance.triggerAttackRelease.mockClear()
    mockSamplerInstance.releaseAll.mockClear()
    mockSamplerInstance.dispose.mockClear()
    engine = new AudioEngine()
  })

  afterEach(() => {
    engine.dispose()
  })

  describe('init()', () => {
    it('calls Tone.start() on first init', async () => {
      await engine.init()
      expect(Tone.start).toHaveBeenCalledTimes(1)
    })

    it('only initializes once when called multiple times', async () => {
      await engine.init()
      await engine.init()
      await engine.init()
      expect(Tone.start).toHaveBeenCalledTimes(1)
    })

    it('sets initialized flag to true', async () => {
      expect(engine.isInitialized()).toBe(false)
      await engine.init()
      expect(engine.isInitialized()).toBe(true)
    })
  })

  describe('loadInstrument()', () => {
    it('loads piano instrument', async () => {
      await engine.loadInstrument('piano')
      const status = engine.getLoadingStatus()
      expect(status.loaded).toContain('piano')
      expect(status.loading).not.toContain('piano')
    })

    it('does not reload already loaded instrument', async () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      await engine.loadInstrument('piano')
      await engine.loadInstrument('piano')

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('already loaded')
      )
      logSpy.mockRestore()
    })

    it('warns for unsupported instruments', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      await engine.loadInstrument('flute')
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('not yet implemented')
      )
      warnSpy.mockRestore()
    })

    it('updates loading status correctly after load completes', async () => {
      await engine.loadInstrument('piano')

      const status = engine.getLoadingStatus()
      expect(status.loaded).toContain('piano')
      expect(status.loading).not.toContain('piano')
    })
  })

  describe('playNote()', () => {
    it('does not throw when instrument is not loaded', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      // Should not throw
      await expect(engine.playNote('C4', 'piano')).resolves.toBeUndefined()

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('not loaded')
      )
      warnSpy.mockRestore()
    })

    it('logs warning when playing on unloaded instrument', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      await engine.playNote('C4', 'xylophone')

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("instrument 'xylophone' not loaded")
      )
      warnSpy.mockRestore()
    })

    it('plays note on loaded instrument', async () => {
      await engine.loadInstrument('piano')
      await engine.playNote('C4', 'piano')

      expect(mockSamplerInstance.triggerAttackRelease).toHaveBeenCalledWith(
        'C4',
        '4n'
      )
    })

    it('accepts custom duration', async () => {
      await engine.loadInstrument('piano')
      await engine.playNote('G4', 'piano', '2n')

      expect(mockSamplerInstance.triggerAttackRelease).toHaveBeenCalledWith(
        'G4',
        '2n'
      )
    })
  })

  describe('getLoadingStatus()', () => {
    it('returns empty arrays initially', () => {
      const status = engine.getLoadingStatus()
      expect(status.loaded).toEqual([])
      expect(status.loading).toEqual([])
    })

    it('shows loaded instruments', async () => {
      await engine.loadInstrument('piano')
      const status = engine.getLoadingStatus()
      expect(status.loaded).toContain('piano')
    })
  })

  describe('stopAll()', () => {
    it('calls releaseAll on all instruments', async () => {
      await engine.loadInstrument('piano')
      engine.stopAll()

      expect(mockSamplerInstance.releaseAll).toHaveBeenCalled()
    })

    it('does not throw when no instruments loaded', () => {
      expect(() => engine.stopAll()).not.toThrow()
    })
  })

  describe('dispose()', () => {
    it('disposes all instruments', async () => {
      await engine.loadInstrument('piano')
      engine.dispose()

      expect(mockSamplerInstance.dispose).toHaveBeenCalled()
    })

    it('clears all state', async () => {
      await engine.init()
      await engine.loadInstrument('piano')
      engine.dispose()

      expect(engine.isInitialized()).toBe(false)
      expect(engine.getLoadingStatus().loaded).toEqual([])
    })
  })
})

describe('audioEngine singleton', () => {
  it('exports a default singleton instance', async () => {
    const { default: audioEngine } = await import('./AudioEngine')
    expect(audioEngine).toBeInstanceOf(AudioEngine)
  })

  it('returns same instance on multiple imports', async () => {
    const { default: instance1 } = await import('./AudioEngine')
    const { default: instance2 } = await import('./AudioEngine')
    expect(instance1).toBe(instance2)
  })
})
