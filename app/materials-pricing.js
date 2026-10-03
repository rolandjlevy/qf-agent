'use client'

import { useState, useEffect, useMemo } from 'react'
import { Bookmark, Check, ChevronDown, ExternalLink, Lightbulb, Loader2, RefreshCw, RotateCcw, Search, ShoppingCart, Trash2, X } from 'lucide-react'
import { selectLinePrice, updateLineQuantity, updateLineStatus } from '../lib/actions/quote-prices.js'
import { MERCHANT_CATEGORIES, merchantCategory } from '../lib/pricing/merchant-category.js'
import { extractIntegerQuantity, splitQuantity, joinQuantity } from '../lib/quantity.js'
import { cn } from '@/lib/utils'
import { secondaryButtonClass } from '@/components/app-page'
import ConfirmDialog from '@/components/confirm-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'

const ICON = 'size-4 shrink-0'
const smallButton = secondaryButtonClass({ size: 'sm' })
const dangerButton = secondaryButtonClass({ size: 'sm', tone: 'danger' })
// The brand-blue action for one line (Find prices, Select): smaller than the page's main button.
const blueButton =
  'inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-control border border-brand bg-brand px-3 text-sm font-semibold text-white transition-colors hover:border-brand-hover hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-60'
const fieldClass =
  'h-11 w-full rounded-control border border-input bg-card px-3.5 text-base text-foreground shadow-xs outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand-subtle-border md:text-[15px]'

// A small status tag: green once a line is priced, amber until then.
function StatusTag({ priced }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded border px-1.5 py-px text-[11px] font-semibold tracking-wide whitespace-nowrap',
        priced ? 'border-green-200 bg-green-50 text-success' : 'border-amber-200 bg-amber-50 text-amber-800',
      )}
    >
      {priced && <Check className="size-3" strokeWidth={2.5} aria-hidden="true" />}
      {priced ? 'Priced' : 'Not priced yet'}
    </span>
  )
}

// Zero results / an error fall back to direct merchant search links rather
// than a bare "no results" message — generic search URLs, not fabricated ones.
function merchantSearchLinks(query) {
  const q = encodeURIComponent(query)
  return [
    { label: 'Search on Screwfix', url: `https://www.screwfix.com/search?search=${q}` },
    { label: 'Search on Toolstation', url: `https://www.toolstation.com/search?q=${q}` },
    { label: 'Search on B&Q', url: `https://www.diy.com/search?term=${q}` },
  ]
}

const MERCHANT_FILTERS = ['All', ...MERCHANT_CATEGORIES]

// Unrated products sort last regardless of direction — there's no
// meaningful way to rank a null rating against a real one.
function byRatingDesc(a, b) {
  if (a.rating == null) return b.rating == null ? 0 : 1
  if (b.rating == null) return -1
  return b.rating - a.rating
}

// 'relevance' has no entry, so it falls through as a no-op — whatever order
// the provider returned.
const SORT_COMPARATORS = {
  'price-asc': (a, b) => a.price - b.price,
  'price-desc': (a, b) => b.price - a.price,
  'rating-desc': byRatingDesc,
}

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Best match' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'rating-desc', label: 'Rating: High to Low' },
]

// A pure re-sort of the already-fetched page, unlike the merchant filter
// (which needs a server round-trip — see performSearch).
function sortProducts(products, sortBy) {
  const comparator = SORT_COMPARATORS[sortBy]
  return comparator ? [...products].sort(comparator) : products
}

function formatPrice(product) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: product.currency || 'GBP' }).format(product.price)
}

function formatAmount(amount, currency) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: currency || 'GBP' }).format(amount)
}

function calculateMaterialsTotal(materials, selections, quantities) {
  return materials.reduce((sum, material) => {
    const product = selections[material.name]
    if (!product) return sum
    return sum + extractIntegerQuantity(quantities[material.name]) * product.price
  }, 0)
}

// materialName is the stable (quote_id, material_name) key, never changed by
// the trader — initialQuery is what the search box shows on open, which is
// this line's current display name (its own past rename, if any).
function PricePickerModal({ materialName, initialQuery, quoteId, selectedProduct, onClose, onSelect }) {
  // Reopening on an existing selection re-applies that product's own merchant
  // filter — it may not surface within an unfiltered "All" search's top results.
  const initialMerchantFilter = selectedProduct ? merchantCategory(selectedProduct.merchant) : 'All'
  const [query, setQuery] = useState(initialQuery)
  const [status, setStatus] = useState('idle') // idle | loading | done
  const [products, setProducts] = useState([])
  const [errorMessage, setErrorMessage] = useState(null)
  const [savingId, setSavingId] = useState(null)
  // Separate from errorMessage (a search failure) since a save can fail even
  // while results are showing, where errorMessage's banner isn't rendered.
  const [saveError, setSaveError] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [merchantFilter, setMerchantFilter] = useState(initialMerchantFilter)
  const [sortBy, setSortBy] = useState('relevance')
  // Keeps the filter row visible even when the current filter has zero
  // results. Starts true on reopen — an existing selection is proof results exist.
  const [everFoundResults, setEverFoundResults] = useState(Boolean(selectedProduct))

  // Filtering happens server-side, not client-side — a mixed page could
  // easily contain far fewer than 10 results from any one merchant.
  async function performSearch(merchant) {
    setStatus('loading')
    setErrorMessage(null)
    setProducts([])
    try {
      const res = await fetch('/api/pricing/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, options: merchant === 'All' ? undefined : { merchant } }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorMessage(data.message || 'Price search failed.')
        setProducts([])
      } else {
        const results = data.products || []
        setProducts(results)
        if (results.length > 0) setEverFoundResults(true)
      }
    } catch {
      setErrorMessage('Could not reach the price search service.')
      setProducts([])
    } finally {
      setStatus('done')
    }
  }

  function handleSearchSubmit(e) {
    e?.preventDefault()
    setMerchantFilter('All')
    setEverFoundResults(false)
    performSearch('All')
  }

  function handleFilterClick(filter) {
    setMerchantFilter(filter)
    performSearch(filter)
  }

  // Search once on open, pre-filled with the material name and (see above)
  // the selected product's own merchant filter.
  useEffect(() => {
    performSearch(initialMerchantFilter)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const sortedProducts = useMemo(() => sortProducts(products, sortBy), [products, sortBy])

  async function handleSelect(product) {
    setSavingId(product.id)
    setSaveError(null)
    // A search term the trader edited before finding this product becomes
    // the line's new display name going forward — see selectLinePrice.
    const trimmedQuery = query.trim()
    const nameOverride = trimmedQuery && trimmedQuery !== materialName ? trimmedQuery : undefined
    try {
      await selectLinePrice(quoteId, materialName, product, nameOverride)
      onSelect(product, nameOverride)
      onClose()
    } catch {
      setSaveError('Could not save your selection — try again.')
      setSavingId(null)
    }
  }

  const loading = status === 'loading'
  return (
    <Dialog open onOpenChange={(open) => !open && savingId == null && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[88dvh] flex-col gap-0 overflow-hidden rounded-card bg-card p-0 sm:max-w-[640px]"
      >
        <div className="flex shrink-0 flex-col gap-3 border-b border-border px-4 pt-4 pb-3 md:px-6 md:pt-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-0.5">
              <DialogTitle className="m-0 flex items-center gap-2 text-lg font-bold">
                <ShoppingCart className="size-5 text-brand" strokeWidth={1.75} aria-hidden="true" />
                Find prices
              </DialogTitle>
              <DialogDescription className="m-0 text-[13px] text-muted-foreground">
                Live prices from Google Shopping. Pick one to add it to this line.
              </DialogDescription>
            </div>
            {/* Own close button: shadcn's default is a 16px target, under the 44px minimum. */}
            <DialogClose
              className="-mt-1 -mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              aria-label="Close"
            >
              <X className="size-5" aria-hidden="true" />
            </DialogClose>
          </div>

          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <input
              data-slot="input"
              className={cn(fieldClass, 'flex-1')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search for"
            />
            <button type="submit" data-slot="secondary-action" className={cn(smallButton, 'min-h-11')} disabled={loading}>
              {loading ? (
                <Loader2 className={cn(ICON, 'animate-spin motion-reduce:animate-none')} aria-hidden="true" />
              ) : (
                <Search className={ICON} strokeWidth={1.75} aria-hidden="true" />
              )}
              <span className="hidden sm:inline">{loading ? 'Searching…' : 'Search'}</span>
              <span className="sr-only sm:hidden">Search</span>
            </button>
          </form>

          {everFoundResults && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              {/* One row that scrolls sideways on phones, like the example chips. */}
              <div
                role="group"
                aria-label="Shop"
                className="-mx-4 flex max-w-[100vw] gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden"
              >
                {MERCHANT_FILTERS.map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    data-slot="filter-chip"
                    aria-pressed={filter === merchantFilter}
                    disabled={loading}
                    onClick={() => handleFilterClick(filter)}
                    className={cn(
                      'inline-flex h-9 shrink-0 items-center rounded-full border px-3 text-[13px] font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-60',
                      filter === merchantFilter
                        ? 'border-brand bg-brand-tint text-brand ring-1 ring-brand ring-inset'
                        : 'border-border bg-card text-foreground hover:border-brand',
                    )}
                  >
                    {filter}
                  </button>
                ))}
              </div>
              <div className="relative">
                <select
                  aria-label="Sort results"
                  data-slot="input"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="h-9 cursor-pointer appearance-none rounded-control border border-input bg-card pr-8 pl-3 text-[13px] text-foreground outline-none focus:border-brand focus:ring-2 focus:ring-brand-subtle-border"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 md:px-6 md:py-4" aria-busy={loading}>
          {saveError && (
            <p role="alert" className="m-0 mb-3 text-[13px] text-destructive">
              {saveError}
            </p>
          )}

          {loading && (
            <div role="status" className="flex flex-col gap-2">
              <span className="sr-only">Searching for prices…</span>
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl border border-border-subtle p-3">
                  <Skeleton index={i} className="size-12 shrink-0" />
                  <div className="flex flex-1 flex-col gap-2">
                    <Skeleton index={i} className="h-3.5 w-4/5" />
                    <Skeleton index={i} className="h-3 w-2/5" />
                  </div>
                  <Skeleton index={i} className="h-4 w-12" />
                </div>
              ))}
            </div>
          )}

          {status === 'done' && products.length === 0 && (
            <div className="flex flex-col gap-2 py-2">
              <p className="m-0 text-[15px]">
                {errorMessage || (merchantFilter === 'All' ? `No results for "${query}".` : `No results from ${merchantFilter} for "${query}".`)}
              </p>
              <p className="m-0 text-[13px] text-muted-foreground">
                {merchantFilter === 'All' ? 'Try a direct search instead:' : 'Try another shop, or a direct search:'}
              </p>
              <ul className="m-0 flex list-none flex-col gap-1 p-0">
                {merchantSearchLinks(query).map((link) => (
                  <li key={link.url}>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-brand no-underline hover:text-brand-hover hover:underline"
                    >
                      <ExternalLink className={ICON} strokeWidth={1.75} aria-hidden="true" />
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {status === 'done' && sortedProducts.length > 0 && (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {sortedProducts.map((product) => {
                const isSelected = selectedProduct?.id === product.id
                const isExpanded = expandedId === product.id
                const isSavingThis = savingId === product.id
                const isBusy = savingId != null
                return (
                  <li
                    key={product.id}
                    className={cn(
                      'rounded-xl border transition-colors',
                      isSelected ? 'border-success bg-green-50 ring-1 ring-success ring-inset' : 'border-border bg-card hover:border-brand-subtle-border',
                    )}
                  >
                    <button
                      type="button"
                      data-slot="product-row"
                      onClick={() => setExpandedId(isExpanded ? null : product.id)}
                      aria-expanded={isExpanded}
                      className="flex w-full items-center gap-3 rounded-xl p-3 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                    >
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt="" className="size-12 shrink-0 rounded-md bg-white object-contain" />
                      ) : (
                        <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-surface-muted text-muted-foreground" aria-hidden="true">
                          <ShoppingCart className="size-5" strokeWidth={1.5} />
                        </span>
                      )}
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="line-clamp-2 text-sm leading-snug font-semibold">{product.title}</span>
                        <span className="truncate text-[12.5px] text-muted-foreground">
                          {product.merchant}
                          {product.rating ? ` · ${product.rating}★ (${product.reviewCount ?? 0})` : ''}
                        </span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-1">
                        <span className="text-[15px] font-bold tabular-nums">{formatPrice(product)}</span>
                        {isSelected && (
                          <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-success">
                            <Check className="size-3.5" strokeWidth={2.5} aria-hidden="true" />
                            Selected
                          </span>
                        )}
                      </span>
                      <ChevronDown
                        className={cn('size-5 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none', isExpanded && 'rotate-180')}
                        strokeWidth={1.75}
                        aria-hidden="true"
                      />
                    </button>

                    {isExpanded && (
                      <div className="flex flex-col gap-3 border-t border-border-subtle px-3 pt-3 pb-3 text-[13px] sm:flex-row sm:items-end sm:justify-between">
                        <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                          <dt className="text-muted-foreground">Shop</dt>
                          <dd className="m-0">{product.merchant}</dd>
                          <dt className="text-muted-foreground">Availability</dt>
                          <dd className="m-0">{product.availability === 'unknown' ? 'Not stated' : product.availability}</dd>
                          {product.rating != null && (
                            <>
                              <dt className="text-muted-foreground">Rating</dt>
                              <dd className="m-0">
                                {product.rating}★ ({product.reviewCount ?? 0} reviews)
                              </dd>
                            </>
                          )}
                          {product.productUrl && (
                            <dd className="col-span-2 m-0">
                              <a
                                href={product.productUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex min-h-9 items-center gap-1.5 font-medium text-brand no-underline hover:text-brand-hover hover:underline"
                              >
                                <ExternalLink className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
                                View product page
                              </a>
                            </dd>
                          )}
                        </dl>
                        {isSelected ? (
                          <span className="inline-flex min-h-10 items-center gap-1.5 self-start rounded-control border border-success bg-green-50 px-3.5 text-sm font-semibold text-success sm:self-auto">
                            <Check className={ICON} strokeWidth={2} aria-hidden="true" />
                            Selected
                          </span>
                        ) : (
                          <button
                            type="button"
                            data-slot="primary-action"
                            className={cn(blueButton, 'self-start sm:self-auto')}
                            disabled={isBusy}
                            onClick={() => handleSelect(product)}
                          >
                            {isSavingThis ? (
                              <Loader2 className={cn(ICON, 'animate-spin motion-reduce:animate-none')} aria-hidden="true" />
                            ) : (
                              <ShoppingCart className={ICON} strokeWidth={1.75} aria-hidden="true" />
                            )}
                            {isSavingThis ? 'Saving…' : 'Select'}
                          </button>
                        )}
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Renders MATERIALS & EQUIPMENT lines with Find prices/Delete/Save for later
// controls, reconstructed from the structured identify_materials list.
//
// Delete and "Save for later" are the same per-line `status` field, differing
// only in UI treatment — see lib/schema.sql's quote_line_prices comment.
export default function MaterialsPricing({ quoteId, materials, overridesByName }) {
  const [selections, setSelections] = useState(() =>
    Object.fromEntries(materials.filter((m) => overridesByName[m.name]?.product).map((m) => [m.name, overridesByName[m.name].product])),
  )
  // Only the numeric part is kept as live, editable state — the unit (see
  // quantityUnits below) is fixed per line and re-attached on save.
  const [quantities, setQuantities] = useState(() =>
    Object.fromEntries(
      materials.map((m) => [m.name, splitQuantity(overridesByName[m.name]?.quantity ?? m.quantity ?? '').number]),
    ),
  )
  const [quantityUnits] = useState(() =>
    Object.fromEntries(
      materials.map((m) => {
        const { unit } = splitQuantity(overridesByName[m.name]?.quantity ?? m.quantity ?? '')
        return [m.name, unit]
      }),
    ),
  )
  const [statuses, setStatuses] = useState(() =>
    Object.fromEntries(materials.map((m) => [m.name, overridesByName[m.name]?.status ?? 'active'])),
  )
  // The trader's own rename of a line, keyed by the original (stable)
  // material name — see selectLinePrice/PricePickerModal's nameOverride.
  const [names, setNames] = useState(() =>
    Object.fromEntries(materials.filter((m) => overridesByName[m.name]?.nameOverride).map((m) => [m.name, overridesByName[m.name].nameOverride])),
  )
  const [openMaterial, setOpenMaterial] = useState(null)
  const [lineError, setLineError] = useState(null)
  const [pendingAction, setPendingAction] = useState(null) // { name, status } | null
  const [confirmDelete, setConfirmDelete] = useState(null) // { name, alreadySavedForLater } | null

  if (!materials.length) return null

  const getDisplayName = (materialName) => names[materialName] ?? materialName

  const activeMaterials = materials.filter((m) => statuses[m.name] === 'active')
  const savedMaterials = materials.filter((m) => statuses[m.name] === 'saved_for_later')
  const pricedCount = activeMaterials.filter((material) => selections[material.name]).length
  const allPriced = activeMaterials.length > 0 && pricedCount === activeMaterials.length
  const currency = Object.values(selections)[0]?.currency || 'GBP'
  // Recomputed fresh on every render from live state — no "recalculate"
  // button, nothing to go stale, unpriced materials just don't contribute yet.
  const materialsTotal = calculateMaterialsTotal(activeMaterials, selections, quantities)

  function handleQuantityChange(materialName, value) {
    setQuantities((prev) => ({ ...prev, [materialName]: value }))
  }

  async function handleQuantityBlur(materialName) {
    const currentValue = quantities[materialName] ?? ''
    // The input's type="number"/min="1" only affects native styling — it
    // doesn't stop a decimal or out-of-range value reaching this handler.
    const clampedNumber = String(extractIntegerQuantity(currentValue))
    if (clampedNumber !== currentValue) {
      setQuantities((prev) => ({ ...prev, [materialName]: clampedNumber }))
    }

    const unit = quantityUnits[materialName] ?? ''
    try {
      await updateLineQuantity(quoteId, materialName, joinQuantity(clampedNumber, unit))
    } catch {
      setLineError('Could not save the quantity change — try again.')
    }
  }

  async function handleStatusChange(materialName, status) {
    setPendingAction({ name: materialName, status })
    try {
      await updateLineStatus(quoteId, materialName, status)
      setStatuses((prev) => ({ ...prev, [materialName]: status }))
    } catch {
      setLineError('Could not save that change — try again.')
    } finally {
      setPendingAction(null)
    }
  }

  async function handleConfirmDelete() {
    await handleStatusChange(confirmDelete.name, 'deleted')
    setConfirmDelete(null)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-2.5 rounded-xl border border-brand-subtle-border bg-brand-tint p-3.5 text-[13px] leading-relaxed">
        <Lightbulb className="mt-0.5 size-[18px] shrink-0 text-brand" strokeWidth={1.75} aria-hidden="true" />
        <p className="m-0">
          <strong className="font-semibold">Find prices</strong> for each item to build the materials total. Use{' '}
          <strong className="font-semibold">Save for later</strong> to set an item aside, or{' '}
          <strong className="font-semibold">Delete</strong> to remove it from the quote.
        </p>
      </div>

      {lineError && (
        <p role="alert" className="m-0 text-[13px] text-destructive">
          {lineError}
        </p>
      )}

      <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
        {activeMaterials.map((material) => {
          const selected = selections[material.name]
          const isPending = pendingAction?.name === material.name
          const isSaving = isPending && pendingAction.status === 'saved_for_later'
          const unit = quantityUnits[material.name]
          const name = getDisplayName(material.name)
          return (
            <li
              key={material.name}
              className={cn(
                'flex flex-col gap-3 rounded-xl border p-3.5 md:p-4',
                selected ? 'border-green-200 bg-green-50/50' : 'border-border bg-card',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-[15px] leading-snug font-semibold">{name}</span>
                  {material.notes && <span className="text-[13px] leading-snug text-muted-foreground">{material.notes}</span>}
                </div>
                <StatusTag priced={Boolean(selected)} />
              </div>

              {/* Phones: Qty and the icon buttons, then the price or Find prices full width. Wider: one line. */}
              <div className="flex flex-wrap items-center gap-2">
                <label className="order-1 inline-flex shrink-0 items-center gap-1.5 text-[13px] text-muted-foreground">
                  Qty
                  <input
                    type="number"
                    min="1"
                    step="1"
                    data-slot="input"
                    value={quantities[material.name] ?? ''}
                    onChange={(e) => handleQuantityChange(material.name, e.target.value)}
                    onBlur={() => handleQuantityBlur(material.name)}
                    aria-label={`Quantity for ${name}`}
                    className="h-10 w-16 rounded-control border border-input bg-card px-2.5 text-[15px] text-foreground tabular-nums shadow-xs outline-none focus:border-brand focus:ring-2 focus:ring-brand-subtle-border"
                  />
                  {unit && <span>{unit}</span>}
                </label>

                {selected ? (
                  <span className="order-3 inline-flex min-h-10 w-full min-w-0 items-center gap-2 rounded-control border border-green-200 bg-card py-1 pr-1 pl-3 text-[13px] md:order-2 md:w-auto md:max-w-sm md:flex-1">
                    <span className="min-w-0 flex-1 truncate">
                      <strong className="font-semibold tabular-nums">{formatPrice(selected)}</strong>
                      <span className="text-muted-foreground"> · {selected.merchant}</span>
                    </span>
                    <button
                      type="button"
                      data-slot="secondary-action"
                      onClick={() => setOpenMaterial(material.name)}
                      className="inline-flex min-h-8 shrink-0 items-center gap-1 rounded-md px-2 text-[13px] font-semibold text-brand transition-colors hover:bg-brand-tint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      <RefreshCw className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
                      Change
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    data-slot="primary-action"
                    className={cn(blueButton, 'order-3 w-full md:order-2 md:w-auto')}
                    onClick={() => setOpenMaterial(material.name)}
                  >
                    <Search className={ICON} strokeWidth={1.75} aria-hidden="true" />
                    Find prices
                  </button>
                )}

                <div className="order-2 ml-auto flex shrink-0 gap-2 md:order-3">
                  <button
                    type="button"
                    data-slot="secondary-action"
                    className={cn(smallButton, 'px-2.5 md:px-3')}
                    disabled={isPending}
                    onClick={() => handleStatusChange(material.name, 'saved_for_later')}
                    aria-label={`Save ${name} for later`}
                  >
                    {isSaving ? (
                      <Loader2 className={cn(ICON, 'animate-spin motion-reduce:animate-none')} aria-hidden="true" />
                    ) : (
                      <Bookmark className={ICON} strokeWidth={1.75} aria-hidden="true" />
                    )}
                    <span className="hidden md:inline">{isSaving ? 'Saving…' : 'Save for later'}</span>
                  </button>
                  <button
                    type="button"
                    data-slot="secondary-action"
                    className={cn(dangerButton, 'px-2.5 md:px-3')}
                    disabled={isPending}
                    onClick={() => setConfirmDelete({ name: material.name, alreadySavedForLater: false })}
                    aria-label={`Delete ${name}`}
                  >
                    <Trash2 className={ICON} strokeWidth={1.75} aria-hidden="true" />
                    <span className="hidden md:inline">Delete</span>
                  </button>
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      {activeMaterials.length > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-muted px-4 py-3">
          <div className="flex flex-col">
            <span className="text-[15px] font-semibold">{allPriced ? 'Materials total' : 'Materials total so far'}</span>
            <span className="text-[13px] text-muted-foreground">
              {allPriced ? 'Every item is priced' : `${pricedCount} of ${activeMaterials.length} items priced`}
            </span>
          </div>
          <span className="text-xl font-bold tabular-nums">{formatAmount(materialsTotal, currency)}</span>
        </div>
      )}

      {savedMaterials.length > 0 && (
        <section aria-labelledby="saved-for-later-heading" className="flex flex-col gap-2 pt-1">
          <div className="flex flex-col">
            <h3 id="saved-for-later-heading" className="m-0 text-sm font-semibold">
              Saved for later ({savedMaterials.length})
            </h3>
            <span className="text-[13px] text-muted-foreground">Not included in this quote</span>
          </div>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {savedMaterials.map((material) => {
              const isPending = pendingAction?.name === material.name
              const isReAdding = isPending && pendingAction.status === 'active'
              const name = getDisplayName(material.name)
              return (
                <li
                  key={material.name}
                  className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-input bg-surface-muted px-3.5 py-2.5"
                >
                  <span className="min-w-0 flex-1 text-sm text-muted-foreground">
                    {name}
                    {material.notes ? ` — ${material.notes}` : ''}
                  </span>
                  <button
                    type="button"
                    data-slot="secondary-action"
                    className={smallButton}
                    disabled={isPending}
                    onClick={() => handleStatusChange(material.name, 'active')}
                  >
                    {isReAdding ? (
                      <Loader2 className={cn(ICON, 'animate-spin motion-reduce:animate-none')} aria-hidden="true" />
                    ) : (
                      <RotateCcw className={ICON} strokeWidth={1.75} aria-hidden="true" />
                    )}
                    {isReAdding ? 'Re-adding…' : 'Re-add'}
                  </button>
                  <button
                    type="button"
                    data-slot="secondary-action"
                    className={cn(dangerButton, 'px-2.5')}
                    disabled={isPending}
                    onClick={() => setConfirmDelete({ name: material.name, alreadySavedForLater: true })}
                    aria-label={`Delete ${name}`}
                  >
                    <Trash2 className={ICON} strokeWidth={1.75} aria-hidden="true" />
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {openMaterial && (
        <PricePickerModal
          materialName={openMaterial}
          initialQuery={getDisplayName(openMaterial)}
          quoteId={quoteId}
          selectedProduct={selections[openMaterial]}
          onClose={() => setOpenMaterial(null)}
          onSelect={(product, nameOverride) => {
            setSelections((prev) => ({ ...prev, [openMaterial]: product }))
            if (nameOverride) setNames((prev) => ({ ...prev, [openMaterial]: nameOverride }))
          }}
        />
      )}

      <ConfirmDialog
        open={confirmDelete != null}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title="Remove this item?"
        description={
          confirmDelete && (
            <>
              &ldquo;{getDisplayName(confirmDelete.name)}&rdquo; will be removed from this quote. This can&apos;t be undone
              {confirmDelete.alreadySavedForLater ? '.' : '. Use Save for later instead if you might want it back.'}
            </>
          )
        }
        confirmLabel="Remove item"
        pendingLabel="Removing…"
        pending={pendingAction?.status === 'deleted'}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}
