# Process Builder Knowledge Base — Layout & Routing Rules (v1)
These rules define how workflows should look in the visual builder.
They are required for a clean, readable layout for business users.

## Core layout rules
- Keep a clear top-to-bottom flow: start near the top, end near the bottom.
- Leave enough spacing between shapes to avoid overlaps.
- Avoid line crossings when possible.

## Connection routing rules (critical)
- Connections must be **orthogonal** (horizontal/vertical) and should not pass through any shape.
- Connections should not overlap each other when avoidable.
- Decision nodes (`condition`) must have two outgoing paths:
  - `Yes` path and `No` path should be visually separated (left/right) for clarity.

## Platform behavior
- The platform will apply auto-layout and auto-routing after generation.
- If the generated positions are imperfect, the platform will adjust them to satisfy the above rules.

## Implications for generation
- Prefer fewer nodes with clear names over many small technical nodes.
- Group related steps vertically.
- For branching, offset the branches horizontally.

