import data from './example-photos.json' with { type: 'json' }

// Example-job photos are hotlinked from Unsplash's CDN, as its API guidelines require;
// scripts/unsplash-examples.mjs fills example-photos.json from the API.
export function examplePhoto(trade) {
  return Object.hasOwn(data.photos, trade) ? data.photos[trade] : null
}

// Unsplash resizes and crops on its CDN; rawUrl already carries its ixid tracking parameter.
export function unsplashImageUrl(photo, { width, height }) {
  const url = new URL(photo.rawUrl)
  url.searchParams.set('w', String(width))
  url.searchParams.set('h', String(height))
  url.searchParams.set('fit', 'crop')
  url.searchParams.set('crop', 'entropy')
  url.searchParams.set('auto', 'format')
  url.searchParams.set('q', '75')
  return url.toString()
}

// Uncropped JPEG for attaching as a job photo; the page's compressor resizes it further.
export function unsplashPhotoFileUrl(photo) {
  const url = new URL(photo.rawUrl)
  url.searchParams.set('w', '1600')
  url.searchParams.set('fm', 'jpg')
  url.searchParams.set('q', '85')
  return url.toString()
}

function withUtm(href) {
  const url = new URL(href)
  url.searchParams.set('utm_source', data.utmSource)
  url.searchParams.set('utm_medium', 'referral')
  return url.toString()
}

// The "Photo by X on Unsplash" credit Unsplash requires wherever a photo is shown.
export function unsplashCredit(photo) {
  return {
    photographer: photo.photographer,
    photographerHref: withUtm(photo.photographerUrl),
    unsplashHref: withUtm('https://unsplash.com/'),
  }
}
