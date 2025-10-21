// screens/PostThreadScreen.js
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
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
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { useIsFocused } from '@react-navigation/native';
import { TapGestureHandler, Swipeable } from 'react-native-gesture-handler';

import { usePosts } from '../contexts/PostsContext';
import ScreenLayout from '../components/ScreenLayout';
import CreatePostModal from '../components/CreatePostModal';
import { useSettings, accentPresets } from '../contexts/SettingsContext';
import ShareLocationModal from '../components/ShareLocationModal';
import { getAvatarConfig } from '../constants/avatars';
import RichText from '../components/RichText';
import { stripRichFormatting } from '../utils/textFormatting';

const REACTION_OPTIONS = ['👍', '🎉', '😂', '❤️', '🔥', '😮'];

const CommentListItem = React.memo(
  ({
    comment,
    commentId,
    mine,
    isHighlighted,
    parentComment,
    styles,
    themeColors,
    linkColor,
    badgeBackground,
    commentHighlightColor,
    showPicker,
    onTogglePicker,
    onClosePicker,
    onSelectReaction,
    availableReactions,
    onReply,
  }) => {
    const bubbleScale = React.useRef(new Animated.Value(1)).current;
    const pickerOpacity = React.useRef(new Animated.Value(showPicker ? 1 : 0)).current;
    const reactionPulse = React.useRef(new Animated.Value(1)).current;
    const swipeableRef = React.useRef(null);

    const reactionSignature = React.useMemo(() => {
      const counts = Object.entries(comment.reactions ?? {})
        .map(([emoji, data]) => `${emoji}:${data?.count ?? 0}`)
        .sort()
        .join('|');
      return `${counts}|${comment.userReaction ?? ''}`;
    }, [comment.reactions, comment.userReaction]);

    const reactionCounts = React.useMemo(() => {
      const counts = new Map();
      Object.entries(comment.reactions ?? {}).forEach(([emoji, data]) => {
        counts.set(emoji, data?.count ?? 0);
      });
      return counts;
    }, [comment.reactions]);

    React.useEffect(() => {
      bubbleScale.setValue(0.94);
      Animated.spring(bubbleScale, {
        toValue: 1,
        friction: 6,
        tension: 160,
        useNativeDriver: true,
      }).start();
      reactionPulse.setValue(0.82);
      Animated.spring(reactionPulse, {
        toValue: 1,
        friction: 5,
        tension: 200,
        useNativeDriver: true,
      }).start();
    }, [bubbleScale, reactionPulse, reactionSignature]);

    React.useEffect(() => {
      Animated.timing(pickerOpacity, {
        toValue: showPicker ? 1 : 0,
        duration: 160,
        useNativeDriver: true,
      }).start();
    }, [pickerOpacity, showPicker]);

    const renderLeftActions = (progress) => {
      const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] });
      const opacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] });
      return (
        <Animated.View style={[styles.swipeReplyAction, { transform: [{ scale }], opacity }]}>
          <Ionicons name="return-up-forward" size={18} color={linkColor} />
          <Text style={[styles.swipeReplyText, { color: linkColor }]}>Reply</Text>
        </Animated.View>
      );
    };

    const handleSwipeOpen = (direction) => {
      if (direction === 'left') {
        swipeableRef.current?.close();
        onReply(comment);
      }
    };

    const parentName = React.useMemo(() => {
      if (!parentComment) {
        return 'someone';
      }
      const nickname = parentComment.author?.nickname ?? parentComment.author?.name ?? '';
      const trimmed = nickname?.trim?.();
      return trimmed && trimmed.length ? trimmed : 'someone';
    }, [parentComment]);

    const displayName = React.useMemo(() => {
      const nickname = comment.author?.nickname?.trim?.();
      const name = comment.author?.name?.trim?.();
      return nickname?.length ? nickname : name?.length ? name : '';
    }, [comment.author?.name, comment.author?.nickname]);

    const handleDoubleTap = React.useCallback(() => {
      if (showPicker) {
        onClosePicker();
      } else {
        onTogglePicker(commentId);
      }
      reactionPulse.setValue(1);
    }, [commentId, onClosePicker, onTogglePicker, reactionPulse, showPicker]);

    const handleSelectReaction = (emoji) => {
      onSelectReaction(commentId, emoji);
      onClosePicker();
    };

    const bubbleStyles = [styles.commentBubble];
    if (mine) {
      bubbleStyles.push({ backgroundColor: commentHighlightColor, borderColor: linkColor, borderWidth: 1 });
    }
    if (isHighlighted) {
      bubbleStyles.push(
        styles.commentBubbleHighlighted,
        {
          borderColor: linkColor,
          backgroundColor: commentHighlightColor,
        },
      );
    }

    const pickerScale = pickerOpacity.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] });
    const pickerPosition = mine ? styles.reactionPickerRight : styles.reactionPickerLeft;
    const authorLabel = mine ? 'You' : displayName;

    return (
      <Swipeable
        ref={swipeableRef}
        renderLeftActions={renderLeftActions}
        overshootLeft={false}
        onSwipeableOpen={handleSwipeOpen}
        friction={2.5}
      >
        <View style={[styles.commentRow, mine && styles.commentRowMine]}>
          {!mine && (
            <CommentAvatar
              author={comment.author}
              fallbackColor={badgeBackground}
              styles={styles}
              wrapperStyle={styles.commentAvatarLeft}
            />
          )}

          <View style={[styles.commentBubbleWrapper, mine && styles.commentBubbleWrapperMine]}>
            <TapGestureHandler
              numberOfTaps={2}
              onActivated={handleDoubleTap}
              simultaneousHandlers={swipeableRef}
            >
              <Animated.View style={[...bubbleStyles, { transform: [{ scale: bubbleScale }] }]}> 
                {authorLabel ? (
                  <Text
                    style={[
                      styles.commentAuthorLabel,
                      mine ? { color: linkColor } : { color: themeColors.textSecondary },
                    ]}
                    numberOfLines={1}
                  >
                    {authorLabel}
                  </Text>
                ) : null}

                {parentComment ? (
                  <View style={styles.commentReplyReference}>
                    <Text
                      style={[
                        styles.commentReplyReferenceLabel,
                        { color: mine ? linkColor : themeColors.textSecondary },
                      ]}
                    >
                      Replying to {parentName}
                    </Text>
                    <Text
                      style={[styles.commentReplyReferenceSnippet, { color: themeColors.textSecondary }]}
                      numberOfLines={1}
                    >
                      {parentComment.message}
                    </Text>
                  </View>
                ) : comment.parentId ? (
                  <View style={styles.commentReplyReference}>
                    <Text
                      style={[styles.commentReplyReferenceLabel, { color: themeColors.textSecondary }]}
                    >
                      Replying to a comment
                    </Text>
                  </View>
                ) : null}

                <Text style={[styles.commentMessage, mine && { color: linkColor }]}>{comment.message}</Text>
              </Animated.View>
            </TapGestureHandler>

            {showPicker ? (
              <Animated.View
                pointerEvents={showPicker ? 'auto' : 'none'}
                style={[
                  styles.reactionPicker,
                  pickerPosition,
                  { opacity: pickerOpacity, transform: [{ scale: pickerScale }] },
                ]}
              >
                {availableReactions.map((emoji) => {
                  const count = reactionCounts.get(emoji) ?? 0;
                  const active = comment.userReaction === emoji;
                  return (
                    <TouchableOpacity
                      key={emoji}
                      onPress={() => handleSelectReaction(emoji)}
                      style={styles.reactionOptionTouchable}
                      activeOpacity={0.85}
                    >
                      <Animated.View
                        style={[
                          styles.reactionOption,
                          active && [styles.reactionOptionActive, { borderColor: linkColor }],
                          active ? { transform: [{ scale: reactionPulse }] } : null,
                        ]}
                      >
                        <Animated.Text style={styles.reactionOptionEmoji}>{emoji}</Animated.Text>
                        {count ? <Text style={styles.reactionOptionCount}>{count}</Text> : null}
                      </Animated.View>
                    </TouchableOpacity>
                  );
                })}

                <TouchableOpacity
                  onPress={onClosePicker}
                  style={styles.reactionOptionTouchable}
                  activeOpacity={0.8}
                >
                  <View style={styles.reactionOption}>
                    <Ionicons name="close" size={16} color={themeColors.textSecondary} />
                  </View>
                </TouchableOpacity>
              </Animated.View>
            ) : null}
          </View>

          {mine && (
            <CommentAvatar
              author={comment.author}
              fallbackColor={badgeBackground}
              styles={styles}
              wrapperStyle={styles.commentAvatarRight}
            />
          )}
        </View>
      </Swipeable>
    );
  }
);

const CommentAvatar = React.memo(({ author, fallbackColor, styles, wrapperStyle }) => {
  const avatarConfig = React.useMemo(() => getAvatarConfig(author?.avatarKey), [author?.avatarKey]);
  const backgroundColor = avatarConfig.backgroundColor ?? fallbackColor;
  const foregroundColor = avatarConfig.foregroundColor ?? '#fff';

  return (
    <View style={[styles.commentAvatarShell, wrapperStyle]}>
      <View style={[styles.commentAvatarCircle, { backgroundColor }]}>
        {avatarConfig.emoji ? (
          <Text style={[styles.commentAvatarEmoji, { color: foregroundColor }]}>{avatarConfig.emoji}</Text>
        ) : avatarConfig.icon ? (
          <Ionicons
            name={avatarConfig.icon.name}
            size={18}
            color={avatarConfig.icon.color ?? foregroundColor}
          />
        ) : (
          <Text style={[styles.commentAvatarEmoji, { color: foregroundColor }]}>🙂</Text>
        )}
      </View>
    </View>
  );
});


export default function PostThreadScreen({ route, navigation }) {
  const { city, postId, focusCommentId: routeFocusCommentId = null } = route.params;
  const {
    addComment,
    deletePost,
    getPostById,
    markThreadRead,
    markNotificationsForThreadRead,
    sharePost,
    toggleVote,
    toggleCommentReaction,
    updatePost,
    isPostSubscribed,
    togglePostSubscription,
    watchThread,
    setTypingStatus,
    observeTyping
  } = usePosts();
  const { accentPreset, userProfile, themeColors, isDarkMode } = useSettings();
  const styles = useMemo(() => createStyles(themeColors, { isDarkMode }), [themeColors, isDarkMode]);
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();

  const [reply, setReply] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [ownerMenuVisible, setOwnerMenuVisible] = useState(false);
  const [ownerMenuPosition, setOwnerMenuPosition] = useState({ top: 0, right: 12 });
  const ownerMenuAnchorRef = useRef(null);
  const sharePreviewRef = useRef(null);
  const [isSharingOutside, setIsSharingOutside] = useState(false);
  const [pendingFocusCommentId, setPendingFocusCommentId] = useState(routeFocusCommentId ?? null);
  const [highlightedCommentId, setHighlightedCommentId] = useState(null);
  const [typingUsers, setTypingUsers] = useState([]);
  const [replyingToComment, setReplyingToComment] = useState(null);
  const [reactionPickerCommentId, setReactionPickerCommentId] = useState(null);

  const typingActiveRef = useRef(false);
  const typingTimeoutRef = useRef(null);
  const lastTypingSentRef = useRef(0);

  const TYPING_THROTTLE_MS = 2000;
  const TYPING_STOP_DELAY_MS = 4000;

  // UI state: composer height & keyboard offset (so composer sits above keyboard)
  const [composerH, setComposerH] = useState(68);
  const [kbOffset, setKbOffset] = useState(0);

  const post = getPostById(city, postId);
  const hasPost = Boolean(post);
  const comments = useMemo(() => post?.comments ?? [], [post]);
  const commentsById = useMemo(() => {
    const map = new Map();
    comments.forEach((comment) => {
      if (comment?.id) {
        map.set(comment.id, comment);
      }
    });
    return map;
  }, [comments]);
  const isSubscribed = useMemo(() => isPostSubscribed(city, postId), [city, postId, isPostSubscribed]);
  const commentsListRef = useRef(null);
  const availableReactions = useMemo(() => REACTION_OPTIONS, []);

  useEffect(() => {
    if (reactionPickerCommentId && !commentsById.has(reactionPickerCommentId)) {
      setReactionPickerCommentId(null);
    }
  }, [commentsById, reactionPickerCommentId]);

  useEffect(() => {
    if (!replyingToComment) {
      return;
    }
    const latest = commentsById.get(replyingToComment.id);
    if (!latest) {
      setReplyingToComment(null);
    } else if (latest !== replyingToComment) {
      setReplyingToComment(latest);
    }
  }, [commentsById, replyingToComment]);

  useEffect(() => {
    if (!hasPost) {
      return;
    }

    const detach = watchThread(city, postId);
    return () => detach?.();
  }, [city, hasPost, postId, watchThread]);

  useEffect(() => {
    if (!hasPost) {
      setTypingUsers([]);
      return;
    }

    const unsubscribe = observeTyping(postId, (entries) => {
      const seen = new Set();
      const names = [];
      entries.forEach((entry) => {
        const label = entry.nickname?.trim?.() || 'Someone';
        if (!seen.has(label)) {
          seen.add(label);
          names.push(label);
        }
      });
      setTypingUsers(names);
    });

    return () => {
      unsubscribe?.();
      setTypingUsers([]);
    };
  }, [hasPost, observeTyping, postId]);

  useEffect(() => {
    if (!post || !isFocused) {
      return;
    }
    markThreadRead(city, post.id);
    markNotificationsForThreadRead(city, post.id);
  }, [city, comments.length, isFocused, markNotificationsForThreadRead, markThreadRead, post?.id]);

  useEffect(() => {
    if (!routeFocusCommentId) {
      return;
    }
    setPendingFocusCommentId(routeFocusCommentId);
  }, [routeFocusCommentId]);

  useEffect(() => {
    if (!pendingFocusCommentId) {
      return;
    }
    const index = comments.findIndex((comment) => comment.id === pendingFocusCommentId);
    if (index === -1) {
      return;
    }

    const scrollTimer = setTimeout(() => {
      if (commentsListRef.current?.scrollToIndex) {
        try {
          commentsListRef.current.scrollToIndex({ index, animated: true, viewPosition: 0.1 });
        } catch (error) {
          commentsListRef.current?.scrollToEnd?.({ animated: true });
        }
      }
      setHighlightedCommentId(pendingFocusCommentId);
      setPendingFocusCommentId(null);
      if (routeFocusCommentId) {
        navigation.setParams({ focusCommentId: null });
      }
    }, 200);

    return () => clearTimeout(scrollTimer);
  }, [comments, navigation, pendingFocusCommentId, routeFocusCommentId]);

  useEffect(() => {
    if (!highlightedCommentId) {
      return;
    }
    const timer = setTimeout(() => setHighlightedCommentId(null), 4000);
    return () => clearTimeout(timer);
  }, [highlightedCommentId]);

  const sendTypingUpdate = useCallback(
    (active) => {
      if (!hasPost) {
        return;
      }

      const now = Date.now();

      if (active) {
        if (!typingActiveRef.current || now - lastTypingSentRef.current >= TYPING_THROTTLE_MS) {
          lastTypingSentRef.current = now;
          typingActiveRef.current = true;
          setTypingStatus(postId, true, userProfile);
        }

        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        typingTimeoutRef.current = setTimeout(() => {
          typingActiveRef.current = false;
          setTypingStatus(postId, false, userProfile);
        }, TYPING_STOP_DELAY_MS);
      } else {
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = null;
        }
        if (typingActiveRef.current) {
          typingActiveRef.current = false;
          setTypingStatus(postId, false, userProfile);
        }
      }
    },
    [hasPost, postId, setTypingStatus, userProfile]
  );

  const closeReactionPicker = useCallback(() => {
    setReactionPickerCommentId(null);
  }, []);

  const handleToggleReactionPicker = useCallback((commentId) => {
    setReactionPickerCommentId((prev) => (prev === commentId ? null : commentId));
  }, []);

  const handleSelectReaction = useCallback(
    (commentId, emoji) => {
      if (!emoji) {
        return;
      }
      toggleCommentReaction(city, postId, commentId, emoji);
    },
    [city, postId, toggleCommentReaction]
  );

  const handleReplyToComment = useCallback((comment) => {
    if (!comment) {
      return;
    }
    setReplyingToComment(comment);
    setReactionPickerCommentId(null);
  }, []);

  const cancelReply = useCallback(() => {
    setReplyingToComment(null);
  }, []);

  useEffect(
    () => () => {
      if (!hasPost) {
        return;
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingActiveRef.current = false;
      setTypingStatus(postId, false, userProfile);
    },
    [hasPost, postId, setTypingStatus, userProfile]
  );

  const handleReplyChange = useCallback(
    (text) => {
      setReply(text);
      sendTypingUpdate(text.trim().length > 0);
    },
    [sendTypingUpdate]
  );

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
    addComment(city, postId, t, userProfile, replyingToComment?.id ?? null);
    setReply('');
    setReplyingToComment(null);
    closeReactionPicker();
    sendTypingUpdate(false);
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
  const typingLabel = useMemo(() => {
    if (!typingUsers.length) {
      return '';
    }
    if (typingUsers.length === 1) {
      return `${typingUsers[0]} is typing…`;
    }
    if (typingUsers.length === 2) {
      return `${typingUsers[0]} and ${typingUsers[1]} are typing…`;
    }
    return `${typingUsers[0]} and ${typingUsers.length - 1} others are typing…`;
  }, [typingUsers]);

  const replyingToLabel = useMemo(() => {
    if (!replyingToComment) {
      return '';
    }
    const nickname = replyingToComment.author?.nickname ?? replyingToComment.author?.name ?? '';
    const trimmed = nickname?.trim?.();
    if (trimmed && trimmed.length) {
      return trimmed;
    }
    return 'someone';
  }, [replyingToComment]);

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
          shareLines.push(stripRichFormatting(trimmedMessage));
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

  const handleToggleNotifications = useCallback(() => {
    const enabled = togglePostSubscription(city, postId);
    setFeedbackMessage(
      enabled ? 'Notifications enabled for this post' : 'Notifications turned off'
    );
    if (enabled) {
      markNotificationsForThreadRead(city, postId);
    }
  }, [city, markNotificationsForThreadRead, postId, togglePostSubscription]);

  const handleSubmitEdit = useCallback(
    ({ title: nextTitle, message: nextMessage, colorKey, highlightDescription }) => {
      const trimmedTitle = nextTitle?.trim?.() ?? '';
      const trimmedMessage = nextMessage?.trim?.() ?? '';
      const updates = {};

      if (trimmedTitle && trimmedTitle !== (post?.title ?? '').trim()) {
        updates.title = trimmedTitle;
      }

      if (trimmedMessage !== (post?.message ?? '').trim()) {
        updates.message = trimmedMessage;
      }

      if (
        typeof highlightDescription === 'boolean' &&
        highlightDescription !== !!post?.highlightDescription
      ) {
        updates.highlightDescription = highlightDescription;
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
    [city, post?.colorKey, post?.highlightDescription, post?.message, post?.title, postId, updatePost]
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
      const highlightFill =
        post.highlightDescription
          ? postPreset.highlightFill ??
            (postPreset.isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.08)')
          : null;
      const descriptionContainerStyle = post.highlightDescription
        ? [
            styles.postMessageContainer,
            styles.postMessageHighlighted,
            { backgroundColor: highlightFill }
          ]
        : styles.postMessageContainer;

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
                <TouchableOpacity
                  onPress={handleToggleNotifications}
                  style={[styles.notificationButton, showViewOriginal && styles.shareExternalButtonWithLabel]}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel={
                    isSubscribed ? 'Disable notifications for this post' : 'Enable notifications for this post'
                  }
                >
                  <Ionicons
                    name={isSubscribed ? 'notifications' : 'notifications-outline'}
                    size={18}
                    color={isSubscribed ? linkColor : headerMetaColor}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleShareOutside}
                  style={[styles.shareExternalButton, styles.shareExternalButtonWithLabel]}
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
          <View style={descriptionContainerStyle}>
            <RichText
              text={trimmedDescription}
              textStyle={[styles.postMessage, { color: headerTitleColor }]}
              linkStyle={{ color: linkColor }}
            />
          </View>
        ) : null}
          <Text style={[styles.postMeta, { color: headerMetaColor }]}>
            {comments.length === 1 ? '1 comment' : `${comments.length} comments`}
          </Text>

          <View style={[styles.actionsFooter, { borderTopColor: dividerColor }]}>
            <View style={styles.actionsFooterRow}>
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
              {!hideHeaderActions && showViewOriginal ? (
                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate('PostThread', { city: post.sourceCity, postId: post.sourcePostId })
                  }
                  style={styles.viewOriginalBottomButton}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.viewOriginalBottomText, { color: linkColor }]}>View original</Text>
                </TouchableOpacity>
              ) : null}
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
      handleToggleNotifications,
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
      isSubscribed,
      toggleVote,
      styles,
    ]
  );

  /** ---------- Sticky Post Header (ListHeaderComponent) ---------- */
  const Header = (
    <View style={styles.stickyHeaderWrap}>{renderPostCard({ hideHeaderActions: false })}</View>
  );

  const renderCommentItem = useCallback(
    ({ item }) => {
      const parentComment = item.parentId ? commentsById.get(item.parentId) ?? null : null;
      return (
        <CommentListItem
          comment={item}
          commentId={item.id}
          mine={item.createdByMe}
          isHighlighted={item.id === highlightedCommentId}
          parentComment={parentComment}
          styles={styles}
          themeColors={themeColors}
          linkColor={linkColor}
          badgeBackground={badgeBackground}
          commentHighlightColor={commentHighlight}
          showPicker={reactionPickerCommentId === item.id}
          onTogglePicker={handleToggleReactionPicker}
          onClosePicker={closeReactionPicker}
          onSelectReaction={handleSelectReaction}
          availableReactions={availableReactions}
          onReply={handleReplyToComment}
        />
      );
    },
    [
      availableReactions,
      badgeBackground,
      closeReactionPicker,
      commentsById,
      commentHighlight,
      handleReplyToComment,
      handleSelectReaction,
      handleToggleReactionPicker,
      highlightedCommentId,
      linkColor,
      reactionPickerCommentId,
      styles,
      themeColors,
    ]
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
        ref={commentsListRef}
        data={comments}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={Header}
        stickyHeaderIndices={[0]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        renderItem={renderCommentItem}
        extraData={[highlightedCommentId, reactionPickerCommentId]}
        onScrollBeginDrag={closeReactionPicker}
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
        {typingLabel ? (
          <View style={styles.typingIndicator}>
            <View style={[styles.typingDot, { backgroundColor: linkColor }]} />
            <Text style={[styles.typingText, { color: themeColors.textSecondary }]}>{typingLabel}</Text>
          </View>
        ) : null}
        {replyingToComment ? (
          <View style={styles.replyPreview}>
            <View style={[styles.replyPreviewIndicator, { backgroundColor: linkColor }]} />
            <View style={styles.replyPreviewContent}>
              <Text style={[styles.replyPreviewLabel, { color: themeColors.textSecondary }]}>
                Replying to {replyingToLabel}
              </Text>
              <Text
                style={[styles.replyPreviewSnippet, { color: themeColors.textSecondary }]}
                numberOfLines={1}
              >
                {replyingToComment.message}
              </Text>
            </View>
            <TouchableOpacity
              onPress={cancelReply}
              style={styles.replyPreviewClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={16} color={themeColors.textSecondary} />
            </TouchableOpacity>
          </View>
        ) : null}
        <View style={styles.composerInner}>
          <TextInput
            value={reply}
            onChangeText={handleReplyChange}
            placeholder="Share your thoughts…"
            placeholderTextColor={themeColors.textSecondary}
            style={styles.composerInput}
            autoCapitalize="sentences"
            autoCorrect
            returnKeyType="send"
            onSubmitEditing={handleAddComment}
            clearButtonMode="while-editing"
            onBlur={() => sendTypingUpdate(false)}
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
        initialHighlightDescription={!!post?.highlightDescription}
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
    notificationButton: {
      paddingVertical: 4,
      paddingHorizontal: 6,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
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
    postMessageContainer: { marginBottom: 18 },
    postMessageHighlighted: { borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10 },
    postMessage: { fontSize: 18, fontWeight: '500', lineHeight: 24 },
    postMeta: { fontSize: 13, marginBottom: 12 },
    actionsFooter: { marginTop: 4, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
    actionsFooterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
    },
    actionsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 0 },
    actionButton: { flexDirection: 'row', alignItems: 'center', marginRight: 24 },
    actionCount: { fontSize: 12, marginLeft: 6 },
    actionLabel: { fontSize: 12, fontWeight: '600', marginLeft: 6 },
    viewOriginalBottomButton: {
      paddingVertical: 6,
      paddingHorizontal: 4,
      marginLeft: 'auto',
      alignItems: 'center',
      justifyContent: 'center',
    },
    viewOriginalBottomText: { fontSize: 12, fontWeight: '600' },
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
      paddingHorizontal: 8, // tighter margins → wider bubbles
      overflow: 'visible'
    },
    commentRowMine: { justifyContent: 'flex-end' },
    commentAvatarLeft: { marginRight: 10 },
    commentAvatarRight: { marginLeft: 10 },
    commentAvatarShell: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
      shadowColor: '#000',
      shadowOpacity: isDarkMode ? 0.18 : 0.1,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
      elevation: 2
    },
    commentAvatarCircle: {
      width: '100%',
      height: '100%',
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: isDarkMode ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.08)'
    },
    commentAvatarEmoji: { fontSize: 18 },
    commentBubbleWrapper: {
      flexShrink: 1,
      flexGrow: 1,
      position: 'relative',
      alignItems: 'flex-start'
    },
    commentBubbleWrapperMine: { alignItems: 'flex-end' },
    commentBubble: {
      maxWidth: '92%',
      flexShrink: 1,
      backgroundColor: palette.card,
      borderRadius: 18,
      padding: 14,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'transparent',
      shadowColor: '#000',
      shadowOpacity: isDarkMode ? 0.16 : 0.05,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2
    },
    commentBubbleHighlighted: {
      borderWidth: 1.2,
      backgroundColor: 'transparent'
    },
    commentAuthorLabel: { fontSize: 12, fontWeight: '700', marginBottom: 6 },
    commentMessage: { fontSize: 16, color: palette.textPrimary, lineHeight: 21 },
    reactionPicker: {
      position: 'absolute',
      bottom: '100%',
      marginBottom: 10,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: palette.card,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 22,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: palette.divider,
      shadowColor: '#000',
      shadowOpacity: isDarkMode ? 0.24 : 0.12,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4
    },
    reactionPickerLeft: { left: 0 },
    reactionPickerRight: { right: 0 },
    reactionOptionTouchable: { marginHorizontal: 4 },
    reactionOption: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
      borderWidth: 1,
      borderColor: 'transparent'
    },
    reactionOptionActive: {
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.08)'
    },
    reactionOptionEmoji: { fontSize: 22 },
    reactionOptionCount: {
      position: 'absolute',
      bottom: 6,
      left: 0,
      right: 0,
      fontSize: 11,
      fontWeight: '600',
      color: palette.textSecondary,
      textAlign: 'center'
    },
    swipeReplyAction: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: palette.card,
      borderRadius: 18,
      marginLeft: 12,
      shadowColor: '#000',
      shadowOpacity: isDarkMode ? 0.22 : 0.1,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3
    },
    swipeReplyText: { marginLeft: 6, fontSize: 13, fontWeight: '600' },
    commentReplyReference: {
      marginBottom: 8,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 12,
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)'
    },
    commentReplyReferenceLabel: { fontSize: 12, fontWeight: '600' },
    commentReplyReferenceSnippet: { fontSize: 12, marginTop: 2 },
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
    typingIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 6,
      marginHorizontal: 14
    },
    typingDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      marginRight: 8
    },
    typingText: {
      fontSize: 13,
      color: palette.textSecondary
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
    replyPreview: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 14,
      marginBottom: 8,
      backgroundColor: palette.card,
      borderRadius: 16,
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: palette.divider,
      shadowColor: '#000',
      shadowOpacity: isDarkMode ? 0.18 : 0.06,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
      elevation: 2
    },
    replyPreviewIndicator: {
      width: 4,
      borderRadius: 2,
      marginRight: 10,
      alignSelf: 'stretch'
    },
    replyPreviewContent: { flex: 1 },
    replyPreviewLabel: { fontSize: 12, fontWeight: '600', marginBottom: 2 },
    replyPreviewSnippet: { fontSize: 12 },
    replyPreviewClose: { marginLeft: 10 },
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
