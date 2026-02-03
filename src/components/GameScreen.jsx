import { useGamePhase } from '../hooks/useGamePhase'
import NoteCircle from './NoteCircle'
import { NOTE_CONFIGS, getCircleAngle } from '../constants/notes'
import { PHASES } from '../engine/PhaseManager'
import './GameScreen.css'

// Hardcoded active notes for now
const ACTIVE_NOTES = ['C4', 'G4']

/**
 * Phase indicator messages
 */
const PHASE_MESSAGES = {
  [PHASES.LISTEN]: 'Listen...',
  [PHASES.EXPLORE]: 'Try tapping!',
  [PHASES.QUIZ]: 'Which note?',
  [PHASES.RESULT]: 'Great job!',
}

/**
 * Calculate circle size based on number of active notes.
 * Fewer notes = larger circles.
 */
function getCircleSize(count) {
  if (count <= 2) return 120
  if (count <= 4) return 100
  if (count <= 6) return 85
  return 70
}

/**
 * GameScreen — the main game view that displays NoteCircles
 * arranged in a Circle of Fifths layout.
 */
function GameScreen() {
  const {
    phase,
    circleStates,
    onCircleTap,
    quizResults,
    quizFeedback,
    quizRound,
    quizTotalRounds,
    restart,
  } = useGamePhase(ACTIVE_NOTES)

  const circleSize = getCircleSize(ACTIVE_NOTES.length)
  const radius = Math.max(120, circleSize * 1.8)

  // Determine if circles should be disabled
  const circlesDisabled = phase === PHASES.LISTEN

  return (
    <div className="game-screen">
      <div className="game-screen__header">
        <span className="game-screen__phase">{PHASE_MESSAGES[phase]}</span>
        {phase === PHASES.QUIZ && (
          <span className="game-screen__round">
            Round {quizRound} of {quizTotalRounds}
          </span>
        )}
      </div>

      <div className="game-screen__circle-container">
        <div
          className="game-screen__circle-of-fifths"
          style={{
            '--circle-size': `${circleSize}px`,
            '--circle-radius': `${radius}px`,
          }}
        >
          {ACTIVE_NOTES.map((note) => {
            const angle = getCircleAngle(note)
            const state = circleStates[note] || 'idle'

            return (
              <div
                key={note}
                className="game-screen__note-position"
                style={{
                  '--angle': `${angle}deg`,
                }}
              >
                <NoteCircle
                  note={note}
                  onTap={onCircleTap}
                  state={state}
                  disabled={circlesDisabled}
                />
              </div>
            )
          })}
        </div>
      </div>

      <div className="game-screen__footer">
        {phase === PHASES.RESULT && (
          <div className="game-screen__results">
            <button
              className="game-screen__restart-button"
              onClick={restart}
            >
              Play Again
            </button>
          </div>
        )}

        {phase === PHASES.QUIZ && quizFeedback && (
          <div
            className={`game-screen__feedback ${quizFeedback.correct ? 'correct' : 'incorrect'}`}
          >
            {quizFeedback.correct ? 'Correct!' : `It was ${NOTE_CONFIGS[quizFeedback.correctNote]?.label}`}
          </div>
        )}
      </div>
    </div>
  )
}

export default GameScreen
