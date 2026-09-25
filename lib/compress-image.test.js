import { describe, it, expect } from 'vitest';
import { fitDimensions } from './compress-image.js';

describe('fitDimensions', () => {
  it('never upscales a small image', () => {
    expect(fitDimensions(800, 600)).toEqual({ width: 800, height: 600 });
  });

  it('scales a 12 MP phone photo to within the ~1.15 MP cap, keeping aspect ratio', () => {
    const { width, height } = fitDimensions(4032, 3024);
    expect(width * height).toBeLessThanOrEqual(1_150_000);
    expect(width / height).toBeCloseTo(4 / 3, 2);
  });

  it('keeps a long panorama within the 1568px edge limit', () => {
    const { width, height } = fitDimensions(6000, 1000);
    expect(width).toBe(1568);
    expect(height).toBe(261);
  });
});
