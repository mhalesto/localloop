import React from 'react';
import { Text, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { accentPresets } from '../contexts/SettingsContext';

const presetMap = accentPresets.reduce((acc, preset) => {
  acc[preset.key] = preset;
  return acc;
}, {});

export default function PostItem({
  post,
  onPress,
  onViewOriginal,
  onReact,
  onShare,
  roomName
}) {
  const preset = presetMap[post.colorKey ?? 'royal'] ?? accentPresets[0];
  const cardBackground = preset.background;
  const primaryTextColor = preset.onPrimary ?? (preset.isDark ? '#fff' : colors.textPrimary);
  const metaColor = preset.metaColor ?? (preset.isDark ? 'rgba(255,255,255,0.75)' : colors.textSecondary);
  const badgeBackground = preset.badgeBackground ?? colors.primaryLight;
  const badgeTextColor = preset.badgeTextColor ?? '#fff';
  const linkColor = preset.linkColor ?? colors.primaryDark;

  const sharedFrom = post.sharedFrom;
  const originRoom = post.sourceCity ?? roomName;
  const upvotes = post.upvotes ?? 0;
  const downvotes = post.downvotes ?? 0;
  const userVote = post.userVote ?? null;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={styles.touchable}
    >
      <View style={[styles.card, { backgroundColor: cardBackground }]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <View style={[styles.badge, { backgroundColor: badgeBackground }]}
            >
              <Text style={[styles.badgeText, { color: badgeTextColor }]}>Anonymous</Text>
            </View>
            {sharedFrom ? (
              <Text style={[styles.sharedLabel, { color: metaColor }]}>Shared from {sharedFrom.city}</Text>
            ) : null}
          </View>
          <View style={styles.headerActions}>
            {sharedFrom && onViewOriginal ? (
              <TouchableOpacity onPress={onViewOriginal} activeOpacity={0.7}>
                <Text style={[styles.viewOriginal, { color: linkColor }]}>View original</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        <Text style={[styles.roomMeta, { color: metaColor }]}>{originRoom}</Text>
        <Text style={[styles.message, { color: primaryTextColor }]}>{post.message}</Text>
        <Text style={[styles.meta, { color: metaColor }]}>
          {post.comments?.length === 1
            ? '1 comment'
            : `${post.comments?.length ?? 0} comments`}
        </Text>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onReact?.('up')}
            activeOpacity={0.7}
          >
            <Ionicons
              name={userVote === 'up' ? 'arrow-up-circle' : 'arrow-up-circle-outline'}
              size={20}
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
              size={20}
              color={userVote === 'down' ? linkColor : metaColor}
            />
            <Text style={[styles.actionCount, { color: metaColor }]}>{downvotes}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={onShare}
            activeOpacity={0.7}
          >
            <Ionicons name="paper-plane-outline" size={20} color={linkColor} />
            <Text style={[styles.actionLabel, { color: linkColor }]}>Share</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  touchable: {
    borderRadius: 20,
    marginHorizontal: 20,
    marginBottom: 16
  },
  card: {
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 8
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600'
  },
  sharedLabel: {
    fontSize: 12
  },
  viewOriginal: {
    fontSize: 12,
    fontWeight: '600'
  },
  iconButton: {
    marginRight: 12
  },
  roomMeta: {
    fontSize: 12,
    marginBottom: 6
  },
  message: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8
  },
  meta: {
    fontSize: 12,
    marginBottom: 12
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginTop: 10
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20
  },
  actionCount: {
    fontSize: 12
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '600'
  }
});
