# Process Builder Knowledge Base — Layout & Routing Rules (v2)

These rules define how workflows should look in the visual builder for business users.

## Layout Rules
- Top-to-bottom flow: Start near the top, end near the bottom.
- Enough spacing between nodes to avoid overlaps.
- Avoid line crossings.

## Connection Rules
- Connections must be orthogonal (horizontal/vertical).
- Connections should not pass through nodes.
- Decision nodes (`condition`) MUST have two visually separated paths (yes/no).

## Process Design Best Practices
- Prefer fewer nodes with clear, descriptive names over many small technical nodes.
- Group related steps vertically.
- For branching, offset the branches horizontally for visual clarity.
- Every process needs exactly ONE trigger (start) and at least ONE end node.
- Give every node a business-friendly name that describes WHAT it does, not HOW.

## Platform Auto-Layout
The platform applies auto-layout after generation. If positions are imperfect, the platform adjusts them.
Focus on correct flow logic rather than pixel-perfect positioning.

## Process Complexity Guidelines
- Simple processes (1-5 steps): Linear flow — trigger → steps → end.
- Medium processes (5-10 steps): May include conditions and approvals.
- Complex processes (10+ steps): May include loops, parallel approvals, multiple conditions.
- Always start with the simplest design that fulfills the user's goal. Add complexity only when needed.
