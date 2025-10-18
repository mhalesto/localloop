import React from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from './AppHeader';
import { colors } from '../constants/colors';
import FooterMenu from './FooterMenu';
import { useSettings } from '../contexts/SettingsContext';

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
  showFooter = true
}) {
  const { showAddShortcut } = useSettings();

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" backgroundColor={colors.primary} />
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
        />
        <View style={[styles.content, contentStyle]}>{children}</View>
        {showFooter ? (
          <FooterMenu
            activeTab={activeTab}
            onPressTab={(tab) => {
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
            }}
            onAddPostShortcut={() => {
              if (!navigation) return;
              if (navigation.canGoBack && navigation.canGoBack()) {
                navigation.popToTop();
              }
              navigation.navigate('Country');
            }}
            showShortcut={showAddShortcut}
          />
        ) : null}
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
