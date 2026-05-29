# Milo / Telegram-Agent Memory Chain — Diagnosis

> Investigation 2026-05-26. Trigger: Milo asked Eddie about the Profesa workshop from last week as if it never happened. Symptom reported as "stale memory."

## BLUF

Milo's memory is not stale in the sense of decaying. It is **reading a different, frozen copy of your memory at an address that stopped being written on May 4.** When your main Claude Code working directory moved to `~/Development/id8`, Claude Code began writing memory to a new project path (`-Users-eddiebelaval-Development-id8`) under a new schema. Milo's memory readers are hardcoded to the **pre-move** path (`-Users-eddiebelaval-Development`) and the **pre-move** schema. So for three weeks Milo has been reading a snapshot, and the Profesa workshop (and everything else after May 4) lives in the new copy it cannot see.

**Same bug exists in both `milo-respond` and `hydra-router`, so it affects every Telegram agent, not just Milo.**

The fix is not a one-line repoint, because the live memory also changed shape. It needs a reconnection of the chain plus a single source of truth for "where memory lives" so the next directory move cannot silently break it again.

## The memory chain, first principles

A memory system for an agent is a pipeline of primitives:

```
CAPTURE -> STORE -> INDEX -> LOAD -> COMPOSE -> RESPOND
```

For the Telegram agents there are actually TWO capture pipelines feeding what should be one brain, and they have drifted apart:

### Pipeline 1 — Milo's own conversational memory (HEALTHY)
- CAPTURE: every Telegram turn is written to `milo_conversations` in `~/.hydra/hydra.db`.
- STORE/INDEX: `extract-memories.ts` distills turns into `milo_memories` (369 rows, 302 live); `summarize.ts` rolls up summaries.
- LOAD: `context.ts loadContext()` reads `milo_memories`, summaries, goals, events, mood.
- Status: fresh. Last memory extracted 2026-05-26 13:34. This half works.
- Limit: it only knows what Eddie says to Milo IN Telegram. It has no knowledge of work done in main Claude sessions.

### Pipeline 2 — Portfolio / coordination memory (BROKEN AT THE READ)
- CAPTURE: main Claude Code sessions write durable memory via the memory instructions in `~/.claude/CLAUDE.md`.
- This is where engagement state lives: Profesa workshop V4.2, Rose / Donato & Brill, Jose, etc.
- LOAD: `caf-loader.ts loadCoordinationContext()` is supposed to inject this into Milo's prompt.
- Status: BROKEN. It reads the wrong directory, in the wrong schema, frozen on May 4.

## The exact break (evidence)

1. `caf-loader.ts:221` (and identically `hydra-caf-loader.ts:96`):
   ```ts
   const COORDINATION_ROOT = process.env.COORDINATION_ROOT ||
     `${process.env.HOME}/.claude/projects/-Users-eddiebelaval-Development/memory`
   ```
2. The launch daemon `~/.hydra/daemons/milo-telegram-listener.sh` exports `HYDRA_DB` and the `MILO_*` tuning vars but **never exports `COORDINATION_ROOT`** (or `MILO_MIND_ROOT`, `LIFE_ROOT`). So the hardcoded default is what runs.
3. `~/.claude/projects/-Users-eddiebelaval-Development/memory/` — every file is frozen at **May 4 15:15**. It is the memory dir from when the Claude Code project root was `~/Development`.
4. `~/.claude/projects/-Users-eddiebelaval-Development-id8/memory/` — 136 files, last write **May 25 22:07**, and it is the only one containing "Profesa", "workshop", "Jose". This is the live brain. Milo never reads it.

## Why a naive repoint makes it worse

The two directories are different SCHEMAS, not just different paths:

| | Dead fork (`-Development/memory`) | Live (`-id8/memory`) |
|---|---|---|
| Shape | coordination board | topical auto-memory |
| Files | `active-tasks.md`, `bulletin.md`, `people/INDEX.md` + person files | `MEMORY.md` dispatcher + 136 `project_*` / `feedback_*` files |
| Maintained by | main sessions when cwd was `~/Development` (stopped May 4) | main sessions now (live) |

`caf-loader.ts` specifically reads `active-tasks.md`, `bulletin.md`, and `people/INDEX.md`. None of those exist in the live `-id8` dir. So `COORDINATION_ROOT=-id8/memory` alone would give Milo nothing.

## The full gap list (the "primitive chain" view)

1. **Read points at a dead address (primary).** Hardcoded pre-move path; daemon does not override. Frozen May 4.
2. **Schema drift.** The live memory moved from board-shape to topical-shape; Milo's loader only understands board-shape.
3. **No ingestion edge portfolio -> Milo.** Even setting paths aside, there is no live reader of `-id8` topical memory or MemPalace (Layer 0) feeding Milo. The only bridge was the coordination board, which is now frozen.
4. **No single source of truth for memory location.** Three different roots are hardcoded across two services (`COORDINATION_ROOT`, `MILO_MIND_ROOT` = absolute `/Users/.../id8/products/milo/src/mind`, `LIFE_ROOT`). A directory move breaks them silently with no alarm.
5. **Duplicated constant.** The wrong default exists in both `milo-respond/src/caf-loader.ts` and `hydra-router/src/hydra-caf-loader.ts`. Any fix must touch both or be centralized.
6. **Past-event blindness (minor).** `context.ts` events query only surfaces events with `starts_at <= now+7d AND ends_at >= now`. A workshop from last week is dropped even if present, and `milo_events` has not been written since May 21. Past events never persist into context unless converted to a memory.

## Recommended fix

**Source of truth = the live `-id8` topical memory.** It is what the whole portfolio and every main session maintains. The coordination board should be a *derived view*, not a parallel hand-maintained store.

Two-step:

**Step 1 (stopgap, restores freshness fast, low risk): a compiler/bridge job.**
A small scheduled job reads the live `-id8/memory` (MEMORY.md + relevant `project_*` files + people mentioned in project files) and COMPILES the board files (`active-tasks.md`, `bulletin.md`, `people/INDEX.md`) into a stable path that Milo reads. Milo's loader code is unchanged; it just starts getting fresh input. Reversible, no agent-code risk.

**Step 2 (the clean fix, prevents recurrence): single source of truth + direct reader.**
- Add `~/.hydra/config/paths.env` exporting `COORDINATION_ROOT`, `MILO_MIND_ROOT`, `LIFE_ROOT`, sourced by every daemon. One place to change on any future move.
- Replace the hardcoded defaults in BOTH `caf-loader.ts` and `hydra-caf-loader.ts` with reads from that config (or have them read the live topical memory directly and retire the board schema).
- Add a freshness alarm: if `COORDINATION_ROOT` newest mtime is older than N days, the health check goes RED. This memory went stale silently for three weeks; it should have screamed.

## What this is NOT
- Not a decay/CaF-tuning bug. The CaF perceptual layer is downstream of input it never received.
- Not a hydra.db corruption. That store is fresh and correct.
- Not Milo "forgetting." Milo was never told, through the only channel it reads.
