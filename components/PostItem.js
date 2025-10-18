import React from 'react';
import { Text, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { accentPresets } from '../contexts/SettingsContext';

const presetMap = accentPresets.reduce((acc, p) => {
  acc[p.key] = p;
  return acc;
}, {});

export default function PostItem({
  post,
  onPress,
  onViewOriginal,
  onReact,
  onShare,
}) {
  const preset = presetMap[post.colorKey ?? 'royal'] ?? accentPresets[0];

  // palette from preset (kept from your theme)
  const cardBackground = preset.background;
  const primaryTextColor = preset.onPrimary ?? (preset.isDark ? '#fff' : colors.textPrimary);
  const metaColor = preset.metaColor ?? (preset.isDark ? 'rgba(255,255,255,0.75)' : colors.textSecondary);
  const badgeBg = preset.badgeBackground ?? colors.primaryLight;
  const linkColor = preset.linkColor ?? colors.primaryDark;

  const sharedFrom = post.sharedFrom;           // { city?: string }
  const upvotes = post.upvotes ?? 0;
  const downvotes = post.downvotes ?? 0;
  const userVote = post.userVote ?? null;     // 'up' | 'down' | null
  const commentCount = post.comments?.length ?? 0;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.touchable}>
      <View style={[styles.card, { backgroundColor: cardBackground }]}>
        {/* Header */}
        <View style={styles.cardHeader}>
          {/* Avatar badge + author block */}
          <View style={styles.headerLeft}>
            <View style={[styles.avatar, { backgroundColor: badgeBg }]}>
              {/* subtle ring via overlay */}
              <View style={styles.avatarRing} />
              <Ionicons name="person" size={22} color="#fff" />
            </View>

            <View style={styles.authorBlock}>
              <Text style={[styles.posterName, { color: primaryTextColor }]}>Anonymous</Text>
              {/* room removed on purpose; show only "Shared from ..." if present */}
              {sharedFrom?.city ? (
                <Text style={[styles.posterMeta, { color: metaColor }]}>
                  {`Shared from ${sharedFrom.city}`}
                </Text>
              ) : null}
            </View>
          </View>

          {/* Optional "View original" action in header (small) */}
          {sharedFrom && onViewOriginal ? (
            <TouchableOpacity onPress={onViewOriginal} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={[styles.viewOriginal, { color: linkColor }]}>View original</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Message */}
        <Text style={[styles.message, { color: primaryTextColor }]}>{post.message}</Text>

        {/* Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onReact?.('up')}
            activeOpacity={0.7}
          >
            <Ionicons
              name={userVote === 'up' ? 'arrow-up-circle' : 'arrow-up-circle-outline'}
              size={18}
              color={userVote === 'up' ? linkColor : metaColor}
            />
            <Text style={[styles.actionCount, { color: metaColor }]}>{upvotes}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onReact?.('down')}
            activeOpacity={0.7}
          >
            <Ionicons
              name={userVote === 'down' ? 'arrow-down-circle' : 'arrow-down-circle-outline'}
              size={18}
              color={userVote === 'down' ? linkColor : metaColor}
            />
            <Text style={[styles.actionCount, { color: metaColor }]}>{downvotes}</Text>
          </TouchableOpacity>

          <View style={[styles.actionButton, styles.commentButton]}>
            <Ionicons name="chatbubble-ellipses-outline" size={18} color={metaColor} />
            <Text style={[styles.actionCount, { color: metaColor }]}>{commentCount}</Text>
          </View>

          <TouchableOpacity
            style={[styles.actionButton, styles.shareButton]}
            onPress={onShare}
            activeOpacity={0.7}
          >
            <Ionicons name="paper-plane-outline" size={18} color={linkColor} />
            <Text style={[styles.actionLabel, { color: linkColor }]}>Share</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom link (full size, matches your example) */}
        {sharedFrom && onViewOriginal ? (
          <TouchableOpacity onPress={onViewOriginal} activeOpacity={0.7}>
            <Text style={[styles.viewOriginalLink, { color: linkColor }]}>View original thread →</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  touchable: {
    borderRadius: 24,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  card: {
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },

  /* Header */
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  /* Avatar badge */
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    overflow: 'hidden',
  },
  avatarRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
  },

  authorBlock: { justifyContent: 'center' },

  posterName: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.1,
  },
  posterMeta: {
    fontSize: 12,
    marginTop: 4,
  },

  viewOriginal: {
    fontSize: 12,
    fontWeight: '700',
  },

  /* Body */
  message: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 10,
    letterSpacing: 0.2,
  },

  /* Actions */
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 22,
  },
  actionCount: {
    fontSize: 13,
    marginLeft: 6,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
  },
  commentButton: {
    marginRight: 22,
  },
  shareButton: {
    marginRight: 0,
  },

  /* Footer link */
  viewOriginalLink: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 14,
  },
});
