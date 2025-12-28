import { useState, useEffect } from 'react'
import { Dashboard } from '@/components/Dashboard/Dashboard'
import { MorningBriefing, EveningReview } from '@/components/Dialogue'
import { PlanImporter } from '@/components/PlanImport'
import { CRTOverlay } from '@/components/ui/CRTOverlay'
import { TitleBar } from '@/components/ui/TitleBar'
import { NudgeToastContainer } from '@/components/ui/NudgeToast'
import { useNudgeStore, useAIStore } from '@/stores'

type View = 'dashboard' | 'settings' | 'onboarding' | 'plan-import'

function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard')
  const [isMorningOpen, setIsMorningOpen] = useState(false)
  const [isEveningOpen, setIsEveningOpen] = useState(false)

  const { activeNudges, dismissNudge, snoozeApp, setupEventListener } = useNudgeStore()
  const { startMorningBriefing, startEveningReview } = useAIStore()

  // Set up nudge event listener
  useEffect(() => {
    const cleanup = setupEventListener()
    return cleanup
  }, [setupEventListener])

  // Listen for navigation events from main process
  useEffect(() => {
    const unsubMorning = window.milo?.events.onShowMorningBriefing(() => {
      startMorningBriefing()
      setIsMorningOpen(true)
    })

    const unsubEvening = window.milo?.events.onShowEveningReview(() => {
      startEveningReview()
      setIsEveningOpen(true)
    })

    const unsubSettings = window.milo?.events.onShowSettings(() => {
      setCurrentView('settings')
    })

    return () => {
      unsubMorning?.()
      unsubEvening?.()
      unsubSettings?.()
    }
  }, [startMorningBriefing, startEveningReview])

  // Handle snooze from nudge toast
  const handleSnooze = (index: number, minutes: number) => {
    const nudge = activeNudges[index]
    if (nudge) {
      snoozeApp(nudge.currentApp, minutes)
    }
  }

  return (
    <div className="h-full w-full bg-pipboy-background flex flex-col overflow-hidden rounded-lg">
      {/* CRT Effect Overlay */}
      <CRTOverlay />

      {/* Title Bar */}
      <TitleBar />

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {currentView === 'dashboard' && (
          <Dashboard onOpenPlanImport={() => setCurrentView('plan-import')} />
        )}
        {currentView === 'plan-import' && (
          <PlanImporter onClose={() => setCurrentView('dashboard')} />
        )}
        {currentView === 'settings' && (
          <div className="p-4 text-pipboy-green">
            <h2 className="text-xl glow-medium mb-4">Settings</h2>
            <p className="text-pipboy-green-dim">Coming soon...</p>
            <button
              className="btn-pipboy mt-4"
              onClick={() => setCurrentView('dashboard')}
            >
              Back to Dashboard
            </button>
          </div>
        )}
      </main>

      {/* Dialogue Modals */}
      <MorningBriefing
        isOpen={isMorningOpen}
        onClose={() => setIsMorningOpen(false)}
      />
      <EveningReview
        isOpen={isEveningOpen}
        onClose={() => setIsEveningOpen(false)}
      />

      {/* Nudge Toasts */}
      <NudgeToastContainer
        nudges={activeNudges}
        onDismiss={dismissNudge}
        onSnooze={handleSnooze}
      />
    </div>
  )
}

export default App
