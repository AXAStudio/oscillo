// Mock data for development
import type { Portfolio, Position, Order, Quote, PerformancePoint, SearchResult } from './api';

export const mockPortfolios: Portfolio[] = [
  {
    id: '6821b1c8-6f21-42cc-bad3-0a1bf6a1cf86',
    name: 'Growth Portfolio',
    created_at: '2023-01-15T10:00:00Z',
    last_updated: '2024-01-10T15:30:00Z',
    user_id: 'd62c7b0a-4af1-4520-9f35-ec7825d8c227',
    present_value: 62345.67,
    positions: {
      'CA$H': { quantity: 6656, value: 6656 },
      'AAPL': { quantity: 100, value: 18592.00 },
      'MSFT': { quantity: 50, value: 18945.50 },
      'GOOGL': { quantity: 30, value: 4196.70 },
      'NVDA': { quantity: 25, value: 12380.50 },
      'JPM': { quantity: 40, value: 6810.00 },
      'V': { quantity: 15, value: 3911.70 },
    },
  },
  {
    id: '591dd7f5-fff1-4041-ae74-3507688da719',
    name: 'Dividend Income',
    created_at: '2023-06-01T09:00:00Z',
    last_updated: '2024-01-10T15:30:00Z',
    user_id: 'd62c7b0a-4af1-4520-9f35-ec7825d8c227',
    present_value: 31250.00,
    positions: {
      'CA$H': { quantity: 5000, value: 5000 },
      'KO': { quantity: 200, value: 12000.00 },
      'JNJ': { quantity: 50, value: 7850.00 },
      'VZ': { quantity: 150, value: 6400.00 },
    },
  },
];

export const mockPositions: Position[] = [
  {
    id: '1',
    portfolio_id: '6821b1c8-6f21-42cc-bad3-0a1bf6a1cf86',
    ticker: 'AAPL',
    name: 'Apple Inc.',
    quantity: 100,
    avg_cost: 145.50,
    current_price: 185.92,
    market_value: 18592.00,
    pnl: 4042.00,
    pnl_percentage: 27.77,
    day_change: 2.45,
    day_change_percentage: 1.33,
    weight: 29.82,
    sector: 'Technology',
  },
  {
    id: '2',
    portfolio_id: '6821b1c8-6f21-42cc-bad3-0a1bf6a1cf86',
    ticker: 'MSFT',
    name: 'Microsoft Corporation',
    quantity: 50,
    avg_cost: 285.00,
    current_price: 378.91,
    market_value: 18945.50,
    pnl: 4695.50,
    pnl_percentage: 32.97,
    day_change: -1.23,
    day_change_percentage: -0.32,
    weight: 30.39,
    sector: 'Technology',
  },
  {
    id: '3',
    portfolio_id: '6821b1c8-6f21-42cc-bad3-0a1bf6a1cf86',
    ticker: 'GOOGL',
    name: 'Alphabet Inc.',
    quantity: 30,
    avg_cost: 98.50,
    current_price: 139.89,
    market_value: 4196.70,
    pnl: 1241.70,
    pnl_percentage: 42.01,
    day_change: 0.89,
    day_change_percentage: 0.64,
    weight: 6.73,
    sector: 'Technology',
  },
  {
    id: '4',
    portfolio_id: '6821b1c8-6f21-42cc-bad3-0a1bf6a1cf86',
    ticker: 'NVDA',
    name: 'NVIDIA Corporation',
    quantity: 25,
    avg_cost: 220.00,
    current_price: 495.22,
    market_value: 12380.50,
    pnl: 6880.50,
    pnl_percentage: 125.10,
    day_change: 8.45,
    day_change_percentage: 1.74,
    weight: 19.86,
    sector: 'Technology',
  },
  {
    id: '5',
    portfolio_id: '6821b1c8-6f21-42cc-bad3-0a1bf6a1cf86',
    ticker: 'JPM',
    name: 'JPMorgan Chase & Co.',
    quantity: 40,
    avg_cost: 135.00,
    current_price: 170.25,
    market_value: 6810.00,
    pnl: 1410.00,
    pnl_percentage: 26.11,
    day_change: -0.50,
    day_change_percentage: -0.29,
    weight: 10.92,
    sector: 'Financial',
  },
  {
    id: '6',
    portfolio_id: '6821b1c8-6f21-42cc-bad3-0a1bf6a1cf86',
    ticker: 'V',
    name: 'Visa Inc.',
    quantity: 15,
    avg_cost: 210.00,
    current_price: 260.78,
    market_value: 3911.70,
    pnl: 761.70,
    pnl_percentage: 24.18,
    day_change: 1.20,
    day_change_percentage: 0.46,
    weight: 6.27,
    sector: 'Financial',
  },
];

export const mockOrders: Order[] = [
  {
    order_id: 'd3e81485-1ec9-412e-8fab-87cb9a5876db',
    portfolio_id: '6821b1c8-6f21-42cc-bad3-0a1bf6a1cf86',
    ticker: 'AAPL',
    company_name: 'Apple Inc.',
    sector: 'Technology',
    timestamp: '2023-01-15T10:30:00Z',
    quantity: 50,
    price: 142.00,
  },
  {
    order_id: 'a2e81485-1ec9-412e-8fab-87cb9a5876db',
    portfolio_id: '6821b1c8-6f21-42cc-bad3-0a1bf6a1cf86',
    ticker: 'AAPL',
    company_name: 'Apple Inc.',
    sector: 'Technology',
    timestamp: '2023-03-20T14:15:00Z',
    quantity: 50,
    price: 149.00,
  },
  {
    order_id: 'b3e81485-1ec9-412e-8fab-87cb9a5876db',
    portfolio_id: '6821b1c8-6f21-42cc-bad3-0a1bf6a1cf86',
    ticker: 'MSFT',
    company_name: 'Microsoft Corporation',
    sector: 'Technology',
    timestamp: '2023-02-10T09:45:00Z',
    quantity: 50,
    price: 285.00,
  },
  {
    order_id: 'c4e81485-1ec9-412e-8fab-87cb9a5876db',
    portfolio_id: '6821b1c8-6f21-42cc-bad3-0a1bf6a1cf86',
    ticker: 'NVDA',
    company_name: 'NVIDIA Corporation',
    sector: 'Technology',
    timestamp: '2023-04-05T11:20:00Z',
    quantity: 25,
    price: 220.00,
  },
  {
    order_id: 'd5e81485-1ec9-412e-8fab-87cb9a5876db',
    portfolio_id: '6821b1c8-6f21-42cc-bad3-0a1bf6a1cf86',
    ticker: 'GOOGL',
    company_name: 'Alphabet Inc.',
    sector: 'Technology',
    timestamp: '2023-05-15T13:00:00Z',
    quantity: 30,
    price: 98.50,
  },
  {
    order_id: 'e6e81485-1ec9-412e-8fab-87cb9a5876db',
    portfolio_id: '6821b1c8-6f21-42cc-bad3-0a1bf6a1cf86',
    ticker: 'JPM',
    company_name: 'JPMorgan Chase & Co.',
    sector: 'Financial',
    timestamp: '2023-06-01T10:00:00Z',
    quantity: 40,
    price: 135.00,
  },
  {
    order_id: 'f7e81485-1ec9-412e-8fab-87cb9a5876db',
    portfolio_id: '6821b1c8-6f21-42cc-bad3-0a1bf6a1cf86',
    ticker: 'V',
    company_name: 'Visa Inc.',
    sector: 'Financial',
    timestamp: '2023-07-10T15:30:00Z',
    quantity: 15,
    price: 210.00,
  },
];

export const mockQuotes: Quote[] = [
  {
    ticker: 'AAPL',
    name: 'Apple Inc.',
    price: 185.92,
    change: 2.45,
    change_percentage: 1.33,
    volume: 52345678,
    market_cap: 2890000000000,
    sparkline: [183, 184, 183.5, 185, 184.5, 185.5, 185.92],
    last_updated: '2024-01-10T15:30:00Z',
  },
  {
    ticker: 'MSFT',
    name: 'Microsoft Corporation',
    price: 378.91,
    change: -1.23,
    change_percentage: -0.32,
    volume: 23456789,
    market_cap: 2810000000000,
    sparkline: [380, 379.5, 380.2, 379, 378.5, 379.2, 378.91],
    last_updated: '2024-01-10T15:30:00Z',
  },
];

// Generate performance data
export const generatePerformanceData = (period: string): PerformancePoint[] => {
  const now = new Date();
  const points: PerformancePoint[] = [];
  let startDate: Date;
  let dataPoints = 0;
  let interval = 0;

  switch (period) {
    case '1D':
      startDate = new Date(now);
      startDate.setHours(9, 30, 0, 0); // Market open
      dataPoints = 78; // Every 5 minutes for trading hours
      interval = 5 * 60 * 1000;
      break;
    case '1W':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      dataPoints = 7 * 24; // Hourly data
      interval = 60 * 60 * 1000;
      break;
    case '1M':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      dataPoints = 30; // Daily data
      interval = 24 * 60 * 60 * 1000;
      break;
    case 'YTD':
      startDate = new Date(now.getFullYear(), 0, 1); // January 1st of current year
      const daysSinceYearStart = Math.floor((now.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
      dataPoints = Math.min(daysSinceYearStart, 365); // Daily data since Jan 1
      interval = 24 * 60 * 60 * 1000;
      break;
    case '1Y':
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      dataPoints = 52; // Weekly data
      interval = 7 * 24 * 60 * 60 * 1000;
      break;
    case 'ALL':
      startDate = new Date(now.getTime() - 2 * 365 * 24 * 60 * 60 * 1000); // 2 years
      dataPoints = 24; // Monthly data
      interval = 30 * 24 * 60 * 60 * 1000;
      break;
    default:
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      dataPoints = 30;
      interval = 24 * 60 * 60 * 1000;
  }

  // Generate points from start date to now
  let baseValue = 50000;
  const totalDuration = now.getTime() - startDate.getTime();
  const actualInterval = totalDuration / dataPoints;
  
  for (let i = 0; i <= dataPoints; i++) {
    const timestamp = new Date(startDate.getTime() + i * actualInterval);
    const randomChange = (Math.random() - 0.48) * 0.02;
    baseValue = baseValue * (1 + randomChange);
    
    points.push({
      timestamp: timestamp.toISOString(),
      value: baseValue,
      change: i === dataPoints ? baseValue - 50000 : undefined,
      change_percentage: i === dataPoints ? ((baseValue - 50000) / 50000) * 100 : undefined,
    });
  }

  return points;
};

export const mockSearchResults: SearchResult[] = [
  { ticker: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ', type: 'Stock' },
  { ticker: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ', type: 'Stock' },
  { ticker: 'GOOGL', name: 'Alphabet Inc.', exchange: 'NASDAQ', type: 'Stock' },
  { ticker: 'AMZN', name: 'Amazon.com Inc.', exchange: 'NASDAQ', type: 'Stock' },
  { ticker: 'TSLA', name: 'Tesla Inc.', exchange: 'NASDAQ', type: 'Stock' },
  { ticker: 'META', name: 'Meta Platforms Inc.', exchange: 'NASDAQ', type: 'Stock' },
  { ticker: 'NVDA', name: 'NVIDIA Corporation', exchange: 'NASDAQ', type: 'Stock' },
  { ticker: 'JPM', name: 'JPMorgan Chase & Co.', exchange: 'NYSE', type: 'Stock' },
  { ticker: 'V', name: 'Visa Inc.', exchange: 'NYSE', type: 'Stock' },
  { ticker: 'WMT', name: 'Walmart Inc.', exchange: 'NYSE', type: 'Stock' },
];