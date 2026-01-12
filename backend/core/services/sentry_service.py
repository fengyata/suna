"""
Backend Sentry observability service.

Goals:
- DSN missing => full no-op (no events, no breadcrumbs, no spans).
- Keep business code clean: callers only do minimal calls (transaction/span/mark_error/breadcrumb).
- Read correlation IDs from structlog.contextvars (agent_run_id/thread_id/request_id/run_number, etc.).
"""

from __future__ import annotations

from contextlib import contextmanager
from dataclasses import dataclass
import os
import time
from typing import Any, Dict, Optional, Iterator, Tuple

from core.utils.logger import logger, structlog


_ENABLED = False


def is_enabled() -> bool:
    return _ENABLED


def _get_ctx() -> Dict[str, Any]:
    # Uses structlog.contextvars; many parts of the codebase already bind agent_run_id/thread_id/request_id.
    try:
        return structlog.contextvars.get_contextvars() or {}
    except Exception:
        return {}


def _safe_str(v: Any, max_len: int = 512) -> str:
    try:
        s = str(v)
    except Exception:
        s = f"<unstringifiable:{type(v).__name__}>"
    return s if len(s) <= max_len else (s[:max_len] + "…")


def init_backend_sentry() -> None:
    """
    Initialize sentry-sdk for backend.

    Must be safe to call multiple times.
    DSN missing => no-op.
    """
    global _ENABLED

    dsn = os.getenv("SENTRY_DSN", "").strip()
    if not dsn:
        _ENABLED = False
        logger.info("[SENTRY] Disabled (SENTRY_DSN not set)")
        return

    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.logging import LoggingIntegration
        from sentry_sdk.integrations.aiohttp import AioHttpIntegration
    except Exception as e:
        _ENABLED = False
        logger.warning(f"[SENTRY] Failed to import sentry-sdk integrations: {_safe_str(e)}")
        return

    try:
        from core.utils.config import config as app_config
        env_mode = getattr(app_config, "ENV_MODE", None)
        environment = env_mode.value if env_mode else os.getenv("ENV_MODE", "unknown")
    except Exception:
        environment = os.getenv("ENV_MODE", "unknown")

    release = os.getenv("SENTRY_RELEASE") or os.getenv("GIT_SHA") or None

    # Keep logs as breadcrumbs; errors become events via mark_error/capture_exception primarily,
    # but LoggingIntegration can help with unexpected root-level logging.error calls.
    logging_integration = LoggingIntegration(
        level=None,  # keep default breadcrumb level
        event_level=None,  # don't auto-promote logs to events (we control via mark_error)
    )

    try:
        sentry_sdk.init(
            dsn=dsn,
            environment=environment,
            release=release,
            integrations=[FastApiIntegration(), AioHttpIntegration(), logging_integration],
            # Tracing enabled; sampling can be tuned later via env.
            traces_sample_rate=float(os.getenv("SENTRY_TRACES_SAMPLE_RATE", "1.0")),
            send_default_pii=False,
        )
        _ENABLED = True
        logger.info(f"[SENTRY] Enabled (env={environment}, release={release or 'unset'})")
    except Exception as e:
        _ENABLED = False
        logger.warning(f"[SENTRY] init failed: {_safe_str(e)}")


def _apply_ctx_tags(scope, extra_tags: Optional[Dict[str, Any]] = None) -> None:
    ctx = _get_ctx()
    tags: Dict[str, Any] = {
        "agent_run_id": ctx.get("agent_run_id"),
        "thread_id": ctx.get("thread_id"),
        "project_id": ctx.get("project_id"),
        "account_id": ctx.get("account_id"),
        "request_id": ctx.get("request_id"),
        "method": ctx.get("method"),
        "path": ctx.get("path"),
    }
    if extra_tags:
        tags.update(extra_tags)

    for k, v in tags.items():
        if v is None:
            continue
        try:
            scope.set_tag(k, v)
        except Exception:
            pass


def set_request_scope_tags() -> None:
    """Call after request middleware binds contextvars (request_id/method/path/etc.)."""
    if not _ENABLED:
        return
    try:
        import sentry_sdk
        with sentry_sdk.configure_scope() as scope:
            _apply_ctx_tags(scope)
            # Explicit marker for non-agent-run requests.
            if not _get_ctx().get("agent_run_id"):
                scope.set_tag("has_agent_run_id", "false")
    except Exception:
        return


@contextmanager
def transaction_agent_run(name: str = "agent_run") -> Iterator[Any]:
    """Per-agent_run transaction wrapper."""
    if not _ENABLED:
        yield None
        return
    import sentry_sdk
    ctx = _get_ctx()
    langfuse_trace_id = ctx.get("agent_run_id")  # phase-1: trace_id == agent_run_id
    with sentry_sdk.start_transaction(op="agent.run", name=name) as tx:
        with sentry_sdk.configure_scope() as scope:
            _apply_ctx_tags(scope, extra_tags={"langfuse_trace_id": langfuse_trace_id})
        yield tx


@contextmanager
def span(op: str, description: Optional[str] = None, data: Optional[Dict[str, Any]] = None) -> Iterator[Any]:
    if not _ENABLED:
        yield None
        return
    import sentry_sdk
    with sentry_sdk.start_span(op=op, description=description) as sp:
        if data:
            try:
                for k, v in data.items():
                    sp.set_data(k, v)
            except Exception:
                pass
        yield sp


def breadcrumb(message: str, category: str = "app", level: str = "info", data: Optional[Dict[str, Any]] = None) -> None:
    if not _ENABLED:
        return
    try:
        import sentry_sdk
        sentry_sdk.add_breadcrumb(
            message=message,
            category=category,
            level=level,
            data=data or {},
        )
    except Exception:
        return


def record_sandbox_artifacts(artifacts: Any) -> None:
    """
    Record sandbox artifact addresses (no content).
    Expected shape: [{sandbox_id, path, url?}, ...]
    """
    if not _ENABLED or not artifacts:
        return
    if not isinstance(artifacts, list):
        return
    for art in artifacts[:50]:
        if not isinstance(art, dict):
            continue
        data = {
            "sandbox_id": art.get("sandbox_id"),
            "path": art.get("path"),
            "url": art.get("url"),
        }
        breadcrumb(
            message="sandbox artifact",
            category="sandbox.artifact",
            level="info",
            data={k: v for k, v in data.items() if v},
        )


def capture_exception(
    exc: BaseException,
    *,
    llm_stage: Optional[str] = None,
    error_type: Optional[str] = None,
    tags: Optional[Dict[str, Any]] = None,
) -> Optional[str]:
    """
    Capture an exception to Sentry (no-op when disabled).

    Returns:
        event_id (str) when captured, otherwise None.
    """
    if not _ENABLED:
        return None
    try:
        import sentry_sdk
        with sentry_sdk.configure_scope() as scope:
            extra_tags = dict(tags or {})
            if llm_stage:
                extra_tags["llm_stage"] = llm_stage
            if error_type:
                extra_tags["error_type"] = error_type
            _apply_ctx_tags(scope, extra_tags=extra_tags)
            # agent-run errors must have agent_run_id; if missing, keep searchable fallback
            if not _get_ctx().get("agent_run_id"):
                scope.set_tag("has_agent_run_id", "false")
        return sentry_sdk.capture_exception(exc)
    except Exception:
        return None


# ---- JSON repair info event (dedup + count) ----

@dataclass(frozen=True)
class _RepairKey:
    agent_run_id: str
    run_number: str
    tool_call_id: str


_repair_last_sent: Dict[_RepairKey, float] = {}
_repair_run_counts: Dict[Tuple[str, str], int] = {}  # (agent_run_id, run_number) -> count
_REPAIR_DEDUP_WINDOW_SECONDS = 60.0


def record_tool_call_json_repaired(
    *,
    tool_call_id: str,
    tool_name: Optional[str],
    raw_arguments_len: int,
    repaired_arguments_len: int,
) -> None:
    """
    Emit an INFO event for native tool-call JSON repairs (searchable).
    Dedup: agent_run_id + run_number + tool_call_id within 60s.
    """
    if not _ENABLED:
        return

    ctx = _get_ctx()
    agent_run_id = ctx.get("agent_run_id")
    thread_id = ctx.get("thread_id")
    run_number = ctx.get("run_number")

    if not agent_run_id or not run_number or not tool_call_id:
        # Without these we can't make it searchable in the way you requested.
        return

    key = _RepairKey(str(agent_run_id), str(run_number), str(tool_call_id))
    now = time.time()
    last = _repair_last_sent.get(key)
    if last is not None and (now - last) < _REPAIR_DEDUP_WINDOW_SECONDS:
        return
    _repair_last_sent[key] = now

    run_count_key = (str(agent_run_id), str(run_number))
    _repair_run_counts[run_count_key] = _repair_run_counts.get(run_count_key, 0) + 1
    repair_count = _repair_run_counts[run_count_key]

    try:
        import sentry_sdk
        from sentry_sdk import capture_message
        with sentry_sdk.configure_scope() as scope:
            _apply_ctx_tags(
                scope,
                extra_tags={
                    "llm_stage": "tool.parse",
                    "error_type": "ToolCallJsonRepaired",
                    "tool_call_id": tool_call_id,
                    "tool_name": tool_name,
                    "run_number": run_number,
                    "langfuse_trace_id": agent_run_id,
                    "thread_id": thread_id,
                    "repair_count_in_run": repair_count,
                },
            )
            scope.set_extra("raw_arguments_len", raw_arguments_len)
            scope.set_extra("repaired_arguments_len", repaired_arguments_len)
        capture_message("Native tool-call JSON repaired", level="info")
    except Exception:
        return


