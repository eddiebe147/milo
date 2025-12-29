import React, { useEffect, useState } from 'react'
import { ProjectTabs } from './ProjectTabs'
import { SignalQueue } from './SignalQueue'
import { ProjectsList } from './ProjectsList'
import { MorningContext } from './MorningContext'
import { AddTaskModal } from './AddTaskModal'
import { AddProjectModal } from './AddProjectModal'
import { ChatBottomPanel } from '../Chat/ChatBottomPanel'
import { useTasksStore, useProjectsStore } from '@/stores'

interface DashboardV3Props {
  onOpenMenu?: () => void
}

/**
 * MILO DashboardV3 - Task Execution Engine
 *
 * The new front-face design prioritizes task visibility over state display.
 *
 * Layout (top to bottom):
 * 1. FILTERS: Project tabs for filtering tasks
 * 2. CONTEXT: Morning continuity banner (conditional, first visit only)
 * 3. SIGNAL: Top 3-5 priority tasks to focus on NOW
 * 4. PROJECTS: Collapsible project cards with their tasks
 * 5. CHAT: Bottom-docked collapsible chat panel (always visible)
 *
 * What's removed from V2:
 * - HeroState (pause/resume, state indicator)
 * - StatsStrip (gamification scores)
 * - CommandInputSimple (replaced by ChatBottomPanel)
 * - ChatSlidePanel (replaced by ChatBottomPanel)
 */
export const DashboardV3: React.FC<DashboardV3Props> = ({ onOpenMenu: _onOpenMenu }) => {
  const { fetchSignalQueue, fetchAllTasks } = useTasksStore()
  const { fetchProjects, activeFilter } = useProjectsStore()

  // Modal states
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false)

  // Initial data fetch on mount
  useEffect(() => {
    // Fetch all data in parallel
    Promise.all([
      fetchSignalQueue(),
      fetchAllTasks(),
      fetchProjects(),
    ])
  }, [fetchSignalQueue, fetchAllTasks, fetchProjects])

  // Listen for modal open events from child components
  useEffect(() => {
    const handleOpenTaskModal = () => setIsTaskModalOpen(true)
    const handleOpenProjectModal = () => setIsProjectModalOpen(true)

    document.addEventListener('milo:openTaskModal', handleOpenTaskModal)
    document.addEventListener('milo:openProjectModal', handleOpenProjectModal)

    return () => {
      document.removeEventListener('milo:openTaskModal', handleOpenTaskModal)
      document.removeEventListener('milo:openProjectModal', handleOpenProjectModal)
    }
  }, [])

  return (
    <div className="h-full flex flex-col bg-pipboy-background">
      {/* FILTERS: Project tabs */}
      <div className="py-2 border-b border-pipboy-border bg-pipboy-surface/30">
        <ProjectTabs />
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">
          {/* CONTEXT: Morning continuity banner (shows on first visit) */}
          <MorningContext />

          {/* SIGNAL: Top priority tasks */}
          <SignalQueue />

          {/* PROJECTS: Collapsible project cards with tasks */}
          <ProjectsList />
        </div>
      </div>

      {/* CHAT: Bottom-docked collapsible chat panel */}
      <ChatBottomPanel />

      {/* Modals */}
      <AddTaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        defaultProjectId={activeFilter}
      />
      <AddProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
      />
    </div>
  )
}

// Export modal opener for use by child components
export const useDashboardModals = () => {
  // This would be better as context, but for now we use a simple approach
  return {
    openTaskModal: () => document.dispatchEvent(new CustomEvent('milo:openTaskModal')),
    openProjectModal: () => document.dispatchEvent(new CustomEvent('milo:openProjectModal')),
  }
}

export default DashboardV3
