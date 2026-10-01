import { describe, it, expect } from 'vitest';
import data from './example-photos.json' with { type: 'json' };
import { examplePhoto, unsplashImageUrl, unsplashCredit, unsplashPhotoFileUrl } from './example-photos.js';
import { EXAMPLE_JOBS, exampleSlug } from './example-jobs.js';

describe('example photos', () => {
  it('has a complete Unsplash photo for every example job', () => {
    for (const slug of EXAMPLE_JOBS.map(exampleSlug)) {
      const photo = examplePhoto(slug);
      expect(photo, slug).not.toBeNull();
      expect(photo.rawUrl).toMatch(/^https:\/\/images\.unsplash\.com\/photo-.*ixid=/);
      expect(photo.downloadLocation).toMatch(/^https:\/\/api\.unsplash\.com\/photos\/.+\/download/);
      expect(photo.photographer).toBeTruthy();
      expect(photo.photographerUrl).toMatch(/^https:\/\/unsplash\.com\/@/);
    }
    expect(data.utmSource).toBeTruthy();
  });

  it('has no photos left over for examples that no longer exist', () => {
    expect(Object.keys(data.photos).sort()).toEqual(EXAMPLE_JOBS.map(exampleSlug).sort());
  });

  it('returns null for an unknown example, including prototype keys', () => {
    expect(examplePhoto('plumber')).toBeNull();
    expect(examplePhoto('__proto__')).toBeNull();
  });

  it('builds a sized CDN URL that keeps the tracking parameter', () => {
    const url = new URL(unsplashImageUrl(examplePhoto('dripping-kitchen-tap'), { width: 360, height: 240 }));
    expect(url.host).toBe('images.unsplash.com');
    expect(url.searchParams.get('w')).toBe('360');
    expect(url.searchParams.get('h')).toBe('240');
    expect(url.searchParams.get('fit')).toBe('crop');
    expect(url.searchParams.get('ixid')).toBeTruthy();
  });

  it('builds an uncropped JPEG URL for attaching as a job photo', () => {
    const url = new URL(unsplashPhotoFileUrl(examplePhoto('dripping-kitchen-tap')));
    expect(url.searchParams.get('fm')).toBe('jpg');
    expect(url.searchParams.get('w')).toBe('1600');
    expect(url.searchParams.get('fit')).toBeNull();
    expect(url.searchParams.get('ixid')).toBeTruthy();
  });

  it('adds the utm referral parameters to both credit links', () => {
    const credit = unsplashCredit(examplePhoto('dripping-kitchen-tap'));
    for (const href of [credit.photographerHref, credit.unsplashHref]) {
      const url = new URL(href);
      expect(url.searchParams.get('utm_source')).toBe(data.utmSource);
      expect(url.searchParams.get('utm_medium')).toBe('referral');
    }
  });
});
