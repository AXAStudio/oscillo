import { useState, useEffect, useRef } from 'react';
import { TrendingUp, TrendingDown, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';
import { api, type QuotesResponse } from '@/lib/api';

interface OrderFormProps {
  ticker?: string;
  onSubmit?: (order: {
    ticker: string;
    type: 'BUY' | 'SELL';
    quantity: number;
    price: number;
    notes?: string;
  }) => void;
}

export const OrderForm = ({ ticker = '', onSubmit }: OrderFormProps) => {
  const [orderType, setOrderType] = useState<'BUY' | 'SELL'>('BUY');
  const [orderTicker, setOrderTicker] = useState(ticker);
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const { toast } = useToast();

  const totalValue = parseFloat(quantity || '0') * (price || 0);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const parsePrice = (res: QuotesResponse | undefined, tkr: string) => {
    const q = res?.[tkr];
    const p =
      typeof q?.price === 'number' && !Number.isNaN(q.price)
        ? q.price
        : typeof q?.Close === 'number' && !Number.isNaN(q.Close)
        ? q.Close
        : undefined;
    return p;
  };

  const fetchPrice = async (tkr: string) => {
    if (!tkr) return;
    setIsFetching(true);
    try {
      const res = (await api.market.quotes([tkr])) as QuotesResponse;
      const newPrice = parsePrice(res, tkr);
      if (typeof newPrice === 'number') {
        setPrice(newPrice);
      } else {
        throw new Error('No price in response');
      }
    } catch (err) {
      console.error(err);
      toast({
        title: 'Error fetching price',
        description: `Could not fetch latest market price for ${tkr}.`,
        variant: 'destructive',
      });
    } finally {
      setIsFetching(false);
    }
  };

  // Debounced fetch when ticker changes (prevents fetch-per-keystroke)
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (!orderTicker) return;

    // Accept tickers like BRK.B, RDS-A, $SPY
    const valid = /^[A-Z.$-]+$/.test(orderTicker);
    if (!valid) return;

    debounceTimer.current = setTimeout(() => {
      fetchPrice(orderTicker);
    }, 800);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [orderTicker]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!orderTicker || !quantity || !price) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in ticker and quantity. Price is fetched automatically.',
        variant: 'destructive',
      });
      return;
    }

    onSubmit?.({
      ticker: orderTicker,
      type: orderType,
      quantity: orderType === 'SELL' ? -parseFloat(quantity) : parseFloat(quantity),
      price,
      notes: notes || undefined,
    });

    // Keep ticker to speed up multiple orders
    setQuantity('');
    setNotes('');

    toast({
      title: 'Order Placed',
      description: `${orderType} order for ${quantity} shares of ${orderTicker} at ${formatCurrency(price)}`,
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
            <div className="flex items-center gap-2">
              <Input
                id="ticker"
                placeholder="e.g., AAPL"
                value={orderTicker}
                onChange={(e) => setOrderTicker(e.target.value.toUpperCase())}
                onBlur={() => fetchPrice(orderTicker)} // fetch on blur too
                className="bg-card"
                required
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => fetchPrice(orderTicker)}
                disabled={!orderTicker || isFetching}
                className="shrink-0"
                title="Refresh price"
              >
                <RefreshCcw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              inputMode="numeric"
              placeholder="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="bg-card"
              required
            />
          </div>

          <div className="rounded-lg border border-border bg-card/50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Market Price</span>
              <span className="text-lg font-semibold text-foreground">
                {isFetching ? 'Loading…' : price ? formatCurrency(price) : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-sm text-muted-foreground">Total Value</span>
              <span className="text-lg font-semibold text-foreground">
                {formatCurrency(totalValue)}
              </span>
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

          <Button
            type="submit"
            className={cn(
              'w-full',
              orderType === 'BUY'
                ? 'bg-success hover:bg-success/90'
                : 'bg-destructive hover:bg-destructive/90'
            )}
          >
            Place {orderType === 'BUY' ? 'Buy' : 'Sell'} Order
          </Button>
        </TabsContent>
      </Tabs>
    </form>
  );
};
