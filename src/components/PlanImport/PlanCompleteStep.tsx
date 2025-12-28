import React from 'react'
import { CheckCircle, Target, CheckSquare, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { GlowText } from '@/components/ui/GlowText'
import { usePlanStore } from '@/stores'

interface PlanCompleteStepProps {
  onClose: () => void
}

export const PlanCompleteStep: React.FC<PlanCompleteStepProps> = ({ onClose }) => {
  const { applyResult, reset } = usePlanStore()

  if (!applyResult) return null

  const handleImportMore = () => {
    reset()
  }

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center">
      {/* Success icon */}
      <div className="w-16 h-16 rounded-full bg-pipboy-green/20 flex items-center justify-center mb-4">
        <CheckCircle size={32} className="text-pipboy-green" />
      </div>

      {/* Success message */}
      <GlowText intensity="high" color="green" className="text-lg font-bold mb-2">
        Plan Imported Successfully!
      </GlowText>

      {/* Stats */}
      <div className="flex items-center justify-center gap-6 mb-6">
        {applyResult.goalsCreated > 0 && (
          <div className="flex items-center gap-2 text-pipboy-green-dim">
            <Target size={16} className="text-pipboy-green" />
            <span className="text-sm">
              {applyResult.goalsCreated} goal{applyResult.goalsCreated !== 1 ? 's' : ''} created
            </span>
          </div>
        )}
        {applyResult.tasksCreated > 0 && (
          <div className="flex items-center gap-2 text-pipboy-green-dim">
            <CheckSquare size={16} className="text-pipboy-green" />
            <span className="text-sm">
              {applyResult.tasksCreated} task{applyResult.tasksCreated !== 1 ? 's' : ''} created
            </span>
          </div>
        )}
      </div>

      {/* Motivational text */}
      <p className="text-xs text-pipboy-green-dim mb-6 max-w-[250px]">
        Your imported items are now ready. Run a Morning Briefing to prioritize today's signal tasks.
      </p>

      {/* Actions */}
      <div className="flex flex-col gap-2 w-full max-w-[200px]">
        <Button onClick={onClose} variant="primary" className="w-full flex items-center justify-center gap-2">
          View Dashboard
          <ArrowRight size={14} />
        </Button>
        <Button onClick={handleImportMore} variant="ghost" className="w-full">
          Import Another Plan
        </Button>
      </div>
    </div>
  )
}
