import React, { useState, useEffect } from 'react'
import { Rocket, Key, Target, Activity, Moon, ArrowRight, Check, ExternalLink } from 'lucide-react'

interface OnboardingProps {
  onComplete: () => void
}

type Step = 'welcome' | 'api-key' | 'features' | 'complete'

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState<Step>('welcome')
  const [apiKey, setApiKey] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  // Check if already initialized on mount
  useEffect(() => {
    window.milo?.ai.isInitialized().then(setIsInitialized)
  }, [])

  const handleApiKeySubmit = async () => {
    if (!apiKey.trim()) {
      setError('Please enter your API key')
      return
    }

    setIsValidating(true)
    setError(null)

    try {
      // Save the API key
      await window.milo?.settings.saveApiKey(apiKey.trim())

      // Initialize Claude
      const result = await window.milo?.ai.initialize(apiKey.trim())

      if (result) {
        setIsInitialized(true)
        setStep('features')
      } else {
        setError('Failed to connect to Claude. Please check your API key.')
      }
    } catch {
      setError('Failed to save API key. Please try again.')
    } finally {
      setIsValidating(false)
    }
  }

  const handleSkipApiKey = () => {
    setStep('features')
  }

  const handleComplete = () => {
    // Mark onboarding as complete using localStorage
    localStorage.setItem('milo-onboarding-complete', 'true')
    onComplete()
  }

  return (
    <div className="h-full w-full flex items-center justify-center p-8 bg-pipboy-background">
      <div className="max-w-lg w-full">
        {/* Welcome Step */}
        {step === 'welcome' && (
          <div className="text-center space-y-6 animate-fadeIn">
            <div className="w-24 h-24 mx-auto bg-pipboy-green/10 rounded-full flex items-center justify-center border border-pipboy-green/30">
              <Rocket className="w-12 h-12 text-pipboy-green" />
            </div>

            <div>
              <h1 className="text-3xl font-bold text-pipboy-green glow-medium mb-2">
                Welcome to MILO
              </h1>
              <p className="text-pipboy-green-dim text-lg">
                Mission Intelligence Life Operator
              </p>
            </div>

            <p className="text-pipboy-green/80 leading-relaxed">
              MILO helps you cut through the noise and focus on what truly matters.
              Set goals, track progress, and let AI keep you on course.
            </p>

            <button
              onClick={() => setStep('api-key')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-pipboy-green/20 hover:bg-pipboy-green/30 border border-pipboy-green rounded-lg text-pipboy-green font-medium transition-all"
            >
              Get Started
              <ArrowRight size={18} />
            </button>
          </div>
        )}

        {/* API Key Step */}
        {step === 'api-key' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-pipboy-green/10 rounded-full flex items-center justify-center border border-pipboy-green/30 mb-4">
                <Key className="w-8 h-8 text-pipboy-green" />
              </div>
              <h2 className="text-2xl font-bold text-pipboy-green glow-low mb-2">
                Connect to Claude
              </h2>
              <p className="text-pipboy-green-dim">
                MILO uses Claude AI for smart planning and task parsing.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-pipboy-green-dim mb-2">
                  Claude API Key
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-ant-..."
                  className="w-full px-4 py-3 bg-pipboy-surface border border-pipboy-border rounded-lg text-pipboy-green placeholder:text-pipboy-green-dim/50 focus:outline-none focus:border-pipboy-green/50"
                  onKeyDown={(e) => e.key === 'Enter' && handleApiKeySubmit()}
                />
              </div>

              {error && (
                <p className="text-pipboy-red text-sm">{error}</p>
              )}

              <a
                href="https://console.anthropic.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-pipboy-green-dim hover:text-pipboy-green transition-colors"
              >
                Get an API key from Anthropic Console
                <ExternalLink size={14} />
              </a>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSkipApiKey}
                className="flex-1 px-4 py-3 border border-pipboy-border hover:border-pipboy-green/50 rounded-lg text-pipboy-green-dim hover:text-pipboy-green transition-all"
              >
                Skip for now
              </button>
              <button
                onClick={handleApiKeySubmit}
                disabled={isValidating}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-pipboy-green/20 hover:bg-pipboy-green/30 border border-pipboy-green rounded-lg text-pipboy-green font-medium transition-all disabled:opacity-50"
              >
                {isValidating ? (
                  'Connecting...'
                ) : (
                  <>
                    Connect
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </div>

            {isInitialized && (
              <div className="flex items-center justify-center gap-2 text-green-500">
                <Check size={16} />
                <span>Claude connected!</span>
              </div>
            )}
          </div>
        )}

        {/* Features Step */}
        {step === 'features' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-pipboy-green glow-low mb-2">
                How MILO Works
              </h2>
              <p className="text-pipboy-green-dim">
                Your daily rhythm for maximum signal, minimum noise.
              </p>
            </div>

            <div className="space-y-4">
              <FeatureCard
                icon={<Target className="w-6 h-6" />}
                title="Set Your Goals"
                description="Define your Beacon (big vision), break it into Milestones, then daily Tasks."
              />
              <FeatureCard
                icon={<Rocket className="w-6 h-6" />}
                title="Morning Briefing"
                description="Start each day with an AI-powered planning session. Know exactly what to focus on."
              />
              <FeatureCard
                icon={<Activity className="w-6 h-6" />}
                title="Stay on Track"
                description="MILO monitors your activity and nudges you when you drift off course."
              />
              <FeatureCard
                icon={<Moon className="w-6 h-6" />}
                title="Evening Review"
                description="Reflect on your day, celebrate wins, and prepare for tomorrow."
              />
            </div>

            <button
              onClick={handleComplete}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-pipboy-green/20 hover:bg-pipboy-green/30 border border-pipboy-green rounded-lg text-pipboy-green font-medium transition-all"
            >
              Start Using MILO
              <ArrowRight size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// Feature card component
const FeatureCard: React.FC<{
  icon: React.ReactNode
  title: string
  description: string
}> = ({ icon, title, description }) => (
  <div className="flex gap-4 p-4 bg-pipboy-surface/50 border border-pipboy-border rounded-lg">
    <div className="flex-shrink-0 w-10 h-10 bg-pipboy-green/10 rounded-lg flex items-center justify-center text-pipboy-green">
      {icon}
    </div>
    <div>
      <h3 className="font-medium text-pipboy-green mb-1">{title}</h3>
      <p className="text-sm text-pipboy-green-dim">{description}</p>
    </div>
  </div>
)

export default Onboarding
