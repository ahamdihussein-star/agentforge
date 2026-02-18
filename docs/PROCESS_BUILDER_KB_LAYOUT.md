# Process Builder Knowledge Base — Visual Layout Rules (v5)

> **Note:** Layout rules have been consolidated into `PROCESS_BUILDER_KB_ROUTING.md`.
> This file is kept for reference. All layout and routing rules are in one place.

## Quick Reference

### Node Positioning
1. Start node: center top (x=400, y=100)
2. Sequential nodes: same x, increase y by ~200
3. Condition branches: offset x by ±300 ("yes" = LEFT, "no" = RIGHT)
4. Parallel branches: offset each by ±300 horizontally
5. Reconvergence: back to center x, below all branches
6. End node: center x, LAST in array, below everything (at least 200px gap)

### Spacing
- Vertical gap: at least 180-200px between sequential nodes
- Horizontal gap: at least 280-300px between branches

### Key Rules
- Connection lines NEVER pass through any node
- Connection lines take the SHORTEST path
- Linear flows: single vertical column
- Exactly ONE end node, LAST in array, ALL paths converge to it
- Nothing comes after the end node
