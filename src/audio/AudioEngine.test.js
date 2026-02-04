import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Create mock instances
const mockSamplerInstance = {
  toDestination: vi.fn().mockReturnThis(),
  triggerAttackRelease: vi.fn(),
  releaseAll: vi.fn(),
  dispose: vi.fn(),
}

const mockSynthInstance = {
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

const mockNoiseSynthInstance = {
  toDestination: vi.fn().mockReturnThis(),
  connect: vi.fn().mockReturnThis(),
  disconnect: vi.fn().mockReturnThis(),
  triggerAttackRelease: vi.fn(),
  dispose: vi.fn(),
  volume: { value: 0 },
}

const mockFilterInstance = {
  toDestination: vi.fn().mockReturnThis(),
}

// Track sampler creation for testing fallback behavior
let samplerShouldFail = false
let samplerOnErrorCallback = null

// Mock Tone.js before importing AudioEngine
vi.mock('tone', () => {
  // Create mock classes
  class MockSampler {
    constructor({ onload, onerror }) {
      Object.assign(this, mockSamplerInstance)
      if (samplerShouldFail) {
        samplerOnErrorCallback = onerror
        setTimeout(() => onerror?.(new Error('Sample load failed')), 0)
      } else {
        setTimeout(() => onload?.(), 0)
      }
    }
  }

  class MockSynth {
    constructor() {
      Object.assign(this, mockSynthInstance)
    }
  }

  class MockPluckSynth {
    constructor() {
      Object.assign(this, mockPluckSynthInstance)
    }
  }

  class MockNoiseSynth {
    constructor() {
      Object.assign(this, mockNoiseSynthInstance)
    }
  }

  class MockFilter {
    constructor() {
      Object.assign(this, mockFilterInstance)
    }
  }

  return {
    start: vi.fn().mockResolvedValue(undefined),
    Sampler: MockSampler,
    Synth: MockSynth,
    PluckSynth: MockPluckSynth,
    NoiseSynth: MockNoiseSynth,
    Filter: MockFilter,
    FMSynth: class MockFMSynth {
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
    samplerShouldFail = false
    samplerOnErrorCallback = null

    // Reset mock methods
    mockSamplerInstance.toDestination.mockClear().mockReturnThis()
    mockSamplerInstance.triggerAttackRelease.mockClear()
    mockSamplerInstance.releaseAll.mockClear()
    mockSamplerInstance.dispose.mockClear()

    mockSynthInstance.toDestination.mockClear().mockReturnThis()
    mockSynthInstance.triggerAttackRelease.mockClear()
    mockSynthInstance.triggerRelease.mockClear()
    mockSynthInstance.dispose.mockClear()

    mockPluckSynthInstance.toDestination.mockClear().mockReturnThis()
    mockPluckSynthInstance.triggerAttack.mockClear()
    mockPluckSynthInstance.triggerRelease.mockClear()
    mockPluckSynthInstance.dispose.mockClear()

    mockNoiseSynthInstance.toDestination.mockClear().mockReturnThis()
    mockNoiseSynthInstance.connect.mockClear().mockReturnThis()
    mockNoiseSynthInstance.disconnect.mockClear().mockReturnThis()
    mockNoiseSynthInstance.triggerAttackRelease.mockClear()
    mockNoiseSynthInstance.dispose.mockClear()

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

    it('loads violin instrument using Sampler', async () => {
      await engine.loadInstrument('violin')
      const status = engine.getLoadingStatus()
      expect(status.loaded).toContain('violin')
    })

    it('loads guitar-acoustic instrument using Sampler', async () => {
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
        expect.stringContaining('not supported')
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

  describe('loadInstrument() fallback behavior', () => {
    it('falls back to synth when violin samples fail', async () => {
      samplerShouldFail = true
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      await engine.loadInstrument('violin')

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('using synth fallback'),
        expect.any(Error)
      )
      // Should still be usable
      const status = engine.getLoadingStatus()
      expect(status.loaded).toContain('violin')
      warnSpy.mockRestore()
    })

    it('falls back to synth when guitar samples fail', async () => {
      samplerShouldFail = true
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      await engine.loadInstrument('guitar-acoustic')

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('using synth fallback'),
        expect.any(Error)
      )
      // Should still be usable
      const status = engine.getLoadingStatus()
      expect(status.loaded).toContain('guitar-acoustic')
      warnSpy.mockRestore()
    })

    it('sets instrument status to fallback when using synth', async () => {
      samplerShouldFail = true
      vi.spyOn(console, 'warn').mockImplementation(() => {})

      await engine.loadInstrument('violin')

      const progress = engine.getLoadingProgress()
      expect(progress.instruments.violin).toBe('fallback')
    })

    it('throws error when piano samples fail (no fallback)', async () => {
      samplerShouldFail = true
      vi.spyOn(console, 'error').mockImplementation(() => {})

      await expect(engine.loadInstrument('piano')).rejects.toThrow()
    })
  })

  describe('loadAllInstruments()', () => {
    it('loads all three instruments', async () => {
      await engine.loadAllInstruments()

      const status = engine.getLoadingStatus()
      expect(status.loaded).toContain('piano')
      expect(status.loaded).toContain('violin')
      expect(status.loaded).toContain('guitar-acoustic')
    })

    it('loads instruments in parallel', async () => {
      const loadSpy = vi.spyOn(engine, 'loadInstrument')

      await engine.loadAllInstruments()

      expect(loadSpy).toHaveBeenCalledTimes(3)
    })
  })

  describe('getLoadingProgress()', () => {
    it('returns correct structure', () => {
      const progress = engine.getLoadingProgress()

      expect(progress).toHaveProperty('loaded')
      expect(progress).toHaveProperty('total')
      expect(progress).toHaveProperty('instruments')
      expect(progress.total).toBe(3)
    })

    it('tracks pending instruments', () => {
      const progress = engine.getLoadingProgress()

      expect(progress.loaded).toBe(0)
      expect(progress.instruments.piano).toBe('pending')
      expect(progress.instruments.violin).toBe('pending')
      expect(progress.instruments['guitar-acoustic']).toBe('pending')
    })

    it('tracks loaded instruments', async () => {
      await engine.loadInstrument('piano')
      const progress = engine.getLoadingProgress()

      expect(progress.loaded).toBe(1)
      expect(progress.instruments.piano).toBe('ready')
    })

    it('tracks all loaded instruments', async () => {
      await engine.loadAllInstruments()
      const progress = engine.getLoadingProgress()

      expect(progress.loaded).toBe(3)
      expect(progress.instruments.piano).toBe('ready')
      expect(progress.instruments.violin).toBe('ready')
      expect(progress.instruments['guitar-acoustic']).toBe('ready')
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

    it('plays note on violin (sampler)', async () => {
      await engine.loadInstrument('violin')
      await engine.playNote('C4', 'violin')

      expect(mockSamplerInstance.triggerAttackRelease).toHaveBeenCalledWith(
        'C4',
        '4n'
      )
    })

    it('plays note on guitar (sampler)', async () => {
      await engine.loadInstrument('guitar-acoustic')
      await engine.playNote('C4', 'guitar-acoustic')

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

  describe('playNote() with synth fallback', () => {
    beforeEach(() => {
      samplerShouldFail = true
      vi.spyOn(console, 'warn').mockImplementation(() => {})
    })

    it('plays note on violin synth fallback', async () => {
      await engine.loadInstrument('violin')
      await engine.playNote('C4', 'violin')

      // Synth fallback uses Synth
      expect(mockSynthInstance.triggerAttackRelease).toHaveBeenCalled()
    })

    it('plays note on guitar synth fallback', async () => {
      await engine.loadInstrument('guitar-acoustic')
      await engine.playNote('C4', 'guitar-acoustic')

      // Guitar fallback uses PluckSynth which calls triggerAttack
      expect(mockPluckSynthInstance.triggerAttack).toHaveBeenCalled()
    })
  })

  describe('playReward()', () => {
    it('creates NoiseSynth on first call', () => {
      engine.playReward()

      expect(mockNoiseSynthInstance.toDestination).toHaveBeenCalled()
    })

    it('triggers a short noise burst', () => {
      engine.playReward()

      expect(mockNoiseSynthInstance.triggerAttackRelease).toHaveBeenCalledWith(
        '32n'
      )
    })

    it('reuses the same synth on subsequent calls', () => {
      engine.playReward()
      engine.playReward()
      engine.playReward()

      // toDestination only called once (synth created once)
      expect(mockNoiseSynthInstance.toDestination).toHaveBeenCalledTimes(1)
      // But triggerAttackRelease called three times
      expect(mockNoiseSynthInstance.triggerAttackRelease).toHaveBeenCalledTimes(
        3
      )
    })

    it('connects through a lowpass filter for softer sound', () => {
      engine.playReward()

      expect(mockNoiseSynthInstance.disconnect).toHaveBeenCalled()
      expect(mockNoiseSynthInstance.connect).toHaveBeenCalled()
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

    it('calls triggerRelease on synth fallback instruments', async () => {
      samplerShouldFail = true
      vi.spyOn(console, 'warn').mockImplementation(() => {})

      await engine.loadInstrument('violin')
      engine.stopAll()

      expect(mockSynthInstance.triggerRelease).toHaveBeenCalled()
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
    })

    it('clears all state', async () => {
      await engine.init()
      await engine.loadInstrument('piano')
      engine.dispose()

      expect(engine.isInitialized()).toBe(false)
      expect(engine.getLoadingStatus().loaded).toEqual([])
    })

    it('disposes reward synth if created', () => {
      engine.playReward() // Create reward synth
      engine.dispose()

      expect(mockNoiseSynthInstance.dispose).toHaveBeenCalled()
    })

    it('clears instrument status', async () => {
      await engine.loadInstrument('piano')
      engine.dispose()

      const progress = engine.getLoadingProgress()
      expect(progress.instruments.piano).toBe('pending')
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
