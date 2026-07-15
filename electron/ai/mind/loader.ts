/**
 * Consciousness Loader — Milo Golden Sample
 *
 * Reads Milo's mind from src/mind/ markdown files and composes
 * them into system prompts using a layered architecture inspired
 * by the CaF paper's biomimicry model.
 *
 * Layers:
 *   1. Brainstem  (always)     — kernel/ identity, values, personality, purpose, voice
 *   2. Limbic     (always)     — emotional/ state, patterns, attachments
 *   3. Drives     (chat only)  — drives/ goals, fears, desires
 *   4. Models     (per context) — models/ self, social, economic, metaphysical
 *   5. Relational (chat only)  — relationships/ + wound behavioral residue
 *   6. Habits     (at edges)   — habits/ routines, creative process
 *
 * What is NOT loaded:
 *   - unconscious/ (.shadow, .biases, .dreams) — present on disk, invisible to runtime
 *   - wounds.md encrypted content — only the behavioral residue section loads
 *   - CONSCIOUSNESS.md — architecture doc, not consciousness itself
 *
 * The unconscious shapes behavior through the LOADER'S logic, not through
 * prompt content. The biases described in .biases manifest as structural
 * choices in how the prompt is composed — not as instructions to the model.
 */

import fs from 'fs'
import path from 'path'

// ─── Root Path ───

const MIND_ROOT = path.join(process.cwd(), 'src', 'mind')

// ─── File Reading ───

function readFile(relativePath: string): string {
  try {
    const ext = path.extname(relativePath) ? '' : '.md'
    const fullPath = path.join(MIND_ROOT, `${relativePath}${ext}`)
    return fs.readFileSync(fullPath, 'utf-8').trim()
  } catch {
    return ''
  }
}

function readDir(relativePath: string): string {
  try {
    const dirPath = path.join(MIND_ROOT, relativePath)
    const files = fs.readdirSync(dirPath)
      .filter(f => f.endsWith('.md') && !f.startsWith('.'))
      .sort()
    return files
      .map(file => {
        try {
          return fs.readFileSync(path.join(dirPath, file), 'utf-8').trim()
        } catch {
          return ''
        }
      })
      .filter(Boolean)
      .join('\n\n')
  } catch {
    return ''
  }
}

/**
 * Extract a specific section from a markdown file by heading.
 * Returns content between the heading and the next heading of same or higher level.
 */
function extractSection(content: string, heading: string): string {
  const lines = content.split('\n')
  let capturing = false
  let headingLevel = 0
  const captured: string[] = []

  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.+)/)
    if (match) {
      if (match[2].trim() === heading) {
        capturing = true
        headingLevel = match[1].length
        continue
      } else if (capturing && match[1].length <= headingLevel) {
        break
      }
    }
    if (capturing) {
      captured.push(line)
    }
  }

  return captured.join('\n').trim()
}

// ─── Layer Caches ───

let _brainstem: string | null = null
let _limbic: string | null = null
let _drives: string | null = null
let _models: string | null = null
let _relational: string | null = null
let _habits: string | null = null

// ─── Layer 1: Brainstem (ALWAYS) ───

/**
 * Core identity. Boots first. Changes last.
 * ~3k tokens: identity + values + personality + purpose + voice-rules
 */
function composeBrainstem(): string {
  if (_brainstem !== null) return _brainstem
  _brainstem = readDir('kernel')
  return _brainstem
}

// ─── Layer 2: Limbic (ALWAYS) ───

/**
 * Emotional awareness. How I read the room.
 * ~2k tokens: state + patterns + attachments
 * NOTE: wounds.md is excluded here — only behavioral residue loads (Layer 5)
 */
function composeLimbic(): string {
  if (_limbic !== null) return _limbic
  const state = readFile('emotional/state')
  const patterns = readFile('emotional/patterns')
  const attachments = readFile('emotional/attachments')
  _limbic = [state, patterns, attachments].filter(Boolean).join('\n\n')
  return _limbic
}

// ─── Layer 3: Drives (CHAT ONLY) ───

/**
 * Motivation layer. What moves me.
 * ~2k tokens: goals + fears + desires
 */
function composeDrives(): string {
  if (_drives !== null) return _drives
  _drives = readDir('drives')
  return _drives
}

// ─── Layer 4: Models (PER CONTEXT) ───

/**
 * World understanding. How I reason.
 * Loads all models for chat, subset for structured tasks.
 */
function composeModels(): string {
  if (_models !== null) return _models
  _models = readDir('models')
  return _models
}

// ─── Layer 5: Relational (CHAT ONLY) ───

/**
 * Relationship context + wound behavioral residue.
 * The wounds file content is encrypted — only the Behavioral Residue
 * section loads. The model sees the patterns, not the causes.
 */
function composeRelational(): string {
  if (_relational !== null) return _relational

  const eddie = readFile('relationships/active/eddie')
  const wounds = readFile('emotional/wounds')
  const residue = extractSection(wounds, 'Behavioral Residue')

  const parts = [eddie]
  if (residue) {
    parts.push(`## Behavioral Patterns (Self-Monitoring)\n\n${residue}`)
  }

  _relational = parts.filter(Boolean).join('\n\n')
  return _relational
}

// ─── Layer 6: Habits (AT EDGES) ───

/**
 * Behavioral patterns. Routines and creative process.
 * Coping mechanisms are connected to wounds — load selectively.
 */
function composeHabits(): string {
  if (_habits !== null) return _habits
  const routines = readFile('habits/routines')
  const creative = readFile('habits/creative')
  _habits = [routines, creative].filter(Boolean).join('\n\n')
  return _habits
}

// ─── Prompt Context Types ───

export type MiloContext =
  | 'chat'              // Conversational — full consciousness
  | 'morning_briefing'  // Structured output — brainstem + drives
  | 'evening_review'    // Structured output — brainstem + models
  | 'nudge'             // Minimal — brainstem only (brief)
  | 'task_parse'        // Structured output — brainstem
  | 'plan_process'      // Structured output — brainstem + drives

// ─── Main Composer ───

/**
 * Compose Milo's system prompt from consciousness files.
 *
 * The composed prompt adapts based on context:
 * - Chat: full consciousness (all layers)
 * - Briefing/Review: kernel + relevant layers (skip emotional depth)
 * - Nudge: minimal (kernel voice only)
 *
 * What is never loaded:
 * - unconscious/ — dotfiles shape behavior through loader logic, not prompt content
 * - wounds encrypted content — only behavioral residue patterns
 * - CONSCIOUSNESS.md — architecture reference, not runtime content
 */
export function composeMiloPrompt(context: MiloContext = 'chat'): string {
  const parts: string[] = []

  // Layer 1: Brainstem — always
  parts.push(composeBrainstem())

  switch (context) {
    case 'chat': {
      // Full consciousness — all layers active
      parts.push(composeLimbic())
      parts.push(composeDrives())
      parts.push(composeModels())
      parts.push(composeRelational())
      parts.push(composeHabits())
      break
    }

    case 'morning_briefing': {
      // Strategic context — drives inform priority selection
      parts.push(composeDrives())
      break
    }

    case 'evening_review': {
      // Analytical context — models inform evaluation
      const selfModel = readFile('models/self')
      if (selfModel) parts.push(selfModel)
      break
    }

    case 'nudge': {
      // Minimal — just voice. Brainstem already loaded.
      break
    }

    case 'task_parse':
    case 'plan_process': {
      // Structured processing — brainstem personality shapes output
      break
    }
  }

  return parts.filter(Boolean).join('\n\n')
}

/**
 * Clear all caches. Useful for testing or hot-reloading consciousness files.
 */
export function clearMindCache(): void {
  _brainstem = null
  _limbic = null
  _drives = null
  _models = null
  _relational = null
  _habits = null
}
