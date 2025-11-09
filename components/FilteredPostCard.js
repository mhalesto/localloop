import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettings, accentPresets } from '../contexts/SettingsContext';

const presetMap = accentPresets.reduce((acc, p) => {
  acc[p.key] = p;
  return acc;
}, {});

export default function FilteredPostCard({ post, onPress, showPostBackground }) {
  const { themeColors } = useSettings();

  // Get color preset from post's colorKey
  const preset = showPostBackground && post.colorKey
    ? (presetMap[post.colorKey] ?? accentPresets[0])
    : null;

  // Determine card background color and text colors
  const cardBackground = preset ? preset.background : themeColors.card;
  const textColor = preset
    ? (preset.onPrimary ?? (preset.isDark ? '#fff' : themeColors.textPrimary))
    : themeColors.textPrimary;
  const secondaryTextColor = preset
    ? (preset.metaColor ?? (preset.isDark ? 'rgba(255,255,255,0.75)' : themeColors.textSecondary))
    : themeColors.textSecondary;

  // Determine if we're using a dark background (for badge colors)
  const isDarkBackground = preset?.isDark ?? false;

  const timeAgo = () => {
    if (!post.createdAt) return 'Just now';
    const seconds = Math.floor((Date.now() - post.createdAt) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: cardBackground, borderColor: themeColors.divider }]}
      activeOpacity={0.85}
      onPress={onPress}
    >
      {post.imageUrl && (
        <Image source={{ uri: post.imageUrl }} style={styles.image} />
      )}
      <View style={styles.content}>
        {/* Author info */}
        {post.author && (
          <View style={styles.authorRow}>
            <Text style={[styles.authorName, { color: secondaryTextColor }]} numberOfLines={1}>
              @{post.author.username}
            </Text>
          </View>
        )}

        <Text style={[styles.title, { color: textColor }]} numberOfLines={3}>
          {post.title || 'Untitled Post'}
        </Text>

        {post.message && (
          <>
            <Text style={[styles.description, { color: secondaryTextColor }]} numberOfLines={3} ellipsizeMode="tail">
              {post.message}
            </Text>
            {post.message.length > 100 && (
              <Text style={[styles.readMore, { color: isDarkBackground ? '#fff' : themeColors.primary }]}>
                Read more
              </Text>
            )}
          </>
        )}

        {/* Poll indicator */}
        {post.poll && (
          <View style={[styles.pollBadge, { backgroundColor: isDarkBackground ? 'rgba(255, 255, 255, 0.2)' : `${themeColors.primary}20` }]}>
            <Ionicons name="bar-chart" size={14} color={isDarkBackground ? '#fff' : themeColors.primary} />
            <Text style={[styles.pollText, { color: isDarkBackground ? '#fff' : themeColors.primary }]}>
              Poll • {post.poll.options?.length || 0} options
            </Text>
          </View>
        )}

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <View style={styles.tagsRow}>
            {post.tags.slice(0, 2).map((tag, index) => (
              <View key={index} style={[styles.tag, { backgroundColor: isDarkBackground ? 'rgba(255, 255, 255, 0.2)' : `${themeColors.primary}15` }]}>
                <Text style={[styles.tagText, { color: isDarkBackground ? '#fff' : themeColors.primary }]} numberOfLines={1}>
                  #{tag}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.meta}>
          <View style={styles.metaItem}>
            <Ionicons name="location" size={14} color={isDarkBackground ? '#fff' : themeColors.primary} />
            <Text style={[styles.metaText, { color: secondaryTextColor }]}>
              {post.city || 'Unknown'}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={14} color={secondaryTextColor} />
            <Text style={[styles.metaText, { color: secondaryTextColor }]}>
              {timeAgo()}
            </Text>
          </View>
          {post.upvotes !== undefined && (
            <View style={styles.metaItem}>
              <Ionicons name="arrow-up" size={14} color="#10b981" />
              <Text style={[styles.metaText, { color: secondaryTextColor }]}>
                {post.upvotes || 0}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    marginRight: 14,
    width: 300, // Increased from 240
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  image: {
    width: '100%',
    height: 180, // Increased from 140
    resizeMode: 'cover',
  },
  content: {
    padding: 14,
  },
  authorRow: {
    marginBottom: 8,
  },
  authorName: {
    fontSize: 12,
    fontWeight: '500',
  },
  title: {
    fontSize: 17, // Increased from 15
    fontWeight: '700',
    marginBottom: 8,
    lineHeight: 22,
  },
  description: {
    fontSize: 14, // Increased from 13
    lineHeight: 20,
    marginBottom: 4,
  },
  readMore: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 12,
    marginTop: 2,
  },
  pollBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 10,
  },
  pollText: {
    fontSize: 12,
    fontWeight: '600',
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
  },
});
