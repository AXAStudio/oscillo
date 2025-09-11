import { useState } from 'react';
import { Check, ChevronsUpDown, Plus, Briefcase, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Portfolio } from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import { useQueries } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { USE_MOCK_DATA } from '@/App';

interface PortfolioSwitcherProps {
  portfolios: Portfolio[];
  selectedPortfolio?: Portfolio;
  onSelect: (portfolio: Portfolio) => void;
  onCreate?: (name: string, initialInvestment: number) => void;
  onDelete?: (portfolio: Portfolio) => void;
}

export const PortfolioSwitcher = ({
  portfolios,
  selectedPortfolio,
  onSelect,
  onCreate,
  onDelete,
}: PortfolioSwitcherProps) => {
  const [open, setOpen] = useState(false);
  const [showNewPortfolioDialog, setShowNewPortfolioDialog] = useState(false);
  const [newPortfolioName, setNewPortfolioName] = useState('');
  const [newPortfolioInvestment, setNewPortfolioInvestment] = useState('');

  const handleCreate = () => {
    if (onCreate && newPortfolioName && newPortfolioInvestment) {
      onCreate(newPortfolioName, parseFloat(newPortfolioInvestment));
      setNewPortfolioName('');
      setNewPortfolioInvestment('');
      setShowNewPortfolioDialog(false);
    }
  };

  // Fetch cash per portfolio (kept fresh by CashDialog invalidations)
  const cashQueries = useQueries({
    queries: (portfolios ?? []).map((p) => ({
      queryKey: ['cash-position', p.id],
      queryFn: async () => {
        if (!p?.id) return 0;
        if (USE_MOCK_DATA) return 0;
        const { data, error } = await supabase
          .from('positions')
          .select('quantity')
          .eq('portfolio_id', p.id)
          .eq('ticker', 'CA$H')
          .maybeSingle();
        if (error) throw error;
        return data?.quantity || 0;
      },
      enabled: !!p?.id,
      staleTime: 30_000,
    })),
  });

  // Build a quick lookup: portfolioId -> cash
  const cashById: Record<string, number> = {};
  portfolios.forEach((p, i) => {
    const v = cashQueries[i]?.data;
    cashById[p.id] = Number.isFinite(v as number) ? (v as number) : 0;
  });

  return (
    <Dialog open={showNewPortfolioDialog} onOpenChange={setShowNewPortfolioDialog}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="glass"
            role="combobox"
            aria-expanded={open}
            aria-label="Select portfolio"
            className="w-full sm:w-[240px] justify-between text-xs sm:text-sm"
          >
            <div className="flex items-center gap-1.5 sm:gap-2 truncate">
              <Briefcase className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="truncate">
                {selectedPortfolio ? selectedPortfolio.name : 'Select portfolio...'}
              </span>
            </div>
            <ChevronsUpDown className="ml-auto h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] sm:w-[240px] p-0">
          <Command>
            <CommandInput placeholder="Search portfolio..." />
            <CommandList>
              <CommandEmpty>No portfolio found.</CommandEmpty>
              <CommandGroup heading="Portfolios (Total • Securities)">
                {portfolios.map((portfolio) => (
                  <CommandItem
                    key={portfolio.id}
                    value={portfolio.name}
                    onSelect={() => {
                      onSelect(portfolio);
                      setOpen(false);
                    }}
                    className="group"
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4 text-primary',
                        selectedPortfolio?.id === portfolio.id
                          ? 'opacity-100'
                          : 'opacity-0'
                      )}
                    />
                    <div className="flex-1">
                      <div className="font-medium">{portfolio.name}</div>
                      <div className="text-xs text-muted-foreground">
                      {(() => {
                        const cash = cashById[portfolio.id] ?? 0;
                        const securities = portfolio.present_value || 0;
                        const total = securities + cash;
                        // Example display: "$123,456 total • $120,000 securities • $3,456 cash"
                        return `${formatCurrency(total)} • ${formatCurrency(securities)}`; // • ${formatCurrency(cash)}`;
                      })()}
                      </div>
                    </div>
                    {onDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(portfolio);
                          setOpen(false);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create portfolio</DialogTitle>
          <DialogDescription>
            Add a new portfolio to track your investments.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Portfolio name</Label>
            <Input
              id="name"
              placeholder="e.g., Growth Portfolio"
              value={newPortfolioName}
              onChange={(e) => setNewPortfolioName(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="investment">Initial investment</Label>
            <Input
              id="investment"
              type="number"
              placeholder="50000"
              value={newPortfolioInvestment}
              onChange={(e) => setNewPortfolioInvestment(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setShowNewPortfolioDialog(false)}
          >
            Cancel
          </Button>
          <Button onClick={handleCreate}>Create portfolio</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};