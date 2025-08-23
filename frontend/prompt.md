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
> * `POST /portfolios` → create portfolio `{ name, initial_investment }`
> * `GET /portfolios/{id}` → metadata + latest value
> * `DELETE /portfolios/{id}`
> * `GET /portfolios/{id}/positions` → current positions (ticker, qty, avg\_cost, market\_value, pnl, sector)
> * `GET /portfolios/{id}/orders` → orders with timestamp, ticker, qty (negative = sell), price
> * `POST /portfolios/{id}/orders` → create order
> * `GET /market/quotes?tickers=AAPL,MSFT` → last price, day change, sparkline data
> * `GET /market/search?q=tesla` → ticker search
> * `GET /performance/{portfolio_id}?period=1D|1W|1M|YTD|1Y|ALL` → series of {timestamp, value}
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
