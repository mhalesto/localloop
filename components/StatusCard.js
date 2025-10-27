import React, { useMemo } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useSettings } from '../contexts/SettingsContext';

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

export default function StatusCard({ status, onPress, onReact, onReport }) {
  const { themeColors } = useSettings();

  const styles = useMemo(() => createStyles(themeColors), [themeColors]);

  if (!status) {
    return null;
  }

  const {
    message,
    imageUrl,
    author,
    createdAt,
    reactions = {},
    repliesCount = 0,
    city,
    province,
  } = status;

  const totalReactions = Object.values(reactions).reduce((sum, entry) => sum + (entry?.count ?? 0), 0);
  const readyLocation = [city, province].filter(Boolean).join(', ');

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress?.(status)}
      activeOpacity={0.9}
    >
      <View style={styles.headerRow}>
        <View style={styles.authorBlock}>
          <Ionicons name="person-circle" size={32} color={themeColors.primaryDark} />
          <View style={styles.authorTextBlock}>
            <Text style={styles.authorName} numberOfLines={1}>
              {author?.nickname || author?.displayName || 'Anonymous' }
            </Text>
            <Text style={styles.meta} numberOfLines={1}>
              {readyLocation || 'Somewhere nearby'} · {formatRelativeTime(createdAt)}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.reportButton}
          onPress={() => onReport?.(status)}
          activeOpacity={0.8}
        >
          <Ionicons name="flag-outline" size={18} color={themeColors.textSecondary} />
        </TouchableOpacity>
      </View>

      <Text style={styles.message}>{message}</Text>

      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
      ) : null}

      <View style={styles.footerRow}>
        <TouchableOpacity
          style={styles.footerButton}
          onPress={() => onReact?.(status)}
          activeOpacity={0.8}
        >
          <Ionicons name="heart-outline" size={18} color={themeColors.primaryDark} />
          <Text style={styles.footerLabel}>{totalReactions}</Text>
        </TouchableOpacity>

        <View style={styles.footerButton}>
          <Ionicons name="chatbubble-ellipses-outline" size={18} color={themeColors.textSecondary} />
          <Text style={styles.footerLabel}>{repliesCount}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const createStyles = (palette) =>
  StyleSheet.create({
    card: {
      backgroundColor: palette.card,
      borderRadius: 18,
      padding: 16,
      borderWidth: 1,
      borderColor: palette.divider,
      marginBottom: 16,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    authorBlock: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    authorTextBlock: {
      marginLeft: 12,
      flex: 1,
    },
    authorName: {
      fontSize: 15,
      fontWeight: '700',
      color: palette.textPrimary,
    },
    meta: {
      fontSize: 12,
      color: palette.textSecondary,
      marginTop: 2,
    },
    reportButton: {
      padding: 6,
    },
    message: {
      fontSize: 15,
      lineHeight: 22,
      color: palette.textPrimary,
    },
    image: {
      height: 200,
      borderRadius: 14,
      marginTop: 12,
      width: '100%',
      backgroundColor: palette.background,
    },
    footerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 16,
      justifyContent: 'space-between',
    },
    footerButton: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    footerLabel: {
      marginLeft: 6,
      fontSize: 13,
      fontWeight: '600',
      color: palette.textPrimary,
    },
  });
