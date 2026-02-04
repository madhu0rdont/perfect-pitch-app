/**
 * ProgressTracker — tracks child's learning progress across notes and instruments.
 *
 * This is a pure logic module with no React dependency.
 * All functions are pure: they take state in and return new state out.
 */

import {
  NOTE_INTRODUCTION_ORDER,
  MASTERY_THRESHOLDS,
  INSTRUMENTS,
} from '../constants/notes'

/**
 * Create initial progress state for a note on a specific instrument.
 * @returns {Object} Fresh note progress object
 */
function createNoteProgress() {
  return {
    attempts: 0,
    correct: 0,
    streak: 0,
    recentResults: [], // Array of booleans, most recent last, capped at 10
  }
}

/**
 * Create initial tracker state with first two notes active on piano.
 * @returns {Object} Fresh progress tracker state
 */
export function createInitialState() {
  // Start with first two notes from the introduction order
  const initialNotes = NOTE_INTRODUCTION_ORDER.slice(0, 2)
  const initialInstruments = ['piano']

  // Create progress entries for each note/instrument combination
  const noteProgress = {}
  for (const note of initialNotes) {
    noteProgress[note] = {}
    for (const instrument of initialInstruments) {
      noteProgress[note][instrument] = createNoteProgress()
    }
  }

  return {
    noteProgress,
    activeNotes: initialNotes,
    activeInstruments: initialInstruments,
    currentStage: 1,
    sessionsPlayed: 0,
  }
}

/**
 * Record an answer and return updated state.
 * Pure function — does not mutate input state.
 *
 * @param {Object} state - Current progress state
 * @param {string} note - Note that was asked (e.g., 'C4')
 * @param {string} instrument - Instrument used (e.g., 'piano')
 * @param {boolean} wasCorrect - Whether the answer was correct
 * @returns {Object} New state with updated progress
 */
export function recordAnswer(state, note, instrument, wasCorrect) {
  // Get existing progress or create new
  const existingNoteProgress = state.noteProgress[note] || {}
  const existingInstrumentProgress =
    existingNoteProgress[instrument] || createNoteProgress()

  // Update recent results (capped at 10)
  const newRecentResults = [...existingInstrumentProgress.recentResults, wasCorrect]
  if (newRecentResults.length > MASTERY_THRESHOLDS.rollingWindow) {
    newRecentResults.shift() // Remove oldest result
  }

  // Update streak: increment on correct, reset on wrong
  const newStreak = wasCorrect ? existingInstrumentProgress.streak + 1 : 0

  // Create updated progress for this note/instrument
  const updatedInstrumentProgress = {
    attempts: existingInstrumentProgress.attempts + 1,
    correct: existingInstrumentProgress.correct + (wasCorrect ? 1 : 0),
    streak: newStreak,
    recentResults: newRecentResults,
  }

  // Build new state immutably
  return {
    ...state,
    noteProgress: {
      ...state.noteProgress,
      [note]: {
        ...existingNoteProgress,
        [instrument]: updatedInstrumentProgress,
      },
    },
  }
}

/**
 * Calculate rolling accuracy from the last N results.
 * Uses recentResults array which is capped at MASTERY_THRESHOLDS.rollingWindow.
 *
 * @param {Object} noteProgress - Progress object for a single note/instrument
 * @returns {number} Accuracy between 0 and 1 (or 0 if no attempts)
 */
export function getRollingAccuracy(noteProgress) {
  const results = noteProgress.recentResults
  if (results.length === 0) {
    return 0
  }

  const correctCount = results.filter((r) => r === true).length
  return correctCount / results.length
}

/**
 * Check if a note is mastered based on rolling accuracy and streak.
 * Mastery requires:
 * - Rolling accuracy >= promotionAccuracy (default 80%)
 * - Current streak >= promotionStreak (default 3)
 *
 * @param {Object} noteProgress - Progress object for a single note/instrument
 * @returns {boolean} True if note meets mastery criteria
 */
export function isNoteMastered(noteProgress) {
  const accuracy = getRollingAccuracy(noteProgress)
  const streak = noteProgress.streak

  return (
    accuracy >= MASTERY_THRESHOLDS.promotionAccuracy &&
    streak >= MASTERY_THRESHOLDS.promotionStreak
  )
}

// ============ Instrument Progression ============

/**
 * Get the instruments a note is eligible to be quizzed on.
 * A note starts on piano only. Once mastered on piano, violin becomes eligible.
 * Once mastered on violin, guitar becomes eligible.
 *
 * @param {Object} state - Current progress state
 * @param {string} note - Note name (e.g., 'C4')
 * @returns {string[]} Array of eligible instrument names
 */
export function getEligibleInstruments(state, note) {
  const noteProgress = state.noteProgress[note]
  const eligible = []

  // Piano is always eligible (first instrument)
  eligible.push(INSTRUMENTS[0]) // 'piano'

  // Check each subsequent instrument for eligibility
  for (let i = 1; i < INSTRUMENTS.length; i++) {
    const previousInstrument = INSTRUMENTS[i - 1]
    const previousProgress = noteProgress?.[previousInstrument]

    // Only eligible if mastered on previous instrument
    if (previousProgress && isNoteMastered(previousProgress)) {
      eligible.push(INSTRUMENTS[i])
    } else {
      // Stop checking - can't skip instruments in the progression
      break
    }
  }

  return eligible
}

/**
 * Select which instrument to use for a quiz question on a given note.
 * 60% chance of selecting the newest eligible instrument (the one being learned).
 * 40% chance spread across previously mastered instruments.
 *
 * @param {Object} state - Current progress state
 * @param {string} note - Note name (e.g., 'C4')
 * @returns {string} Selected instrument name
 */
export function selectQuizInstrument(state, note) {
  const eligible = getEligibleInstruments(state, note)

  // If only one instrument eligible, return it
  if (eligible.length === 1) {
    return eligible[0]
  }

  // Newest eligible instrument (the one being learned)
  const newestInstrument = eligible[eligible.length - 1]
  // Previously mastered instruments
  const masteredInstruments = eligible.slice(0, -1)

  // 60% chance to select newest, 40% spread across mastered
  if (Math.random() < 0.6) {
    return newestInstrument
  }

  // Randomly select from mastered instruments
  const randomIndex = Math.floor(Math.random() * masteredInstruments.length)
  return masteredInstruments[randomIndex]
}

/**
 * Select a note using weighted probability.
 * Weight = 1 - rollingAccuracy (weaker notes appear more often).
 * Notes with zero attempts get maximum weight (1.0).
 *
 * @param {Object} state - Current progress state
 * @param {string} [instrument='piano'] - Instrument to check progress for
 * @returns {string} Selected note name
 */
export function getWeightedNoteSelection(state, instrument = 'piano') {
  const { activeNotes, noteProgress } = state

  if (activeNotes.length === 0) {
    throw new Error('No active notes to select from')
  }

  if (activeNotes.length === 1) {
    return activeNotes[0]
  }

  // Calculate weights for each note
  const weights = activeNotes.map((note) => {
    const progress = noteProgress[note]?.[instrument]
    if (!progress || progress.attempts === 0) {
      // No attempts = maximum weight (prioritize untested notes)
      return 1.0
    }
    const accuracy = getRollingAccuracy(progress)
    // Weight is inverse of accuracy: weaker notes get higher weight
    // Minimum weight of 0.1 so mastered notes still appear occasionally
    return Math.max(0.1, 1 - accuracy)
  })

  // Calculate total weight
  const totalWeight = weights.reduce((sum, w) => sum + w, 0)

  // Random selection based on weights
  let random = Math.random() * totalWeight
  for (let i = 0; i < activeNotes.length; i++) {
    random -= weights[i]
    if (random <= 0) {
      return activeNotes[i]
    }
  }

  // Fallback (should not reach here, but just in case)
  return activeNotes[activeNotes.length - 1]
}

/**
 * Get overall accuracy for a specific note across all instruments.
 *
 * @param {Object} state - Current progress state
 * @param {string} note - Note name
 * @returns {number} Average accuracy across all active instruments
 */
export function getNoteOverallAccuracy(state, note) {
  const progress = state.noteProgress[note]
  if (!progress) return 0

  let totalAccuracy = 0
  let instrumentCount = 0

  for (const instrument of state.activeInstruments) {
    if (progress[instrument]) {
      totalAccuracy += getRollingAccuracy(progress[instrument])
      instrumentCount++
    }
  }

  return instrumentCount > 0 ? totalAccuracy / instrumentCount : 0
}

/**
 * Check if conditions are met to add a new note.
 * All active notes must be mastered on all eligible instruments.
 *
 * @param {Object} state - Current progress state
 * @returns {boolean} True if ready to add a new note
 */
export function canAddNewNote(state) {
  const { activeNotes, noteProgress } = state

  // Check if we've reached max active notes
  if (activeNotes.length >= MASTERY_THRESHOLDS.maxActiveNotes) {
    return false
  }

  // Check if all current notes are mastered on all their eligible instruments
  for (const note of activeNotes) {
    const eligibleInstruments = getEligibleInstruments(state, note)
    for (const instrument of eligibleInstruments) {
      const progress = noteProgress[note]?.[instrument]
      if (!progress || !isNoteMastered(progress)) {
        return false
      }
    }
  }

  return true
}

/**
 * Add the next note from the introduction order.
 *
 * @param {Object} state - Current progress state
 * @returns {Object} New state with next note added
 */
export function addNextNote(state) {
  const { activeNotes, activeInstruments } = state
  const nextNoteIndex = activeNotes.length

  if (nextNoteIndex >= NOTE_INTRODUCTION_ORDER.length) {
    // All notes already active
    return state
  }

  const nextNote = NOTE_INTRODUCTION_ORDER[nextNoteIndex]

  // Create progress entries for the new note
  const newNoteProgress = {}
  for (const instrument of activeInstruments) {
    newNoteProgress[instrument] = createNoteProgress()
  }

  return {
    ...state,
    activeNotes: [...activeNotes, nextNote],
    noteProgress: {
      ...state.noteProgress,
      [nextNote]: newNoteProgress,
    },
    currentStage: state.currentStage + 1,
  }
}

/**
 * Increment sessions played counter.
 *
 * @param {Object} state - Current progress state
 * @returns {Object} New state with incremented session count
 */
export function incrementSessions(state) {
  return {
    ...state,
    sessionsPlayed: state.sessionsPlayed + 1,
  }
}

// ============ Promotion Logic ============

/**
 * Check if conditions are met for promotion (adding a new note).
 * Promotion happens when ALL active notes are mastered on ALL eligible instruments.
 * A note's eligible instruments expand as it's mastered on each one (piano → violin → guitar).
 *
 * @param {Object} state - Current progress state
 * @returns {{ shouldPromote: boolean, nextNote: string | null }}
 */
export function checkPromotion(state) {
  const { activeNotes, noteProgress } = state

  // Check if we've reached max active notes
  if (activeNotes.length >= MASTERY_THRESHOLDS.maxActiveNotes) {
    return { shouldPromote: false, nextNote: null }
  }

  // Find the next note not yet in activeNotes
  const nextNote = NOTE_INTRODUCTION_ORDER.find(
    (note) => !activeNotes.includes(note)
  )

  // If all notes are already active, can't promote
  if (!nextNote) {
    return { shouldPromote: false, nextNote: null }
  }

  // Check if ALL current notes are mastered on ALL their eligible instruments
  for (const note of activeNotes) {
    const eligibleInstruments = getEligibleInstruments(state, note)
    for (const instrument of eligibleInstruments) {
      const progress = noteProgress[note]?.[instrument]
      if (!progress || !isNoteMastered(progress)) {
        return { shouldPromote: false, nextNote: null }
      }
    }
  }

  return { shouldPromote: true, nextNote }
}

/**
 * Apply promotion by adding the next note to activeNotes.
 * Initializes progress entry with empty stats for current instruments.
 *
 * @param {Object} state - Current progress state
 * @returns {Object} New state with next note added
 */
export function applyPromotion(state) {
  const { shouldPromote, nextNote } = checkPromotion(state)

  if (!shouldPromote || !nextNote) {
    return state
  }

  const { activeNotes, activeInstruments, noteProgress } = state

  // Create progress entries for the new note (or use existing if note was demoted before)
  const existingProgress = noteProgress[nextNote] || {}
  const newNoteProgress = { ...existingProgress }

  // Ensure progress entry exists for each active instrument
  for (const instrument of activeInstruments) {
    if (!newNoteProgress[instrument]) {
      newNoteProgress[instrument] = createNoteProgress()
    }
  }

  return {
    ...state,
    activeNotes: [...activeNotes, nextNote],
    noteProgress: {
      ...noteProgress,
      [nextNote]: newNoteProgress,
    },
    currentStage: state.currentStage + 1,
  }
}

// ============ Demotion Logic ============

/**
 * Check if conditions are met for demotion (removing a note).
 * Demotion happens when any note's rolling accuracy drops below demotionAccuracy.
 * Never demotes below 2 active notes.
 *
 * @param {Object} state - Current progress state
 * @returns {{ shouldDemote: boolean, noteToRemove: string | null }}
 */
export function checkDemotion(state) {
  const { activeNotes, activeInstruments, noteProgress } = state

  // Never demote below 2 notes
  if (activeNotes.length <= 2) {
    return { shouldDemote: false, noteToRemove: null }
  }

  // Check if any note is below demotion threshold on any instrument
  let shouldDemote = false

  for (const note of activeNotes) {
    for (const instrument of activeInstruments) {
      const progress = noteProgress[note]?.[instrument]
      if (progress && progress.recentResults.length > 0) {
        const accuracy = getRollingAccuracy(progress)
        if (accuracy < MASTERY_THRESHOLDS.demotionAccuracy) {
          shouldDemote = true
          break
        }
      }
    }
    if (shouldDemote) break
  }

  if (!shouldDemote) {
    return { shouldDemote: false, noteToRemove: null }
  }

  // Remove the most recently added note (last in array)
  const noteToRemove = activeNotes[activeNotes.length - 1]

  return { shouldDemote: true, noteToRemove }
}

/**
 * Apply demotion by removing a note from activeNotes.
 * Keeps progress data intact so historical data is preserved if the note returns.
 *
 * @param {Object} state - Current progress state
 * @param {string} noteToRemove - Note to remove from active notes
 * @returns {Object} New state with note removed from activeNotes
 */
export function applyDemotion(state, noteToRemove) {
  const { activeNotes } = state

  // Don't demote below 2 notes
  if (activeNotes.length <= 2) {
    return state
  }

  // Don't remove if note isn't active
  if (!activeNotes.includes(noteToRemove)) {
    return state
  }

  // Remove from activeNotes but keep noteProgress intact
  return {
    ...state,
    activeNotes: activeNotes.filter((note) => note !== noteToRemove),
    // noteProgress is preserved - historical data kept
    currentStage: Math.max(1, state.currentStage - 1),
  }
}

/**
 * Check and apply adaptive difficulty adjustments.
 * If both promotion and demotion conditions are met simultaneously,
 * promotion takes priority (overall performance is considered strong
 * if mastery conditions are met).
 *
 * @param {Object} state - Current progress state
 * @returns {Object} New state after any adjustments
 */
export function applyAdaptiveDifficulty(state) {
  // Check promotion first (takes priority)
  const { shouldPromote } = checkPromotion(state)
  if (shouldPromote) {
    return applyPromotion(state)
  }

  // Check demotion
  const { shouldDemote, noteToRemove } = checkDemotion(state)
  if (shouldDemote && noteToRemove) {
    return applyDemotion(state, noteToRemove)
  }

  return state
}
