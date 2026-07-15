import { render, screen } from '@testing-library/react'
import { Onboarding } from './Onboarding'
import { describe, it, expect, vi } from 'vitest'

// Mock window.milo
window.milo = {
    ai: {
        isInitialized: vi.fn().mockResolvedValue(false),
        initialize: vi.fn(),
    },
    settings: {
        saveApiKey: vi.fn(),
    }
} as any

describe('Onboarding', () => {
    it('renders welcome step with animations', () => {
        render(<Onboarding onComplete={() => { }} />)

        // Check for "MILO" heading via MiloLogo
        const miloText = screen.getByText('MILO')
        expect(miloText).toBeInTheDocument()

        // Check for subtitle text
        const subtitle = screen.getByText('Mission Intelligence Life Operator')
        expect(subtitle).toBeInTheDocument()

        // Check for "Get Started" button
        const button = screen.getByRole('button', { name: /get started/i })
        expect(button).toBeInTheDocument()
    })
})
