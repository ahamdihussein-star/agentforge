#!/usr/bin/env python3
"""
AgentForge end-to-end smoke test — runs against the LIVE API (no dependencies).

It logs in, exercises the core flow (AI generate-config, create a conversational
agent, publish it, chat with it and confirm a real reply), then deletes the test
agent. Prints PASS/FAIL per step and a summary.

USAGE (run where the production URL is reachable, e.g. via Cascade):
    AF_USER=admin_user AF_PASS='YOUR_PASSWORD' python3 scripts/smoke_test.py

Optional:
    AF_BASE   (default https://agentforge2.up.railway.app)
    AF_MODEL  (default gpt-4o) - must be a configured provider model

Credentials are read from env only; they are never printed.
"""
import os
import sys
import json
import urllib.request
import urllib.error

BASE = os.environ.get("AF_BASE", "https://agentforge2.up.railway.app").rstrip("/")
USER = os.environ.get("AF_USER")
PASS = os.environ.get("AF_PASS")
MODEL = os.environ.get("AF_MODEL", "gpt-4o")

results = []


def record(name, ok, detail=""):
    results.append((name, ok, detail))
    mark = "PASS" if ok else "FAIL"
    print(f"[{mark}] {name}" + (f"  ->  {detail}" if detail else ""))


def req(method, path, token=None, body=None, timeout=90):
    url = BASE + path
    data = json.dumps(body).encode() if body is not None else None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = "Bearer " + token
    r = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", "replace")
        try:
            return e.code, json.loads(raw)
        except Exception:
            return e.code, raw
    except Exception as e:
        return 0, str(e)
    try:
        return 200, json.loads(raw)
    except Exception:
        return 200, raw


def summary_and_exit():
    print("\n" + "=" * 52)
    passed = sum(1 for _, ok, _ in results if ok)
    print(f"RESULT: {passed}/{len(results)} steps passed")
    for name, ok, detail in results:
        if not ok:
            print(f"   FAILED: {name} -> {detail}")
    print("=" * 52)
    sys.exit(0 if passed == len(results) else 1)


def main():
    if not USER or not PASS:
        print("ERROR: set AF_USER and AF_PASS environment variables.")
        sys.exit(2)
    print(f"Target: {BASE}\n")

    # 1) health
    st, _ = req("GET", "/api/health/")
    record("health check", st == 200, f"status {st}")

    # 2) login
    st, j = req("POST", "/api/security/auth/login", body={"username": USER, "password": PASS})
    if st != 200 or not isinstance(j, dict) or not j.get("access_token"):
        record("login", False, f"status {st}: {str(j)[:200]}")
        summary_and_exit()
    if j.get("requires_mfa"):
        record("login", False, "MFA required - cannot run headless")
        summary_and_exit()
    token = j["access_token"]
    record("login", True, f"user {USER}")

    # 3) baseline list
    st, j = req("GET", "/api/agents", token)
    n = "?"
    if isinstance(j, dict):
        n = len(j.get("agents", []))
    elif isinstance(j, list):
        n = len(j)
    record("list agents", st == 200, f"status {st}, count {n}")

    # 4) AI generate-config (the AI builder)
    st, j = req("POST", "/api/agents/generate-config", token,
                {"goal": "An HR assistant that answers employee questions about leave and policies."})
    record("AI generate-config", st == 200, f"status {st}" + ("" if st == 200 else f": {str(j)[:160]}"))

    # 5) create a conversational agent
    body = {
        "name": "SMOKE TEST Agent",
        "goal": "Answer simple questions for testing.",
        "agent_type": "conversational",
        "model_id": MODEL,
        "tasks": [],
        "tool_ids": [],
        "status": "draft",
    }
    st, j = req("POST", "/api/agents", token, body)
    agent_id = None
    if isinstance(j, dict):
        agent_id = j.get("id") or (j.get("agent") or {}).get("id")
    if st not in (200, 201) or not agent_id:
        record("create agent", False, f"status {st}: {str(j)[:200]}")
        summary_and_exit()
    record("create agent", True, f"id {agent_id}")

    # 6) publish
    st, _ = req("PUT", f"/api/agents/{agent_id}", token, {"status": "published"})
    record("publish agent", st == 200, f"status {st}")

    # 7) chat with it (real LLM call)
    st, j = req("POST", f"/api/agents/{agent_id}/chat", token,
                {"message": "Reply with exactly the word READY."}, timeout=120)
    reply = ""
    if isinstance(j, dict):
        reply = j.get("response") or j.get("message") or j.get("reply") or j.get("content") or ""
    ok_chat = st == 200 and bool(str(reply).strip())
    record("chat reply", ok_chat,
           (f"status {st}, reply={str(reply)[:80]!r}") if st == 200 else f"status {st}: {str(j)[:160]}")

    # 8) cleanup
    st, _ = req("DELETE", f"/api/agents/{agent_id}", token)
    record("delete agent (cleanup)", st in (200, 204), f"status {st}")

    summary_and_exit()


if __name__ == "__main__":
    main()
