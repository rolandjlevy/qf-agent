import { get } from '@vercel/blob'
import { ALLOWED_MEDIA_TYPES } from './analyse-job-photos.js'

export const JOB_PHOTO_PREFIX = 'job-photos/'
// Anthropic rejects images over 5 MB; compressed photos are ~200–400 KB, so this only catches a bypassed client.
export const MAX_JOB_PHOTO_BYTES = 4 * 1024 * 1024
const PATHNAME_PATTERN = /^job-photos\/[A-Za-z0-9_-]+(\.[A-Za-z0-9]+)?$/

// Pathnames, never URLs, come from the client: get() resolves them against this app's own
// private store, so a request can't make the server fetch an arbitrary URL.
export function isJobPhotoPathname(pathname) {
  return typeof pathname === 'string' && PATHNAME_PATTERN.test(pathname)
}

export function isBlobConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN)
}

// Passed explicitly because the SDK otherwise prefers VERCEL_OIDC_TOKEN + BLOB_STORE_ID when both
// are set, and `vercel env pull`'s development OIDC token gets a 403 from the store.
export function blobToken() {
  return process.env.BLOB_READ_WRITE_TOKEN
}

async function readStream(stream, maxBytes) {
  const chunks = []
  let total = 0
  for await (const chunk of stream) {
    total += chunk.byteLength
    if (total > maxBytes) throw new Error(`job photo exceeds ${maxBytes} bytes`)
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

// Returns the { data, mediaType } shape analyseJobPhotos takes.
export async function loadJobPhoto(pathname, { signal } = {}) {
  if (!isJobPhotoPathname(pathname)) {
    throw new Error(`invalid job photo pathname: ${pathname}`)
  }
  const result = await get(pathname, { access: 'private', abortSignal: signal, token: blobToken() })
  if (!result || result.statusCode !== 200) {
    throw new Error(`job photo not found: ${pathname}`)
  }
  const mediaType = result.blob.contentType
  if (!ALLOWED_MEDIA_TYPES.includes(mediaType)) {
    throw new Error(`job photo has unsupported media type ${mediaType}`)
  }
  if (result.blob.size > MAX_JOB_PHOTO_BYTES) {
    throw new Error(`job photo exceeds ${MAX_JOB_PHOTO_BYTES} bytes`)
  }
  const buffer = await readStream(result.stream, MAX_JOB_PHOTO_BYTES)
  return { data: buffer.toString('base64'), mediaType }
}
