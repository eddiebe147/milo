import React, { useState, useEffect } from 'react'
import { X, Palette, RotateCcw } from 'lucide-react'
import { useSettingsStore } from '../../stores/settingsStore'
import type { ThemeColors } from '../../types'

interface ThemeSettingsProps {
  isOpen: boolean
  onClose: () => void
}

// Default theme colors
const DEFAULT_COLORS: ThemeColors = {
  primaryColor: '#00ff41',
  accentColor: '#ffb000',
  dangerColor: '#ff3333',
  userMessageColor: '#00ff41',
  aiMessageColor: '#ffb000',
}

/**
 * ThemeSettings - Modal for customizing theme colors
 *
 * Features:
 * - Color picker for each theme color
 * - Live preview (changes apply immediately)
 * - Reset to defaults button
 * - Saves to database via window.milo.settings.setThemeColors()
 */
export const ThemeSettings: React.FC<ThemeSettingsProps> = ({
  isOpen,
  onClose,
}) => {
  const { themeColors, setThemeColor, setThemeColors } = useSettingsStore()
  const [localColors, setLocalColors] = useState<ThemeColors>(themeColors)

  // Sync local state with store when modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalColors(themeColors)
    }
  }, [isOpen, themeColors])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  const handleColorChange = (key: keyof ThemeColors, value: string) => {
    // Update local state for live preview
    setLocalColors((prev) => ({ ...prev, [key]: value }))
    // Apply immediately to store for live preview
    setThemeColor(key, value)
  }

  // Convert frontend ThemeColors to backend format
  const toBackendColors = (colors: ThemeColors) => ({
    themePrimaryColor: colors.primaryColor,
    themeAccentColor: colors.accentColor,
    themeDangerColor: colors.dangerColor,
    themeUserMessageColor: colors.userMessageColor,
    themeAiMessageColor: colors.aiMessageColor,
  })

  const handleResetToDefaults = async () => {
    setLocalColors(DEFAULT_COLORS)
    setThemeColors(DEFAULT_COLORS)

    // Save to database
    try {
      await window.milo?.settings.setThemeColors(toBackendColors(DEFAULT_COLORS))
    } catch (error) {
      console.error('Failed to save default theme colors:', error)
    }
  }

  const handleSave = async () => {
    try {
      // Save to database via IPC (convert to backend format)
      await window.milo?.settings.setThemeColors(toBackendColors(localColors))
      onClose()
    } catch (error) {
      console.error('Failed to save theme colors:', error)
    }
  }

  if (!isOpen) return null

  const colorFields: Array<{
    key: keyof ThemeColors
    label: string
    description: string
  }> = [
    {
      key: 'primaryColor',
      label: 'Primary Color',
      description: 'Main UI elements and borders',
    },
    {
      key: 'accentColor',
      label: 'Accent Color',
      description: 'Highlights and emphasis',
    },
    {
      key: 'dangerColor',
      label: 'Danger Color',
      description: 'Warnings and errors',
    },
    {
      key: 'userMessageColor',
      label: 'User Message Color',
      description: 'Chat user message text',
    },
    {
      key: 'aiMessageColor',
      label: 'AI Message Color',
      description: 'Chat AI message text',
    },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-pipboy-background border border-pipboy-border rounded-sm shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-pipboy-border">
          <div className="flex items-center gap-2">
            <Palette size={16} className="text-pipboy-green" />
            <h2 className="text-sm font-bold text-pipboy-green tracking-wide">
              THEME SETTINGS
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-pipboy-green-dim hover:text-pipboy-green transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Color Pickers */}
          {colorFields.map(({ key, label, description }) => (
            <div key={key} className="space-y-2">
              <label className="block text-[10px] text-pipboy-green-dim uppercase tracking-wide">
                {label}
              </label>
              <div className="flex items-center gap-3">
                {/* Color swatch & native picker */}
                <div className="relative">
                  <input
                    type="color"
                    value={localColors[key]}
                    onChange={(e) => handleColorChange(key, e.target.value)}
                    className="w-12 h-10 rounded-sm cursor-pointer border border-pipboy-border"
                    title={`Pick ${label.toLowerCase()}`}
                  />
                </div>

                {/* Hex input */}
                <input
                  type="text"
                  value={localColors[key]}
                  onChange={(e) => {
                    const value = e.target.value
                    // Allow partial hex input while typing (will be normalized on blur)
                    if (/^#[0-9A-Fa-f]{0,6}$/.test(value)) {
                      handleColorChange(key, value)
                    }
                  }}
                  onBlur={(e) => {
                    // Normalize incomplete hex values on blur
                    let value = e.target.value
                    // Handle 3-char shorthand (e.g., "#fff" -> "#ffffff")
                    if (/^#[0-9A-Fa-f]{3}$/.test(value)) {
                      value = '#' + value.slice(1).split('').map(c => c + c).join('')
                      handleColorChange(key, value)
                    }
                    // Revert to default if incomplete/invalid
                    else if (!/^#[0-9A-Fa-f]{6}$/.test(value)) {
                      handleColorChange(key, DEFAULT_COLORS[key])
                    }
                  }}
                  placeholder="#00ff41"
                  className="
                    flex-1 px-3 py-2 rounded-sm
                    bg-pipboy-surface border border-pipboy-border
                    text-pipboy-green placeholder-pipboy-green-dim/50
                    focus:outline-none focus:border-pipboy-green/50
                    font-mono text-sm uppercase
                  "
                  maxLength={7}
                />
              </div>
              <p className="text-[10px] text-pipboy-green-dim/60">
                {description}
              </p>
            </div>
          ))}

          {/* Reset Button */}
          <div className="pt-2 border-t border-pipboy-border">
            <button
              onClick={handleResetToDefaults}
              className="
                w-full py-2 rounded-sm
                border border-pipboy-border text-pipboy-green-dim
                hover:border-pipboy-green/50 hover:text-pipboy-green
                transition-all text-sm font-mono
                flex items-center justify-center gap-2
              "
            >
              <RotateCcw size={14} />
              <span>Reset to Defaults</span>
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="
                flex-1 py-2 rounded-sm
                border border-pipboy-border text-pipboy-green-dim
                hover:border-pipboy-green/50 hover:text-pipboy-green
                transition-all text-sm font-mono
              "
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="
                flex-1 py-2 rounded-sm
                bg-pipboy-green/20 border border-pipboy-green text-pipboy-green
                hover:bg-pipboy-green/30
                transition-all text-sm font-mono
                flex items-center justify-center gap-2
              "
            >
              <Palette size={14} />
              <span>Save</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ThemeSettings
