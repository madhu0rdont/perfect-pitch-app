/**
 * StorageManager — handles saving and loading progress to persistent storage.
 *
 * Uses localStorage for persistence across browser sessions.
 * All operations are wrapped in try/catch since storage can fail
 * (e.g., private browsing mode, quota exceeded, etc.)
 */

const STORAGE_KEY = 'progress-state'

/**
 * Save progress state to persistent storage.
 *
 * @param {Object} state - Progress state to save
 * @returns {boolean} True if save succeeded, false otherwise
 */
export function saveProgress(state) {
  try {
    const serialized = JSON.stringify(state)
    localStorage.setItem(STORAGE_KEY, serialized)
    return true
  } catch (error) {
    console.warn('StorageManager: Failed to save progress', error)
    return false
  }
}

/**
 * Load progress state from persistent storage.
 *
 * @returns {Object|null} Parsed progress state, or null if not found/invalid
 */
export function loadProgress() {
  try {
    const serialized = localStorage.getItem(STORAGE_KEY)
    if (serialized === null) {
      // Key doesn't exist - first-time user
      return null
    }
    return JSON.parse(serialized)
  } catch (error) {
    console.warn('StorageManager: Failed to load progress', error)
    return null
  }
}

/**
 * Delete stored progress, resetting to first-time user state.
 *
 * @returns {boolean} True if reset succeeded, false otherwise
 */
export function resetProgress() {
  try {
    localStorage.removeItem(STORAGE_KEY)
    return true
  } catch (error) {
    console.warn('StorageManager: Failed to reset progress', error)
    return false
  }
}

/**
 * Quick check if any saved progress exists.
 * Useful for showing "Continue" vs "New Game" options.
 *
 * @returns {boolean} True if saved progress exists
 */
export function hasExistingProgress() {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null
  } catch (error) {
    console.warn('StorageManager: Failed to check progress', error)
    return false
  }
}
