import { describe, it, expect } from 'vitest';
import { getOptimizedImageUrl } from '../src/lib/cloudinary';

describe('Cloudinary Lib Unit Tests', () => {
  it('should return fallback image when empty source provided', () => {
    const url = getOptimizedImageUrl('');
    expect(url).toContain('https://images.unsplash.com');
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
});
