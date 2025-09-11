"use client";

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
import { formatCurrency, formatDateTime } from '@/lib/format';
import type { Order } from '@/lib/api';

interface OrdersTableProps {
  orders: Order[];
  onExport?: () => void;
}

type SortKey = 'timestamp' | 'ticker' | 'quantity' | 'price';
type SortOrder = 'asc' | 'desc';

export const OrdersTable = ({ orders, onExport }: OrdersTableProps) => {
  const [sortKey, setSortKey] = useState<SortKey>('timestamp');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  const sortedOrders = [...orders].sort((a, b) => {
    let aVal: any;
    let bVal: any;

    switch (sortKey) {
      case 'timestamp':
        aVal = new Date(a.timestamp).getTime();
        bVal = new Date(b.timestamp).getTime();
        break;
      case 'ticker':
        aVal = a.ticker;
        bVal = b.ticker;
        break;
      case 'quantity':
        aVal = Math.abs(a.quantity);
        bVal = Math.abs(b.quantity);
        break;
      case 'price':
        aVal = a.price;
        bVal = b.price;
        break;
      default:
        return 0;
    }

    const multiplier = sortOrder === 'asc' ? 1 : -1;
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return (aVal - bVal) * multiplier;
    }
    return String(aVal).localeCompare(String(bVal)) * multiplier;
  });

  // --- CSV Export (always runs; onExport is optional side-effect)
  const handleExportCsv = () => {
    // Columns exported (keep in sync with UI; include company_name & computed fields)
    const headers = [
      'Timestamp',
      'Ticker',
      'Company',
      'Side',
      'Quantity',
      'Price',
      'Cost',
    ];

    const csvEscape = (val: unknown) => {
      const s = val == null ? '' : String(val);
      const needsQuotes = /[",\n]/.test(s);
      const escaped = s.replace(/"/g, '""');
      return needsQuotes ? `"${escaped}"` : escaped;
    };

    const rows = sortedOrders.map((o) => {
      const side = o.quantity > 0 ? 'Buy' : 'Sell';
      const qty = Math.abs(o.quantity);
      const cost = qty * o.price;

      return [
        o.timestamp,            // raw ISO timestamp for clean data handling
        o.ticker,
        o.company_name ?? '',
        side,
        qty,                    // numeric
        o.price,                // numeric
        cost,                   // numeric
        '',                     // notes placeholder
      ].map(csvEscape).join(',');
    });

    // BOM for Excel compatibility
    const csv = ['\uFEFF' + headers.join(','), ...rows].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `orders_${new Date().toISOString().slice(0, 10)}.csv`;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Orders</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            handleExportCsv(); // always download
            onExport?.();      // optional toast/analytics
          }}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead
                className="font-medium cursor-pointer select-none hover:bg-secondary/50 whitespace-nowrap"
                onClick={() => handleSort('timestamp')}
              >
                <div className="flex items-center gap-1">
                  <span className="hidden md:inline">Timestamp</span>
                  <span className="md:hidden">Date</span>
                  {sortKey === 'timestamp' ? (
                    sortOrder === 'asc' ? (
                      <ArrowUp className="h-3 w-3 text-primary" />
                    ) : (
                      <ArrowDown className="h-3 w-3 text-primary" />
                    )
                  ) : (
                    <ArrowUpDown className="h-3 w-3 text-muted-foreground opacity-50" />
                  )}
                </div>
              </TableHead>
              <TableHead
                className="font-medium cursor-pointer select-none hover:bg-secondary/50"
                onClick={() => handleSort('ticker')}
              >
                <div className="flex items-center gap-1">
                  Ticker
                  {sortKey === 'ticker' ? (
                    sortOrder === 'asc' ? (
                      <ArrowUp className="h-3 w-3 text-primary" />
                    ) : (
                      <ArrowDown className="h-3 w-3 text-primary" />
                    )
                  ) : (
                    <ArrowUpDown className="h-3 w-3 text-muted-foreground opacity-50" />
                  )}
                </div>
              </TableHead>
              <TableHead className="font-medium">Side</TableHead>
              <TableHead
                className="font-medium cursor-pointer select-none hover:bg-secondary/50 text-right"
                onClick={() => handleSort('quantity')}
              >
                <div className="flex items-center justify-end gap-1">
                  Qty
                  {sortKey === 'quantity' ? (
                    sortOrder === 'asc' ? (
                      <ArrowUp className="h-3 w-3 text-primary" />
                    ) : (
                      <ArrowDown className="h-3 w-3 text-primary" />
                    )
                  ) : (
                    <ArrowUpDown className="h-3 w-3 text-muted-foreground opacity-50" />
                  )}
                </div>
              </TableHead>
              <TableHead
                className="font-medium cursor-pointer select-none hover:bg-secondary/50 text-right"
                onClick={() => handleSort('price')}
              >
                <div className="flex items-center justify-end gap-1">
                  Price
                  {sortKey === 'price' ? (
                    sortOrder === 'asc' ? (
                      <ArrowUp className="h-3 w-3 text-primary" />
                    ) : (
                      <ArrowDown className="h-3 w-3 text-primary" />
                    )
                  ) : (
                    <ArrowUpDown className="h-3 w-3 text-muted-foreground opacity-50" />
                  )}
                </div>
              </TableHead>
              <TableHead className="font-medium text-right">Cost</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No orders found
                </TableCell>
              </TableRow>
            ) : (
              sortedOrders.map((order) => {
                const side = order.quantity > 0 ? 'Buy' : 'Sell';
                const qty = Math.abs(order.quantity);
                const cost = qty * order.price;

                return (
                  <TableRow key={order.order_id} className="hover:bg-card-hover">
                    <TableCell className="font-medium">
                      {formatDateTime(order.timestamp)}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{order.ticker}</div>
                        <div className="text-sm text-muted-foreground">{order.company_name}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-2 py-1 text-xs font-medium',
                          side === 'Buy'
                            ? 'bg-success/10 text-success'
                            : 'bg-destructive/10 text-destructive'
                        )}
                      >
                        {side}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">{qty}</TableCell>
                    <TableCell className="text-right">{formatCurrency(order.price)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(cost)}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
