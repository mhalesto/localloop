import React from 'react';
import { View, StyleSheet } from 'react-native';
import Skeleton from './Skeleton';
import { useSettings } from '../contexts/SettingsContext';

/**
 * StatusSkeleton - Loading placeholder for status cards
 * Mimics the layout of StatusCard with shimmer animation
 */
export default function StatusSkeleton() {
  const { themeColors } = useSettings();

  return (
    <View style={[styles.container, { backgroundColor: themeColors.card }]}>
      {/* Author Header */}
      <View style={styles.header}>
        <View style={styles.authorInfo}>
          {/* Avatar */}
          <Skeleton variant="circle" size={40} />

          {/* Author Details */}
          <View style={styles.authorText}>
            <Skeleton width={120} height={16} borderRadius={4} style={{ marginBottom: 6 }} />
            <Skeleton width={80} height={12} borderRadius={4} />
          </View>
        </View>

        {/* More button placeholder */}
        <Skeleton variant="circle" size={24} />
      </View>

      {/* Status Image */}
      <Skeleton width="100%" height={300} borderRadius={0} style={styles.image} />

      {/* Bottom Actions Bar */}
      <View style={styles.actionsBar}>
        {/* Left side actions */}
        <View style={styles.leftActions}>
          <Skeleton variant="circle" size={24} style={{ marginRight: 16 }} />
          <Skeleton variant="circle" size={24} style={{ marginRight: 16 }} />
          <Skeleton variant="circle" size={24} />
        </View>

        {/* Right side bookmark */}
        <Skeleton variant="circle" size={24} />
      </View>

      {/* Metadata */}
      <View style={styles.metadata}>
        <Skeleton width={100} height={14} borderRadius={4} style={{ marginBottom: 6 }} />
        <Skeleton width={60} height={12} borderRadius={4} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  authorText: {
    marginLeft: 12,
  },
  image: {
    marginVertical: 0,
  },
  actionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metadata: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
});
