// Browser-only: resizes a photo before it's uploaded, ported from PropertyVision's compressImage
// (docs/IMAGE_ANALYSIS.md §3.3) with its known-issue fixes #2, #8 and #9 applied.
const MAX_EDGE = 1568
// Anthropic downscales anything above ~1.15 MP, so larger uploads are wasted bytes.
const MAX_PIXELS = 1_150_000
const JPEG_QUALITY = 0.85

export function fitDimensions(width, height) {
  const scale = Math.min(1, MAX_EDGE / Math.max(width, height), Math.sqrt(MAX_PIXELS / (width * height)))
  // Round down so the result never exceeds either cap; the epsilon stops 1567.9999 flooring to 1567.
  const fit = (n) => Math.max(1, Math.floor(n * scale + 1e-6))
  return { width: fit(width), height: fit(height) }
}

// Rejects when the browser can't decode the file (e.g. HEIC outside Safari).
export async function compressImage(file) {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  try {
    const { width, height } = fitDimensions(bitmap.width, bitmap.height)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Failed to get canvas context')
    // JPEG has no alpha channel, so transparent pixels would otherwise come out black.
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(bitmap, 0, 0, width, height)
    return await new Promise((resolve, reject) => {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Failed to encode image'))), 'image/jpeg', JPEG_QUALITY)
    })
  } finally {
    bitmap.close()
  }
}

// One undecodable file shouldn't sink the batch, and decoding a whole batch at once can crash a phone's tab.
export async function compressImages(files, { concurrency = 3 } = {}) {
  const results = new Array(files.length)
  let next = 0
  async function worker() {
    while (next < files.length) {
      const i = next++
      try {
        results[i] = { file: files[i], blob: await compressImage(files[i]) }
      } catch (error) {
        results[i] = { file: files[i], error }
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, files.length) }, worker))
  return results
}
