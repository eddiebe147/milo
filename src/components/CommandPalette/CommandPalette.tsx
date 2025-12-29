import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { Search, Command as CommandIcon } from 'lucide-react'
import { getCommands, filterCommands, getCategoryIcon, type Command } from './commands'
import { useModal } from '@/contexts/ModalContext'

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  onNavigate?: (view: 'dashboard' | 'settings' | 'plan-import') => void
}

/**
 * CommandPalette Component
 *
 * A Cmd+K style command palette for MILO with Pip-Boy styling.
 *
 * Features:
 * - Fuzzy search across commands
 * - Keyboard navigation (Arrow keys, Enter, Escape)
 * - Categorized command list
 * - Pip-Boy green glow effects
 * - Monospace font styling
 *
 * Keyboard shortcuts:
 * - Cmd+K / Ctrl+K: Toggle palette
 * - Escape: Close
 * - Up/Down: Navigate
 * - Enter: Execute command
 *
 * Usage:
 * const { isOpen, close } = useCommandPalette()
 * return <CommandPalette isOpen={isOpen} onClose={close} />
 */
export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate,
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const modalContext = useModal()

  // Get all commands
  const allCommands = useMemo(() => getCommands(onNavigate, modalContext), [onNavigate, modalContext])

  // Filter commands based on search
  const filteredCommands = useMemo(
    () => filterCommands(allCommands, searchQuery),
    [allCommands, searchQuery]
  )

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Execute command and close palette
  const executeCommand = useCallback(async (command: Command) => {
    try {
      await command.action()
      onClose()
    } catch (error) {
      console.error('Failed to execute command:', error)
    }
  }, [onClose])

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((prev) =>
            prev < filteredCommands.length - 1 ? prev + 1 : 0
          )
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredCommands.length - 1
          )
          break
        case 'Enter':
          e.preventDefault()
          if (filteredCommands[selectedIndex]) {
            executeCommand(filteredCommands[selectedIndex])
          }
          break
        case 'Escape':
          e.preventDefault()
          onClose()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, selectedIndex, filteredCommands, onClose, executeCommand])

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return

    const selectedElement = listRef.current.children[selectedIndex] as HTMLElement
    if (selectedElement) {
      selectedElement.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      })
    }
  }, [selectedIndex])

  // Group commands by category
  const groupedCommands = useMemo(() => {
    const groups: Record<string, Command[]> = {}

    filteredCommands.forEach((cmd) => {
      if (!groups[cmd.category]) {
        groups[cmd.category] = []
      }
      groups[cmd.category].push(cmd)
    })

    return groups
  }, [filteredCommands])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Command Palette Modal */}
      <div className="relative w-full max-w-2xl mx-4 bg-pipboy-background border border-pipboy-border rounded-sm shadow-2xl shadow-pipboy-green-glow/20">
        {/* Header with Search */}
        <div className="border-b border-pipboy-border">
          {/* Title Bar */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-pipboy-border/50">
            <CommandIcon size={14} className="text-pipboy-green" />
            <h2 className="text-[10px] font-bold text-pipboy-green tracking-widest uppercase">
              Command Palette
            </h2>
            <div className="ml-auto text-[10px] text-pipboy-green-dim font-mono">
              <kbd className="px-1 py-0.5 bg-pipboy-surface border border-pipboy-border rounded text-[9px]">
                ESC
              </kbd>{' '}
              to close
            </div>
          </div>

          {/* Search Input */}
          <div className="relative flex items-center px-3 py-3">
            <Search size={16} className="text-pipboy-green-dim mr-2" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setSelectedIndex(0)
              }}
              placeholder="Type a command or search..."
              className="
                flex-1 bg-transparent border-none outline-none
                text-pipboy-green placeholder-pipboy-green-dim/40
                font-mono text-sm
                focus:placeholder-pipboy-green-dim/60
              "
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('')
                  setSelectedIndex(0)
                }}
                className="text-pipboy-green-dim hover:text-pipboy-green transition-colors text-xs ml-2"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Command List */}
        <div
          ref={listRef}
          className="max-h-[400px] overflow-y-auto overflow-x-hidden"
        >
          {filteredCommands.length === 0 ? (
            <div className="px-4 py-8 text-center text-pipboy-green-dim text-sm">
              No commands found
            </div>
          ) : (
            <div className="py-2">
              {Object.entries(groupedCommands).map(([category, commands]) => (
                <div key={category} className="mb-3 last:mb-0">
                  {/* Category Header */}
                  <div className="px-3 py-1 text-[10px] text-pipboy-green-dim uppercase tracking-widest font-bold flex items-center gap-2">
                    <span>{getCategoryIcon(category as Command['category'])}</span>
                    <span>{category}</span>
                  </div>

                  {/* Commands in Category */}
                  {commands.map((cmd) => {
                    const globalIndex = filteredCommands.indexOf(cmd)
                    const isSelected = globalIndex === selectedIndex

                    return (
                      <button
                        key={cmd.id}
                        onClick={() => executeCommand(cmd)}
                        onMouseEnter={() => setSelectedIndex(globalIndex)}
                        className={`
                          w-full px-3 py-2 text-left flex items-center gap-3
                          transition-all font-mono
                          ${
                            isSelected
                              ? 'bg-pipboy-green/20 border-l-2 border-pipboy-green'
                              : 'border-l-2 border-transparent hover:bg-pipboy-green/10'
                          }
                        `}
                      >
                        {/* Command Label */}
                        <div className="flex-1">
                          <div
                            className={`text-sm ${
                              isSelected ? 'text-pipboy-green' : 'text-pipboy-green-dim'
                            }`}
                          >
                            {cmd.label}
                          </div>
                          {cmd.description && (
                            <div className="text-[10px] text-pipboy-green-dim/60 mt-0.5">
                              {cmd.description}
                            </div>
                          )}
                        </div>

                        {/* Shortcut */}
                        {cmd.shortcut && (
                          <kbd
                            className={`
                              px-1.5 py-0.5 rounded text-[10px] font-mono
                              border
                              ${
                                isSelected
                                  ? 'bg-pipboy-green/10 border-pipboy-green text-pipboy-green'
                                  : 'bg-pipboy-surface border-pipboy-border text-pipboy-green-dim'
                              }
                            `}
                          >
                            {cmd.shortcut}
                          </kbd>
                        )}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer with Keyboard Hints */}
        <div className="border-t border-pipboy-border px-3 py-2 flex items-center gap-4 text-[10px] text-pipboy-green-dim font-mono">
          <div className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-pipboy-surface border border-pipboy-border rounded">
              ↑↓
            </kbd>
            <span>Navigate</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-pipboy-surface border border-pipboy-border rounded">
              ↵
            </kbd>
            <span>Execute</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-pipboy-surface border border-pipboy-border rounded">
              ESC
            </kbd>
            <span>Close</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CommandPalette
