import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import StatusSkeleton from './StatusSkeleton';
import { useSettings } from '../contexts/SettingsContext';

/**
 * FeedSkeleton - Loading placeholder for status feeds
 * Shows multiple status card skeletons with shimmer animation
 */
export default function FeedSkeleton({ count = 3 }) {
  const { themeColors } = useSettings();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: themeColors.background }]}
      showsVerticalScrollIndicator={false}
    >
      {Array.from({ length: count }).map((_, index) => (
        <StatusSkeleton key={index} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
});
