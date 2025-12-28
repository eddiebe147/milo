import React from 'react'
import { Sparkles, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { usePlanStore } from '@/stores'

export const PlanInputStep: React.FC = () => {
  const { rawInput, additionalContext, setRawInput, setAdditionalContext, processPlan, isProcessing } = usePlanStore()
  const [showContext, setShowContext] = React.useState(false)

  const handleProcess = async () => {
    await processPlan()
  }

  const examplePlaceholder = `Paste your plan here. Examples:

Meeting notes:
"Q1 Goals discussion - need to launch MVP by March, set up user interviews next week, review competitor analysis..."

Brain dump:
"Build auth system, design landing page (high priority), set up analytics, call investor Friday, prepare demo..."

Project plan:
"Phase 1: Research (2 weeks)
- User interviews
- Market analysis
Phase 2: Design (3 weeks)
- Wireframes
- Prototype..."`

  return (
    <div className="p-4 flex flex-col h-full">
      {/* Main input */}
      <div className="flex-1 flex flex-col min-h-0">
        <label className="text-xs text-pipboy-green-dim mb-2 block">
          Plan / Notes / Brain Dump
        </label>
        <textarea
          value={rawInput}
          onChange={(e) => setRawInput(e.target.value)}
          placeholder={examplePlaceholder}
          className={`
            flex-1 w-full p-3 rounded-sm
            bg-pipboy-surface border border-pipboy-border
            text-pipboy-green text-sm font-mono
            placeholder:text-pipboy-green-dim/50
            focus:outline-none focus:border-pipboy-green/50
            resize-none
          `}
        />
      </div>

      {/* Additional context (collapsible) */}
      <div className="mt-3">
        <button
          onClick={() => setShowContext(!showContext)}
          className="flex items-center gap-1 text-xs text-pipboy-green-dim hover:text-pipboy-green transition-colors"
        >
          {showContext ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          Additional context (optional)
        </button>

        {showContext && (
          <textarea
            value={additionalContext}
            onChange={(e) => setAdditionalContext(e.target.value)}
            placeholder="Add context like: 'These are tasks for my SaaS startup' or 'Focus on Q1 priorities'"
            className={`
              w-full p-2 mt-2 rounded-sm h-20
              bg-pipboy-surface border border-pipboy-border
              text-pipboy-green text-xs font-mono
              placeholder:text-pipboy-green-dim/50
              focus:outline-none focus:border-pipboy-green/50
              resize-none
            `}
          />
        )}
      </div>

      {/* Process button */}
      <div className="mt-4 flex justify-end">
        <Button
          onClick={handleProcess}
          disabled={!rawInput.trim() || isProcessing}
          variant="primary"
          className="flex items-center gap-2"
        >
          <Sparkles size={14} />
          Process with AI
        </Button>
      </div>

      {/* Info text */}
      <p className="text-[10px] text-pipboy-green-dim/70 mt-3 text-center">
        MILO will extract goals, tasks, deadlines, and priorities from your text
      </p>
    </div>
  )
}
