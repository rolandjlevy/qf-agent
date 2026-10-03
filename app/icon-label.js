import { Loader2 } from 'lucide-react'

// A button's lucide icon and label, for the inline-styled pages. `busy` swaps the icon for a spinner.
export default function IconLabel({ Icon, busy = false, size = 16, children }) {
  const Shown = busy ? Loader2 : Icon
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
      {Shown && (
        <Shown
          size={size}
          strokeWidth={1.75}
          aria-hidden="true"
          className={busy ? 'shrink-0 animate-spin motion-reduce:animate-none' : 'shrink-0'}
        />
      )}
      {children}
    </span>
  )
}
