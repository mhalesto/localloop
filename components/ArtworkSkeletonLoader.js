import React from 'react';
import { View, StyleSheet } from 'react-native';
import Skeleton from './Skeleton';

export default function ArtworkSkeletonLoader() {
  return (
    <View style={styles.container}>
      {/* Left Column */}
      <View style={styles.column}>
        <View style={styles.card}>
          <Skeleton variant="rounded" width="100%" height={180} borderRadius={16} />
          <View style={styles.info}>
            <Skeleton variant="rounded" width={60} height={20} borderRadius={8} />
            <View style={styles.artist}>
              <Skeleton variant="circle" size={20} />
              <Skeleton variant="rounded" width={80} height={14} borderRadius={7} />
            </View>
          </View>
        </View>
        <View style={styles.card}>
          <Skeleton variant="rounded" width="100%" height={200} borderRadius={16} />
          <View style={styles.info}>
            <Skeleton variant="rounded" width={70} height={20} borderRadius={8} />
            <View style={styles.artist}>
              <Skeleton variant="circle" size={20} />
              <Skeleton variant="rounded" width={90} height={14} borderRadius={7} />
            </View>
          </View>
        </View>
      </View>

      {/* Right Column */}
      <View style={styles.column}>
        <View style={styles.card}>
          <Skeleton variant="rounded" width="100%" height={200} borderRadius={16} />
          <View style={styles.info}>
            <Skeleton variant="rounded" width={65} height={20} borderRadius={8} />
            <View style={styles.artist}>
              <Skeleton variant="circle" size={20} />
              <Skeleton variant="rounded" width={85} height={14} borderRadius={7} />
            </View>
          </View>
        </View>
        <View style={styles.card}>
          <Skeleton variant="rounded" width="100%" height={180} borderRadius={16} />
          <View style={styles.info}>
            <Skeleton variant="rounded" width={55} height={20} borderRadius={8} />
            <View style={styles.artist}>
              <Skeleton variant="circle" size={20} />
              <Skeleton variant="rounded" width={75} height={14} borderRadius={7} />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 20,
  },
  column: {
    flex: 1,
    gap: 8,
  },
  card: {
    marginBottom: 8,
  },
  info: {
    marginTop: 10,
    gap: 8,
  },
  artist: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
