"""
LLM timing helpers used for richer observability (logs + Sentry).

We track both:
- monotonic timestamps (for accurate durations)
- wall-clock timestamps (for human-readable ISO times in Sentry)
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict, Optional


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _iso(dt: Optional[datetime]) -> Optional[str]:
    return dt.isoformat() if dt else None


@dataclass
class LLMTimingContext:
    # Monotonic time for durations (seconds)
    call_start_mono: float
    # Wall time for display
    call_start_utc: datetime

    # Chunk timing
    first_chunk_mono: Optional[float] = None
    first_chunk_utc: Optional[datetime] = None
    prev_chunk_mono: Optional[float] = None
    prev_chunk_utc: Optional[datetime] = None
    last_chunk_mono: Optional[float] = None
    last_chunk_utc: Optional[datetime] = None

    chunk_count: int = 0

    # Exception timing
    exception_mono: Optional[float] = None
    exception_utc: Optional[datetime] = None

    def mark_chunk(self, *, now_mono: float, now_utc: Optional[datetime] = None) -> None:
        now_utc = now_utc or _utc_now()

        if self.first_chunk_mono is None:
            self.first_chunk_mono = now_mono
            self.first_chunk_utc = now_utc

        if self.last_chunk_mono is not None:
            self.prev_chunk_mono = self.last_chunk_mono
            self.prev_chunk_utc = self.last_chunk_utc

        self.last_chunk_mono = now_mono
        self.last_chunk_utc = now_utc
        self.chunk_count += 1

    def mark_exception(self, *, now_mono: float, now_utc: Optional[datetime] = None) -> None:
        self.exception_mono = now_mono
        self.exception_utc = now_utc or _utc_now()

    def total_duration_seconds(self) -> Optional[float]:
        if self.exception_mono is None:
            return None
        return max(0.0, self.exception_mono - self.call_start_mono)

    def last_chunk_interval_seconds(self) -> Optional[float]:
        if self.last_chunk_mono is None or self.prev_chunk_mono is None:
            return None
        return max(0.0, self.last_chunk_mono - self.prev_chunk_mono)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "call_start_time": _iso(self.call_start_utc),
            "first_chunk_time": _iso(self.first_chunk_utc),
            "previous_chunk_time": _iso(self.prev_chunk_utc),
            "last_chunk_time": _iso(self.last_chunk_utc),
            "exception_time": _iso(self.exception_utc),
            "chunk_count": self.chunk_count,
            "total_duration_seconds": self.total_duration_seconds(),
            "last_chunk_interval_seconds": self.last_chunk_interval_seconds(),
        }

