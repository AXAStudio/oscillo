import { useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';

interface OrderFormProps {
  ticker?: string;
  currentPrice?: number;
  onSubmit?: (order: {
    ticker: string;
    type: 'BUY' | 'SELL';
    quantity: number;
    price: number;
    notes?: string;
  }) => void;
}

export const OrderForm = ({ ticker = '', currentPrice = 0, onSubmit }: OrderFormProps) => {
  const [orderType, setOrderType] = useState<'BUY' | 'SELL'>('BUY');
  const [orderTicker, setOrderTicker] = useState(ticker);
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState(currentPrice.toString());
  const [notes, setNotes] = useState('');
  const { toast } = useToast();

  const totalValue = parseFloat(quantity || '0') * parseFloat(price || '0');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!orderTicker || !quantity || !price) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    onSubmit?.({
      ticker: orderTicker,
      type: orderType, // Keep for backward compatibility
      quantity: orderType === 'SELL' ? -parseFloat(quantity) : parseFloat(quantity),
      price: parseFloat(price),
      notes: notes || undefined,
    });

    // Reset form
    setQuantity('');
    setNotes('');
    
    toast({
      title: 'Order Placed',
      description: `${orderType} order for ${quantity} shares of ${orderTicker} at ${formatCurrency(parseFloat(price))}`,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Tabs value={orderType} onValueChange={(v) => setOrderType(v as 'BUY' | 'SELL')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="BUY" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Buy
          </TabsTrigger>
          <TabsTrigger value="SELL" className="gap-2">
            <TrendingDown className="h-4 w-4" />
            Sell
          </TabsTrigger>
        </TabsList>

        <TabsContent value={orderType} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="ticker">Ticker</Label>
            <Input
              id="ticker"
              placeholder="e.g., AAPL"
              value={orderTicker}
              onChange={(e) => setOrderTicker(e.target.value.toUpperCase())}
              className="bg-card"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                placeholder="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="bg-card"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Price</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="bg-card"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add notes about this order..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="bg-card resize-none"
              rows={3}
            />
          </div>

          <div className="rounded-lg border border-border bg-card/50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Value</span>
              <span className="text-lg font-semibold text-foreground">
                {formatCurrency(totalValue)}
              </span>
            </div>
          </div>

          <Button
            type="submit"
            className={cn(
              'w-full',
              orderType === 'BUY' ? 'bg-success hover:bg-success/90' : 'bg-destructive hover:bg-destructive/90'
            )}
          >
            Place {orderType === 'BUY' ? 'Buy' : 'Sell'} Order
          </Button>
        </TabsContent>
      </Tabs>
    </form>
  );
};