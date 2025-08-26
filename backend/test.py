# tests/test_graph_performance.py
import asyncio
import os
from typing import Dict, Any, List
import pandas as pd
import matplotlib.pyplot as plt

from app.models import Portfolio
from app.services.performance import get_portfolio_data

TEST_PORTFOLIO = Portfolio(
    user_id="d62c7b0a-4af1-4520-9f35-ec7825d8c227",
    id="6821b1c8-6f21-42cc-bad3-0a1bf6a1cf86",
    created_at="2025-08-10T00:00:00Z",
)

OUTDIR = "artifacts"
os.makedirs(OUTDIR, exist_ok=True)

def _ensure_utc_index(obj: pd.Series | pd.DataFrame) -> pd.Series | pd.DataFrame:
    if isinstance(obj.index, pd.DatetimeIndex):
        if obj.index.tz is None:
            obj = obj.copy()
            obj.index = pd.to_datetime(obj.index, utc=True)
        else:
            obj = obj.tz_convert("UTC")
    return obj

async def main():
    test_agg: Dict[str, Any] = await get_portfolio_data(
        TEST_PORTFOLIO.user_id,
        TEST_PORTFOLIO.id,
        granularity="1d",
    )

    # dump raw for inspection
    with open(os.path.join(OUTDIR, "test.txt"), "w", encoding="utf-8") as f:
        f.write("\n\n\n\nOUTPUT:")
        f.write(str(test_agg))

    if "performance" not in test_agg:
        raise KeyError("No 'performance' key in get_portfolio_data output")

    perf: Dict[str, Any] = test_agg["performance"]

    # ---- Total PV (Series) ----
    pv_series = None
    # prefer canonical key
    if isinstance(perf.get("portfolio_pv"), pd.Series):
        pv_series = perf["portfolio_pv"]
    else:
        # fallback: compute from position_pv (+ cash if present)
        pos_df = perf.get("position_pv")
        cash = perf.get("cash")
        if isinstance(pos_df, pd.DataFrame):
            pv_series = pos_df.sum(axis=1)
            if isinstance(cash, pd.Series):
                # align and add cash
                pv_series = pv_series.add(cash, fill_value=0.0)

    if pv_series is None:
        raise TypeError("Could not locate total portfolio PV (expected 'portfolio_pv' Series or 'position_pv' DataFrame).")

    pv_series = _ensure_utc_index(pv_series).sort_index()

    # Plot total PV
    plt.figure(figsize=(10, 5))
    plt.plot(pv_series.index, pv_series.values)
    plt.title("Portfolio Value Over Time")
    plt.xlabel("Time (UTC)")
    plt.ylabel("Portfolio Value ($)")
    plt.tight_layout()
    total_path = os.path.join(OUTDIR, "portfolio_pv.png")
    plt.savefig(total_path, dpi=150)
    plt.close()

    # ---- Per-ticker position values (DataFrame) ----
    pos_df = perf.get("position_pv")
    if isinstance(pos_df, pd.DataFrame) and not pos_df.empty:
        pos_df = _ensure_utc_index(pos_df).sort_index()

        # drop cash-like column if your compute includes it (it usually shouldn't)
        drop_like = {c for c in pos_df.columns if str(c).lower() in {"pv:ca$h", "ca$h", "cash"}}
        cols: List[str] = [c for c in pos_df.columns if c not in drop_like]

        if cols:
            plt.figure(figsize=(12, 6))
            y = [pos_df[c].values for c in cols]
            plt.stackplot(pos_df.index, *y, labels=cols)
            plt.legend(loc="upper left", ncol=2, frameon=False)
            plt.title("Per-Ticker Position Value (Stacked)")
            plt.xlabel("Time (UTC)")
            plt.ylabel("Position Value ($)")
            plt.tight_layout()
            stacked_path = os.path.join(OUTDIR, "positions_stacked.png")
            plt.savefig(stacked_path, dpi=150)
            plt.close()

    print(f"Saved: {total_path}")

if __name__ == "__main__":
    asyncio.run(main())
