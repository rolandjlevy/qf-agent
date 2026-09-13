'use client'

import { useState, useEffect, useMemo } from 'react'
import { buttonStyle } from './button-style.js'
import { selectLinePrice, updateLineQuantity, updateLineStatus } from '../lib/actions/quote-prices.js'
import { MERCHANT_CATEGORIES } from '../lib/pricing/merchant-category.js'

const overlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '1rem',
  zIndex: 1000,
}

const dialogStyle = {
  position: 'relative',
  background: '#fff',
  borderRadius: 8,
  width: '100%',
  maxWidth: 640,
  maxHeight: '85vh',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
}

const dialogHeaderStyle = {
  flexShrink: 0,
  padding: '1.25rem 1.25rem 0.75rem',
  borderBottom: '1px solid #eee',
}

const dialogResultsStyle = {
  flex: 1,
  overflowY: 'auto',
  padding: '0.75rem 1.25rem 1.25rem',
}

const closeButtonStyle = {
  position: 'absolute',
  top: '0.75rem',
  right: '0.75rem',
  width: '2rem',
  height: '2rem',
  lineHeight: '2rem',
  padding: 0,
  textAlign: 'center',
  border: '1px solid #ddd',
  borderRadius: '50%',
  background: '#fff',
  cursor: 'pointer',
  fontSize: '1.1rem',
}

const inputStyle = {
  flex: 1,
  padding: '0.5rem',
  border: '1px solid #ccc',
  borderRadius: 6,
  fontSize: '1rem',
}

// Longhand properties only (no `padding`/`border`/`borderRadius` shorthand)
// — a browser parsing SSR'd HTML expands those shorthands into their
// longhand equivalents on the element's live style object, which then
// mismatches React's hydration check against this object's shorthand keys
// and logs a (harmless, but noisy) hydration-mismatch warning.
const quantityInputStyle = {
  width: '4rem',
  paddingTop: '0.2rem',
  paddingBottom: '0.2rem',
  paddingLeft: '0.4rem',
  paddingRight: '0.4rem',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: '#ccc',
  borderTopLeftRadius: 4,
  borderTopRightRadius: 4,
  borderBottomLeftRadius: 4,
  borderBottomRightRadius: 4,
  fontSize: '0.85rem',
}

const quantityLabelStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.3rem',
  fontSize: '0.85rem',
  color: '#444',
}

const smallButtonStyle = {
  ...buttonStyle,
  padding: '0.1rem 0.5rem',
  fontSize: '0.75rem',
}

const dangerButtonStyle = {
  ...smallButtonStyle,
  color: 'crimson',
}

const savedForLaterRowStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.6rem',
  marginBottom: '0.4rem',
  flexWrap: 'wrap',
  color: '#666',
}

const productCardStyle = {
  border: '1px solid #eee',
  borderRadius: 6,
  padding: '0.5rem 0.75rem',
  marginBottom: '0.5rem',
  background: '#fafafa',
}

const selectedProductCardStyle = {
  ...productCardStyle,
  border: '2px solid #2e7d46',
  background: '#f2faf5',
}

const productSummaryRowStyle = {
  display: 'flex',
  gap: '0.75rem',
  alignItems: 'center',
  cursor: 'pointer',
}

const productDetailStyle = {
  marginTop: '0.6rem',
  paddingTop: '0.6rem',
  borderTop: '1px solid #e0e0e0',
  fontSize: '0.9rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.3rem',
}

const filterRowStyle = {
  display: 'flex',
  gap: '0.4rem',
  flexWrap: 'wrap',
  marginBottom: '0.75rem',
}

const filterButtonStyle = {
  ...buttonStyle,
  padding: '0.25rem 0.7rem',
  fontSize: '0.8rem',
  borderRadius: 999,
}

const activeFilterButtonStyle = {
  ...filterButtonStyle,
  background: '#2e2e2e',
  border: '1px solid #2e2e2e',
  color: '#fff',
}

const sortSelectStyle = {
  padding: '0.3rem 0.5rem',
  border: '1px solid #ccc',
  borderRadius: 6,
  fontSize: '0.8rem',
  background: '#fff',
  color: '#333',
}

const badgeStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.4rem',
  border: '1px solid #cde7d8',
  background: '#f2faf5',
  borderRadius: 6,
  padding: '0.25rem 0.6rem',
  fontSize: '0.85rem',
}

// Zero results / an error both fall back to direct merchant search links
// (per the brief's fallback UX decision) rather than just a bare
// "no results" message — these are generic search-page URLs, not fabricated
// product links.
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

// Keyed by the same values SORT_OPTIONS exposes in the dropdown; 'relevance'
// has no entry, so it falls through sortProducts' lookup as a no-op — it's
// whatever order the provider returned.
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
// (which needs a server round-trip — see performSearch) — price/rating are
// already on every ProductResult, so no extra fetch is needed to reorder by
// them.
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

// A material's quantity is a loose string — either as identify_materials
// first returned it (its own prompt examples include unit-suffixed values
// like "25m" and "1 box", see tools/identify-materials.js) or as the trader
// has since edited it in the quantity input below. Number(qty) is NaN for
// unit-suffixed values, so pull out the leading numeric portion instead of
// requiring the whole string to be a bare number. Falls back to 1 (not 0)
// for anything with no leading number at all, so a missing/unparseable
// quantity still contributes its unit price rather than silently zeroing
// the line out of the total.
function materialQuantity(quantity) {
  const match = String(quantity ?? '').match(/[\d.]+/)
  const qty = match ? Number(match[0]) : NaN
  return Number.isFinite(qty) && qty > 0 ? qty : 1
}

// Splits a loose quantity string ("25m", "1 box", "2") into its editable
// number and the trailing unit word, so the quantity input can show/edit
// just the number while the unit is shown next to the "Qty" label instead
// (e.g. "Qty (box):") rather than being part of the typed-in value.
// `separator` preserves whether the original had a space before the unit
// ("1 box") or not ("25m"), so re-joining after an edit doesn't change that.
//
// The trailing part only counts as a unit if it starts with a letter —
// identify_materials occasionally returns a range like "1–5" instead of a
// plain quantity, and treating everything after the leading digits as a
// "unit" would turn that into a nonsense label like "Qty (–5)". Anything
// that doesn't match this shape (a range included) falls back to keeping
// the original string whole as `number`, unedited by this split.
function splitQuantity(quantity) {
  const str = String(quantity ?? '').trim()
  const match = str.match(/^([\d.]+)(\s*)([a-zA-Z].*)$/)
  if (!match) return { number: str, separator: '', unit: '' }
  const [, number, separator, unit] = match
  return { number, separator, unit }
}

function joinQuantity(number, separator, unit) {
  return unit ? `${number}${separator || ' '}${unit}` : number
}

function calculateMaterialsTotal(materials, selections, quantities) {
  return materials.reduce((sum, material) => {
    const product = selections[material.name]
    if (!product) return sum
    return sum + materialQuantity(quantities[material.name]) * product.price
  }, 0)
}

function PricePickerModal({ materialName, quoteId, selectedProduct, onClose, onSelect }) {
  const [query, setQuery] = useState(materialName)
  const [status, setStatus] = useState('idle') // idle | loading | done
  const [products, setProducts] = useState([])
  const [errorMessage, setErrorMessage] = useState(null)
  const [saving, setSaving] = useState(false)
  const [expandedId, setExpandedId] = useState(null)
  const [merchantFilter, setMerchantFilter] = useState('All')
  const [sortBy, setSortBy] = useState('relevance')
  // Tracks whether the unfiltered ("All") search ever found anything, so the
  // filter row and "try another merchant" framing stay available even while
  // the currently selected merchant filter itself has zero results.
  const [everFoundResults, setEverFoundResults] = useState(false)

  // Searching per merchant happens server-side (see /api/pricing/search's
  // options.merchant) rather than by filtering an already-fetched page
  // client-side — a single mixed page of `maxResults` products could easily
  // contain far fewer than 10 from any one merchant even when 10+ exist for
  // it, so each filter click re-queries with that merchant so the backend
  // can over-fetch and fill up to 10 when that many are actually available.
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

  // Search once on open, with the material name pre-filled — the trader can
  // still edit and re-search from there.
  useEffect(() => {
    performSearch('All')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const sortedProducts = useMemo(() => sortProducts(products, sortBy), [products, sortBy])

  async function handleSelect(product) {
    setSaving(true)
    try {
      await selectLinePrice(quoteId, materialName, product)
      onSelect(product)
      onClose()
    } catch {
      setErrorMessage('Could not save your selection — try again.')
      setSaving(false)
    }
  }

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={dialogStyle} onClick={(e) => e.stopPropagation()}>
        <button type="button" style={closeButtonStyle} onClick={onClose} aria-label="Close">
          ✕
        </button>
        <div style={dialogHeaderStyle}>
          <h3 style={{ marginTop: 0, marginBottom: '0.75rem' }}>Find prices — {query}</h3>
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.5rem' }}>
            <input style={inputStyle} value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search query" />
            <button type="submit" style={buttonStyle} disabled={status === 'loading'}>
              {status === 'loading' ? 'Searching…' : 'Search'}
            </button>
          </form>

          {everFoundResults && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.6rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
              <div style={{ ...filterRowStyle, marginBottom: 0 }}>
                {MERCHANT_FILTERS.map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    style={filter === merchantFilter ? activeFilterButtonStyle : filterButtonStyle}
                    disabled={status === 'loading'}
                    onClick={() => handleFilterClick(filter)}
                  >
                    {filter}
                  </button>
                ))}
              </div>
              <select
                aria-label="Sort results"
                style={sortSelectStyle}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div style={dialogResultsStyle}>
        {status === 'loading' && <p>Searching Google Shopping…</p>}

        {status === 'done' && products.length === 0 && (
          <div>
            <p>
              {errorMessage || (merchantFilter === 'All' ? `No results for "${query}".` : `No results from ${merchantFilter} for "${query}".`)}
              {merchantFilter === 'All' ? ' Try a direct search instead:' : ' Try another merchant, or a direct search:'}
            </p>
            <ul style={{ paddingLeft: '1.2rem' }}>
              {merchantSearchLinks(query).map((link) => (
                <li key={link.url}>
                  <a href={link.url} target="_blank" rel="noreferrer">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {status === 'done' && sortedProducts.map((product) => {
          const isSelected = selectedProduct?.id === product.id
          const isExpanded = expandedId === product.id
          return (
            <div key={product.id} style={isSelected ? selectedProductCardStyle : productCardStyle}>
              <div
                style={productSummaryRowStyle}
                onClick={() => setExpandedId(isExpanded ? null : product.id)}
                aria-expanded={isExpanded}
              >
                <span aria-hidden="true" style={{ width: '1.5rem', textAlign: 'center', color: '#666', fontSize: '1.6rem', lineHeight: 1 }}>
                  {isExpanded ? '▾' : '▸'}
                </span>
                {product.imageUrl && <img src={product.imageUrl} alt="" style={{ width: 48, height: 48, objectFit: 'contain' }} />}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold' }}>{product.title}</div>
                  <div style={{ color: '#666', fontSize: '0.85rem' }}>
                    {product.merchant}
                    {product.rating ? ` · ${product.rating}★ (${product.reviewCount ?? 0})` : ''}
                  </div>
                </div>
                <div style={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>{formatPrice(product)}</div>
                {isSelected && <span style={{ color: '#2e7d46', fontWeight: 'bold', whiteSpace: 'nowrap' }}>✓ Selected</span>}
              </div>

              {isExpanded && (
                <div style={productDetailStyle}>
                  <div>
                    <strong>Merchant:</strong> {product.merchant}
                  </div>
                  <div>
                    <strong>Availability:</strong> {product.availability === 'unknown' ? 'Not stated' : product.availability}
                  </div>
                  {product.rating != null && (
                    <div>
                      <strong>Rating:</strong> {product.rating}★ ({product.reviewCount ?? 0} reviews)
                    </div>
                  )}
                  {product.productUrl && (
                    <div>
                      <a href={product.productUrl} target="_blank" rel="noreferrer">
                        View product page ↗
                      </a>
                    </div>
                  )}
                  <div style={{ marginTop: '0.4rem', textAlign: 'right' }}>
                    <button
                      style={buttonStyle}
                      disabled={saving}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSelect(product)
                      }}
                    >
                      {isSelected ? 'Selected' : 'Select'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}

        <div style={{ marginTop: '1rem', textAlign: 'right' }}>
          <button style={buttonStyle} onClick={onClose}>
            Close
          </button>
        </div>
        </div>
      </div>
    </div>
  )
}

// Renders the MATERIALS & EQUIPMENT line items with per-line "Find prices",
// an editable quantity, and Delete/Save for later controls. Reconstructed
// from the structured identify_materials list (see lib/quote-materials.js)
// rather than the drafted prose bullets, so each control binds unambiguously
// to one material — the underlying drafted text is only ever rebuilt for
// Copy/Download (see app/quote/[id]/page.js's buildDisplayContent), never
// mutated here.
//
// Delete and "Save for later" are the same underlying per-line `status`
// ('active' | 'saved_for_later' | 'deleted') rather than two separate
// mechanisms — see lib/schema.sql's quote_line_prices comment. They differ
// only in UI treatment: a saved-for-later line moves to a reclaimable list
// with a "Re-add" button, a deleted line just disappears (with a confirm()
// guard, since there is no way back through this UI).
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
        const { separator, unit } = splitQuantity(overridesByName[m.name]?.quantity ?? m.quantity ?? '')
        return [m.name, { separator, unit }]
      }),
    ),
  )
  const [statuses, setStatuses] = useState(() =>
    Object.fromEntries(materials.map((m) => [m.name, overridesByName[m.name]?.status ?? 'active'])),
  )
  const [openMaterial, setOpenMaterial] = useState(null)
  const [total, setTotal] = useState(null)
  const [lineError, setLineError] = useState(null)
  const [pendingMaterial, setPendingMaterial] = useState(null)

  // A price selection, quantity, or status change all make any previously
  // calculated total stale — clear it so the button has to be pressed again
  // rather than leaving a now-wrong figure on screen.
  useEffect(() => {
    setTotal(null)
  }, [selections, quantities, statuses])

  if (!materials.length) return null

  const activeMaterials = materials.filter((m) => statuses[m.name] === 'active')
  const savedMaterials = materials.filter((m) => statuses[m.name] === 'saved_for_later')
  const allPriced = activeMaterials.length > 0 && activeMaterials.every((material) => selections[material.name])
  const currency = Object.values(selections)[0]?.currency || 'GBP'

  function handleQuantityChange(materialName, value) {
    setQuantities((prev) => ({ ...prev, [materialName]: value }))
  }

  async function handleQuantityBlur(materialName) {
    const currentValue = quantities[materialName] ?? ''
    const numeric = Number(currentValue)
    const isPlainNumber = currentValue !== '' && Number.isFinite(numeric)
    // Enforce "at least 1" here rather than only via the input's own
    // min="1" — that only affects the browser's native :invalid styling and
    // spinner behaviour, it doesn't stop an out-of-range value from being
    // typed or from reaching this handler. Only applies to a genuinely
    // numeric quantity — an unparseable one (e.g. a "1–5" range that
    // splitQuantity left whole, see its comment) isn't touched, since there
    // is no single "less than 1" to enforce on it.
    const clampedNumber = isPlainNumber ? (numeric >= 1 ? currentValue : '1') : currentValue
    if (clampedNumber !== currentValue) {
      setQuantities((prev) => ({ ...prev, [materialName]: clampedNumber }))
    }

    const { separator, unit } = quantityUnits[materialName] ?? { separator: '', unit: '' }
    try {
      await updateLineQuantity(quoteId, materialName, joinQuantity(clampedNumber, separator, unit))
    } catch {
      setLineError('Could not save the quantity change — try again.')
    }
  }

  async function handleStatusChange(materialName, status) {
    setPendingMaterial(materialName)
    try {
      await updateLineStatus(quoteId, materialName, status)
      setStatuses((prev) => ({ ...prev, [materialName]: status }))
    } catch {
      setLineError('Could not save that change — try again.')
    } finally {
      setPendingMaterial(null)
    }
  }

  function handleDelete(materialName) {
    if (!confirm(`Remove "${materialName}" from this quote? This can't be undone (use "Save for later" instead if you might want it back).`)) return
    handleStatusChange(materialName, 'deleted')
  }

  return (
    <div style={{ marginTop: '0.75rem' }}>
      {lineError && (
        <p style={{ color: 'crimson', fontSize: '0.85rem', marginTop: 0 }}>{lineError}</p>
      )}

      {activeMaterials.map((material) => {
        const selected = selections[material.name]
        const isPending = pendingMaterial === material.name
        const quantityValue = quantities[material.name] ?? ''
        // A number input can't display something like "1–5" (a range
        // identify_materials occasionally returns instead of a plain
        // quantity — see splitQuantity) without the browser silently
        // blanking it, so the "at least 1" input type/validation only
        // applies when the quantity is actually a plain number.
        const isNumericQuantity = quantityValue !== '' && Number.isFinite(Number(quantityValue))
        return (
          <div key={material.name} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
            <span>
              • {material.name}
              {material.notes ? ` — ${material.notes}` : ''}
            </span>
            <label style={quantityLabelStyle}>
              Qty{quantityUnits[material.name]?.unit ? ` (${quantityUnits[material.name].unit})` : ''}:
              <input
                type={isNumericQuantity ? 'number' : 'text'}
                min={isNumericQuantity ? '1' : undefined}
                step={isNumericQuantity ? 'any' : undefined}
                style={quantityInputStyle}
                value={quantities[material.name] ?? ''}
                onChange={(e) => handleQuantityChange(material.name, e.target.value)}
                onBlur={() => handleQuantityBlur(material.name)}
                aria-label={`Quantity for ${material.name}`}
              />
            </label>
            {selected ? (
              <span style={badgeStyle}>
                {formatPrice(selected)} · {selected.merchant}
                <button style={smallButtonStyle} onClick={() => setOpenMaterial(material.name)}>
                  Change
                </button>
              </span>
            ) : (
              <button style={buttonStyle} onClick={() => setOpenMaterial(material.name)}>
                Find prices
              </button>
            )}
            <button
              style={smallButtonStyle}
              disabled={isPending}
              onClick={() => handleStatusChange(material.name, 'saved_for_later')}
            >
              Save for later
            </button>
            <button style={dangerButtonStyle} disabled={isPending} onClick={() => handleDelete(material.name)}>
              {isPending ? 'Removing…' : 'Delete'}
            </button>
          </div>
        )
      })}

      <div style={{ marginTop: '0.75rem', paddingTop: '0.6rem', borderTop: '1px solid #ddd', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <button style={buttonStyle} disabled={!allPriced} onClick={() => setTotal(calculateMaterialsTotal(activeMaterials, selections, quantities))}>
          Calculate materials total
        </button>
        {total != null && <span style={{ fontWeight: 'bold' }}>Total: {formatAmount(total, currency)}</span>}
      </div>

      {savedMaterials.length > 0 && (
        <div style={{ marginTop: '0.75rem', paddingTop: '0.6rem', borderTop: '1px dashed #ddd' }}>
          <p style={{ margin: '0 0 0.4rem', fontSize: '0.85rem', color: '#666' }}>Saved for later ({savedMaterials.length}) — not included in this quote</p>
          {savedMaterials.map((material) => (
            <div key={material.name} style={savedForLaterRowStyle}>
              <span>
                • {material.name}
                {material.notes ? ` — ${material.notes}` : ''}
              </span>
              <button
                style={smallButtonStyle}
                disabled={pendingMaterial === material.name}
                onClick={() => handleStatusChange(material.name, 'active')}
              >
                Re-add
              </button>
            </div>
          ))}
        </div>
      )}

      {openMaterial && (
        <PricePickerModal
          materialName={openMaterial}
          quoteId={quoteId}
          selectedProduct={selections[openMaterial]}
          onClose={() => setOpenMaterial(null)}
          onSelect={(product) => setSelections((prev) => ({ ...prev, [openMaterial]: product }))}
        />
      )}
    </div>
  )
}
