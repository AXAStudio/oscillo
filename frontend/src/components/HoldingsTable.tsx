import { useState } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrency, formatPercent, formatNumber, formatAllocation } from '@/lib/format';
import type { Position } from '@/lib/api';

interface HoldingsTableProps {
  positions: Position[];
  onExport?: () => void;
}

type SortKey = keyof Position;
type SortOrder = 'asc' | 'desc';

export const HoldingsTable = ({ positions, onExport }: HoldingsTableProps) => {
  const [sortKey, setSortKey] = useState<SortKey>('market_value');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
  

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  const sortedPositions = [...positions].sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    if (aVal === undefined || bVal === undefined) return 0;

    const multiplier = sortOrder === 'asc' ? 1 : -1;
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return (aVal - bVal) * multiplier;
    }
    return String(aVal).localeCompare(String(bVal)) * multiplier;
  });

  const columns = [
    { key: 'ticker', label: 'Ticker', sortable: true },
    { key: 'name', label: 'Name', sortable: true, hideable: true },
    // NEW: Sector column (sortable + hideable)
    { key: 'sector', label: 'Sector', sortable: true, hideable: true },
    { key: 'quantity', label: 'Qty', sortable: true },
    { key: 'avg_cost', label: 'Avg Cost', sortable: true, hideable: true },
    { key: 'current_price', label: 'Price', sortable: true },
    { key: 'market_value', label: 'Market Value', sortable: true },
    { key: 'pnl', label: 'P&L $', sortable: true },
    { key: 'pnl_percentage', label: 'P&L %', sortable: true },
    { key: 'day_change_percentage', label: 'Day %', sortable: true },
    { key: 'weight', label: 'Weight', sortable: true, hideable: true },
  ] as const;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Holdings</h3>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onExport}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-x-auto">
        <Table className="min-w-[760px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {columns.map((column) => {
                if (column.hideable && hiddenColumns.has(column.key)) return null;
                return (
                  <TableHead
                    key={column.key}
                    className={cn(
                      'font-medium whitespace-nowrap',
                      column.sortable && 'cursor-pointer select-none hover:bg-secondary/50'
                    )}
                    onClick={() => column.sortable && handleSort(column.key as SortKey)}
                  >
                    <div className="flex items-center gap-1">
                      {column.label}
                      {column.sortable && (
                        sortKey === column.key ? (
                          sortOrder === 'asc' ? (
                            <ArrowUp className="h-3 w-3 text-primary" />
                          ) : (
                            <ArrowDown className="h-3 w-3 text-primary" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3 text-muted-foreground opacity-50" />
                        )
                      )}
                    </div>
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>

          <TableBody>
            {sortedPositions.map((position) => (
              <TableRow key={position.id} className="hover:bg-card-hover">
                <TableCell className="font-medium">{position.ticker}</TableCell>

                {!hiddenColumns.has('name') && (
                  <TableCell className="text-muted-foreground">
                    {position.name}
                  </TableCell>
                )}

                {/* NEW: Sector cell */}
                {!hiddenColumns.has('sector') && (
                  <TableCell className="text-muted-foreground">
                    {position.sector ?? '—'}
                  </TableCell>
                )}

                <TableCell>{formatNumber(position.quantity, 0)}</TableCell>

                {!hiddenColumns.has('avg_cost') && (
                  <TableCell>{formatCurrency(position.avg_cost)}</TableCell>
                )}

                <TableCell>{formatCurrency(position.current_price)}</TableCell>

                <TableCell className="font-medium">
                  {formatCurrency(position.market_value)}
                </TableCell>

                <TableCell
                  className={cn(
                    'font-medium',
                    position.pnl > 0 && 'text-success',
                    position.pnl < 0 && 'text-destructive'
                  )}
                >
                  {formatCurrency(position.pnl)}
                </TableCell>

                <TableCell
                  className={cn(
                    'font-medium',
                    position.pnl_percentage > 0 && 'text-success',
                    position.pnl_percentage < 0 && 'text-destructive'
                  )}
                >
                  {formatPercent(position.pnl_percentage)}
                </TableCell>

                <TableCell
                  className={cn(
                    position.day_change_percentage > 0 && 'text-success',
                    position.day_change_percentage < 0 && 'text-destructive'
                  )}
                >
                  {formatPercent(position.day_change_percentage)}
                </TableCell>

                {!hiddenColumns.has('weight') && (
                  <TableCell>{formatAllocation(position.weight)}</TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
