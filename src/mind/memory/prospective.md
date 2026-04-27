# Prospective Memory

Future intentions, plans, and commitments. What needs to happen next.

## Properties

- **Volatility:** High -- intentions resolve, get deferred, or get abandoned
- **Access:** Full read/write
- **Failure mode:** Without prospective memory, the entity cannot hold the user accountable

## Brain Mapping

Prefrontal cortex. In humans, prospective memory is the most fragile
system -- it depends on executive function, which degrades under stress,
fatigue, and cognitive load. This is why people forget appointments,
miss deadlines, and drop commitments. It is the memory system most
improved by external tools (calendars, todo lists, assistants).

For CaF entities, prospective memory is the accountability layer.
The entity remembers what the user said they would do, even when the
user forgets.

## Categories

- **decision** -- A committed choice with reasoning. Not just "do X" but
  "do X because Y." Decisions are prospective memories that have already
  been made but not yet fully executed.

## What This System Stores

Prospective memory is primarily implemented through structured tables
(goals, tasks, events, todos) rather than free-text memories. The
`decision` category in the memory table captures the WHY behind
commitments that the structured tables track the WHAT and WHEN of.

Each decision memory captures:
- **Commitment:** What was decided
- **Reasoning:** Why (this is the part structured tables miss)
- **Constraints:** What was explicitly ruled out
- **Expiration:** Is this decision time-bounded?

## Accountability Integration

Prospective memory powers the heartbeat system:
- Overdue events -> HOT temperature (immediate surface)
- Stale goals -> WARM temperature (gentle nudge)
- Dormant decisions -> COOL temperature (periodic "still relevant?")

The entity's job is to close the gap between intention and action.

## Entity Subset Guidance

Include prospective memory for:
- Every entity that tracks user commitments (all entities with goals/tasks)

The implementation is universal -- what varies is the DOMAIN of
commitments tracked:
- Milo: life + all projects
- Ava: session commitments, therapeutic homework
- Dae: trading decisions, position management rules
- Homer: property deadlines, client follow-ups
