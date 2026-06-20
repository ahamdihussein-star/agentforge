# AgentForge — Functional Map & Test Plan

Built from a full code read (backend endpoints, frontend actions, core engines) on 2026-06-20.
Use this as (1) the shared understanding of what every part does, and (2) the checklist to test
every module/feature before the demo.

Legend for tests: ✅ pass · ❌ fail · ⏭️ skip. Fill the **Result** column as you test.

---

## 0. What the platform is (1 paragraph)

AgentForge is an enterprise **no-code AI agent builder**. Non-technical users build two kinds of
agents through a UI: **Conversational assistants** (chat + tools + knowledge) and **Process agents**
(visual workflows with approvals). Agents are configured (optionally AI-generated from a goal),
stored in PostgreSQL, and executed by two engines — the chat **AgentEngine** (LLM + tool loop) and
the **ProcessEngine** (node-by-node workflow with checkpoint/resume for approvals). Admin portal at
`/ui/`, end-user chat at `/chat`, workflow builder at `/process-builder`. Two API bases: `/api/...`
(admin/runtime, behind the auth gate) and `/process/...` (workflow engine, per-route auth).

---

## 1. Modules at a glance

| Module | What it does | Main surfaces |
|---|---|---|
| Auth & sessions | login, MFA, OAuth, password reset, registration | `/api/security/auth/*`, `/api/security/mfa/*` |
| Users & RBAC | users, roles, groups, permissions, policies | `/api/security/users|roles|groups|policies` |
| Organizations & Identity | org chart, departments, managers, directory (LDAP/HR) | `/api/identity/*`, `/api/security/settings` |
| Agents | create/list/edit/delete, AI-generate config, access control | `/api/agents/*`, `/api/access-control/*` |
| Chat & conversations | chat (stream), test-chat, conversation history | `/api/agents/{id}/chat*`, `/api/conversations/*` |
| Tools | create (KB/doc/web/db/API/email/webhook/slack/search), test, edit | `/api/tools/*` |
| Knowledge base | upload docs/urls/text/tables, ask/search KB | `/api/tools/{id}/documents|ask|search`, `/api/documents/*` |
| Process / workflow | build, validate, run, approvals, executions, templates | `/process/*` |
| Settings | LLM providers, embeddings, vector db, RAG, integrations, email, identity | `/api/settings/*` |
| Demo Lab | generate mock APIs / docs / images / demo kits | `/api/lab/*`, `/api/demo*` |
| Health & admin | health checks, (debug), workspace reset | `/api/health/*`, `/api/admin/*` |

---

## 2. Test checklist (by module)

> Test as a logged-in **super-admin** unless noted. For each, do the action in the UI and confirm the
> expected result. Where useful, also confirm the underlying endpoint returns 200 (or the right error).

### 2.1 Auth & sessions
| # | Test | Expected | Result |
|---|---|---|---|
| A1 | Log in with correct username + password | Lands on dashboard | |
| A2 | Log in with wrong password | Clear "invalid username or password" error | |
| A3 | Log in using **email** instead of username | Today rejected with "sign in using your username" — confirm/define desired behavior | |
| A4 | Refresh the page while logged in | Stays logged in (session restored via `/auth/me`) | |
| A5 | Forgot password → enter email | Reset email sent (check email config) | |
| A6 | Change own password (Profile) | Succeeds, can log in with new password | |
| A7 | Enable MFA → scan/verify code | MFA enabled; next login asks for code | |
| A8 | OAuth "Continue with Google/Microsoft" (if configured) | Redirects and logs in | |
| A9 | Log out | Returns to login; protected pages no longer load | |

### 2.2 Users, roles, groups (Security Center)
| # | Test | Expected | Result |
|---|---|---|---|
| U1 | Create a user | Appears in users list | |
| U2 | Invite a user (single + bulk) | Invitation created; shows in Invitations | |
| U3 | Edit a user, assign a role | Role saved; permissions change | |
| U4 | Delete a user | Removed from list | |
| U5 | Create/edit/delete a role with permission toggles | Saved; affects what that role can do | |
| U6 | Create/edit/delete a group; add members | Saved; group usable in access control | |
| U7 | Resend verification / send reset link to a user | Email sent | |
| U8 | View security stats | Counts render (users, active, roles, MFA) | |

### 2.3 Organization & identity
| # | Test | Expected | Result |
|---|---|---|---|
| O1 | Create department; assign manager/employee-id/department to a user | Org chart updates | |
| O2 | View org chart | Tree renders with hierarchy | |
| O3 | Set directory source (Internal / LDAP / HR API / Hybrid) | Saved; identity resolution uses it | |
| O4 | Define custom profile fields | Available in process builder + user profiles | |
| O5 | Edit job titles list | Saved; usable as picker options | |

### 2.4 Conversational agent — build
| # | Test | Expected | Result |
|---|---|---|---|
| C1 | Create agent → choose **Conversational** → **Generate with AI** with a goal | AI returns a full config (name, personality, tasks, tools, model) | |
| C2 | Create agent → **Manual** build | Can fill name, model, tasks, personality by hand | |
| C3 | Pick an LLM model | Saved on the agent | |
| C4 | Add tools to the agent (from existing tools) | Tools attach to the agent | |
| C5 | Set access control (owner / authenticated / specific users/groups) | Saved; controls who can use it | |
| C6 | Set guardrails (avoid topics, max length, escalation, PII) | Saved | |
| C7 | **Test chat** inside the wizard | Agent replies; tools fire if relevant | |
| C8 | **Save as draft** then reopen | Draft persists with all fields | |
| C9 | **Deploy / Publish** | Agent shows under Published; usable in chat | |

### 2.5 Conversational agent — run (end-user chat `/chat`)
| # | Test | Expected | Result |
|---|---|---|---|
| C10 | End user logs in, sees only agents they may access | `/api/agents/accessible` honors access control | |
| C11 | Send a message | Streaming reply renders | |
| C12 | Ask something that needs a tool (e.g. HR policy / API) | Agent calls the tool and answers with data/sources | |
| C13 | Upload a file in chat (if agent supports) | File accepted and used | |
| C14 | Start a new conversation / reopen old one | History loads correctly | |
| C15 | Delete a conversation | Removed | |

### 2.6 Tools
| # | Test | Expected | Result |
|---|---|---|---|
| T1 | Create a **Knowledge Base / Document** tool, upload a PDF | Document indexed; "Ask" answers from it | |
| T2 | Create a **REST API** tool (base url, method, auth), **Test** it | Returns a live response | |
| T3 | Import an **OpenAPI** spec | Endpoints parsed into the tool | |
| T4 | Create a **Website** tool, scrape pages | Pages stored and searchable | |
| T5 | Create a **Database** tool | Connects (or clear error) | |
| T6 | Create an **Email** tool, send a test | Email sent | |
| T7 | Create **Webhook / Slack / Web Search** tools | Saved and testable | |
| T8 | Edit a tool | Changes saved, re-processed | |
| T9 | Set a tool's access level + granular edit/delete users | Enforced | |
| T10 | Delete a tool / Delete All / Cleanup duplicates | Removes as expected | |

### 2.7 Knowledge base operations
| # | Test | Expected | Result |
|---|---|---|---|
| K1 | Add document, URL, free text, and a table to a KB | All sources stored | |
| K2 | **Ask** the KB a question | AI answer grounded in the sources, with citations | |
| K3 | Raw keyword **search** the KB | Returns matching chunks | |
| K4 | Download / delete a document | Works | |
| K5 | **Reindex** after changing the embedding provider | Re-embeds without errors | |

### 2.8 Process agent — build
| # | Test | Expected | Result |
|---|---|---|---|
| P1 | Create agent → **Process** → enter a goal → **AI analyze goal** | Returns ordered tasks | |
| P2 | **Generate workflow** | Opens the visual builder with a graph | |
| P3 | Add/edit/connect nodes (AI step, approval, form, decision, notification, tool, parallel, call-process) | Editable on canvas | |
| P4 | Configure an **Approval** node with assignees (user / role / group / manager / management chain) | Saved; resolves correctly | |
| P5 | Configure a **Decision/Condition** node | Branch logic saved | |
| P6 | **Validate (preflight)** | Catches obvious problems | |
| P7 | **Save / Save as template / Publish** | Persists; published shows in hub | |

### 2.9 Process agent — run + approvals
| # | Test | Expected | Result |
|---|---|---|---|
| P8 | Run the workflow with input data (test run) | Executes node by node, shows trace | |
| P9 | Hit an approval node | Execution **pauses**; an approval request is created | |
| P10 | Approver sees it in **Approvals**, approves | Execution **resumes** and finishes | |
| P11 | Reject an approval | Execution stops/branches as designed | |
| P12 | **Condition routing** actually branches on the data (e.g. amount/duration > X) | Correct branch taken (see risk R3) | |
| P13 | Variables like `{{email}}` / recipients resolve from profile | Notifications reach the right people (see risk R4) | |
| P14 | View executions list + step-by-step **playback** | Trace and step I/O render | |
| P15 | Cancel / resume an execution | Works | |

### 2.10 Settings
| # | Test | Expected | Result |
|---|---|---|---|
| S1 | Add an **LLM provider** + key, **Test connection** | Success per model | |
| S2 | Set the **default model** | Used by new agents | |
| S3 | Configure **embeddings** + Test | Success | |
| S4 | Configure **vector DB** (memory/Chroma/Pinecone) | Saved | |
| S5 | Set **RAG settings** (chunk size, top-k) | Saved | |
| S6 | Toggle features (RAG / web scraping / API tools) | Honored | |
| S7 | Configure **email** (SMTP/SendGrid/Resend) + Test send | Email arrives | |
| S8 | Configure **integrations** (Google/Microsoft) | Saved | |
| S9 | Confirm keys are **masked** when reloading settings | Shows `***` not the key | |

### 2.11 Demo Lab
| # | Test | Expected | Result |
|---|---|---|---|
| D1 | Generate a **mock API** from a description | Testable endpoint created | |
| D2 | Generate a **document** / **image** | File generated and downloadable | |
| D3 | Create a **tool from a mock API** | Becomes a usable tool | |
| D4 | Generate a full **demo kit** (APIs + KBs + assets) | Kit created with items | |

### 2.12 Health & admin
| # | Test | Expected | Result |
|---|---|---|---|
| H1 | `GET /health` and `/api/health/` | Healthy | |
| H2 | `GET /api/debug/agents-ownership` without token | 404 (blocked in enforce) | |
| H3 | Workspace reset page `/admin/maintenance` (super-admin) | Wipes test data (remove before customer demo) | |

---

## 3. Risks to watch while testing (found in the code)

- **R1 — `/process/*` is NOT behind the auth gate.** It relies only on each route's own `require_auth`.
  Two routes have **no auth at all**: `POST /process/webhook/{agent_id}` (external trigger — needs a
  per-agent key) and `GET /process/config/node-types`. Test that protected process routes still 401 without a token.
- **R2 — Many `/api/*` routes have no per-route ownership/admin checks** (tools, settings, demo, some
  agent sub-routes). With the gate in `enforce` they require *a* login, but **any** logged-in user can
  call them — there's no owner/admin enforcement at the route layer. Test cross-user access (a normal
  user trying admin/owner actions) and note what leaks.
- **R3 — Process condition fields may not be computed** (e.g. `leaveduration` from start/end dates),
  so approval branches can be silently skipped → everything "auto-approves". Verify P12 carefully.
- **R4 — `{{email}}` / recipients may not auto-resolve** from the profile → a process can die before
  step 1 or notify nobody. Verify P13.
- **R5 — `/demo-api*` routes are fully public** (including `DELETE /demo-api/_cache`). Confirm and restrict.
- **R6 — No token-refresh endpoint** → sessions end abruptly on expiry (forces re-login). Note for UX.
- **R7 — Dual storage** (in-memory + DB) causes data to reappear/drift (the cleanup needed the
  in-process endpoint to clear both). Re-test that deletes "stick" after the Phase-2 storage fix.

---

## 4. How to run the tests fast

- **UI path:** log in as super-admin and walk each section top to bottom, ticking the table above.
- **API spot-checks:** for anything ambiguous, hit the endpoint directly (Cascade can run `curl`)
  with and without a token to confirm auth behavior.
- Capture each failure with: what you did, what you expected, what happened — and we triage into
  "demo-blocking" vs the Phase-2 backlog (`docs/POST_DEMO_BACKLOG.md`).
