import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@vercel/blob', () => ({ get: vi.fn() }));

const { get } = await import('@vercel/blob');
const { isJobPhotoPathname, loadJobPhoto, MAX_JOB_PHOTO_BYTES } = await import('./job-photos.js');

function blobResult({ bytes = Buffer.from('hello'), contentType = 'image/jpeg', size = bytes.length, chunks } = {}) {
  const parts = chunks || [bytes];
  return {
    statusCode: 200,
    stream: (async function* () {
      for (const p of parts) yield new Uint8Array(p);
    })(),
    blob: { contentType, size },
  };
}

beforeEach(() => {
  get.mockReset();
});

describe('isJobPhotoPathname', () => {
  it('accepts pathnames under job-photos/ with safe names', () => {
    expect(isJobPhotoPathname('job-photos/3f2a-9c1b.jpg')).toBe(true);
    expect(isJobPhotoPathname('job-photos/abc_DEF-123')).toBe(true);
  });

  it('rejects URLs, traversal, other prefixes and non-strings', () => {
    expect(isJobPhotoPathname('https://evil.example/x.jpg')).toBe(false);
    expect(isJobPhotoPathname('job-photos/../secrets.json')).toBe(false);
    expect(isJobPhotoPathname('job-photos/a/b.jpg')).toBe(false);
    expect(isJobPhotoPathname('other/a.jpg')).toBe(false);
    expect(isJobPhotoPathname('job-photos/')).toBe(false);
    expect(isJobPhotoPathname(42)).toBe(false);
  });
});

describe('loadJobPhoto', () => {
  it('reads a private blob and returns base64 data with its media type', async () => {
    get.mockResolvedValueOnce(blobResult({ chunks: [Buffer.from('hel'), Buffer.from('lo')], size: 5 }));
    const signal = new AbortController().signal;

    await expect(loadJobPhoto('job-photos/a.jpg', { signal })).resolves.toEqual({
      data: Buffer.from('hello').toString('base64'),
      mediaType: 'image/jpeg',
    });
    expect(get).toHaveBeenCalledWith('job-photos/a.jpg', { access: 'private', abortSignal: signal, token: process.env.BLOB_READ_WRITE_TOKEN });
  });

  it('rejects an invalid pathname without touching the store', async () => {
    await expect(loadJobPhoto('https://evil.example/x.jpg')).rejects.toThrow(/invalid job photo pathname/);
    expect(get).not.toHaveBeenCalled();
  });

  it('throws when the blob is missing', async () => {
    get.mockResolvedValueOnce(null);
    await expect(loadJobPhoto('job-photos/a.jpg')).rejects.toThrow(/not found/);
  });

  it('rejects unsupported media types', async () => {
    get.mockResolvedValueOnce(blobResult({ contentType: 'application/pdf' }));
    await expect(loadJobPhoto('job-photos/a.jpg')).rejects.toThrow(/unsupported media type/);
  });

  it('rejects oversized blobs by declared size, and by streamed size if the metadata understates it', async () => {
    get.mockResolvedValueOnce(blobResult({ size: MAX_JOB_PHOTO_BYTES + 1 }));
    await expect(loadJobPhoto('job-photos/a.jpg')).rejects.toThrow(/exceeds/);

    const big = Buffer.alloc(MAX_JOB_PHOTO_BYTES / 2 + 1);
    get.mockResolvedValueOnce(blobResult({ chunks: [big, big], size: 10 }));
    await expect(loadJobPhoto('job-photos/a.jpg')).rejects.toThrow(/exceeds/);
  });
});
