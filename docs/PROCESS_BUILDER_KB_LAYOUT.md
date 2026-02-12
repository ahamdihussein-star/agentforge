# Process Builder Knowledge Base — Visual Layout Rules

These rules govern how the AI MUST position and connect nodes when generating a process diagram.
The visual builder renders nodes as shapes on a canvas with connection lines between them.
Following these rules ensures the generated process is clean, readable, and professional.

## Rule 1: Connection Lines Must NOT Pass Through Any Node

- Every connection line (edge) between two nodes must route AROUND other nodes, never through them.
- When generating node positions (x, y), ensure there is enough vertical and horizontal space so that edges connecting non-adjacent nodes do not visually overlap with intermediate nodes.
- Practical approach: place nodes in a single vertical column when the flow is linear. Only use horizontal spreading (side-by-side) for condition branches (yes/no paths).

## Rule 2: Connection Lines Must Take the Shortest Path

- A connection line must NOT loop around itself or take an unnecessarily long route to reach its target node.
- The line should go from the source node's nearest output port to the target node's nearest input port via the most direct path.
- Practical approach: keep connected nodes close to each other in the node array order, and avoid placing a target node far from its source when they are directly connected.

## Rule 3: Adequate Spacing Between Nodes

- Nodes must NOT be placed too close together. There must be enough visual space between them for the diagram to be clear and readable.
- Minimum recommended spacing:
  - Vertical gap between sequential nodes: at least 180-200 pixels
  - Horizontal gap between branching nodes (e.g., yes/no paths): at least 280-300 pixels
- This ensures labels, connection lines, and node shapes do not overlap or crowd each other.

## Rule 4: End Node Positioning

- The "end" node must ALWAYS be the last node visually:
  - In vertical layout (top-to-bottom flow): the end node must be at the BOTTOM of the diagram, clearly below all other nodes.
  - In horizontal layout (left-to-right flow): the end node must be at the FAR RIGHT of the diagram.
- The end node must NEVER be placed next to or beside the node immediately before it. It should be clearly separated with proper spacing to indicate the process conclusion.
- If there are multiple paths (e.g., from a condition), the end node should be positioned below/after ALL paths converge, or below the longest path.

## Rule 5: Linear Flow Preference

- When the process has no branching (no conditions), place ALL nodes in a single vertical column (same x coordinate, increasing y).
- This creates a clean, top-to-bottom flow that is easy to follow.
- Only spread nodes horizontally when a condition creates two parallel paths (yes/no branches).

## Rule 6: Condition Branch Layout

- When a condition node branches into yes/no paths:
  - The "yes" path nodes go to the LEFT.
  - The "no" path nodes go to the RIGHT.
  - Both paths should eventually reconverge to a shared node (notification, end, etc.) placed below both branches on the center axis.
- Both branches should have roughly equal vertical depth before reconverging.

## Summary for AI Generation

When generating the nodes array with x/y positions:
1. Start node: center top (e.g., x=400, y=100)
2. Sequential nodes: same x, increase y by ~200 each
3. Condition branches: offset x by ±300, same y level for parallel nodes
4. Reconvergence node: back to center x, y below both branches
5. End node: center x, y well below everything else (at least 200px gap from the last node)
6. ALWAYS ensure the "end" node is the LAST entry in the nodes array
