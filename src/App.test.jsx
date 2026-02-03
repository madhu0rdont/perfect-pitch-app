import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

// Mock the audio module
vi.mock('./audio', () => ({
  audioEngine: {
    init: vi.fn().mockResolvedValue(undefined),
    loadInstrument: vi.fn().mockResolvedValue(undefined),
    playNote: vi.fn().mockResolvedValue(undefined),
    isInitialized: vi.fn().mockReturnValue(true),
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
      expect(screen.getByText('Listen & Learn')).toBeInTheDocument()
      expect(screen.getByLabelText('Play C')).toBeInTheDocument()
      expect(screen.getByLabelText('Play G')).toBeInTheDocument()
    })
  })
})
