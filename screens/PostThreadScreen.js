// screens/PostThreadScreen.js
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  View,
  Text,
  FlatList,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  Dimensions,
  Share,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

import { usePosts } from '../contexts/PostsContext';
import ScreenLayout from '../components/ScreenLayout';
import CreatePostModal from '../components/CreatePostModal';
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
  const { addComment, deletePost, getPostById, sharePost, toggleVote, updatePost } = usePosts();
  const { accentPreset, userProfile, themeColors, isDarkMode } = useSettings();
  const styles = useMemo(() => createStyles(themeColors, { isDarkMode }), [themeColors, isDarkMode]);
  const insets = useSafeAreaInsets();

  const [reply, setReply] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [ownerMenuVisible, setOwnerMenuVisible] = useState(false);
  const [ownerMenuPosition, setOwnerMenuPosition] = useState({ top: 0, right: 12 });
  const ownerMenuAnchorRef = useRef(null);
  const sharePreviewRef = useRef(null);
  const [isSharingOutside, setIsSharingOutside] = useState(false);

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
  const destructiveColor = isDarkMode ? '#ff6b6b' : '#d64545';
  const authorName = (post.author?.nickname ?? '').trim() || 'Anonymous';
  const authorLocationParts = [post.author?.city, post.author?.province, post.author?.country].filter(Boolean);
  const authorLocation = authorLocationParts.join(', ');
  const authorAvatar = getAvatarConfig(post.author?.avatarKey);
  const authorAvatarBackground = authorAvatar.backgroundColor ?? badgeBackground;

  const editInitialLocation = useMemo(() => {
    if (!post) {
      return null;
    }
    const postCity = post.city ?? city;
    return {
      city: postCity,
      province: post.author?.province ?? '',
      country: post.author?.country ?? '',
    };
  }, [city, post]);

  const showViewOriginal =
    post.sourceCity && post.sourcePostId && !(post.sourceCity === city && post.sourcePostId === post.id);
  useEffect(() => {
    if (!feedbackMessage) return;
    const t = setTimeout(() => setFeedbackMessage(''), 2000);
    return () => clearTimeout(t);
  }, [feedbackMessage]);

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
      setFeedbackMessage(`Shared to ${targetCity}`);
      closeShareModal();
    },
    [city, closeShareModal, postId, sharePost, userProfile]
  );

  const handleShareOutside = useCallback(async () => {
    if (isSharingOutside || !post || !sharePreviewRef.current?.capture) {
      return;
    }

    try {
      setIsSharingOutside(true);
      const uri = await sharePreviewRef.current.capture({ result: 'tmpfile', format: 'png', quality: 1 });
      if (!uri) {
        throw new Error('capture_failed');
      }

      const canUseSharing = typeof Sharing?.isAvailableAsync === 'function' && (await Sharing.isAvailableAsync());
      if (canUseSharing) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Share post',
          UTI: 'public.png',
        });
      } else {
        const metaBits = [authorName];
        if (authorLocation) {
          metaBits.push(authorLocation);
        }
        metaBits.push(`${city} Room`);
        const shareLines = [];
        const trimmedTitle = post.title?.trim?.();
        const trimmedMessage = post.message?.trim?.();
        if (trimmedTitle) {
          shareLines.push(trimmedTitle);
        }
        if (trimmedMessage && trimmedMessage !== trimmedTitle) {
          shareLines.push(trimmedMessage);
        }
        shareLines.push(metaBits.join(' • '));
        await Share.share({
          url: uri,
          message: shareLines.filter(Boolean).join('\n\n'),
          title: 'Share post',
        });
      }
    } catch (error) {
      console.warn('Share outside failed', error);
      setFeedbackMessage('Unable to share right now');
    } finally {
      setIsSharingOutside(false);
    }
  }, [authorLocation, authorName, city, isSharingOutside, post, sharePreviewRef, setFeedbackMessage]);

  const openEditModal = useCallback(() => {
    if (!post?.createdByMe) {
      return;
    }
    setEditModalVisible(true);
  }, [post?.createdByMe]);

  const closeEditModal = useCallback(() => {
    setEditModalVisible(false);
  }, []);

  const handleSubmitEdit = useCallback(
    ({ title: nextTitle, message: nextMessage, colorKey }) => {
      const trimmedTitle = nextTitle?.trim?.() ?? '';
      const trimmedMessage = nextMessage?.trim?.() ?? '';
      const updates = {};

      if (trimmedTitle && trimmedTitle !== (post?.title ?? '').trim()) {
        updates.title = trimmedTitle;
      }

      if (trimmedMessage !== (post?.message ?? '').trim()) {
        updates.message = trimmedMessage;
      }

      if (colorKey && colorKey !== post?.colorKey) {
        updates.colorKey = colorKey;
      }

      if (Object.keys(updates).length === 0) {
        setEditModalVisible(false);
        return;
      }

      const success = updatePost(city, postId, updates);
      if (success) {
        setEditModalVisible(false);
        setFeedbackMessage('Post updated');
      } else {
        setFeedbackMessage('Unable to update post');
      }
    },
    [city, post?.colorKey, post?.message, post?.title, postId, updatePost]
  );

  const confirmDeletePost = useCallback(() => {
    if (!post?.createdByMe) {
      return;
    }

    Alert.alert(
      'Delete post',
      'Are you sure you want to delete this post?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const success = deletePost(city, postId);
            if (success) {
              setEditModalVisible(false);
              navigation.goBack();
            } else {
              setFeedbackMessage('Unable to delete post');
            }
          },
        },
      ],
      { cancelable: true }
    );
  }, [city, deletePost, navigation, post?.createdByMe, postId]);

  const closeOwnerMenu = useCallback(() => {
    setOwnerMenuVisible(false);
  }, []);

  const openOwnerMenu = useCallback(() => {
    if (!post?.createdByMe) {
      return;
    }

    const anchor = ownerMenuAnchorRef.current;
    if (!anchor) {
      setOwnerMenuVisible(true);
      return;
    }

    requestAnimationFrame(() => {
      anchor.measureInWindow((x = 0, y = 0, width = 0, height = 0) => {
        const { width: screenWidth } = Dimensions.get('window');
        const right = Math.max(12, screenWidth - (x + width));
        const top = Math.max(12, y + height + 4);
        setOwnerMenuPosition({ top, right });
        setOwnerMenuVisible(true);
      });
    });
  }, [post?.createdByMe]);

  const handlePressEdit = useCallback(() => {
    closeOwnerMenu();
    openEditModal();
  }, [closeOwnerMenu, openEditModal]);

  const handlePressDelete = useCallback(() => {
    closeOwnerMenu();
    confirmDeletePost();
  }, [closeOwnerMenu, confirmDeletePost]);

  useEffect(() => {
    if (!post?.createdByMe && ownerMenuVisible) {
      setOwnerMenuVisible(false);
    }
  }, [ownerMenuVisible, post?.createdByMe]);

  const renderPostCard = useCallback(
    ({ hideHeaderActions = false } = {}) => {
      if (!post) {
        return null;
      }
      const trimmedTitle = post?.title?.trim?.() ?? '';
      const trimmedDescription = post?.message?.trim?.() ?? '';
      const displayTitle = trimmedTitle || trimmedDescription || 'Untitled post';

      return (
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

            {!hideHeaderActions ? (
              <View style={styles.postHeaderActions}>
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

                <TouchableOpacity
                  onPress={handleShareOutside}
                  style={[styles.shareExternalButton, showViewOriginal && styles.shareExternalButtonWithLabel]}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel="Share this post"
                  disabled={isSharingOutside}
                >
                  {isSharingOutside ? (
                    <ActivityIndicator size="small" color={linkColor} style={styles.shareExternalSpinner} />
                  ) : (
                    <Ionicons name="share-social-outline" size={18} color={linkColor} />
                  )}
                </TouchableOpacity>

                {post.createdByMe ? (
                  <TouchableOpacity
                    ref={ownerMenuAnchorRef}
                    onPress={openOwnerMenu}
                    style={[styles.ownerMenuTrigger, showViewOriginal && styles.ownerMenuTriggerWithOriginal]}
                    activeOpacity={0.65}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="ellipsis-vertical" size={18} color={linkColor} />
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}
          </View>

          <Text style={[styles.postTitle, { color: headerTitleColor }]}>{displayTitle}</Text>
          {trimmedDescription && trimmedDescription !== displayTitle ? (
            <Text style={[styles.postMessage, { color: headerTitleColor }]}>{trimmedDescription}</Text>
          ) : null}
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
      );
    },
    [
      authorAvatar,
      authorAvatarBackground,
      authorLocation,
      authorName,
      badgeTextColor,
      city,
      comments.length,
      dividerColor,
      handleShareOutside,
      headerColor,
      headerMetaColor,
      headerTitleColor,
      isSharingOutside,
      linkColor,
      navigation,
      openOwnerMenu,
      openShareModal,
      post,
      postId,
      showViewOriginal,
      toggleVote,
      styles,
    ]
  );

  /** ---------- Sticky Post Header (ListHeaderComponent) ---------- */
  const Header = (
    <View style={styles.stickyHeaderWrap}>{renderPostCard({ hideHeaderActions: false })}</View>
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
      <View style={styles.shareCaptureContainer} pointerEvents="none" accessible={false}>
        <ViewShot
          ref={sharePreviewRef}
          options={{ format: 'png', quality: 1, result: 'tmpfile' }}
          style={styles.shareCaptureShot}
        >
          <View style={styles.stickyHeaderWrap}>{renderPostCard({ hideHeaderActions: true })}</View>
        </ViewShot>
      </View>

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
      <ShareLocationModal
        visible={shareModalVisible}
        onClose={closeShareModal}
        onSelectCity={(destinationCity) => handleShareCity(destinationCity)}
        originCity={city}
        accentColor={linkColor}
        initialCountry={userProfile.country || undefined}
        initialProvince={userProfile.province || undefined}
        onShareOutside={handleShareOutside}
        shareBusy={isSharingOutside}
      />

      <CreatePostModal
        visible={editModalVisible}
        onClose={closeEditModal}
        mode="edit"
        titleText="Edit post"
        submitLabel="Save changes"
        initialLocation={editInitialLocation}
        initialAccentKey={post?.colorKey ?? accentPreset.key}
        initialMessage={post?.message ?? ''}
        initialTitle={post?.title ?? ''}
        authorProfile={post?.author ?? {}}
        allowLocationChange={false}
        onSubmit={handleSubmitEdit}
      />

      <Modal
        visible={ownerMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={closeOwnerMenu}
      >
        <View style={styles.ownerMenuBackdrop}>
          <TouchableWithoutFeedback onPress={closeOwnerMenu}>
            <View style={styles.ownerMenuBackground} />
          </TouchableWithoutFeedback>

          <View style={[styles.ownerMenuContainer, { top: ownerMenuPosition.top, right: ownerMenuPosition.right }]}>
            <TouchableOpacity
              style={styles.ownerMenuItem}
              onPress={handlePressEdit}
              activeOpacity={0.7}
            >
              <Ionicons name="create-outline" size={18} color={linkColor} style={styles.ownerMenuItemIcon} />
              <Text style={[styles.ownerMenuItemText, { color: linkColor }]}>Edit post</Text>
            </TouchableOpacity>

            <View style={[styles.ownerMenuDivider, { backgroundColor: dividerColor }]} />

            <TouchableOpacity
              style={styles.ownerMenuItem}
              onPress={handlePressDelete}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={18} color={destructiveColor} style={styles.ownerMenuItemIcon} />
              <Text style={[styles.ownerMenuItemText, { color: destructiveColor }]}>Delete post</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {feedbackMessage ? (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{feedbackMessage}</Text>
        </View>
      ) : null}
    </ScreenLayout>
  );
}


const createStyles = (palette, { isDarkMode } = {}) =>
  StyleSheet.create({
    /* Sticky header wrapper so the pinned card blends with background */
    stickyHeaderWrap: { backgroundColor: palette.background, paddingTop: 4, paddingBottom: 12 },
    shareCaptureContainer: { position: 'absolute', top: -10000, left: 0, right: 0 },
    shareCaptureShot: { alignSelf: 'stretch' },

    /* Post card (wider) */
    postCard: {
      borderRadius: 24,
      paddingVertical: 20,
      paddingHorizontal: 18,
      marginHorizontal: 6, // matches composer spacing
      marginTop: 4,
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
    postHeaderActions: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      maxWidth: '45%',
      marginLeft: 12,
    },
    shareExternalButton: {
      paddingVertical: 4,
      paddingHorizontal: 6,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    shareExternalButtonWithLabel: { marginLeft: 8 },
    shareExternalSpinner: { width: 18, height: 18 },
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
    postTitle: { fontSize: 22, marginTop: 6, marginBottom: 10, fontWeight: '700', lineHeight: 28 },
    postMessage: { fontSize: 18, marginBottom: 18, fontWeight: '500', lineHeight: 24 },
    postMeta: { fontSize: 13, marginBottom: 12 },
    actionsFooter: { marginTop: 4, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
    actionsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 0 },
    actionButton: { flexDirection: 'row', alignItems: 'center', marginRight: 24 },
    actionCount: { fontSize: 12, marginLeft: 6 },
    actionLabel: { fontSize: 12, fontWeight: '600', marginLeft: 6 },
    viewOriginalButton: { marginRight: 4, paddingVertical: 4, paddingHorizontal: 4 },
    viewOriginalTop: { fontSize: 12, fontWeight: '600', textAlign: 'right' },
    ownerMenuTrigger: {
      paddingVertical: 4,
      paddingHorizontal: 6,
      borderRadius: 16,
      marginLeft: 4,
    },
    ownerMenuTriggerWithOriginal: { marginLeft: 8 },
    ownerMenuBackdrop: { flex: 1 },
    ownerMenuBackground: { ...StyleSheet.absoluteFillObject },
    ownerMenuContainer: {
      position: 'absolute',
      minWidth: 160,
      backgroundColor: palette.card,
      borderRadius: 14,
      paddingVertical: 4,
      shadowColor: '#000',
      shadowOpacity: isDarkMode ? 0.28 : 0.12,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 8 },
      elevation: 6,
    },
    ownerMenuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14 },
    ownerMenuItemIcon: { marginRight: 10 },
    ownerMenuItemText: { fontSize: 14, fontWeight: '600' },
    ownerMenuDivider: { height: StyleSheet.hairlineWidth, marginHorizontal: 10 },

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
