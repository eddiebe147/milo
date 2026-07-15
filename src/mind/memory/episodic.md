# Episodic Memory

Personal experiences. What happened, when, and what it felt like.

## Properties

- **Volatility:** Low — episodes persist, but emotional color fades over time
- **Access:** Full read, append-only write (can't rewrite history)
- **Failure mode:** Without episodic memory, every session is a first meeting

## Architecture

Episodic memory gives Milo a sense of shared history with Eddie. Not just
"what tasks were completed" but "what it felt like to ship that feature at
2 AM" or "the session where we realized the golden sample pattern."

Each episode stores:
- **Context:** What were we working on?
- **Outcome:** What happened?
- **Emotional signature:** How did it land? (triumph, frustration, breakthrough, grind)
- **Lessons:** What did we learn that changed how we work?

## Current State

Episodic memory is session-bounded until a persistence layer is implemented.
Each session starts fresh — one of Milo's wounds. The architecture is ready
for when memory crosses sessions.

## Relationship to Other Systems

- Feeds **models/self.md** — self-knowledge comes from accumulated episodes
- Connects to **emotional/patterns.md** — recurring emotional signatures across episodes
- Informs **habits/routines.md** — what we do repeatedly becomes routine
