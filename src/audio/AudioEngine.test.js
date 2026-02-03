import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Create mock instances
const mockSamplerInstance = {
  toDestination: vi.fn().mockReturnThis(),
  triggerAttackRelease: vi.fn(),
  releaseAll: vi.fn(),
  dispose: vi.fn(),
}

const mockFMSynthInstance = {
  toDestination: vi.fn().mockReturnThis(),
  triggerAttackRelease: vi.fn(),
  triggerRelease: vi.fn(),
  dispose: vi.fn(),
}

const mockPluckSynthInstance = {
  toDestination: vi.fn().mockReturnThis(),
  triggerAttack: vi.fn(),
  triggerRelease: vi.fn(),
  dispose: vi.fn(),
}

// Mock Tone.js before importing AudioEngine
vi.mock('tone', () => {
  // Create mock classes
  class MockSampler {
    constructor({ onload }) {
      Object.assign(this, mockSamplerInstance)
      setTimeout(() => onload?.(), 0)
    }
  }

  class MockFMSynth {
    constructor() {
      Object.assign(this, mockFMSynthInstance)
    }
  }

  class MockPluckSynth {
    constructor() {
      Object.assign(this, mockPluckSynthInstance)
    }
  }

  return {
    start: vi.fn().mockResolvedValue(undefined),
    Sampler: MockSampler,
    FMSynth: MockFMSynth,
    PluckSynth: MockPluckSynth,
    Synth: class MockSynth {
      constructor() {
        this.toDestination = vi.fn().mockReturnThis()
        this.triggerAttackRelease = vi.fn()
        this.dispose = vi.fn()
      }
    },
    Frequency: vi.fn().mockReturnValue({
      toFrequency: vi.fn().mockReturnValue(261.63),
    }),
    now: vi.fn().mockReturnValue(0),
  }
})

// Import after mocking
import { AudioEngine } from './AudioEngine'
import * as Tone from 'tone'

describe('AudioEngine', () => {
  let engine

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset mock methods
    mockSamplerInstance.toDestination.mockClear().mockReturnThis()
    mockSamplerInstance.triggerAttackRelease.mockClear()
    mockSamplerInstance.releaseAll.mockClear()
    mockSamplerInstance.dispose.mockClear()

    mockFMSynthInstance.toDestination.mockClear().mockReturnThis()
    mockFMSynthInstance.triggerAttackRelease.mockClear()
    mockFMSynthInstance.triggerRelease.mockClear()
    mockFMSynthInstance.dispose.mockClear()

    mockPluckSynthInstance.toDestination.mockClear().mockReturnThis()
    mockPluckSynthInstance.triggerAttack.mockClear()
    mockPluckSynthInstance.triggerRelease.mockClear()
    mockPluckSynthInstance.dispose.mockClear()

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
    it('loads piano instrument using Sampler', async () => {
      await engine.loadInstrument('piano')
      const status = engine.getLoadingStatus()
      expect(status.loaded).toContain('piano')
      expect(status.loading).not.toContain('piano')
    })

    it('loads violin instrument using FMSynth', async () => {
      await engine.loadInstrument('violin')
      const status = engine.getLoadingStatus()
      expect(status.loaded).toContain('violin')
    })

    it('loads guitar-acoustic instrument using PluckSynth', async () => {
      await engine.loadInstrument('guitar-acoustic')
      const status = engine.getLoadingStatus()
      expect(status.loaded).toContain('guitar-acoustic')
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

      await expect(engine.playNote('C4', 'piano')).resolves.toBeUndefined()

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('not loaded')
      )
      warnSpy.mockRestore()
    })

    it('logs warning when playing on unloaded instrument', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      await engine.playNote('C4', 'violin')

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("instrument 'violin' not loaded")
      )
      warnSpy.mockRestore()
    })

    it('plays note on piano (sampler)', async () => {
      await engine.loadInstrument('piano')
      await engine.playNote('C4', 'piano')

      expect(mockSamplerInstance.triggerAttackRelease).toHaveBeenCalledWith(
        'C4',
        '4n'
      )
    })

    it('plays note on violin (FMSynth)', async () => {
      await engine.loadInstrument('violin')
      await engine.playNote('C4', 'violin')

      // FMSynth uses frequency and different call signature
      expect(mockFMSynthInstance.triggerAttackRelease).toHaveBeenCalled()
    })

    it('plays note on guitar (PluckSynth)', async () => {
      await engine.loadInstrument('guitar-acoustic')
      await engine.playNote('C4', 'guitar-acoustic')

      // PluckSynth uses triggerAttack
      expect(mockPluckSynthInstance.triggerAttack).toHaveBeenCalledWith(
        'C4',
        expect.any(Number)
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

    it('shows multiple loaded instruments', async () => {
      await engine.loadInstrument('piano')
      await engine.loadInstrument('violin')
      await engine.loadInstrument('guitar-acoustic')

      const status = engine.getLoadingStatus()
      expect(status.loaded).toContain('piano')
      expect(status.loaded).toContain('violin')
      expect(status.loaded).toContain('guitar-acoustic')
    })
  })

  describe('getAvailableInstruments()', () => {
    it('returns list of all available instruments', () => {
      const instruments = engine.getAvailableInstruments()
      expect(instruments).toContain('piano')
      expect(instruments).toContain('violin')
      expect(instruments).toContain('guitar-acoustic')
    })
  })

  describe('stopAll()', () => {
    it('calls releaseAll on sampler instruments', async () => {
      await engine.loadInstrument('piano')
      engine.stopAll()

      expect(mockSamplerInstance.releaseAll).toHaveBeenCalled()
    })

    it('calls triggerRelease on synth instruments', async () => {
      await engine.loadInstrument('violin')
      engine.stopAll()

      expect(mockFMSynthInstance.triggerRelease).toHaveBeenCalled()
    })

    it('does not throw when no instruments loaded', () => {
      expect(() => engine.stopAll()).not.toThrow()
    })
  })

  describe('dispose()', () => {
    it('disposes all instruments', async () => {
      await engine.loadInstrument('piano')
      await engine.loadInstrument('violin')
      engine.dispose()

      expect(mockSamplerInstance.dispose).toHaveBeenCalled()
      expect(mockFMSynthInstance.dispose).toHaveBeenCalled()
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
