import React from 'react';
import { View, StyleSheet } from 'react-native';
import Skeleton from './Skeleton';

export default function HorizontalListSkeletonLoader({ type = 'post' }) {
  if (type === 'post') {
    return (
      <View style={styles.horizontalContainer}>
        {[1, 2, 3].map((index) => (
          <View key={index} style={styles.postCard}>
            <Skeleton variant="rounded" width={280} height={180} borderRadius={16} />
            <View style={styles.postInfo}>
              <Skeleton variant="rounded" width={150} height={18} borderRadius={9} />
              <Skeleton variant="rounded" width={200} height={14} borderRadius={7} />
              <View style={styles.postMeta}>
                <Skeleton variant="circle" size={20} />
                <Skeleton variant="rounded" width={100} height={12} borderRadius={6} />
              </View>
            </View>
          </View>
        ))}
      </View>
    );
  }

  // User cards
  return (
    <View style={styles.horizontalContainer}>
      {[1, 2, 3, 4].map((index) => (
        <View key={index} style={styles.userCard}>
          <Skeleton variant="circle" size={64} />
          <Skeleton variant="rounded" width={100} height={16} borderRadius={8} />
          <Skeleton variant="rounded" width={80} height={12} borderRadius={6} />
          <Skeleton variant="rounded" width="100%" height={30} borderRadius={8} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  horizontalContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 4,
    paddingRight: 12,
    paddingLeft: 2,
  },
  postCard: {
    width: 280,
  },
  postInfo: {
    marginTop: 12,
    gap: 8,
  },
  postMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  userCard: {
    width: 150,
    alignItems: 'center',
    gap: 8,
    padding: 14,
  },
});
