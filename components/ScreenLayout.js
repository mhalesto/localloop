import React, { useMemo, useState } from 'react';
import { View, StyleSheet, Modal, Pressable, Animated, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AppHeader from './AppHeader';
import FooterMenu from './FooterMenu';
import { useSettings } from '../contexts/SettingsContext';
import { usePosts } from '../contexts/PostsContext';
import { useAuth } from '../contexts/AuthContext';
import CreatePostModal from './CreatePostModal';
import MainDrawerContent from './MainDrawerContent';
import { getAvatarConfig } from '../constants/avatars';
import NotificationsModal from './NotificationsModal';

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
}) {
  const {
    showAddShortcut,
    accentPreset,
    userProfile,
    updateUserProfile,
    themeColors,
    isDarkMode
  } = useSettings();
  const {
    addPost,
    getReplyNotificationCount,
    getNotificationCount,
    getNotifications,
    markNotificationsRead,
    markNotificationsForThreadRead
  } = usePosts();
  const { user: firebaseUser } = useAuth();
  const statusStyle = accentPreset.isDark ? 'light' : 'dark';
  const myRepliesBadge = getReplyNotificationCount ? getReplyNotificationCount() : 0;
  const [composerVisible, setComposerVisible] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const insets = useSafeAreaInsets();

  const initialLocation = useMemo(
    () =>
      userProfile?.city
        ? {
          city: userProfile.city,
          province: userProfile.province ?? '',
          country: userProfile.country ?? ''
        }
        : null,
    [userProfile]
  );

  const authorAvatarConfig = useMemo(
    () => getAvatarConfig(userProfile?.avatarKey),
    [userProfile?.avatarKey]
  );
  const handleSubmitPost = ({ location, colorKey, title, message, highlightDescription }) => {
    if (!location?.city || !title?.trim?.()) {
      setComposerVisible(false);
      return;
    }

    if (!firebaseUser?.uid) {
      Alert.alert('Sign in required', 'Sign in to publish posts to the community.');
      setComposerVisible(false);
      return;
    }

    const mergedAuthor = {
      ...userProfile,
      nickname: userProfile?.nickname ?? '',
      city: location.city,
      province: location.province ?? userProfile?.province ?? '',
      country: location.country ?? userProfile?.country ?? '',
      avatarKey: userProfile?.avatarKey ?? 'default',
      uid: firebaseUser.uid
    };

    const published = addPost(location.city, title, message, colorKey, mergedAuthor, highlightDescription);

    if (!published) {
      Alert.alert('Unable to publish', 'We could not create that post. Please try again in a moment.');
      setComposerVisible(false);
      return;
    }

    if (!userProfile?.city) {
      updateUserProfile?.({
        city: location.city,
        province: location.province ?? '',
        country: location.country ?? ''
      });
    }

    setComposerVisible(false);
    if (navigation) {
      navigation.navigate('Room', { city: location.city });
    }
  };

  const handleFooterShortcut = () => {
    setComposerVisible(true);
  };

  const handleTabPress = (tab) => {
    if (!navigation) return;
    if (tab === 'home') {
      if (navigation.canGoBack && navigation.canGoBack()) {
        navigation.popToTop();
      }
      navigation.navigate('Country');
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

  const handleMenuPress = () => {
    setDrawerVisible(true);
  };

  const handleShortcutSelect = (key) => {
    setDrawerVisible(false);
    if (!navigation) return;
    if (key === 'home') {
      navigation.navigate('Country');
    } else if (key === 'myComments') {
      navigation.navigate('MyComments');
    } else if (key === 'topStatuses') {
      navigation.navigate('TopStatuses');
    } else if (key === 'settings') {
      navigation.navigate('Settings');
    }
  };

  const headerNotificationCount = getNotificationCount ? getNotificationCount() : 0;
  const headerNotifications = useMemo(
    () => (getNotifications ? getNotifications() : []),
    [getNotifications]
  );
  const defaultRightIcon = rightIcon ?? (headerNotificationCount > 0 ? 'notifications' : 'notifications-outline');
  const handleHeaderRightPress = onRightPress ?? (() => {
    setNotificationsVisible(true);
    markNotificationsRead?.();
  });
  const headerBadgeCount = onRightPress ? undefined : headerNotificationCount;

  const handleCloseNotifications = () => {
    setNotificationsVisible(false);
  };

  const handleSelectNotification = (notification) => {
    setNotificationsVisible(false);
    if (!notification) {
      return;
    }
    markNotificationsForThreadRead?.(notification.city, notification.postId);
    if (!navigation) {
      return;
    }
    navigation.navigate('PostThread', {
      city: notification.city,
      postId: notification.postId,
      focusCommentId: notification.commentId ?? null,
    });
  };

  const styles = useMemo(
    () => createStyles(themeColors, { isDarkMode }),
    [themeColors, isDarkMode]
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: accentPreset.background }]}>
      <StatusBar style={statusStyle} backgroundColor={accentPreset.background} />
      <View style={styles.safeOverlay}>
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
          wrapperStyle={[
            headerStyle,
            { backgroundColor: accentPreset.background }
          ]}
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
            avatarKey: userProfile?.avatarKey
          }}
        />

        <Modal
          visible={drawerVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setDrawerVisible(false)}
        >
          <StatusBar backgroundColor={accentPreset.background} style={statusStyle} />
          <View style={styles.drawerContainer}>
            <View
              style={[
                styles.drawerSheet,
                {
                  paddingTop: insets.top + 12,
                  backgroundColor: accentPreset.background
                }
              ]}
            >
              <MainDrawerContent
                accent={accentPreset}
                onSelectShortcut={handleShortcutSelect}
              />
            </View>
            <Pressable style={styles.drawerOverlay} onPress={() => setDrawerVisible(false)} />
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
      </View>
    </SafeAreaView>
  );
}

const createStyles = (palette, { isDarkMode } = {}) =>
  StyleSheet.create({
    safe: {
      flex: 1
    },
    safeOverlay: {
      flex: 1,
      backgroundColor: palette.background,
      position: 'relative'
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
      paddingTop: 24,
      paddingHorizontal: 20,
      paddingBottom: 0,
      backgroundColor: palette.background
    },
    drawerContainer: {
      flex: 1,
      flexDirection: 'row'
    },
    drawerOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.35)'
    },
    drawerSheet: {
      width: '78%',
      backgroundColor: isDarkMode ? palette.card : palette.background,
      shadowColor: '#000',
      shadowOpacity: isDarkMode ? 0.4 : 0.2,
      shadowRadius: 10,
      shadowOffset: { width: 4, height: 0 },
      elevation: 8
    }
  });
