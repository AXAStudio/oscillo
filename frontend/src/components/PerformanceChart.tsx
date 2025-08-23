import { useMemo } from 'react';
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

interface PerformanceChartProps {
  data: PerformancePoint[];
  period: string;
  height?: number;
}

export const PerformanceChart = ({
  data,
  period,
  height = 400,
}: PerformanceChartProps) => {
  const chartData = useMemo(() => {
    return data.map((point) => {
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
      
      return {
        label,
        value: point.value,
        timestamp: point.timestamp,
      };
    });
  }, [data, period]);

  const isPositive = data.length > 0 && data[data.length - 1].value > data[0].value;

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
            {formatCurrency(data.value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full">
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
            tickFormatter={(value) => formatCurrency(value)}
            width={80}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeOpacity: 0.2 }} />
          <Area
            type="monotone"
            dataKey="value"
            stroke={isPositive ? 'hsl(var(--success))' : 'hsl(var(--destructive))'}
            strokeWidth={2}
            fill="url(#colorValue)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};