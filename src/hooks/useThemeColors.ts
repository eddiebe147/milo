import { useEffect } from 'react'
import { useSettingsStore } from '@/stores/settingsStore'

/**
 * Converts hex color to RGBA with specified opacity
 * Handles 3-char shorthand (e.g., "#fff" -> "#ffffff") and validates input
 * @param hex - Hex color string (e.g., "#00ff41" or "#0f4")
 * @param alpha - Opacity value 0-1 (default: 0.5)
 * @returns RGBA string (e.g., "rgba(0, 255, 65, 0.5)")
 */
function hexToRgba(hex: string, alpha: number = 0.5): string {
  // Remove # if present
  let cleanHex = hex.replace('#', '')

  // Handle 3-char shorthand (e.g., "fff" -> "ffffff")
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(c => c + c).join('')
  }

  // Validate hex format - default to black if invalid
  if (!/^[0-9A-Fa-f]{6}$/.test(cleanHex)) {
    return `rgba(0, 0, 0, ${alpha})`
  }

  // Parse hex to RGB
  const r = parseInt(cleanHex.substring(0, 2), 16)
  const g = parseInt(cleanHex.substring(2, 4), 16)
  const b = parseInt(cleanHex.substring(4, 6), 16)

  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/**
 * Hook that injects theme colors as CSS variables into document.documentElement
 * Auto-generates dim (50% opacity) and glow (text-shadow) variants for each color
 *
 * Usage:
 * ```tsx
 * function App() {
 *   useThemeColors() // Call once at app root
 *   return <div>...</div>
 * }
 * ```
 *
 * CSS variables available:
 * - --theme-primary, --theme-primary-dim, --theme-primary-glow
 * - --theme-accent, --theme-accent-dim, --theme-accent-glow
 * - --theme-danger, --theme-danger-dim, --theme-danger-glow
 * - --chat-user-color, --chat-ai-color
 */
export function useThemeColors() {
  const themeColors = useSettingsStore((state) => state.themeColors)
  const loadThemeColors = useSettingsStore((state) => state.loadThemeColors)

  // Load theme colors from SQLite database on mount
  useEffect(() => {
    loadThemeColors()
  }, [loadThemeColors])

  // Inject CSS variables whenever theme colors change
  useEffect(() => {
    const root = document.documentElement

    // Primary color
    root.style.setProperty('--theme-primary', themeColors.primaryColor)
    root.style.setProperty('--theme-primary-dim', hexToRgba(themeColors.primaryColor, 0.5))
    root.style.setProperty('--theme-primary-glow', `0 0 10px ${themeColors.primaryColor}`)

    // Accent color
    root.style.setProperty('--theme-accent', themeColors.accentColor)
    root.style.setProperty('--theme-accent-dim', hexToRgba(themeColors.accentColor, 0.5))
    root.style.setProperty('--theme-accent-glow', `0 0 10px ${themeColors.accentColor}`)

    // Danger color
    root.style.setProperty('--theme-danger', themeColors.dangerColor)
    root.style.setProperty('--theme-danger-dim', hexToRgba(themeColors.dangerColor, 0.5))
    root.style.setProperty('--theme-danger-glow', `0 0 10px ${themeColors.dangerColor}`)

    // Chat colors (for dialogue components)
    root.style.setProperty('--chat-user-color', themeColors.userMessageColor)
    root.style.setProperty('--chat-ai-color', themeColors.aiMessageColor)
  }, [themeColors])
}
