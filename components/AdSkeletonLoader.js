import React from 'react';
import { View, StyleSheet } from 'react-native';
import Skeleton from './Skeleton';

export default function AdSkeletonLoader() {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Icon skeleton */}
        <Skeleton variant="circle" size={100} />

        {/* Text content */}
        <View style={styles.textContainer}>
          <View style={styles.header}>
            <Skeleton variant="circle" size={32} />
            <Skeleton variant="rounded" width={120} height={20} borderRadius={10} />
          </View>
          <Skeleton variant="rounded" width="100%" height={16} borderRadius={8} />
          <Skeleton variant="rounded" width="80%" height={14} borderRadius={7} />
          <Skeleton variant="rounded" width={100} height={32} borderRadius={16} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    borderWidth: 1,
    marginHorizontal: 12,
    marginBottom: 24,
    padding: 16,
  },
  content: {
    flexDirection: 'row',
    gap: 16,
  },
  textContainer: {
    flex: 1,
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
});
