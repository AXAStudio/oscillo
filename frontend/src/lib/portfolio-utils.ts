// Utility functions to compute portfolio metrics from API data
import type { Portfolio, Position, Order, MarketQuote, PositionDetail } from './api';

// Calculate portfolio metrics from the new API structure
export function calculatePortfolioMetrics(
  portfolio: Portfolio,
  positions: Position[],
  orders: Order[]
): {
  currentValue: number;
  totalPnl: number;
  totalPnlPercentage: number;
  initialInvestment: number;
} {
  // Calculate current value from portfolio or positions
  const currentValue = portfolio.present_value || 
    positions.reduce((sum, p) => sum + p.market_value, 0);

  // Calculate initial investment from orders
  const initialInvestment = orders
    .filter(o => o.quantity > 0) // Only BUY orders
    .reduce((sum, o) => sum + (o.quantity * o.price), 0);

  // Calculate P&L
  const totalPnl = currentValue - initialInvestment;
  const totalPnlPercentage = initialInvestment > 0 
    ? (totalPnl / initialInvestment) * 100 
    : 0;

  return {
    currentValue,
    totalPnl,
    totalPnlPercentage,
    initialInvestment,
  };
}

// Convert new position format to legacy format for UI compatibility
export function convertPositionData(
  positionsMap: { [ticker: string]: PositionDetail },
  quotes: { [ticker: string]: MarketQuote },
  portfolioValue: number
): Position[] {
  const positions: Position[] = [];
  
  Object.entries(positionsMap).forEach(([ticker, detail], index) => {
    // Skip cash positions
    if (ticker === 'CA$H') return;
    
    const quote = quotes[ticker];
    if (!quote) return;
    
    const currentPrice = quote.Close;
    const marketValue = detail.quantity * currentPrice;
    
    // Calculate average cost from historical data (simplified)
    // In production, this would come from order history
    const avgCost = currentPrice * 0.85; // Mock: assume 15% gain
    const costBasis = detail.quantity * avgCost;
    const pnl = marketValue - costBasis;
    const pnlPercentage = (pnl / costBasis) * 100;
    
    // Calculate day change
    const dayChange = quote.Close - quote.Open;
    const dayChangePercentage = (dayChange / quote.Open) * 100;
    
    // Calculate weight
    const weight = portfolioValue > 0 ? (marketValue / portfolioValue) * 100 : 0;
    
    positions.push({
      id: `pos-${index}`,
      portfolio_id: detail.portfolio_id,
      ticker: detail.ticker,
      name: detail.company_name,
      quantity: detail.quantity,
      avg_cost: avgCost,
      current_price: currentPrice,
      market_value: marketValue,
      pnl,
      pnl_percentage: pnlPercentage,
      day_change: dayChange,
      day_change_percentage: dayChangePercentage,
      weight,
      sector: detail.sector,
    });
  });
  
  return positions;
}

// Convert market quote format
export function convertMarketQuotes(
  quotes: { [ticker: string]: MarketQuote }
): { [ticker: string]: MarketQuote } {
  return quotes;
}

// Convert performance data to points
export function convertPerformanceData(
  performanceData: any
): { timestamp: string; value: number }[] {
  if (!performanceData?.performance) return [];
  
  const timestamps = performanceData.performance.TIMESTAMP || [];
  const values = performanceData.performance['pv:TOTAL'] || [];
  
  return timestamps.map((timestamp: string, index: number) => ({
    timestamp,
    value: values[index] || 0,
  }));
}