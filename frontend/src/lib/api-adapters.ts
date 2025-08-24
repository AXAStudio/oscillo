// Adapter functions to transform new API responses to match UI expectations
// Emits data in the exact snake_case shape used by HoldingsTable and other UI components.

import type {
  MarketQuote,
  PerformanceData,
  PositionsResponse,
  OrdersResponse,
  Portfolio,
} from './api';

/** Robust numeric coercion: handles $, %, commas, parentheses, nested {value}/{amount} */
const toNum = (v: unknown, fallback = 0): number => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : fallback;
  if (typeof v === 'bigint') return Number(v);
  if (v && typeof v === 'object') {
    const o: any = v;
    if (o.amount != null) return toNum(o.amount, fallback);
    if (o.value != null) return toNum(o.value, fallback);
  }
  if (typeof v === 'string') {
    const s = v.trim();
    const neg = /^\(.*\)$/.test(s);
    // strip currency, percent, spaces and any non numeric/punct
    const cleaned = s.replace(/[,%$\s]/g, '').replace(/[^0-9.\-]/g, '');
    const n = Number(cleaned);
    if (Number.isFinite(n)) return neg ? -n : n;
    return fallback;
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

/** pick the first finite numeric value from a list of candidate keys */
const pickNum = (obj: any, keys: string[], fallback = 0): number => {
  for (const k of keys) {
    if (obj && Object.prototype.hasOwnProperty.call(obj, k)) {
      const n = toNum(obj[k], NaN);
      if (Number.isFinite(n)) return n;
    }
  }
  return fallback;
};

/** UI-facing position type (snake_case) */
export type UiPosition = {
  id: string;
  ticker: string;
  name?: string;
  quantity: number;
  avg_cost: number;
  current_price: number;
  market_value: number;
  cost_basis: number;
  pnl: number;
  pnl_percentage: number; // -100..+∞
  day_change_percentage: number; // -100..+∞ (0 if unknown)
  weight: number; // 0..100
};

// ---------------------- Market Quotes ----------------------
export function transformMarketQuotes(
  quotesResponse: { [ticker: string]: MarketQuote }
): { [ticker: string]: any } {
  const transformed: { [ticker: string]: any } = {};

  Object.entries(quotesResponse || {}).forEach(([ticker, quote]) => {
    const open = toNum((quote as any).Open, NaN);
    const close = toNum((quote as any).Close, NaN);

    transformed[ticker] = {
      ticker,
      price: close,
      open,
      high: toNum((quote as any).High, NaN),
      low: toNum((quote as any).Low, NaN),
      volume: toNum((quote as any).Volume, 0),
      change: Number.isFinite(close) && Number.isFinite(open) ? close - open : 0,
      changePercent:
        Number.isFinite(close) && Number.isFinite(open) && open !== 0
          ? ((close - open) / open) * 100
          : 0,
      datetime: (quote as any).Datetime,
    };
  });

  return transformed;
}

// ---------------------- Positions ----------------------
export function transformPositions(response: PositionsResponse): UiPosition[] {
  const quotes: Record<string, any> =
    ((response as any)?.quotes as Record<string, any>) ||
    ((response as any)?.market_quotes as Record<string, any>) ||
    {};

  const positionsObj = (response as any)?.positions ?? {};

  const rows: UiPosition[] = Object.entries(positionsObj)
    .filter(([ticker]) => ticker !== 'CA$H')
    .map(([ticker, p]: [string, any]) => {
      const q = quotes[ticker] ?? {};

      // Quantity / Avg Cost
      const quantity = pickNum(p, ['quantity', 'qty', 'shares', 'qty_owned'], 0);
      const avg_cost = pickNum(p, ['avg_cost', 'avgCost', 'avg_price', 'average_price', 'average_cost', 'avg_price_per_share'], 0);

      // Price from position or quote
      const priceMaybe = pickNum(
        { ...p, ...q },
        ['current_price', 'currentPrice', 'price', 'last_price', 'last_trade_price', 'close_price', 'Close'],
        NaN
      );

      // Market value / cost basis fields vary wildly across APIs
      const marketMaybe = pickNum(p, ['market_value', 'marketValue', 'value', 'position_value', 'current_value'], NaN);
      const costBasisMaybe = pickNum(p, ['cost_basis', 'costBasis', 'cost', 'book_value', 'book_cost', 'total_cost'], NaN);

      const market_value = Number.isFinite(marketMaybe)
        ? marketMaybe
        : quantity * (Number.isFinite(priceMaybe) ? priceMaybe : avg_cost);

      const current_price = Number.isFinite(priceMaybe)
        ? priceMaybe
        : quantity
        ? market_value / quantity
        : 0;

      const cost_basis = Number.isFinite(costBasisMaybe)
        ? costBasisMaybe
        : quantity * avg_cost;

      const pnl = market_value - cost_basis;
      const pnl_percentage = cost_basis > 0 ? (pnl / cost_basis) * 100 : 0;

      // Day change % — prefer server, else quote.changePercent, else derive from Open/Close, else 0
      const day_change_percentage = (() => {
        const fromServer = pickNum(p, ['day_change_percentage', 'dayChangePercent', 'changePercent'], NaN);
        if (Number.isFinite(fromServer)) return fromServer;
        const fromQuote = pickNum(q, ['changePercent'], NaN);
        if (Number.isFinite(fromQuote)) return fromQuote;
        const o = pickNum(q, ['open', 'Open'], NaN);
        const c = pickNum(q, ['price', 'Close'], NaN);
        if (Number.isFinite(o) && o !== 0 && Number.isFinite(c)) return ((c - o) / o) * 100;
        return 0;
      })();

      const id = p?.id ?? String(ticker).toUpperCase();

      return {
        id,
        ticker: String(ticker).toUpperCase(),
        name: typeof p?.name === 'string' ? p.name : undefined,
        sector: p?.sector ?? null,
        quantity,
        avg_cost,
        current_price,
        market_value,
        cost_basis,
        pnl,
        pnl_percentage,
        day_change_percentage,
        weight: 0,
      } as UiPosition;
    });

  const totalMV = rows.reduce((sum, r) => sum + (Number.isFinite(r.market_value) ? r.market_value : 0), 0);
  rows.forEach((r) => {
    r.weight = totalMV > 0 ? (r.market_value / totalMV) * 100 : 0;
  });

  return rows;
}

// ---------------------- Orders ----------------------
// helper
const normalizeUtcTimestamp = (t: any): string | null => {
  if (t == null) return null;
  if (typeof t === 'number') {
    // handle seconds vs ms
    const ms = t < 1e12 ? t * 1000 : t;
    return new Date(ms).toISOString();
  }
  if (typeof t === 'string') {
    // if already has timezone (Z or ±HH:MM), keep as-is
    if (/[zZ]|[+-]\d{2}:\d{2}$/.test(t)) return t;
    // assume UTC and mark it so Date() converts to local correctly
    return t + 'Z';
  }
  return String(t);
};

export function transformOrders(response: OrdersResponse): any[] {
  const list = (response as any)?.orders ?? [];
  return list.map((order: any) => {
    const signed = Number(order?.quantity ?? 0);     // keep sign
    const side = signed < 0 ? 'SELL' : 'BUY';
    const ts = normalizeUtcTimestamp(
      order?.timestamp ?? order?.created_at ?? order?.time
    );

    return {
      ...order,
      side,
      type: side,                 // legacy
      quantity: signed,           // keep sign (table derives side/qty correctly)
      abs_quantity: Math.abs(signed),
      timestamp: ts,              // ✅ normalized -> browser will show correct local time
    };
  });
}


// ---------------------- Performance ----------------------
export function transformPerformanceData(data: PerformanceData): any[] {
  if (!(data as any)?.performance) return [];
  const perf: any = (data as any).performance;

  const timestamps: any[] = perf.TIMESTAMP || [];
  const totalValues: number[] = perf['pv:TOTAL'] || [];
  const dailyChangesPct: number[] = perf['dv:TOTAL'] || [];

  return timestamps.map((timestamp, index) => {
    const value = toNum(totalValues[index], 0);
    const prev = index > 0 ? toNum(totalValues[index - 1], value) : value;
    const change = value - prev;
    const changePercent = toNum(dailyChangesPct[index], 0);
    return { timestamp, value, change, changePercent };
  });
}

// ---------------------- Portfolio helpers ----------------------
export function getCashPosition(portfolio: Portfolio): number {
  const positions = (portfolio as any)?.positions as Record<string, any> | undefined;
  if (!positions) return 0;
  return toNum(positions['CA$H']?.value ?? positions['CA$H']?.market_value, 0);
}

export function getTotalInvested(portfolio: Portfolio): number {
  const positions = (portfolio as any)?.positions as Record<string, any> | undefined;
  if (!positions) return 0;

  return Object.entries(positions)
    .filter(([ticker]) => ticker !== 'CA$H')
    .reduce((sum, [, position]) => sum + toNum((position as any)?.value ?? (position as any)?.market_value, 0), 0);
}
