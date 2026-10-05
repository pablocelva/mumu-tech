import { env } from './env';

export const DEFAULT_PLACEHOLDER_IMAGE = '/images/placeholder.svg';

export interface CloudinaryTransformOptions {
  width?: number;
  height?: number;
  crop?: 'fill' | 'fit' | 'limit' | 'thumb';
  quality?: 'auto' | number;
  format?: 'auto' | 'webp' | 'avif' | 'jpg' | 'png';
}

/**
 * Builds an optimized Cloudinary delivery URL or returns fallback image safely.
 */
export function getOptimizedImageUrl(
  imageSource?: string | null,
  options: CloudinaryTransformOptions = {}
): string {
  if (!imageSource || !imageSource.trim()) {
    return DEFAULT_PLACEHOLDER_IMAGE;
  }

  const trimmed = imageSource.trim();

  // If it's a relative/local asset path (e.g., /images/...)
  if (trimmed.startsWith('/')) {
    return trimmed;
  }

  // If it's already a full external URL (like Unsplash, Imgur, Cloudinary)
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    if (trimmed.includes('res.cloudinary.com')) {
      // It's a Cloudinary URL, we can inject transformations
      const { width = 800, quality = 'auto', format = 'auto', crop = 'fill' } = options;
      const transformString = `f_${format},q_${quality},w_${width},c_${crop}`;
      return trimmed.replace('/upload/', `/upload/${transformString}/`);
    }
    return trimmed;
  }

  // If it's a Cloudinary Public ID
  const cloudName = env.PUBLIC_CLOUDINARY_CLOUD_NAME || 'mumu-tech';
  const { width = 800, quality = 'auto', format = 'auto', crop = 'fill' } = options;
  const transformString = `f_${format},q_${quality},w_${width},c_${crop}`;

  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformString}/${trimmed}`;
}
