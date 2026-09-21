// Shared base style for every plain action button app-wide (Copy/View/
// Download, Delete, Continue/Back, Add material, Save) — Tailwind's
// canonical "secondary button" look (white fill, gray-300 border,
// shadow-sm), matching app/materials-pricing.js's own button styles.
export const buttonStyle = {
  border: '1px solid #d1d5db',
  borderRadius: 6,
  padding: '0.4rem 0.85rem',
  background: '#fff',
  cursor: 'pointer',
  fontSize: '0.9rem',
  fontWeight: 500,
  color: '#111827',
  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
}
