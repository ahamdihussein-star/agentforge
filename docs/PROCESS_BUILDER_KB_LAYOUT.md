# Process Builder Knowledge Base — Visual Layout Rules (v5)

> **Note:** Layout rules have been consolidated into `PROCESS_BUILDER_KB_ROUTING.md`.
> This file is kept for reference. All layout and routing rules are in one place.

## Quick Reference

### Node Positioning
1. Start node: center top (x=400, y=100)
2. Sequential nodes: same x, increase y by ~260
3. Condition branches: offset x by ±520 ("yes" = LEFT, "no" = RIGHT)
4. ALL sub-steps on a branch inherit that branch's x (stay on their side)
5. Parallel branches: offset each by ±520 horizontally
6. Reconvergence: back to condition's center x, below all branches
7. End node: center x, LAST in array, below everything (at least 260px gap)

### Spacing
- Vertical gap: at least 260px between sequential nodes
- Horizontal gap: at least 520px between branches

### Key Rules
- Connection lines NEVER pass through any node
- Connection lines take the SHORTEST path
- Sibling branches must NEVER share the same x position
- Linear flows: single vertical column
- Exactly ONE end node, LAST in array, ALL paths converge to it
- Nothing comes after the end node
