import React from 'react'
import { HeroState } from './HeroState'
import { CommandInput } from './CommandInput'
import { MissionList } from './MissionList'
import { StatsStrip } from './StatsStrip'

interface DashboardV2Props {
  onOpenMenu?: () => void
}

/**
 * MILO Command Center - Redesigned Dashboard
 *
 * Layout hierarchy:
 * 1. HERO: State Indicator (ON MISSION / ADJACENT / DRIFTED)
 * 2. PRIMARY: Command Input (voice + text to MILO)
 * 3. SECONDARY: Signal Tasks (what to work on)
 * 4. TERTIARY: Stats Strip (compact metrics)
 */
export const DashboardV2: React.FC<DashboardV2Props> = ({ onOpenMenu: _onOpenMenu }) => {
  return (
    <div className="h-full flex flex-col bg-pipboy-background">
      {/* HERO: State Indicator */}
      <div className="border-b border-pipboy-border">
        <HeroState />
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto">
        {/* PRIMARY: Command Input (Talk to MILO) */}
        <div className="p-4 border-b border-pipboy-border">
          <CommandInput />
        </div>

        {/* SECONDARY: Signal Tasks */}
        <div className="p-4">
          <MissionList />
        </div>
      </div>

      {/* TERTIARY: Stats Strip (fixed at bottom) */}
      <StatsStrip />
    </div>
  )
}

export default DashboardV2
