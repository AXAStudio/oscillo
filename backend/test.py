# tests/test_graph_performance_all.py
import asyncio
import os
import json
import math
import re
from typing import Dict, Any, List, Tuple

import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")  # headless
import matplotlib.pyplot as plt

from app.models import Portfolio
from app.services.performance import get_portfolio_data

# ---------- CONFIG ----------
TEST_PORTFOLIO = Portfolio(
    user_id="d62c7b0a-4af1-4520-9f35-ec7825d8c227",
    id="6821b1c8-6f21-42cc-bad3-0a1bf6a1cf86",
    created_at="2025-08-10T00:00:00Z",
)

# Frontend-style periods to test; env override supported (comma-separated)
PERIODS: List[str] = os.getenv("PERF_PERIODS", "1D,1W,1M,YTD,1Y,ALL").split(",")
PERIODS = [p.strip() for p in PERIODS if p.strip()]

# Backend fallback (if 1Y vs 1YR mismatch is raised explicitly)
BACKEND_FALLBACK = {"1Y": "1YR"}

OUTDIR = os.getenv("PERF_OUTDIR", os.path.join("artifacts", "performance_all"))
os.makedirs(OUTDIR, exist_ok=True)

# Run periods concurrently? (set PERF_CONCURRENCY=1 to disable)
CONCURRENT = os.getenv("PERF_CONCURRENCY", "1").strip() != "1"


# ---------- HELPERS ----------
def _ensure_utc_index(obj: pd.Series | pd.DataFrame) -> pd.Series | pd.DataFrame:
    """Make index tz-aware UTC and sorted ascending."""
    if isinstance(obj.index, pd.DatetimeIndex):
        obj = obj.copy()
        if obj.index.tz is None:
            obj.index = pd.to_datetime(obj.index, utc=True)
        else:
            obj.index = obj.index.tz_convert("UTC")
        obj = obj.sort_index()
    return obj


def _sanitize_series(s: pd.Series) -> pd.Series:
    """Float64, remove +/-inf and NaNs."""
    s = pd.to_numeric(s, errors="coerce").astype("float64")
    s = s.replace([np.inf, -np.inf], np.nan).dropna()
    return s


def _sanitize_frame(df: pd.DataFrame) -> pd.DataFrame:
    df = df.apply(pd.to_numeric, errors="coerce").astype("float64")
    df = df.replace([np.inf, -np.inf], np.nan).dropna(how="all")
    return df


def _extract_total_pv(perf: Dict[str, Any]) -> pd.Series | None:
    """Prefer 'portfolio_pv'; fallback to sum of 'position_pv' (+ cash if present)."""
    if isinstance(perf.get("portfolio_pv"), pd.Series):
        return perf["portfolio_pv"]
    pos_df = perf.get("position_pv")
    if isinstance(pos_df, pd.DataFrame):
        s = pos_df.sum(axis=1)
        cash = perf.get("cash")
        if isinstance(cash, pd.Series):
            s = s.add(cash, fill_value=0.0)
        return s
    return None


def _time_bounds(idx: pd.DatetimeIndex) -> Tuple[str, str, int]:
    if len(idx) == 0:
        return ("", "", 0)
    idx = idx.tz_convert("UTC")
    start = idx[0].strftime("%Y-%m-%dT%H:%M:%S.%fZ")
    end = idx[-1].strftime("%Y-%m-%dT%H:%M:%S.%fZ")
    return (start, end, len(idx))


def _save_csv(series: pd.Series, path: str) -> None:
    idx = pd.DatetimeIndex(series.index).tz_convert("UTC")
    df = pd.DataFrame({
        "timestamp_utc": idx.strftime("%Y-%m-%dT%H:%M:%S.%fZ"),
        "value": series.astype("float64").values,
    })
    os.makedirs(os.path.dirname(path), exist_ok=True)
    df.to_csv(path, index=False)


def _plot_total(series: pd.Series, title: str, path: str) -> None:
    if series.empty:
        return
    plt.figure(figsize=(10, 5))
    plt.plot(series.index, series.values)
    plt.title(title)
    plt.xlabel("Time (UTC)")
    plt.ylabel("Portfolio Value ($)")
    plt.tight_layout()
    os.makedirs(os.path.dirname(path), exist_ok=True)
    plt.savefig(path, dpi=150)
    plt.close()


def _plot_positions(df: pd.DataFrame, title: str, path: str) -> None:
    if df.empty:
        return
    # Drop any cash-like columns if present (robust regex)
    cash_mask = [bool(re.search(r"(?:^|[^a-z])cash(?:[^a-z]|$)|\bpv:?\s*cash\b|\bcsh\b", str(c), re.I)) for c in df.columns]
    cols = [c for c, is_cash in zip(df.columns, cash_mask) if not is_cash]
    if not cols:
        return
    df = df[cols]
    df = _sanitize_frame(df)
    if df.empty:
        return
    plt.figure(figsize=(12, 6))
    y = [df[c].values for c in df.columns]
    plt.stackplot(df.index, *y, labels=list(df.columns))
    plt.legend(loc="upper left", ncol=min(4, max(1, len(df.columns) // 8 + 1)), frameon=False)
    plt.title(title)
    plt.xlabel("Time (UTC)")
    plt.ylabel("Position Value ($)")
    plt.tight_layout()
    os.makedirs(os.path.dirname(path), exist_ok=True)
    plt.savefig(path, dpi=150)
    plt.close()


# ---------- RUN ONE PERIOD ----------
async def _run_one(period: str) -> Dict[str, Any]:
    backend_gran = period
    try:
        agg: Dict[str, Any] = await get_portfolio_data(
            TEST_PORTFOLIO.user_id,
            TEST_PORTFOLIO.id,
            granularity=backend_gran,
        )
    except ValueError as e:
        # Only map spelling for explicit granularity errors
        backend_gran = BACKEND_FALLBACK.get(period, period)
        agg = await get_portfolio_data(
            TEST_PORTFOLIO.user_id,
            TEST_PORTFOLIO.id,
            granularity=backend_gran,
        )

    if "performance" not in agg:
        raise KeyError(f"[{period}] No 'performance' key in get_portfolio_data output")

    perf: Dict[str, Any] = agg["performance"]
    report: Dict[str, Any] = {"period": period, "backend_granularity": backend_gran}

    # --- Total PV ---
    pv_series = _extract_total_pv(perf)
    if pv_series is None:
        raise TypeError(f"[{period}] Could not locate total portfolio PV series")

    pv_series = _ensure_utc_index(pv_series)
    if not isinstance(pv_series.index, pd.DatetimeIndex):
        raise AssertionError(f"[{period}] PV index is not DatetimeIndex")
    if pv_series.index.tz is None:
        raise AssertionError(f"[{period}] PV index is not tz-aware")
    if not pv_series.index.is_monotonic_increasing:
        raise AssertionError(f"[{period}] PV index not sorted")

    pv_series = _sanitize_series(pv_series)
    n_points = pv_series.shape[0]

    # Basic quality asserts (allow 1D to have fewer points; everything must be positive)
    if period != "1D":
        assert n_points > 1, f"[{period}] too few points ({n_points})"
    if n_points > 0:
        assert (pv_series > 0).all(), f"[{period}] non-positive PV encountered"

    # Save artifacts
    base = os.path.join(OUTDIR, period)
    os.makedirs(base, exist_ok=True)
    total_png = os.path.join(base, "portfolio_pv.png")
    total_csv = os.path.join(base, "portfolio_pv.csv")
    _plot_total(pv_series, f"Portfolio Value Over Time — {period}", total_png)
    _save_csv(pv_series, total_csv)

    # --- Positions (optional) ---
    pos_df = perf.get("position_pv")
    if isinstance(pos_df, pd.DataFrame) and not pos_df.empty:
        pos_df = _ensure_utc_index(pos_df)
        if pos_df.index.tz is None:
            raise AssertionError(f"[{period}] position_pv index not tz-aware")
        if not pos_df.index.is_monotonic_increasing:
            raise AssertionError(f"[{period}] position_pv index not sorted")
        stacked_png = os.path.join(base, "positions_stacked.png")
        _plot_positions(pos_df, f"Per-Ticker Position Value (Stacked) — {period}", stacked_png)

    # --- Summary JSON ---
    start_iso, end_iso, n = _time_bounds(pv_series.index)
    report.update(
        window_start_utc=start_iso,
        window_end_utc=end_iso,
        n_points=n,
        first_value=float(pv_series.iloc[0]) if n else None,
        last_value=float(pv_series.iloc[-1]) if n else None,
    )
    with open(os.path.join(base, "summary.json"), "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    print(f"[{period}] saved: {total_png}  (points={n})")
    return report


# ---------- MAIN ----------
async def main():
    all_reports: List[Dict[str, Any]] = []

    if CONCURRENT:
        tasks = [asyncio.create_task(_run_one(p)) for p in PERIODS]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        for period, res in zip(PERIODS, results):
            if isinstance(res, Exception):
                print(f"[{period}] ERROR: {res}")
                all_reports.append({"period": period, "error": str(res)})
            else:
                all_reports.append(res)
    else:
        for period in PERIODS:
            try:
                rep = await _run_one(period)
                all_reports.append(rep)
            except Exception as e:
                print(f"[{period}] ERROR: {e}")
                all_reports.append({"period": period, "error": str(e)})

    with open(os.path.join(OUTDIR, "rollup.json"), "w", encoding="utf-8") as f:
        json.dump(all_reports, f, indent=2)

    print("\n=== ROLLUP ===")
    had_errors = False
    for r in all_reports:
        if "error" in r:
            had_errors = True
            print(f"{r['period']:>3} | ERROR: {r['error']}")
        else:
            print(f"{r['period']:>3} | {r['backend_granularity']:>3} | {r['n_points']:>5} | {r['window_start_utc']} → {r['window_end_utc']}")

    if had_errors:
        raise SystemExit(1)


if __name__ == "__main__":
    asyncio.run(main())
