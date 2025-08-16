"""
Timestamp Processing Utils
"""

from datetime import datetime
from zoneinfo import ZoneInfo  # Python 3.9+

def parse_timestamptz(ts: str, to_tz: str | None = None, naive: bool = False) -> datetime:
    """
    Parse an ISO 8601 timestamptz like '2025-08-15T22:42:45.581734+00:00'
    into a datetime. Returns timezone-aware by default.

    Args:
        ts: timestamp string
        to_tz: optional IANA tz name to convert to (e.g., 'America/New_York')
        naive: if True, drop tzinfo before returning

    """
    # Handle both '+00:00' and 'Z'
    dt = datetime.fromisoformat(ts.replace('Z', '+00:00'))
    if to_tz:
        dt = dt.astimezone(ZoneInfo(to_tz))
    if naive:
        dt = dt.replace(tzinfo=None)
    return dt
