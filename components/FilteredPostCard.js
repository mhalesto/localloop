import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '../contexts/SettingsContext';

export default function FilteredPostCard({ post, onPress }) {
  const { themeColors } = useSettings();

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
      style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.divider }]}
      activeOpacity={0.85}
      onPress={onPress}
    >
      {post.imageUrl && (
        <Image source={{ uri: post.imageUrl }} style={styles.image} />
      )}
      <View style={styles.content}>
        <Text style={[styles.title, { color: themeColors.textPrimary }]} numberOfLines={2}>
          {post.title || 'Untitled Post'}
        </Text>
        {post.content && (
          <Text style={[styles.description, { color: themeColors.textSecondary }]} numberOfLines={2}>
            {post.content}
          </Text>
        )}
        <View style={styles.meta}>
          <View style={styles.metaItem}>
            <Ionicons name="location" size={14} color={themeColors.primary} />
            <Text style={[styles.metaText, { color: themeColors.textSecondary }]}>
              {post.city || 'Unknown'}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={14} color={themeColors.textSecondary} />
            <Text style={[styles.metaText, { color: themeColors.textSecondary }]}>
              {timeAgo()}
            </Text>
          </View>
          {post.upvotes !== undefined && (
            <View style={styles.metaItem}>
              <Ionicons name="arrow-up" size={14} color="#10b981" />
              <Text style={[styles.metaText, { color: themeColors.textSecondary }]}>
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
    borderRadius: 14,
    marginRight: 12,
    width: 240,
    borderWidth: 1,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 140,
    resizeMode: 'cover',
  },
  content: {
    padding: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
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
