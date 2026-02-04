import './InstrumentIndicator.css'

/**
 * Instrument emoji mapping
 */
const INSTRUMENT_EMOJIS = {
  piano: '🎹',
  violin: '🎻',
  'guitar-acoustic': '🎸',
}

/**
 * InstrumentIndicator — shows which instrument is currently playing.
 * Displays an emoji that fades in/out when notes play.
 *
 * @param {Object} props
 * @param {string} props.instrument - Current instrument ('piano', 'violin', 'guitar-acoustic')
 * @param {boolean} props.visible - Whether the indicator should be visible
 * @param {boolean} props.isQuizPhase - Whether we're in the QUIZ phase (larger display)
 * @param {string} props.correctNote - Note that was correct (for celebration positioning)
 * @param {boolean} props.showCelebration - Show celebration mode (near correct circle)
 */
function InstrumentIndicator({
  instrument,
  visible = false,
  isQuizPhase = false,
  showCelebration = false,
}) {
  const emoji = INSTRUMENT_EMOJIS[instrument] || INSTRUMENT_EMOJIS.piano

  const className = [
    'instrument-indicator',
    visible ? 'instrument-indicator--visible' : '',
    isQuizPhase ? 'instrument-indicator--quiz' : '',
    showCelebration ? 'instrument-indicator--celebration' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={className} aria-label={`Playing on ${instrument}`}>
      <span className="instrument-indicator__emoji">{emoji}</span>
      {isQuizPhase && visible && (
        <span className="instrument-indicator__hint">Listen...</span>
      )}
    </div>
  )
}

export default InstrumentIndicator
