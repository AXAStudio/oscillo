import { useState, useEffect, useCallback } from 'react';
import { Search, TrendingUp, TrendingDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { formatCurrency, formatPercent } from '@/lib/format';
import type { SearchResult, Quote } from '@/lib/api';

interface TickerSearchProps {
  onSelect?: (ticker: string) => void;
  searchResults?: SearchResult[];
  quotes?: Quote[];
  onSearch?: (query: string) => void;
}

export const TickerSearch = ({
  onSelect,
  searchResults = [],
  quotes = [],
  onSearch,
}: TickerSearchProps) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Debounced search
  useEffect(() => {
    if (!onSearch) return;
    const timer = setTimeout(() => {
      if (query.length > 0) {
        onSearch(query);
        setIsOpen(true);
      } else {
        setIsOpen(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, onSearch]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < searchResults.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (searchResults[selectedIndex]) {
            handleSelect(searchResults[selectedIndex].ticker);
          }
          break;
        case 'Escape':
          setIsOpen(false);
          break;
      }
    },
    [isOpen, searchResults, selectedIndex]
  );

  const handleSelect = (ticker: string) => {
    setQuery('');
    setIsOpen(false);
    setSelectedIndex(0);
    onSelect?.(ticker);
  };

  const getQuoteForTicker = (ticker: string) => {
    return quotes.find((q) => q.ticker === ticker);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search ticker..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length > 0 && setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          className="pl-9 bg-card border-border"
        />
      </div>

      {isOpen && searchResults.length > 0 && (
        <div className="absolute top-full mt-2 w-full z-50 rounded-lg border border-border bg-popover shadow-lg animate-fade-in">
          <ScrollArea className="max-h-[320px]">
            {searchResults.map((result, index) => {
              const quote = getQuoteForTicker(result.ticker);
              const isSelected = index === selectedIndex;

              return (
                <button
                  key={result.ticker}
                  className={cn(
                    'w-full px-4 py-3 text-left hover:bg-secondary/50 transition-colors',
                    isSelected && 'bg-secondary/50'
                  )}
                  onClick={() => handleSelect(result.ticker)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">
                          {result.ticker}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {result.exchange}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {result.name}
                      </div>
                    </div>

                    {quote && (
                      <div className="text-right">
                        <div className="font-medium text-foreground">
                          {formatCurrency(quote.price)}
                        </div>
                        <div
                          className={cn(
                            'flex items-center gap-1 text-sm',
                            quote.change > 0 && 'text-success',
                            quote.change < 0 && 'text-destructive',
                            quote.change === 0 && 'text-muted-foreground'
                          )}
                        >
                          {quote.change > 0 && (
                            <TrendingUp className="h-3 w-3" />
                          )}
                          {quote.change < 0 && (
                            <TrendingDown className="h-3 w-3" />
                          )}
                          <span>{formatPercent(quote.change_percentage)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </ScrollArea>
        </div>
      )}
    </div>
  );
};