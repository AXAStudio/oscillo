import { ArrowUpIcon, ArrowDownIcon, InfoIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency, formatPercent } from '@/lib/format';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface KpiCardProps {
  title: string;
  value: number | string;
  change?: number;
  changeType?: 'currency' | 'percent';
  tooltip?: string;
  format?: 'currency' | 'percent' | 'number';
  className?: string;
}

export const KpiCard = ({
  title,
  value,
  change,
  changeType = 'percent',
  tooltip,
  format = 'currency',
  className,
}: KpiCardProps) => {
  const formattedValue = 
    typeof value === 'number'
      ? format === 'currency'
        ? formatCurrency(value)
        : format === 'percent'
        ? formatPercent(value)
        : value.toLocaleString()
      : value;

  const isPositive = change && change > 0;
  const isNegative = change && change < 0;

  return (
    <div
      className={cn(
        'relative bg-card border border-border rounded-lg p-4 sm:p-6 transition-all hover:bg-card-hover hover:shadow-lg',
        className
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs sm:text-sm font-medium text-muted-foreground">
          {title}
        </span>
        {tooltip && (
          <Tooltip>
            <TooltipTrigger asChild>
              <InfoIcon className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">{tooltip}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      
      <div className="flex items-end justify-between">
        <div className="text-xl sm:text-2xl font-bold text-foreground">
          {formattedValue}
        </div>
        
        {change !== undefined && (
          <div
            className={cn(
              'flex items-center gap-0.5 sm:gap-1 text-xs sm:text-sm font-medium',
              isPositive && 'text-success',
              isNegative && 'text-destructive',
              !isPositive && !isNegative && 'text-muted-foreground'
            )}
          >
            {isPositive && <ArrowUpIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3" />}
            {isNegative && <ArrowDownIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3" />}
            <span className="whitespace-nowrap">
              {changeType === 'currency'
                ? formatCurrency(Math.abs(change))
                : formatPercent(Math.abs(change))}
            </span>
          </div>
        )}
      </div>
      
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent rounded-lg pointer-events-none" />
    </div>
  );
};