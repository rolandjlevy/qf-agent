'use client';

import { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TRADES_BY_LABEL, tradeLabel } from '@/lib/constants';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

// Picks the trade for this quote only; the profile's trade is just the starting value.
// With no trade yet (`value` null) the chip is outlined in blue; the picker never opens by itself.
export default function TradeChip({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const label = value ? tradeLabel(value) : 'Choose a trade';

  return (
    <div className="flex items-center gap-2">
      <span className="text-[13px] font-medium text-muted-foreground">Quoting as</span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={value ? `Change trade, currently ${label}` : 'Choose a trade'}
            className="group inline-flex h-11 items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {/* The visible pill is 36px; the 44px button around it keeps the tap target at the minimum. */}
            <span
              className={cn(
                'inline-flex h-9 items-center gap-2 rounded-full border bg-card px-3.5 text-sm font-semibold shadow-xs transition-all group-hover:border-brand group-hover:bg-brand-tint',
                value ? 'border-input' : 'border-dashed border-brand text-brand',
              )}
            >
              {value && <span className="size-2 rounded-full bg-brand ring-2 ring-brand-subtle-border" aria-hidden="true" />}
              {label}
              <ChevronDown className="size-[18px] text-muted-foreground" strokeWidth={1.75} aria-hidden="true" />
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 p-0">
          <Command>
            <CommandInput placeholder="Search trades" />
            <CommandList>
              <CommandEmpty>No trade found.</CommandEmpty>
              {TRADES_BY_LABEL.map((slug) => (
                <CommandItem
                  key={slug}
                  value={tradeLabel(slug)}
                  onSelect={() => {
                    onChange(slug);
                    setOpen(false);
                  }}
                  className="min-h-11"
                >
                  {tradeLabel(slug)}
                  <Check
                    className={cn('ml-auto size-4 text-brand', slug === value ? 'opacity-100' : 'opacity-0')}
                    aria-hidden="true"
                  />
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
