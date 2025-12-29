/**
 * ChatSlidePanel Usage Examples
 *
 * This file demonstrates various ways to use the ChatSlidePanel component
 */

import React, { useState } from 'react'
import { MessageSquare } from 'lucide-react'
import { ChatSlidePanel } from './ChatSlidePanel'
import { Button } from '@/components/ui/Button'

/**
 * Example 1: Basic usage with toggle button
 */
export const BasicExample: React.FC = () => {
  const [isPanelOpen, setIsPanelOpen] = useState(false)

  return (
    <div className="relative">
      {/* Trigger button */}
      <Button
        onClick={() => setIsPanelOpen(true)}
        variant="primary"
        glow
      >
        <MessageSquare className="w-5 h-5" />
        Open Chat
      </Button>

      {/* Chat panel */}
      <ChatSlidePanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
      />
    </div>
  )
}

/**
 * Example 2: Floating action button in corner
 */
export const FloatingButtonExample: React.FC = () => {
  const [isPanelOpen, setIsPanelOpen] = useState(false)

  return (
    <>
      {/* Floating button - bottom right */}
      <div className="fixed bottom-6 right-6 z-30">
        <Button
          onClick={() => setIsPanelOpen(true)}
          variant="primary"
          glow
          size="lg"
          className="rounded-full shadow-2xl"
        >
          <MessageSquare className="w-6 h-6" />
        </Button>
      </div>

      {/* Chat panel */}
      <ChatSlidePanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
      />
    </>
  )
}

/**
 * Example 3: Integrated with header/navigation
 */
export const HeaderIntegrationExample: React.FC = () => {
  const [isPanelOpen, setIsPanelOpen] = useState(false)

  return (
    <div className="min-h-screen">
      {/* App Header */}
      <header className="h-16 border-b border-pipboy-border bg-pipboy-surface flex items-center justify-between px-6">
        <h1 className="text-xl font-bold text-pipboy-green">MILO Dashboard</h1>

        {/* Chat button in header */}
        <Button
          onClick={() => setIsPanelOpen(true)}
          variant="ghost"
          className="hover:bg-pipboy-green/10"
        >
          <MessageSquare className="w-5 h-5" />
          <span className="ml-2">Chat with MILO</span>
        </Button>
      </header>

      {/* Main content */}
      <main className="p-6">
        <p className="text-pipboy-green">Your app content here...</p>
      </main>

      {/* Chat panel */}
      <ChatSlidePanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
      />
    </div>
  )
}

/**
 * Example 4: Programmatic control (open on certain events)
 */
export const ProgrammaticExample: React.FC = () => {
  const [isPanelOpen, setIsPanelOpen] = useState(false)

  const handleNeedHelp = () => {
    // Automatically open chat when user needs help
    setIsPanelOpen(true)
  }

  return (
    <div className="p-6">
      <div className="space-y-4">
        <Button onClick={handleNeedHelp} variant="secondary">
          I need help with something
        </Button>

        <Button onClick={() => setIsPanelOpen(true)} variant="primary">
          Ask MILO a question
        </Button>
      </div>

      <ChatSlidePanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
      />
    </div>
  )
}

/**
 * Example 5: Using with store's built-in state
 *
 * Note: The chatStore already has isOpen, openPanel, closePanel methods
 * You can use those instead of local state if you want global chat state
 */
import { useChatStore } from '@/stores'

export const StoreIntegrationExample: React.FC = () => {
  const { isOpen, openPanel, closePanel } = useChatStore()

  return (
    <div className="relative">
      <Button onClick={openPanel} variant="primary" glow>
        <MessageSquare className="w-5 h-5" />
        Open Global Chat
      </Button>

      <ChatSlidePanel
        isOpen={isOpen}
        onClose={closePanel}
      />
    </div>
  )
}
