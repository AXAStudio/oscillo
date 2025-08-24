import { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatAllocation } from '@/lib/format';
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
        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg font-space-grotesk">
          <p className="font-semibold text-foreground">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            {formatCurrency(data.value)}
          </p>
          <p className="text-sm font-semibold text-primary">
            {formatAllocation(data.payload.percentage)}
          </p>
        </div>
      );
    }
    return null;
  };

  const renderLabel = (entry: any) => {
    if (viewMode !== 'asset' || entry.percentage < 5) return null;
    return entry.name;
  };

  return (
    <div className="rounded-lg border border-border bg-card h-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-border p-3 sm:p-4 gap-2">
        <h3 className="text-base sm:text-lg font-semibold text-foreground">Allocation</h3>
        <div className="flex gap-1 sm:gap-2 w-full sm:w-auto">
          <Button
            variant={viewMode === 'asset' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('asset')}
            className="text-xs sm:text-sm px-2 sm:px-3 flex-1 sm:flex-initial"
          >
            Assets
          </Button>
          <Button
            variant={viewMode === 'sector' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('sector')}
            className="text-xs sm:text-sm px-2 sm:px-3 flex-1 sm:flex-initial"
          >
            Sectors
          </Button>
        </div>
      </div>

      <div className="p-3 sm:p-4">
        <ResponsiveContainer width="100%" height={height}>
          <PieChart className="font-space-grotesk">
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={height > 250 ? 60 : 40}
              outerRadius={height > 250 ? 100 : 70}
              paddingAngle={2}
              dataKey="value"
              label={renderLabel}
              labelLine={false}
              className="font-space-grotesk font-semibold"
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

        <div className="mt-3 sm:mt-4 grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2">
          {data.slice(0, 6).map((item, index) => (
            <div key={item.name} className="flex items-center gap-2">
              <div
                className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="text-xs text-muted-foreground truncate font-space-grotesk font-medium">
                {item.name}: {formatAllocation(item.percentage)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};