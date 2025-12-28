import { useState, useEffect } from 'react'
import { Dashboard } from '@/components/Dashboard/Dashboard'
import { CRTOverlay } from '@/components/ui/CRTOverlay'
import { TitleBar } from '@/components/ui/TitleBar'

type View = 'dashboard' | 'morning' | 'evening' | 'settings' | 'onboarding'

function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard')

  useEffect(() => {
    // Listen for navigation events from main process
    const unsubMorning = window.milo?.events.onShowMorningBriefing(() => {
      setCurrentView('morning')
    })

    const unsubEvening = window.milo?.events.onShowEveningReview(() => {
      setCurrentView('evening')
    })

    const unsubSettings = window.milo?.events.onShowSettings(() => {
      setCurrentView('settings')
    })

    return () => {
      unsubMorning?.()
      unsubEvening?.()
      unsubSettings?.()
    }
  }, [])

  return (
    <div className="h-full w-full bg-pipboy-background flex flex-col overflow-hidden rounded-lg">
      {/* CRT Effect Overlay */}
      <CRTOverlay />

      {/* Title Bar */}
      <TitleBar />

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {currentView === 'dashboard' && <Dashboard />}
        {currentView === 'morning' && (
          <div className="p-4 text-pipboy-green">
            <h2 className="text-xl glow-medium mb-4">Morning Briefing</h2>
            <p className="text-pipboy-green-dim">Coming soon...</p>
            <button
              className="btn-pipboy mt-4"
              onClick={() => setCurrentView('dashboard')}
            >
              Back to Dashboard
            </button>
          </div>
        )}
        {currentView === 'evening' && (
          <div className="p-4 text-pipboy-green">
            <h2 className="text-xl glow-medium mb-4">Evening Review</h2>
            <p className="text-pipboy-green-dim">Coming soon...</p>
            <button
              className="btn-pipboy mt-4"
              onClick={() => setCurrentView('dashboard')}
            >
              Back to Dashboard
            </button>
          </div>
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
    </div>
  )
}

export default App
