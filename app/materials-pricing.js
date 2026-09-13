'use client'

import { useState, useEffect, useMemo } from 'react'
import { buttonStyle } from './button-style.js'
import { selectLinePrice } from '../lib/actions/quote-prices.js'
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

// A material's quantity comes from the identify_materials sub-LLM as a loose
// string — fall back to 1 (not 0) for anything that isn't a positive number,
// so a missing/non-numeric quantity still contributes its unit price rather
// than silently zeroing the line out of the total.
function materialQuantity(material) {
  const qty = Number(material.quantity)
  return Number.isFinite(qty) && qty > 0 ? qty : 1
}

function calculateMaterialsTotal(materials, selections) {
  return materials.reduce((sum, material) => {
    const product = selections[material.name]
    return product ? sum + materialQuantity(material) * product.price : sum
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

// Renders the MATERIALS & EQUIPMENT line items with a per-line "Find prices"
// action. Reconstructed from the structured identify_materials list (see
// lib/quote-materials.js) rather than the drafted prose bullets, so each
// control binds unambiguously to one material — the drafted text itself
// (used for Copy/Download) is untouched.
export default function MaterialsPricing({ quoteId, materials, initialSelections }) {
  const [selections, setSelections] = useState(initialSelections || {})
  const [openMaterial, setOpenMaterial] = useState(null)
  const [total, setTotal] = useState(null)

  // A price selection changing (a new pick, or "Change" on an existing one)
  // makes any previously calculated total stale — clear it so the button has
  // to be pressed again rather than leaving a now-wrong figure on screen.
  useEffect(() => {
    setTotal(null)
  }, [selections])

  if (!materials.length) return null

  const allPriced = materials.every((material) => selections[material.name])
  const currency = Object.values(selections)[0]?.currency || 'GBP'

  return (
    <div style={{ marginTop: '0.75rem' }}>
      {materials.map((material) => {
        const selected = selections[material.name]
        return (
          <div key={material.name} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
            <span>
              • {material.name}
              {material.quantity ? ` (qty: ${material.quantity})` : ''}
              {material.notes ? ` — ${material.notes}` : ''}
            </span>
            {selected ? (
              <span style={badgeStyle}>
                {formatPrice(selected)} · {selected.merchant}
                <button style={{ ...buttonStyle, padding: '0.1rem 0.5rem', fontSize: '0.75rem' }} onClick={() => setOpenMaterial(material.name)}>
                  Change
                </button>
              </span>
            ) : (
              <button style={buttonStyle} onClick={() => setOpenMaterial(material.name)}>
                Find prices
              </button>
            )}
          </div>
        )
      })}

      <div style={{ marginTop: '0.75rem', paddingTop: '0.6rem', borderTop: '1px solid #ddd', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <button style={buttonStyle} disabled={!allPriced} onClick={() => setTotal(calculateMaterialsTotal(materials, selections))}>
          Calculate materials total
        </button>
        {total != null && <span style={{ fontWeight: 'bold' }}>Total: {formatAmount(total, currency)}</span>}
      </div>

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
