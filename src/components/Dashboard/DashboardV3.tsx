import React, { useState, useEffect } from 'react'
import { CommandInputSimple } from './CommandInputSimple'
import { CategoryTabs } from './CategoryTabs'
import { SignalQueue } from './SignalQueue'
import { BacklogList } from './BacklogList'
import { MorningContext } from './MorningContext'
import { ChatSlidePanel } from '../Chat/ChatSlidePanel'
import { useTasksStore, useCategoriesStore } from '@/stores'

interface DashboardV3Props {
  onOpenMenu?: () => void
}

/**
 * MILO DashboardV3 - Task Execution Engine
 *
 * The new front-face design prioritizes task visibility over state display.
 *
 * Layout (top to bottom):
 * 1. COMMAND: Compact input bar with chat toggle
 * 2. FILTERS: Category tabs for filtering tasks
 * 3. CONTEXT: Morning continuity banner (conditional, first visit only)
 * 4. SIGNAL: Top 3-5 priority tasks to focus on NOW
 * 5. BACKLOG: All remaining tasks (collapsible)
 *
 * Plus:
 * - Chat slide-out panel (triggered from command bar)
 *
 * What's removed from V2:
 * - HeroState (pause/resume, state indicator)
 * - StatsStrip (gamification scores)
 * - Inline chat history (moved to slide-out panel)
 */
export const DashboardV3: React.FC<DashboardV3Props> = ({ onOpenMenu: _onOpenMenu }) => {
  const [isChatOpen, setIsChatOpen] = useState(false)

  const { fetchSignalQueue, fetchAllTasks } = useTasksStore()
  const { fetchCategories } = useCategoriesStore()

  // Initial data fetch on mount
  useEffect(() => {
    // Fetch all data in parallel
    Promise.all([
      fetchSignalQueue(),
      fetchAllTasks(),
      fetchCategories(),
    ])
  }, [fetchSignalQueue, fetchAllTasks, fetchCategories])

  const handleOpenChat = () => {
    setIsChatOpen(true)
  }

  const handleCloseChat = () => {
    setIsChatOpen(false)
  }

  return (
    <div className="h-full flex flex-col bg-pipboy-background">
      {/* COMMAND: Input bar with chat toggle */}
      <div className="p-4 border-b border-pipboy-border">
        <CommandInputSimple onOpenChat={handleOpenChat} />
      </div>

      {/* FILTERS: Category tabs */}
      <div className="py-2 border-b border-pipboy-border bg-pipboy-surface/30">
        <CategoryTabs />
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">
          {/* CONTEXT: Morning continuity banner (shows on first visit) */}
          <MorningContext />

          {/* SIGNAL: Top priority tasks */}
          <SignalQueue />

          {/* BACKLOG: All remaining tasks */}
          <BacklogList />
        </div>
      </div>

      {/* Chat slide-out panel */}
      <ChatSlidePanel
        isOpen={isChatOpen}
        onClose={handleCloseChat}
      />
    </div>
  )
}

export default DashboardV3
