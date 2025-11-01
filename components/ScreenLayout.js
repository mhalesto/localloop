import React, { useMemo, useState } from 'react';
import { View, StyleSheet, Modal, Pressable, Animated, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';

import AppHeader from './AppHeader';
import FooterMenu from './FooterMenu';
import { useSettings } from '../contexts/SettingsContext';
import { usePosts } from '../contexts/PostsContext';
import { useAuth } from '../contexts/AuthContext';
import CreatePostModal from './CreatePostModal';
import MainDrawerContent from './MainDrawerContent';
import { getAvatarConfig } from '../constants/avatars';
import NotificationsModal from './NotificationsModal';
import LoadingOverlay from './LoadingOverlay';
import { analyzePostContent } from '../services/openai/moderationService';
import { autoTagPost } from '../services/openai/autoTaggingService';
import { analyzeContent } from '../services/openai/contentAnalysisService';
import { scorePostQuality } from '../services/openai/qualityScoringService';
import { isFeatureEnabled } from '../config/aiFeatures';
import { createPublicPost } from '../services/publicPostsService'; // [PUBLIC-MODE]

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
  headerStyle,
  headerBackgroundStyle,
  enableHeaderOverlap = false,
}) {
  const {
    showAddShortcut,
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
  const insets = useSafeAreaInsets();

  // Status bar icons (white on dark headers, dark on light headers)
  const statusStyle = accentPreset?.isDark ? 'light' : 'dark';

  const myRepliesBadge = getReplyNotificationCount ? getReplyNotificationCount() : 0;

  const [composerVisible, setComposerVisible] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [loadingVisible, setLoadingVisible] = useState(false);

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

  const handleSubmitPost = async ({ location, colorKey, title, message, highlightDescription, postingMode, isPublic }) => {
    if (!location?.city || !title?.trim?.()) {
      setComposerVisible(false);
      return false;
    }
    if (!firebaseUser?.uid) {
      Alert.alert('Sign in required', 'Sign in to publish posts to the community.');
      setComposerVisible(false);
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

    // [PUBLIC-MODE] Pass posting mode and public profile to addPost
    const published = addPost(
      location.city,
      title,
      message,
      colorKey,
      mergedAuthor,
      highlightDescription,
      tempModeration,
      postingMode || 'anonymous', // Default to anonymous if not specified
      isPublic ? userProfile : null // Pass public profile data if posting publicly
    );

    if (!published) {
      Alert.alert('Unable to publish', 'We could not create that post. Please try again in a moment.');
      setComposerVisible(false);
      return false;
    }

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
    // Show loading overlay first
    setLoadingVisible(true);
  };

  const handleLoadingComplete = () => {
    setLoadingVisible(false);
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
    } else if (tab === 'discover') {
      // [PUBLIC-MODE] Navigate to Discover screen
      if (navigation.getCurrentRoute?.()?.name !== 'Discover') {
        navigation.navigate('Discover');
      }
    } else if (tab === 'myComments') {
      if (navigation.getCurrentRoute?.()?.name !== 'MyComments') {
        navigation.navigate('MyComments');
      }
    } else if (tab === 'settings') {
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
    else if (key === 'myComments') navigation.navigate('MyComments');
    else if (key === 'myPosts') navigation.navigate('MyPosts');
    else if (key === 'topStatuses') navigation.navigate('TopStatuses');
    else if (key === 'settings') navigation.navigate('Settings');
  };

  const headerNotificationCount = getNotificationCount ? getNotificationCount() : 0;
  const headerNotifications = useMemo(
    () => (getNotifications ? getNotifications() : []),
    [getNotifications]
  );
  const defaultRightIcon =
    rightIcon ?? (headerNotificationCount > 0 ? 'notifications' : 'notifications-outline');

  const handleHeaderRightPress =
    onRightPress ??
    (() => {
      setNotificationsVisible(true);
      markNotificationsRead?.();
    });

  const headerBadgeCount = onRightPress ? undefined : headerNotificationCount;

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

  return (
    // IMPORTANT:
    // - We do NOT paint the safe area with the header color anymore.
    // - We let AppHeader handle the top inset and background so shapes can bleed into the status bar.
    <SafeAreaView style={[styles.safe, { backgroundColor: themeColors.background }]} edges={['bottom']}>
      {/* Translucent status bar so the header’s background/shapes are visible underneath */}
      <StatusBar style={statusStyle} translucent backgroundColor="transparent" />

      <View style={styles.safeOverlay}>
        {/* Optional external header overlay (kept non-blocking & behind header) */}
        {headerBackgroundStyle ? (
          <Animated.View pointerEvents="none" style={[styles.headerBackground, headerBackgroundStyle]} />
        ) : null}

        <AppHeader
          title={title}
          subtitle={subtitle}
          onBack={onBack}
          onMenu={!onBack ? handleMenuPress : undefined}
          rightIcon={defaultRightIcon}
          onRightPress={handleHeaderRightPress}
          rightBadgeCount={headerBadgeCount}
          showSearch={showSearch}
          searchPlaceholder={searchPlaceholder}
          searchValue={searchValue}
          onSearchChange={onSearchChange}
          wrapperStyle={headerStyle}
          accent={accentPreset}
        />

        <View style={[styles.content, contentStyle]}>{children}</View>

        {showFooter ? (
          <FooterMenu
            activeTab={activeTab}
            onPressTab={handleTabPress}
            onAddPostShortcut={handleFooterShortcut}
            showShortcut={showAddShortcut}
            accent={accentPreset}
            myRepliesBadge={myRepliesBadge}
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
          <StatusBar translucent backgroundColor="transparent" style={statusStyle} />
          <View style={styles.drawerContainer}>
            <BlurView
              intensity={isDarkMode ? 30 : 20}
              tint={isDarkMode ? 'dark' : 'light'}
              style={styles.drawerSheet}
            >
              <View style={{ paddingTop: insets.top + 12, flex: 1 }}>
                <MainDrawerContent accent={accentPreset} onSelectShortcut={handleShortcutSelect} />
              </View>
            </BlurView>
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
        />

        <LoadingOverlay
          visible={loadingVisible}
          onComplete={handleLoadingComplete}
          duration={1000}
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
