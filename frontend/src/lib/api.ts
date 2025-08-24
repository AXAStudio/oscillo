// /src/lib/api.ts
// API utilities and types for Oscillo

import { createClient, type AuthChangeEvent, type Session } from "@supabase/supabase-js";

// ---- Supabase Client (proper auth) ----
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    "Missing Vite envs: VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY"
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Optional helpers if you want them elsewhere in the app
export const onAuthState = (
  cb: (event: AuthChangeEvent, session: Session | null) => void
) => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(cb);
  return () => subscription.unsubscribe();
};
export const signOut = () => supabase.auth.signOut();

// ---- Backend base URL ----
const API_DOMAIN = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const API_BASE_URL = API_DOMAIN + "/api/1.0";

// Types
export interface Portfolio {
  id: string;
  name: string;
  created_at: string;
  last_updated: string;
  user_id: string;
  // Extended fields from GET /portfolios/{id}
  present_value?: number;
  positions?: {
    [ticker: string]: {
      quantity: number;
      value: number;
    };
  };
}

export interface PositionDetail {
  ticker: string;
  company_name: string;
  sector: string;
  portfolio_id: string;
  quantity: number;
  created_at: string;
  updated_at: string;
}

export interface PositionsResponse {
  status: string;
  positions: {
    [ticker: string]: PositionDetail;
  };
}

export interface Order {
  order_id: string;
  portfolio_id: string;
  ticker: string;
  company_name: string;
  sector: string;
  timestamp: string;
  quantity: number; // negative = sell
  price: number;
}

export interface OrdersResponse {
  status: string;
  orders: Order[];
}

export interface MarketQuote {
  Datetime: string;
  Open: number;
  High: number;
  Low: number;
  Close: number;
  Volume: number;
  Dividends: number;
  "Stock Splits": number;
}

export interface PerformanceData {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  last_updated: string;
  performance: {
    TIMESTAMP: string[];
    "pv:TOTAL": number[];
    "dv:TOTAL": number[];
    [key: string]: number[] | string[];
  };
}

// Legacy types for UI compatibility
export interface Position {
  id: string;
  portfolio_id: string;
  ticker: string;
  name: string;
  quantity: number;
  avg_cost: number;
  current_price: number;
  market_value: number;
  pnl: number;
  pnl_percentage: number;
  day_change: number;
  day_change_percentage: number;
  weight: number;
  sector?: string;
}

export interface Quote {
  ticker: string;
  name: string;
  price: number;
  change: number;
  change_percentage: number;
  volume: number;
  market_cap?: number;
  sparkline?: number[];
  last_updated: string;
}

export interface PerformancePoint {
  timestamp: string;
  value: number;
  change?: number;
  change_percentage?: number;
}

export interface SearchResult {
  ticker: string;
  name: string;
  exchange: string;
  type: string;
}

// ---- Fetch wrapper with Supabase auth ----
const fetchWithAuth = async (url: string, options?: RequestInit) => {
  // Get current session (auto-refreshed by Supabase client)
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    // No session — kick to auth page
    window.location.href = "/auth";
    throw new Error("Unauthorized");
  }

  const headers = new Headers(options?.headers || {});
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  headers.set("Authorization", `Bearer ${session.access_token}`);

  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Session invalid on backend — sign out and redirect
    await supabase.auth.signOut();
    window.location.href = "/auth";
    throw new Error("Unauthorized");
  }

  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText);
    throw new Error(`API Error: ${response.status} ${text}`);
  }

  return response.json();
};

// API Methods
export const api = {
  // Portfolios
  portfolios: {
    list: async () => {
      const list = await fetchWithAuth('/portfolios');
      if (!Array.isArray(list) || list.length === 0) return list ?? [];

      // Enrich items that lack present_value using GET /portfolios/{id}
      const enriched = await Promise.all(
        list.map(async (p: Portfolio) => {
          if (typeof p?.present_value === 'number') return p;
          try {
            const detail = await fetchWithAuth(`/portfolios/${p.id}`);
            const pv =
              typeof detail?.present_value === 'number'
                ? detail.present_value
                : Array.isArray(detail?.performance?.['pv:TOTAL'])
                ? detail.performance['pv:TOTAL'].at(-1) ?? null
                : null;
            return { ...p, present_value: pv };
          } catch {
            // If detail fetch fails, return original portfolio untouched
            return p;
          }
        })
      );
      return enriched;
    },
    get: (id: string) => fetchWithAuth(`/portfolios/${id}`),
    create: (data: { name: string; initial_investment: number }) =>
      fetchWithAuth("/portfolios", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      fetchWithAuth(`/portfolios/${id}`, { method: "DELETE" }),
  },

  // Positions
  positions: {
    list: (portfolioId: string) =>
      fetchWithAuth(`/portfolios/${portfolioId}/positions`),
  },

  // Orders
  orders: {
    list: (portfolioId: string) =>
      fetchWithAuth(`/portfolios/${portfolioId}/orders`),
    create: (
      portfolioId: string,
      data: {
        ticker: string;
        quantity: number; // negative for sell
        price: number;
      }
    ) =>
      fetchWithAuth(`/portfolios/${portfolioId}/orders`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  // Market data
  market: {
    quotes: (tickers: string[]) =>
      fetchWithAuth(`/market/quotes?tickers=${tickers.join(",")}`),
    search: (query: string) => fetchWithAuth(`/market/search?q=${query}`),
  },

  // Performance
  performance: {
    get: (
      portfolioId: string,
      period: "1D" | "1W" | "1M" | "YTD" | "1Y" | "ALL"
    ) => fetchWithAuth(`/performance/${portfolioId}?period=${period}`),
  },
};
