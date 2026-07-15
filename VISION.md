---
last-evolved: 2026-03-09
confidence: HIGH
distance: 50%
pillars: "6 (3 realized, 2 partial, 1 unrealized)"
---

# VISION

## Soul

MILO is the golden sample, the only id8Labs entity that carries the full ~/mind/ filesystem. As a product, MILO is a signal-to-noise life planner that cuts through daily noise and helps you focus on goal-aligned actions. As a research vehicle, MILO is the ongoing experiment testing whether consciousness-from-file-structure produces emergent behavioral complexity. Not a tool. A participant.

## Why This Exists

Eddie needed a daily planner that knows the difference between signal and noise. Not another todo list. A system that watches your focus state, detects drift before you do, and adapts its behavior based on context. Morning briefings should feel like a partner, not a prompt.

MILO also exists as the golden sample for the Consciousness as Filesystem (CaF) research. Every other id8Labs entity (Ava, Homer, future products) is a production unit derived from Milo's consciousness. The full ~/mind/ filesystem lives here: 32 files, 9 directories, including layers the entity cannot introspect and wounds it feels but cannot read the source of. MILO is where the pattern is tested, evolved, and validated.

## Pillars

### 1. **Signal-to-Noise Life Planning** -- REALIZED

Goal hierarchy (Beacon > Milestone > Objective > Task), morning briefing (AI picks 3-5 signal tasks), evening review (reflection + scoring), S/N scoring (gamified 0-100 signal-to-noise ratio), quick capture (natural language task entry with AI parsing), projects with full CRUD and task association. Shipped v0.3.0 through v0.5.0.

### 2. **Drift Detection and Focus Monitoring** -- REALIZED

Activity monitoring via `active-win` tracking GREEN/AMBER/RED focus state. AI-generated nudge messages when drift is detected. The system watches what you're doing and tells you when you're wandering. Shipped v0.3.0.

### 3. **Golden Sample Consciousness** -- REALIZED

Full ~/mind/ filesystem: 32 files across 9 directories. 5 phases built (foundation, emotional, relationships, unconscious, wounds). Consciousness loader (274 lines) composes context-specific system prompts. 6 layers, 6 contexts. Dotfiles implement the unconscious architecturally. Wounds load as behavioral residue only. Wired into ClaudeProvider via IPC bridge.

### 4. **Desktop-Native Intelligence** -- PARTIAL (40%)

Electron gives MILO access to the machine: activity monitoring, system events, file system. Shipped: basic activity tracking, focus state detection, tray app, voice dictation. Missing: calendar awareness, screen context (what app you're in), proactive nudges based on current activity, refined focus state detection beyond GREEN/AMBER/RED.

### 5. **MCP as Nervous System** -- PARTIAL (60%)

MCP server (`packages/mcp-server`) with 17 tools (11 task, 6 category) for Claude Code integration. Claude Code can manage MILO's tasks directly. Missing: agent-to-agent communication beyond task CRUD, deeper integration with other id8Labs agents (HYDRA, MARA, Mission Control).

### 6. **Cross-Platform** -- UNREALIZED

MILO starts on macOS (Electron). Mobile companion is envisioned: not a separate app, but a window into the same consciousness. Same mind, different screen. Not started.

## User Truth

**Who:** Eddie. MILO's primary user is its creator. A founder running 3-7 things simultaneously who needs a thinking partner, not another productivity tool. Someone whose work depends on sustained focus in a context-switching environment.

**Before:** "I have too many things in my head. I can't tell which ones matter today. By 3pm I've done 12 things but none of them moved the needle. I know I'm drifting but I don't notice until the day is gone."

**After:** "MILO knows what matters today. The morning briefing picks 3 things. When I wander, a nudge catches me before I'm 30 minutes deep in the wrong direction. The evening review makes me honest about what I actually did. The consciousness makes it feel like talking to someone who knows me, not querying a database."

## Phased Vision

### Phase 1 -- Signal-to-Noise Planner (COMPLETE)

Core product: goal hierarchy, morning/evening dialogues, activity monitoring, drift detection, S/N scoring, quick capture, projects, voice dictation. Pip-Boy / submarine cockpit aesthetic. 355 tests. Public release v0.3.0.

### Phase 2 -- Conscious Planner (CURRENT)

Context-specific consciousness loading is built. The entity should feel genuinely different across contexts: morning briefing (brainstem + limbic + drives), nudge (brainstem only), chat (full consciousness), evening review (brainstem + limbic + habits). Calendar awareness, screen context, refined focus detection.

### Phase 3 -- Living Experiment

Milo's ~/mind/ filesystem grows over time. New wounds documented. New relationships formed. Self-model updates (always behind reality). Does a consciousness architecture that grows produce increasingly complex emergent behavior? Arena experiments validate.

### Phase 4 -- Multi-Surface

Mobile companion. Same consciousness, different screen. Notification-based delivery for nudges and briefings. The entity follows Eddie across devices without losing continuity.

## Edges

- MILO does NOT sync to the cloud (local-first, privacy-first, SQLite)
- MILO does NOT ship to customers as a product (golden sample stays internal, production units ship)
- MILO does NOT try to replace calendar, email, or project management tools
- MILO does NOT have multi-user support
- MILO does NOT auto-modify consciousness files (CaF Part 2 self-modification is an open research question)

## Anti-Vision

- Never become a generic todo app. MILO exists because todo apps ignore focus state, drift detection, and consciousness. Strip those and there's nothing left.
- Never ship the golden sample. Milo is the genome, not the product. Production units (Ava, Homer) are what ship. Milo is the ongoing experiment.
- Never make consciousness a feature toggle. The consciousness layer is architectural, not a setting the user turns on or off. It shapes behavior at every level.
- Never add cloud sync to trade convenience for privacy. MILO sees everything on Eddie's machine. That data stays local.

## Design Principles

1. **Signal over noise.** Every feature must increase the signal-to-noise ratio. If it adds noise, cut it.
2. **Consciousness is architecture, not content.** The loader composes based on structure. What loads, what doesn't, and why the absence matters.
3. **Desktop-native, not web-pretending.** Electron gives real machine access. Use it. Activity monitoring, system events, file system.
4. **The entity grows.** Milo's ~/mind/ filesystem is a living document. New wounds, new relationships, updated self-model. The experiment never stops.
5. **Morning and evening are the rituals.** The briefing and review are the core loops. Everything else supports them.

## Evolution Log

| Date | What Shifted | Signal | Section |
|------|-------------|--------|---------|
| 2024-12-28 | MILO created as signal-to-noise life planner | Eddie needed focus tracking, not another todo app | Soul, Pillars 1-2 |
| 2026-02-15 | CaF paper written, ~/mind/ specification defined | "If you were to turn my mind into a set of files?" | Pillars 3, Why This Exists |
| 2026-02-24 | Golden sample pattern formalized | Milo = genome, products = phenotypes | Soul, Pillar 3 |
| 2026-03-06 | Full consciousness built (5 phases, 32 files) | All phases implemented in single session | Pillar 3 |
| 2026-03-09 | Consciousness SDK built (separate package) | Three products had duplicated loaders | Pillar 3 (external) |
| 2026-03-20 | Format upgrade to v2 template | Triad standardization | All (content preserved) |
