import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { View, StyleSheet, Modal, Pressable, Animated, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';

import AppHeader from './AppHeader';
import FooterMenu from './FooterMenu';
import { useSettings } from '../contexts/SettingsContext';
import { usePosts } from '../contexts/PostsContext';
import { useAuth } from '../contexts/AuthContext';
import { useAlert } from '../contexts/AlertContext';
import CreatePostModal from './CreatePostModal';
import MainDrawerContent from './MainDrawerContent';
import { getAvatarConfig } from '../constants/avatars';
import NotificationsModal from './NotificationsModal';
import { analyzePostContent } from '../services/openai/moderationService';
import { autoTagPost } from '../services/openai/autoTaggingService';
import { analyzeContent } from '../services/openai/contentAnalysisService';
import { scorePostQuality } from '../services/openai/qualityScoringService';
import { isFeatureEnabled } from '../config/aiFeatures';
import { createPublicPost } from '../services/publicPostsService'; // [PUBLIC-MODE]
import { canCreatePost, recordPostCreated } from '../utils/subscriptionUtils';
import UpgradePromptModal from './UpgradePromptModal';
import { processMentions } from '../utils/mentionUtils';

export default function ScreenLayout({
  children,
  title,
  subtitle,
  onBack,
  rightIcon,
  onRightPress,
  showSearch,
  searchPlaceholder,
  searchValue,
  onSearchChange,
  contentStyle,
  activeTab = 'home',
  navigation,
  showFooter = true,
  showDrawerButton = true,
  headerStyle,
  headerBackgroundStyle,
  enableHeaderOverlap = false,
  profilePhoto,
  onFabPress, // Custom FAB action (e.g., for Events screen)
  headerHidden = false,
}) {
  const {
    showAddShortcut,
    showHeaderBar,
    accentPreset,
    userProfile,
    updateUserProfile,
    themeColors,
    isDarkMode,
  } = useSettings();

  const {
    addPost,
    updatePost,
    getReplyNotificationCount,
    getNotificationCount,
    getNotifications,
    markNotificationsRead,
    markNotificationsForThreadRead,
  } = usePosts();

  const { user: firebaseUser } = useAuth();
  const { showAlert } = useAlert();
  const insets = useSafeAreaInsets();

  // Status bar icons (white on dark headers, dark on light headers)
  const statusStyle = accentPreset?.isDark ? 'light' : 'dark';

  const myRepliesBadge = getReplyNotificationCount ? getReplyNotificationCount() : 0;

  const [composerVisible, setComposerVisible] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const headerAnim = useRef(new Animated.Value(0)).current;
  const HEADER_HEIGHT = 130;
  const [headerHeight, setHeaderHeight] = useState(HEADER_HEIGHT);

  useEffect(() => {
    Animated.timing(headerAnim, {
      toValue: headerHidden ? 1 : 0,
      duration: 220,
      useNativeDriver: false,
    }).start();
  }, [headerHidden, headerAnim]);
  const [upgradeModalVisible, setUpgradeModalVisible] = useState(false);
  const [postLimitInfo, setPostLimitInfo] = useState({ count: 0, limit: 5, remaining: 5 });

  // Get user's current plan
  const userPlan = userProfile?.subscriptionPlan || 'basic';

  const initialLocation = useMemo(
    () =>
      userProfile?.city
        ? {
          city: userProfile.city,
          province: userProfile.province ?? '',
          country: userProfile.country ?? '',
        }
        : null,
    [userProfile]
  );

  const authorAvatarConfig = useMemo(
    () => getAvatarConfig(userProfile?.avatarKey),
    [userProfile?.avatarKey]
  );

  const handleSubmitPost = async ({
    location,
    colorKey,
    title,
    message,
    highlightDescription,
    postingMode,
    isPublic,
    poll,
  }) => {
    if (!location?.city || !title?.trim?.()) {
      setComposerVisible(false);
      return false;
    }
    if (!firebaseUser?.uid) {
      showAlert('Sign in required', 'Sign in to publish posts to the community.', 'warning');
      setComposerVisible(false);
      return false;
    }

    // Check post limit
    const limitCheck = await canCreatePost(userPlan);
    if (!limitCheck.allowed) {
      setPostLimitInfo(limitCheck);
      setComposerVisible(false);
      setUpgradeModalVisible(true);
      return false;
    }

    const mergedAuthor = {
      ...userProfile,
      nickname: userProfile?.nickname ?? '',
      city: location.city,
      province: location.province ?? userProfile?.province ?? '',
      country: location.country ?? userProfile?.country ?? '',
      avatarKey: userProfile?.avatarKey ?? 'default',
      uid: firebaseUser.uid,
    };

    // Create post immediately with pending_review status
    // Moderation will run in background and update the post
    const tempModeration = { action: 'review', matchedLabels: [] };

    // Process mentions in post message
    let mentionedUserIds = [];
    try {
      const mentionData = await processMentions(message);
      mentionedUserIds = mentionData.userIds;
      console.log('[ScreenLayout] Post mentions processed:', mentionedUserIds);
    } catch (error) {
      console.warn('[ScreenLayout] Failed to process mentions:', error);
      // Continue without mentions if processing fails
    }

    // [PUBLIC-MODE] Pass posting mode and public profile to addPost
    const published = addPost(
      location.city,
      title,
      message,
      colorKey,
      mergedAuthor,
      highlightDescription,
      tempModeration,
      poll ?? null,
      postingMode || 'anonymous', // Default to anonymous if not specified
      isPublic ? userProfile : null, // Pass public profile data if posting publicly
      null, // marketMeta
      mentionedUserIds // User IDs mentioned in the post
    );

    if (!published) {
      showAlert('Unable to publish', 'We could not create that post. Please try again in a moment.', 'error');
      setComposerVisible(false);
      return false;
    }

    // Record post creation for limit tracking
    await recordPostCreated();

    if (!userProfile?.city) {
      updateUserProfile?.({
        city: location.city,
        province: location.province ?? '',
        country: location.country ?? '',
      });
    }

    // Close modal and navigate immediately - don't wait for moderation
    setComposerVisible(false);
    if (navigation) {
      navigation.navigate('MyPosts', { focusPostId: published.id, pendingPost: { ...published } });
    }

    // [PUBLIC-MODE] If posting publicly, also save to publicPosts collection
    if (isPublic && userProfile?.isPublicProfile) {
      createPublicPost(firebaseUser.uid, {
        title,
        message,
        authorUsername: userProfile.username,
        authorDisplayName: userProfile.displayName,
        authorAvatar: userProfile.profilePhoto,
        city: location.city,
        province: location.province,
        country: location.country,
        colorKey,
        sourcePostId: published.id,
        sourceCity: location.city,
        sourceProvince: location.province ?? userProfile?.province ?? '',
        sourceCountry: location.country ?? userProfile?.country ?? '',
      }).catch(err => {
        console.warn('[ScreenLayout] Failed to save public post:', err.message);
      });
    }

    // Run moderation AND auto-tagging in background
    // Truncate very long texts to prevent API timeouts/crashes
    const truncatedMessage = message.length > 2000 ? message.substring(0, 2000) : message;

    // Check feature flags
    const isPremium = userProfile?.isPremium || false;
    const aiPreferences = userProfile?.aiPreferences || {};

    // Build promises array based on enabled features
    const promises = [];

    // Moderation (always runs - forced enabled)
    promises.push(
      analyzePostContent({ title, message: truncatedMessage }).catch(err => {
        console.warn('[ScreenLayout] Moderation failed:', err.message);
        return { action: 'approve' };
      })
    );

    // Auto-tagging (check if enabled)
    if (isFeatureEnabled('autoTagging', isPremium, aiPreferences)) {
      promises.push(
        autoTagPost(title, truncatedMessage, {
          strategy: 'auto',
          maxTags: 4,
          timeout: 10000
        }).catch(err => {
          console.warn('[ScreenLayout] Auto-tagging failed:', err.message);
          return autoTagPost(title, truncatedMessage, { strategy: 'keywords', maxTags: 4 })
            .catch(() => ({ tags: [], method: 'failed' }));
        })
      );
    } else {
      promises.push(Promise.resolve({ tags: [], method: 'disabled' }));
    }

    // Content warnings and sentiment (check if enabled)
    if (
      isFeatureEnabled('contentWarnings', isPremium, aiPreferences) ||
      isFeatureEnabled('sentimentAnalysis', isPremium, aiPreferences)
    ) {
      promises.push(
        analyzeContent(title, truncatedMessage).catch(err => {
          console.warn('[ScreenLayout] Content analysis failed:', err.message);
          return { warnings: [], sentiment: null, hasWarnings: false };
        })
      );
    } else {
      promises.push(Promise.resolve({ warnings: [], sentiment: null, hasWarnings: false }));
    }

    // Quality scoring (check if enabled)
    if (isFeatureEnabled('qualityScoring', isPremium, aiPreferences)) {
      promises.push(
        scorePostQuality(published).catch(err => {
          console.warn('[ScreenLayout] Quality scoring failed:', err.message);
          return null;
        })
      );
    } else {
      promises.push(Promise.resolve(null));
    }

    Promise.all(promises).then(([moderation, tagging, contentAnalysis, qualityScore]) => {
      const moderationUpdate = moderation || { action: 'approve' };
      const updates = { moderation: moderationUpdate };

      // Add tags if available
      if (tagging && tagging.tags && tagging.tags.length > 0) {
        updates.tags = tagging.tags;
        updates.tagConfidence = tagging.confidence;
        updates.tagMethod = tagging.method;
        console.log('[ScreenLayout] Auto-tagged post:', published.id, tagging.tags);
      }

      // Add content warnings and sentiment (FREE!)
      if (contentAnalysis) {
        if (contentAnalysis.warnings && contentAnalysis.warnings.length > 0) {
          updates.contentWarnings = contentAnalysis.warnings;
          console.log('[ScreenLayout] Content warnings:', published.id, contentAnalysis.warnings.map(w => w.label));
        }
        if (contentAnalysis.sentiment) {
          updates.sentiment = contentAnalysis.sentiment;
          console.log('[ScreenLayout] Sentiment:', published.id, contentAnalysis.sentiment.label);
        }
      }

      // Add quality score
      if (qualityScore) {
        updates.qualityScore = qualityScore.overall;
        updates.qualityTier = qualityScore.tier.label;
        updates.qualityScores = qualityScore.scores;
        console.log('[ScreenLayout] Quality score:', published.id, qualityScore.overall, qualityScore.tier.label);
      }

      // Determine moderation status
      if (moderation?.action === 'block') {
        updates.moderationStatus = 'blocked';
        console.log('[ScreenLayout] Post blocked after moderation:', published.id);
      } else if (moderation?.action === 'review') {
        updates.moderationStatus = 'pending_review';
        console.log('[ScreenLayout] Post pending review:', published.id);
      } else {
        updates.moderationStatus = 'approved';
        console.log('[ScreenLayout] Post approved:', published.id);
      }

      // Update post with both moderation and tags
      try {
        updatePost(location.city, published.id, updates);
      } catch (updateError) {
        console.error('[ScreenLayout] Failed to update post:', updateError);
      }
    }).catch(error => {
      console.warn('[ScreenLayout] Background processing failed', error);
      // Post stays as pending_review on error

      // Try to at least approve the post so it's visible
      try {
        updatePost(location.city, published.id, {
          moderationStatus: 'approved',
          tags: [],
        });
        console.log('[ScreenLayout] Post approved by fallback after error');
      } catch (fallbackError) {
        console.error('[ScreenLayout] Fallback update also failed:', fallbackError);
      }
    });

    return true;
  };

  const handleFooterShortcut = () => {
    // If custom FAB action provided (e.g., for Events screen), use it
    if (onFabPress) {
      const handled = onFabPress({
        openPostComposer: () => setComposerVisible(true),
      });
      if (handled) {
        return;
      }
    }
    // Open composer modal immediately (no loading delay)
    setComposerVisible(true);
  };


  const handleTabPress = (tab) => {
    if (!navigation) return;
    if (tab === 'home') {
      if (navigation.canGoBack && navigation.canGoBack()) {
        navigation.popToTop();
      }
      navigation.navigate('Country');
    } else if (tab === 'feed') {
      // [PUBLIC-MODE] Navigate to Feed screen
      if (navigation.getCurrentRoute?.()?.name !== 'Feed') {
        navigation.navigate('Feed');
      }
    } else if (tab === 'events') {
      // Navigate to Events screen
      if (navigation.getCurrentRoute?.()?.name !== 'Events') {
        navigation.navigate('Events');
      }
    } else if (tab === 'discover') {
      // [PUBLIC-MODE] Navigate to Discover screen
      if (navigation.getCurrentRoute?.()?.name !== 'Discover') {
        navigation.navigate('Discover');
      }
    } else if (tab === 'myComments') {
      if (navigation.getCurrentRoute?.()?.name !== 'MyComments') {
        navigation.navigate('MyComments');
      }
    } else if (tab === 'profile') {
      // [PUBLIC-MODE] Navigate to user's own public profile or setup
      if (firebaseUser?.uid && userProfile?.username) {
        // User has a public profile - navigate to it
        navigation.navigate('PublicProfile', {
          userId: firebaseUser.uid,
          username: userProfile.username
        });
      } else if (firebaseUser?.uid) {
        // User is logged in but doesn't have a public profile - navigate to setup
        navigation.navigate('ProfileSetup');
      }
    } else if (tab === 'settings') {
      // Navigate to Settings when not logged in
      if (navigation.getCurrentRoute?.()?.name !== 'Settings') {
        navigation.navigate('Settings');
      }
    }
  };

  const handleMenuPress = () => setDrawerVisible(true);

  const handleShortcutSelect = (key) => {
    setDrawerVisible(false);
    if (!navigation) return;
    if (key === 'home') navigation.navigate('Country');
    else if (key === 'neighborhoodExplorer') navigation.navigate('NeighborhoodExplorer');
    else if (key === 'myComments') navigation.navigate('MyComments');
    else if (key === 'myPosts') navigation.navigate('MyPosts');
    else if (key === 'topStatuses') navigation.navigate('TopStatuses');
    else if (key === 'markets') navigation.navigate('LocalLoopMarkets');
    else if (key === 'settings') navigation.navigate('Settings');
  };

  const handleUpgradeNow = useCallback(() => {
    setUpgradeModalVisible(false);
    if (navigation) {
      navigation.navigate('Subscription');
    }
  }, [navigation]);

  const headerNotificationCount = getNotificationCount ? getNotificationCount() : 0;
  const headerNotifications = useMemo(
    () => (getNotifications ? getNotifications() : []),
    [getNotifications]
  );

  // When a custom rightIcon is provided (like 'options'), show notifications as the second icon
  const notificationIcon = headerNotificationCount > 0 ? 'notifications' : 'notifications-outline';
  const defaultRightIcon = rightIcon ?? notificationIcon;

  const handleHeaderRightPress =
    onRightPress ??
    (() => {
      setNotificationsVisible(true);
      markNotificationsRead?.();
    });

  const handleNotificationsPress = () => {
    setNotificationsVisible(true);
    markNotificationsRead?.();
  };

  // Show notification badge when using second icon
  const headerBadgeCount = onRightPress ? undefined : headerNotificationCount;
  const secondIconBadgeCount = rightIcon ? headerNotificationCount : undefined;

  const handleCloseNotifications = () => setNotificationsVisible(false);

  const handleSelectNotification = (notification) => {
    setNotificationsVisible(false);
    if (!notification) return;
    markNotificationsForThreadRead?.(notification.city, notification.postId);
    if (!navigation) return;
    navigation.navigate('PostThread', {
      city: notification.city,
      postId: notification.postId,
      focusCommentId: notification.commentId ?? null,
    });
  };

  const styles = useMemo(
    () => createStyles(themeColors, { isDarkMode, enableHeaderOverlap }),
    [themeColors, isDarkMode, enableHeaderOverlap]
  );

  const safeBackground = headerHidden
    ? accentPreset?.buttonBackground ?? themeColors.primary
    : themeColors.background;

  return (
    // IMPORTANT:
    // - We do NOT paint the safe area with the header color anymore.
    // - We let AppHeader handle the top inset and background so shapes can bleed into the status bar.
    <SafeAreaView style={[styles.safe, { backgroundColor: themeColors.background }]} edges={['bottom']}>
    {/* <SafeAreaView style={[styles.safe, { backgroundColor: safeBackground }]} edges={['bottom']}> */}
      {/* Translucent status bar so the header's background/shapes are visible underneath */}
      <StatusBar style={statusStyle} translucent backgroundColor="transparent" hidden={!showHeaderBar} />

      <View style={styles.safeOverlay}>
        {/* Optional external header overlay (kept non-blocking & behind header) */}
        {headerBackgroundStyle ? (
          <Animated.View pointerEvents="none" style={[styles.headerBackground, headerBackgroundStyle]} />
        ) : null}

        <Animated.View
          style={[
            styles.headerContainer,
            {
              height: headerAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [headerHeight || HEADER_HEIGHT, 0],
              }),
            },
          ]}
        >
          <Animated.View
            style={{
              transform: [
                {
                  translateY: headerAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -(headerHeight || HEADER_HEIGHT)],
                  }),
                },
              ],
              opacity: headerAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 0],
              }),
            }}
          >
            <View
              onLayout={(event) => {
                const measuredHeight = event.nativeEvent.layout.height;
                if (measuredHeight && Math.abs(measuredHeight - headerHeight) > 1) {
                  setHeaderHeight(measuredHeight);
                }
              }}
            >
              <AppHeader
                title={title}
                subtitle={subtitle}
                onBack={onBack}
                onMenu={!onBack && showDrawerButton ? handleMenuPress : undefined}
                rightIcon={defaultRightIcon}
                onRightPress={handleHeaderRightPress}
                rightBadgeCount={headerBadgeCount}
                secondRightIcon={rightIcon ? notificationIcon : undefined}
                onSecondRightPress={rightIcon ? handleNotificationsPress : undefined}
                secondRightBadgeCount={secondIconBadgeCount}
                showSearch={showSearch}
                searchPlaceholder={searchPlaceholder}
                searchValue={searchValue}
                onSearchChange={onSearchChange}
                wrapperStyle={headerStyle}
                accent={accentPreset}
                profilePhoto={profilePhoto}
              />
            </View>
          </Animated.View>
        </Animated.View>

        <View style={[styles.content, contentStyle]}>{children}</View>

        {showFooter ? (
          <FooterMenu
            activeTab={activeTab}
            onPressTab={handleTabPress}
            onAddPostShortcut={handleFooterShortcut}
            showShortcut={showAddShortcut}
            accent={accentPreset}
            myRepliesBadge={myRepliesBadge}
            isLoggedIn={!!firebaseUser}
          />
        ) : null}

        <CreatePostModal
          visible={composerVisible}
          onClose={() => setComposerVisible(false)}
          initialLocation={initialLocation}
          initialAccentKey={accentPreset?.key}
          onSubmitPost={handleSubmitPost}
          authorProfile={{
            nickname: userProfile?.nickname ?? '',
            avatarConfig: authorAvatarConfig,
            avatarKey: userProfile?.avatarKey,
          }}
        />

        <Modal
          visible={drawerVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setDrawerVisible(false)}
        >
          {/* Keep the status bar translucent in the drawer as well */}
          <StatusBar translucent backgroundColor="transparent" style={statusStyle} hidden={!showHeaderBar} />
          <View style={styles.drawerContainer}>
{Platform.OS === 'android' ? (
              <View style={[styles.drawerSheet, { backgroundColor: isDarkMode ? '#000000' : '#f5f5f5', paddingTop: 0 }]}>
                <MainDrawerContent accent={accentPreset} onSelectShortcut={handleShortcutSelect} />
              </View>
            ) : (
              <BlurView
                intensity={isDarkMode ? 30 : 20}
                tint={isDarkMode ? 'dark' : 'light'}
                style={styles.drawerSheet}
              >
                <View style={{ paddingTop: insets.top + 12, flex: 1 }}>
                  <MainDrawerContent accent={accentPreset} onSelectShortcut={handleShortcutSelect} />
                </View>
              </BlurView>
            )}
            <Pressable style={styles.drawerOverlay} onPress={() => setDrawerVisible(false)}>
              <BlurView
                intensity={50}
                tint={isDarkMode ? 'dark' : 'light'}
                style={StyleSheet.absoluteFill}
              />
            </Pressable>
          </View>
        </Modal>

        <NotificationsModal
          visible={notificationsVisible}
          onClose={handleCloseNotifications}
          notifications={headerNotifications}
          accent={accentPreset}
          themeColors={themeColors}
          onSelectNotification={handleSelectNotification}
          navigation={navigation}
        />


        <UpgradePromptModal
          visible={upgradeModalVisible}
          onClose={() => setUpgradeModalVisible(false)}
          onUpgrade={handleUpgradeNow}
          featureName={`Post Limit Reached (${postLimitInfo.count}/${postLimitInfo.limit})`}
          featureDescription={`You've reached your daily limit of ${postLimitInfo.limit} posts. Upgrade to Premium for unlimited posts!`}
          requiredPlan="premium"
          icon="create"
        />
      </View>
    </SafeAreaView>
  );
}

const createStyles = (palette, { isDarkMode, enableHeaderOverlap } = {}) =>
  StyleSheet.create({
    safe: {
      flex: 1,
    },
    safeOverlay: {
      flex: 1,
      backgroundColor: palette.background,
      position: 'relative',
    },
    headerBackground: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 0,
    },
    headerContainer: {
      overflow: 'hidden',
    },
    content: {
      flex: 1,
      paddingTop: enableHeaderOverlap ? 0 : 24,
      paddingHorizontal: 20,
      paddingBottom: 0,
      backgroundColor: palette.background,
      marginTop: enableHeaderOverlap ? -22 : 0,
    },
    drawerContainer: {
      flex: 1,
      flexDirection: 'row',
    },
    drawerOverlay: {
      flex: 1,
    },
    drawerSheet: {
      width: '82%',
      backgroundColor: isDarkMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.4)',
      shadowColor: '#000',
      shadowOpacity: isDarkMode ? 0.5 : 0.3,
      shadowRadius: 20,
      shadowOffset: { width: 8, height: 0 },
      elevation: 12,
      borderRightWidth: 1,
      borderRightColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
    },
  });
