import React, { useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from './AppHeader';
import { colors } from '../constants/colors';
import FooterMenu from './FooterMenu';
import { useSettings } from '../contexts/SettingsContext';
import { usePosts } from '../contexts/PostsContext';
import CreatePostModal from './CreatePostModal';
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
  const { showAddShortcut, accentPreset, userProfile, updateUserProfile } = useSettings();
  const { addPost, getReplyNotificationCount } = usePosts();
  const statusStyle = accentPreset.isDark ? 'light' : 'dark';
  const myRepliesBadge = getReplyNotificationCount ? getReplyNotificationCount() : 0;
  const [composerVisible, setComposerVisible] = useState(false);

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

  const handleSubmitPost = ({ location, colorKey, message }) => {
    if (!location?.city || !message) {
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

    addPost(location.city, message, colorKey, mergedAuthor);

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

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: accentPreset.background }]}>
      <StatusBar style={statusStyle} backgroundColor={accentPreset.background} />
      <View style={styles.safeOverlay}>
        <AppHeader
          title={title}
          subtitle={subtitle}
          onBack={onBack}
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
            avatarConfig: authorAvatarConfig
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.primary
  },
  safeOverlay: {
    flex: 1,
    backgroundColor: colors.background
  },
  content: {
    flex: 1,
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 0
  }
});
