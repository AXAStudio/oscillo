## **1. Portfolio Management Routes**

These handle user portfolios and asset allocations.

| Method   | Route             | Purpose                                   |
| -------- | ----------------- | ----------------------------------------- |
| `GET`    | `/portfolio`      | Get all portfolios for the signed-in user |
| `POST`   | `/portfolio`      | Create a new portfolio                    |
| `GET`    | `/portfolio/{id}` | Get a specific portfolio’s details        |
| `PUT`    | `/portfolio/{id}` | Update portfolio name/assets              |
| `DELETE` | `/portfolio/{id}` | Delete a portfolio                        |

---

## **2. Market Data Routes**

For real-time & historical stock data.

| Method | Route             | Purpose                                          |
| ------ | ----------------- | ------------------------------------------------ |
| `GET`  | `/prices`         | Latest prices for one or more tickers            |
| `GET`  | `/historical`     | Historical price data for charting               |
| `GET`  | `/quote/{ticker}` | Detailed quote for a single asset                |
| `GET`  | `/search`         | Search for tickers by name/symbol (autocomplete) |

---

## **4. User & Auth Routes**

If you manage accounts in the backend (instead of outsourcing to Clerk/Supabase).

| Method | Route       | Purpose                    |
| ------ | ----------- | -------------------------- |
| `POST` | `/register` | Create account             |
| `POST` | `/login`    | Login user (returns token) |
| `GET`  | `/me`       | Get current user profile   |
| `PUT`  | `/me`       | Update profile settings    |

---

## **Extra for Later**

If you want advanced features later:

* **`/analytics/risk/{portfolio_id}`** → Calculate portfolio risk & volatility.
* **`/watchlist`** → Manage saved tickers to track.
* **`/news/{ticker}`** → Latest news headlines for a stock.
* **`/correlation/{id}`** → Correlation between portfolio assets.

---
