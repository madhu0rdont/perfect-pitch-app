/**
 * PhaseManager — a pure state machine that manages game phases.
 * No React dependency — takes state and returns new state.
 */

export const PHASES = {
  LISTEN: 'LISTEN',
  EXPLORE: 'EXPLORE',
  QUIZ: 'QUIZ',
  RESULT: 'RESULT',
}

/**
 * Create initial game state.
 * @returns {Object} Initial state
 */
export function createInitialState() {
  return {
    phase: null,
    listen: null,
    explore: null,
    quiz: null,
    result: null,
  }
}

/**
 * Start the LISTEN phase — plays through active notes in sequence.
 * @param {Object} state - Current state
 * @param {string[]} activeNotes - Notes to play through
 * @returns {Object} New state
 */
export function startListenPhase(state, activeNotes) {
  if (!activeNotes || activeNotes.length === 0) {
    throw new Error('activeNotes must be a non-empty array')
  }

  return {
    ...state,
    phase: PHASES.LISTEN,
    listen: {
      activeNotes: [...activeNotes],
      currentIndex: 0,
      isComplete: false,
    },
  }
}

/**
 * Advance to the next note in the LISTEN sequence.
 * @param {Object} state - Current state
 * @returns {{ state: Object, status: 'playing' | 'complete' }}
 */
export function advanceListenNote(state) {
  if (state.phase !== PHASES.LISTEN) {
    throw new Error(`Cannot advance listen note in phase: ${state.phase}`)
  }

  const { listen } = state
  const nextIndex = listen.currentIndex + 1
  const isComplete = nextIndex >= listen.activeNotes.length

  const newState = {
    ...state,
    listen: {
      ...listen,
      currentIndex: isComplete ? listen.currentIndex : nextIndex,
      isComplete,
    },
  }

  return {
    state: newState,
    status: isComplete ? 'complete' : 'playing',
  }
}

/**
 * Get the current note being played in LISTEN phase.
 * @param {Object} state - Current state
 * @returns {string | null} Current note name or null
 */
export function getCurrentListenNote(state) {
  if (state.phase !== PHASES.LISTEN || !state.listen) {
    return null
  }
  return state.listen.activeNotes[state.listen.currentIndex]
}

/**
 * Start the EXPLORE phase — free play mode.
 * @param {Object} state - Current state
 * @returns {Object} New state
 */
export function startExplorePhase(state) {
  return {
    ...state,
    phase: PHASES.EXPLORE,
    explore: {
      tapCount: 0,
      startTime: Date.now(),
      isComplete: false,
    },
  }
}

/**
 * Record a tap during EXPLORE phase.
 * @param {Object} state - Current state
 * @param {number} [maxTaps=6] - Number of taps to complete explore
 * @returns {{ state: Object, status: 'exploring' | 'complete' }}
 */
export function recordExploreTap(state, maxTaps = 6) {
  if (state.phase !== PHASES.EXPLORE) {
    throw new Error(`Cannot record explore tap in phase: ${state.phase}`)
  }

  const newTapCount = state.explore.tapCount + 1
  const isComplete = newTapCount >= maxTaps

  const newState = {
    ...state,
    explore: {
      ...state.explore,
      tapCount: newTapCount,
      isComplete,
    },
  }

  return {
    state: newState,
    status: isComplete ? 'complete' : 'exploring',
  }
}

/**
 * Start the QUIZ phase — question and answer mode.
 * @param {Object} state - Current state
 * @param {string[]} activeNotes - Notes to quiz on
 * @param {number} totalRounds - Number of questions
 * @returns {Object} New state
 */
export function startQuizPhase(state, activeNotes, totalRounds) {
  if (!activeNotes || activeNotes.length === 0) {
    throw new Error('activeNotes must be a non-empty array')
  }
  if (totalRounds < 1) {
    throw new Error('totalRounds must be at least 1')
  }

  const firstQuestion = selectRandomNote(activeNotes)

  return {
    ...state,
    phase: PHASES.QUIZ,
    quiz: {
      activeNotes: [...activeNotes],
      currentQuestion: firstQuestion,
      roundNumber: 1,
      totalRounds,
      results: [],
      isComplete: false,
    },
  }
}

/**
 * Answer the current quiz question.
 * @param {Object} state - Current state
 * @param {string} noteTapped - The note the user tapped
 * @returns {{ state: Object, correct: boolean, correctNote: string, status: 'continue' | 'complete' }}
 */
export function answerQuiz(state, noteTapped) {
  if (state.phase !== PHASES.QUIZ) {
    throw new Error(`Cannot answer quiz in phase: ${state.phase}`)
  }

  const { quiz } = state
  const correct = noteTapped === quiz.currentQuestion
  const correctNote = quiz.currentQuestion

  // Record the result
  const newResults = [
    ...quiz.results,
    {
      round: quiz.roundNumber,
      question: quiz.currentQuestion,
      answer: noteTapped,
      correct,
    },
  ]

  const isLastRound = quiz.roundNumber >= quiz.totalRounds
  const nextRoundNumber = quiz.roundNumber + 1

  // Select next question (or keep current if complete)
  const nextQuestion = isLastRound
    ? quiz.currentQuestion
    : selectRandomNote(quiz.activeNotes)

  const newState = {
    ...state,
    quiz: {
      ...quiz,
      currentQuestion: nextQuestion,
      roundNumber: isLastRound ? quiz.roundNumber : nextRoundNumber,
      results: newResults,
      isComplete: isLastRound,
    },
  }

  return {
    state: newState,
    correct,
    correctNote,
    status: isLastRound ? 'complete' : 'continue',
  }
}

/**
 * Get the current quiz question note.
 * @param {Object} state - Current state
 * @returns {string | null} Current question note or null
 */
export function getCurrentQuizQuestion(state) {
  if (state.phase !== PHASES.QUIZ || !state.quiz) {
    return null
  }
  return state.quiz.currentQuestion
}

/**
 * Start the RESULT phase — show session summary.
 * @param {Object} state - Current state
 * @returns {Object} New state
 */
export function startResultPhase(state) {
  const quizResults = state.quiz?.results || []
  const correctCount = quizResults.filter((r) => r.correct).length
  const totalCount = quizResults.length

  return {
    ...state,
    phase: PHASES.RESULT,
    result: {
      correctCount,
      totalCount,
      accuracy: totalCount > 0 ? correctCount / totalCount : 0,
      results: quizResults,
      exploreTapCount: state.explore?.tapCount || 0,
    },
  }
}

/**
 * Get the session results.
 * @param {Object} state - Current state
 * @returns {Object | null} Results object or null if not in RESULT phase
 */
export function getResults(state) {
  if (state.phase !== PHASES.RESULT || !state.result) {
    return null
  }
  return state.result
}

/**
 * Check if the current phase is complete and can transition.
 * @param {Object} state - Current state
 * @returns {boolean}
 */
export function isPhaseComplete(state) {
  switch (state.phase) {
    case PHASES.LISTEN:
      return state.listen?.isComplete || false
    case PHASES.EXPLORE:
      return state.explore?.isComplete || false
    case PHASES.QUIZ:
      return state.quiz?.isComplete || false
    case PHASES.RESULT:
      return true // Result phase is always "complete" (ready to restart)
    default:
      return false
  }
}

/**
 * Get the next phase in sequence.
 * @param {string} currentPhase - Current phase
 * @returns {string} Next phase
 */
export function getNextPhase(currentPhase) {
  switch (currentPhase) {
    case PHASES.LISTEN:
      return PHASES.EXPLORE
    case PHASES.EXPLORE:
      return PHASES.QUIZ
    case PHASES.QUIZ:
      return PHASES.RESULT
    case PHASES.RESULT:
      return PHASES.LISTEN
    default:
      return PHASES.LISTEN
  }
}

// ============ Internal Helpers ============

/**
 * Select a random note from the array.
 * Uses equal probability for now — weighted selection comes in Step 4.
 * @param {string[]} notes - Array of note names
 * @returns {string} Selected note
 */
function selectRandomNote(notes) {
  const index = Math.floor(Math.random() * notes.length)
  return notes[index]
}
