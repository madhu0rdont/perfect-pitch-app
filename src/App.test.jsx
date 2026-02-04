import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

// Mock the audio module
vi.mock('./audio', () => ({
  audioEngine: {
    init: vi.fn().mockResolvedValue(undefined),
    loadAllInstruments: vi.fn().mockResolvedValue(undefined),
    playNote: vi.fn().mockResolvedValue(undefined),
    playReward: vi.fn(),
    isInitialized: vi.fn().mockReturnValue(true),
    getLoadingProgress: vi.fn().mockReturnValue({
      loaded: 3,
      total: 3,
      instruments: {
        piano: 'ready',
        violin: 'ready',
        'guitar-acoustic': 'ready',
      },
    }),
  },
}))

import App from './App'

describe('App', () => {
  it('renders the audio loader initially', () => {
    render(<App />)
    expect(screen.getByText('Tap to Start')).toBeInTheDocument()
  })

  it('renders the game screen after initialization', async () => {
    render(<App />)

    const loader = screen.getByRole('button')
    fireEvent.click(loader)

    await waitFor(() => {
      // GameScreen shows the phase indicator and note circles
      expect(screen.getByText('Listen...')).toBeInTheDocument()
      expect(screen.getByLabelText('Play C')).toBeInTheDocument()
      expect(screen.getByLabelText('Play G')).toBeInTheDocument()
    })
  })
})
