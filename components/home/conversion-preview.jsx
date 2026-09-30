import { ArrowDown, Check, Copy, ImageIcon, Search } from 'lucide-react';

// The same consumer unit job as the quote below (lib/sample-quotes.json's electrician sample).
const CUSTOMER_MESSAGE =
  "Hi, we've still got the old fuse box with the pull-out fuses under the stairs. Could you quote to swap it for a modern one? Three-bed semi, about 8 circuits.";
const MATERIALS = ['Consumer unit 10-way RCBO', 'RCBO 32A Type A × 2', 'Surge protection device'];
const SECTIONS = ['Scope of work', 'Assumptions', 'Exclusions', 'Next steps'];

// A drawn example of the flow, not a live widget: the buttons in it are decoration.
export default function ConversionPreview() {
  return (
    <figure
      aria-label="Example: a customer's message turned into a draft quote"
      className="m-0 w-full rounded-[20px] border border-border bg-card p-4 shadow-card md:p-6"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="m-0 flex items-center gap-2 text-sm font-semibold">
          <span className="size-2 rounded-full bg-success" aria-hidden="true" />
          From message to quote
        </p>
        <span className="rounded-full bg-brand-tint px-2.5 py-1 text-[11px] font-semibold tracking-[0.08em] text-brand uppercase">
          Example
        </span>
      </div>

      {/* Stacked on every width: the hero gives it one column beside the copy. */}
      <div className="flex flex-col gap-3">
        {/* The customer's message, as it arrives on the trader's phone. */}
        <div className="flex flex-col gap-2 rounded-card bg-surface-muted p-4">
          <p className="m-0 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Sarah</span> · Today 09:14
          </p>
          <p className="m-0 rounded-2xl rounded-tl-sm border border-border-subtle bg-card p-3.5 text-[15px] leading-relaxed">
            {CUSTOMER_MESSAGE}
          </p>
          <span className="inline-flex items-center gap-1.5 self-start rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <ImageIcon className="size-3.5" aria-hidden="true" />1 photo attached
          </span>
        </div>

        <div className="flex justify-center" aria-hidden="true">
          <span className="inline-flex size-9 items-center justify-center rounded-full bg-brand text-white shadow-cta">
            <ArrowDown className="size-4" />
          </span>
        </div>

        {/* The drafted quote: materials unpriced until the trader picks prices. */}
        <div className="flex flex-col gap-3 rounded-card border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="m-0 text-base font-semibold">Consumer unit replacement</p>
              <p className="m-0 text-xs text-muted-foreground">Draft quote · Electrician</p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-success">
              <Check className="size-3.5" aria-hidden="true" />
              Ready
            </span>
          </div>

          <div>
            <p className="m-0 mb-1.5 text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
              Materials
            </p>
            <ul className="m-0 flex list-none flex-col divide-y divide-border-subtle p-0">
              {MATERIALS.map((name) => (
                <li key={name} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="min-w-0">{name}</span>
                  <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-brand">
                    <Search className="size-3.5" aria-hidden="true" />
                    Find prices
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
            {SECTIONS.map((section) => (
              <li
                key={section}
                className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-2.5 py-1 text-xs text-muted-foreground"
              >
                <Check className="size-3 text-success" aria-hidden="true" />
                {section}
              </li>
            ))}
          </ul>

          <span
            aria-hidden="true"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-button bg-foreground text-sm font-semibold text-white"
          >
            <Copy className="size-4" />
            Copy quote
          </span>
        </div>
      </div>
    </figure>
  );
}
