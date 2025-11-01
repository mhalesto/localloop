import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';

/**
 * ProgressiveImage - Advanced image component with caching and progressive loading
 *
 * Features:
 * - Automatic disk and memory caching
 * - Blurhash placeholder support
 * - Thumbnail to full-quality progressive loading
 * - Better performance than standard Image
 *
 * @param {string} source - Image URI (object or string)
 * @param {string} thumbnail - Optional thumbnail URI for faster initial display
 * @param {string} blurhash - Optional blurhash string for placeholder
 * @param {object} style - Style object
 * @param {string} contentFit - How image should fit: 'cover', 'contain', 'fill', 'none', 'scale-down'
 * @param {string} transition - Transition duration in ms (default: 300)
 * @param {string} cachePolicy - Cache policy: 'disk', 'memory', 'memory-disk', 'none'
 */
export default function ProgressiveImage({
  source,
  thumbnail,
  blurhash,
  style,
  contentFit = 'cover',
  transition = 300,
  cachePolicy = 'memory-disk',
  priority = 'normal',
  ...props
}) {
  // Convert source to URI format if needed
  const imageSource = typeof source === 'string' ? { uri: source } : source;
  const thumbnailSource = thumbnail ? (typeof thumbnail === 'string' ? { uri: thumbnail } : thumbnail) : null;

  return (
    <View style={[styles.container, style]}>
      {/* Main image with caching */}
      <Image
        source={imageSource}
        placeholder={thumbnailSource || blurhash}
        contentFit={contentFit}
        transition={transition}
        cachePolicy={cachePolicy}
        priority={priority}
        style={StyleSheet.absoluteFill}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});
