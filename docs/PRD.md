# MILO Product Requirements Document
## Mission Intelligence Life Operator - Signal-to-Noise Life Planner

**Document Version:** 1.0
**Last Updated:** December 28, 2024
**Author:** Eddie Belaval / ID8Labs
**Status:** Draft → Review → Approved

---

## Executive Summary

MILO is a **Signal-to-Noise Life Planner** — a Pip-Boy-style desktop application that helps users cut through the noise of daily life and focus on what actually matters. Unlike traditional productivity tools that add complexity, MILO **subtracts noise** by providing AI-powered prioritization, real-time focus monitoring, and gamified accountability.

### The Core Metaphor
- **Signal** = Actions that directly advance your goals
- **Noise** = Everything else (distractions, busywork, drift)
- **S/N Ratio** = Your daily effectiveness metric

### The Musk Benchmark
Chase Elon-level ruthless prioritization. MILO helps you get there.

---

## Problem Statement

### The Noise Problem
Modern knowledge workers face an unprecedented level of noise:
- **Task fragmentation:** Tasks scattered across 5-10 tools
- **Priority blindness:** Everything feels urgent, nothing feels important
- **Drift without awareness:** Hours lost to context switching without realizing
- **Retrospective regret:** "Where did today go?"
- **Goal disconnection:** Daily actions feel disconnected from long-term vision

### Current Solutions Fall Short
| Tool | What It Does | Why It's Insufficient |
|------|--------------|----------------------|
| **Notion/Todoist** | Task storage | No prioritization intelligence, no focus monitoring |
| **Calendar apps** | Time blocking | Passive, doesn't adapt to reality |
| **Focus apps** | Block distractions | Punitive, doesn't understand context |
| **Screen time** | Usage reports | Retrospective only, no real-time guidance |

### The Gap
No tool connects **what you should do** (goal-aligned tasks) with **what you're actually doing** (real-time activity) while providing **intelligent guidance** (AI-powered prioritization).

---

## Product Vision

### Vision Statement
MILO is the **mission control for your life** — an always-present companion that knows your goals, sees your behavior, and guides you toward high-signal days with the precision of a Pip-Boy and the intelligence of a personal chief of staff.

### Design Philosophy
1. **Subtraction over addition** — Remove noise, don't add features
2. **Mission mindset** — Every day is a mission with clear objectives
3. **Ruthless prioritization** — 3-5 signal tasks, not 47 todos
4. **Real-time awareness** — Know when you drift, not after
5. **Gamified accountability** — Make productivity feel like progress in a game

### Success Metrics (V1.0)
| Metric | Target | Measurement |
|--------|--------|-------------|
| Daily active use | 14+ consecutive days | App usage logs |
| Morning briefing adoption | 100% of active days | Dialogue completion |
| Focused work increase | +15% GREEN time | Activity tracking |
| Drift detection accuracy | 70%+ | User feedback on alerts |
| S/N score improvement | Upward trend over 2 weeks | Score history |

---

## Target User

### Primary User: Eddie Belaval (Founder)
**Context:**
- Solopreneur building ID8Labs
- Multiple projects, limited time
- High ambition, needs focus discipline
- Technical, comfortable with desktop apps
- macOS primary environment

**Pain Points:**
- Tasks scattered across Notion, Calendar, Notes
- No visibility into where time actually goes
- Difficulty connecting daily work to quarterly goals
- Drift happens without awareness
- End-of-day regret about wasted time

**Success State:**
- Morning clarity on what matters today
- Real-time awareness of focus state
- Evening satisfaction with measurable progress
- Week-over-week improvement in signal ratio

### Future Users (Post-V1.0)
- Ambitious knowledge workers
- Founders and executives
- Anyone seeking Musk-level productivity
- Users who want a "personal chief of staff"

---

## Feature Requirements

### P0: Core Features (V1.0 Must-Have)

#### F1: Goal Hierarchy System
**Purpose:** Foundation for distinguishing signal from noise

**Hierarchy Structure:**
```
Beacon (Long-term Vision, 1-5 years)
    └── Milestones (Quarterly/Monthly objectives)
        └── Objectives (Weekly focus areas)
            └── Tasks (Daily actions)
                └── Current Mission (Right now)
```

**Requirements:**
| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| F1.1 | Define Beacons | User can create/edit/archive Beacons with title, description, timeframe |
| F1.2 | Define Milestones | Milestones link to Beacons with target dates |
| F1.3 | Define Objectives | Weekly objectives link to Milestones |
| F1.4 | Visual hierarchy | UI shows clear parent-child relationships |
| F1.5 | Task linking | Tasks can optionally link to Objectives |
| F1.6 | Onboarding flow | First-run wizard guides hierarchy creation |

**User Story:**
> As a user, I want to define my long-term vision and break it into actionable levels so that MILO can understand what "signal" means for me.

---

#### F2: Morning Briefing
**Purpose:** AI-powered daily planning dialogue

**Input Data:**
- Goal hierarchy (Beacons → Milestones → Objectives)
- Master task list (from all sources)
- Today's calendar events
- Yesterday's incomplete tasks
- Approaching deadlines (7-day window)

**Output:**
```
"Good morning. Here are your 3-5 highest-signal actions for today:"

1. [Task] — Why: directly advances [Milestone]
2. [Task] — Why: deadline in 2 days
3. [Task] — Why: unblocks 3 other tasks
4. [Task] — Why: you've delayed this 4 days
5. [Task] — Why: quick win, builds momentum

Confirm or adjust your mission.
```

**Requirements:**
| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| F2.1 | Automated trigger | Briefing initiates at configured time (default: 8am) |
| F2.2 | Manual trigger | User can trigger briefing anytime via menu |
| F2.3 | Task aggregation | Pulls tasks from Notion, Calendar, Notes, Manual |
| F2.4 | AI prioritization | Claude API generates ranked signal tasks |
| F2.5 | Rationale display | Each task shows WHY it's prioritized |
| F2.6 | User confirmation | User can accept, adjust, or regenerate list |
| F2.7 | Mission lock | Confirmed tasks become "Today's Mission" |

**User Story:**
> As a user, I want an AI-powered morning briefing that tells me my highest-signal tasks for today with clear reasoning so that I start each day with ruthless clarity.

---

#### F3: Activity Monitoring
**Purpose:** Real-time focus state detection

**State Definitions:**
| State | Visual | Meaning | Trigger |
|-------|--------|---------|---------|
| **GREEN** | 🟢 | On mission | Active app matches current task category |
| **AMBER** | 🟡 | Adjacent | Related but not exact task work |
| **RED** | 🔴 | Drifted | Completely off mission (distractor apps) |

**Requirements:**
| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| F3.1 | App polling | Poll active app/window every 5 seconds |
| F3.2 | App categorization | Map apps to work/ambiguous/distractor categories |
| F3.3 | Task mapping | Link tasks to expected app categories |
| F3.4 | State indicator | Persistent menu bar icon shows current state |
| F3.5 | State logging | All state changes logged with timestamps |
| F3.6 | Privacy mode | Optional pause for sensitive activities |

**User Story:**
> As a user, I want MILO to track my active application and show me whether I'm on-mission so that I have real-time awareness of my focus state.

---

#### F4: Drift Detection & Nudges
**Purpose:** Gentle intervention when focus is lost

**Nudge Logic:**
1. Sustained RED state triggers alert (configurable: 5-15 min)
2. Nudge appears as non-modal notification
3. Nudge content is contextual:
   - "You've been on Twitter for 12 minutes. Your mission: [current task]"
   - "Drift detected. Back to signal?"
4. User can acknowledge, snooze (5 min), or dismiss

**Requirements:**
| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| F4.1 | Drift threshold | Configurable RED duration before nudge (default: 10 min) |
| F4.2 | Contextual nudge | Nudge shows current task reminder |
| F4.3 | Non-intrusive | macOS notification, not modal dialog |
| F4.4 | User response | Acknowledge / Snooze / Dismiss options |
| F4.5 | Smart timing | No nudges during breaks or after hours |
| F4.6 | Learning | Track nudge effectiveness over time |

**User Story:**
> As a user, I want gentle nudges when I've drifted off-mission so that I can course-correct without feeling punished.

---

#### F5: Evening Review
**Purpose:** End-of-day reflection and scoring

**Dialogue Flow:**
1. "Which signal tasks did you complete?" (checkbox list)
2. "Anything important happen not on the list?" (optional add)
3. "What was your biggest win?" (freeform)
4. "What pulled you off track?" (freeform)
5. "Carry forward to tomorrow?" (select from incomplete)

**Requirements:**
| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| F5.1 | Automated trigger | Review initiates at configured time (default: 6pm) |
| F5.2 | Manual trigger | User can trigger review anytime via menu |
| F5.3 | Completion tracking | Pre-populated with today's signal tasks |
| F5.4 | Reflection prompts | Guided questions for insight |
| F5.5 | Carryover selection | Incomplete tasks can be forwarded |
| F5.6 | Score generation | S/N score calculated and displayed |
| F5.7 | Streak update | Streak incremented if score >= 75 |

**User Story:**
> As a user, I want a guided evening review that helps me reflect on my day and see my S/N score so that I close each day with awareness and accountability.

---

#### F6: S/N Scoring System
**Purpose:** Gamified accountability metric

**Score Breakdown (0-100):**
| Component | Weight | Calculation |
|-----------|--------|-------------|
| Completion | 40% | (Signal tasks completed / Signal tasks assigned) × 40 |
| Focus | 30% | (GREEN minutes / Total tracked minutes) × 30 |
| Noise Avoidance | 20% | (1 - RED minutes / Total tracked minutes) × 20 |
| Bonus | 10% | Exceeded goals (+5), Tackled avoidance (+3), Streak (+2) |

**Benchmark Scale:**
| Range | Label | Description |
|-------|-------|-------------|
| 90-100 | Musk-Level | Exceptional. Rare. Celebrate. |
| 75-89 | Strong Signal | Solid day. Maintain this. |
| 60-74 | Moderate Noise | Room to improve. Identify leaks. |
| 40-59 | Noisy | Significant drift. Reset tomorrow. |
| <40 | Static | Major intervention needed. |

**Requirements:**
| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| F6.1 | Daily calculation | Score computed during evening review |
| F6.2 | Component breakdown | Show each component's contribution |
| F6.3 | Historical tracking | Store all daily scores |
| F6.4 | Streak tracking | Consecutive days with score >= 75 |
| F6.5 | Trend visualization | Weekly/monthly trend charts |
| F6.6 | Personal bests | Track and celebrate high scores |

**User Story:**
> As a user, I want a gamified S/N score that makes my productivity measurable so that I can track improvement and maintain streaks.

---

#### F7: Desktop Presence (Pip-Boy UI)
**Purpose:** Always-accessible, mission-focused interface

**Components:**
1. **Menu Bar Icon** — State indicator (GREEN/AMBER/RED), quick access
2. **Floating Dashboard** — Resizable, always-on-top option
3. **Pip-Boy Aesthetic** — Retro-future CRT terminal design

**Design Specifications:**
- Phosphor green/amber primary colors
- CRT scanline overlay effect
- Screen glow and subtle flicker
- Monospace/terminal typography
- Dark background (#0a0a0a)

**Requirements:**
| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| F7.1 | Menu bar tray | App lives in macOS menu bar |
| F7.2 | Quick status | Tray shows current state color |
| F7.3 | Floating window | Dashboard can float above other windows |
| F7.4 | Always-on-top | Optional pin to stay visible |
| F7.5 | Resize support | Window resizable within bounds |
| F7.6 | Pip-Boy theme | CRT effects, scanlines, glow |
| F7.7 | State transitions | Smooth color transitions between states |

**User Story:**
> As a user, I want a visually distinctive Pip-Boy interface that makes MILO feel like mission control so that productivity feels like an adventure, not a chore.

---

### P1: Important Features (V1.0 Should-Have)

#### F8: Task Sources (MCP Integrations)
**Purpose:** Aggregate tasks from multiple sources

**Supported Sources:**
| Source | Integration Method | Priority |
|--------|-------------------|----------|
| Notion | MCP Server | P1 |
| Apple Calendar | MCP/Native API | P1 |
| Apple Notes | MCP/Native API | P1 |
| Manual Entry | Built-in | P0 |

**Requirements:**
| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| F8.1 | Notion sync | Pull tasks from configured Notion databases |
| F8.2 | Calendar sync | Pull events from Apple Calendar |
| F8.3 | Notes capture | Extract tasks from Apple Notes |
| F8.4 | Quick capture | Manual task entry in MILO |
| F8.5 | Source attribution | Tasks show origin source |
| F8.6 | Bidirectional sync | Completion status writes back (Notion) |

---

#### F9: Statistics Dashboard
**Purpose:** Historical performance visualization

**Visualizations:**
- Daily S/N score graph (7/30/90 day views)
- Current streak display
- Component breakdown pie chart
- Time-of-day drift patterns
- App usage breakdown

**Requirements:**
| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| F9.1 | Score history | Line chart of daily scores |
| F9.2 | Streak counter | Current and longest streak |
| F9.3 | Pattern analysis | "You drift around 2pm" insights |
| F9.4 | App breakdown | Time per app/category |
| F9.5 | Export data | CSV export option |

---

### P2: Nice-to-Have Features (Post-V1.0)

#### F10: Analog Task Capture
- Phone camera captures handwritten notes
- OCR extracts text
- AI parses into tasks
- Syncs to MILO

#### F11: Team Features
- Shared goal hierarchies
- Team S/N benchmarks
- Accountability partnerships

#### F12: Mobile Companion
- iOS app for capture only
- Push notifications for briefings
- Score viewing

---

## Non-Functional Requirements

### Performance
| Metric | Target |
|--------|--------|
| App launch time | < 2 seconds |
| Activity poll latency | < 100ms |
| AI response time | < 3 seconds |
| Memory footprint | < 150MB |
| CPU idle usage | < 1% |

### Reliability
- Graceful degradation if AI unavailable
- Local data persistence (no data loss)
- Offline mode for core features

### Security & Privacy
- All data stored locally (SQLite)
- API keys stored in system keychain
- Activity data never leaves device (except AI summaries)
- No analytics/telemetry in V1.0

### Compatibility
- macOS 12+ (Monterey and later)
- Apple Silicon and Intel support

---

## User Journeys

### Journey 1: First-Time Setup
```
1. Download & Launch MILO
2. Welcome screen explains Signal-to-Noise concept
3. Onboarding: Define first Beacon (5-year vision)
4. Onboarding: Define first Milestone (this quarter)
5. Onboarding: Define first Objective (this week)
6. Connect Notion (optional)
7. Configure morning/evening times
8. MILO ready for first morning briefing
```

### Journey 2: Daily Morning Routine
```
1. 8:00am: MILO notification "Morning briefing ready"
2. Open MILO → Morning dialogue begins
3. Review AI-suggested signal tasks with rationale
4. Adjust if needed (add/remove/reorder)
5. Confirm mission
6. Dashboard shows "Today's Mission" locked in
7. Begin work
```

### Journey 3: During Work
```
1. Work on Task 1 in expected app (VSCode)
2. MILO shows GREEN state
3. Context switch to Slack (AMBER)
4. Distracted by Twitter (RED)
5. 10 minutes pass → Nudge appears
6. "You've been on Twitter for 10 min. Mission: Task 1"
7. User clicks "Back to it" → Returns to work
8. State returns to GREEN
```

### Journey 4: End of Day
```
1. 6:00pm: MILO notification "Time for evening review"
2. Open MILO → Evening dialogue begins
3. Check off completed signal tasks
4. Reflect on wins and drift causes
5. Select carryover tasks
6. See S/N score: 78 (Strong Signal!)
7. Streak incremented to 5 days
8. Close with satisfaction
```

---

## Open Questions

| Question | Options | Decision |
|----------|---------|----------|
| Default drift threshold | 5/10/15 min | 10 min default, user configurable |
| Scoring weight balance | Current vs different | Start with proposed, tune from data |
| AI model | Claude Sonnet vs Haiku | Sonnet for quality, evaluate cost |
| Notion sync frequency | Real-time vs periodic | Periodic (5 min) to avoid API limits |
| Mobile priority | None vs capture-only vs full | None for V1.0 |

---

## Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Activity monitoring privacy concerns | High | Medium | Clear disclosure, local-only data, privacy mode |
| AI costs add up | Medium | Medium | Cache responses, use Haiku for simple tasks |
| False positive drift detection | Medium | High | User feedback loop, configurable categories |
| Over-engineering | High | Medium | Strict V1.0 scope, founder-first validation |
| Pip-Boy aesthetic feels gimmicky | Low | Low | User testing, serious functionality underneath |

---

## Success Criteria (V1.0 Ship Gate)

**Functional:**
- [ ] Goal hierarchy CRUD working
- [ ] Morning briefing dialogue complete
- [ ] Activity monitoring accurate
- [ ] Drift nudges firing correctly
- [ ] Evening review dialogue complete
- [ ] S/N scoring calculating correctly
- [ ] Notion integration syncing
- [ ] Pip-Boy UI polished

**Quality:**
- [ ] No P0/P1 bugs
- [ ] Performance targets met
- [ ] 14+ days founder daily use
- [ ] Subjectively "can't work without it"

**Validation:**
- [ ] Morning briefing used every day
- [ ] S/N score trending upward
- [ ] 7+ day streak achieved
- [ ] "Feels essential, not optional"

---

## Appendix

### A: Glossary
| Term | Definition |
|------|------------|
| Signal | Actions that directly advance your goals |
| Noise | Everything else (distractions, busywork, drift) |
| S/N Ratio | Signal-to-Noise ratio — your effectiveness metric |
| Beacon | Long-term vision (1-5 year goal) |
| Milestone | Quarterly/monthly objective |
| Objective | Weekly focus area |
| Drift | Time spent on RED (distractor) activities |
| Mission | Today's confirmed signal tasks |

### B: Competitive Analysis
| Competitor | Strength | Weakness vs MILO |
|------------|----------|------------------|
| Notion | Flexible, powerful | No AI prioritization, no monitoring |
| Todoist | Simple, fast | No goal hierarchy, no focus tracking |
| RescueTime | Good tracking | No AI, retrospective only |
| Freedom | Effective blocking | Punitive, no intelligence |
| Sunsama | Daily planning | No real-time monitoring, SaaS cost |

### C: Reference Links
- Notion Workspace: [link]
- Signal System Design: [link]
- Roadmap: [link]
- System Overview: [link]

---

**Document Status:** Ready for technical design phase

**Next Step:** Technical Design Document → Development

---

*"The goal is a productivity tool that subtracts noise instead of adding features."*
