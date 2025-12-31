import React, { useState, useEffect } from 'react'
import {
  Settings,
  Clock,
  Bell,
  Monitor,
  Key,
  Palette,
  ChevronLeft,
  ChevronRight,
  ToggleLeft,
  ToggleRight,
  Save,
  RotateCcw,
  RefreshCw,
  Pause,
  Shield,
} from 'lucide-react'
import { useSettingsStore } from '@/stores/settingsStore'
import { useModal } from '@/contexts/ModalContext'
import type { UserSettings } from '@/types'

interface SettingsPageProps {
  onBack: () => void
}

// Day names for work days selector
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/**
 * AnalyticsToggle - Standalone component for analytics opt-in/out
 * Uses its own state since analytics is managed via IPC, not the settings store
 */
const AnalyticsToggle: React.FC = () => {
  const [isEnabled, setIsEnabled] = useState(false)
  const [isAvailable, setIsAvailable] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadAnalyticsState = async () => {
      try {
        const [enabled, available] = await Promise.all([
          window.milo.analytics.isEnabled(),
          window.milo.analytics.isAvailable(),
        ])
        setIsEnabled(enabled)
        setIsAvailable(available)
      } catch (error) {
        console.error('Failed to load analytics state:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadAnalyticsState()
  }, [])

  const handleToggle = async () => {
    try {
      if (isEnabled) {
        await window.milo.analytics.disable()
        setIsEnabled(false)
      } else {
        await window.milo.analytics.enable()
        setIsEnabled(true)
      }
    } catch (error) {
      console.error('Failed to toggle analytics:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-between py-2">
        <div>
          <span className="text-sm text-pipboy-green-dim">Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <span className="text-sm text-pipboy-green">Help Improve MILO</span>
        <p className="text-[10px] text-pipboy-green-dim/60">
          {isAvailable
            ? 'Share anonymous usage data to help us improve'
            : 'Analytics unavailable (no API key configured)'}
        </p>
      </div>
      <button
        onClick={handleToggle}
        disabled={!isAvailable}
        className={`
          p-1 rounded-sm transition-all
          ${!isAvailable ? 'opacity-50 cursor-not-allowed' : ''}
          ${isEnabled ? 'text-pipboy-green' : 'text-pipboy-green-dim'}
        `}
      >
        {isEnabled ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
      </button>
    </div>
  )
}

/**
 * SettingsPage - Comprehensive settings management
 *
 * Organized sections:
 * 1. Work Schedule - work hours, work days
 * 2. Monitoring - enabled, polling interval
 * 3. Notifications - drift alerts, briefing times
 * 4. Signal Queue - refill mode
 * 5. Window Behavior - always on top, start minimized, show in dock
 * 6. AI & Appearance - links to modal settings
 *
 * Settings are auto-saved on change with visual feedback.
 */
export const SettingsPage: React.FC<SettingsPageProps> = ({ onBack }) => {
  const { settings, updateSettings, toggleAlwaysOnTop, toggleRefillMode } = useSettingsStore()
  const { openModalWithType } = useModal()

  // Local state for form fields
  const [localSettings, setLocalSettings] = useState<UserSettings>(settings)
  const [hasChanges, setHasChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Sync local state with store
  useEffect(() => {
    setLocalSettings(settings)
  }, [settings])

  // Handle field changes
  const handleChange = <K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K]
  ) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }))
    setHasChanges(true)
    setSaveSuccess(false)
  }

  // Handle work day toggle
  const handleDayToggle = (day: number) => {
    const currentDays = localSettings.workDays
    const newDays = currentDays.includes(day)
      ? currentDays.filter((d) => d !== day)
      : [...currentDays, day].sort()
    handleChange('workDays', newDays)
  }

  // Save settings
  const handleSave = async () => {
    setIsSaving(true)
    try {
      await updateSettings(localSettings)
      setHasChanges(false)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2000)
    } catch (error) {
      console.error('Failed to save settings:', error)
    } finally {
      setIsSaving(false)
    }
  }

  // Reset to defaults
  const handleReset = () => {
    const defaults: UserSettings = {
      workStartTime: '09:00',
      workEndTime: '17:00',
      workDays: [1, 2, 3, 4, 5],
      monitoringEnabled: true,
      pollingIntervalMs: 5000,
      driftAlertEnabled: true,
      driftAlertDelayMinutes: 5,
      morningBriefingTime: '09:00',
      eveningReviewTime: '18:00',
      alwaysOnTop: false,
      startMinimized: false,
      showInDock: true,
      refillMode: 'endless',
    }
    setLocalSettings(defaults)
    setHasChanges(true)
  }

  // Toggle component
  const Toggle: React.FC<{
    enabled: boolean
    onChange: (enabled: boolean) => void
    label: string
    description?: string
  }> = ({ enabled, onChange, label, description }) => (
    <div className="flex items-center justify-between py-2">
      <div>
        <span className="text-sm text-pipboy-green">{label}</span>
        {description && (
          <p className="text-[10px] text-pipboy-green-dim/60">{description}</p>
        )}
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`
          p-1 rounded-sm transition-all
          ${enabled ? 'text-pipboy-green' : 'text-pipboy-green-dim'}
        `}
      >
        {enabled ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
      </button>
    </div>
  )

  // Section header component
  const SectionHeader: React.FC<{
    icon: React.ReactNode
    title: string
  }> = ({ icon, title }) => (
    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-pipboy-border/50">
      <span className="text-pipboy-green">{icon}</span>
      <h3 className="text-xs font-bold text-pipboy-green uppercase tracking-wide">
        {title}
      </h3>
    </div>
  )

  // Time input component
  const TimeInput: React.FC<{
    value: string
    onChange: (value: string) => void
    label: string
  }> = ({ value, onChange, label }) => (
    <div className="flex items-center gap-3">
      <label className="text-xs text-pipboy-green-dim w-24">{label}</label>
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="
          px-3 py-1.5 rounded-sm
          bg-pipboy-surface border border-pipboy-border
          text-pipboy-green text-sm font-mono
          focus:outline-none focus:border-pipboy-green/50
        "
      />
    </div>
  )

  return (
    <div className="h-full flex flex-col bg-pipboy-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-pipboy-border">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="
              p-1.5 rounded-sm
              text-pipboy-green-dim hover:text-pipboy-green
              border border-pipboy-border hover:border-pipboy-green/50
              transition-all
            "
            title="Back to Dashboard"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="flex items-center gap-2">
            <Settings size={18} className="text-pipboy-green" />
            <h2 className="text-lg font-bold text-pipboy-green tracking-wide glow-low">
              SETTINGS
            </h2>
          </div>
        </div>

        {/* Save/Reset buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="
              flex items-center gap-1.5 px-3 py-1.5 rounded-sm
              text-xs text-pipboy-green-dim
              border border-pipboy-border hover:border-pipboy-green/50
              transition-all
            "
            title="Reset to defaults"
          >
            <RotateCcw size={12} />
            <span>Reset</span>
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-sm
              text-xs transition-all
              ${
                hasChanges
                  ? 'bg-pipboy-green/20 border border-pipboy-green text-pipboy-green hover:bg-pipboy-green/30'
                  : 'border border-pipboy-border text-pipboy-green-dim cursor-not-allowed'
              }
              ${saveSuccess ? 'bg-green-500/20 border-green-500' : ''}
            `}
          >
            <Save size={12} />
            <span>{saveSuccess ? 'Saved!' : isSaving ? 'Saving...' : 'Save'}</span>
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        {/* Work Schedule Section */}
        <section>
          <SectionHeader icon={<Clock size={14} />} title="Work Schedule" />
          <div className="space-y-3 pl-1">
            <TimeInput
              label="Start Time"
              value={localSettings.workStartTime}
              onChange={(v) => handleChange('workStartTime', v)}
            />
            <TimeInput
              label="End Time"
              value={localSettings.workEndTime}
              onChange={(v) => handleChange('workEndTime', v)}
            />

            {/* Work Days */}
            <div className="pt-2">
              <label className="text-xs text-pipboy-green-dim mb-2 block">
                Work Days
              </label>
              <div className="flex gap-1">
                {DAYS.map((day, index) => (
                  <button
                    key={day}
                    onClick={() => handleDayToggle(index)}
                    className={`
                      px-2 py-1 text-[10px] rounded-sm
                      border transition-all
                      ${
                        localSettings.workDays.includes(index)
                          ? 'bg-pipboy-green/20 border-pipboy-green/50 text-pipboy-green'
                          : 'bg-pipboy-surface border-pipboy-border text-pipboy-green-dim hover:border-pipboy-green/30'
                      }
                    `}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Monitoring Section */}
        <section>
          <SectionHeader icon={<Monitor size={14} />} title="Activity Monitoring" />
          <div className="space-y-2 pl-1">
            <Toggle
              enabled={localSettings.monitoringEnabled}
              onChange={(v) => handleChange('monitoringEnabled', v)}
              label="Enable Monitoring"
              description="Track active applications and time spent"
            />

            {localSettings.monitoringEnabled && (
              <div className="flex items-center gap-3 pt-2">
                <label className="text-xs text-pipboy-green-dim">Poll every</label>
                <select
                  value={localSettings.pollingIntervalMs}
                  onChange={(e) =>
                    handleChange('pollingIntervalMs', Number(e.target.value))
                  }
                  className="
                    px-3 py-1.5 rounded-sm
                    bg-pipboy-surface border border-pipboy-border
                    text-pipboy-green text-sm
                    focus:outline-none focus:border-pipboy-green/50
                    cursor-pointer
                  "
                >
                  <option value={1000}>1 second</option>
                  <option value={3000}>3 seconds</option>
                  <option value={5000}>5 seconds</option>
                  <option value={10000}>10 seconds</option>
                </select>
              </div>
            )}
          </div>
        </section>

        {/* Notifications Section */}
        <section>
          <SectionHeader icon={<Bell size={14} />} title="Notifications" />
          <div className="space-y-3 pl-1">
            <Toggle
              enabled={localSettings.driftAlertEnabled}
              onChange={(v) => handleChange('driftAlertEnabled', v)}
              label="Drift Alerts"
              description="Notify when spending too long in non-productive apps"
            />

            {localSettings.driftAlertEnabled && (
              <div className="flex items-center gap-3">
                <label className="text-xs text-pipboy-green-dim">Alert after</label>
                <select
                  value={localSettings.driftAlertDelayMinutes}
                  onChange={(e) =>
                    handleChange('driftAlertDelayMinutes', Number(e.target.value))
                  }
                  className="
                    px-3 py-1.5 rounded-sm
                    bg-pipboy-surface border border-pipboy-border
                    text-pipboy-green text-sm
                    focus:outline-none focus:border-pipboy-green/50
                    cursor-pointer
                  "
                >
                  <option value={2}>2 minutes</option>
                  <option value={5}>5 minutes</option>
                  <option value={10}>10 minutes</option>
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                </select>
              </div>
            )}

            <div className="pt-3 border-t border-pipboy-border/30">
              <TimeInput
                label="Morning Brief"
                value={localSettings.morningBriefingTime}
                onChange={(v) => handleChange('morningBriefingTime', v)}
              />
            </div>
            <TimeInput
              label="Evening Review"
              value={localSettings.eveningReviewTime}
              onChange={(v) => handleChange('eveningReviewTime', v)}
            />
          </div>
        </section>

        {/* Signal Queue Section */}
        <section>
          <SectionHeader
            icon={<RefreshCw size={14} />}
            title="Signal Queue"
          />
          <div className="pl-1">
            <div className="flex items-center justify-between py-2">
              <div>
                <span className="text-sm text-pipboy-green">Refill Mode</span>
                <p className="text-[10px] text-pipboy-green-dim/60">
                  {localSettings.refillMode === 'endless'
                    ? 'Auto-refills as tasks complete'
                    : 'Empties as you complete tasks, resets daily'}
                </p>
              </div>
              <button
                onClick={() => {
                  toggleRefillMode()
                  setLocalSettings((prev) => ({
                    ...prev,
                    refillMode:
                      prev.refillMode === 'endless' ? 'daily_reset' : 'endless',
                  }))
                }}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-sm
                  text-[10px] border transition-all
                  ${
                    localSettings.refillMode === 'endless'
                      ? 'bg-pipboy-green/10 text-pipboy-green border-pipboy-green/50'
                      : 'bg-pipboy-surface text-pipboy-green-dim border-pipboy-border hover:border-pipboy-green/30'
                  }
                `}
              >
                {localSettings.refillMode === 'endless' ? (
                  <>
                    <RefreshCw size={12} />
                    <span>ENDLESS</span>
                  </>
                ) : (
                  <>
                    <Pause size={12} />
                    <span>DAILY</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* Window Behavior Section */}
        <section>
          <SectionHeader icon={<Monitor size={14} />} title="Window Behavior" />
          <div className="space-y-2 pl-1">
            <Toggle
              enabled={localSettings.alwaysOnTop}
              onChange={async () => {
                const newValue = await toggleAlwaysOnTop()
                setLocalSettings((prev) => ({ ...prev, alwaysOnTop: newValue }))
              }}
              label="Always on Top"
              description="Keep MILO window above other windows"
            />
            <Toggle
              enabled={localSettings.startMinimized}
              onChange={(v) => handleChange('startMinimized', v)}
              label="Start Minimized"
              description="Launch MILO in the background"
            />
            <Toggle
              enabled={localSettings.showInDock}
              onChange={(v) => handleChange('showInDock', v)}
              label="Show in Dock"
              description="Display MILO icon in the macOS dock"
            />
          </div>
        </section>

        {/* AI & Appearance Section */}
        <section>
          <SectionHeader icon={<Palette size={14} />} title="AI & Appearance" />
          <div className="space-y-2 pl-1">
            {/* API Key Settings */}
            <button
              onClick={() => openModalWithType('apiSettings')}
              className="
                w-full flex items-center justify-between p-3 rounded-sm
                bg-pipboy-surface border border-pipboy-border
                hover:border-pipboy-green/50 transition-all
                group
              "
            >
              <div className="flex items-center gap-3">
                <Key size={16} className="text-pipboy-green-dim group-hover:text-pipboy-green" />
                <div className="text-left">
                  <span className="text-sm text-pipboy-green">Claude API Key</span>
                  <p className="text-[10px] text-pipboy-green-dim/60">
                    Configure your Anthropic API key
                  </p>
                </div>
              </div>
              <ChevronRight size={16} className="text-pipboy-green-dim group-hover:text-pipboy-green" />
            </button>

            {/* Theme Settings */}
            <button
              onClick={() => openModalWithType('themeSettings')}
              className="
                w-full flex items-center justify-between p-3 rounded-sm
                bg-pipboy-surface border border-pipboy-border
                hover:border-pipboy-green/50 transition-all
                group
              "
            >
              <div className="flex items-center gap-3">
                <Palette size={16} className="text-pipboy-green-dim group-hover:text-pipboy-green" />
                <div className="text-left">
                  <span className="text-sm text-pipboy-green">Theme Colors</span>
                  <p className="text-[10px] text-pipboy-green-dim/60">
                    Customize UI colors and chat message colors
                  </p>
                </div>
              </div>
              <ChevronRight size={16} className="text-pipboy-green-dim group-hover:text-pipboy-green" />
            </button>
          </div>
        </section>

        {/* Privacy & Data Section */}
        <section>
          <SectionHeader icon={<Shield size={14} />} title="Privacy & Data" />
          <div className="space-y-2 pl-1">
            <AnalyticsToggle />
          </div>
        </section>

        {/* Version info at bottom */}
        <div className="pt-4 border-t border-pipboy-border/30 text-center">
          <p className="text-[10px] text-pipboy-green-dim/40">
            MILO v0.3.0 • Made with 💚 by ID8Labs
          </p>
        </div>
      </div>
    </div>
  )
}

export default SettingsPage
