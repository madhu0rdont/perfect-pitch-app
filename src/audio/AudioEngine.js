/**
 * AudioEngine - Abstraction layer between the game and Tone.js
 *
 * This is the ONLY file that should import from 'tone'.
 * The rest of the app interacts with audio through this interface.
 */

import * as Tone from 'tone'

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
 * Synth configurations for fallback instruments.
 * These approximate the sound of real instruments using synthesis.
 * Will be replaced with real samples in Step 6.
 */
const SYNTH_CONFIGS = {
  xylophone: {
    type: 'metal',
    options: {
      frequency: 200,
      envelope: {
        attack: 0.001,
        decay: 0.4,
        release: 0.2,
      },
      harmonicity: 5.1,
      modulationIndex: 32,
      resonance: 4000,
      octaves: 1.5,
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
    if (this.type === 'metal') {
      // MetalSynth uses frequency, not note names
      const freq = Tone.Frequency(note).toFrequency()
      this.synth.triggerAttackRelease(duration, Tone.now(), freq)
    } else if (this.type === 'pluck') {
      // PluckSynth has a different signature
      this.synth.triggerAttack(note, Tone.now())
    } else {
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

class AudioEngine {
  constructor() {
    this.instruments = new Map()
    this.loadingInstruments = new Set()
    this.initialized = false
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
   * Piano uses real samples, xylophone and guitar use synth fallbacks.
   * @param {string} name - Instrument name ('piano', 'xylophone', 'guitar-acoustic')
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

    this.loadingInstruments.add(name)
    console.log(`AudioEngine: Loading instrument '${name}'...`)

    try {
      let instrument

      if (name === 'piano') {
        instrument = await this._createPianoSampler()
      } else if (SYNTH_CONFIGS[name]) {
        instrument = this._createSynthInstrument(name)
      } else {
        console.warn(`AudioEngine: Instrument '${name}' not yet implemented`)
        this.loadingInstruments.delete(name)
        return
      }

      this.instruments.set(name, instrument)
      console.log(`AudioEngine: Instrument '${name}' loaded`)
    } finally {
      this.loadingInstruments.delete(name)
    }
  }

  /**
   * Create a synth-based instrument as a fallback.
   * @private
   * @param {string} name - Instrument name
   * @returns {SynthInstrument}
   */
  _createSynthInstrument(name) {
    const config = SYNTH_CONFIGS[name]

    let synth
    if (config.type === 'metal') {
      synth = new Tone.MetalSynth(config.options).toDestination()
    } else if (config.type === 'pluck') {
      synth = new Tone.PluckSynth(config.options).toDestination()
    } else {
      synth = new Tone.Synth(config.options).toDestination()
    }

    return new SynthInstrument(synth, config.type)
  }

  /**
   * Create a Tone.Sampler for the Salamander piano.
   * @private
   * @returns {Promise<Tone.Sampler>}
   */
  _createPianoSampler() {
    return new Promise((resolve, reject) => {
      const sampler = new Tone.Sampler({
        urls: PIANO_SAMPLES,
        baseUrl: SALAMANDER_BASE_URL,
        onload: () => resolve(sampler),
        onerror: (err) => reject(err),
      }).toDestination()
    })
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
    return ['piano', 'xylophone', 'guitar-acoustic']
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
    this.initialized = false
  }
}

// Export singleton instance
const audioEngine = new AudioEngine()

export { AudioEngine }
export default audioEngine
