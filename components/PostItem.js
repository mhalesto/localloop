import React from 'react';
import { Text, StyleSheet, TouchableOpacity, View, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { accentPresets } from '../contexts/SettingsContext';
import { getAvatarConfig } from '../constants/avatars';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import RichText from './RichText';
import PollDisplay from './PollDisplay';

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
  onPollVote,
}) {
  const { user } = useAuth();
  const { themeColors } = useSettings();
  const preset = presetMap[post.colorKey ?? 'royal'] ?? accentPresets[0];

  // palette from preset (kept from your theme)
  const cardBackground = preset.background;
  const primaryTextColor = preset.onPrimary ?? (preset.isDark ? '#fff' : themeColors.textPrimary);
  const metaColor = preset.metaColor ?? (preset.isDark ? 'rgba(255,255,255,0.75)' : themeColors.textSecondary);
  const badgeBg = preset.badgeBackground ?? themeColors.primaryLight;
  const linkColor = preset.linkColor ?? themeColors.primaryDark;
  const highlightFill =
    post.highlightDescription
      ? preset.highlightFill ?? (preset.isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.08)')
      : null;

  const sharedFrom = post.sharedFrom;           // { city?: string }
  const upvotes = post.upvotes ?? 0;
  const downvotes = post.downvotes ?? 0;
  const shareCount = post.shareCount ?? 0;
  const userVote = post.userVote ?? null;     // 'up' | 'down' | null
  const commentCount = post.comments?.length ?? 0;

  // [PUBLIC-MODE] Determine if this is a public post
  const isPublicPost = post.isPublic || post.postingMode === 'public';

  // [PUBLIC-MODE] Use public profile info if available, otherwise use anonymous info
  const authorName = isPublicPost && post.authorDisplayName
    ? post.authorDisplayName
    : (post.author?.nickname ?? '').trim() || 'Anonymous';

  const authorUsername = isPublicPost && post.authorUsername ? `@${post.authorUsername}` : null;

  const locationParts = [post.author?.city, post.author?.province, post.author?.country].filter(Boolean);
  const authorLocation = !isPublicPost && locationParts.length > 0 ? locationParts.join(', ') : null;

  const avatarConfig = getAvatarConfig(post.author?.avatarKey);
  const avatarBackground = avatarConfig.backgroundColor ?? badgeBg;
  const hasProfilePhoto = isPublicPost && post.authorAvatar;

  const trimmedTitle = post.title?.trim?.() ?? '';
  const trimmedDescription = post.message?.trim?.() ?? '';
  const displayTitle = trimmedTitle || trimmedDescription || 'Untitled post';

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.touchable}>
      <View style={[styles.card, { backgroundColor: cardBackground }]}>
        {/* Header */}
        <View style={styles.cardHeader}>
          {/* Avatar badge + author block */}
          <View style={styles.headerLeft}>
            <View style={[styles.avatar, { backgroundColor: avatarBackground }]}>
              <View style={styles.avatarRing} />
              {/* [PUBLIC-MODE] Show profile photo for public posts */}
              {hasProfilePhoto ? (
                <Image source={{ uri: post.authorAvatar }} style={styles.avatarImage} />
              ) : avatarConfig.icon ? (
                <Ionicons
                  name={avatarConfig.icon.name}
                  size={22}
                  color={avatarConfig.icon.color ?? '#fff'}
                />
              ) : (
                <Text style={[styles.avatarEmoji, { color: avatarConfig.foregroundColor ?? '#fff' }]}>
                  {avatarConfig.emoji ?? '🙂'}
                </Text>
              )}
            </View>

            <View style={styles.authorBlock}>
              <Text style={[styles.posterName, { color: primaryTextColor }]}>{authorName}</Text>
              {/* [PUBLIC-MODE] Show username for public posts, location for anonymous */}
              {authorUsername ? (
                <Text
                  style={[styles.posterMeta, { color: metaColor }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {authorUsername}
                </Text>
              ) : authorLocation ? (
                <Text
                  style={[styles.posterMeta, { color: metaColor }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {authorLocation}
                </Text>
              ) : null}
              {sharedFrom?.city ? (
                <Text style={[styles.posterMeta, { color: metaColor }]}>
                  {`Shared from ${sharedFrom.city}`}
                </Text>
              ) : null}
            </View>
          </View>

          {/* No secondary header action */}
        </View>

        {/* Content */}
        <Text
          style={[
            styles.title,
            !trimmedDescription && styles.titleSolo,
            { color: primaryTextColor },
          ]}
        >
          {displayTitle}
        </Text>
        {trimmedDescription && trimmedDescription !== displayTitle ? (
          <View
            style={[
              styles.messageContainer,
              highlightFill && [
                styles.messageHighlight,
                { backgroundColor: highlightFill }
              ]
            ]}
          >
            <RichText
              text={trimmedDescription}
              textStyle={[styles.message, { color: primaryTextColor }]}
              linkStyle={{ color: linkColor }}
              numberOfLines={3}
            />
          </View>
        ) : null}

        {/* Poll Display */}
        {post.poll && (
          <View style={styles.pollContainer}>
            <PollDisplay
              poll={post.poll}
              onVote={(optionIndex) => onPollVote?.(post.id, optionIndex)}
              currentUserId={user?.uid}
              themeColors={{
                surface: cardBackground,
                background: preset.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                text: primaryTextColor,
                textSecondary: metaColor,
                border: preset.isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
                card: cardBackground,
              }}
              accentColor={linkColor}
              postAuthorId={post.authorId || post.author?.id}
            />
          </View>
        )}

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
            <Text style={[styles.actionCount, { color: metaColor }]}>{shareCount}</Text>
            <Text style={[styles.actionLabel, { color: linkColor }]}>Share</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom link retained below actions */}
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
    maxWidth: '80%',
  },
  avatarEmoji: {
    fontSize: 18,
    textAlign: 'center',
  },
  // [PUBLIC-MODE] Avatar image style for public posts
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },

  viewOriginal: {
    fontSize: 12,
    fontWeight: '700',
  },

  /* Body */
  title: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  titleSolo: {
    marginBottom: 12,
  },
  messageContainer: {
    marginBottom: 12,
  },
  messageHighlight: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  message: {
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 22,
  },

  /* Poll Container */
  pollContainer: {
    marginBottom: 12,
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
