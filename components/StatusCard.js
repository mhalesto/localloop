import React, { useMemo, useState } from 'react';
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

  if (diffSeconds < 60) return `${diffSeconds}s ago`;

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
  const [menuOpen, setMenuOpen] = useState(false);

  const styles = useMemo(() => createStyles(themeColors), [themeColors]);

  if (!status) return null;

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

  const totalReactions = Object.values(reactions).reduce(
    (sum, entry) => sum + (entry?.count ?? 0),
    0
  );
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
      onPress={() => {
        setMenuOpen(false);
        onPress?.(status);
      }}
      activeOpacity={0.9}
    >
      <View style={styles.headerRow}>
        <Ionicons name="person-circle" size={40} color={themeColors.primaryDark} />

        <View style={styles.authorTextBlock /* minWidth:0 + shrink fixes text clipping */}>
          <Text style={styles.authorName} numberOfLines={1}>
            {authorName}
          </Text>

          <View style={styles.metaRow /* wrap + shrink so chips never clip behind menu */}>
            <View style={styles.metaChip}>
              <Ionicons name="location-outline" size={14} color={themeColors.textSecondary} />
              <Text style={styles.metaChipText} numberOfLines={1}>
                {readyLocation || 'Somewhere nearby'}
              </Text>
            </View>

            <View style={[styles.metaChip, styles.metaChipGhost]}>
              <Ionicons name="time-outline" size={14} color={themeColors.textSecondary} />
              <Text style={styles.metaChipText} numberOfLines={1}>
                {relativeTime}
              </Text>
            </View>
          </View>
        </View>

        {/* Three-dots overflow menu (replaces always-on flag) */}
        <View style={{ position: 'relative' }}>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setMenuOpen((v) => !v)}
            activeOpacity={0.8}
          >
            <Ionicons name="ellipsis-horizontal" size={20} color={themeColors.textSecondary} />
          </TouchableOpacity>

          {menuOpen ? (
            <View style={styles.menuPopover}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setMenuOpen(false);
                  onReport?.(status);
                }}
              >
                <Ionicons
                  name="flag-outline"
                  size={16}
                  color={themeColors.textPrimary}
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.menuItemText}>Report status</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </View>

      <Text style={styles.message}>{message}</Text>

      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
      ) : null}

      <View style={styles.footerRow}>
        {/* Heart / reactions */}
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

        {/* Comments count right next to heart */}
        <TouchableOpacity
          style={[styles.footerPill, styles.footerPillGhost]}
          onPress={() => onPress?.(status)}
          activeOpacity={0.8}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={18} color={themeColors.textSecondary} />
          <Text style={styles.footerLabel}>{repliesCount}</Text>
        </TouchableOpacity>
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
      position: 'relative',
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    authorTextBlock: {
      marginLeft: 12,
      flex: 1,
      minWidth: 0,      // 🔧 lets text shrink instead of overflow
      flexShrink: 1,
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
      flexWrap: 'wrap', // 🔧 avoids clipping under menu on small widths
    },
    metaChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 4,
      paddingHorizontal: 10,
      borderRadius: 999,
      backgroundColor: palette.background,
      marginRight: 8,
      marginTop: 4,
      maxWidth: '100%',
      flexShrink: 1, // 🔧
    },
    metaChipGhost: {
      backgroundColor: palette.card,
      borderWidth: 1,
      borderColor: palette.divider,
    },
    metaChipText: {
      marginLeft: 6, // space after icon
      fontSize: 12,
      color: palette.textSecondary,
      flexShrink: 1, // 🔧
    },
    menuButton: { padding: 6, marginLeft: 6 },
    menuPopover: {
      position: 'absolute',
      top: 32,
      right: 0,
      backgroundColor: palette.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: palette.divider,
      paddingVertical: 6,
      minWidth: 160,
      shadowColor: '#000',
      shadowOpacity: 0.1,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 8 },
      elevation: 3,
      zIndex: 10,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    menuItemText: {
      color: palette.textPrimary,
      fontSize: 14,
      fontWeight: '600',
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
    },
    footerPill: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: palette.background,
      marginRight: 10, // keep pills next to each other
    },
    footerPillActive: {
      backgroundColor: palette.primary,
    },
    footerPillGhost: {
      backgroundColor: palette.background,
      opacity: 0.9,
    },
    footerLabel: {
      marginLeft: 8,
      fontSize: 13,
      fontWeight: '600',
      color: palette.textSecondary,
    },
    footerLabelActive: {
      color: '#fff',
    },
  });
