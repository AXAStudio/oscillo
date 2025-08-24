import { useState } from 'react';
import { Check, ChevronsUpDown, Plus, Briefcase } from 'lucide-react';
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

interface PortfolioSwitcherProps {
  portfolios: Portfolio[];
  selectedPortfolio?: Portfolio;
  onSelect: (portfolio: Portfolio) => void;
  onCreate?: (name: string, initialInvestment: number) => void;
}

export const PortfolioSwitcher = ({
  portfolios,
  selectedPortfolio,
  onSelect,
  onCreate,
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
              <CommandGroup heading="Portfolios">
                {portfolios.map((portfolio) => (
                  <CommandItem
                    key={portfolio.id}
                    value={portfolio.name}
                    onSelect={() => {
                      onSelect(portfolio);
                      setOpen(false);
                    }}
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
                        {formatCurrency(portfolio.present_value || 0)}
                      </div>
                    </div>
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