// Adapter functions to transform new API responses to match UI expectations
import type { 
  MarketQuote, 
  PerformanceData, 
  PositionsResponse,
  OrdersResponse,
  Portfolio
} from './api';

// Transform market quotes from new format to UI format
export function transformMarketQuotes(
  quotesResponse: { [ticker: string]: MarketQuote }
): { [ticker: string]: any } {
  const transformed: { [ticker: string]: any } = {};
  
  Object.entries(quotesResponse).forEach(([ticker, quote]) => {
    transformed[ticker] = {
      ticker,
      price: quote.Close,
      open: quote.Open,
      high: quote.High,
      low: quote.Low,
      volume: quote.Volume,
      change: quote.Close - quote.Open,
      changePercent: ((quote.Close - quote.Open) / quote.Open) * 100,
      datetime: quote.Datetime,
    };
  });
  
  return transformed;
}

// Transform positions response to array format
export function transformPositions(response: PositionsResponse): any[] {
  if (!response.positions) return [];
  
  return Object.entries(response.positions)
    .filter(([ticker]) => ticker !== 'CA$H') // Filter out cash positions
    .map(([ticker, position]) => ({
      ticker,
      ...position,
    }));
}

// Transform orders response
export function transformOrders(response: OrdersResponse): any[] {
  if (!response.orders) return [];
  
  return response.orders.map(order => ({
    ...order,
    type: order.quantity > 0 ? 'BUY' : 'SELL',
    quantity: Math.abs(order.quantity),
  }));
}

// Transform performance data to chart format
export function transformPerformanceData(data: PerformanceData): any[] {
  if (!data.performance) return [];
  
  const timestamps = data.performance.TIMESTAMP || [];
  const totalValues = data.performance['pv:TOTAL'] || [];
  const dailyChanges = data.performance['dv:TOTAL'] || [];
  
  return timestamps.map((timestamp, index) => ({
    timestamp,
    value: totalValues[index] || 0,
    change: index > 0 ? totalValues[index] - totalValues[index - 1] : 0,
    changePercent: dailyChanges[index] || 0,
  }));
}

// Calculate cash position value
export function getCashPosition(portfolio: Portfolio): number {
  if (!portfolio.positions) return 0;
  return portfolio.positions['CA$H']?.value || 0;
}

// Calculate total invested (from positions, excluding cash)
export function getTotalInvested(portfolio: Portfolio): number {
  if (!portfolio.positions) return 0;
  
  return Object.entries(portfolio.positions)
    .filter(([ticker]) => ticker !== 'CA$H')
    .reduce((sum, [_, position]) => sum + position.value, 0);
}