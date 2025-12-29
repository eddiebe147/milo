import { useState, useEffect } from 'react'
import { DashboardV3 } from '@/components/Dashboard/DashboardV3'
import { MorningBriefing, EveningReview } from '@/components/Dialogue'
import { PlanImporter } from '@/components/PlanImport'
import { CRTOverlay } from '@/components/ui/CRTOverlay'
import { TitleBar } from '@/components/ui/TitleBar'
import { NudgeToastContainer } from '@/components/ui/NudgeToast'
import { CommandPalette, useCommandPalette } from '@/components/CommandPalette'
import { ThemeSettings, ApiKeySettings, SettingsPage } from '@/components/Settings'
import { useNudgeStore, useAIStore } from '@/stores'
import { useThemeColors } from '@/hooks/useThemeColors'
import { ModalProvider, useModal } from '@/contexts/ModalContext'

type View = 'dashboard' | 'settings' | 'onboarding' | 'plan-import'

/**
 * AppContent - Main app component that uses modal context
 * Separated from App to allow ModalProvider to wrap it
 */
function AppContent() {
  const [currentView, setCurrentView] = useState<View>('dashboard')

  const { activeNudges, dismissNudge, snoozeApp, setupEventListener } = useNudgeStore()
  const { startMorningBriefing, startEveningReview } = useAIStore()
  const { isOpen: isCommandPaletteOpen, close: closeCommandPalette } = useCommandPalette()
  const { isOpen, openModalWithType, closeModal } = useModal()

  // Inject theme colors as CSS variables
  useThemeColors()

  // Set up nudge event listener
  useEffect(() => {
    const cleanup = setupEventListener()
    return cleanup
  }, [setupEventListener])

  // Listen for navigation events from main process
  useEffect(() => {
    const unsubMorning = window.milo?.events.onShowMorningBriefing(() => {
      startMorningBriefing()
      openModalWithType('morningBriefing')
    })

    const unsubEvening = window.milo?.events.onShowEveningReview(() => {
      startEveningReview()
      openModalWithType('eveningReview')
    })

    const unsubSettings = window.milo?.events.onShowSettings(() => {
      setCurrentView('settings')
    })

    return () => {
      unsubMorning?.()
      unsubEvening?.()
      unsubSettings?.()
    }
  }, [startMorningBriefing, startEveningReview, openModalWithType])

  // Handle snooze from nudge toast
  const handleSnooze = (index: number, minutes: number) => {
    const nudge = activeNudges[index]
    if (nudge) {
      snoozeApp(nudge.currentApp, minutes)
    }
  }

  return (
    <div className="h-full w-full flex flex-col overflow-hidden bg-pipboy-background">
      {/* CRT Effect Overlay */}
      <CRTOverlay />

      {/* Title Bar */}
      <TitleBar />

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {currentView === 'dashboard' && (
          <DashboardV3 onOpenMenu={() => setCurrentView('settings')} />
        )}
        {currentView === 'plan-import' && (
          <PlanImporter onClose={() => setCurrentView('dashboard')} />
        )}
        {currentView === 'settings' && (
          <SettingsPage onBack={() => setCurrentView('dashboard')} />
        )}
      </main>

      {/* Dialogue Modals */}
      <MorningBriefing
        isOpen={isOpen('morningBriefing')}
        onClose={closeModal}
      />
      <EveningReview
        isOpen={isOpen('eveningReview')}
        onClose={closeModal}
      />

      {/* Settings Modals */}
      <ThemeSettings
        isOpen={isOpen('themeSettings')}
        onClose={closeModal}
      />
      <ApiKeySettings
        isOpen={isOpen('apiSettings')}
        onClose={closeModal}
      />

      {/* Nudge Toasts */}
      <NudgeToastContainer
        nudges={activeNudges}
        onDismiss={dismissNudge}
        onSnooze={handleSnooze}
      />

      {/* Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={closeCommandPalette}
        onNavigate={setCurrentView}
      />
    </div>
  )
}

/**
 * App - Root component with ModalProvider
 */
function App() {
  return (
    <ModalProvider>
      <AppContent />
    </ModalProvider>
  )
}

export default App
