import { analyseJobPhotos, MAX_JOB_PHOTOS } from '../../../../lib/analyse-job-photos.js'
import { isBlobConfigured, isJobPhotoPathname, loadJobPhoto } from '../../../../lib/job-photos.js'
import { VALID_TRADES } from '../../../../lib/constants.js'

export const runtime = 'nodejs'
// One vision call over up to 8 photos took 10–25s per photo set in testing; this leaves room for a retry.
export const maxDuration = 120

// Runs once per job, before Phase A: the client keeps the returned observations and
// sends the trader-confirmed ones with each propose-materials and Phase B call.
export async function POST(request) {
  if (!isBlobConfigured()) {
    return Response.json({ error: 'Photo uploads are not configured' }, { status: 503 })
  }
  const body = await request.json().catch(() => null)
  const trade = body?.trade
  const jobDescription = typeof body?.jobDescription === 'string' ? body.jobDescription.trim() : ''
  const photos = body?.photos

  if (!VALID_TRADES.includes(trade)) {
    return Response.json({ error: `trade must be one of: ${VALID_TRADES.join(', ')}` }, { status: 400 })
  }
  if (!jobDescription) {
    return Response.json({ error: 'jobDescription is required' }, { status: 400 })
  }
  if (!Array.isArray(photos) || photos.length === 0 || photos.length > MAX_JOB_PHOTOS) {
    return Response.json({ error: `photos must be an array of 1 to ${MAX_JOB_PHOTOS} pathnames` }, { status: 400 })
  }
  if (!photos.every(isJobPhotoPathname)) {
    return Response.json({ error: 'photos contains an invalid pathname' }, { status: 400 })
  }

  let images
  try {
    images = await Promise.all(photos.map((pathname) => loadJobPhoto(pathname, { signal: request.signal })))
  } catch (err) {
    console.error('analyse-photos: failed to load photos', err)
    return Response.json({ error: 'One or more photos could not be loaded — try uploading them again' }, { status: 400 })
  }

  try {
    const result = await analyseJobPhotos({ trade, jobDescription, images, signal: request.signal })
    return Response.json(result)
  } catch (err) {
    // Same auth-vs-everything-else split as the propose-materials route.
    const status = err?.status === 401 || err?.status === 403 ? err.status : 500
    return Response.json({ error: err.message || 'Failed to analyse photos' }, { status })
  }
}
