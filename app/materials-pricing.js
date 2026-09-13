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
  background: '#fff',
  borderRadius: 8,
  padding: '1.25rem',
  width: '100%',
  maxWidth: 640,
  maxHeight: '85vh',
  overflowY: 'auto',
}

const inputStyle = {
  flex: 1,
  padding: '0.5rem',
  border: '1px solid #ccc',
  borderRadius: 6,
  fontSize: '1rem',
}

const productCardStyle = {
  display: 'flex',
  gap: '0.75rem',
  alignItems: 'center',
  border: '1px solid #eee',
  borderRadius: 6,
  padding: '0.5rem 0.75rem',
  marginBottom: '0.5rem',
  cursor: 'pointer',
  background: '#fafafa',
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

function formatPrice(product) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: product.currency || 'GBP' }).format(product.price)
}

function PricePickerModal({ materialName, quoteId, onClose, onSelect }) {
  const [query, setQuery] = useState(materialName)
  const [status, setStatus] = useState('idle') // idle | loading | done
  const [products, setProducts] = useState([])
  const [errorMessage, setErrorMessage] = useState(null)
  const [saving, setSaving] = useState(false)

  async function runSearch(e) {
    e?.preventDefault()
    setStatus('loading')
    setErrorMessage(null)
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

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={dialogStyle} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>Find prices — {materialName}</h3>
        <form onSubmit={runSearch} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <input style={inputStyle} value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search query" />
          <button type="submit" style={buttonStyle} disabled={status === 'loading'}>
            {status === 'loading' ? 'Searching…' : 'Search'}
          </button>
        </form>

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

        {products.map((product) => (
          <div key={product.id} style={productCardStyle} onClick={() => !saving && handleSelect(product)}>
            {product.imageUrl && <img src={product.imageUrl} alt="" style={{ width: 48, height: 48, objectFit: 'contain' }} />}
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 'bold' }}>{product.title}</div>
              <div style={{ color: '#666', fontSize: '0.85rem' }}>
                {product.merchant}
                {product.rating ? ` · ${product.rating}★ (${product.reviewCount ?? 0})` : ''}
              </div>
            </div>
            <div style={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>{formatPrice(product)}</div>
          </div>
        ))}

        <div style={{ marginTop: '1rem', textAlign: 'right' }}>
          <button style={buttonStyle} onClick={onClose}>
            Close
          </button>
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

  if (!materials.length) return null

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

      {openMaterial && (
        <PricePickerModal
          materialName={openMaterial}
          quoteId={quoteId}
          onClose={() => setOpenMaterial(null)}
          onSelect={(product) => setSelections((prev) => ({ ...prev, [openMaterial]: product }))}
        />
      )}
    </div>
  )
}
