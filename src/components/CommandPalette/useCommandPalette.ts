import { useState, useEffect, useCallback } from 'react'

/**
 * useCommandPalette Hook
 *
 * Manages command palette state and keyboard shortcuts.
 *
 * Features:
 * - Global Cmd+K / Ctrl+K listener
 * - Open/close state management
 * - Escape key handling
 *
 * Usage:
 * const { isOpen, open, close, toggle } = useCommandPalette()
 *
 * return (
 *   <>
 *     <CommandPalette isOpen={isOpen} onClose={close} />
 *     <button onClick={open}>Open Palette</button>
 *   </>
 * )
 */
export const useCommandPalette = () => {
  const [isOpen, setIsOpen] = useState(false)

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen((prev) => !prev), [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K on Mac, Ctrl+K on Windows/Linux
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        toggle()
      }

      // Escape to close
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault()
        close()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, close, toggle])

  return {
    isOpen,
    open,
    close,
    toggle,
  }
}
