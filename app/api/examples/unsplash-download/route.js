import { examplePhoto } from '../../../../lib/example-photos.js'

export const runtime = 'nodejs'

// Unsplash's API guidelines require reporting a download whenever a photo is "used";
// here that's a trader picking an example job. The key stays server-side, and only a
// known trade is accepted, so this can't be used to ping arbitrary URLs.
export async function POST(request) {
  const body = await request.json().catch(() => null)
  const photo = examplePhoto(body?.trade)
  if (!photo) {
    return Response.json({ error: 'unknown trade' }, { status: 400 })
  }

  const key = process.env.UNSPLASH_ACCESS_KEY
  if (!key) return new Response(null, { status: 204 })

  // Best effort: a failed report must never affect the trader's form.
  try {
    await fetch(photo.downloadLocation, { headers: { Authorization: `Client-ID ${key}`, 'Accept-Version': 'v1' } })
  } catch (err) {
    console.warn('Unsplash download report failed:', err.message)
  }
  return new Response(null, { status: 204 })
}
