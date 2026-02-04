/**
 * AudioEngine - Abstraction layer between the game and Tone.js
 *
 * This is the ONLY file that should import from 'tone'.
 * The rest of the app interacts with audio through this interface.
 */

import * as Tone from 'tone'

// ============ Sample URLs ============

/**
 * Salamander Grand Piano sample URLs
 * We provide a subset of notes; Tone.Sampler pitch-shifts to fill gaps
 */
const SALAMANDER_BASE_URL = 'https://tonejs.github.io/audio/salamander/'

const PIANO_SAMPLES = {
  A0: 'A0.mp3',
  C1: 'C1.mp3',
  'D#1': 'Ds1.mp3',
  'F#1': 'Fs1.mp3',
  A1: 'A1.mp3',
  C2: 'C2.mp3',
  'D#2': 'Ds2.mp3',
  'F#2': 'Fs2.mp3',
  A2: 'A2.mp3',
  C3: 'C3.mp3',
  'D#3': 'Ds3.mp3',
  'F#3': 'Fs3.mp3',
  A3: 'A3.mp3',
  C4: 'C4.mp3',
  'D#4': 'Ds4.mp3',
  'F#4': 'Fs4.mp3',
  A4: 'A4.mp3',
  C5: 'C5.mp3',
  'D#5': 'Ds5.mp3',
  'F#5': 'Fs5.mp3',
  A5: 'A5.mp3',
  C6: 'C6.mp3',
  'D#6': 'Ds6.mp3',
  'F#6': 'Fs6.mp3',
  A6: 'A6.mp3',
  C7: 'C7.mp3',
  'D#7': 'Ds7.mp3',
  'F#7': 'Fs7.mp3',
  A7: 'A7.mp3',
  C8: 'C8.mp3',
}

/**
 * Tonejs-instruments sample URLs
 * https://nbrosowsky.github.io/tonejs-instruments/samples/
 * We provide roughly every 3rd note across octaves 3-5
 */
const TONEJS_INSTRUMENTS_BASE_URL =
  'https://nbrosowsky.github.io/tonejs-instruments/samples/'

/**
 * Violin samples - covering octaves 3, 4, 5
 * Every 3rd note to minimize download while allowing pitch-shifting
 */
const VIOLIN_SAMPLES = {
  A3: 'A3.mp3',
  C4: 'C4.mp3',
  E4: 'E4.mp3',
  G4: 'G4.mp3',
  A4: 'A4.mp3',
  C5: 'C5.mp3',
  E5: 'E5.mp3',
  G5: 'G5.mp3',
  A5: 'A5.mp3',
}

/**
 * Guitar (acoustic) samples - covering octaves 3, 4, 5
 * Every 3rd note to minimize download while allowing pitch-shifting
 */
const GUITAR_ACOUSTIC_SAMPLES = {
  A2: 'A2.mp3',
  C3: 'C3.mp3',
  E3: 'E3.mp3',
  G3: 'G3.mp3',
  A3: 'A3.mp3',
  C4: 'C4.mp3',
  E4: 'E4.mp3',
  G4: 'G4.mp3',
  A4: 'A4.mp3',
  C5: 'C5.mp3',
}

// ============ Synth Fallbacks ============

/**
 * Synth configurations for fallback instruments.
 * Used when sample loading fails (network error, bad URL, etc.)
 */
const SYNTH_FALLBACKS = {
  violin: {
    type: 'synth',
    options: {
      oscillator: {
        type: 'sine',
      },
      envelope: {
        attack: 0.3, // Slow attack like a bowed string
        decay: 0.1,
        sustain: 0.9, // Long sustain
        release: 0.8,
      },
    },
  },
  'guitar-acoustic': {
    type: 'pluck',
    options: {
      attackNoise: 1,
      dampening: 4000,
      resonance: 0.98,
    },
  },
}

/**
 * Wrapper class for synth instruments to provide a consistent interface.
 * Makes synths behave like samplers for the playNote() method.
 */
class SynthInstrument {
  constructor(synth, type) {
    this.synth = synth
    this.type = type
  }

  triggerAttackRelease(note, duration) {
    if (this.type === 'pluck') {
      // PluckSynth has a different signature
      this.synth.triggerAttack(note, Tone.now())
    } else {
      // FMSynth, Synth, etc. use standard triggerAttackRelease with note names
      this.synth.triggerAttackRelease(note, duration)
    }
  }

  releaseAll() {
    // Synths don't have releaseAll, but we can try to release
    if (this.synth.triggerRelease) {
      this.synth.triggerRelease()
    }
  }

  dispose() {
    this.synth.dispose()
  }
}

/**
 * List of all available instruments
 */
const ALL_INSTRUMENTS = ['piano', 'violin', 'guitar-acoustic']

class AudioEngine {
  constructor() {
    this.instruments = new Map()
    this.loadingInstruments = new Set()
    this.instrumentStatus = new Map() // Track 'loading', 'ready', 'fallback', 'error'
    this.initialized = false
    this.rewardSynth = null
  }

  /**
   * Initialize the audio context.
   * Must be called from a user gesture (tap/click) before any audio plays.
   * Safe to call multiple times.
   * @returns {Promise<void>}
   */
  async init() {
    if (this.initialized) {
      return
    }

    await Tone.start()
    this.initialized = true
    console.log('AudioEngine: Audio context started')
  }

  /**
   * Check if the audio context has been initialized.
   * @returns {boolean}
   */
  isInitialized() {
    return this.initialized
  }

  /**
   * Load an instrument by name.
   * Uses real samples for all instruments, with synth fallback on error.
   * @param {string} name - Instrument name ('piano', 'violin', 'guitar-acoustic')
   * @returns {Promise<void>} Resolves when instrument is ready
   */
  async loadInstrument(name) {
    if (this.instruments.has(name)) {
      console.log(`AudioEngine: Instrument '${name}' already loaded`)
      return
    }

    if (this.loadingInstruments.has(name)) {
      console.log(`AudioEngine: Instrument '${name}' already loading`)
      return
    }

    if (!ALL_INSTRUMENTS.includes(name)) {
      console.warn(`AudioEngine: Instrument '${name}' not supported`)
      return
    }

    this.loadingInstruments.add(name)
    this.instrumentStatus.set(name, 'loading')
    console.log(`AudioEngine: Loading instrument '${name}'...`)

    try {
      let instrument

      if (name === 'piano') {
        instrument = await this._createSampler(PIANO_SAMPLES, SALAMANDER_BASE_URL)
      } else if (name === 'violin') {
        instrument = await this._createSampler(
          VIOLIN_SAMPLES,
          TONEJS_INSTRUMENTS_BASE_URL + 'violin/'
        )
      } else if (name === 'guitar-acoustic') {
        instrument = await this._createSampler(
          GUITAR_ACOUSTIC_SAMPLES,
          TONEJS_INSTRUMENTS_BASE_URL + 'guitar-acoustic/'
        )
      }

      this.instruments.set(name, instrument)
      this.instrumentStatus.set(name, 'ready')
      console.log(`AudioEngine: Instrument '${name}' loaded`)
    } catch (error) {
      // Try synth fallback for violin and guitar
      if (SYNTH_FALLBACKS[name]) {
        console.warn(
          `AudioEngine: Failed to load '${name}' samples, using synth fallback`,
          error
        )
        const fallback = this._createSynthFallback(name)
        this.instruments.set(name, fallback)
        this.instrumentStatus.set(name, 'fallback')
      } else {
        console.error(`AudioEngine: Failed to load '${name}'`, error)
        this.instrumentStatus.set(name, 'error')
        throw error
      }
    } finally {
      this.loadingInstruments.delete(name)
    }
  }

  /**
   * Load all instruments in parallel.
   * @returns {Promise<void>} Resolves when all instruments are ready
   */
  async loadAllInstruments() {
    console.log('AudioEngine: Loading all instruments...')
    await Promise.all(ALL_INSTRUMENTS.map((name) => this.loadInstrument(name)))
    console.log('AudioEngine: All instruments loaded')
  }

  /**
   * Get detailed loading progress for all instruments.
   * @returns {{ loaded: number, total: number, instruments: Object }}
   */
  getLoadingProgress() {
    const instruments = {}
    let loaded = 0

    for (const name of ALL_INSTRUMENTS) {
      const status = this.instrumentStatus.get(name) || 'pending'
      instruments[name] = status
      if (status === 'ready' || status === 'fallback') {
        loaded++
      }
    }

    return {
      loaded,
      total: ALL_INSTRUMENTS.length,
      instruments,
    }
  }

  /**
   * Create a Tone.Sampler from sample URLs.
   * @private
   * @param {Object} samples - Map of note names to filenames
   * @param {string} baseUrl - Base URL for samples
   * @returns {Promise<Tone.Sampler>}
   */
  _createSampler(samples, baseUrl) {
    return new Promise((resolve, reject) => {
      const sampler = new Tone.Sampler({
        urls: samples,
        baseUrl: baseUrl,
        onload: () => resolve(sampler),
        onerror: (err) => reject(err),
      }).toDestination()
    })
  }

  /**
   * Create a synth-based instrument as a fallback.
   * @private
   * @param {string} name - Instrument name
   * @returns {SynthInstrument}
   */
  _createSynthFallback(name) {
    const config = SYNTH_FALLBACKS[name]

    let synth
    if (config.type === 'pluck') {
      synth = new Tone.PluckSynth(config.options).toDestination()
    } else {
      synth = new Tone.Synth(config.options).toDestination()
    }

    return new SynthInstrument(synth, config.type)
  }

  /**
   * Play a note on a loaded instrument.
   * @param {string} noteName - Note to play (e.g., 'C4', 'F#4')
   * @param {string} instrumentName - Instrument to use
   * @param {string} [duration='4n'] - Note duration (Tone.js notation)
   * @returns {Promise<void>}
   */
  async playNote(noteName, instrumentName, duration = '4n') {
    if (!this.instruments.has(instrumentName)) {
      console.warn(
        `AudioEngine: Cannot play '${noteName}' - instrument '${instrumentName}' not loaded`
      )
      return
    }

    const instrument = this.instruments.get(instrumentName)
    instrument.triggerAttackRelease(noteName, duration)
  }

  /**
   * Play a short, non-tonal reward sound for correct answers.
   * Uses filtered noise to create a soft "shh" percussion that won't
   * interfere with the child's pitch memory.
   */
  playReward() {
    // Lazily create the reward synth on first use
    if (!this.rewardSynth) {
      this.rewardSynth = new Tone.NoiseSynth({
        noise: {
          type: 'white',
        },
        envelope: {
          attack: 0.005,
          decay: 0.1,
          sustain: 0,
          release: 0.05,
        },
      }).toDestination()

      // Add a filter to make it softer and less harsh
      const filter = new Tone.Filter({
        frequency: 3000,
        type: 'lowpass',
      }).toDestination()

      this.rewardSynth.disconnect()
      this.rewardSynth.connect(filter)

      // Reduce volume so it's subtle
      this.rewardSynth.volume.value = -12
    }

    this.rewardSynth.triggerAttackRelease('32n')
  }

  /**
   * Get the loading status of all instruments.
   * @returns {{ loaded: string[], loading: string[] }}
   */
  getLoadingStatus() {
    return {
      loaded: Array.from(this.instruments.keys()),
      loading: Array.from(this.loadingInstruments),
    }
  }

  /**
   * Get list of available instruments.
   * @returns {string[]}
   */
  getAvailableInstruments() {
    return ['piano', 'violin', 'guitar-acoustic']
  }

  /**
   * Stop all currently playing sounds.
   */
  stopAll() {
    this.instruments.forEach((instrument) => {
      instrument.releaseAll()
    })
  }

  /**
   * Dispose of all instruments and clean up resources.
   */
  dispose() {
    this.instruments.forEach((instrument) => {
      instrument.dispose()
    })
    this.instruments.clear()
    this.loadingInstruments.clear()
    this.instrumentStatus.clear()
    this.initialized = false

    if (this.rewardSynth) {
      this.rewardSynth.dispose()
      this.rewardSynth = null
    }
  }
}

// Export singleton instance
const audioEngine = new AudioEngine()

export { AudioEngine }
export default audioEngine
