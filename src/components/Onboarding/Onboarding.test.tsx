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

        // Check for "Welcome to MILO" text
        const welcomeText = screen.getByText('Welcome to MILO')
        expect(welcomeText).toBeInTheDocument()
        // Verify animation classes are present
        expect(welcomeText).toHaveClass('animate-fadeIn')

        // Check for "Get Started" button
        const button = screen.getByRole('button', { name: /get started/i })
        expect(button).toBeInTheDocument()
        expect(button).toHaveClass('animate-fadeIn')
        expect(button).toHaveStyle({ animationDelay: '500ms' })
    })
})
