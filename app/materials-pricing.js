'use client'

import { useState, useEffect } from 'react'
import { buttonStyle } from './button-style.js'
import { selectLinePrice } from '../lib/actions/quote-prices.js'

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

const MERCHANT_FILTERS = ['All', 'Screwfix', 'Toolstation', 'B&Q', 'Amazon', 'Other']

// Serper's `source` field is a free-text merchant name (e.g. "Screwfix.com",
// "Amazon.co.uk - Amazon.co.uk-Seller") rather than a fixed enum — bucket it
// by substring match onto the filter categories, with anything unrecognised
// (Wickes, ITS, an independent seller, etc.) falling into "Other" rather
// than being dropped.
function merchantCategory(merchant) {
  const name = (merchant || '').toLowerCase()
  if (name.includes('screwfix')) return 'Screwfix'
  if (name.includes('toolstation')) return 'Toolstation'
  if (name.includes('b&q') || name.includes('diy.com')) return 'B&Q'
  if (name.includes('amazon')) return 'Amazon'
  return 'Other'
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

  async function runSearch(e) {
    e?.preventDefault()
    setStatus('loading')
    setErrorMessage(null)
    setProducts([])
    setMerchantFilter('All')
    try {
      const res = await fetch('/api/pricing/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorMessage(data.message || 'Price search failed.')
        setProducts([])
      } else {
        setProducts(data.products || [])
      }
    } catch {
      setErrorMessage('Could not reach the price search service.')
      setProducts([])
    } finally {
      setStatus('done')
    }
  }

  // Search once on open, with the material name pre-filled — the trader can
  // still edit and re-search from there.
  useEffect(() => {
    runSearch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  const filteredProducts = merchantFilter === 'All' ? products : products.filter((p) => merchantCategory(p.merchant) === merchantFilter)

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={dialogStyle} onClick={(e) => e.stopPropagation()}>
        <button type="button" style={closeButtonStyle} onClick={onClose} aria-label="Close">
          ✕
        </button>
        <div style={dialogHeaderStyle}>
          <h3 style={{ marginTop: 0, marginBottom: '0.75rem' }}>Find prices — {query}</h3>
          <form onSubmit={runSearch} style={{ display: 'flex', gap: '0.5rem' }}>
            <input style={inputStyle} value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search query" />
            <button type="submit" style={buttonStyle} disabled={status === 'loading'}>
              {status === 'loading' ? 'Searching…' : 'Search'}
            </button>
          </form>
        </div>

        <div style={dialogResultsStyle}>
        {status === 'loading' && <p>Searching Google Shopping…</p>}

        {status === 'done' && products.length === 0 && (
          <div>
            <p>{errorMessage || `No results for "${query}".`} Try a direct search instead:</p>
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

        {status === 'done' && products.length > 0 && (
          <div style={filterRowStyle}>
            {MERCHANT_FILTERS.map((filter) => (
              <button
                key={filter}
                type="button"
                style={filter === merchantFilter ? activeFilterButtonStyle : filterButtonStyle}
                onClick={() => setMerchantFilter(filter)}
              >
                {filter}
              </button>
            ))}
          </div>
        )}

        {status === 'done' && products.length > 0 && filteredProducts.length === 0 && (
          <p>No results from {merchantFilter} for this search.</p>
        )}

        {status === 'done' && filteredProducts.map((product) => {
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
