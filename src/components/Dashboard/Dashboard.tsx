import React from 'react'
import { StateIndicator } from './StateIndicator'
import { MissionPanel } from './MissionPanel'
import { StatsPanel } from './StatsPanel'
import { QuickCapture } from './QuickCapture'

export const Dashboard: React.FC = () => {
  return (
    <div className="h-full flex flex-col p-4 gap-4 overflow-y-auto">
      {/* State Indicator - Current focus state */}
      <StateIndicator />

      {/* Today's Mission - Active signal tasks */}
      <MissionPanel />

      {/* Quick Capture - Add tasks quickly */}
      <QuickCapture />

      {/* Stats Summary */}
      <StatsPanel />
    </div>
  )
}
