# Process Approval & Identity: How the Business Uses It

## Who is "the user" when a process runs?

| Trigger source | Who is the user? | How manager/approver is determined |
|----------------|------------------|-------------------------------------|
| **Manual run (UI)** | Logged-in user. Backend sets `context.user_id` from the session. | Use **static** assignees in the workflow (role "Manager", or specific user IDs), **or** pass `manager_id` in the form and use **dynamic** assignee (see below). |
| **Portal / HR app** | The portal knows the logged-in employee. When starting the process, the portal (or your backend) can call your HR system to get that employee's manager, then call `POST /process/execute` with `trigger_input: { requested_by: "<user_id>", manager_id: "<manager_user_id>" }`. | Approval node uses **dynamic assignee**: `assignee_ids: ["{{ trigger_input.manager_id }}"]` so the request goes to that manager. |
| **Webhook (e.g. from HR system)** | No "logged in" user. The HR system sends a payload, e.g. `POST /process/webhook/{agent_id}` with `{ "employee_id": "...", "manager_id": "...", "request_type": "leave" }`. | Same: use `assignee_ids: ["{{ trigger_input.manager_id }}"]` so the approval goes to the manager from the payload. |

So: **the process knows the user (and manager) from (1) who started it (UI/portal) or (2) what was passed in `trigger_input` (portal/webhook).**

---

## How does the process "know" who the manager is?

Two main options:

### 1. Pass manager in when starting the process (recommended for HR/portal)

- **Portal / HR app**: Before calling `POST /process/execute`, your backend or frontend calls your HR system (or directory) to get "manager for employee X", then includes it in the request:
  - `trigger_input: { ...formData, requested_by: current_user_id, manager_id: manager_user_id }`
- **Webhook**: The external HR system already knows the manager; it sends it in the webhook body:
  - `POST /process/webhook/{agent_id}` with body `{ "employee_id": "...", "manager_id": "...", ... }`

In the workflow, the **Approval** node uses **dynamic assignees**:
- In the node config set `assignee_type: "user"` and `assignee_ids: ["{{ trigger_input.manager_id }}"]`.
- At runtime the engine evaluates `trigger_input.manager_id` and creates the approval for that user.

So the process "knows" the manager because **whoever started the process (portal or HR system) put the manager in `trigger_input`**.

### 2. Look up manager inside the process (first step calls HR)

- Add an **Integration / API** node as the first step that calls your HR API: e.g. "get manager for employee `{{ context.user_id }}`" or "`{{ trigger_input.employee_id }}`".
- Store the result in state, e.g. `manager_id`.
- In the Approval node use `assignee_ids: ["{{ state.manager_id }}"]` (or the path where you stored the manager).

Then the process "finds" the manager itself in the flow; the trigger only needs to identify the employee (and optionally other data).

---

## Exposing the process through a portal

Typical flow:

1. **Employee** logs in to your portal (your app, not necessarily AgentForge UI).
2. Portal shows "Request Leave" (or similar); the employee fills a form.
3. Portal backend:
   - Gets current user (employee) from session.
   - Calls your HR/directory API to get **manager for this employee**.
   - Calls AgentForge: `POST /process/execute` (or `POST /process/webhook/{agent_id}`) with:
     - `trigger_input: { requested_by: employee_id, manager_id: manager_id, leave_days: 5, ... }`
     - Auth: use a service token or a user token for the employee.
4. Process runs; when it hits the Approval node it uses `{{ trigger_input.manager_id }}` → approval is created for that manager.
5. **Manager** logs in to AgentForge (or a portal that calls `GET /process/approvals` and `POST /process/approvals/{id}/decide`) and sees the pending approval, then approves or rejects.

So: **the business uses the agent by (1) starting the process from their portal with the right context (user + manager), and (2) letting managers act on approvals in AgentForge (or in their portal via API).**

---

## Summary

- **Who is the user?**  
  - UI: logged-in user.  
  - Portal/Webhook: whoever you put in `trigger_input` (e.g. `requested_by`, `employee_id`) and/or `context.user_id` when you start the run.

- **How does the process get the manager?**  
  - Either you pass `manager_id` (or similar) in `trigger_input` when starting, and use **dynamic assignee** `["{{ trigger_input.manager_id }}"]`,  
  - Or the first step in the process calls HR, writes the manager into state, and the Approval node uses `["{{ state.manager_id }}"]`.

- **How does the business use the agent?**  
  - By starting the process from their system (portal/HR) with the right identity and manager, and by letting approvers (e.g. managers) use AgentForge or their portal to list and decide on approvals.
