import { describe, it, expect } from 'vitest';
import { DEFAULT_PLACEHOLDER_IMAGE, getOptimizedImageUrl } from '../src/lib/cloudinary';

describe('Cloudinary Lib Unit Tests', () => {
  it('should return local SVG placeholder image when empty or null source provided', () => {
    expect(getOptimizedImageUrl('')).toBe(DEFAULT_PLACEHOLDER_IMAGE);
    expect(getOptimizedImageUrl('   ')).toBe(DEFAULT_PLACEHOLDER_IMAGE);
    expect(getOptimizedImageUrl(null)).toBe(DEFAULT_PLACEHOLDER_IMAGE);
  });

  it('should preserve local asset paths starting with /', () => {
    expect(getOptimizedImageUrl('/images/custom-pedal.jpg')).toBe('/images/custom-pedal.jpg');
  });

  it('should preserve standard external URL without changes', () => {
    const external = 'https://images.unsplash.com/photo-1598488035139?auto=format';
    const result = getOptimizedImageUrl(external);
    expect(result).toBe(external);
  });

  it('should transform Cloudinary URL with quality, format and width options', () => {
    const cloudinaryUrl = 'https://res.cloudinary.com/mumu-tech/image/upload/v12345/pedal.jpg';
    const result = getOptimizedImageUrl(cloudinaryUrl, { width: 600, format: 'webp', quality: 'auto' });
    expect(result).toContain('f_webp,q_auto,w_600,c_fill');
  });

  it('should construct full Cloudinary URL from public id', () => {
    const publicId = 'pedal_fuzz_nos';
    const result = getOptimizedImageUrl(publicId, { width: 400 });
    expect(result).toContain('res.cloudinary.com');
    expect(result).toContain('pedal_fuzz_nos');
    expect(result).toContain('w_400');
  });

  it('should optimize Unsplash image URLs when width is specified', () => {
    const unsplashWithParams = 'https://images.unsplash.com/photo-1751887687425?w=1170&q=80';
    const resized = getOptimizedImageUrl(unsplashWithParams, { width: 640 });
    expect(resized).toContain('w=640');
    expect(resized).toContain('auto=format');

    const unsplashBare = 'https://plus.unsplash.com/premium_photo-1663040598592';
    const bareResized = getOptimizedImageUrl(unsplashBare, { width: 800 });
    expect(bareResized).toContain('w=800');
    expect(bareResized).toContain('auto=format');
    expect(bareResized).toContain('q=75');
  });
});
