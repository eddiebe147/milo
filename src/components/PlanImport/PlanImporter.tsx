import React from 'react'
import { X, FileText, Loader2, AlertCircle } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { GlowText } from '@/components/ui/GlowText'
import { usePlanStore } from '@/stores'
import { PlanInputStep } from './PlanInputStep'
import { PlanReviewStep } from './PlanReviewStep'
import { PlanCompleteStep } from './PlanCompleteStep'

interface PlanImporterProps {
  onClose: () => void
}

export const PlanImporter: React.FC<PlanImporterProps> = ({ onClose }) => {
  const { currentStep, error, reset } = usePlanStore()

  const handleClose = () => {
    reset()
    onClose()
  }

  const getStepTitle = () => {
    switch (currentStep) {
      case 'input':
        return 'Import Plan'
      case 'processing':
        return 'Processing...'
      case 'review':
        return 'Review & Edit'
      case 'applying':
        return 'Applying...'
      case 'complete':
        return 'Import Complete'
      default:
        return 'Import Plan'
    }
  }

  const getStepDescription = () => {
    switch (currentStep) {
      case 'input':
        return 'Paste your plan, notes, or brain dump below'
      case 'processing':
        return 'MILO is extracting goals and tasks...'
      case 'review':
        return 'Review and edit before adding to your list'
      case 'applying':
        return 'Creating goals and tasks...'
      case 'complete':
        return 'Your plan has been imported successfully'
      default:
        return ''
    }
  }

  return (
    <Card variant="default" padding="none" className="h-full flex flex-col">
      {/* Header */}
      <CardHeader className="flex-shrink-0 border-b border-pipboy-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-pipboy-green" />
            <CardTitle>
              <GlowText intensity="high">{getStepTitle()}</GlowText>
            </CardTitle>
          </div>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-pipboy-surface rounded-sm transition-colors"
            title="Close"
          >
            <X size={16} className="text-pipboy-green-dim hover:text-pipboy-green" />
          </button>
        </div>
        <p className="text-xs text-pipboy-green-dim mt-1">{getStepDescription()}</p>
      </CardHeader>

      {/* Content */}
      <CardContent className="flex-1 overflow-hidden p-0">
        {/* Error display */}
        {error && (
          <div className="p-3 bg-pipboy-red/10 border-b border-pipboy-red/30 flex items-center gap-2">
            <AlertCircle size={14} className="text-pipboy-red flex-shrink-0" />
            <span className="text-xs text-pipboy-red">{error}</span>
          </div>
        )}

        {/* Loading states */}
        {(currentStep === 'processing' || currentStep === 'applying') && (
          <div className="flex flex-col items-center justify-center h-full py-12">
            <Loader2 size={32} className="text-pipboy-green animate-spin mb-4" />
            <p className="text-sm text-pipboy-green-dim">
              {currentStep === 'processing' ? 'Analyzing your plan...' : 'Creating items...'}
            </p>
            <p className="text-xs text-pipboy-green-dim/70 mt-2">
              Powered by Claude Haiku
            </p>
          </div>
        )}

        {/* Step content */}
        {currentStep === 'input' && <PlanInputStep />}
        {currentStep === 'review' && <PlanReviewStep />}
        {currentStep === 'complete' && <PlanCompleteStep onClose={handleClose} />}
      </CardContent>
    </Card>
  )
}
