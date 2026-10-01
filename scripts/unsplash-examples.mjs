// Fills lib/example-photos.json from the Unsplash API, one hotlinked photo per example job.
// Refresh all (60 requests, over a demo key's 50 an hour):
//                  node --env-file=.env scripts/unsplash-examples.mjs
// Set one example: node --env-file=.env scripts/unsplash-examples.mjs dripping-kitchen-tap https://unsplash.com/photos/<slug>-<id>
import fs from 'node:fs'
import { EXAMPLE_JOBS, exampleSlug } from '../lib/example-jobs.js'

const EXAMPLE_SLUGS = EXAMPLE_JOBS.map(exampleSlug)

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
const [example, photo] = process.argv.slice(2)

if (example) {
  if (!EXAMPLE_SLUGS.includes(example) || !photo) {
    console.error(`Usage: ... <example> <photo link or id>, example one of: ${EXAMPLE_SLUGS.join(', ')}`)
    process.exit(1)
  }
  data.photos[example] = await fetchPhoto(photoId(photo))
  console.log(`${example}: ${data.photos[example].id} by ${data.photos[example].photographer}`)
} else {
  for (const [t, p] of Object.entries(data.photos)) {
    data.photos[t] = await fetchPhoto(p.id)
    console.log(`${t}: refreshed`)
  }
}

const photos = Object.fromEntries(Object.entries(data.photos).sort(([a], [b]) => a.localeCompare(b)))
fs.writeFileSync(FILE, `${JSON.stringify({ utmSource: appName, photos }, null, 2)}\n`)
const missing = EXAMPLE_SLUGS.filter((s) => !photos[s])
if (missing.length) console.log(`No photo yet for: ${missing.join(', ')}`)
