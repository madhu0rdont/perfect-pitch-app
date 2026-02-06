import { useState, useEffect, useCallback, useRef } from 'react'
import { audioEngine } from '../audio'
import {
  PHASES,
  createInitialState,
  startListenPhase,
  advanceListenNote,
  getCurrentListenNote,
  startExplorePhase,
  recordExploreTap,
  startQuizPhase,
  answerQuiz,
  getCurrentQuizQuestion,
  startResultPhase,
  getResults,
  isPhaseComplete,
} from '../engine/PhaseManager'
import {
  createInitialState as createInitialProgressState,
  recordAnswer,
  applyAdaptiveDifficulty,
  checkPromotion,
  getWeightedNoteSelection,
  selectQuizInstrument,
  getEligibleInstruments,
  getNewlyEligibleInstruments,
  isComboIntroduced,
  markComboIntroduced,
} from '../engine/ProgressTracker'
import {
  saveProgress,
  loadProgress,
} from '../engine/StorageManager'

const LISTEN_NOTE_INTERVAL = 1500 // ms between notes in LISTEN phase
const EXPLORE_MAX_TAPS = 6
const EXPLORE_TIMEOUT = 15000 // 15 seconds max for EXPLORE
const QUIZ_ROUNDS = 5

// Quiz feedback timing - tuned for toddler processing speed
// Too fast and they can't process; too slow and they lose interest
const CORRECT_FEEDBACK_DURATION = 800 // ms to show correct state
const INCORRECT_FEEDBACK_DURATION = 1200 // ms to show incorrect + replay correct note
const QUESTION_PAUSE = 1000 // ms pause before next question

// Duration to show promotion message
const PROMOTION_MESSAGE_DURATION = 2500 // ms to show "New note!" message

// New instrument unlock timing
const NEW_SOUND_MESSAGE_DURATION = 2000 // ms to show "New sound!" message
const BONUS_NOTE_DELAY = 500 // ms delay before playing bonus note
const FIRST_TIME_HINT_DELAY = 1200 // ms delay before showing hint pulse

/**
 * Custom hook that wraps PhaseManager and connects it to GameScreen.
 * Manages game phases, audio playback, circle states, and progress tracking.
 *
 * @returns {Object} Game state and handlers
 */
export function useGamePhase() {
  // Initialize progress state from storage or create fresh
  const [progressState, setProgressState] = useState(() => {
    const saved = loadProgress()
    return saved || createInitialProgressState()
  })

  // Derive activeNotes from progress state
  const activeNotes = progressState.activeNotes

  // Promotion/demotion messaging
  const [promotionMessage, setPromotionMessage] = useState(null)
  const [notesEntering, setNotesEntering] = useState([]) // Notes fading in
  const [notesExiting, setNotesExiting] = useState([]) // Notes fading out

  const [gameState, setGameState] = useState(() => {
    const initial = createInitialState()
    const saved = loadProgress()
    const notes = saved ? saved.activeNotes : createInitialProgressState().activeNotes
    return startListenPhase(initial, notes)
  })

  const [circleStates, setCircleStates] = useState({})
  const [quizFeedback, setQuizFeedback] = useState(null)

  // Instrument indicator state
  const [currentInstrument, setCurrentInstrument] = useState('piano')
  const [instrumentVisible, setInstrumentVisible] = useState(false)
  const [showInstrumentCelebration, setShowInstrumentCelebration] = useState(false)
  const instrumentTimerRef = useRef(null)

  // Newly eligible instrument tracking
  const [newlyEligibleCombos, setNewlyEligibleCombos] = useState([])
  const [newSoundMessage, setNewSoundMessage] = useState(null)
  const [showFirstTimeHint, setShowFirstTimeHint] = useState(false)
  const [hintNote, setHintNote] = useState(null)

  // Explore phase instrument cycling - tracks which instrument index to use per note
  const exploreInstrumentIndexRef = useRef({})

  // Refs for timers
  const listenTimerRef = useRef(null)
  const exploreTimerRef = useRef(null)
  const playingTimerRef = useRef(null)

  // Get current phase
  const phase = gameState.phase

  // Clear all timers helper
  const clearAllTimers = useCallback(() => {
    if (listenTimerRef.current) {
      clearInterval(listenTimerRef.current)
      listenTimerRef.current = null
    }
    if (exploreTimerRef.current) {
      clearTimeout(exploreTimerRef.current)
      exploreTimerRef.current = null
    }
    if (playingTimerRef.current) {
      clearTimeout(playingTimerRef.current)
      playingTimerRef.current = null
    }
    if (instrumentTimerRef.current) {
      clearTimeout(instrumentTimerRef.current)
      instrumentTimerRef.current = null
    }
  }, [])

  // Show instrument indicator temporarily
  const showInstrumentIndicator = useCallback((instrument, duration = 1200) => {
    setCurrentInstrument(instrument)
    setInstrumentVisible(true)

    // Clear any existing timer
    if (instrumentTimerRef.current) {
      clearTimeout(instrumentTimerRef.current)
    }

    instrumentTimerRef.current = setTimeout(() => {
      setInstrumentVisible(false)
      instrumentTimerRef.current = null
    }, duration)
  }, [])

  // Set a circle to playing state temporarily
  const playCircle = useCallback((note, duration = 400) => {
    setCircleStates((prev) => ({ ...prev, [note]: 'playing' }))

    // Clear any existing timer for this purpose
    if (playingTimerRef.current) {
      clearTimeout(playingTimerRef.current)
    }

    playingTimerRef.current = setTimeout(() => {
      setCircleStates((prev) => ({ ...prev, [note]: 'idle' }))
      playingTimerRef.current = null
    }, duration)
  }, [])

  // ============ LISTEN Phase Logic ============

  // Track notes that have additional instruments (for contrast playback at end)
  const contrastNotesRef = useRef([])

  useEffect(() => {
    if (phase !== PHASES.LISTEN) return

    // Find notes with multiple eligible instruments for contrast playback
    contrastNotesRef.current = activeNotes.filter((note) => {
      const eligible = getEligibleInstruments(progressState, note)
      return eligible.length > 1
    })

    // Dim all circles except the current one during listen
    const currentNote = getCurrentListenNote(gameState)

    // Set initial circle states
    const initialStates = {}
    activeNotes.forEach((note) => {
      initialStates[note] = note === currentNote ? 'idle' : 'dimmed'
    })
    setCircleStates(initialStates)

    // Play the first note immediately
    if (currentNote) {
      audioEngine.playNote(currentNote, 'piano')
      playCircle(currentNote, LISTEN_NOTE_INTERVAL - 200)
      showInstrumentIndicator('piano', LISTEN_NOTE_INTERVAL - 200)
    }

    // Set up interval to advance through notes
    listenTimerRef.current = setInterval(() => {
      setGameState((prevState) => {
        if (prevState.phase !== PHASES.LISTEN) return prevState

        const { state: newState, status } = advanceListenNote(prevState)

        if (status === 'complete') {
          // Clear interval before handling completion
          clearInterval(listenTimerRef.current)
          listenTimerRef.current = null

          // First check for newly eligible combos (new unlocks this session)
          if (newlyEligibleCombos.length > 0) {
            // Play bonus notes for newly eligible instruments
            const combo = newlyEligibleCombos[0]

            // Show "New sound!" message
            setNewSoundMessage('New sound!')
            setShowInstrumentCelebration(true)

            // Play the bonus note after a short delay
            setTimeout(() => {
              audioEngine.playNote(combo.note, combo.instrument)
              playCircle(combo.note, NEW_SOUND_MESSAGE_DURATION - BONUS_NOTE_DELAY)
              showInstrumentIndicator(combo.instrument, NEW_SOUND_MESSAGE_DURATION - BONUS_NOTE_DELAY)

              // Update circle states to highlight the note
              setCircleStates((prev) => {
                const updated = { ...prev }
                activeNotes.forEach((note) => {
                  updated[note] = note === combo.note ? 'playing' : 'dimmed'
                })
                return updated
              })
            }, BONUS_NOTE_DELAY)

            // Clear message and celebration after duration
            setTimeout(() => {
              setNewSoundMessage(null)
              setShowInstrumentCelebration(false)
              setNewlyEligibleCombos((prev) => prev.slice(1))

              // Transition to EXPLORE after bonus
              setGameState((prev) => startExplorePhase(prev))
            }, NEW_SOUND_MESSAGE_DURATION)

            return newState // Don't transition yet
          }

          // Play contrast notes (notes with multiple instruments) on their newest instrument
          if (contrastNotesRef.current.length > 0) {
            let contrastIndex = 0
            const playNextContrast = () => {
              if (contrastIndex >= contrastNotesRef.current.length) {
                // All contrast notes played, transition to EXPLORE
                setGameState((prev) => startExplorePhase(prev))
                return
              }

              const contrastNote = contrastNotesRef.current[contrastIndex]
              const eligibleInstruments = getEligibleInstruments(progressState, contrastNote)
              const newestInstrument = eligibleInstruments[eligibleInstruments.length - 1]

              // Play on newest instrument
              audioEngine.playNote(contrastNote, newestInstrument)
              playCircle(contrastNote, LISTEN_NOTE_INTERVAL - 200)
              showInstrumentIndicator(newestInstrument, LISTEN_NOTE_INTERVAL - 200)

              // Update circle states
              setCircleStates((prev) => {
                const updated = { ...prev }
                activeNotes.forEach((note) => {
                  updated[note] = note === contrastNote ? 'playing' : 'dimmed'
                })
                return updated
              })

              contrastIndex++
              setTimeout(playNextContrast, LISTEN_NOTE_INTERVAL)
            }

            // Start playing contrast notes
            playNextContrast()
            return newState // Don't transition yet
          }

          // No bonus or contrast notes, transition to EXPLORE immediately
          return startExplorePhase(newState)
        }

        // Play the next note
        const nextNote = getCurrentListenNote(newState)
        if (nextNote) {
          audioEngine.playNote(nextNote, 'piano')
          playCircle(nextNote, LISTEN_NOTE_INTERVAL - 200)
          showInstrumentIndicator('piano', LISTEN_NOTE_INTERVAL - 200)

          // Update circle states
          setCircleStates((prev) => {
            const updated = { ...prev }
            activeNotes.forEach((note) => {
              updated[note] = note === nextNote ? 'idle' : 'dimmed'
            })
            return updated
          })
        }

        return newState
      })
    }, LISTEN_NOTE_INTERVAL)

    return () => {
      if (listenTimerRef.current) {
        clearInterval(listenTimerRef.current)
        listenTimerRef.current = null
      }
    }
  }, [phase, activeNotes, playCircle, showInstrumentIndicator, gameState, progressState])

  // ============ EXPLORE Phase Logic ============

  useEffect(() => {
    if (phase !== PHASES.EXPLORE) return

    // Reset instrument cycling for all notes when entering explore
    exploreInstrumentIndexRef.current = {}

    // All circles are idle during explore
    const exploreStates = {}
    activeNotes.forEach((note) => {
      exploreStates[note] = 'idle'
    })
    setCircleStates(exploreStates)

    // Set timeout for explore phase (15 seconds max)
    exploreTimerRef.current = setTimeout(() => {
      setGameState((prevState) => {
        if (prevState.phase !== PHASES.EXPLORE) return prevState
        return startQuizPhase(prevState, activeNotes, QUIZ_ROUNDS)
      })
    }, EXPLORE_TIMEOUT)

    return () => {
      if (exploreTimerRef.current) {
        clearTimeout(exploreTimerRef.current)
        exploreTimerRef.current = null
      }
    }
  }, [phase, activeNotes])

  // ============ QUIZ Phase Logic ============

  // Initialize QUIZ phase (play first question, set circle states)
  const quizRound = gameState.quiz?.roundNumber
  const prevPhaseRef = useRef(null)
  const prevRoundRef = useRef(null)

  useEffect(() => {
    if (phase !== PHASES.QUIZ) {
      prevPhaseRef.current = phase
      return
    }

    const justEnteredQuiz = prevPhaseRef.current !== PHASES.QUIZ
    const roundChanged = prevRoundRef.current !== null && prevRoundRef.current !== quizRound

    prevPhaseRef.current = phase
    prevRoundRef.current = quizRound

    // Only play question note and reset on initial entry to QUIZ phase
    // Round changes are handled by the onCircleTap timeout
    if (justEnteredQuiz) {
      // Override the first question with weighted selection based on progress
      const weightedQuestion = getWeightedNoteSelection(progressState, 'piano')
      // Select instrument for this question based on note's progression
      const questionInstrument = selectQuizInstrument(progressState, weightedQuestion)

      // Check if this is a first-time combo (needs hint)
      const needsHint = !isComboIntroduced(progressState, weightedQuestion, questionInstrument)

      // Update game state with weighted question and instrument
      setGameState((prev) => ({
        ...prev,
        quiz: {
          ...prev.quiz,
          currentQuestion: weightedQuestion,
          currentInstrument: questionInstrument,
        },
      }))

      // Play the weighted question note on the selected instrument
      audioEngine.playNote(weightedQuestion, questionInstrument)
      showInstrumentIndicator(questionInstrument, 1500)

      // All circles idle during quiz
      const quizStates = {}
      activeNotes.forEach((note) => {
        quizStates[note] = 'idle'
      })
      setCircleStates(quizStates)
      setQuizFeedback(null)

      // Show first-time hint if needed (pulse the correct circle after delay)
      if (needsHint) {
        setHintNote(weightedQuestion)
        setTimeout(() => {
          setShowFirstTimeHint(true)
          setCircleStates((prev) => ({ ...prev, [weightedQuestion]: 'hint' }))

          // Clear hint after a moment
          setTimeout(() => {
            setShowFirstTimeHint(false)
            setHintNote(null)
            setCircleStates((prev) => ({ ...prev, [weightedQuestion]: 'idle' }))
          }, 800)
        }, FIRST_TIME_HINT_DELAY)

        // Mark combo as introduced
        setProgressState((prev) => markComboIntroduced(prev, weightedQuestion, questionInstrument))
      }
    }
  }, [phase, quizRound, activeNotes, progressState, showInstrumentIndicator])

  // ============ RESULT Phase Logic ============

  // Track previous phase to detect when we enter RESULT
  const prevPhaseForResultRef = useRef(null)

  useEffect(() => {
    if (phase !== PHASES.RESULT) {
      prevPhaseForResultRef.current = phase
      return
    }

    const justEnteredResult = prevPhaseForResultRef.current !== PHASES.RESULT
    prevPhaseForResultRef.current = phase

    // All circles idle in result
    const resultStates = {}
    activeNotes.forEach((note) => {
      resultStates[note] = 'idle'
    })
    setCircleStates(resultStates)

    // Check promotion/demotion when we first enter RESULT phase
    if (justEnteredResult) {
      setProgressState((prevProgress) => {
        // Apply adaptive difficulty (checks promotion first, then demotion)
        const newProgress = applyAdaptiveDifficulty(prevProgress)

        // Check if a promotion occurred
        const { shouldPromote, nextNote } = checkPromotion(prevProgress)
        if (shouldPromote && nextNote) {
          // Show promotion message
          setPromotionMessage(`New note!`)
          setNotesEntering([nextNote])

          // Clear message after duration
          setTimeout(() => {
            setPromotionMessage(null)
            setNotesEntering([])
          }, PROMOTION_MESSAGE_DURATION)
        }

        // Check if demotion occurred (compare activeNotes)
        if (newProgress.activeNotes.length < prevProgress.activeNotes.length) {
          const removedNote = prevProgress.activeNotes.find(
            (note) => !newProgress.activeNotes.includes(note)
          )
          if (removedNote) {
            setNotesExiting([removedNote])
            // Note will be removed after animation
            setTimeout(() => {
              setNotesExiting([])
            }, 500)
          }
        }

        // Detect newly eligible instruments for next session's bonus playback
        const newlyEligible = getNewlyEligibleInstruments(prevProgress, newProgress)
        if (newlyEligible.length > 0) {
          setNewlyEligibleCombos(newlyEligible)
        }

        // Save to storage
        saveProgress(newProgress)

        return newProgress
      })
    }
  }, [phase, activeNotes])

  // ============ Circle Tap Handler ============

  const onCircleTap = useCallback(
    (note) => {
      // Ignore taps during LISTEN phase
      if (phase === PHASES.LISTEN) return

      if (phase === PHASES.EXPLORE) {
        // Get eligible instruments for this note
        const eligibleInstruments = getEligibleInstruments(progressState, note)

        // Get current instrument index for this note (default to 0)
        const currentIndex = exploreInstrumentIndexRef.current[note] || 0

        // Select the instrument at current index
        const instrument = eligibleInstruments[currentIndex % eligibleInstruments.length]

        // Cycle to next instrument for next tap
        exploreInstrumentIndexRef.current[note] = (currentIndex + 1) % eligibleInstruments.length

        // Play the note on the selected instrument
        audioEngine.playNote(note, instrument)
        playCircle(note)
        showInstrumentIndicator(instrument, 400)

        // Record tap
        setGameState((prevState) => {
          const { state: newState, status } = recordExploreTap(
            prevState,
            EXPLORE_MAX_TAPS
          )

          if (status === 'complete') {
            // Clear explore timeout and transition to QUIZ
            if (exploreTimerRef.current) {
              clearTimeout(exploreTimerRef.current)
              exploreTimerRef.current = null
            }
            return startQuizPhase(newState, activeNotes, QUIZ_ROUNDS)
          }

          return newState
        })
      }

      if (phase === PHASES.QUIZ) {
        // Get the current instrument from game state
        const quizInstrument = gameState.quiz?.currentInstrument || 'piano'

        // Play the tapped note on the same instrument as the question
        audioEngine.playNote(note, quizInstrument)

        setGameState((prevState) => {
          const { state: newState, correct, correctNote, status } = answerQuiz(
            prevState,
            note
          )

          // Record answer to progress tracker with the actual instrument used
          setProgressState((prevProgress) =>
            recordAnswer(prevProgress, correctNote, quizInstrument, correct)
          )

          // Show feedback
          setQuizFeedback({ correct, correctNote, answer: note, instrument: quizInstrument })

          // Determine feedback duration based on correct/incorrect
          const feedbackDuration = correct
            ? CORRECT_FEEDBACK_DURATION
            : INCORRECT_FEEDBACK_DURATION

          if (correct) {
            // Correct answer: show 'correct' state, play reward sound
            setCircleStates((prev) => ({ ...prev, [note]: 'correct' }))
            audioEngine.playReward()
            // Show instrument celebration briefly
            setShowInstrumentCelebration(true)
            setTimeout(() => setShowInstrumentCelebration(false), feedbackDuration)
          } else {
            // Incorrect answer: dim tapped circle, highlight correct and replay
            // Silence is the "wrong" feedback - no negative sound
            setCircleStates((prev) => ({
              ...prev,
              [note]: 'incorrect',
              [correctNote]: 'playing',
            }))
            // Replay the correct note so child hears what it should have been
            audioEngine.playNote(correctNote, quizInstrument)
            showInstrumentIndicator(quizInstrument, INCORRECT_FEEDBACK_DURATION)
          }

          // After feedback duration, reset and prepare for next question
          setTimeout(() => {
            // Reset all circles to idle
            const resetStates = {}
            activeNotes.forEach((n) => {
              resetStates[n] = 'idle'
            })
            setCircleStates(resetStates)
            setQuizFeedback(null)

            // After additional pause, either show results or play next question
            setTimeout(() => {
              if (status === 'complete') {
                setGameState(startResultPhase(newState))
              } else {
                // Use weighted selection for next question based on current progress
                setProgressState((currentProgress) => {
                  const weightedNextQuestion = getWeightedNoteSelection(currentProgress, 'piano')
                  // Select instrument for the next question
                  const nextInstrument = selectQuizInstrument(currentProgress, weightedNextQuestion)

                  // Check if this is a first-time combo (needs hint)
                  const needsHint = !isComboIntroduced(currentProgress, weightedNextQuestion, nextInstrument)

                  // Update game state with weighted next question and instrument
                  setGameState((prev) => ({
                    ...prev,
                    quiz: {
                      ...prev.quiz,
                      currentQuestion: weightedNextQuestion,
                      currentInstrument: nextInstrument,
                    },
                  }))

                  // Play the weighted next question note on selected instrument
                  audioEngine.playNote(weightedNextQuestion, nextInstrument)
                  showInstrumentIndicator(nextInstrument, 1500)

                  // Show first-time hint if needed
                  if (needsHint) {
                    setHintNote(weightedNextQuestion)
                    setTimeout(() => {
                      setShowFirstTimeHint(true)
                      setCircleStates((prev) => ({ ...prev, [weightedNextQuestion]: 'hint' }))

                      // Clear hint after a moment
                      setTimeout(() => {
                        setShowFirstTimeHint(false)
                        setHintNote(null)
                        setCircleStates((prev) => ({ ...prev, [weightedNextQuestion]: 'idle' }))
                      }, 800)
                    }, FIRST_TIME_HINT_DELAY)

                    // Mark combo as introduced
                    return markComboIntroduced(currentProgress, weightedNextQuestion, nextInstrument)
                  }

                  return currentProgress // Don't modify progress state
                })
              }
            }, QUESTION_PAUSE)
          }, feedbackDuration)

          return newState
        })
      }

      if (phase === PHASES.RESULT) {
        // Allow free play in result phase with instrument cycling
        const eligibleInstruments = getEligibleInstruments(progressState, note)
        const currentIndex = exploreInstrumentIndexRef.current[note] || 0
        const instrument = eligibleInstruments[currentIndex % eligibleInstruments.length]
        exploreInstrumentIndexRef.current[note] = (currentIndex + 1) % eligibleInstruments.length

        audioEngine.playNote(note, instrument)
        playCircle(note)
        showInstrumentIndicator(instrument, 400)
      }
    },
    [phase, activeNotes, playCircle, showInstrumentIndicator, gameState, progressState]
  )

  // ============ Restart Handler ============

  const restart = useCallback(() => {
    clearAllTimers()
    setQuizFeedback(null)
    setPromotionMessage(null)
    setNotesEntering([])
    setNotesExiting([])
    setInstrumentVisible(false)
    setShowInstrumentCelebration(false)
    setCurrentInstrument('piano')
    setNewSoundMessage(null)
    setShowFirstTimeHint(false)
    setHintNote(null)
    // Keep newlyEligibleCombos - they should persist to next session
    const initial = createInitialState()
    // Use current activeNotes from progressState
    setGameState(startListenPhase(initial, progressState.activeNotes))
  }, [progressState.activeNotes, clearAllTimers])

  // ============ Cleanup on Unmount ============

  useEffect(() => {
    return () => {
      clearAllTimers()
    }
  }, [clearAllTimers])

  // ============ Return Value ============

  const quizResults = phase === PHASES.RESULT ? getResults(gameState) : null

  return {
    phase,
    circleStates,
    onCircleTap,
    quizResults,
    quizFeedback,
    currentQuestion: getCurrentQuizQuestion(gameState),
    quizRound: gameState.quiz?.roundNumber,
    quizTotalRounds: gameState.quiz?.totalRounds,
    restart,
    // Progress tracking
    activeNotes,
    promotionMessage,
    notesEntering,
    notesExiting,
    progressState, // Expose for debugging/display
    // Instrument indicator
    currentInstrument,
    instrumentVisible,
    showInstrumentCelebration,
    // New sound unlock
    newSoundMessage,
    showFirstTimeHint,
    hintNote,
  }
}
