import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatCurrency, formatDateTime } from '@/lib/format';
import type { Order } from '@/lib/api';

interface MobileOrdersViewProps {
  orders: Order[];
}

export const MobileOrdersView = ({ orders }: MobileOrdersViewProps) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground">Recent Orders</h3>
      
      <div className="space-y-3">
        {orders.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-muted-foreground">No orders found</p>
          </Card>
        ) : (
          orders.map((order) => {
            const side = order.quantity > 0 ? 'Buy' : 'Sell';
            const qty = Math.abs(order.quantity);
            const cost = qty * order.price;
            
            return (
              <Card key={order.order_id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-foreground text-lg">
                        {order.ticker}
                      </span>
                      <Badge
                        variant={side === 'Buy' ? 'default' : 'destructive'}
                        className={cn(
                          'text-xs',
                          side === 'Buy' 
                            ? 'bg-success/10 text-success hover:bg-success/20' 
                            : 'bg-destructive/10 text-destructive hover:bg-destructive/20'
                        )}
                      >
                        {side}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{order.company_name}</p>
                  </div>
                  
                  <div className="text-right">
                    <p className="font-semibold text-foreground">
                      {formatCurrency(cost)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {qty} @ {formatCurrency(order.price)}
                    </p>
                  </div>
                </div>
                
                <div className="pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(order.timestamp)}
                  </p>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};