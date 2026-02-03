/**
 * Layout configuration helper for NoteCircle arrangements.
 * Returns optimal layout settings based on the number of active notes.
 */

/**
 * Get layout configuration for a given number of circles.
 * @param {number} count - Number of circles to display (2-6)
 * @returns {{ rows: number[][], circleSize: number, gap: number }}
 */
export function getLayoutConfig(count) {
  switch (count) {
    case 2:
      // Single centered row, large circles
      return {
        rows: [[0, 1]],
        circleSize: 140,
        gap: 30,
      }

    case 3:
      // Single row, large circles
      return {
        rows: [[0, 1, 2]],
        circleSize: 130,
        gap: 25,
      }

    case 4:
      // 2x2 grid, medium circles
      return {
        rows: [
          [0, 1],
          [2, 3],
        ],
        circleSize: 120,
        gap: 20,
      }

    case 5:
      // Top row of 3, bottom row of 2 centered
      return {
        rows: [
          [0, 1, 2],
          [3, 4],
        ],
        circleSize: 110,
        gap: 20,
      }

    case 6:
      // 2 rows of 3, medium circles
      return {
        rows: [
          [0, 1, 2],
          [3, 4, 5],
        ],
        circleSize: 100,
        gap: 18,
      }

    default:
      // Fallback for 1 or invalid counts
      if (count === 1) {
        return {
          rows: [[0]],
          circleSize: 150,
          gap: 0,
        }
      }
      // For counts > 6, use 6-circle layout as fallback
      console.warn(`Layout not optimized for ${count} circles, using 6-circle layout`)
      return {
        rows: [
          [0, 1, 2],
          [3, 4, 5],
        ],
        circleSize: 100,
        gap: 18,
      }
  }
}

/**
 * Get the CSS class name for a layout configuration.
 * @param {number} count - Number of circles
 * @returns {string} CSS class name
 */
export function getLayoutClassName(count) {
  if (count <= 3) return 'layout-single-row'
  if (count === 4) return 'layout-2x2'
  if (count === 5) return 'layout-3-2'
  return 'layout-3-3'
}
