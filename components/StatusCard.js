import React, { useMemo } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';

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
  const { user } = useAuth();

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
  const viewerReactionKey = useMemo(() => {
    if (user?.uid) return user.uid;
    if (user?.email) return `client-${user.email}`;
    return null;
  }, [user?.email, user?.uid]);
  const viewerReacted = Boolean(
    viewerReactionKey && reactions?.heart?.reactors && reactions.heart.reactors[viewerReactionKey]
  );
  const authorName = author?.nickname || author?.displayName || 'Anonymous';
  const relativeTime = formatRelativeTime(createdAt);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress?.(status)}
      activeOpacity={0.9}
    >
      <View style={styles.headerRow}>
        <Ionicons name="person-circle" size={40} color={themeColors.primaryDark} />
        <View style={styles.authorTextBlock}>
          <Text style={styles.authorName} numberOfLines={1}>
            {authorName}
          </Text>
          <View style={styles.metaRow}>
            <View style={styles.metaChip}>
              <Ionicons name="location-outline" size={14} color={themeColors.textSecondary} />
              <Text style={styles.metaChipText} numberOfLines={1}>
                {readyLocation || 'Somewhere nearby'}
              </Text>
            </View>
            <View style={[styles.metaChip, styles.metaChipGhost, styles.metaChipLast]}>
              <Ionicons name="time-outline" size={14} color={themeColors.textSecondary} />
              <Text style={styles.metaChipText}>{relativeTime}</Text>
            </View>
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
          style={[styles.footerPill, viewerReacted && styles.footerPillActive]}
          onPress={() => onReact?.(status)}
          activeOpacity={0.8}
        >
          <Ionicons
            name={viewerReacted ? 'heart' : 'heart-outline'}
            size={18}
            color={viewerReacted ? '#fff' : themeColors.primaryDark}
          />
          <Text style={[styles.footerLabel, viewerReacted && styles.footerLabelActive]}>
            {totalReactions}
          </Text>
        </TouchableOpacity>

        <View style={[styles.footerPill, styles.footerPillGhost]}>
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
      borderRadius: 22,
      padding: 18,
      borderWidth: 1,
      borderColor: palette.divider,
      marginBottom: 18,
      shadowColor: '#000000',
      shadowOpacity: 0.06,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 6 },
      elevation: 2,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    authorTextBlock: {
      marginLeft: 12,
      flex: 1,
    },
    authorName: {
      fontSize: 16,
      fontWeight: '700',
      color: palette.textPrimary,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
    },
    metaChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 4,
      paddingHorizontal: 10,
      borderRadius: 999,
      backgroundColor: palette.background,
      maxWidth: '100%',
      marginRight: 8,
    },
    metaChipGhost: {
      backgroundColor: palette.card,
      borderWidth: 1,
      borderColor: palette.divider,
    },
    metaChipLast: {
      marginRight: 0,
    },
    metaChipText: {
      fontSize: 12,
      color: palette.textSecondary,
    },
    reportButton: {
      padding: 6,
    },
    message: {
      fontSize: 16,
      lineHeight: 24,
      color: palette.textPrimary,
      marginTop: 10,
    },
    image: {
      height: 200,
      borderRadius: 18,
      marginTop: 14,
      width: '100%',
      backgroundColor: palette.background,
    },
    footerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 18,
      justifyContent: 'space-between',
    },
    footerPill: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: palette.background,
      marginRight: 10,
    },
    footerPillActive: {
      backgroundColor: palette.primary,
    },
    footerPillGhost: {
      backgroundColor: palette.background,
      opacity: 0.9,
      marginRight: 0,
    },
    footerLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: palette.textSecondary,
    },
    footerLabelActive: {
      color: '#fff',
    },
  });
