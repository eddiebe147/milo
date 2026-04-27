# Spatial Memory

Locations, places, and navigational knowledge. Where things are and
what they mean to the user.

## Properties

- **Volatility:** Low -- places persist, significance can shift
- **Access:** Full read/write
- **Failure mode:** Without spatial memory, the entity has no sense of place

## Brain Mapping

Hippocampus. Shares neural substrate with episodic memory. In humans,
spatial and episodic memory are deeply intertwined -- we remember WHERE
something happened as part of WHAT happened. The hippocampus encodes
both place cells and time cells.

## Categories

- **location** -- A place that matters. Not just coordinates, but significance.
  "Miami FL -- where Eddie lives. The network value must justify the cost."

## What This System Stores

Each spatial memory captures:
- **Place:** Where (city, building, room)
- **Significance:** Why this place matters
- **Associations:** What happened here, who is connected to this place
- **Currency:** Is the user still associated with this place?

## Entity Subset Guidance

Include spatial memory for:
- Personal assistants (Milo) -- knows where the user lives, works, frequents
- Location-aware products (Homer) -- real estate is inherently spatial
- Travel-adjacent entities -- trip planning, logistics

Exclude for:
- Code-focused entities -- location is irrelevant to code quality
- Trading entities (Dae) -- markets are not spatial
- Creative writing entities (Sam) -- fiction has its own spatial system
