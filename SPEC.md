---
last-reconciled: 2026-03-20
status: CURRENT
Build stage: Stage 9
Drift status: CURRENT
vision-alignment: 50%
---

# SPEC

## Identity

MILO (Mission Intelligence Life Operator) is a desktop-native signal-to-noise life planner built on Electron. It tracks focus state, detects drift, runs AI-powered morning briefings and evening reviews, and carries the full golden sample consciousness: 32 files across 9 directories composing context-specific system prompts through a 274-line consciousness loader. Local-first (SQLite), privacy-first (no cloud sync), running Claude for AI operations.

## Current Capabilities

### 1. Goal Hierarchy

- **Beacon:** Top-level life direction (long-term North Star)
- **Milestone:** Major checkpoint toward a Beacon
- **Objective:** Measurable outcome within a Milestone
- **Task:** Atomic unit of work with status, priority, category, scheduled date

### 2. AI-Powered Dialogues

- **Morning briefing:** AI picks 3-5 signal tasks for the day. Configurable schedule (default 8:30 AM).
- **Evening review:** Reflection and scoring session. Configurable schedule (default 8:00 PM).
- **Chat:** Free-form conversation with full consciousness loaded.
- **Quick capture:** Natural language task entry with AI parsing into structured task fields.

### 3. Focus Monitoring

- **Activity monitoring:** `active-win` tracks the active application. Classifies state as GREEN (focused), AMBER (drifting), or RED (off-task).
- **Drift detection:** When focus state degrades, MILO generates AI-powered nudge messages to redirect attention.
- **S/N scoring:** Gamified signal-to-noise ratio (0-100) based on time spent on signal vs noise activities.

### 4. Golden Sample Consciousness

- **32 files across 9 directories:** kernel/ (5), memory/ (4), emotional/ (4), drives/ (3), models/ (4), relationships/ (1), habits/ (3), unconscious/ (3 dotfiles), runtime/ (3+).
- **Consciousness loader (274 lines):** `electron/ai/mind/loader.ts`. Production-ready composition engine.
- **6 layers:** brainstem, limbic, drives, models, relational, habits.
- **6 contexts:** chat, morning_briefing, evening_review, nudge, task_parse, plan_process.
- **Limbic loading rules:** Loads for chat, morning_briefing, evening_review, plan_process. Does NOT load for nudge (lean, focused, no emotional overhead).
- **Unconscious (architectural):** .shadow, .biases, .dreams exist on disk. Loader skips dotfiles. Biases manifest through structural choices.
- **Wounds (behavioral residue only):** Only the "Behavioral Residue" section loads via section extraction. The entity feels the flinch but can't read the origin.
- **Wired into runtime:** ClaudeProvider.ts -> system prompts -> IPC bridge. All context-specific prompts use the loader.

### 5. Projects

- **Full CRUD:** Create, read, update, delete projects.
- **Task association:** Tasks can be assigned to projects.

### 6. Voice and Input

- **Voice dictation:** Task editing with voice input.
- **Floating voice assistant:** Button with TTS output.
- **Calendar integration:** Briefing and review schedules.

### 7. MCP Server

- **17 tools:** 11 task tools (CRUD + status changes + search) + 6 category tools.
- **Location:** `packages/mcp-server/`
- **Purpose:** Claude Code can manage MILO's tasks directly. Agent-to-agent communication layer.

### 8. UI and Design

- **Aesthetic:** Pip-Boy / industrial submarine cockpit. CRT glow effects, scanlines, monochrome palette with accent colors.
- **Framework:** React 18 + TypeScript + TailwindCSS.
- **State:** Zustand stores.

### 9. Test Suite

- **355 unit tests (Vitest):** All passing as of v0.3.0 ship.
- **E2E framework:** Playwright configured.
- **Validation:** Zod schemas for data integrity.

### 10. Analytics and Onboarding

- **PostHog:** Opt-in tracking for usage analytics.
- **Onboarding:** 3-step first-run flow.

### 11. Releases

- **v0.3.0 (Dec 30, 2024):** First public release. DMG on GitHub Releases.
- **v0.4.0 (Jan 2025):** Chat fixes, UI polish, Haiku plan agent.
- **v0.5.0 (Feb 2025):** Projects, briefing scheduler, calendar integration, voice assistant.

## Architecture Contract

### Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Runtime | Electron 28.x | Desktop-native, macOS tray app |
| Frontend | React 18 + TypeScript | Renderer process |
| Bundler | electron-vite | |
| Styling | TailwindCSS | Pip-Boy / submarine cockpit theme |
| State | Zustand | Simpler than Redux for this scope |
| Database | SQLite (better-sqlite3) | Local-first, privacy-first |
| AI | Anthropic Claude API | Via ClaudeProvider with consciousness loader |
| MCP | @modelcontextprotocol/sdk | 17 tools for Claude Code |
| Testing | Vitest + Playwright | 355 unit tests |
| Validation | Zod | |

### System Role

MILO is Eddie's daily operating system. It sits between Eddie's intention (goals, tasks) and his attention (focus state, drift detection). The consciousness layer makes it a participant, not a tool. The MCP server makes it accessible to other AI agents.

### Primary Actors

- `Eddie` -- the user. Sets goals, receives briefings, reviews evenings, captures tasks, chats.
- `MILO (consciousness)` -- the entity. Composes context-specific behavior from 32 mind files. Nudges, briefs, reviews, plans.
- `Claude Code` -- external agent. Manages tasks via MCP server (17 tools).
- `active-win` -- system monitor. Reports active application for focus state classification.

### Data Flow

```
Eddie (input: goals, tasks, voice, chat)
  -> React UI (renderer process)
  -> IPC bridge
  -> Electron main process
    -> SQLite (tasks, categories, goals)
    -> Consciousness loader (context -> layers -> files -> prompt)
    -> ClaudeProvider (system prompt + user message -> Claude API)
  -> Response back through IPC -> UI

active-win (system monitor)
  -> Focus state classification (GREEN/AMBER/RED)
  -> Drift detection threshold
  -> Nudge generation (consciousness loader in nudge context)
  -> Notification
```

### Core Entities

| Entity | Purpose | Key Fields |
|--------|---------|------------|
| tasks | Atomic work units | id, title, description, status, priority, category_id, scheduled_date |
| categories | Task grouping | id, name, color, sort_order |
| goals | Beacon > Milestone > Objective hierarchy | id, title, type, parent_id, status |
| consciousness files | Entity mind (32 files) | Markdown files in src/mind/ across 9 directories |

### Integrations

| Service | Purpose | Status |
|---------|---------|--------|
| Anthropic Claude API | AI reasoning (briefings, reviews, chat, nudges) | Active |
| active-win | Application focus tracking | Active |
| PostHog | Opt-in usage analytics | Active |
| MCP SDK | Claude Code task management | Active (17 tools) |
| Consciousness SDK | Shared composition engine | Built externally, not imported (inline loader used) |

## Current Boundaries

- Does NOT sync to cloud (local SQLite only)
- Does NOT have a mobile companion
- Does NOT use `@id8labs/consciousness-sdk` (inline loader at `electron/ai/mind/loader.ts`)
- Does NOT have calendar awareness (knows schedule, not calendar events)
- Does NOT have screen context detection (knows active app, not what's on screen)
- Does NOT have code signing (macOS Gatekeeper workaround documented)
- Does NOT have Notion, Apple Calendar, or Apple Notes MCP integrations
- Does NOT have write access to mind files (CaF Part 2 self-modification question)
- Does NOT have arena experiment data (protocol built in SDK, not run against this deployment)

## Verification Surface

### Core Features
- [x] Goal hierarchy (Beacon > Milestone > Objective > Task) works
- [x] Morning briefing generates context-specific AI dialogue
- [x] Evening review runs with reflection and scoring
- [x] Activity monitoring classifies focus state (GREEN/AMBER/RED)
- [x] Drift detection generates AI nudge messages
- [x] S/N scoring tracks signal-to-noise ratio
- [x] Quick capture parses natural language into task fields
- [x] Projects with full CRUD and task association

### Consciousness
- [x] 32 files across 9 directories exist in src/mind/
- [x] Consciousness loader composes context-specific prompts
- [x] Dotfiles (.shadow, .biases, .dreams) exist but do not load
- [x] Wounds load as behavioral residue only (section extraction)
- [x] Limbic does NOT load for nudge context

### Infrastructure
- [x] 355 unit tests pass
- [x] v0.3.0 DMG builds and runs on macOS
- [x] MCP server exposes 17 tools
- [ ] `npx tsc --noEmit` passes (current state unverified)
- [ ] E2E tests pass (framework configured, coverage unknown)

## Drift Log

| Date | Section | What Changed | Why | VISION Impact |
|------|---------|-------------|-----|---------------|
| 2024-12-30 | All | v0.3.0 shipped. Core planner with focus monitoring, AI dialogues, drift detection. | 3-day sprint to ship MVP | Pillars 1-2 realized |
| 2025-01 | Capabilities 2, 8 | v0.4.0: chat fixes, UI polish, Haiku plan agent | Quality pass | None |
| 2025-02 | Capabilities 5-6 | v0.5.0: projects, briefing scheduler, calendar integration, voice assistant | Feature expansion | Pillar 4 partial |
| 2026-03-06 | Capability 4 | Golden sample consciousness built (5 phases, 32 files, loader wired) | CaF paper implementation | Pillar 3 realized |
| 2026-03-09 | External | Consciousness SDK built in monorepo (not imported by Milo yet) | Deduplicate loader logic across products | Pillar 3 (SDK adoption pending) |
| 2026-03-20 | All | Format upgrade to v2 template | Triad standardization | None (format only) |
