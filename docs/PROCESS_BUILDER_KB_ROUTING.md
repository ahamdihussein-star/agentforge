# Process Builder Knowledge Base — Layout & Routing Rules (v3)

These rules define how workflows should look in the visual builder for business users.

## Layout Rules
- Top-to-bottom flow: Start near the top, end near the bottom.
- Enough spacing between nodes to avoid overlaps.
- Avoid line crossings.

## Connection Rules
- Connections must be orthogonal (horizontal/vertical).
- Connections should not pass through nodes.
- Decision nodes (`condition`) MUST have two visually separated paths (yes/no).
- Parallel nodes (`parallel`) connect to multiple next steps — all connected paths run simultaneously.

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
- Complex processes (10+ steps): May include parallel execution, sub-processes (call_process), multiple conditions.
- Always start with the simplest design that fulfills the user's goal. Add complexity only when needed.

## Advanced Flow Patterns

### Parallel Execution
When a workflow needs to do multiple things at the same time (e.g., send a notification AND create a document simultaneously):
1. Add a `parallel` node
2. Connect it to each path that should run simultaneously
3. Each path eventually connects back to a shared next node
4. The process continues only when all parallel paths complete (or any one, depending on strategy)

**Layout**: Place the parallel node centered, then each branch offset horizontally.

### Sub-Process Invocation
When a workflow needs to call another published process:
1. Add a `call_process` node
2. Select the target process from the dropdown
3. Map input data from the current process to the sub-process
4. The sub-process runs to completion, and its result is available as a variable

**Use case**: Reusable business processes (e.g., "Standard Approval Flow", "Document Review Process") that multiple workflows call.

## Node Type Quick Reference

| Node | Purpose | Connections |
|------|---------|------------|
| Start (`trigger`) | Begin the workflow | 1 outgoing |
| Decision (`condition`) | Yes/No branching | Exactly 2 outgoing: yes + no |
| Run in Parallel (`parallel`) | Simultaneous paths | Multiple outgoing (all run at once) |
| Call Process (`call_process`) | Invoke another process | 1 outgoing (continues after sub-process) |
| AI Step (`ai`) | Intelligent processing | 1 outgoing |
| Read Document (`read_document`) | Extract text from files | 1 outgoing |
| Create Document (`create_document`) | Generate a document | 1 outgoing |
| Send Message (`notification`) | Notify someone | 1 outgoing |
| Request Approval (`approval`) | Wait for approval | 1 outgoing |
| Collect Information (`form`) | Ask for form input | 1 outgoing |
| Calculate (`calculate`) | Compute a value | 1 outgoing |
| Connect to System (`tool`) | Call external API/tool | 1 outgoing |
| Finish (`end`) | End the workflow | None (terminal) |
