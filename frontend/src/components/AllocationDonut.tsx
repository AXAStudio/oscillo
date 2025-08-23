import { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatPercent } from '@/lib/format';
import type { Position } from '@/lib/api';

interface AllocationDonutProps {
  positions: Position[];
  height?: number;
}

type ViewMode = 'asset' | 'sector';

const COLORS = [
  'hsl(var(--chart-primary))',
  'hsl(var(--chart-secondary))',
  'hsl(var(--chart-tertiary))',
  'hsl(var(--chart-quaternary))',
  'hsl(var(--accent))',
  'hsl(var(--muted))',
];

export const AllocationDonut = ({ positions, height = 300 }: AllocationDonutProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>('asset');

  const assetData = positions.map((position) => ({
    name: position.ticker,
    value: position.market_value,
    percentage: position.weight,
  }));

  const sectorData = positions.reduce((acc, position) => {
    const sector = position.sector || 'Other';
    const existing = acc.find((s) => s.name === sector);
    if (existing) {
      existing.value += position.market_value;
      existing.percentage += position.weight;
    } else {
      acc.push({
        name: sector,
        value: position.market_value,
        percentage: position.weight,
      });
    }
    return acc;
  }, [] as Array<{ name: string; value: number; percentage: number }>);

  const data = viewMode === 'asset' ? assetData : sectorData;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload[0]) {
      const data = payload[0];
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-foreground">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            {formatCurrency(data.value)}
          </p>
          <p className="text-sm font-medium text-primary">
            {formatPercent(data.payload.percentage)}
          </p>
        </div>
      );
    }
    return null;
  };

  const renderLabel = (entry: any) => {
    if (entry.percentage < 5) return null;
    return `${entry.name} ${formatPercent(entry.percentage)}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Allocation</h3>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'asset' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('asset')}
          >
            By Asset
          </Button>
          <Button
            variant={viewMode === 'sector' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('sector')}
          >
            By Sector
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
              label={renderLabel}
              labelLine={false}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                  className="hover:opacity-80 transition-opacity cursor-pointer"
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {data.slice(0, 6).map((item, index) => (
            <div key={item.name} className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="text-xs text-muted-foreground truncate">
                {item.name}: {formatPercent(item.percentage)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};