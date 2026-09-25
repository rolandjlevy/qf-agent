import { handleUpload } from '@vercel/blob/client'
import { ALLOWED_MEDIA_TYPES } from '../../../../../lib/analyse-job-photos.js'
import { blobToken, isBlobConfigured, isJobPhotoPathname, MAX_JOB_PHOTO_BYTES } from '../../../../../lib/job-photos.js'

export const runtime = 'nodejs'

// Issues short-lived tokens so the browser uploads photos straight to the private Blob store,
// sidestepping Vercel's 4.5 MB request-body cap that base64 photos in a JSON body would hit.
export async function POST(request) {
  if (!isBlobConfigured()) {
    return Response.json({ error: 'Photo uploads are not configured' }, { status: 503 })
  }
  const body = await request.json().catch(() => null)
  if (!body) {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  try {
    const result = await handleUpload({
      body,
      request,
      token: blobToken(),
      onBeforeGenerateToken: async (pathname) => {
        if (!isJobPhotoPathname(pathname)) throw new Error('Invalid photo pathname')
        return {
          allowedContentTypes: ALLOWED_MEDIA_TYPES,
          maximumSizeInBytes: MAX_JOB_PHOTO_BYTES,
          addRandomSuffix: true,
          validUntil: Date.now() + 10 * 60 * 1000,
        }
      },
    })
    return Response.json(result)
  } catch (err) {
    return Response.json({ error: err.message || 'Failed to authorise photo upload' }, { status: 400 })
  }
}
