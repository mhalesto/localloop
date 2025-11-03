// screens/PostThreadScreen.js - AI Features with Loading States
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  ScrollView,
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  Dimensions,
  Share,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { StatusBar } from 'expo-status-bar';
import { useIsFocused } from '@react-navigation/native';
import { LongPressGestureHandler } from 'react-native-gesture-handler';
import * as Clipboard from 'expo-clipboard';

import { usePosts } from '../contexts/PostsContext';
import { useAuth } from '../contexts/AuthContext';
import ScreenLayout from '../components/ScreenLayout';
import CreatePostModal from '../components/CreatePostModal';
import {
  useSettings,
  accentPresets,
  DEFAULT_TITLE_FONT_SIZE,
  DEFAULT_DESCRIPTION_FONT_SIZE
} from '../contexts/SettingsContext';
import ShareLocationModal from '../components/ShareLocationModal';
import { getAvatarConfig } from '../constants/avatars';
import RichText from '../components/RichText';
import { stripRichFormatting } from '../utils/textFormatting';
import { TagList } from '../components/TagBadge';
import { ContentWarningList, SentimentBadge } from '../components/ContentWarningBadge';
import { summarizeThread } from '../services/openai/threadSummarizationService';
import { suggestComment, SUGGESTION_TYPES } from '../services/openai/commentSuggestionService';
import { translatePost, LANGUAGES, COMMON_LANGUAGES } from '../services/openai/translationService';
import { isFeatureEnabled } from '../config/aiFeatures';

const REACTION_OPTIONS = ['👍', '🎉', '😂', '❤️', '🔥', '😮'];
const HEADER_SCROLL_DISTANCE = 96;
const HEADER_BACKDROP_EXTRA = 84;
const APP_HEADER_BASE_HEIGHT = 82;


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
    onCopyComment,
  }) => {
    const bubbleScale = React.useRef(new Animated.Value(1)).current;
    const pickerOpacity = React.useRef(new Animated.Value(showPicker ? 1 : 0)).current;
    const reactionPulse = React.useRef(new Animated.Value(1)).current;

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

    const reactionEntries = React.useMemo(() => {
      const entries = Object.entries(comment.reactions ?? {})
        .map(([emoji, data]) => ({
          emoji,
          count: Math.max(Number(data?.count) || 0, 0),
          active: comment.userReaction === emoji,
        }))
        .filter((entry) => entry.count > 0);

      entries.sort((a, b) => {
        if (b.count === a.count) {
          return a.emoji.localeCompare(b.emoji);
        }
        return b.count - a.count;
      });

      return entries;
    }, [comment.reactions, comment.userReaction]);

    const hasReactions = reactionEntries.length > 0;

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

    const handleHold = React.useCallback(() => {
      onTogglePicker(commentId, true);
      reactionPulse.setValue(1);
    }, [commentId, onTogglePicker, reactionPulse]);

    const handleSelectReaction = (emoji) => {
      onSelectReaction(commentId, emoji);
      onClosePicker();
    };

    const handleReplyPress = React.useCallback(() => {
      onReply(comment);
      onClosePicker();
    }, [comment, onClosePicker, onReply]);

    const handleCopyPress = React.useCallback(() => {
      onCopyComment(comment);
      onClosePicker();
    }, [comment, onClosePicker, onCopyComment]);

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
    const popoverAlignment = mine ? styles.commentPopoverRight : styles.commentPopoverLeft;
    const authorLabel = mine ? 'You' : displayName;

    const rowStyles = [styles.commentRow, mine && styles.commentRowMine];
    if (showPicker) {
      rowStyles.push(styles.commentRowActive);
    }

    return (
      <View style={rowStyles}>
        {!mine && (
          <CommentAvatar
            author={comment.author}
            fallbackColor={badgeBackground}
            styles={styles}
            wrapperStyle={styles.commentAvatarLeft}
          />
        )}

        <View style={[styles.commentBubbleWrapper, mine && styles.commentBubbleWrapperMine]}>
          <LongPressGestureHandler minDurationMs={2000} onActivated={handleHold}>
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
          </LongPressGestureHandler>

          {showPicker ? (
            <>
              <Animated.View
                pointerEvents="auto"
                style={[
                  styles.commentPopoverContainer,
                  popoverAlignment,
                  { opacity: pickerOpacity, transform: [{ scale: pickerScale }] },
                ]}
              >
                <View style={styles.commentPopoverReactions}>
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
                </View>
              </Animated.View>

              <Animated.View
                pointerEvents="auto"
                style={[
                  styles.commentActionsPopover,
                  popoverAlignment,
                  { opacity: pickerOpacity, transform: [{ scale: pickerScale }] },
                ]}
              >
                <View style={styles.commentActionsSheet}>
                  <TouchableOpacity
                    onPress={handleReplyPress}
                    style={styles.commentActionButton}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="return-up-forward" size={18} color={themeColors.textSecondary} />
                    <Text style={[styles.commentActionLabel, { color: themeColors.textPrimary }]}>Reply</Text>
                  </TouchableOpacity>

                  <View style={[styles.commentActionDivider, { backgroundColor: themeColors.divider }]} />

                  <TouchableOpacity
                    onPress={handleCopyPress}
                    style={styles.commentActionButton}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="copy-outline" size={18} color={themeColors.textSecondary} />
                    <Text style={[styles.commentActionLabel, { color: themeColors.textPrimary }]}>Copy</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            </>
          ) : null}

          {hasReactions ? (
            <View
              style={[
                styles.commentReactionList,
                mine ? styles.commentReactionListRight : styles.commentReactionListLeft,
              ]}
            >
              {reactionEntries.map((entry) => (
                <TouchableOpacity
                  key={entry.emoji}
                  onPress={() => onSelectReaction(commentId, entry.emoji)}
                  activeOpacity={0.85}
                  style={styles.commentReactionChipTouchable}
                  accessibilityRole="button"
                  accessibilityLabel={`Toggle ${entry.emoji} reaction`}
                >
                  <View
                    style={[
                      styles.commentReactionChip,
                      entry.active && [styles.commentReactionChipActive, { borderColor: linkColor }],
                    ]}
                  >
                    <Text style={styles.commentReactionChipEmoji}>{entry.emoji}</Text>
                    <Text style={[styles.commentReactionChipCount, { color: themeColors.textSecondary }]}>
                      {entry.count}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
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
  const {
    accentPreset,
    userProfile,
    themeColors,
    isDarkMode,
    dreamyScrollIndicatorEnabled,
    premiumTypographyEnabled,
    premiumTitleFontSizeEnabled,
    premiumDescriptionFontSizeEnabled,
    premiumTitleFontSize,
    premiumDescriptionFontSize
  } = useSettings();
  const { user: firebaseUser } = useAuth();
  const effectiveTitleFontSize =
    premiumTypographyEnabled && premiumTitleFontSizeEnabled
      ? premiumTitleFontSize
      : DEFAULT_TITLE_FONT_SIZE;
  const effectiveDescriptionFontSize =
    premiumTypographyEnabled && premiumDescriptionFontSizeEnabled
      ? premiumDescriptionFontSize
      : DEFAULT_DESCRIPTION_FONT_SIZE;
  const styles = useMemo(
    () =>
      createStyles(themeColors, {
        isDarkMode,
        titleFontSize: effectiveTitleFontSize,
        descriptionFontSize: effectiveDescriptionFontSize
      }),
    [themeColors, isDarkMode, effectiveTitleFontSize, effectiveDescriptionFontSize]
  );
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();

  const [reply, setReply] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [ownerMenuVisible, setOwnerMenuVisible] = useState(false);
  const [ownerMenuPosition, setOwnerMenuPosition] = useState({ top: 0, right: 12 });
  const [isFullscreenModalVisible, setIsFullscreenModalVisible] = useState(false);
  const ownerMenuAnchorRef = useRef(null);
  const sharePreviewRef = useRef(null);
  const [isSharingOutside, setIsSharingOutside] = useState(false);
  const [pendingFocusCommentId, setPendingFocusCommentId] = useState(routeFocusCommentId ?? null);
  const [highlightedCommentId, setHighlightedCommentId] = useState(null);
  const [typingUsers, setTypingUsers] = useState([]);
  const [replyingToComment, setReplyingToComment] = useState(null);
  const [reactionPickerCommentId, setReactionPickerCommentId] = useState(null);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [showDescriptionWhenScrolled, setShowDescriptionWhenScrolled] = useState(false);
  const [isScrolledPastThreshold, setIsScrolledPastThreshold] = useState(false);
  const descriptionCollapseAnim = useRef(new Animated.Value(1)).current; // 1 = visible, 0 = collapsed

  // [AI-FEATURES] Thread summarization, comment suggestions, translation
  const [threadSummary, setThreadSummary] = useState(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const isSummarizingRef = useRef(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [showTranslationPicker, setShowTranslationPicker] = useState(false);

  const typingActiveRef = useRef(false);
  const typingTimeoutRef = useRef(null);
  const lastTypingSentRef = useRef(0);

  const TYPING_THROTTLE_MS = 2000;
  const TYPING_STOP_DELAY_MS = 4000;

  // UI state: composer height & keyboard offset (so composer sits above keyboard)
  const [composerH, setComposerH] = useState(68);
  const [kbOffset, setKbOffset] = useState(0);
  const [listLayoutHeight, setListLayoutHeight] = useState(0);
  const [listContentHeight, setListContentHeight] = useState(0);
  const [descriptionLayoutHeight, setDescriptionLayoutHeight] = useState(0);
  const [descriptionContentHeight, setDescriptionContentHeight] = useState(0);
  const [fullscreenLayoutHeight, setFullscreenLayoutHeight] = useState(0);
  const [fullscreenContentHeight, setFullscreenContentHeight] = useState(0);

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
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerReveal = useRef(new Animated.Value(0)).current;
  const scrollYValueRef = useRef(0);
  const isSnappingHeaderRef = useRef(false);
  const headerSnapAnimationRef = useRef(null);
  const dreamyIndicatorOpacity = useRef(new Animated.Value(0)).current;
  const dreamyIndicatorPulse = useRef(new Animated.Value(0)).current;
  const dreamyIndicatorHideTimeoutRef = useRef(null);
  const dreamyIndicatorAnimationRef = useRef(null);
  const dreamyIndicatorShouldShowRef = useRef(false);
  const descriptionScrollY = useRef(new Animated.Value(0)).current;
  const descriptionIndicatorOpacity = useRef(new Animated.Value(0)).current;
  const descriptionIndicatorPulse = useRef(new Animated.Value(0)).current;
  const descriptionIndicatorHideTimeoutRef = useRef(null);
  const descriptionIndicatorAnimationRef = useRef(null);
  const descriptionIndicatorShouldShowRef = useRef(false);
  const fullscreenScrollY = useRef(new Animated.Value(0)).current;
  const fullscreenIndicatorOpacity = useRef(new Animated.Value(0)).current;
  const fullscreenIndicatorPulse = useRef(new Animated.Value(0)).current;
  const fullscreenIndicatorHideTimeoutRef = useRef(null);
  const fullscreenIndicatorAnimationRef = useRef(null);
  const fullscreenIndicatorShouldShowRef = useRef(false);
  useEffect(() => {
    const listenerId = scrollY.addListener(({ value }) => {
      scrollYValueRef.current = value;
      const threshold = HEADER_SCROLL_DISTANCE * 0.5;
      const isPastThreshold = value >= threshold;
      if (isPastThreshold !== isScrolledPastThreshold) {
        setIsScrolledPastThreshold(isPastThreshold);
      }
    });
    return () => {
      scrollY.removeListener(listenerId);
    };
  }, [scrollY, isScrolledPastThreshold]);

  // Animate description collapse/expand
  useEffect(() => {
    const shouldShow = showDescriptionWhenScrolled || !isScrolledPastThreshold;
    Animated.timing(descriptionCollapseAnim, {
      toValue: shouldShow ? 1 : 0,
      duration: 400,
      easing: Easing.bezier(0.4, 0.0, 0.2, 1),
      useNativeDriver: false,
    }).start();
  }, [showDescriptionWhenScrolled, isScrolledPastThreshold, descriptionCollapseAnim]);

  const collapsedHeaderHorizontalPadding = useMemo(
    () => Math.max(insets.left || 0, insets.right || 0),
    [insets.left, insets.right]
  );
  const headerTranslateY = useMemo(
    () =>
      headerReveal.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -(HEADER_SCROLL_DISTANCE - 16)],
        extrapolate: 'clamp',
      }),
    [headerReveal]
  );
  const headerPaddingTop = useMemo(
    () =>
      headerReveal.interpolate({
        inputRange: [0, 1],
        outputRange: [24, 14],
        extrapolate: 'clamp',
      }),
    [headerReveal]
  );
  const headerPaddingHorizontal = useMemo(
    () =>
      headerReveal.interpolate({
        inputRange: [0, 1],
        outputRange: [20, collapsedHeaderHorizontalPadding],
        extrapolate: 'clamp',
      }),
    [collapsedHeaderHorizontalPadding, headerReveal]
  );
  const headerCardBorderRadius = useMemo(
    () =>
      headerReveal.interpolate({
        inputRange: [0, 1],
        outputRange: [24, 12],
        extrapolate: 'clamp',
      }),
    [headerReveal]
  );
  const headerCardMarginBottom = useMemo(
    () =>
      headerReveal.interpolate({
        inputRange: [0, 1],
        outputRange: [12, 0],
        extrapolate: 'clamp',
      }),
    [headerReveal]
  );
  const collapsedBackdropInset = useMemo(
    () => Math.max(insets.top || 0, 24) + HEADER_BACKDROP_EXTRA,
    [insets.top]
  );
  const collapsedBackdropHeight = useMemo(
    () => HEADER_SCROLL_DISTANCE + collapsedBackdropInset,
    [collapsedBackdropInset]
  );
  const headerBackdropHeight = useMemo(
    () =>
      headerReveal.interpolate({
        inputRange: [0, 1],
        outputRange: [0, collapsedBackdropHeight],
        extrapolate: 'clamp',
      }),
    [collapsedBackdropHeight, headerReveal]
  );
  const headerBackdropCapHeight = useMemo(
    () =>
      headerReveal.interpolate({
        inputRange: [0, 1],
        outputRange: [0, collapsedBackdropInset],
        extrapolate: 'clamp',
      }),
    [collapsedBackdropInset, headerReveal]
  );
  const headerBackdropTop = useMemo(
    () =>
      headerReveal.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -collapsedBackdropInset],
        extrapolate: 'clamp',
      }),
    [collapsedBackdropInset, headerReveal]
  );

  // Description visibility when scrolled
  const descriptionHeight = useMemo(
    () =>
      headerReveal.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [1, 0, 0],
        extrapolate: 'clamp',
      }),
    [headerReveal]
  );

  const descriptionOpacity = useMemo(
    () =>
      headerReveal.interpolate({
        inputRange: [0, 0.3, 1],
        outputRange: [1, 0, 0],
        extrapolate: 'clamp',
      }),
    [headerReveal]
  );
  const headerUnderlayOpacity = useMemo(
    () =>
      headerReveal.interpolate({
        inputRange: [0, 0.95, 1],
        outputRange: [0, 0, 1],
        extrapolate: 'clamp',
      }),
    [headerReveal]
  );
  const dreamyIndicatorTrackHeight = useMemo(
    () => Math.max(listLayoutHeight - 12, 0),
    [listLayoutHeight]
  );
  const dreamyScrollableRange = useMemo(
    () => Math.max(listContentHeight - listLayoutHeight, 0),
    [listContentHeight, listLayoutHeight]
  );
  const dreamyIndicatorThumbHeight = useMemo(() => {
    if (dreamyIndicatorTrackHeight <= 0) {
      return 0;
    }
    if (listContentHeight <= 0 || listContentHeight <= listLayoutHeight) {
      return dreamyIndicatorTrackHeight;
    }
    const visibleRatio = listLayoutHeight / listContentHeight;
    const minThumb = Math.min(dreamyIndicatorTrackHeight, 44);
    const computed = dreamyIndicatorTrackHeight * visibleRatio;
    return Math.max(Math.min(computed, dreamyIndicatorTrackHeight), minThumb);
  }, [listContentHeight, listLayoutHeight, dreamyIndicatorTrackHeight]);
  const dreamyIndicatorTravelRange = useMemo(
    () => Math.max(dreamyIndicatorTrackHeight - dreamyIndicatorThumbHeight, 0),
    [dreamyIndicatorThumbHeight, dreamyIndicatorTrackHeight]
  );
  const canRenderDreamyIndicator = dreamyScrollIndicatorEnabled;
  const shouldShowDreamyIndicator = useMemo(
    () =>
      canRenderDreamyIndicator &&
      dreamyScrollableRange > 8 &&
      dreamyIndicatorTrackHeight > 24 &&
      dreamyIndicatorThumbHeight > 0,
    [
      canRenderDreamyIndicator,
      dreamyIndicatorThumbHeight,
      dreamyIndicatorTrackHeight,
      dreamyScrollableRange,
    ]
  );
  const descriptionIndicatorTrackHeight = useMemo(
    () => Math.max(descriptionLayoutHeight - 4, 0),
    [descriptionLayoutHeight]
  );
  const descriptionScrollableRange = useMemo(
    () => Math.max(descriptionContentHeight - descriptionLayoutHeight, 0),
    [descriptionContentHeight, descriptionLayoutHeight]
  );
  const descriptionIndicatorThumbHeight = useMemo(() => {
    if (descriptionIndicatorTrackHeight <= 0) {
      return 0;
    }
    if (
      descriptionContentHeight <= 0 ||
      descriptionContentHeight <= descriptionLayoutHeight
    ) {
      return descriptionIndicatorTrackHeight;
    }
    const visibleRatio = descriptionLayoutHeight / descriptionContentHeight;
    const minThumb = Math.min(descriptionIndicatorTrackHeight, 40);
    const computed = descriptionIndicatorTrackHeight * visibleRatio;
    return Math.max(
      Math.min(computed, descriptionIndicatorTrackHeight),
      minThumb
    );
  }, [
    descriptionContentHeight,
    descriptionIndicatorTrackHeight,
    descriptionLayoutHeight,
  ]);
  const descriptionIndicatorTravelRange = useMemo(
    () =>
      Math.max(descriptionIndicatorTrackHeight - descriptionIndicatorThumbHeight, 0),
    [descriptionIndicatorThumbHeight, descriptionIndicatorTrackHeight]
  );
  const shouldShowDescriptionIndicator = useMemo(
    () =>
      dreamyScrollIndicatorEnabled &&
      isDescriptionExpanded &&
      descriptionScrollableRange > 8 &&
      descriptionIndicatorTrackHeight > 20 &&
      descriptionIndicatorThumbHeight > 0,
    [
      descriptionIndicatorThumbHeight,
      descriptionIndicatorTrackHeight,
      descriptionScrollableRange,
      dreamyScrollIndicatorEnabled,
      isDescriptionExpanded,
    ]
  );
  const fullscreenIndicatorTrackHeight = useMemo(
    () => Math.max(fullscreenLayoutHeight - 36, 0),
    [fullscreenLayoutHeight]
  );
  const fullscreenScrollableRange = useMemo(
    () => Math.max(fullscreenContentHeight - fullscreenLayoutHeight, 0),
    [fullscreenContentHeight, fullscreenLayoutHeight]
  );
  const fullscreenIndicatorThumbHeight = useMemo(() => {
    if (fullscreenIndicatorTrackHeight <= 0) {
      return 0;
    }
    if (
      fullscreenContentHeight <= 0 ||
      fullscreenContentHeight <= fullscreenLayoutHeight
    ) {
      return Math.min(fullscreenIndicatorTrackHeight * 0.25, fullscreenIndicatorTrackHeight);
    }
    const visibleRatio = fullscreenLayoutHeight / fullscreenContentHeight;
    const baseHeight = fullscreenIndicatorTrackHeight * visibleRatio;
    const scaledHeight = baseHeight * 0.25;
    const maxThumb = Math.min(fullscreenIndicatorTrackHeight * 0.3, fullscreenIndicatorTrackHeight);
    const minThumb = Math.min(Math.max(fullscreenIndicatorTrackHeight * 0.08, 8), maxThumb);
    return Math.max(Math.min(scaledHeight, maxThumb), minThumb);
  }, [
    fullscreenContentHeight,
    fullscreenIndicatorTrackHeight,
    fullscreenLayoutHeight,
  ]);
  const fullscreenIndicatorTravelRange = useMemo(
    () =>
      Math.max(fullscreenIndicatorTrackHeight - fullscreenIndicatorThumbHeight, 0),
    [fullscreenIndicatorThumbHeight, fullscreenIndicatorTrackHeight]
  );
  const shouldShowFullscreenIndicator = useMemo(
    () =>
      dreamyScrollIndicatorEnabled &&
      isFullscreenModalVisible &&
      fullscreenScrollableRange > 8 &&
      fullscreenIndicatorTrackHeight > 20 &&
      fullscreenIndicatorThumbHeight > 0,
    [
      dreamyScrollIndicatorEnabled,
      fullscreenIndicatorThumbHeight,
      fullscreenIndicatorTrackHeight,
      fullscreenScrollableRange,
      isFullscreenModalVisible,
    ]
  );
  const dreamyIndicatorTranslateY = useMemo(
    () =>
      scrollY.interpolate({
        inputRange: [0, Math.max(dreamyScrollableRange, 1)],
        outputRange: [0, dreamyIndicatorTravelRange],
        extrapolate: 'clamp',
      }),
    [dreamyIndicatorTravelRange, dreamyScrollableRange, scrollY]
  );
  const dreamyIndicatorScale = useMemo(
    () =>
      dreamyIndicatorPulse.interpolate({
        inputRange: [0, 1],
        outputRange: [0.94, 1.08],
      }),
    [dreamyIndicatorPulse]
  );
  const dreamyIndicatorHaloScale = useMemo(
    () =>
      dreamyIndicatorPulse.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.16],
      }),
    [dreamyIndicatorPulse]
  );
  const dreamyIndicatorGlowOpacity = useMemo(
    () =>
      dreamyIndicatorPulse.interpolate({
        inputRange: [0, 1],
        outputRange: [0.25, 0.65],
      }),
    [dreamyIndicatorPulse]
  );
  const dreamyIndicatorHaloOpacity = useMemo(
    () =>
      dreamyIndicatorPulse.interpolate({
        inputRange: [0, 1],
        outputRange: [0.18, 0.34],
      }),
    [dreamyIndicatorPulse]
  );
  const descriptionIndicatorTranslateY = useMemo(
    () =>
      descriptionScrollY.interpolate({
        inputRange: [0, Math.max(descriptionScrollableRange, 1)],
        outputRange: [0, descriptionIndicatorTravelRange],
        extrapolate: 'clamp',
      }),
    [
      descriptionIndicatorTravelRange,
      descriptionScrollableRange,
      descriptionScrollY,
    ]
  );
  const descriptionIndicatorScale = useMemo(
    () =>
      descriptionIndicatorPulse.interpolate({
        inputRange: [0, 1],
        outputRange: [0.92, 1.08],
      }),
    [descriptionIndicatorPulse]
  );
  const descriptionIndicatorHaloScale = useMemo(
    () =>
      descriptionIndicatorPulse.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.14],
      }),
    [descriptionIndicatorPulse]
  );
  const descriptionIndicatorGlowOpacity = useMemo(
    () =>
      descriptionIndicatorPulse.interpolate({
        inputRange: [0, 1],
        outputRange: [0.22, 0.6],
      }),
    [descriptionIndicatorPulse]
  );
  const descriptionIndicatorHaloOpacity = useMemo(
    () =>
      descriptionIndicatorPulse.interpolate({
        inputRange: [0, 1],
        outputRange: [0.16, 0.32],
      }),
    [descriptionIndicatorPulse]
  );
  const fullscreenIndicatorTranslateY = useMemo(
    () =>
      fullscreenScrollY.interpolate({
        inputRange: [0, Math.max(fullscreenScrollableRange, 1)],
        outputRange: [0, fullscreenIndicatorTravelRange],
        extrapolate: 'clamp',
      }),
    [
      fullscreenIndicatorTravelRange,
      fullscreenScrollableRange,
      fullscreenScrollY,
    ]
  );
  const fullscreenIndicatorScale = useMemo(
    () =>
      fullscreenIndicatorPulse.interpolate({
        inputRange: [0, 1],
        outputRange: [0.96, 1.05],
      }),
    [fullscreenIndicatorPulse]
  );
  const fullscreenIndicatorHaloScale = useMemo(
    () =>
      fullscreenIndicatorPulse.interpolate({
        inputRange: [0, 1],
        outputRange: [0.98, 1.1],
      }),
    [fullscreenIndicatorPulse]
  );
  const fullscreenIndicatorGlowOpacity = useMemo(
    () =>
      fullscreenIndicatorPulse.interpolate({
        inputRange: [0, 1],
        outputRange: [0.2, 0.5],
      }),
    [fullscreenIndicatorPulse]
  );
  const fullscreenIndicatorHaloOpacity = useMemo(
    () =>
      fullscreenIndicatorPulse.interpolate({
        inputRange: [0, 1],
        outputRange: [0.12, 0.24],
      }),
    [fullscreenIndicatorPulse]
  );
  const cancelDreamyIndicatorFade = useCallback(() => {
    if (dreamyIndicatorHideTimeoutRef.current) {
      clearTimeout(dreamyIndicatorHideTimeoutRef.current);
      dreamyIndicatorHideTimeoutRef.current = null;
    }
  }, []);
  const cancelDescriptionIndicatorFade = useCallback(() => {
    if (descriptionIndicatorHideTimeoutRef.current) {
      clearTimeout(descriptionIndicatorHideTimeoutRef.current);
      descriptionIndicatorHideTimeoutRef.current = null;
    }
  }, []);
  const cancelFullscreenIndicatorFade = useCallback(() => {
    if (fullscreenIndicatorHideTimeoutRef.current) {
      clearTimeout(fullscreenIndicatorHideTimeoutRef.current);
      fullscreenIndicatorHideTimeoutRef.current = null;
    }
  }, []);
  const startDreamyIndicatorPulse = useCallback(() => {
    if (dreamyIndicatorAnimationRef.current) {
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(dreamyIndicatorPulse, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(dreamyIndicatorPulse, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    dreamyIndicatorAnimationRef.current = animation;
    animation.start();
  }, [dreamyIndicatorPulse]);
  const startDescriptionIndicatorPulse = useCallback(() => {
    if (descriptionIndicatorAnimationRef.current) {
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(descriptionIndicatorPulse, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(descriptionIndicatorPulse, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    descriptionIndicatorAnimationRef.current = animation;
    animation.start();
  }, [descriptionIndicatorPulse]);
  const startFullscreenIndicatorPulse = useCallback(() => {
    if (fullscreenIndicatorAnimationRef.current) {
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(fullscreenIndicatorPulse, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(fullscreenIndicatorPulse, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    fullscreenIndicatorAnimationRef.current = animation;
    animation.start();
  }, [fullscreenIndicatorPulse]);
  const stopDreamyIndicatorPulse = useCallback(() => {
    if (dreamyIndicatorAnimationRef.current?.stop) {
      dreamyIndicatorAnimationRef.current.stop();
      dreamyIndicatorAnimationRef.current = null;
    }
    dreamyIndicatorPulse.stopAnimation();
    dreamyIndicatorPulse.setValue(0);
  }, [dreamyIndicatorPulse]);
  const stopDescriptionIndicatorPulse = useCallback(() => {
    if (descriptionIndicatorAnimationRef.current?.stop) {
      descriptionIndicatorAnimationRef.current.stop();
      descriptionIndicatorAnimationRef.current = null;
    }
    descriptionIndicatorPulse.stopAnimation();
    descriptionIndicatorPulse.setValue(0);
  }, [descriptionIndicatorPulse]);
  const stopFullscreenIndicatorPulse = useCallback(() => {
    if (fullscreenIndicatorAnimationRef.current?.stop) {
      fullscreenIndicatorAnimationRef.current.stop();
      fullscreenIndicatorAnimationRef.current = null;
    }
    fullscreenIndicatorPulse.stopAnimation();
    fullscreenIndicatorPulse.setValue(0);
  }, [fullscreenIndicatorPulse]);
  const showDreamyIndicator = useCallback(() => {
    if (!dreamyIndicatorShouldShowRef.current) {
      return;
    }
    cancelDreamyIndicatorFade();
    startDreamyIndicatorPulse();
    Animated.spring(dreamyIndicatorOpacity, {
      toValue: 1,
      stiffness: 320,
      damping: 28,
      mass: 0.8,
      useNativeDriver: true,
    }).start();
  }, [
    cancelDreamyIndicatorFade,
    dreamyIndicatorOpacity,
    startDreamyIndicatorPulse,
  ]);
  const showDescriptionIndicator = useCallback(() => {
    if (!descriptionIndicatorShouldShowRef.current) {
      return;
    }
    cancelDescriptionIndicatorFade();
    startDescriptionIndicatorPulse();
    Animated.spring(descriptionIndicatorOpacity, {
      toValue: 1,
      stiffness: 320,
      damping: 28,
      mass: 0.8,
      useNativeDriver: true,
    }).start();
  }, [
    cancelDescriptionIndicatorFade,
    descriptionIndicatorOpacity,
    startDescriptionIndicatorPulse,
  ]);
  const showFullscreenIndicator = useCallback(() => {
    if (!fullscreenIndicatorShouldShowRef.current) {
      return;
    }
    cancelFullscreenIndicatorFade();
    startFullscreenIndicatorPulse();
    Animated.spring(fullscreenIndicatorOpacity, {
      toValue: 1,
      stiffness: 320,
      damping: 26,
      mass: 0.8,
      useNativeDriver: true,
    }).start();
  }, [
    cancelFullscreenIndicatorFade,
    fullscreenIndicatorOpacity,
    startFullscreenIndicatorPulse,
  ]);
  const scheduleDreamyIndicatorFadeOut = useCallback(
    (delay = 600) => {
      if (!dreamyIndicatorShouldShowRef.current) {
        return;
      }
      cancelDreamyIndicatorFade();
      dreamyIndicatorHideTimeoutRef.current = setTimeout(() => {
        Animated.timing(dreamyIndicatorOpacity, {
          toValue: 0,
          duration: 360,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }).start(() => {
          stopDreamyIndicatorPulse();
        });
      }, delay);
    },
    [
      cancelDreamyIndicatorFade,
      dreamyIndicatorOpacity,
      stopDreamyIndicatorPulse,
    ]
  );
  const scheduleDescriptionIndicatorFadeOut = useCallback(
    (delay = 600) => {
      if (!descriptionIndicatorShouldShowRef.current) {
        return;
      }
      cancelDescriptionIndicatorFade();
      descriptionIndicatorHideTimeoutRef.current = setTimeout(() => {
        Animated.timing(descriptionIndicatorOpacity, {
          toValue: 0,
          duration: 360,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }).start(() => {
          stopDescriptionIndicatorPulse();
        });
      }, delay);
    },
    [
      cancelDescriptionIndicatorFade,
      descriptionIndicatorOpacity,
      stopDescriptionIndicatorPulse,
    ]
  );
  const scheduleFullscreenIndicatorFadeOut = useCallback(
    (delay = 600) => {
      if (!fullscreenIndicatorShouldShowRef.current) {
        return;
      }
      cancelFullscreenIndicatorFade();
      fullscreenIndicatorHideTimeoutRef.current = setTimeout(() => {
        Animated.timing(fullscreenIndicatorOpacity, {
          toValue: 0,
          duration: 320,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }).start(() => {
          stopFullscreenIndicatorPulse();
        });
      }, delay);
    },
    [
      cancelFullscreenIndicatorFade,
      fullscreenIndicatorOpacity,
      stopFullscreenIndicatorPulse,
    ]
  );
  useLayoutEffect(() => {
    dreamyIndicatorShouldShowRef.current = shouldShowDreamyIndicator;
    if (!shouldShowDreamyIndicator) {
      cancelDreamyIndicatorFade();
      stopDreamyIndicatorPulse();
      dreamyIndicatorOpacity.setValue(0);
    }
  }, [
    cancelDreamyIndicatorFade,
    dreamyIndicatorOpacity,
    shouldShowDreamyIndicator,
    stopDreamyIndicatorPulse,
  ]);
  useLayoutEffect(() => {
    descriptionIndicatorShouldShowRef.current = shouldShowDescriptionIndicator;
    if (!shouldShowDescriptionIndicator) {
      cancelDescriptionIndicatorFade();
      stopDescriptionIndicatorPulse();
      descriptionIndicatorOpacity.setValue(0);
    }
  }, [
    cancelDescriptionIndicatorFade,
    descriptionIndicatorOpacity,
    shouldShowDescriptionIndicator,
    stopDescriptionIndicatorPulse,
  ]);
  useLayoutEffect(() => {
    fullscreenIndicatorShouldShowRef.current = shouldShowFullscreenIndicator;
    if (!shouldShowFullscreenIndicator) {
      cancelFullscreenIndicatorFade();
      stopFullscreenIndicatorPulse();
      fullscreenIndicatorOpacity.setValue(0);
    }
  }, [
    cancelFullscreenIndicatorFade,
    fullscreenIndicatorOpacity,
    shouldShowFullscreenIndicator,
    stopFullscreenIndicatorPulse,
  ]);
  useEffect(
    () => () => {
      cancelDreamyIndicatorFade();
      stopDreamyIndicatorPulse();
    },
    [cancelDreamyIndicatorFade, stopDreamyIndicatorPulse]
  );
  useEffect(
    () => () => {
      cancelDescriptionIndicatorFade();
      stopDescriptionIndicatorPulse();
    },
    [cancelDescriptionIndicatorFade, stopDescriptionIndicatorPulse]
  );
  useEffect(
    () => () => {
      cancelFullscreenIndicatorFade();
      stopFullscreenIndicatorPulse();
    },
    [cancelFullscreenIndicatorFade, stopFullscreenIndicatorPulse]
  );
  useEffect(() => {
    if (!isDescriptionExpanded) {
      cancelDescriptionIndicatorFade();
      stopDescriptionIndicatorPulse();
      descriptionIndicatorOpacity.setValue(0);
      descriptionScrollY.setValue(0);
    }
  }, [
    cancelDescriptionIndicatorFade,
    descriptionIndicatorOpacity,
    descriptionScrollY,
    isDescriptionExpanded,
    stopDescriptionIndicatorPulse,
  ]);
  useEffect(() => {
    if (!isFullscreenModalVisible) {
      cancelFullscreenIndicatorFade();
      stopFullscreenIndicatorPulse();
      fullscreenIndicatorOpacity.setValue(0);
      fullscreenScrollY.setValue(0);
      setFullscreenLayoutHeight(0);
      setFullscreenContentHeight(0);
    }
  }, [
    cancelFullscreenIndicatorFade,
    fullscreenIndicatorOpacity,
    fullscreenScrollY,
    isFullscreenModalVisible,
    stopFullscreenIndicatorPulse,
  ]);
  const handleAnimatedScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
        useNativeDriver: false,
        listener: (event) => {
          const offset = event?.nativeEvent?.contentOffset?.y ?? 0;
          scrollYValueRef.current = offset;
          if (dreamyIndicatorShouldShowRef.current) {
            showDreamyIndicator();
            scheduleDreamyIndicatorFadeOut(800);
          }
          if (isSnappingHeaderRef.current) {
            return;
          }
          const clamped = Math.min(Math.max(offset, 0), HEADER_SCROLL_DISTANCE);
          headerReveal.setValue(clamped / HEADER_SCROLL_DISTANCE);
        },
      }),
    [
      headerReveal,
      scheduleDreamyIndicatorFadeOut,
      scrollY,
      showDreamyIndicator,
    ]
  );
  const handleDescriptionScroll = useMemo(
    () =>
      Animated.event(
        [{ nativeEvent: { contentOffset: { y: descriptionScrollY } } }],
        {
          useNativeDriver: true,
          listener: () => {
            if (descriptionIndicatorShouldShowRef.current) {
              showDescriptionIndicator();
              scheduleDescriptionIndicatorFadeOut(800);
            }
          },
        }
      ),
    [
      descriptionScrollY,
      scheduleDescriptionIndicatorFadeOut,
      showDescriptionIndicator,
    ]
  );
  const handleDescriptionScrollBegin = useCallback(() => {
    if (descriptionIndicatorShouldShowRef.current) {
      showDescriptionIndicator();
    }
  }, [showDescriptionIndicator]);
  const handleDescriptionScrollEnd = useCallback(() => {
    scheduleDescriptionIndicatorFadeOut(700);
  }, [scheduleDescriptionIndicatorFadeOut]);
  const handleFullscreenScroll = useMemo(
    () =>
      Animated.event(
        [{ nativeEvent: { contentOffset: { y: fullscreenScrollY } } }],
        {
          useNativeDriver: true,
          listener: () => {
            if (fullscreenIndicatorShouldShowRef.current) {
              showFullscreenIndicator();
              scheduleFullscreenIndicatorFadeOut(900);
            }
          },
        }
      ),
    [
      fullscreenScrollY,
      scheduleFullscreenIndicatorFadeOut,
      showFullscreenIndicator,
    ]
  );
  const handleFullscreenScrollBegin = useCallback(() => {
    if (fullscreenIndicatorShouldShowRef.current) {
      showFullscreenIndicator();
    }
  }, [showFullscreenIndicator]);
  const handleFullscreenScrollEnd = useCallback(() => {
    scheduleFullscreenIndicatorFadeOut(700);
  }, [scheduleFullscreenIndicatorFadeOut]);

  const isMomentumScrollingRef = useRef(false);
  const maybeSnapHeader = useCallback(
    (offset) => {
      const currentOffset = typeof offset === 'number' ? offset : scrollYValueRef.current;
      const clampedOffset = Math.min(Math.max(currentOffset, 0), HEADER_SCROLL_DISTANCE);
      const snapPoint = clampedOffset < HEADER_SCROLL_DISTANCE / 2 ? 0 : HEADER_SCROLL_DISTANCE;
      if (Math.abs(snapPoint - clampedOffset) < 1) {
        return;
      }
      const targetProgress = snapPoint / HEADER_SCROLL_DISTANCE;
      if (headerSnapAnimationRef.current?.stop) {
        headerSnapAnimationRef.current.stop();
        headerSnapAnimationRef.current = null;
      }
      headerReveal.stopAnimation();
      const list = commentsListRef.current;
      if (list) {
        list.scrollToOffset({ offset: snapPoint, animated: false });
      }
      scrollY.stopAnimation();
      scrollY.setValue(snapPoint);
      scrollYValueRef.current = snapPoint;
      isSnappingHeaderRef.current = true;
      const animation = Animated.spring(headerReveal, {
        toValue: targetProgress,
        tension: 210,
        friction: 26,
        useNativeDriver: false,
      });
      headerSnapAnimationRef.current = animation;
      animation.start(() => {
        headerReveal.setValue(targetProgress);
        isSnappingHeaderRef.current = false;
        headerSnapAnimationRef.current = null;
      });
    },
    [headerReveal, scrollY]
  );

  const handleScrollBeginDrag = useCallback(() => {
    if (headerSnapAnimationRef.current?.stop) {
      headerSnapAnimationRef.current.stop();
      headerSnapAnimationRef.current = null;
    }
    headerReveal.stopAnimation();
    const clamped = Math.min(Math.max(scrollYValueRef.current, 0), HEADER_SCROLL_DISTANCE);
    headerReveal.setValue(clamped / HEADER_SCROLL_DISTANCE);
    isSnappingHeaderRef.current = false;
    isMomentumScrollingRef.current = false;
    closeReactionPicker();
    showDreamyIndicator();
  }, [closeReactionPicker, headerReveal, showDreamyIndicator]);

  const handleMomentumScrollBegin = useCallback(() => {
    isMomentumScrollingRef.current = true;
    showDreamyIndicator();
  }, [showDreamyIndicator]);

  const handleMomentumScrollEnd = useCallback(() => {
    isMomentumScrollingRef.current = false;
    maybeSnapHeader();
    scheduleDreamyIndicatorFadeOut(400);
  }, [maybeSnapHeader, scheduleDreamyIndicatorFadeOut]);

  const handleScrollEndDrag = useCallback(
    (event) => {
      if (isMomentumScrollingRef.current) {
        return;
      }
      maybeSnapHeader(event?.nativeEvent?.contentOffset?.y ?? scrollYValueRef.current);
      scheduleDreamyIndicatorFadeOut();
    },
    [maybeSnapHeader, scheduleDreamyIndicatorFadeOut]
  );

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

  const handleToggleReactionPicker = useCallback((commentId, forceOpen = false) => {
    setReactionPickerCommentId((prev) => {
      if (forceOpen) {
        return commentId;
      }
      return prev === commentId ? null : commentId;
    });
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

  const handleCopyComment = useCallback(
    async (comment) => {
      const raw = comment?.message ?? '';
      const text = stripRichFormatting(raw).trim();

      if (!text.length) {
        setFeedbackMessage('Nothing to copy');
        return;
      }

      try {
        await Clipboard.setStringAsync(text);
        setFeedbackMessage('Copied to clipboard');
      } catch (error) {
        setFeedbackMessage('Unable to copy comment');
      }
    },
    [setFeedbackMessage]
  );

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

  // [AI-FEATURES] Thread Summarization
  const handleSummarizeThread = useCallback(async () => {
    if (isSummarizingRef.current) {
      console.log('[ThreadSummary] Already summarizing, ignoring click');
      return;
    }

    if (comments.length < 10) {
      Alert.alert('Too few comments', 'Threads need at least 10 comments to summarize');
      return;
    }

    console.log('[ThreadSummary] Starting summarization...');

    // Update both ref and state
    isSummarizingRef.current = true;
    setIsSummarizing(true);
    console.log('[ThreadSummary] Set isSummarizingRef and state to true');

    try {
      const result = await summarizeThread(comments, post);
      console.log('[ThreadSummary] Summarization complete');
      isSummarizingRef.current = false;
      setIsSummarizing(false);
      // Navigate to dedicated summary screen
      navigation.navigate('ThreadSummary', {
        postTitle: post.title,
        summary: result.summary,
      });
    } catch (error) {
      console.log('[ThreadSummary] Summarization failed:', error.message);
      isSummarizingRef.current = false;
      setIsSummarizing(false);
      Alert.alert('Summary failed', error.message);
    }
  }, [comments, post, navigation]);

  // [AI-FEATURES] Comment Suggestions
  const handleGetSuggestion = async (type = SUGGESTION_TYPES.THOUGHTFUL) => {
    setIsLoadingSuggestion(true);
    try {
      const result = await suggestComment(post, type);
      setReply(result.suggestion);
    } catch (error) {
      Alert.alert('Suggestion failed', error.message);
    } finally {
      setIsLoadingSuggestion(false);
    }
  };

  // [AI-FEATURES] Translation
  const handleTranslate = async (targetLang) => {
    setIsTranslating(true);
    setShowTranslationPicker(false);
    try {
      const result = await translatePost(post, targetLang);
      setIsTranslating(false);

      // Navigate to ThreadSummary screen with translation
      const languageName = Object.values(LANGUAGES).find(l => l.code === targetLang)?.name || targetLang;
      navigation.navigate('ThreadSummary', {
        postTitle: `${post.title} (${languageName})`,
        summary: `${result.title}\n\n${result.message}`,
        isTranslation: true,
        targetLanguage: languageName,
      });
    } catch (error) {
      setIsTranslating(false);
      Alert.alert('Translation failed', error.message);
    }
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
  const headerUnderlayHeight = useMemo(
    () => (insets.top || 0) + APP_HEADER_BASE_HEIGHT,
    [insets.top]
  );
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
      if (!firebaseUser?.uid) {
        Alert.alert('Sign in required', 'Sign in to share posts to another room.');
        closeShareModal();
        return;
      }
      const shared = sharePost(city, postId, targetCity, userProfile);
      if (shared) {
        setFeedbackMessage(`Shared to ${targetCity}`);
      } else {
        Alert.alert('Unable to share', 'We could not share that post right now. Please try again soon.');
      }
      closeShareModal();
    },
    [city, closeShareModal, firebaseUser?.uid, postId, sharePost, userProfile]
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
    ({ title: nextTitle, message: nextMessage, colorKey, highlightDescription, poll }) => {
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

      // Handle poll updates
      if (poll !== undefined) {
        const pollChanged = JSON.stringify(poll) !== JSON.stringify(post?.poll ?? null);
        if (pollChanged) {
          updates.poll = poll;
        }
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
    [city, post?.colorKey, post?.highlightDescription, post?.message, post?.title, post?.poll, postId, updatePost]
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

  useEffect(() => {
    setIsDescriptionExpanded(false);
  }, [post?.message]);
  const handleDescriptionLayout = useCallback(({ nativeEvent }) => {
    const measured = nativeEvent?.layout?.height ?? 0;
    const nextHeight = Number.isFinite(measured) ? measured : 0;
    setDescriptionLayoutHeight((prev) =>
      Math.abs(prev - nextHeight) < 0.5 ? prev : nextHeight
    );
  }, []);
  const handleDescriptionContentSizeChange = useCallback((_, height) => {
    const nextHeight = Number.isFinite(height) ? height : 0;
    setDescriptionContentHeight((prev) =>
      Math.abs(prev - nextHeight) < 0.5 ? prev : nextHeight
    );
  }, []);

  const renderPostCard = useCallback(
    ({ hideHeaderActions = false, forceExpanded = false, WrapperComponent = View, wrapperStyle } = {}) => {
      if (!post) {
        return null;
      }
      const trimmedTitle = post?.title?.trim?.() ?? '';
      const trimmedDescription = post?.message?.trim?.() ?? '';
      const displayTitle = trimmedTitle || trimmedDescription || 'Untitled post';
      const strippedDescription = stripRichFormatting(trimmedDescription)
        ?.replace(/\s+/g, ' ')
        ?.trim?.();
      const collapsedPreviewText = strippedDescription?.length
        ? strippedDescription
        : trimmedDescription;

      // Truncate text to leave room for "Show more" on the 3rd line
      const maxCharsForThreeLines = 165; // Approximate chars for ~2.7 lines to leave room for "Show more"
      const truncatedPreviewText = collapsedPreviewText?.length > maxCharsForThreeLines
        ? collapsedPreviewText.substring(0, maxCharsForThreeLines).trim() + '...'
        : collapsedPreviewText;

      const canToggleDescription =
        trimmedDescription && trimmedDescription !== displayTitle && collapsedPreviewText?.length;
      const isExpanded = forceExpanded || isDescriptionExpanded;
      const showToggleControls = canToggleDescription && !forceExpanded && collapsedPreviewText?.length > maxCharsForThreeLines;
      const toggleHitSlop = StyleSheet.flatten(styles.postMessageToggleHitSlop);
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
        <WrapperComponent style={[styles.postCard, { backgroundColor: headerColor }, wrapperStyle]}>
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

          <Text style={[styles.postTitle, { color: headerTitleColor, paddingTop: isScrolledPastThreshold ? 10 : 0 }]}>{displayTitle}</Text>

          {/* Auto-generated tags */}
          {post.tags && post.tags.length > 0 ? (
            <TagList
              tags={post.tags}
              maxTags={4}
              showIcons={false}
              size="small"
              style={styles.postTags}
            />
          ) : null}

          {/* Content warnings */}
          {post.contentWarnings && post.contentWarnings.length > 0 ? (
            <ContentWarningList
              warnings={post.contentWarnings}
              size="small"
              maxDisplay={3}
              style={[styles.postTags, { marginBottom: 12 }]}
            />
          ) : null}

          {/* Sentiment badge */}
          {post.sentiment ? (
            <SentimentBadge
              sentiment={post.sentiment}
              size="small"
              style={{ marginTop: 6 }}
            />
          ) : null}

          {trimmedDescription && trimmedDescription !== displayTitle ? (
            <>
              <Animated.View
                style={[
                  descriptionContainerStyle,
                  {
                    opacity: descriptionCollapseAnim,
                    maxHeight: descriptionCollapseAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 500],
                    }),
                    overflow: 'hidden',
                  }
                ]}
              >
                {!isExpanded && collapsedPreviewText ? (
                  <View style={styles.postMessagePreview}>
                    <Text style={[styles.postMessagePreviewText, { color: headerTitleColor }]}>
                      {truncatedPreviewText}
                      {showToggleControls ? (
                        <Text
                          style={[styles.postMessagePreviewButtonText, { color: linkColor }]}
                          onPress={() => setIsFullscreenModalVisible(true)}
                        >
                          {' '}Show more
                        </Text>
                      ) : null}
                    </Text>
                  </View>
                ) : (
                  <>
                    {forceExpanded ? (
                      <ScrollView
                        style={styles.postMessageExpandedScroll}
                        contentContainerStyle={styles.postMessageExpandedContent}
                        nestedScrollEnabled
                        showsVerticalScrollIndicator={false}
                      >
                        <RichText
                          text={trimmedDescription}
                          textStyle={[styles.postMessage, { color: headerTitleColor }]}
                          linkStyle={{ color: linkColor }}
                        />
                      </ScrollView>
                    ) : (
                      <View style={styles.postMessageExpandedWrapper}>
                        <Animated.ScrollView
                          style={styles.postMessageExpandedScroll}
                          contentContainerStyle={[
                            styles.postMessageExpandedContent,
                            styles.postMessageExpandedContentIndicator,
                          ]}
                          nestedScrollEnabled
                          showsVerticalScrollIndicator={false}
                          onLayout={handleDescriptionLayout}
                          onContentSizeChange={handleDescriptionContentSizeChange}
                          onScroll={handleDescriptionScroll}
                          scrollEventThrottle={16}
                          onScrollBeginDrag={handleDescriptionScrollBegin}
                          onScrollEndDrag={handleDescriptionScrollEnd}
                          onMomentumScrollBegin={handleDescriptionScrollBegin}
                          onMomentumScrollEnd={handleDescriptionScrollEnd}
                        >
                          <RichText
                            text={trimmedDescription}
                            textStyle={[styles.postMessage, { color: headerTitleColor }]}
                            linkStyle={{ color: linkColor }}
                          />
                        </Animated.ScrollView>
                        {dreamyScrollIndicatorEnabled ? (
                          <Animated.View
                            pointerEvents="none"
                            style={[
                              styles.scrollIndicatorHost,
                              styles.descriptionScrollIndicatorHost,
                              shouldShowDescriptionIndicator
                                ? { opacity: descriptionIndicatorOpacity }
                                : { opacity: 0 },
                            ]}
                          >
                            <Animated.View
                              style={[
                                styles.scrollIndicatorHalo,
                                {
                                  height: descriptionIndicatorThumbHeight,
                                  backgroundColor: linkColor,
                                  opacity: descriptionIndicatorHaloOpacity,
                                  transform: [
                                    { translateY: descriptionIndicatorTranslateY },
                                    { scaleX: descriptionIndicatorHaloScale },
                                    { scaleY: descriptionIndicatorHaloScale },
                                  ],
                                },
                              ]}
                            />
                            <View
                              style={[
                                styles.scrollIndicatorTrack,
                                { height: descriptionIndicatorTrackHeight },
                              ]}
                            />
                            <Animated.View
                              style={[
                                styles.scrollIndicatorThumb,
                                {
                                  height: descriptionIndicatorThumbHeight,
                                  backgroundColor: linkColor,
                                  shadowColor: linkColor,
                                  transform: [
                                    { translateY: descriptionIndicatorTranslateY },
                                    { scaleX: descriptionIndicatorScale },
                                    { scaleY: descriptionIndicatorScale },
                                  ],
                                },
                              ]}
                            >
                              <Animated.View
                                style={[
                                  styles.scrollIndicatorGlow,
                                  { opacity: descriptionIndicatorGlowOpacity },
                                ]}
                              />
                            </Animated.View>
                          </Animated.View>
                        ) : null}
                      </View>
                    )}
                    {showToggleControls ? (
                      <TouchableOpacity
                        onPress={() => setIsDescriptionExpanded(false)}
                        activeOpacity={0.7}
                        style={[styles.postMessageToggle, styles.postMessageToggleExpanded]}
                        hitSlop={toggleHitSlop}
                      >
                        <Text style={[styles.postMessageToggleText, { color: linkColor }]}>Show less</Text>
                      </TouchableOpacity>
                    ) : null}
                  </>
                )}
              </Animated.View>
            </>
          ) : null}

          {/* Hide comment count and translate when description is collapsed */}
          {(showDescriptionWhenScrolled || !isScrolledPastThreshold) && (
            <View style={styles.commentHeaderRow}>
              <Text style={[styles.postMeta, { color: headerMetaColor }]}>
                {comments.length === 1 ? '1 comment' : `${comments.length} comments`}
              </Text>

              <View style={styles.aiButtonsRow}>
                {/* Translate Button */}
                <TouchableOpacity
                  style={[styles.aiFeatureButton, { backgroundColor: `${linkColor}15`, opacity: isTranslating ? 0.6 : 1 }]}
                  onPress={() => setShowTranslationPicker(true)}
                  disabled={isTranslating}
                  activeOpacity={0.7}
                >
                  {isTranslating ? (
                    <ActivityIndicator size="small" color={linkColor} />
                  ) : (
                    <Ionicons name="language-outline" size={14} color={linkColor} />
                  )}
                  <Text style={[styles.aiFeatureButtonText, { color: linkColor }]}>
                    {isTranslating ? 'Translating...' : 'Translate'}
                  </Text>
                </TouchableOpacity>

                {/* Thread Summarization Button */}
                {comments.length >= 10 && (() => {
                  console.log('[ThreadSummary] Rendering button, isSummarizing:', isSummarizing);
                  return (
                    <TouchableOpacity
                      style={[styles.aiFeatureButton, { backgroundColor: `${linkColor}15`, opacity: isSummarizing ? 0.6 : 1 }]}
                      onPress={handleSummarizeThread}
                      disabled={isSummarizing}
                      activeOpacity={0.7}
                    >
                      {isSummarizing ? (
                        <ActivityIndicator size="small" color={linkColor} />
                      ) : (
                        <Ionicons name="bulb-outline" size={14} color={linkColor} />
                      )}
                      <Text style={[styles.aiFeatureButtonText, { color: linkColor }]}>
                        {isSummarizing ? 'Summarizing...' : 'Summarize Thread'}
                      </Text>
                    </TouchableOpacity>
                  );
                })()}
              </View>
            </View>
          )}

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

              {/* Expand description button when scrolled */}
              {trimmedDescription && trimmedDescription !== displayTitle && isScrolledPastThreshold && !showDescriptionWhenScrolled ? (
                <TouchableOpacity
                  onPress={() => setShowDescriptionWhenScrolled(true)}
                  style={styles.expandDescriptionButton}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chevron-down-circle-outline" size={22} color={linkColor} />
                </TouchableOpacity>
              ) : null}

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
        </WrapperComponent>
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
      postPreset,
      postId,
      showViewOriginal,
      isSubscribed,
      toggleVote,
      styles,
      isDescriptionExpanded,
      showDescriptionWhenScrolled,
      isScrolledPastThreshold,
      dreamyScrollIndicatorEnabled,
      handleDescriptionContentSizeChange,
      handleDescriptionLayout,
      handleDescriptionScroll,
      handleDescriptionScrollBegin,
      handleDescriptionScrollEnd,
      shouldShowDescriptionIndicator,
      descriptionIndicatorGlowOpacity,
      descriptionIndicatorHaloOpacity,
      descriptionIndicatorHaloScale,
      descriptionIndicatorScale,
      descriptionIndicatorThumbHeight,
      descriptionIndicatorTrackHeight,
      descriptionIndicatorTranslateY,
    ]
  );

  /** ---------- Sticky Post Header (ListHeaderComponent) ---------- */
  const Header = (
    <Animated.View
      style={[
        styles.stickyHeaderWrap,
        {
          transform: [{ translateY: headerTranslateY }],
          paddingTop: headerPaddingTop,
          paddingHorizontal: headerPaddingHorizontal,
        },
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.stickyHeaderBackdropCap,
          {
            height: headerBackdropCapHeight,
            backgroundColor: headerColor,
            top: headerBackdropTop,
          },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.stickyHeaderBackdrop,
          {
            height: headerBackdropHeight,
            left: headerPaddingHorizontal,
            right: headerPaddingHorizontal,
            borderBottomLeftRadius: headerCardBorderRadius,
            borderBottomRightRadius: headerCardBorderRadius,
            backgroundColor: headerColor,
            top: headerBackdropTop,
          },
        ]}
      />
      {renderPostCard({
        hideHeaderActions: false,
        WrapperComponent: Animated.View,
        wrapperStyle: {
          borderRadius: headerCardBorderRadius,
          marginBottom: headerCardMarginBottom,
          zIndex: 2,
        },
      })}
    </Animated.View>
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
          onCopyComment={handleCopyComment}
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
      handleCopyComment,
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
      enableHeaderOverlap={true}
      contentStyle={{ paddingHorizontal: 0, paddingTop: 0 }}
      headerBackgroundStyle={{
        height: headerUnderlayHeight,
        backgroundColor: headerColor,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        opacity: headerUnderlayOpacity,
      }}
    >
      <View style={styles.shareCaptureContainer} pointerEvents="none" accessible={false}>
        <ViewShot
          ref={sharePreviewRef}
          options={{ format: 'png', quality: 1, result: 'tmpfile' }}
          style={styles.shareCaptureShot}
        >
          <View style={styles.stickyHeaderWrap}>
            {renderPostCard({ hideHeaderActions: true, forceExpanded: true })}
          </View>
        </ViewShot>
      </View>

      {/* Comments list with sticky header. Padding grows with composer+keyboard */}
      <View
        style={styles.commentsListContainer}
        onLayout={({ nativeEvent }) => {
          const measured = nativeEvent?.layout?.height ?? 0;
          const nextHeight = Number.isFinite(measured) ? measured : 0;
          setListLayoutHeight((prev) =>
            Math.abs(prev - nextHeight) < 0.5 ? prev : nextHeight
          );
        }}
      >
        <Animated.FlatList
          ref={commentsListRef}
          data={comments}
          keyExtractor={(item) => String(item.id)}
          ListHeaderComponent={Header}
          stickyHeaderIndices={[0]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          renderItem={renderCommentItem}
          extraData={[highlightedCommentId, reactionPickerCommentId]}
          onScrollBeginDrag={handleScrollBeginDrag}
          ListEmptyComponent={<Text style={styles.emptyState}>No comments yet. Be the first to reply.</Text>}
          contentContainerStyle={{
            paddingHorizontal: 0,
            paddingBottom: composerH + kbOffset + (insets.bottom || 8) + 12,
          }}
          style={{ flex: 1 }}
          onScroll={handleAnimatedScroll}
          onScrollEndDrag={handleScrollEndDrag}
          onMomentumScrollBegin={handleMomentumScrollBegin}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          scrollEventThrottle={16}
          onContentSizeChange={(_, height) => {
            const nextHeight = Number.isFinite(height) ? height : 0;
            setListContentHeight((prev) =>
              Math.abs(prev - nextHeight) < 0.5 ? prev : nextHeight
            );
          }}
        />
        {canRenderDreamyIndicator ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.scrollIndicatorHost,
              styles.threadScrollIndicatorHost,
              shouldShowDreamyIndicator
                ? { opacity: dreamyIndicatorOpacity }
                : { opacity: 0 },
            ]}
          >
            <Animated.View
              style={[
                styles.scrollIndicatorHalo,
                {
                  height: dreamyIndicatorThumbHeight,
                  backgroundColor: linkColor,
                  opacity: dreamyIndicatorHaloOpacity,
                  transform: [
                    { translateY: dreamyIndicatorTranslateY },
                    { scaleX: dreamyIndicatorHaloScale },
                    { scaleY: dreamyIndicatorHaloScale },
                  ],
                },
              ]}
            />
            <View
              style={[
                styles.scrollIndicatorTrack,
                { height: dreamyIndicatorTrackHeight },
              ]}
            />
            <Animated.View
              style={[
                styles.scrollIndicatorThumb,
                {
                  height: dreamyIndicatorThumbHeight,
                  backgroundColor: linkColor,
                  shadowColor: linkColor,
                  transform: [
                    { translateY: dreamyIndicatorTranslateY },
                    { scaleX: dreamyIndicatorScale },
                    { scaleY: dreamyIndicatorScale },
                  ],
                },
              ]}
            >
              <Animated.View
                style={[
                  styles.scrollIndicatorGlow,
                  {
                    opacity: dreamyIndicatorGlowOpacity,
                  },
                ]}
              />
            </Animated.View>
          </Animated.View>
        ) : null}
      </View>

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
        initialPoll={post?.poll ?? null}
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

      {/* Fullscreen Post Modal */}
      {isFullscreenModalVisible && post ? (() => {
        const trimmedTitle = post?.title?.trim?.() ?? '';
        const trimmedDescription = post?.message?.trim?.() ?? '';
        const displayTitle = trimmedTitle || trimmedDescription || 'Untitled post';
        const authorLocationParts = [post.author?.city, post.author?.province, post.author?.country].filter(Boolean);
        const authorLocation = authorLocationParts.join(', ');
        const authorAvatar = getAvatarConfig(post.author?.avatarKey);
        const postPreset = accentPresets.find((p) => p.key === post.colorKey) ?? accentPreset;
        const headerColor = postPreset.background;
        const headerTitleColor = postPreset.onPrimary ?? (postPreset.isDark ? '#fff' : themeColors.textPrimary);
        const badgeBackground = postPreset.badgeBackground ?? themeColors.primaryLight;
        const authorAvatarBackground = authorAvatar.backgroundColor ?? badgeBackground;

        const headerDividerColor = postPreset.isDark ? 'rgba(255,255,255,0.18)' : 'rgba(31,24,69,0.12)';
        const dividerColor = postPreset.isDark ? 'rgba(255,255,255,0.18)' : themeColors.divider;
        const bodyTextColor = themeColors.textPrimary;
        const subtleTextColor = themeColors.textSecondary;
        const metaBadgeBackground =
          postPreset.metaBadgeBackground ??
          (postPreset.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(108,77,244,0.12)');
        const metaBadgeBorderColor =
          postPreset.metaBadgeBorderColor ??
          (postPreset.isDark ? 'rgba(255,255,255,0.12)' : 'rgba(108,77,244,0.22)');
        const accentInk = postPreset.linkColor ?? themeColors.primaryDark;
        const statusBarStyle = postPreset.isDark ? 'light' : isDarkMode ? 'light' : 'dark';

        return (
          <Modal
            visible={isFullscreenModalVisible}
            animationType="slide"
            presentationStyle="fullScreen"
            statusBarTranslucent
            onRequestClose={() => setIsFullscreenModalVisible(false)}
          >
            <SafeAreaView
              style={[styles.fullscreenModalContainer, { backgroundColor: themeColors.background }]}
              edges={['top', 'bottom']}
            >
              <StatusBar style={statusBarStyle} animated />
              <View style={[styles.fullscreenHeroBackground, { backgroundColor: headerColor }]} />

              {/* Header with back button */}
              <View
                style={[
                  styles.fullscreenHeader,
                  {
                    borderBottomColor: headerDividerColor,
                  },
                ]}
              >
                <TouchableOpacity
                  onPress={() => setIsFullscreenModalVisible(false)}
                  style={styles.fullscreenBackButton}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="arrow-back" size={26} color={headerTitleColor} />
                </TouchableOpacity>
                <Text style={[styles.fullscreenTitle, { color: headerTitleColor }]}>Post</Text>
                <View style={styles.fullscreenPlaceholder} />
              </View>

              {/* Post Content */}
              <View
                style={styles.fullscreenScrollContainer}
                onLayout={({ nativeEvent }) => {
                  const measured = nativeEvent?.layout?.height ?? 0;
                  const nextHeight = Number.isFinite(measured) ? measured : 0;
                  setFullscreenLayoutHeight((prev) =>
                    Math.abs(prev - nextHeight) < 0.5 ? prev : nextHeight
                  );
                }}
              >
                <Animated.ScrollView
                  style={styles.fullscreenScrollView}
                  contentContainerStyle={[
                    styles.fullscreenScrollContent,
                    { paddingBottom: Math.max(insets.bottom, 16) + 32 },
                  ]}
                  showsVerticalScrollIndicator={false}
                  bounces
                  scrollEventThrottle={16}
                  onScroll={handleFullscreenScroll}
                  onScrollBeginDrag={handleFullscreenScrollBegin}
                  onScrollEndDrag={handleFullscreenScrollEnd}
                  onMomentumScrollBegin={handleFullscreenScrollBegin}
                  onMomentumScrollEnd={handleFullscreenScrollEnd}
                  onContentSizeChange={(_, height) => {
                    const nextHeight = Number.isFinite(height) ? height : 0;
                    setFullscreenContentHeight((prev) =>
                      Math.abs(prev - nextHeight) < 0.5 ? prev : nextHeight
                    );
                  }}
                >
                  <View
                    style={[
                      styles.fullscreenCard,
                      {
                        backgroundColor: themeColors.card,
                        shadowOpacity: isDarkMode ? 0.35 : 0.12,
                        borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(31,24,69,0.08)',
                      },
                    ]}
                  >
                    <View style={[styles.fullscreenAccentBar, { backgroundColor: badgeBackground }]} />

                    {/* Author Info */}
                    <View
                      style={[
                        styles.fullscreenAuthorRow,
                        { borderBottomColor: dividerColor },
                      ]}
                    >
                      <View style={[styles.fullscreenAvatar, { backgroundColor: authorAvatarBackground }]}>
                        {authorAvatar?.icon ? (
                          <Ionicons
                            name={authorAvatar.icon.name}
                            size={20}
                            color={authorAvatar.icon.color ?? '#fff'}
                          />
                        ) : (
                          <Text style={[styles.fullscreenAvatarEmoji, { color: authorAvatar?.foregroundColor ?? '#fff' }]}>
                            {authorAvatar?.emoji ?? '🙂'}
                          </Text>
                        )}
                      </View>
                      <View style={styles.fullscreenAuthorInfo}>
                        <Text style={[styles.fullscreenAuthorName, { color: bodyTextColor }]}>
                          {post.authorNickname || 'Anonymous'}
                        </Text>
                        {authorLocation ? (
                          <Text style={[styles.fullscreenAuthorLocation, { color: subtleTextColor }]}>
                            {authorLocation}
                          </Text>
                        ) : null}
                      </View>
                    </View>

                    {/* Title */}
                    <Text style={[styles.fullscreenPostTitle, { color: bodyTextColor }]}>
                      {displayTitle}
                    </Text>

                    {/* Auto-generated tags */}
                    {post.tags && post.tags.length > 0 ? (
                      <TagList
                        tags={post.tags}
                        maxTags={4}
                        showIcons={false}
                        size="small"
                        style={styles.postTags}
                      />
                    ) : null}

                    {/* Content warnings */}
                    {post.contentWarnings && post.contentWarnings.length > 0 ? (
                      <ContentWarningList
                        warnings={post.contentWarnings}
                        size="small"
                        maxDisplay={3}
                        style={styles.postTags}
                      />
                    ) : null}

                    {/* Sentiment badge */}
                    {post.sentiment ? (
                      <SentimentBadge
                        sentiment={post.sentiment}
                        size="small"
                        style={{ marginTop: 6 }}
                      />
                    ) : null}

                    {/* Description */}
                    {trimmedDescription && trimmedDescription !== displayTitle ? (
                      <View style={styles.fullscreenDescriptionContainer}>
                        <RichText
                          text={trimmedDescription}
                          textStyle={[styles.fullscreenPostDescription, { color: bodyTextColor }]}
                          linkStyle={{ color: postPreset.linkColor ?? themeColors.primary }}
                        />
                      </View>
                    ) : null}

                    {/* Meta */}
                    <View
                      style={[
                        styles.fullscreenMetaRow,
                        {
                          backgroundColor: metaBadgeBackground,
                          borderColor: metaBadgeBorderColor,
                        },
                      ]}
                    >
                      <Ionicons
                        name="chatbubble-ellipses-outline"
                        size={16}
                        color={accentInk}
                        style={styles.fullscreenMetaIcon}
                      />
                      <Text style={[styles.fullscreenMeta, { color: subtleTextColor }]}>
                        {comments.length === 1 ? '1 comment' : `${comments.length} comments`}
                      </Text>
                    </View>
                  </View>
                </Animated.ScrollView>
                {shouldShowFullscreenIndicator ? (
                  <Animated.View
                    pointerEvents="none"
                    style={[
                      styles.scrollIndicatorHost,
                      styles.fullscreenScrollIndicatorHost,
                      { opacity: fullscreenIndicatorOpacity },
                    ]}
                  >
                    <Animated.View
                      style={[
                        styles.scrollIndicatorHalo,
                        styles.fullscreenScrollIndicatorHalo,
                        {
                          height: fullscreenIndicatorThumbHeight,
                          backgroundColor: accentInk,
                          opacity: fullscreenIndicatorHaloOpacity,
                          transform: [
                            { translateY: fullscreenIndicatorTranslateY },
                            { scaleX: fullscreenIndicatorHaloScale },
                            { scaleY: fullscreenIndicatorHaloScale },
                          ],
                        },
                      ]}
                    />
                    <View
                      style={[
                        styles.scrollIndicatorTrack,
                        styles.fullscreenScrollIndicatorTrack,
                        { height: fullscreenIndicatorTrackHeight },
                      ]}
                    />
                    <Animated.View
                      style={[
                        styles.scrollIndicatorThumb,
                        styles.fullscreenScrollIndicatorThumb,
                        {
                          height: fullscreenIndicatorThumbHeight,
                          backgroundColor: accentInk,
                          shadowColor: accentInk,
                          transform: [
                            { translateY: fullscreenIndicatorTranslateY },
                            { scaleX: fullscreenIndicatorScale },
                            { scaleY: fullscreenIndicatorScale },
                          ],
                        },
                      ]}
                    >
                      <Animated.View
                        style={[
                          styles.scrollIndicatorGlow,
                          styles.fullscreenScrollIndicatorGlow,
                          { opacity: fullscreenIndicatorGlowOpacity },
                        ]}
                      />
                    </Animated.View>
                  </Animated.View>
                ) : null}
              </View>
            </SafeAreaView>
          </Modal>
        );
      })() : null}

      {/* Language Picker Modal */}
      <Modal
        visible={showTranslationPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTranslationPicker(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowTranslationPicker(false)}>
          <View style={styles.languagePickerBackdrop}>
            <TouchableWithoutFeedback>
              <View style={[styles.languagePickerContainer, { backgroundColor: themeColors.card }]}>
                <View style={styles.languagePickerHeader}>
                  <Text style={[styles.languagePickerTitle, { color: themeColors.textPrimary }]}>
                    Translate to
                  </Text>
                  <TouchableOpacity onPress={() => setShowTranslationPicker(false)}>
                    <Ionicons name="close" size={24} color={themeColors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.languageList}>
                  {Object.values(LANGUAGES).map((lang) => (
                    <TouchableOpacity
                      key={lang.code}
                      style={[styles.languageItem, { borderBottomColor: themeColors.divider }]}
                      onPress={() => handleTranslate(lang.code)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.languageFlag}>{lang.flag}</Text>
                      <Text style={[styles.languageName, { color: themeColors.textPrimary }]}>
                        {lang.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </ScreenLayout>
  );
}


const createStyles = (
  palette,
  { isDarkMode, titleFontSize, descriptionFontSize } = {}
) => {
  const resolvedTitleFontSize = titleFontSize ?? DEFAULT_TITLE_FONT_SIZE;
  const resolvedDescriptionFontSize = descriptionFontSize ?? DEFAULT_DESCRIPTION_FONT_SIZE;
  const resolvedTitleLineHeight = Math.round(resolvedTitleFontSize * 1.27);
  const resolvedDescriptionLineHeight = Math.round(resolvedDescriptionFontSize * 1.33);

  return StyleSheet.create({
    /* Sticky header wrapper so the pinned card blends with background */
    stickyHeaderWrap: {
      width: '100%',
      alignSelf: 'stretch',
      backgroundColor: palette.background,
      marginTop: 12,
      paddingTop: 24,
      paddingBottom: 12,
      paddingHorizontal: 20,
      zIndex: 30,
      elevation: 6,
    },
    stickyHeaderBackdropCap: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 0,
    },
    stickyHeaderBackdrop: {
      position: 'absolute',
      top: 0,
      zIndex: 1,
    },
    shareCaptureContainer: { position: 'absolute', top: -10000, left: 0, right: 0 },
    shareCaptureShot: { alignSelf: 'stretch' },
    commentsListContainer: { flex: 1, position: 'relative' },

    /* Post card (wider) */
    postCard: {
      width: '100%',
      borderRadius: 24,
      paddingTop: 28,
      paddingBottom: 20,
      paddingHorizontal: 18,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOpacity: isDarkMode ? 0.24 : 0.1,
      shadowRadius: 4,
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
    postTitle: {
      fontSize: resolvedTitleFontSize,
      marginTop: 6,
      marginBottom: 10,
      fontWeight: '700',
      lineHeight: resolvedTitleLineHeight
    },
    postTags: {
      marginTop: 8,
      marginBottom: 8,
    },
    postMessageContainer: { marginTop: 20, marginBottom: 18 },
    postMessageHighlighted: { borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10 },
    postMessage: {
      fontSize: resolvedDescriptionFontSize,
      fontWeight: '500',
      lineHeight: resolvedDescriptionLineHeight
    },
    postMessagePreviewText: {
      fontSize: resolvedDescriptionFontSize,
      fontWeight: '500',
      lineHeight: resolvedDescriptionLineHeight,
      maxHeight: resolvedDescriptionLineHeight * 6,
    },
    postMessagePreview: { marginBottom: 6 },
    postMessagePreviewButton: {
      alignSelf: 'flex-end',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: 'transparent',
      marginTop: 8,
    },
    postMessagePreviewButtonText: { fontSize: 14, fontWeight: '600' },
    postMessageExpandedWrapper: { position: 'relative' },
    postMessageExpandedScroll: { maxHeight: 220 },
    postMessageExpandedContent: {
      paddingRight: 0,
    },
    postMessageExpandedContentIndicator: {
      paddingRight: 18,
    },
    postMessageToggle: { alignSelf: 'flex-end', marginTop: 8 },
    postMessageToggleExpanded: { marginLeft: 0, marginTop: 8, alignSelf: 'flex-end' },
    postMessageToggleText: { fontSize: 14, fontWeight: '600' },
    postMessageToggleHitSlop: { top: 8, bottom: 8, left: 8, right: 8 },
    expandDescriptionButton: {
      padding: 4,
    },
    postMeta: { fontSize: 13, marginBottom: 12 },
    actionsFooter: { marginTop: -10, paddingTop: 0, paddingBottom: 4, borderTopWidth: StyleSheet.hairlineWidth },
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
      overflow: 'visible',
      position: 'relative',
    },
    commentRowActive: {
      zIndex: 30,
      elevation: 8,
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
    commentPopoverContainer: {
      position: 'absolute',
      bottom: '100%',
      marginBottom: 12,
      alignItems: 'flex-start',
      zIndex: 40,
      elevation: 6,
    },
    commentPopoverLeft: { left: 0, alignItems: 'flex-start' },
    commentPopoverRight: { right: 0, alignItems: 'flex-end' },
    commentActionsPopover: {
      position: 'absolute',
      top: '100%',
      marginTop: 12,
      alignItems: 'flex-start',
      zIndex: 35,
      elevation: 5,
    },
    commentPopoverReactions: {
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
      elevation: 4,
    },
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
    commentActionsSheet: {
      minWidth: 148,
      backgroundColor: palette.card,
      borderRadius: 18,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: palette.divider,
      shadowColor: '#000',
      shadowOpacity: isDarkMode ? 0.24 : 0.12,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 6 },
      elevation: 4,
    },
    commentActionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12
    },
    commentActionLabel: { marginLeft: 10, fontSize: 14, fontWeight: '600' },
    commentActionDivider: { height: StyleSheet.hairlineWidth, marginHorizontal: 12 },
    commentReactionList: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: -4,
      paddingTop: 6,
    },
    commentReactionListLeft: { alignSelf: 'flex-start', justifyContent: 'flex-start' },
    commentReactionListRight: { alignSelf: 'flex-end', justifyContent: 'flex-end' },
    commentReactionChipTouchable: {
      marginRight: 6,
      marginTop: -5.5,
      borderRadius: 18,
    },
    commentReactionChip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)',
      borderRadius: 14,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'transparent',
    },
    commentReactionChipActive: {
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)',
    },
    commentReactionChipEmoji: { fontSize: 14, marginRight: 4 },
    commentReactionChipCount: { fontSize: 12, fontWeight: '600' },
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
    scrollIndicatorHost: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      right: 0,
      zIndex: 40,
      width: 24,
      justifyContent: 'center',
      alignItems: 'center',
    },
    threadScrollIndicatorHost: {
      top: 12,
      bottom: 16,
      right: 6,
      width: 22,
    },
    descriptionScrollIndicatorHost: {
      top: 6,
      bottom: 6,
      right: 4,
      width: 20,
    },
    scrollIndicatorTrack: {
      position: 'absolute',
      top: 0,
      width: 8,
      borderRadius: 999,
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
      overflow: 'hidden',
    },
    scrollIndicatorThumb: {
      position: 'absolute',
      top: 0,
      width: 14,
      borderRadius: 999,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOpacity: isDarkMode ? 0.35 : 0.18,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 6 },
      elevation: 6,
    },
    scrollIndicatorGlow: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: '#ffffff',
    },
    scrollIndicatorHalo: {
      position: 'absolute',
      top: 0,
      width: 22,
      borderRadius: 999,
    },

    /* Fixed bottom composer */
    composerWrap: {
      position: 'absolute',
      left: 0,
      right: 0,
      backgroundColor: palette.background,
      paddingTop: 8,
      paddingHorizontal: 6,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: palette.divider
    },
    typingIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 6,
      marginHorizontal: 10
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
      marginHorizontal: 0,
      shadowColor: '#000',
      shadowOpacity: isDarkMode ? 0.14 : 0.04,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
      elevation: 2
    },
    replyPreview: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 10,
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
    notice: { fontSize: 16, marginBottom: 16, color: palette.textPrimary, textAlign: 'center' },

    // Fullscreen modal styles
    fullscreenModalContainer: {
      flex: 1,
      backgroundColor: palette.background,
    },
    fullscreenHeroBackground: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 240,
    },
    fullscreenHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 32,
      paddingBottom: 24,
      borderBottomWidth: StyleSheet.hairlineWidth,
      zIndex: 2,
    },
    fullscreenBackButton: {
      width: 44,
      height: 44,
      justifyContent: 'center',
      alignItems: 'flex-start',
    },
    fullscreenTitle: {
      fontSize: 18,
      fontWeight: '600',
      letterSpacing: 0.25,
    },
    fullscreenPlaceholder: {
      width: 44,
    },
    fullscreenScrollView: {
      flex: 1,
      zIndex: 1,
    },
    fullscreenScrollContainer: {
      flex: 1,
      position: 'relative',
    },
    fullscreenScrollContent: {
      paddingHorizontal: 20,
      paddingTop: 40,
      paddingBottom: 32,
    },
    fullscreenCard: {
      borderRadius: 28,
      padding: 24,
      marginTop: -32,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 16 },
      shadowRadius: 32,
      elevation: 12,
      borderWidth: StyleSheet.hairlineWidth,
    },
    fullscreenAccentBar: {
      width: 48,
      height: 4,
      borderRadius: 999,
      marginBottom: 20,
    },
    fullscreenAuthorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingBottom: 18,
      marginBottom: 20,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    fullscreenAvatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    fullscreenAvatarEmoji: {
      fontSize: 24,
    },
    fullscreenAuthorInfo: {
      flex: 1,
    },
    fullscreenAuthorName: {
      fontSize: 17,
      fontWeight: '700',
      marginBottom: 2,
    },
    fullscreenAuthorLocation: {
      fontSize: 14,
    },
    fullscreenPostTitle: {
      fontSize: resolvedTitleFontSize + 4,
      fontWeight: '700',
      marginBottom: 16,
      lineHeight: (resolvedTitleFontSize + 4) * 1.3,
    },
    fullscreenDescriptionContainer: {
      marginBottom: 24,
    },
    fullscreenPostDescription: {
      fontSize: resolvedDescriptionFontSize,
      lineHeight: resolvedDescriptionFontSize * 1.5,
    },
    fullscreenMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: StyleSheet.hairlineWidth,
      marginTop: 24,
    },
    fullscreenMetaIcon: {
      marginRight: 8,
    },
    fullscreenMeta: {
      fontSize: 14,
      fontWeight: '600',
      letterSpacing: 0.2,
    },
    fullscreenScrollIndicatorHost: {
      top: 18,
      bottom: 24,
      right: 6,
      width: 14,
    },
    fullscreenScrollIndicatorTrack: {
      width: 4,
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(31,24,69,0.08)',
    },
    fullscreenScrollIndicatorThumb: {
      width: 8,
      shadowOpacity: isDarkMode ? 0.28 : 0.14,
      shadowRadius: 8,
    },
    fullscreenScrollIndicatorGlow: {
      backgroundColor: '#ffffff',
    },
    fullscreenScrollIndicatorHalo: {
      width: 14,
    },
    // AI Features Styles
    commentHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 16,
      marginBottom: 8,
    },
    aiButtonsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    aiFeatureButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 12,
      gap: 4,
    },
    aiFeatureButtonText: {
      fontSize: 12,
      fontWeight: '600',
    },
    summaryCard: {
      marginTop: 12,
      marginBottom: 12,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
    },
    summaryHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 8,
    },
    summaryTitle: {
      fontSize: 14,
      fontWeight: '600',
      flex: 1,
    },
    summaryClose: {
      padding: 4,
    },
    summaryText: {
      fontSize: 13,
      lineHeight: 19,
    },
    summaryScrollView: {
      maxHeight: 200,
    },
    // Language Picker Styles
    languagePickerBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    languagePickerContainer: {
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingBottom: 20,
      maxHeight: '70%',
    },
    languagePickerHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      paddingBottom: 16,
    },
    languagePickerTitle: {
      fontSize: 20,
      fontWeight: '700',
    },
    languageList: {
      paddingHorizontal: 20,
    },
    languageItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 16,
      borderBottomWidth: 1,
    },
    languageFlag: {
      fontSize: 24,
      marginRight: 16,
    },
    languageName: {
      fontSize: 16,
      fontWeight: '500',
    },
  });
};
