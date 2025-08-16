"""
Market Data Utils
"""
import yfinance as yf

def verify_ticker(ticker: str) -> bool:
    sym = ticker.strip().upper().replace(".", "-")
    df = yf.Ticker(sym).history(period="1d", interval="1d", prepost=False, auto_adjust=False)
    return not df.empty
