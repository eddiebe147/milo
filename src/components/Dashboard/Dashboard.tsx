import React from 'react'
import { FileText } from 'lucide-react'
import { StateIndicator } from './StateIndicator'
import { MissionPanel } from './MissionPanel'
import { StatsPanel } from './StatsPanel'
import { QuickCapture } from './QuickCapture'

interface DashboardProps {
  onOpenPlanImport?: () => void
}

export const Dashboard: React.FC<DashboardProps> = ({ onOpenPlanImport }) => {
  return (
    <div className="h-full flex flex-col p-4 gap-4 overflow-y-auto">
      {/* State Indicator - Current focus state */}
      <StateIndicator />

      {/* Today's Mission - Active signal tasks */}
      <MissionPanel />

      {/* Quick Capture - Add tasks quickly */}
      <QuickCapture />

      {/* Import Plan Button */}
      {onOpenPlanImport && (
        <button
          onClick={onOpenPlanImport}
          className={`
            w-full p-3 rounded-sm border border-dashed border-pipboy-border
            flex items-center justify-center gap-2
            text-pipboy-green-dim hover:text-pipboy-green
            hover:border-pipboy-green/50 hover:bg-pipboy-surface/50
            transition-all duration-200
          `}
        >
          <FileText size={16} />
          <span className="text-sm">Import plan or notes</span>
        </button>
      )}

      {/* Stats Summary */}
      <StatsPanel />
    </div>
  )
}
