import { describe, it, expect } from 'vitest'
import {
  NOTE_CONFIGS,
  NOTE_INTRODUCTION_ORDER,
  INSTRUMENTS,
  MASTERY_THRESHOLDS,
} from './notes'

describe('NOTE_CONFIGS', () => {
  it('contains all 12 chromatic notes', () => {
    expect(Object.keys(NOTE_CONFIGS)).toHaveLength(12)
  })

  it('has valid hex colors for all notes', () => {
    const hexColorRegex = /^#[0-9A-Fa-f]{6}$/
    Object.entries(NOTE_CONFIGS).forEach(([note, config]) => {
      expect(config.color, `${note} should have valid hex color`).toMatch(hexColorRegex)
    })
  })

  it('has frequencies in ascending order', () => {
    const frequencies = Object.values(NOTE_CONFIGS).map((c) => c.frequency)
    for (let i = 1; i < frequencies.length; i++) {
      expect(
        frequencies[i],
        `frequency at index ${i} should be greater than previous`
      ).toBeGreaterThan(frequencies[i - 1])
    }
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
