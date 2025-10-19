// screens/PostThreadScreen.js
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Keyboard,
  Platform,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePosts } from '../contexts/PostsContext';
import ScreenLayout from '../components/ScreenLayout';
import { useSettings, accentPresets } from '../contexts/SettingsContext';
import ShareLocationModal from '../components/ShareLocationModal';
import { getAvatarConfig } from '../constants/avatars';

/* Simple circular avatar (no arrow/tail) */
function AvatarIcon({ tint, size = 32, style }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" style={style}>
      <Circle cx="32" cy="24" r="12" fill={tint} />
      <Path d="M16 54C16 43.954 24.954 36 35 36H29C39.046 36 48 43.954 48 54" fill={tint} />
    </Svg>
  );
}

export default function PostThreadScreen({ route, navigation }) {
  const { city, postId } = route.params;
  const { addComment, getPostById, sharePost, toggleVote } = usePosts();
  const { accentPreset, userProfile, themeColors, isDarkMode } = useSettings();
  const styles = useMemo(() => createStyles(themeColors, { isDarkMode }), [themeColors, isDarkMode]);
  const insets = useSafeAreaInsets();

  const [reply, setReply] = useState('');
  const [shareMessage, setShareMessage] = useState('');
  const [shareModalVisible, setShareModalVisible] = useState(false);

  // UI state: composer height & keyboard offset (so composer sits above keyboard)
  const [composerH, setComposerH] = useState(68);
  const [kbOffset, setKbOffset] = useState(0);

  const post = getPostById(city, postId);
  const comments = useMemo(() => post?.comments ?? [], [post]);

  // --- Keyboard listeners (robust with absolute-positioned composer)
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (e) => {
      const h = e?.endCoordinates?.height ?? 0;
      setKbOffset(Math.max(0, h - (insets.bottom || 0)));
    };
    const onHide = () => setKbOffset(0);

    const s1 = Keyboard.addListener(showEvt, onShow);
    const s2 = Keyboard.addListener(hideEvt, onHide);
    return () => {
      s1.remove();
      s2.remove();
    };
  }, [insets.bottom]);

  // Add comment
  const handleAddComment = () => {
    const t = reply.trim();
    if (!t) return;
    addComment(city, postId, t, userProfile);
    setReply('');
  };

  if (!post) {
    return (
      <ScreenLayout title="Thread" subtitle={`${city} Room`} onBack={() => navigation.goBack()}>
        <View style={styles.missingWrapper}>
          <View style={styles.missingCard}>
            <Text style={styles.notice}>This post is no longer available.</Text>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={[styles.primaryButton, { backgroundColor: accentPreset.buttonBackground }]}
              activeOpacity={0.85}
            >
              <Text style={[styles.primaryButtonText, { color: accentPreset.buttonForeground }]}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScreenLayout>
    );
  }

  // Palette pulled from the post's preset, falling back to the screen preset
  const postPreset = accentPresets.find((p) => p.key === post.colorKey) ?? accentPreset;
  const headerColor = postPreset.background;
  const headerTitleColor = postPreset.onPrimary ?? (postPreset.isDark ? '#fff' : themeColors.textPrimary);
  const headerMetaColor =
    postPreset.metaColor ?? (postPreset.isDark ? 'rgba(255,255,255,0.75)' : themeColors.textSecondary);
  const badgeBackground = postPreset.badgeBackground ?? themeColors.primaryLight;
  const badgeTextColor = postPreset.badgeTextColor ?? '#fff';
  const linkColor = postPreset.linkColor ?? themeColors.primaryDark;
  const dividerColor = postPreset.isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.08)';
  const commentHighlight = `${linkColor}1A`;
  const replyButtonBackground = accentPreset.buttonBackground ?? themeColors.primaryDark;
  const replyButtonForeground = accentPreset.buttonForeground ?? '#fff';
  const authorName = (post.author?.nickname ?? '').trim() || 'Anonymous';
  const authorLocationParts = [post.author?.city, post.author?.province, post.author?.country].filter(Boolean);
  const authorLocation = authorLocationParts.join(', ');
  const authorAvatar = getAvatarConfig(post.author?.avatarKey);
  const authorAvatarBackground = authorAvatar.backgroundColor ?? badgeBackground;

  const showViewOriginal =
    post.sourceCity && post.sourcePostId && !(post.sourceCity === city && post.sourcePostId === post.id);

  useEffect(() => {
    if (!shareMessage) return;
    const t = setTimeout(() => setShareMessage(''), 2000);
    return () => clearTimeout(t);
  }, [shareMessage]);

  const openShareModal = useCallback(() => {
    setShareModalVisible(true);
  }, []);

  const closeShareModal = useCallback(() => {
    setShareModalVisible(false);
  }, []);

  const handleShareCity = useCallback(
    (targetCity) => {
      if (!targetCity || targetCity === city) {
        closeShareModal();
        return;
      }
      sharePost(city, postId, targetCity, userProfile);
      setShareMessage(`Shared to ${targetCity}`);
      closeShareModal();
    },
    [city, closeShareModal, postId, sharePost, userProfile]
  );

  /** ---------- Sticky Post Header (ListHeaderComponent) ---------- */
  const Header = (
    <View style={styles.stickyHeaderWrap}>
      <View style={[styles.postCard, { backgroundColor: headerColor }]}>
        <View style={styles.postHeaderRow}>
          <View style={styles.postHeader}>
            <View style={[styles.avatar, { backgroundColor: authorAvatarBackground }]}>
              <View style={styles.avatarRing} />
              {authorAvatar.icon ? (
                <Ionicons
                  name={authorAvatar.icon.name}
                  size={22}
                  color={authorAvatar.icon.color ?? '#fff'}
                />
              ) : (
                <Text style={[styles.avatarEmoji, { color: authorAvatar.foregroundColor ?? '#fff' }]}>
                  {authorAvatar.emoji ?? '🙂'}
                </Text>
              )}
            </View>

            <View>
              <Text style={[styles.postBadge, { color: badgeTextColor }]}>{authorName}</Text>
              {authorLocation ? (
                <Text
                  style={[styles.postCity, { color: headerMetaColor }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {authorLocation}
                </Text>
              ) : null}
              {post.sourceCity && post.sourceCity !== city ? (
                <Text style={[styles.postCity, { color: headerMetaColor }]}>{post.sourceCity} Room</Text>
              ) : null}
              {post.sharedFrom?.city ? (
                <Text style={[styles.sharedBanner, { color: headerMetaColor }]}>Shared from {post.sharedFrom.city}</Text>
              ) : null}
            </View>
          </View>

          {showViewOriginal ? (
            <TouchableOpacity
              onPress={() =>
                navigation.navigate('PostThread', { city: post.sourceCity, postId: post.sourcePostId })
              }
              style={styles.viewOriginalButton}
              activeOpacity={0.75}
            >
              <Text style={[styles.viewOriginalTop, { color: linkColor }]}>View original</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <Text style={[styles.postMessage, { color: headerTitleColor }]}>{post.message}</Text>
        <Text style={[styles.postMeta, { color: headerMetaColor }]}>
          {comments.length === 1 ? '1 comment' : `${comments.length} comments`}
        </Text>

        <View style={[styles.actionsFooter, { borderTopColor: dividerColor }]}>
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => toggleVote(city, postId, 'up')}
              activeOpacity={0.7}
            >
              <Ionicons
                name={post.userVote === 'up' ? 'arrow-up-circle' : 'arrow-up-circle-outline'}
                size={20}
                color={post.userVote === 'up' ? linkColor : headerMetaColor}
              />
              <Text style={[styles.actionCount, { color: headerMetaColor }]}>{post.upvotes ?? 0}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => toggleVote(city, postId, 'down')}
              activeOpacity={0.7}
            >
              <Ionicons
                name={post.userVote === 'down' ? 'arrow-down-circle' : 'arrow-down-circle-outline'}
                size={20}
                color={post.userVote === 'down' ? linkColor : headerMetaColor}
              />
              <Text style={[styles.actionCount, { color: headerMetaColor }]}>{post.downvotes ?? 0}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={openShareModal} activeOpacity={0.7}>
              <Ionicons name="paper-plane-outline" size={20} color={linkColor} />
              <Text style={[styles.actionCount, { color: headerMetaColor }]}>{post.shareCount ?? 0}</Text>
              <Text style={[styles.actionLabel, { color: linkColor }]}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <ScreenLayout
      title="Thread"
      subtitle={`${city} Room`}
      onBack={() => navigation.goBack()}
      navigation={navigation}
      activeTab="home"
      showFooter={false}
    >
      {/* Comments list with sticky header. Padding grows with composer+keyboard */}
      <FlatList
        data={comments}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={Header}
        stickyHeaderIndices={[0]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const mine = item.createdByMe;
          return (
            <View style={[styles.commentRow, mine && styles.commentRowMine]}>
              {/* left avatar only for others */}
              {!mine && <AvatarIcon tint={badgeBackground} style={styles.commentAvatarLeft} />}

              {/* bubble */}
              <View
                style={[
                  styles.commentBubble,
                  mine && { backgroundColor: commentHighlight, borderColor: linkColor, borderWidth: 1 },
                ]}
              >
                <Text style={[styles.commentMessage, mine && { color: linkColor }]}>{item.message}</Text>
                {mine ? <Text style={[styles.commentMeta, { color: linkColor }]}>You replied</Text> : null}
              </View>

              {/* right avatar only for me */}
              {mine && <AvatarIcon tint={badgeBackground} style={styles.commentAvatarRight} />}
            </View>
          );
        }}
        ListEmptyComponent={<Text style={styles.emptyState}>No comments yet. Be the first to reply.</Text>}
        contentContainerStyle={{
          paddingHorizontal: 0,
          paddingBottom: composerH + kbOffset + (insets.bottom || 8) + 12,
        }}
      />

      {/* Fixed bottom composer pinned above the keyboard */}
      <View
        style={[
          styles.composerWrap,
          { bottom: kbOffset, paddingBottom: insets.bottom || 8 },
        ]}
        onLayout={(e) => setComposerH(e.nativeEvent.layout.height)}
      >
        <View style={styles.composerInner}>
          <TextInput
            value={reply}
            onChangeText={setReply}
            placeholder="Share your thoughts…"
            placeholderTextColor={themeColors.textSecondary}
            style={styles.composerInput}
            autoCapitalize="sentences"
            autoCorrect
            returnKeyType="send"
            onSubmitEditing={handleAddComment}
            clearButtonMode="while-editing"
          />
          <TouchableOpacity
            onPress={handleAddComment}
            disabled={!reply.trim()}
            activeOpacity={0.9}
            style={[
              styles.sendBtn,
              { backgroundColor: replyButtonBackground, opacity: reply.trim() ? 1 : 0.5 },
            ]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="send" size={18} color={replyButtonForeground} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Toast */}
      {shareMessage ? (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{shareMessage}</Text>
        </View>
      ) : null}

      <ShareLocationModal
        visible={shareModalVisible}
        onClose={closeShareModal}
        onSelectCity={(destinationCity) => handleShareCity(destinationCity)}
        originCity={city}
        accentColor={linkColor}
        initialCountry={userProfile.country || undefined}
        initialProvince={userProfile.province || undefined}
      />
    </ScreenLayout>
  );
}


const createStyles = (palette, { isDarkMode } = {}) =>
  StyleSheet.create({
    /* Sticky header wrapper so the pinned card blends with background */
    stickyHeaderWrap: { backgroundColor: palette.background, paddingTop: 8, paddingBottom: 12 },

    /* Post card (wider) */
    postCard: {
      borderRadius: 24,
      padding: 24,
      marginHorizontal: 8, // tighter margins → wider card
      marginBottom: 8,
      shadowColor: '#000',
      shadowOpacity: isDarkMode ? 0.24 : 0.1,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 8 },
      elevation: 5
    },

    /* Header */
    postHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
    postHeader: { flexDirection: 'row', alignItems: 'center', marginRight: 12, flex: 1 },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
      overflow: 'hidden'
    },
    avatarRing: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: 22,
      borderWidth: 2,
      borderColor: 'rgba(255,255,255,0.35)'
    },
    avatarEmoji: {
      fontSize: 20,
      textAlign: 'center'
    },
    postBadge: { fontSize: 16, fontWeight: '700' },
    postCity: { fontSize: 12, marginTop: 4, maxWidth: '80%' },
    sharedBanner: { fontSize: 12, marginTop: 6 },
    postMessage: { fontSize: 20, marginBottom: 18, fontWeight: '500' },
    postMeta: { fontSize: 13, marginBottom: 12 },
    actionsFooter: { marginTop: 4, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
    actionsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 0 },
    actionButton: { flexDirection: 'row', alignItems: 'center', marginRight: 24 },
    actionCount: { fontSize: 12, marginLeft: 6 },
    actionLabel: { fontSize: 12, fontWeight: '600', marginLeft: 6 },
    viewOriginalButton: { marginLeft: 12, paddingVertical: 4, paddingRight: 4 },
    viewOriginalTop: { fontSize: 12, fontWeight: '600', textAlign: 'right' },

    /* Comments (wider) */
    commentRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      marginBottom: 14,
      paddingHorizontal: 8 // tighter margins → wider bubbles
    },
    commentRowMine: { justifyContent: 'flex-end' },
    commentAvatarLeft: { marginRight: 10 },
    commentAvatarRight: { marginLeft: 10 },
    commentBubble: {
      maxWidth: '92%',
      flexShrink: 1,
      backgroundColor: palette.card,
      borderRadius: 18,
      padding: 14,
      shadowColor: '#000',
      shadowOpacity: isDarkMode ? 0.16 : 0.05,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2
    },
    commentMessage: { fontSize: 16, color: palette.textPrimary },
    commentMeta: { marginTop: 6, fontSize: 12, fontWeight: '600' },
    emptyState: { paddingHorizontal: 12, paddingVertical: 40, color: palette.textSecondary, textAlign: 'center' },

    /* Fixed bottom composer */
    composerWrap: {
      position: 'absolute',
      left: 0,
      right: 0,
      backgroundColor: palette.background,
      paddingTop: 8,
      paddingHorizontal: 8,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: palette.divider
    },
    composerInner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: palette.card,
      borderRadius: 16,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: palette.divider,
      marginHorizontal: 6,
      shadowColor: '#000',
      shadowOpacity: isDarkMode ? 0.14 : 0.04,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
      elevation: 2
    },
    composerInput: {
      flex: 1,
      height: 38,
      fontSize: 15,
      color: palette.textPrimary,
      paddingVertical: 6
    },
    sendBtn: {
      marginLeft: 8,
      borderRadius: 16,
      height: 32,
      minWidth: 36,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 10
    },

    /* Toast */
    toast: {
      position: 'absolute',
      bottom: 140,
      left: 20,
      right: 20,
      backgroundColor: 'rgba(0,0,0,0.75)',
      paddingVertical: 10,
      borderRadius: 12,
      alignItems: 'center'
    },
    toastText: { color: '#fff', fontSize: 12 },

    /* Missing state */
    missingWrapper: { flex: 1, justifyContent: 'center', paddingBottom: 40 },
    missingCard: {
      margin: 20,
      backgroundColor: palette.card,
      borderRadius: 16,
      padding: 24,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOpacity: isDarkMode ? 0.16 : 0.08,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 6 },
      elevation: 4
    },
    notice: { fontSize: 16, marginBottom: 16, color: palette.textPrimary, textAlign: 'center' }
  });
