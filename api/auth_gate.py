"""
AgentForge - API auth gate middleware.

A single coarse-grained gate that guarantees every /api/* request carries a
valid bearer token, EXCEPT an explicit allowlist of genuinely public endpoints
(login, registration, health, and the reserved /api/public/* channel namespace
used by per-agent API keys).

Why this exists:
- The app has ~120 routes but only a handful declared an auth dependency, so the
  vast majority of /api/* was reachable with no token at all. This gate closes
  that hole in one place instead of editing every route.

Design principles:
- Fine-grained per-user / per-permission checks STAY in each route's Depends().
  This gate only closes the "no token at all" hole across the whole surface.
- Fail-CLOSED: if the token layer can't be imported, protected /api/* is denied
  (in enforce mode) instead of silently running wide open.
- Safe rollout via env AUTH_GATE_MODE:
    monitor (default) -> would-be blocks are LOGGED but allowed through, so you
                         can deploy and watch the logs to see exactly what would
                         break before turning enforcement on.
    enforce           -> unauthenticated protected /api/* gets 401; blocked debug
                         endpoints get 404.
- /api/debug/* is treated as a production liability and blocked unless
  ENABLE_DEBUG_ENDPOINTS=true.

Non-/api routes (the SPA, /chat, static assets, /docs) are never touched.
"""

import os
import logging

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

logger = logging.getLogger("agentforge.auth_gate")

try:
    from core.security.services import TokenService
    _TOKEN_LAYER_OK = True
except Exception as _e:  # pragma: no cover - defensive
    TokenService = None
    _TOKEN_LAYER_OK = False
    logger.error("auth_gate: TokenService unavailable (%s) - protected /api/* will fail closed", _e)


# Exact public /api paths that must work without a token (the login funnel).
PUBLIC_API_PATHS = {
    "/api/security/auth/login",
    "/api/security/auth/register",
    "/api/security/auth/refresh",
    "/api/security/auth/logout",
    "/api/security/auth/forgot-password",
    "/api/security/auth/reset-password",
    "/api/security/auth/accept-invitation",
    "/api/security/auth/verify-email",
    "/api/security/auth/resend-verification",
    "/api/security/auth/password-policy",
    "/api/security/auth/first-login-password-change",
    "/api/security/mfa/send-login-code",
    "/api/security/mfa/verify",
}

# Public /api prefixes.
PUBLIC_API_PREFIXES = (
    "/api/health",         # health checks (probes / uptime)
    "/api/public/",        # reserved for per-agent API-key channels (Phase 3)
    "/api/tool-outputs/",  # generated documents — served as unguessable capability URLs (32-char token in filename)
)


def _is_public(path: str) -> bool:
    if path in PUBLIC_API_PATHS:
        return True
    for prefix in PUBLIC_API_PREFIXES:
        if path == prefix.rstrip("/") or path.startswith(prefix):
            return True
    return False


def _has_valid_token(request: Request) -> bool:
    if not _TOKEN_LAYER_OK or TokenService is None:
        return False
    auth = request.headers.get("authorization")
    if not auth or not auth.lower().startswith("bearer "):
        return False
    token = auth.split(" ", 1)[1].strip()
    if not token:
        return False
    try:
        return TokenService.verify_token(token) is not None
    except Exception:
        return False


class AuthGateMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        self.mode = (os.environ.get("AUTH_GATE_MODE", "monitor") or "monitor").strip().lower()
        self.debug_enabled = (os.environ.get("ENABLE_DEBUG_ENDPOINTS", "false") or "false").strip().lower() == "true"
        logger.warning(
            "auth_gate active: mode=%s debug_endpoints=%s token_layer_ok=%s",
            self.mode, self.debug_enabled, _TOKEN_LAYER_OK,
        )

    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        method = request.method.upper()

        # Only guard the API surface. SPA, /chat, static assets, /docs pass through.
        if not path.startswith("/api/"):
            return await call_next(request)

        # Always allow CORS preflight.
        if method == "OPTIONS":
            return await call_next(request)

        # Debug endpoints are a production liability - hide them unless explicitly enabled.
        if path.startswith("/api/debug/") and not self.debug_enabled:
            if self.mode == "enforce":
                return JSONResponse({"detail": "Not found"}, status_code=404)
            logger.warning("auth_gate[monitor]: would BLOCK debug endpoint %s %s", method, path)
            return await call_next(request)

        # Public login/health/channel endpoints.
        if _is_public(path):
            return await call_next(request)

        # Everything else under /api/* requires a valid bearer token.
        if _has_valid_token(request):
            return await call_next(request)

        if self.mode == "enforce":
            return JSONResponse({"detail": "Not authenticated"}, status_code=401)

        logger.warning("auth_gate[monitor]: would BLOCK %s %s (no valid bearer token)", method, path)
        return await call_next(request)
