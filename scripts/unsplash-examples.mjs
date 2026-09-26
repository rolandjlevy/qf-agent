// Fills lib/example-photos.json from the Unsplash API, one hotlinked photo per trade.
// Refresh all:   node --env-file=.env scripts/unsplash-examples.mjs
// Set one trade: node --env-file=.env scripts/unsplash-examples.mjs plumber https://unsplash.com/photos/<slug>-<id>
import fs from 'node:fs'
import { VALID_TRADES } from '../lib/constants.js'

const FILE = new URL('../lib/example-photos.json', import.meta.url)
const key = process.env.UNSPLASH_ACCESS_KEY
const appName = process.env.UNSPLASH_APP_NAME
if (!key || !appName) {
  console.error('Set UNSPLASH_ACCESS_KEY and UNSPLASH_APP_NAME in .env first.')
  process.exit(1)
}

// Accepts a bare photo id or a photo page link; Unsplash ids are the last 11 characters.
const photoId = (input) => new URL(input, 'https://unsplash.com').pathname.replace(/\/+$/, '').slice(-11)

async function fetchPhoto(id) {
  const res = await fetch(`https://api.unsplash.com/photos/${id}`, {
    headers: { Authorization: `Client-ID ${key}`, 'Accept-Version': 'v1' },
  })
  if (!res.ok) throw new Error(`Unsplash ${id}: HTTP ${res.status}`)
  const p = await res.json()
  // Unsplash+ photos aren't covered by the free licence.
  if (p.premium || p.plus) throw new Error(`Unsplash ${id} is an Unsplash+ photo`)
  return {
    id: p.id,
    alt: p.alt_description ?? '',
    rawUrl: p.urls.raw,
    photoUrl: p.links.html,
    photographer: p.user.name,
    photographerUrl: p.user.links.html,
    downloadLocation: p.links.download_location,
  }
}

const data = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, 'utf8')) : { photos: {} }
const [trade, photo] = process.argv.slice(2)

if (trade) {
  if (!VALID_TRADES.includes(trade) || !photo) {
    console.error(`Usage: ... <trade> <photo link or id>, trade one of: ${VALID_TRADES.join(', ')}`)
    process.exit(1)
  }
  data.photos[trade] = await fetchPhoto(photoId(photo))
  console.log(`${trade}: ${data.photos[trade].id} by ${data.photos[trade].photographer}`)
} else {
  for (const [t, p] of Object.entries(data.photos)) {
    data.photos[t] = await fetchPhoto(p.id)
    console.log(`${t}: refreshed`)
  }
}

const photos = Object.fromEntries(Object.entries(data.photos).sort(([a], [b]) => a.localeCompare(b)))
fs.writeFileSync(FILE, `${JSON.stringify({ utmSource: appName, photos }, null, 2)}\n`)
const missing = VALID_TRADES.filter((t) => !photos[t])
if (missing.length) console.log(`No photo yet for: ${missing.join(', ')}`)
