'use client'

import { useState, useEffect, useMemo } from 'react'
import { buttonStyle } from './button-style.js'
import { selectLinePrice, updateLineQuantity, updateLineStatus } from '../lib/actions/quote-prices.js'
import { MERCHANT_CATEGORIES, merchantCategory } from '../lib/pricing/merchant-category.js'
import { extractIntegerQuantity, splitQuantity, joinQuantity } from '../lib/quantity.js'

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

// Longhand properties only — shorthand here causes a harmless but noisy
// React hydration-mismatch warning against the browser's expanded style object.
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

// Primary action within an expanded product card — filled with the same
// accent green used for "Selected" elsewhere, so it stands out from the
// plain outlined buttons (Search, Close, Save for later, ...) around it.
const selectButtonStyle = {
  ...buttonStyle,
  padding: '0.5rem 1.1rem',
  fontSize: '0.95rem',
  fontWeight: 'bold',
  color: '#fff',
  background: '#2e7d46',
  border: '1px solid #2e7d46',
}

const selectedButtonStyle = {
  ...selectButtonStyle,
  background: '#e8f5ec',
  color: '#2e7d46',
  border: '1px solid #2e7d46',
  cursor: 'default',
}

const savingButtonStyle = {
  ...selectButtonStyle,
  opacity: 0.6,
  cursor: 'not-allowed',
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
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: '0.75rem',
}

const productDetailInfoStyle = {
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

function PricePickerModal({ materialName, quoteId, selectedProduct, onClose, onSelect }) {
  // Reopening on an existing selection re-applies that product's own merchant
  // filter — it may not surface within an unfiltered "All" search's top results.
  const initialMerchantFilter = selectedProduct ? merchantCategory(selectedProduct.merchant) : 'All'
  const [query, setQuery] = useState(materialName)
  const [status, setStatus] = useState('idle') // idle | loading | done
  const [products, setProducts] = useState([])
  const [errorMessage, setErrorMessage] = useState(null)
  const [savingId, setSavingId] = useState(null)
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
    try {
      await selectLinePrice(quoteId, materialName, product)
      onSelect(product)
      onClose()
    } catch {
      setErrorMessage('Could not save your selection — try again.')
      setSavingId(null)
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
          const isSavingThis = savingId === product.id
          const isBusy = savingId != null
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
                  <div style={productDetailInfoStyle}>
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
                  </div>
                  <button
                    className="select-button"
                    style={isSelected ? selectedButtonStyle : isBusy ? savingButtonStyle : selectButtonStyle}
                    disabled={isBusy || isSelected}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSelect(product)
                    }}
                  >
                    {isSelected ? '✓ Selected' : isSavingThis ? 'Saving…' : 'Select'}
                  </button>
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
  const [openMaterial, setOpenMaterial] = useState(null)
  const [lineError, setLineError] = useState(null)
  const [pendingAction, setPendingAction] = useState(null) // { name, status } | null

  if (!materials.length) return null

  const activeMaterials = materials.filter((m) => statuses[m.name] === 'active')
  const savedMaterials = materials.filter((m) => statuses[m.name] === 'saved_for_later')
  const allPriced = activeMaterials.length > 0 && activeMaterials.every((material) => selections[material.name])
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

  function handleDelete(materialName, { alreadySavedForLater = false } = {}) {
    const hint = alreadySavedForLater ? '' : ' (use "Save for later" instead if you might want it back)'
    if (!confirm(`Remove "${materialName}" from this quote? This can't be undone${hint}.`)) return
    handleStatusChange(materialName, 'deleted')
  }

  return (
    <div style={{ marginTop: '0.75rem' }}>
      {lineError && (
        <p style={{ color: 'crimson', fontSize: '0.85rem', marginTop: 0 }}>{lineError}</p>
      )}

      {activeMaterials.map((material) => {
        const selected = selections[material.name]
        const isPending = pendingAction?.name === material.name
        const isDeleting = isPending && pendingAction.status === 'deleted'
        const isSaving = isPending && pendingAction.status === 'saved_for_later'
        const unit = quantityUnits[material.name]
        return (
          <div key={material.name} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
            <span>
              • {material.name}
              {material.notes ? ` — ${material.notes}` : ''}
            </span>
            <label style={quantityLabelStyle}>
              Qty{unit ? ` (${unit})` : ''}:
              <input
                type="number"
                min="1"
                step="1"
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
              {isSaving ? 'Saving…' : 'Save for later'}
            </button>
            <button style={dangerButtonStyle} disabled={isPending} onClick={() => handleDelete(material.name)}>
              {isDeleting ? 'Removing…' : 'Delete'}
            </button>
          </div>
        )
      })}

      {activeMaterials.length > 0 && (
        <div style={{ marginTop: '0.75rem', paddingTop: '0.6rem', borderTop: '1px solid #ddd' }}>
          {allPriced ? (
            <span style={{ fontWeight: 'bold' }}>Final total for materials: {formatAmount(materialsTotal, currency)}</span>
          ) : (
            <span style={{ fontWeight: 'bold' }}>
              Running total for materials: {formatAmount(materialsTotal, currency)}{' '}
              <span style={{ fontWeight: 'normal', color: '#666' }}>(whilst there are materials still pending / unselected)</span>
            </span>
          )}
        </div>
      )}

      {savedMaterials.length > 0 && (
        <div style={{ marginTop: '0.75rem', paddingTop: '0.6rem', borderTop: '1px dashed #ddd' }}>
          <p style={{ margin: '0 0 0.4rem', fontSize: '0.85rem', color: '#666' }}>Saved for later ({savedMaterials.length}) — not included in this quote</p>
          {savedMaterials.map((material) => {
            const isPending = pendingAction?.name === material.name
            const isDeleting = isPending && pendingAction.status === 'deleted'
            const isReAdding = isPending && pendingAction.status === 'active'
            return (
              <div key={material.name} style={savedForLaterRowStyle}>
                <span>
                  • {material.name}
                  {material.notes ? ` — ${material.notes}` : ''}
                </span>
                <button style={smallButtonStyle} disabled={isPending} onClick={() => handleStatusChange(material.name, 'active')}>
                  {isReAdding ? 'Re-adding…' : 'Re-add'}
                </button>
                <button
                  style={dangerButtonStyle}
                  disabled={isPending}
                  onClick={() => handleDelete(material.name, { alreadySavedForLater: true })}
                >
                  {isDeleting ? 'Removing…' : 'Delete'}
                </button>
              </div>
            )
          })}
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
