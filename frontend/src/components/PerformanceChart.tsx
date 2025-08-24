import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatCurrency, formatPercent } from '@/lib/format';
import type { PerformancePoint } from '@/lib/api';
import { Button } from '@/components/ui/button';

interface PerformanceChartProps {
  data: PerformancePoint[];
  period: string;
  height?: number;
  viewMode: 'value' | 'percentage';
  onViewModeChange: (mode: 'value' | 'percentage') => void;
}

export const PerformanceChart = ({
  data,
  period,
  height = 400,
  viewMode,
  onViewModeChange,
}: PerformanceChartProps) => {
  
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    // Calculate percentage changes from the first value
    const firstValue = data[0].value;
    
    return data.map((point, index) => {
      const date = new Date(point.timestamp);
      let label = '';
      
      switch (period) {
        case '1D':
          label = date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
          });
          break;
        case '1W':
          label = date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'numeric',
            day: 'numeric',
          });
          break;
        default:
          label = date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          });
      }
      
      const percentageChange = firstValue !== 0 
        ? ((point.value - firstValue) / firstValue) * 100
        : 0;
      
      return {
        label,
        value: point.value,
        percentageChange,
        timestamp: point.timestamp,
      };
    });
  }, [data, period]);

  const isPositive = viewMode === 'value' 
    ? (data.length > 0 && data[data.length - 1].value > data[0].value)
    : (chartData.length > 0 && chartData[chartData.length - 1].percentageChange > 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload[0]) {
      const data = payload[0].payload;
      const date = new Date(data.timestamp);
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
          <p className="text-xs text-muted-foreground mb-1">
            {date.toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </p>
          <p className="text-sm font-semibold text-foreground">
            {viewMode === 'value' 
              ? formatCurrency(data.value)
              : formatPercent(data.percentageChange)}
          </p>
          {viewMode === 'value' && (
            <p className={`text-xs mt-1 ${data.percentageChange >= 0 ? 'text-success' : 'text-destructive'}`}>
              {formatPercent(data.percentageChange)}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor={isPositive ? 'hsl(var(--success))' : 'hsl(var(--destructive))'}
                stopOpacity={0.3}
              />
              <stop
                offset="95%"
                stopColor={isPositive ? 'hsl(var(--success))' : 'hsl(var(--destructive))'}
                stopOpacity={0}
              />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(var(--chart-grid))"
            opacity={0.3}
          />
          <XAxis
            dataKey="label"
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => viewMode === 'value' ? formatCurrency(value) : `${value.toFixed(2)}%`}
            width={80}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeOpacity: 0.2 }} />
          <Area
            type="monotone"
            dataKey={viewMode === 'value' ? 'value' : 'percentageChange'}
            stroke={isPositive ? 'hsl(var(--success))' : 'hsl(var(--destructive))'}
            strokeWidth={2}
            fill="url(#colorValue)"
          />
      </AreaChart>
    </ResponsiveContainer>
  );
};