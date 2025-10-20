import React, { useMemo, useState } from 'react';
import { View, StyleSheet, Modal, Pressable } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AppHeader from './AppHeader';
import FooterMenu from './FooterMenu';
import { useSettings } from '../contexts/SettingsContext';
import { usePosts } from '../contexts/PostsContext';
import CreatePostModal from './CreatePostModal';
import MainDrawerContent from './MainDrawerContent';
import { getAvatarConfig } from '../constants/avatars';

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
  headerStyle
}) {
  const {
    showAddShortcut,
    accentPreset,
    userProfile,
    updateUserProfile,
    themeColors,
    isDarkMode
  } = useSettings();
  const { addPost, getReplyNotificationCount } = usePosts();
  const statusStyle = accentPreset.isDark ? 'light' : 'dark';
  const myRepliesBadge = getReplyNotificationCount ? getReplyNotificationCount() : 0;
  const [composerVisible, setComposerVisible] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
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

    const mergedAuthor = {
      ...userProfile,
      nickname: userProfile?.nickname ?? '',
      city: location.city,
      province: location.province ?? userProfile?.province ?? '',
      country: location.country ?? userProfile?.country ?? '',
      avatarKey: userProfile?.avatarKey ?? 'default'
    };

    addPost(location.city, title, message, colorKey, mergedAuthor, highlightDescription);

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
    } else if (key === 'settings') {
      navigation.navigate('Settings');
    }
  };

  const styles = useMemo(
    () => createStyles(themeColors, { isDarkMode }),
    [themeColors, isDarkMode]
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: accentPreset.background }]}>
      <StatusBar style={statusStyle} backgroundColor={accentPreset.background} />
      <View style={styles.safeOverlay}>
        <AppHeader
          title={title}
          subtitle={subtitle}
          onBack={onBack}
          onMenu={!onBack ? handleMenuPress : undefined}
          rightIcon={rightIcon}
          onRightPress={onRightPress}
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
      backgroundColor: palette.background
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
