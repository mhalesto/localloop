import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ProgressiveImage from './ProgressiveImage';
import { getThumbnailUrl, getBlurhash } from '../utils/imageUtils';
import useHaptics from '../hooks/useHaptics';

const FALLBACK_COLORS = ['#705CF6', '#4B8BFF', '#9B5BFF', '#FF6FA9'];

const RELATIVE_TIME_THRESHOLDS = [
  { unit: 'minute', seconds: 60 },
  { unit: 'hour', seconds: 60 * 60 },
  { unit: 'day', seconds: 60 * 60 * 24 },
];

const formatRelativeTime = (timestamp) => {
  if (!timestamp) return '';
  const now = Date.now();
  const diffSeconds = Math.max(1, Math.floor((now - timestamp) / 1000));

  if (diffSeconds < 60) {
    return `${diffSeconds}s ago`;
  }

  for (let i = 0; i < RELATIVE_TIME_THRESHOLDS.length; i += 1) {
    const { unit, seconds } = RELATIVE_TIME_THRESHOLDS[i];
    if (diffSeconds < seconds * (unit === 'day' ? 7 : 60)) {
      const value = Math.floor(diffSeconds / seconds);
      const suffix = value === 1 ? unit : `${unit}s`;
      return `${value} ${suffix} ago`;
    }
  }

  const date = new Date(timestamp);
  return date.toLocaleDateString();
};

export default function StatusStoryCard({ status, onPress }) {
  const haptics = useHaptics();

  const authorName = status?.author?.nickname || status?.author?.displayName || 'Anonymous';
  const fallbackColor = useMemo(() => {
    const key = status?.id || authorName;
    const index = key ? key.toString().charCodeAt(0) % FALLBACK_COLORS.length : 0;
    return FALLBACK_COLORS[index];
  }, [status?.id, authorName]);

  const relativeTime = formatRelativeTime(status?.createdAt);
  const imageUrl = status?.imageUrl;

  // Generate thumbnail and blurhash for progressive loading
  const thumbnailUrl = useMemo(() => {
    return imageUrl ? getThumbnailUrl(imageUrl, 140, 50) : null;
  }, [imageUrl]);

  const blurhash = useMemo(() => {
    return imageUrl ? (status?.blurhash || getBlurhash(imageUrl)) : null;
  }, [imageUrl, status?.blurhash]);

  const content = (
    <View style={styles.overlay}>
      <View style={styles.metaRow}>
        <Ionicons name="person-circle" size={16} color="#fff" />
        <Text style={styles.metaText} numberOfLines={1}>
          {authorName}
        </Text>
      </View>
      <Text style={styles.timeText}>{relativeTime}</Text>
    </View>
  );

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity
        style={styles.container}
        activeOpacity={0.88}
        onPress={() => {
          haptics.light();
          onPress?.(status);
        }}
      >
        {imageUrl ? (
          <View style={styles.imageBackground}>
            {/* Progressive image with caching and thumbnail */}
            <ProgressiveImage
              source={imageUrl}
              thumbnail={thumbnailUrl}
              blurhash={blurhash}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={200}
              priority="high"
            />
            <View style={styles.scrim} />
            {content}
          </View>
        ) : (
          <View style={[styles.imageBackground, styles.fallbackBackground, { backgroundColor: fallbackColor }]}>
            <View style={styles.scrim} />
            <Ionicons name="chatbubble-ellipses" size={32} color="rgba(255,255,255,0.85)" />
            {content}
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 28,
    marginRight: 16,
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  container: {
    width: 140,
    height: 200,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#1F1845',
  },
  imageBackground: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 16,
    overflow: 'hidden',
    borderRadius: 28,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
  },
  fallbackBackground: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 60,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    flexShrink: 1,
    marginLeft: 8,
  },
  timeText: {
    marginTop: 6,
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
  },
});
