# Process Builder Knowledge Base — Layout, Routing & Flow Patterns (v5)

These rules define how workflows should look and flow in the visual builder.

## Visual Layout Rules

### Node Positioning
- **Start node**: Center top (e.g., x=400, y=100).
- **Sequential nodes**: Same x, increase y by ~200 each.
- **Condition branches**: Offset x by ±300. "yes" path goes LEFT, "no" path goes RIGHT.
- **Parallel branches**: Offset each branch by ±300 horizontally, same y level.
- **Reconvergence node**: Back to center x, y below all branches.
- **End node**: Center x, y well below everything else (at least 200px gap from last node). MUST be the LAST entry in the nodes array.

### Spacing
- Minimum vertical gap between sequential nodes: 180-200px.
- Minimum horizontal gap between branches: 280-300px.
- Enough space for labels, connection lines, and node shapes to be clearly readable.

### Connection Rules
- Connection lines must NEVER pass through any node.
- Connection lines must take the SHORTEST path between nodes.
- Place nodes in a single vertical column when the flow is linear.
- Only spread horizontally for condition or parallel branches.

### Auto-Layout
The platform applies auto-layout after generation. Focus on correct flow logic rather than pixel-perfect positioning.

## Flow Patterns

### Linear Flow (Simple — 1-5 steps)
```
trigger → form → ai/tool → notification → end
```
All nodes in a single vertical column (same x, increasing y by ~200).

### Condition Branching (Medium — 5-10 steps)
```
trigger → form → condition
                  ├── yes (LEFT, x-300) → path A → ──┐
                  └── no  (RIGHT, x+300) → path B → ──┤
                                                       └── shared node → end
```
Both branches reconverge to a shared node at center x below both branches.
Both branches should have roughly equal vertical depth before reconverging.

### Multi-Condition Cascade
For multiple thresholds (e.g., amount < 500, 500-5000, > 5000):
```
trigger → form → condition1 (< 500?)
                  ├── yes → auto-approve path → ──────────┐
                  └── no → condition2 (< 5000?)            │
                            ├── yes → manager approval → ──┤
                            └── no → VP approval → ────────┤
                                                           └── end
```

### Parallel Execution
```
trigger → form → parallel
                  ├── branch1 (x-300): notification to team A
                  ├── branch2 (center): create document
                  └── branch3 (x+300): tool call
                            ↓ (all complete)
                         merge → end
```

### Sequential Multi-Level Approval
```
trigger → form → approval1 (direct manager)
              → approval2 (department head)
              → approval3 (VP/C-level)
              → notification → end
```

### Auto-Approve Pattern (Condition-Based)
```
trigger → form → ai (parse data) → condition (amount < threshold?)
                                     ├── yes → notification (auto-approved) → end
                                     └── no → approval (manager) → notification → end
```

### Sub-Process Invocation
```
trigger → form → call_process (reusable sub-workflow)
              → use subResult in downstream steps → end
```

### Data Pipeline (Scheduled)
```
trigger (scheduled) → tool (fetch data) → ai (analyze/transform) → notification (report) → end
```

### Document Processing
```
trigger → form (upload files) → ai extract_file (parse) → condition (route by content) → approval → ai create_doc (generate report) → notification → end
```

### Multi-File Calculation
```
trigger → form (upload multiple files) → ai batch_files (analyze across all) → condition (threshold?) → approval/notification → end
```

## Process Complexity Guidelines

| Complexity | Steps | Includes |
|------------|-------|----------|
| Simple | 1-5 | Linear: trigger → form → action → end |
| Medium | 5-10 | Conditions, approvals, AI steps |
| Complex | 10+ | Parallel, sub-processes, multi-condition, multi-approval |

ALWAYS start with the simplest design that fulfills the user's goal. Add complexity only when needed.

## Business Logic Rules

### Notification Timing
- Notifications about pending tasks: BEFORE or AT THE SAME TIME as the task.
- Notifications about outcomes: AFTER the action completes.
- Approval nodes auto-notify the assignee — separate notification only needed for OTHER people.

### Smart Field Design
- Use business knowledge to determine fields, even if the user didn't list them.
- ALWAYS prefill profile data (name, email, department, etc.) with `readOnly: true`.
- ALWAYS populate dropdown options using domain expertise.
- NEVER add fields for data the AI will extract automatically.
- NEVER add fields for data available from user profile.

### Data Flow
- Store AI/tool outputs in named variables (`output_variable`).
- Reference variables in downstream steps: `{{parsedData.fieldName}}`.
- Conditions can check any upstream variable or form field.
- Notifications should reference specific scalar fields, never raw objects/arrays.

## End Node — ABSOLUTE RULE

- Exactly ONE end node per process.
- MUST be the LAST entry in the nodes array.
- ALL paths must eventually connect to this single end node.
- NOTHING comes after the end node.
- Positioned BELOW every other node.

**WRONG:**
```
Condition → Yes → Notification → End
         → No → Approval → Notification (AFTER End — broken!)
```

**CORRECT:**
```
Condition → Yes → Auto-Approval Notification ──→ End (single, at bottom)
         → No → Manager Approval → Notification ──→ End (same End node)
```

## Node Type Quick Reference

| Node | Purpose | Outgoing |
|------|---------|----------|
| Start (`trigger`) | Begin the workflow | 1 |
| Collect Information (`form`) | Ask for input | 1 |
| Decision (`condition`) | Yes/No branching | 2 (yes + no) |
| Run in Parallel (`parallel`) | Simultaneous paths | Multiple |
| Call Process (`call_process`) | Invoke sub-process | 1 |
| AI Step (`ai`) | Intelligent processing | 1 |
| Send Message (`notification`) | Notify someone | 1 |
| Request Approval (`approval`) | Wait for approval | 1 |
| Calculate (`calculate`) | Compute a value | 1 |
| Connect to System (`tool`) | Call external API | 1 |
| Finish (`end`) | End the workflow | None |
