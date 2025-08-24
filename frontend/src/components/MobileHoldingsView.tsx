import { TrendingUp, TrendingDown } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatCurrency, formatPercent, formatAllocation } from '@/lib/format';
import type { Position } from '@/lib/api';

interface MobileHoldingsViewProps {
  positions: Position[];
}

export const MobileHoldingsView = ({ positions }: MobileHoldingsViewProps) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground">Holdings</h3>
      
      <div className="space-y-3">
        {positions.map((position) => (
          <Card key={position.id} className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground text-lg">
                    {position.ticker}
                  </span>
                  <span
                    className={cn(
                      'flex items-center gap-0.5 text-sm font-medium',
                      position.day_change_percentage > 0 && 'text-success',
                      position.day_change_percentage < 0 && 'text-destructive'
                    )}
                  >
                    {position.day_change_percentage > 0 && (
                      <TrendingUp className="h-3 w-3" />
                    )}
                    {position.day_change_percentage < 0 && (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {formatPercent(Math.abs(position.day_change_percentage))}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{position.name}</p>
              </div>
              
              <div className="text-right">
                <p className="font-semibold text-foreground">
                  {formatCurrency(position.market_value)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatAllocation(position.weight)} of portfolio
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-border">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Quantity</p>
                <p className="font-medium">{position.quantity} shares</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Avg Cost</p>
                <p className="font-medium">{formatCurrency(position.avg_cost)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Current Price</p>
                <p className="font-medium">{formatCurrency(position.current_price)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Total P&L</p>
                <p
                  className={cn(
                    'font-medium',
                    position.pnl > 0 && 'text-success',
                    position.pnl < 0 && 'text-destructive'
                  )}
                >
                  {formatCurrency(position.pnl)} ({formatPercent(position.pnl_percentage)})
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};