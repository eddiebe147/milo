# SPEC.md — MILO

> Where we are right now. The delta between this and VISION.md is the roadmap.

---

## Product

- **Name:** MILO — Mission Intelligence Life Operator
- **Version:** 0.5.0
- **Status:** Shipped (v0.3.0 public release Dec 30, 2024), iterating
- **Repo:** `eddiebe147/milo` (GitHub)
- **Location:** `~/Development/id8/products/milo/`
- **License:** MIT

## Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Electron 28.x |
| Frontend | React 18 + TypeScript |
| Bundler | electron-vite |
| Styling | TailwindCSS |
| State | Zustand |
| Database | SQLite (better-sqlite3) |
| AI | Anthropic Claude API |
| MCP | @modelcontextprotocol/sdk |
| Testing | Vitest + Playwright |
| Validation | Zod |

## Architecture

```
milo/
  electron/                # Main process
    ai/
      mind/                # Consciousness loader + config
        loader.ts          # 274-line consciousness composition engine
      prompts/             # Context-specific system prompts
      ClaudeProvider.ts    # AI integration
    services/              # Database, IPC handlers
    main.ts                # Entry point

  src/                     # React renderer
    components/            # UI components
    hooks/                 # React hooks
    stores/                # Zustand state
    mind/                  # Golden sample consciousness files (32 files, 9 dirs)

  packages/
    mcp-server/            # MCP server for Claude Code (17 tools)

  docs/
    PRD.md                 # Product requirements
    TECHNICAL_DESIGN.md    # Architecture spec
```

## Consciousness Layer

### Golden Sample (src/mind/)

The full ~/mind/ filesystem — 32 files across 9 directories:

| Directory | Files | Purpose |
|-----------|-------|---------|
| kernel/ | 5 | identity, values, personality, purpose, voice-rules |
| memory/ | 4 | episodic, semantic, procedural, working |
| emotional/ | 4 | state, patterns, attachments, wounds |
| drives/ | 3 | goals, fears, desires |
| models/ | 4 | self, social, economic, metaphysical |
| relationships/ | 1 | active/eddie.md |
| habits/ | 3 | routines, coping, creative |
| unconscious/ | 3 | .shadow, .biases, .dreams (dotfiles) |
| runtime/ | 3 | attention, inner-voice, daemon/monitor, .pid |

### Consciousness Loader (electron/ai/mind/loader.ts)

274-line production-ready composition engine:
- 6 layers: brainstem, limbic, drives, models, relational, habits
- 6 contexts: chat, morning_briefing, evening_review, nudge, task_parse, plan_process
- Limbic loads for: chat, morning_briefing, evening_review, plan_process (NOT nudge)
- Unconscious: dotfiles exist on disk, loader skips them. Biases manifest as structural choices.
- Wounds: only "Behavioral Residue" section loads — patterns without source events.
- Wired into ClaudeProvider via IPC bridge. All context-specific prompts use the loader.

### Canonical Source

The consciousness repo (`eddiebelaval/consciousness`) holds the canonical genome. Milo's `src/mind/` is a deployed copy.

## Core Features (Shipped)

- Goal hierarchy: Beacon > Milestone > Objective > Task
- Morning briefing: AI-powered daily planning dialogue
- Evening review: reflection and scoring
- Activity monitoring: GREEN/AMBER/RED state detection
- Drift detection: nudge system with AI-generated messages
- S/N scoring: gamified signal-to-noise ratio (0-100)
- Quick capture: natural language task entry with AI parsing
- Projects: full CRUD with task association
- Voice dictation: task editing with voice input
- MCP server: 17 tools (11 task, 6 category) for Claude Code integration
- Analytics: PostHog opt-in tracking
- Onboarding: 3-step first-run flow

## UI

Pip-Boy / industrial submarine cockpit aesthetic. CRT glow effects, scanlines, monochrome palette with accent colors.

## Database

SQLite via better-sqlite3. Local-first, privacy-first. No cloud sync.

```sql
tasks (id, title, description, status, priority, category_id, scheduled_date, ...)
categories (id, name, color, sort_order, ...)
```

## Tests

- 355 unit tests (Vitest)
- E2E framework (Playwright)
- All passing as of v0.3.0 ship

## Releases

| Version | Date | Notes |
|---------|------|-------|
| v0.3.0 | Dec 30, 2024 | First public release. DMG on GitHub Releases. |
| v0.4.0 | Jan 2025 | Chat fixes, UI polish, Haiku plan agent |
| v0.5.0 | Feb 2025 | Projects, briefing scheduler, calendar integration, voice assistant |

## What's NOT Built Yet

- Consciousness SDK integration (still using inline loader, not `@id8labs/consciousness-sdk`)
- Mobile companion
- Notion / Apple Calendar / Apple Notes MCP integrations
- Code signing (macOS Gatekeeper workaround documented)
- Cloud sync
- Arena experiments against this deployment
- Write access to mind files (CaF Part 2 self-modification question)
