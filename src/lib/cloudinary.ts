import { env } from './env';

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
  imageSource: string,
  options: CloudinaryTransformOptions = {}
): string {
  if (!imageSource) {
    return 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=800&q=80';
  }

  // If it's already a full external URL (like Unsplash), return as is or append params if supported
  if (imageSource.startsWith('http://') || imageSource.startsWith('https://')) {
    if (imageSource.includes('res.cloudinary.com')) {
      // It's a Cloudinary URL, we can inject transformations
      const { width = 800, quality = 'auto', format = 'auto', crop = 'fill' } = options;
      const transformString = `f_${format},q_${quality},w_${width},c_${crop}`;
      return imageSource.replace('/upload/', `/upload/${transformString}/`);
    }
    return imageSource;
  }

  // If it's a Cloudinary Public ID
  const cloudName = env.PUBLIC_CLOUDINARY_CLOUD_NAME || 'mumu-tech';
  const { width = 800, quality = 'auto', format = 'auto', crop = 'fill' } = options;
  const transformString = `f_${format},q_${quality},w_${width},c_${crop}`;

  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformString}/${imageSource}`;
}
