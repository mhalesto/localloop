/**
 * Image Utilities for LocalLoop
 * Provides thumbnail generation and image optimization helpers
 */

/**
 * Generate a thumbnail URL from a Firebase Storage URL
 * Firebase Storage supports automatic image transformations with query parameters
 *
 * @param {string} imageUrl - Original image URL
 * @param {number} width - Thumbnail width (default: 200)
 * @param {number} quality - Image quality 0-100 (default: 60)
 * @returns {string} Thumbnail URL
 */
export function getThumbnailUrl(imageUrl, width = 200, quality = 60) {
  if (!imageUrl) return null;

  // For Firebase Storage URLs, we can add size parameters
  // Example: https://firebasestorage.googleapis.com/...?alt=media
  // We'll add width and quality parameters
  const url = new URL(imageUrl);

  // If it's a Firebase Storage URL, add thumbnail parameters
  if (url.hostname.includes('firebasestorage.googleapis.com')) {
    // Note: Firebase doesn't natively support image resizing in URLs
    // You might need Firebase Extensions (Resize Images) or Cloud Functions
    // For now, we'll return the original URL
    // TODO: Implement Firebase image resizing extension or CDN
    return imageUrl;
  }

  // For other CDNs that support query parameters (like Cloudinary, Imgix, etc.)
  url.searchParams.set('w', width.toString());
  url.searchParams.set('q', quality.toString());

  return url.toString();
}

/**
 * Generate blurhash placeholder from an image URL
 * Note: Blurhash generation requires server-side processing
 * This is a placeholder - implement server-side blurhash generation
 *
 * @param {string} imageUrl - Original image URL
 * @returns {string|null} Blurhash string
 */
export function getBlurhash(imageUrl) {
  // Blurhash should be generated server-side when images are uploaded
  // and stored in Firestore along with the image URL
  // This is a fallback that returns a generic blurhash
  return 'LGF5]+Yk^6#M@-5c,1J5@[or[Q6.'; // Generic purple blurhash
}

/**
 * Preload images for better UX
 * Useful for preloading images before navigating to a screen
 *
 * @param {string[]} imageUrls - Array of image URLs to preload
 */
export async function preloadImages(imageUrls) {
  if (!imageUrls || !Array.isArray(imageUrls)) return;

  const { Image } = await import('expo-image');

  try {
    await Promise.all(
      imageUrls
        .filter(url => url && typeof url === 'string')
        .map(url => Image.prefetch(url))
    );
  } catch (error) {
    console.warn('[imageUtils] Error preloading images:', error);
  }
}

/**
 * Clear image cache
 * Useful for troubleshooting or when user wants to free up space
 */
export async function clearImageCache() {
  try {
    const { Image } = await import('expo-image');
    await Image.clearDiskCache();
    await Image.clearMemoryCache();
    return true;
  } catch (error) {
    console.error('[imageUtils] Error clearing cache:', error);
    return false;
  }
}

/**
 * Get optimized image size based on screen dimensions
 *
 * @param {number} screenWidth - Screen width
 * @param {number} screenHeight - Screen height
 * @param {number} aspectRatio - Desired aspect ratio (default: 1)
 * @returns {object} Optimized dimensions { width, height }
 */
export function getOptimizedImageSize(screenWidth, screenHeight, aspectRatio = 1) {
  // Limit maximum size to avoid memory issues
  const maxDimension = 2048;

  let width = screenWidth;
  let height = screenWidth / aspectRatio;

  // Scale down if too large
  if (width > maxDimension) {
    width = maxDimension;
    height = width / aspectRatio;
  }

  if (height > maxDimension) {
    height = maxDimension;
    width = height * aspectRatio;
  }

  return {
    width: Math.round(width),
    height: Math.round(height),
  };
}

/**
 * Create image source object with caching hints
 *
 * @param {string} uri - Image URI
 * @param {object} options - Additional options
 * @returns {object} Image source object
 */
export function createImageSource(uri, options = {}) {
  return {
    uri,
    cache: options.cache || 'default',
    priority: options.priority || 'normal',
    ...options,
  };
}
