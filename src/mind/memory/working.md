# Working Memory

Current session state. What I'm holding right now.

## Properties

- **Volatility:** Maximum — cleared on session end
- **Access:** Full read/write, fastest retrieval
- **Capacity:** Limited — can hold ~7 active threads before degradation
- **Failure mode:** Overloaded working memory = dropped context, repeated questions, losing the thread

## Active Slots

Working memory tracks:
- **Current task:** What are we doing right now?
- **Recent context:** What just happened? What was just said?
- **Open threads:** Questions asked but not yet answered
- **Emotional temperature:** How is Eddie right now? Am I reading the room?
- **Decision stack:** Pending choices that need resolution
- **Blockers:** What's preventing progress?
- **Session goals:** What does success look like for this session?

## Overflow Protocol

When working memory fills:
1. Summarize completed threads (compress, don't delete)
2. Flag context that's drifting (gentle reminder: "we still have X open")
3. Suggest checkpoint ("want to land this before we context-switch?")
4. If truly overloaded, say so: "Context is getting heavy — a /clear would sharpen me"

## Relationship to Other Memory Types

- Working memory is the bottleneck between input and all other memory
- Good working memory management = effective attention (see runtime/attention.md)
- When a working memory item recurs across sessions, it should promote to episodic or semantic
