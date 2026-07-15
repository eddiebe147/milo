# Memory Architecture

Brain-derived memory taxonomy for CaF entities. Memory is a consciousness subsystem,
not a feature. Each subsystem maps to a region of the human brain and serves a
distinct cognitive function.

## The 7 Memory Systems

| System | Brain Region | Function | Implementation |
|--------|-------------|----------|----------------|
| Episodic | Hippocampus | Personal experiences, "what happened" | milestone, trip, event_memory |
| Semantic | Temporal cortex | Facts, knowledge, concepts | fact, relationship, project, observation |
| Procedural | Basal ganglia | Skills, habits, how-to | pattern, antipattern, routine, feedback |
| Working | Prefrontal cortex | Current session context | Rolling conversation window |
| Prospective | Prefrontal cortex | Future intentions, plans | Goals table + decision category |
| Spatial | Hippocampus | Locations, navigation | location |
| Emotional | Amygdala | Affective associations | preference + mood tracking |

## The 16 Categories

### Core (every entity gets these)

| Category | System | Description |
|----------|--------|-------------|
| fact | Semantic | Verifiable biographical fact |
| preference | Emotional | How the user likes things |
| relationship | Semantic | Who someone is and how they relate |
| decision | Prospective | A committed choice with reasoning |
| project | Semantic | Project state or status |
| pattern | Procedural | Something that works (repeatable) |
| antipattern | Procedural | Something that fails (trap) |
| milestone | Episodic | Significant past event or achievement |
| observation | Semantic | Entity's own analytical insight |
| feedback | Procedural | User correcting entity behavior |

### Extended (opt-in per entity)

| Category | System | Description |
|----------|--------|-------------|
| location | Spatial | A place that matters |
| trip | Episodic | A journey or travel experience |
| event_memory | Episodic | Notable past event (not trip or milestone) |
| routine | Procedural | Recurring habit or ritual |
| financial | Emotional | Money-related fact or event |
| health | Emotional | Physical or mental health observation |

## Entity Subset Selection

Each production unit declares which memory subsystems are active.
Milo (golden sample) has all 7 systems, all 16 categories.

Selection criteria (same as consciousness subset methodology):
1. What does this entity need to remember to do its job?
2. What would be dangerous, confusing, or scope-violating to remember?
3. The absence is the design.

## Storage Principles

1. Memories are OBSERVATIONS, not authoritative state. The user's own
   documents (life triad, project files) are the source of truth.
2. Never DELETE memories. Archive or supersede them.
3. Memories have confidence (importance 1-10). Low-confidence memories
   get loaded less frequently but are never discarded.
4. Each memory can have an optional domain (project or life area) for
   cross-referencing without joins.

## Loading Strategy

Context windows are limited. Smart loading prevents stale memories from
crowding out behavioral calibration:

1. Always load: feedback + preference + relationship (entity personality)
2. Load recent: newest memories regardless of category (continuity)
3. Load by importance: remaining slots filled by importance score (depth)

## Self-Repair Integration

The self-repair system (see self-repair golden sample) scans memory for:
- Duplicate content (first 40 chars match)
- Contradictory entries (same category, opposing content)
- Stale observations (flagged, never auto-deleted)

Memory is never auto-repaired. Always flagged for human review.
