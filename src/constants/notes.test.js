import { describe, it, expect } from 'vitest'
import {
  NOTE_CONFIGS,
  NOTE_INTRODUCTION_ORDER,
  INSTRUMENTS,
  MASTERY_THRESHOLDS,
  CIRCLE_OF_FIFTHS_ORDER,
  getCirclePosition,
  getCircleAngle,
} from './notes'

describe('CIRCLE_OF_FIFTHS_ORDER', () => {
  it('contains all 12 notes', () => {
    expect(CIRCLE_OF_FIFTHS_ORDER).toHaveLength(12)
  })

  it('starts with C4', () => {
    expect(CIRCLE_OF_FIFTHS_ORDER[0]).toBe('C4')
  })

  it('has G4 as second note (perfect fifth from C)', () => {
    expect(CIRCLE_OF_FIFTHS_ORDER[1]).toBe('G4')
  })

  it('contains only valid notes from NOTE_CONFIGS', () => {
    CIRCLE_OF_FIFTHS_ORDER.forEach((note) => {
      expect(NOTE_CONFIGS[note], `${note} should exist in NOTE_CONFIGS`).toBeDefined()
    })
  })
})

describe('getCirclePosition', () => {
  it('returns 0 for C4 (12 o\'clock)', () => {
    expect(getCirclePosition('C4')).toBe(0)
  })

  it('returns 1 for G4 (1 o\'clock)', () => {
    expect(getCirclePosition('G4')).toBe(1)
  })

  it('returns 6 for F#4 (6 o\'clock / tritone)', () => {
    expect(getCirclePosition('F#4')).toBe(6)
  })

  it('returns 11 for F4 (11 o\'clock)', () => {
    expect(getCirclePosition('F4')).toBe(11)
  })

  it('returns 0 for unknown notes', () => {
    expect(getCirclePosition('X9')).toBe(0)
  })
})

describe('getCircleAngle', () => {
  it('returns 0 degrees for C4', () => {
    expect(getCircleAngle('C4')).toBe(0)
  })

  it('returns 30 degrees for G4', () => {
    expect(getCircleAngle('G4')).toBe(30)
  })

  it('returns 180 degrees for F#4 (opposite side)', () => {
    expect(getCircleAngle('F#4')).toBe(180)
  })

  it('returns 330 degrees for F4', () => {
    expect(getCircleAngle('F4')).toBe(330)
  })

  it('returns angles in 30 degree increments', () => {
    CIRCLE_OF_FIFTHS_ORDER.forEach((note, index) => {
      expect(getCircleAngle(note)).toBe(index * 30)
    })
  })
})

describe('NOTE_CONFIGS', () => {
  it('contains all 12 chromatic notes', () => {
    expect(Object.keys(NOTE_CONFIGS)).toHaveLength(12)
  })

  it('has valid HSL colors for all notes', () => {
    const hslColorRegex = /^hsl\(\d+,\s*\d+%,\s*\d+%\)$/
    Object.entries(NOTE_CONFIGS).forEach(([note, config]) => {
      expect(config.color, `${note} should have valid HSL color`).toMatch(hslColorRegex)
    })
  })

  it('has position property for all notes (0-11)', () => {
    Object.entries(NOTE_CONFIGS).forEach(([note, config]) => {
      expect(config.position, `${note} should have position`).toBeGreaterThanOrEqual(0)
      expect(config.position, `${note} position should be < 12`).toBeLessThan(12)
    })
  })

  it('has unique positions for all notes', () => {
    const positions = Object.values(NOTE_CONFIGS).map((c) => c.position)
    const uniquePositions = new Set(positions)
    expect(uniquePositions.size).toBe(12)
  })

  it('has positive frequencies for all notes', () => {
    Object.entries(NOTE_CONFIGS).forEach(([note, config]) => {
      expect(config.frequency, `${note} should have positive frequency`).toBeGreaterThan(0)
    })
  })

  it('has a label for each note', () => {
    Object.entries(NOTE_CONFIGS).forEach(([note, config]) => {
      expect(config.label, `${note} should have a label`).toBeTruthy()
    })
  })

  it('has C4 at position 0', () => {
    expect(NOTE_CONFIGS.C4.position).toBe(0)
  })

  it('has G4 at position 1', () => {
    expect(NOTE_CONFIGS.G4.position).toBe(1)
  })
})

describe('NOTE_INTRODUCTION_ORDER', () => {
  it('only contains notes that exist in NOTE_CONFIGS', () => {
    NOTE_INTRODUCTION_ORDER.forEach((note) => {
      expect(NOTE_CONFIGS[note], `${note} should exist in NOTE_CONFIGS`).toBeDefined()
    })
  })

  it('contains all notes from NOTE_CONFIGS', () => {
    const configNotes = Object.keys(NOTE_CONFIGS).sort()
    const introNotes = [...NOTE_INTRODUCTION_ORDER].sort()
    expect(introNotes).toEqual(configNotes)
  })

  it('has no duplicate notes', () => {
    const uniqueNotes = new Set(NOTE_INTRODUCTION_ORDER)
    expect(uniqueNotes.size).toBe(NOTE_INTRODUCTION_ORDER.length)
  })

  it('starts with C4 as the root note', () => {
    expect(NOTE_INTRODUCTION_ORDER[0]).toBe('C4')
  })

  it('has G4 as second note (circle of fifths)', () => {
    expect(NOTE_INTRODUCTION_ORDER[1]).toBe('G4')
  })
})

describe('INSTRUMENTS', () => {
  it('has at least one instrument', () => {
    expect(INSTRUMENTS.length).toBeGreaterThan(0)
  })

  it('starts with piano', () => {
    expect(INSTRUMENTS[0]).toBe('piano')
  })

  it('has no duplicate instruments', () => {
    const uniqueInstruments = new Set(INSTRUMENTS)
    expect(uniqueInstruments.size).toBe(INSTRUMENTS.length)
  })
})

describe('MASTERY_THRESHOLDS', () => {
  it('has promotionAccuracy between 0 and 1', () => {
    expect(MASTERY_THRESHOLDS.promotionAccuracy).toBeGreaterThan(0)
    expect(MASTERY_THRESHOLDS.promotionAccuracy).toBeLessThanOrEqual(1)
  })

  it('has demotionAccuracy between 0 and 1', () => {
    expect(MASTERY_THRESHOLDS.demotionAccuracy).toBeGreaterThan(0)
    expect(MASTERY_THRESHOLDS.demotionAccuracy).toBeLessThanOrEqual(1)
  })

  it('has promotionAccuracy greater than demotionAccuracy', () => {
    expect(MASTERY_THRESHOLDS.promotionAccuracy).toBeGreaterThan(
      MASTERY_THRESHOLDS.demotionAccuracy
    )
  })

  it('has positive promotionStreak', () => {
    expect(MASTERY_THRESHOLDS.promotionStreak).toBeGreaterThan(0)
  })

  it('has positive rollingWindow', () => {
    expect(MASTERY_THRESHOLDS.rollingWindow).toBeGreaterThan(0)
  })

  it('has positive maxActiveNotes', () => {
    expect(MASTERY_THRESHOLDS.maxActiveNotes).toBeGreaterThan(0)
  })
})
