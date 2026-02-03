/**
 * Core note definitions and game configuration constants.
 */

/**
 * Note configurations mapping note names to their properties.
 * Covers the chromatic scale from C4 to B4.
 */
export const NOTE_CONFIGS = {
  C4: {
    frequency: 261.63,
    color: '#FF4444',
    label: 'C',
  },
  'C#4': {
    frequency: 277.18,
    color: '#FF6B44',
    label: 'C#',
  },
  D4: {
    frequency: 293.66,
    color: '#FF9544',
    label: 'D',
  },
  Eb4: {
    frequency: 311.13,
    color: '#FFB844',
    label: 'Eb',
  },
  E4: {
    frequency: 329.63,
    color: '#FFD644',
    label: 'E',
  },
  F4: {
    frequency: 349.23,
    color: '#44DD88',
    label: 'F',
  },
  'F#4': {
    frequency: 369.99,
    color: '#44DDBB',
    label: 'F#',
  },
  G4: {
    frequency: 392.0,
    color: '#4488FF',
    label: 'G',
  },
  Ab4: {
    frequency: 415.3,
    color: '#7744FF',
    label: 'Ab',
  },
  A4: {
    frequency: 440.0,
    color: '#9944FF',
    label: 'A',
  },
  Bb4: {
    frequency: 466.16,
    color: '#CC44FF',
    label: 'Bb',
  },
  B4: {
    frequency: 493.88,
    color: '#FF44CC',
    label: 'B',
  },
}

/**
 * Order in which notes are introduced to the player.
 * Starts with notes that are perceptually easiest to distinguish
 * (maximum frequency distance), then gradually fills in the gaps.
 */
export const NOTE_INTRODUCTION_ORDER = [
  'C4',   // Root note - anchor point
  'G4',   // Perfect 5th - very distinct from C
  'E4',   // Major 3rd - fills the middle
  'A4',   // Creates wide spacing in upper range
  'D4',   // Fills gap between C and E
  'F4',   // Fills gap between E and G
  'B4',   // Leading tone, distinct timbre
  'Bb4',  // Start introducing accidentals
  'F#4',  // Tritone from C
  'Eb4',  // Minor 3rd color
  'C#4',  // Close to root - harder to distinguish
  'Ab4',  // Last accidental
]

/**
 * Instruments in order of introduction.
 * Piano first (most familiar), then pitched percussion, then strings.
 */
export const INSTRUMENTS = ['piano', 'xylophone', 'guitar-acoustic']

/**
 * Thresholds for the adaptive difficulty system.
 */
export const MASTERY_THRESHOLDS = {
  /** Accuracy required to unlock next note (80%) */
  promotionAccuracy: 0.8,
  /** Consecutive correct answers needed for promotion */
  promotionStreak: 3,
  /** Accuracy below which triggers demotion (50%) */
  demotionAccuracy: 0.5,
  /** Number of recent attempts to consider for accuracy */
  rollingWindow: 10,
  /** Maximum notes active at once to avoid overwhelming */
  maxActiveNotes: 6,
}
