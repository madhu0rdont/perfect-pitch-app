import { describe, it, expect } from 'vitest'
import { getLayoutConfig, getLayoutClassName } from './layoutHelper'

describe('getLayoutConfig', () => {
  describe('2 circles', () => {
    it('returns single row with 2 indices', () => {
      const config = getLayoutConfig(2)
      expect(config.rows).toEqual([[0, 1]])
    })

    it('returns large circle size (140px)', () => {
      const config = getLayoutConfig(2)
      expect(config.circleSize).toBe(140)
    })

    it('returns 30px gap', () => {
      const config = getLayoutConfig(2)
      expect(config.gap).toBe(30)
    })
  })

  describe('3 circles', () => {
    it('returns single row with 3 indices', () => {
      const config = getLayoutConfig(3)
      expect(config.rows).toEqual([[0, 1, 2]])
    })

    it('returns large circle size (130px)', () => {
      const config = getLayoutConfig(3)
      expect(config.circleSize).toBe(130)
    })

    it('returns 25px gap', () => {
      const config = getLayoutConfig(3)
      expect(config.gap).toBe(25)
    })
  })

  describe('4 circles', () => {
    it('returns 2x2 grid (2 rows of 2)', () => {
      const config = getLayoutConfig(4)
      expect(config.rows).toEqual([
        [0, 1],
        [2, 3],
      ])
    })

    it('returns medium circle size (120px)', () => {
      const config = getLayoutConfig(4)
      expect(config.circleSize).toBe(120)
    })

    it('returns 20px gap', () => {
      const config = getLayoutConfig(4)
      expect(config.gap).toBe(20)
    })
  })

  describe('5 circles', () => {
    it('returns 3-2 layout (top row of 3, bottom row of 2)', () => {
      const config = getLayoutConfig(5)
      expect(config.rows).toEqual([
        [0, 1, 2],
        [3, 4],
      ])
    })

    it('returns medium circle size (110px)', () => {
      const config = getLayoutConfig(5)
      expect(config.circleSize).toBe(110)
    })

    it('returns 20px gap', () => {
      const config = getLayoutConfig(5)
      expect(config.gap).toBe(20)
    })
  })

  describe('6 circles', () => {
    it('returns 3-3 layout (2 rows of 3)', () => {
      const config = getLayoutConfig(6)
      expect(config.rows).toEqual([
        [0, 1, 2],
        [3, 4, 5],
      ])
    })

    it('returns medium circle size (100px)', () => {
      const config = getLayoutConfig(6)
      expect(config.circleSize).toBe(100)
    })

    it('returns 18px gap', () => {
      const config = getLayoutConfig(6)
      expect(config.gap).toBe(18)
    })
  })

  describe('edge cases', () => {
    it('handles 1 circle', () => {
      const config = getLayoutConfig(1)
      expect(config.rows).toEqual([[0]])
      expect(config.circleSize).toBe(150)
    })

    it('handles counts > 6 with fallback', () => {
      const config = getLayoutConfig(7)
      expect(config.rows).toEqual([
        [0, 1, 2],
        [3, 4, 5],
      ])
      expect(config.circleSize).toBe(100)
    })
  })
})

describe('getLayoutClassName', () => {
  it('returns single-row class for 2 circles', () => {
    expect(getLayoutClassName(2)).toBe('layout-single-row')
  })

  it('returns single-row class for 3 circles', () => {
    expect(getLayoutClassName(3)).toBe('layout-single-row')
  })

  it('returns 2x2 class for 4 circles', () => {
    expect(getLayoutClassName(4)).toBe('layout-2x2')
  })

  it('returns 3-2 class for 5 circles', () => {
    expect(getLayoutClassName(5)).toBe('layout-3-2')
  })

  it('returns 3-3 class for 6 circles', () => {
    expect(getLayoutClassName(6)).toBe('layout-3-3')
  })
})
