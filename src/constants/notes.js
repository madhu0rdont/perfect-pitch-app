/**
 * Core note definitions and game configuration constants.
 * Notes are arranged according to the Circle of Fifths.
 */

/**
 * Circle of Fifths order (clockwise from top).
 * Each note is a perfect fifth above the previous.
 */
export const CIRCLE_OF_FIFTHS_ORDER = [
  'C4',   // 12 o'clock (0°)
  'G4',   // 1 o'clock (30°)
  'D4',   // 2 o'clock (60°)
  'A4',   // 3 o'clock (90°)
  'E4',   // 4 o'clock (120°)
  'B4',   // 5 o'clock (150°)
  'F#4',  // 6 o'clock (180°)
  'C#4',  // 7 o'clock (210°)
  'Ab4',  // 8 o'clock (240°)
  'Eb4',  // 9 o'clock (270°)
  'Bb4',  // 10 o'clock (300°)
  'F4',   // 11 o'clock (330°)
]

/**
 * Get the position index (0-11) of a note on the circle of fifths.
 * @param {string} note - Note name (e.g., 'C4')
 * @returns {number} Position index (0 = top/12 o'clock)
 */
export function getCirclePosition(note) {
  const index = CIRCLE_OF_FIFTHS_ORDER.indexOf(note)
  return index >= 0 ? index : 0
}

/**
 * Get the angle in degrees for a note's position on the circle.
 * @param {string} note - Note name
 * @returns {number} Angle in degrees (0 = top, clockwise)
 */
export function getCircleAngle(note) {
  return getCirclePosition(note) * 30 // 360° / 12 notes = 30° per note
}

/**
 * Note configurations mapping note names to their properties.
 * Colors form a smooth color wheel around the Circle of Fifths.
 * Position indicates placement on the circle (0-11, clockwise from top).
 */
export const NOTE_CONFIGS = {
  C4: {
    frequency: 261.63,
    color: 'hsl(0, 85%, 55%)',     // Red (12 o'clock)
    label: 'C',
    position: 0,
  },
  G4: {
    frequency: 392.0,
    color: 'hsl(30, 85%, 55%)',    // Orange (1 o'clock)
    label: 'G',
    position: 1,
  },
  D4: {
    frequency: 293.66,
    color: 'hsl(50, 85%, 50%)',    // Yellow-Orange (2 o'clock)
    label: 'D',
    position: 2,
  },
  A4: {
    frequency: 440.0,
    color: 'hsl(80, 70%, 45%)',    // Yellow-Green (3 o'clock)
    label: 'A',
    position: 3,
  },
  E4: {
    frequency: 329.63,
    color: 'hsl(120, 65%, 45%)',   // Green (4 o'clock)
    label: 'E',
    position: 4,
  },
  B4: {
    frequency: 493.88,
    color: 'hsl(160, 70%, 45%)',   // Teal (5 o'clock)
    label: 'B',
    position: 5,
  },
  'F#4': {
    frequency: 369.99,
    color: 'hsl(190, 80%, 50%)',   // Cyan (6 o'clock)
    label: 'F#',
    position: 6,
  },
  'C#4': {
    frequency: 277.18,
    color: 'hsl(210, 80%, 55%)',   // Sky Blue (7 o'clock)
    label: 'C#',
    position: 7,
  },
  Ab4: {
    frequency: 415.3,
    color: 'hsl(240, 70%, 60%)',   // Blue (8 o'clock)
    label: 'Ab',
    position: 8,
  },
  Eb4: {
    frequency: 311.13,
    color: 'hsl(270, 70%, 60%)',   // Purple (9 o'clock)
    label: 'Eb',
    position: 9,
  },
  Bb4: {
    frequency: 466.16,
    color: 'hsl(300, 70%, 55%)',   // Magenta (10 o'clock)
    label: 'Bb',
    position: 10,
  },
  F4: {
    frequency: 349.23,
    color: 'hsl(330, 80%, 55%)',   // Pink (11 o'clock)
    label: 'F',
    position: 11,
  },
}

/**
 * Order in which notes are introduced to the player.
 * Follows the Circle of Fifths, which creates natural musical relationships
 * and maintains maximum pitch distance between adjacent introductions.
 */
export const NOTE_INTRODUCTION_ORDER = [
  'C4',   // Root note - anchor point (12 o'clock)
  'G4',   // Perfect 5th above C (1 o'clock)
  'D4',   // Perfect 5th above G (2 o'clock)
  'A4',   // Perfect 5th above D (3 o'clock)
  'E4',   // Perfect 5th above A (4 o'clock)
  'F4',   // Perfect 4th above C / 5th below (11 o'clock)
  'B4',   // Leading tone (5 o'clock)
  'Bb4',  // Start flats side (10 o'clock)
  'Eb4',  // Continue flats (9 o'clock)
  'Ab4',  // (8 o'clock)
  'F#4',  // Tritone from C (6 o'clock)
  'C#4',  // Closest to root (7 o'clock)
]

/**
 * Instruments in order of introduction.
 * Piano first (most familiar), then strings.
 */
export const INSTRUMENTS = ['piano', 'violin', 'guitar-acoustic']

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
