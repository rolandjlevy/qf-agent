'use client';

import { Loader2, Trash2, X } from 'lucide-react';
import { secondaryButtonClass } from '@/components/app-page';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// A "Delete this?" confirmation with Cancel and a red confirm button. While `pending`, it can't be closed.
export default function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel, pendingLabel, pending = false, onConfirm }) {
  const button = secondaryButtonClass({ size: 'sm' });
  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent className="rounded-card bg-card">
        <DialogHeader>
          <DialogTitle className="m-0 text-lg font-bold">{title}</DialogTitle>
          <DialogDescription className="m-0 text-muted-foreground">{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <button type="button" data-slot="secondary-action" disabled={pending} className={button}>
              <X className="size-4" strokeWidth={1.75} aria-hidden="true" />
              Cancel
            </button>
          </DialogClose>
          <button
            type="button"
            data-slot="secondary-action"
            onClick={onConfirm}
            disabled={pending}
            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-control border border-destructive bg-destructive px-4 text-sm font-semibold text-white transition-colors hover:bg-red-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            ) : (
              <Trash2 className="size-4" strokeWidth={1.75} aria-hidden="true" />
            )}
            {pending ? pendingLabel : confirmLabel}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
