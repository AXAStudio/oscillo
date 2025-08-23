**Oscillo** is a lightweight, no-friction portfolio tracker for public markets. It connects a simple, reliable FastAPI backend (Python) to an elegant Next.js frontend to give investors a fast snapshot of their holdings, performance, and risk without the bloat of full-stack wealth apps.

## What it does

* **Positions & Performance**: Pulls current positions and value history; shows time-weighted returns, P\&L, and allocation.
* **Orders & Cashflow**: Records buys/sells and cash deposits/withdrawals; updates cost basis and realized P\&L.
* **Market Data**: On-demand quotes, sparkline charts, and fundamentals for tickers in your portfolio/watchlist.
* **Multi-Portfolio**: Track multiple portfolios; quick-switch and aggregate views.
* **Zero-drag UX**: Loads fast, keyboard-friendly search, readable at a glance.

## Architecture (current)

* **Backend**: Python + FastAPI.

  * Endpoints: `market data`, `portfolio`, `positions`, `orders`.
  * **Supabase** for auth & user data.
* **Frontend (target)**: Next.js (App Router), TypeScript, Tailwind, SWR/React Query.
* **Design**: Systematic tokens, accessible components, responsive from mobile → desktop.

# Overview for LOVABLE (Next.js frontend scaffolding)

> **Title**: “Oscillo – Lightweight Portfolio Tracker (Next.js + Tailwind)”
>
> **Prompt**:
> Build a responsive Next.js 14 (App Router) TypeScript UI for a lightweight portfolio tracker called **Oscillo**. Use Tailwind CSS and Headless UI or Radix primitives where helpful, plus SWR for data fetching (or React Query if you prefer). Assume a FastAPI backend with these REST endpoints (bearer auth via Supabase):
>
> * `GET /portfolios` → list user portfolios
Example Response:
[
    {
        "id": "6821b1c8-6f21-42cc-bad3-0a1bf6a1cf86",
        "created_at": "2025-08-16T21:12:09.957539+00:00",
        "name": "Create Test Portfolio",
        "last_updated": "2025-08-16T17:12:09.862456+00:00",
        "user_id": "d62c7b0a-4af1-4520-9f35-ec7825d8c227"
    }
]
> * `POST /portfolios` → create portfolio `{ name, initial_investment }`
Response Body:
{
    "id": "6821b1c8-6f21-42cc-bad3-0a1bf6a1cf86",
    "created_at": "2025-08-16T21:12:09.957539+00:00",
    "name": "Create Test Portfolio",
    "last_updated": "2025-08-16T17:12:09.862456+00:00",
    "user_id": "d62c7b0a-4af1-4520-9f35-ec7825d8c227"
}
> * `GET /portfolios/{id}` → metadata + latest value
Status: 200
{
    "id": "6821b1c8-6f21-42cc-bad3-0a1bf6a1cf86",
    "user_id": "d62c7b0a-4af1-4520-9f35-ec7825d8c227",
    "name": "Create Test Portfolio",
    "created_at": "2025-08-16T21:12:09.957539+00:00",
    "last_updated": "2025-08-16T17:12:09.862456+00:00",
    "present_value": 10511.620086669922,
    "positions": {
        "CA$H": {
            "quantity": 6656,
            "value": 6656
        },
        "AAPL": {
            "quantity": 2,
            "value": 455.5199890136719
        },
        "TSLA": {
            "quantity": 10,
            "value": 3400.10009765625
        }
    }
}
> * `DELETE /portfolios/{id}`
Status: 200
{
    "message": "Portfolio 41d97793-1594-4dce-a010-f4fc8b5d085a deleted successfully"
}
> * `GET /portfolios/{id}/positions` → current positions (ticker, qty, avg\_cost, market\_value, pnl, sector)
Status: 200
{
    "status": "success",
    "positions": {
        "CA$H": {
            "ticker": "CA$H",
            "portfolio_id": "6821b1c8-6f21-42cc-bad3-0a1bf6a1cf86",
            "quantity": 6656,
            "created_at": "2025-08-16T21:38:12.892212+00:00",
            "updated_at": "2025-08-16T21:58:55.101134+00:00"
        },
        "AAPL": {
            "ticker": "AAPL",
            "portfolio_id": "6821b1c8-6f21-42cc-bad3-0a1bf6a1cf86",
            "quantity": 2,
            "created_at": "2025-08-16T21:56:36.240083+00:00",
            "updated_at": "2025-08-16T21:56:36.240083+00:00"
        },
        "TSLA": {
            "ticker": "TSLA",
            "portfolio_id": "6821b1c8-6f21-42cc-bad3-0a1bf6a1cf86",
            "quantity": 10,
            "created_at": "2025-08-16T21:58:54.869481+00:00",
            "updated_at": "2025-08-16T21:58:54.869481+00:00"
        }
    }
}
> * `GET /portfolios/{id}/orders` → orders with timestamp, ticker, qty (negative = sell), price
Status: 200
{
    "status": "success",
    "orders": [
        {
            "timestamp": "2025-08-15T18:50:05.515854+00:00",
            "ticker": "AMZN",
            "quantity": 10,
            "price": 175.5,
            "portfolio_id": "591dd7f5-fff1-4041-ae74-3507688da719",
            "order_id": "d3e81485-1ec9-412e-8fab-87cb9a5876db"
        }
        ...
    ]
}
> * `POST /portfolios/{id}/orders` → create order
order_payload = {
  "ticker": 'AMZN',
  "quantity": 100,
  "price": 200.25
}
Status: 200
{
    "status": "success",
    "order": {
        "timestamp": "2025-08-16T17:58:54.442574+00:00",
        "ticker": "TSLA",
        "quantity": 10,
        "price": 200.25,
        "portfolio_id": "6821b1c8-6f21-42cc-bad3-0a1bf6a1cf86",
        "order_id": "3c9db0c7-6de8-48d2-845e-247d7f3fb091"
    }
}
> * `GET /market/quotes?tickers=AAPL,AMZN` → last price, day change, sparkline data
{'TSLA': {'Datetime': '2025-08-22T15:59:00-04:00',
  'Open': 339.9100036621094,
  'High': 340.25,
  'Low': 339.8800048828125,
  'Close': 340.010009765625,
  'Volume': 1223654,
  'Dividends': 0.0,
  'Stock Splits': 0.0},
 'AMZN': {'Datetime': '2025-08-22T15:59:00-04:00',
  'Open': 228.8699951171875,
  'High': 229.02000427246094,
  'Low': 228.7899932861328,
  'Close': 228.83999633789062,
  'Volume': 810926,
  'Dividends': 0.0,
  'Stock Splits': 0.0}}
> * `GET /performance/{portfolio_id}?period=1D|1W|1M|YTD|1Y|ALL` → series of {timestamp, value}
{'id': '2025-08-10T00:00:00Z', 'user_id': '6821b1c8-6f21-42cc-bad3-0a1bf6a1cf86', 'name': 'Test Portfolio', 'created_at': '2025-08-10T00:00:00Z', 'last_updated': '2025-08-10T00:00:00Z', 'performance': {'TIMESTAMP': ['2025-08-11T00:00:00', '2025-08-12T00:00:00', '2025-08-13T00:00:00', '2025-08-14T00:00:00', '2025-08-15T00:00:00'], 'pv:CA$H': [0.0, 9429.85, 6521.07, 2368.07, 709.32], 'dv:CA$H': [0.0, 0.0, -0.308465, -0.636859, -0.700465], 'pv:AAPL': [0.0, 0.0, 466.660004, 465.559998, 463.179993], 'dv:AAPL': [0.0, 0.0, 0.0, -0.002357, -0.005112], 'pv:AMZN': [0.0, 664.410004, 673.679993, 692.939987, 693.089996], 'dv:AMZN': [0.0, 0.0, 0.013952, 0.028589, 0.000216], 'pv:GOOGL': [0.0, 0.0, 807.840027, 811.76001, 815.599976], 'dv:GOOGL': [0.0, 0.0, 0.0, 0.004852, 0.00473], 'pv:JPM': [0.0, 0.0, 0.0, 0.0, 0.0], 'dv:JPM': [0.0, 0.0, 0.0, 0.0, 0.0], 'pv:KO': [0.0, 0.0, 0.0, 0.0, 0.0], 'dv:KO': [0.0, 0.0, 0.0, 0.0, 0.0], 'pv:META': [0.0, 0.0, 0.0, 0.0, 0.0], 'dv:META': [0.0, 0.0, 0.0, 0.0, 0.0], 'pv:MSFT': [0.0, 0.0, 0.0, 2612.399902, 2600.849915], 'dv:MSFT': [0.0, 0.0, 0.0, 0.0, -0.004421], 'pv:NVDA': [0.0, 0.0, 0.0, 0.0, 180.449997], 'dv:NVDA': [0.0, 0.0, 0.0, 0.0, 0.0], 'pv:TSLA': [0.0, 0.0, 0.0, 3355.799866, 3305.599976], 'dv:TSLA': [0.0, 0.0, 0.0, 0.0, -0.014959], 'pv:VOO': [0.0, 0.0, 0.0, 0.0, 1774.710022], 'dv:VOO': [0.0, 0.0, 0.0, 0.0, 0.0], 'pv:XOM': [0.0, 0.0, 852.86377, 851.119995, 851.919983], 'dv:XOM': [0.0, 0.0, 0.0, -0.002045, 0.00094], 'pv:TOTAL': [0.0, 10094.260004, 9322.113793, 11157.649758, 11394.719857], 'dv:TOTAL': [0.0, 0.0, -0.076494, 0.196901, 0.021247]}}
>
> **Pages & routes (App Router)**
>
> * `/` Landing: one-screen hero, product bullets, CTA to “Open Dashboard”; shows Oscillo brand.
> * `/dashboard` (protected):
>
>   * **Top bar**: portfolio switcher (combobox), date-range pills (1D, 1W, 1M, YTD, 1Y, ALL), search input for tickers.
>   * **KPIs row**: Total Value, Day P\&L, Total P\&L, Return % (period).
>   * **Charts**: Performance area chart (zoomable), Allocation donut (by asset, by sector toggle).
>   * **Tables**:
>
>     * **Holdings**: Ticker, Name, Qty, Avg Cost, Price, Market Value, P\&L \$, P\&L %, Day %, Weight. Sortable, sticky header, virtualized.
>     * **Orders**: Timestamp, Ticker, Side, Qty, Price, Cost, Notes.
>   * **Right panel** (lg screens): Quick Order (Buy/Sell), Ticker lookup with live quote + mini-sparkline.
> * `/settings` (protected): profile info, data export (.csv), danger zone (delete portfolio).
> * `/auth/*` can be simple stubs; show mocked Supabase auth hooks.
>
> **Core components**
>
> * `PortfolioSwitcher` (combobox + create new)
> * `KpiCard` (value, delta, tooltip)
> * `PerformanceChart` (timeseries area; hover crosshair; period sync with URL query)
> * `AllocationDonut` (asset/sector toggle; legend with % and color)
> * `HoldingsTable` (sortable, column visibility, CSV export)
> * `OrdersTable`
> * `OrderForm` (buy/sell toggle; validates balance/inventory; posts to `/orders`)
> * `TickerSearch` (debounced call to `/market/search` then `/market/quotes`)
> * `EmptyState` (no portfolio / no data)
> * `ErrorBanner` + `LoadingSkeletons`
>
> **Design requirements**
>
> * Tailwind + a minimal design system:
>
>   * Colors: `slate` neutrals, accent `indigo` for brand.
>   * Typography: Inter.
>   * Spacing 4/8 rule; large touch targets; focus rings.
> * Dark mode first (prefers-color-scheme).
> * Accessibility: proper semantics, keyboard nav, aria labels on menus, 3:1 contrast in charts.
>
> **State & data**
>
> * Wrap app with SWRConfig (or React Query provider).
> * Revalidate quotes every 5s; performance series on demand; cache portfolio/positions for 2min.
> * Keep selected portfolio & period in the URL query for shareable views.
>
> **API utilities**
>
> * Create `/lib/api.ts` with typed fetchers using `fetch` + bearer token from Supabase.
> * Add types: `Portfolio`, `Position`, `Order`, `Quote`, `PerformancePoint`.
> * Handle 401 → redirect to `/auth`.
>
> **Nice-to-haves for polish**
>
> * CSV export for holdings/orders.
> * Column pinning & resizing in table.
> * Toasts for order success/failure.
> * Skeletons for charts and tables.
> * Empty states that link to “Create your first order”.
>
> **Deliverables**
>
> * A working Next.js app with the above routes/components, mocked where necessary but with real data flows for the fetchers (assume base URL env: `NEXT_PUBLIC_API_BASE_URL`).
> * Clean, modular folders; clear TODOs where backend integration is needed.
> * Minimal brand: Oscillo wordmark in navbar; favicon placeholder.
>
> Please generate idiomatic, production-leaning code that compiles.
