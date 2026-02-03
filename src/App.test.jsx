import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

// Mock the audio module
vi.mock('./audio', () => ({
  audioEngine: {
    init: vi.fn().mockResolvedValue(undefined),
    loadInstrument: vi.fn().mockResolvedValue(undefined),
    playNote: vi.fn().mockResolvedValue(undefined),
    isInitialized: vi.fn().mockReturnValue(true),
    getLoadingStatus: vi.fn().mockReturnValue({
      loaded: ['piano'],
      loading: [],
    }),
  },
}))

import App from './App'

describe('App', () => {
  it('renders the audio loader initially', () => {
    render(<App />)
    expect(screen.getByText('Tap to Start')).toBeInTheDocument()
  })

  it('renders the audio test screen after initialization', async () => {
    render(<App />)

    const loader = screen.getByRole('button')
    fireEvent.click(loader)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /audio test/i })).toBeInTheDocument()
    })
  })
})
