import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// shadcn/ui's class merger: later Tailwind classes win over conflicting earlier ones.
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
