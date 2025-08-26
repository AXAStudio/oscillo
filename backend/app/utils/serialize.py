# app/utils/serialize.py
from __future__ import annotations
import numpy as np
import pandas as pd
from typing import Any, Dict

def _iso(idx: pd.DatetimeIndex) -> list[str]:
    idx = pd.to_datetime(idx, utc=True, errors="coerce")
    return idx.strftime("%Y-%m-%dT%H:%M:%SZ").tolist()

def serialize_performance_legacy(perf: Dict[str, Any]) -> Dict[str, Any]:
    """
    Emit flat arrays:
      - TIMESTAMP
      - pv:TOTAL
      - dv:TOTAL      (simple return, first = 0)
      - pv:{TICKER}   (per-ticker position value)
      - dv:{TICKER}   (per-ticker simple return of PV)
    """
    out: Dict[str, Any] = {}

    pv_series = perf.get("portfolio_pv")
    pos_df    = perf.get("position_pv")
    ret_ser   = perf.get("ret")  # optional

    # TIMESTAMP (from portfolio_pv if available, else pos_df)
    if isinstance(pv_series, pd.Series):
        idx = pv_series.index
    elif isinstance(pos_df, pd.DataFrame):
        idx = pos_df.index
    else:
        raise ValueError("serialize_performance_legacy: need portfolio_pv Series or position_pv DataFrame.")

    timestamps = _iso(idx)
    out["TIMESTAMP"] = timestamps

    # pv:TOTAL
    if not isinstance(pv_series, pd.Series) and isinstance(pos_df, pd.DataFrame):
        pv_series = pos_df.sum(axis=1)

    pv_total = pd.to_numeric(pv_series, errors="coerce").replace([np.inf, -np.inf], np.nan).fillna(method="ffill").fillna(0.0)
    out["pv:TOTAL"] = pv_total.tolist()

    # dv:TOTAL (use precomputed ret if available, else pct_change)
    if isinstance(ret_ser, pd.Series):
        dv_total = ret_ser.replace([np.inf, -np.inf], np.nan).fillna(0.0)
    else:
        dv_total = pv_total.pct_change().replace([np.inf, -np.inf], np.nan).fillna(0.0)
    out["dv:TOTAL"] = dv_total.tolist()

    # Per-ticker PV + DV (if you want them)
    if isinstance(pos_df, pd.DataFrame):
        pos_df = pos_df.replace([np.inf, -np.inf], np.nan).fillna(method="ffill").fillna(0.0)
        for col in pos_df.columns:
            key_pv = f"pv:{col}"
            out[key_pv] = pos_df[col].tolist()

            # per-ticker DV = pct_change of that position’s PV
            key_dv = f"dv:{col}"
            out[key_dv] = pos_df[col].pct_change().replace([np.inf, -np.inf], np.nan).fillna(0.0).tolist()

    return out
