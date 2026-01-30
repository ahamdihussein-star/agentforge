# Enterprise Best Practices – AgentForge

This document captures enterprise-grade practices for scalability, security, API design, and operations. All new changes and refactors should align with these guidelines.

**References:** Microsoft Azure Architecture, AWS Prescriptive Guidance, RFC 9457 (Problem Details for HTTP APIs), OWASP, structured logging best practices.

---

## 1. API Design & Error Handling

### 1.1 Structured Error Responses (RFC 9457)

- Use **RFC 9457 Problem Details** for HTTP API errors so clients get a consistent, machine-readable format.
- Standard fields: `type` (URI), `status` (HTTP code), `title` (short summary), `detail` (human-readable), `instance` (optional, request URI).
- Use extension members for domain-specific data (e.g. `code`, `action`) when needed.
- **Do not** return raw exception messages or stack traces to clients; log those server-side only.

### 1.2 HTTP Status Codes

- **2xx:** Success (200, 201, 204).
- **4xx:** Client errors – 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 422 Unprocessable Entity.
- **5xx:** Server errors – 500 Internal Server Error, 503 Service Unavailable.
- Use the same status code in both the HTTP response and the Problem Details `status` field.

### 1.3 Global Exception Handling

- Prefer a **centralized exception handler** so all endpoints return the same error shape.
- Sanitize technical messages before sending to clients; keep full details in server logs.

---

## 2. Logging & Observability

### 2.1 Structured Logging

- Prefer **JSON-structured logs** (or a single canonical log line per request) for parsing and alerting.
- Use consistent field names (e.g. `request_id`, `user_id`, `duration_ms`, `error_code`).

### 2.2 No PII or Secrets in Logs

- **Do not log:** passwords, tokens, API keys, full session IDs, payment data, or other secrets.
- **Minimize PII:** avoid logging full emails, names, or government IDs unless required for audit and then only in secured, access-controlled audit logs.
- Use correlation IDs (e.g. request ID, execution ID) instead of user identifiers where possible for debugging.

### 2.3 Log Levels

- **Production:** Error and Warnings; avoid verbose Debug/Info for high-volume paths.
- **Development:** Debug/Info allowed for troubleshooting.
- Log only **actionable** data; avoid logging every successful 200 if it creates noise.

---

## 3. Security

### 3.1 Authentication & Tokens

- Prefer **httpOnly, secure cookies** for session/token storage where the app is browser-based and same-origin.
- If using localStorage/sessionStorage for tokens, document the risk and consider short-lived tokens and refresh flow.
- Never expose API keys or secrets in frontend code or in logs.

### 3.2 Input Validation & Sanitization

- **Validate and sanitize all inputs** on the server; never trust client data.
- Use allowlists and type checks; reject invalid payloads with 400/422 and Problem Details.
- Guard against XSS when rendering user-provided content (escape/sanitize on output).

### 3.3 Authorization

- Check permissions **per request**; do not rely only on UI hiding actions.
- Prefer a single place (e.g. service layer or middleware) for authorization logic so it is consistent and auditable.

---

## 4. Scalability & Architecture

### 4.1 Stateless Services

- Design for **horizontal scaling**: avoid in-memory session state that ties a user to a single instance.
- Prefer external stores (DB, cache) for session/state when multiple instances run.

### 4.2 Configuration

- Keep **environment-specific config** (URLs, feature flags, limits) in config/env, not hardcoded.
- Use sensible defaults and document required variables.

### 4.3 Data & Storage

- Prefer **database-agnostic** types and queries where possible (see project `.cursorrules` and `database/COMMON_ISSUES.md`).
- Use migrations for schema changes; avoid manual one-off scripts in production.

---

## 5. Process / Workflow Module

- **Process definition normalization:** Keep Visual Builder → engine mapping in one place (e.g. service layer); validate and sanitize before execution.
- **Errors:** Return RFC 9457-style problem details from process APIs; do not attach raw Python exceptions to client responses.
- **Logging:** Log execution IDs and error codes; avoid logging full trigger input or PII in plain text.

---

## 6. Checklist for New Changes

- [ ] API errors return a consistent structure (e.g. RFC 9457) and do not leak stack traces or internal messages.
- [ ] Logs do not contain secrets or unnecessary PII; use correlation IDs where possible.
- [ ] Inputs are validated and sanitized on the server.
- [ ] New configuration is externalized (env/config), not hardcoded.
- [ ] Database and storage follow project rules (see `.cursorrules` and `database/COMMON_ISSUES.md`).
