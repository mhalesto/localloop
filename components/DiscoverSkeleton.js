import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import Skeleton from './Skeleton';
import { useSettings } from '../contexts/SettingsContext';

/**
 * DiscoverSkeleton - Loading placeholder for Discover screen
 * Mimics the layout of user discovery with shimmer animation
 */
export default function DiscoverSkeleton({ count = 5, showHeader = false }) {
  const { themeColors } = useSettings();

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      {showHeader && (
        <>
          {/* Search Bar Skeleton */}
          <View style={styles.searchContainer}>
            <View style={[styles.searchBar, { backgroundColor: themeColors.background, borderColor: themeColors.divider }]}>
              <Skeleton variant="circle" size={20} style={{ marginRight: 8 }} />
              <Skeleton width="70%" height={20} borderRadius={4} />
            </View>
          </View>

          {/* Tabs Skeleton */}
          <View style={[styles.tabsContainer, { borderBottomColor: themeColors.divider }]}>
            <Skeleton width={80} height={20} borderRadius={4} style={{ marginRight: 24 }} />
            <Skeleton width={80} height={20} borderRadius={4} />
          </View>
        </>
      )}

      {/* User Cards List */}
      <ScrollView
        style={styles.listContainer}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {Array.from({ length: count }).map((_, index) => (
          <View key={index} style={[styles.userCard, { backgroundColor: themeColors.card }]}>
            {/* Avatar */}
            <Skeleton variant="circle" size={64} />

            {/* User Info */}
            <View style={styles.userInfo}>
              {/* Display Name */}
              <Skeleton width={140} height={18} borderRadius={4} style={{ marginBottom: 6 }} />

              {/* Username */}
              <Skeleton width={100} height={14} borderRadius={4} style={{ marginBottom: 6 }} />

              {/* Bio */}
              <Skeleton width="90%" height={13} borderRadius={4} style={{ marginBottom: 4 }} />
              <Skeleton width="70%" height={13} borderRadius={4} style={{ marginBottom: 8 }} />

              {/* Stats Row */}
              <View style={styles.statsRow}>
                <View style={styles.stat}>
                  <Skeleton width={30} height={14} borderRadius={4} style={{ marginRight: 4 }} />
                  <Skeleton width={50} height={12} borderRadius={4} />
                </View>
                <View style={styles.stat}>
                  <Skeleton width={30} height={14} borderRadius={4} style={{ marginRight: 4 }} />
                  <Skeleton width={35} height={12} borderRadius={4} />
                </View>
              </View>
            </View>

            {/* Chevron */}
            <Skeleton variant="circle" size={24} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    marginBottom: 8,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
    gap: 12,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  userInfo: {
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 4,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
