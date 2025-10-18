import React from 'react';
import { SafeAreaView, View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AppHeader from './AppHeader';
import { colors } from '../constants/colors';

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
  contentStyle
}) {
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <View style={styles.container}>
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
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background
  },
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  content: {
    flex: 1,
    paddingTop: 24,
    paddingHorizontal: 20
  }
});
