import AudioLoader from './components/AudioLoader'
import GameScreen from './components/GameScreen'
import './App.css'

function App() {
  return (
    <AudioLoader>
      <GameScreen />
    </AudioLoader>
  )
}

export default App
