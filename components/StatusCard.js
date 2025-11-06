import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import ProgressiveImage from './ProgressiveImage';
import { getThumbnailUrl, getBlurhash } from '../utils/imageUtils';
import { buildDreamyAccent } from '../utils/dreamyPalette';

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
  const { themeColors, accentPreset } = useSettings();
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const dreamyAccent = useMemo(
    () => buildDreamyAccent(accentPreset, themeColors),
    [accentPreset, themeColors]
  );

  const styles = useMemo(() => createStyles(themeColors, dreamyAccent), [themeColors, dreamyAccent]);

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
      style={styles.cardWrapper}
      onPress={() => {
        setMenuOpen(false);
        onPress?.(status);
      }}
      activeOpacity={0.92}
    >
      <LinearGradient
        colors={dreamyAccent.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardGradient}
      >
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={18} color="#fff" />
              </View>
              <View style={styles.authorTextBlock}>
                <Text style={styles.authorName} numberOfLines={1}>
                  {authorName}
                </Text>
                <Text style={styles.metaSubtitle}>{relativeTime}</Text>
              </View>
            </View>

            <View style={styles.menuWrap}>
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
                    <Ionicons name="flag-outline" size={16} color={themeColors.textSecondary} />
                    <Text style={styles.menuItemText}>Report status</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          </View>

          <View style={styles.cardTagRow}>
            <View style={styles.metaChip}>
              <Ionicons name="location-outline" size={14} color={themeColors.textSecondary} />
              <Text style={styles.metaChipText} numberOfLines={1}>
                {readyLocation || 'Somewhere nearby'}
              </Text>
            </View>
            {/* <View style={[styles.metaChip, styles.metaChipGhost]}>
              <Ionicons name="time-outline" size={14} color={themeColors.textSecondary} />
              <Text style={styles.metaChipText} numberOfLines={1}>
                {relativeTime}
              </Text>
            </View> */}
          </View>

          <Text style={styles.message}>{message}</Text>

          {imageUrl ? (
            <View style={styles.imageWrap}>
              <ProgressiveImage
                source={imageUrl}
                thumbnail={getThumbnailUrl(imageUrl, 400, 60)}
                blurhash={status?.blurhash || getBlurhash(imageUrl)}
                style={styles.image}
                contentFit="cover"
                transition={250}
              />
            </View>
          ) : null}

          <View style={styles.footerRow}>
            <TouchableOpacity
              style={[styles.footerPill, viewerReacted && styles.footerPillActive]}
              onPress={() => onReact?.(status)}
              activeOpacity={0.85}
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

            <TouchableOpacity
              style={[styles.footerPill, styles.footerPillGhost]}
              onPress={() => onPress?.(status)}
              activeOpacity={0.85}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={18} color={themeColors.textSecondary} />
              <Text style={styles.footerLabel}>{repliesCount}</Text>
            </TouchableOpacity>

            <View style={styles.footerSpacer} />
            <View style={styles.footerPulse}>
              <Ionicons name="sparkles-outline" size={16} color={themeColors.primaryDark} />
              <Text style={styles.footerPulseText}>Top vibe</Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const createStyles = (palette, accent) =>
  StyleSheet.create({
    cardWrapper: {
      marginBottom: 20,
    },
    cardGradient: {
      borderRadius: 26,
      padding: 1,
      shadowColor: accent.glow,
      shadowOpacity: 0.18,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 12 },
    },
    card: {
      backgroundColor: palette.card,
      borderRadius: 25,
      padding: 18,
      borderWidth: 1,
      borderColor: palette.divider,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      minWidth: 0,
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: accent.bubble,
      borderWidth: 1,
      borderColor: accent.outline,
      alignItems: 'center',
      justifyContent: 'center',
    },
    authorTextBlock: {
      marginLeft: 12,
      flex: 1,
      minWidth: 0,
    },
    authorName: {
      fontSize: 16,
      fontWeight: '700',
      color: palette.textPrimary,
    },
    metaSubtitle: {
      fontSize: 13,
      color: palette.textSecondary,
      marginTop: 2,
    },
    cardTagRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 12,
    },
    metaChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: palette.background,
      borderWidth: 1,
      borderColor: palette.divider,
      flexShrink: 1,
    },
    metaChipGhost: { backgroundColor: palette.card },
    metaChipText: {
      marginLeft: 6,
      fontSize: 12,
      color: palette.textSecondary,
      flexShrink: 1,
    },
    menuWrap: { position: 'relative' },
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
      zIndex: 10,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 8,
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
    imageWrap: {
      borderRadius: 18,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: palette.divider,
      marginTop: 14,
      marginBottom: 14,
    },
    image: {
      width: '100%',
      height: 200,
      backgroundColor: palette.background,
    },
    footerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 10,
      gap: 10,
    },
    footerPill: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: palette.background,
      borderWidth: 1,
      borderColor: palette.divider,
    },
    footerPillActive: {
      backgroundColor: palette.primary,
      borderColor: 'transparent',
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
    footerSpacer: { flex: 1 },
    footerPulse: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 14,
      backgroundColor: palette.background,
      borderWidth: 1,
      borderColor: palette.divider,
    },
    footerPulseText: {
      fontSize: 12,
      fontWeight: '600',
      color: palette.textSecondary,
    },
  });
