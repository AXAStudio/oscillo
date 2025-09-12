import yfinance as yf
import pandas as pd
import quantstats as qs

# Define your portfolio assets and weights
tickers = ['AAPL', 'MSFT', 'GOOG']
weights = [0.4, 0.4, 0.2]

# Define benchmark and date range
benchmark_ticker = '^GSPC'
start_date = '2022-01-01'
end_date = '2025-01-01'
# Download adjusted closing prices
data = yf.download(tickers, start=start_date, end=end_date)['Adj Close']
benchmark_data = yf.download(benchmark_ticker, start=start_date, end=end_date)['Adj Close']
# Calculate individual asset returns
asset_returns = data.pct_change().dropna()

# Calculate benchmark returns
benchmark_returns = benchmark_data.pct_change().dropna()
# Create a weighted portfolio returns series
portfolio_returns = (asset_returns * weights).sum(axis=1)
# Use quantstats to create a comprehensive HTML report (tear sheet)
qs.reports.html(
    returns=portfolio_returns, 
    benchmark=benchmark_returns,
    output='portfolio_performance_report.html',
    title='Portfolio Performance Analysis',
    benchmark_title='S&P 500'
)
