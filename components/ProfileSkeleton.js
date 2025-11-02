import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import Skeleton from './Skeleton';
import { useSettings } from '../contexts/SettingsContext';

export default function ProfileSkeleton() {
  const { themeColors } = useSettings();

  return (
    <ScrollView style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* Header Card */}
      <View style={[styles.header, { backgroundColor: themeColors.card }]}>
        {/* Profile Photo */}
        <View style={styles.photoContainer}>
          <Skeleton variant="circle" size={100} />
        </View>

        {/* Display Name */}
        <View style={styles.nameContainer}>
          <Skeleton width={150} height={28} borderRadius={6} />
        </View>

        {/* Username */}
        <View style={styles.usernameContainer}>
          <Skeleton width={120} height={18} borderRadius={4} />
        </View>

        {/* Bio */}
        <View style={styles.bioContainer}>
          <Skeleton width="80%" height={16} borderRadius={4} style={{ marginBottom: 6 }} />
          <Skeleton width="60%" height={16} borderRadius={4} />
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Skeleton width={40} height={32} borderRadius={6} />
            <Skeleton width={60} height={14} borderRadius={4} style={{ marginTop: 4 }} />
          </View>
          <View style={styles.statItem}>
            <Skeleton width={40} height={32} borderRadius={6} />
            <Skeleton width={60} height={14} borderRadius={4} style={{ marginTop: 4 }} />
          </View>
          <View style={styles.statItem}>
            <Skeleton width={40} height={32} borderRadius={6} />
            <Skeleton width={60} height={14} borderRadius={4} style={{ marginTop: 4 }} />
          </View>
          <View style={styles.statItem}>
            <Skeleton width={40} height={32} borderRadius={6} />
            <Skeleton width={60} height={14} borderRadius={4} style={{ marginTop: 4 }} />
          </View>
        </View>

        {/* Edit Profile Button */}
        <View style={styles.buttonContainer}>
          <Skeleton width="90%" height={56} borderRadius={16} />
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <Skeleton width={80} height={20} borderRadius={4} style={{ marginRight: 24 }} />
        <Skeleton width={80} height={20} borderRadius={4} style={{ marginRight: 24 }} />
        <Skeleton width={80} height={20} borderRadius={4} />
      </View>

      {/* Album Grid */}
      <View style={styles.albumContainer}>
        <View style={styles.albumHeader}>
          <Skeleton width={150} height={48} borderRadius={12} />
        </View>
        <Skeleton width="80%" height={16} borderRadius={4} style={{ marginBottom: 16 }} />

        {/* Grid of photo placeholders */}
        <View style={styles.photoGrid}>
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <View key={item} style={styles.photoGridItem}>
              <Skeleton width="100%" height={120} borderRadius={8} />
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 24,
    paddingTop: 32,
    paddingBottom: 32,
    alignItems: 'center',
    marginBottom: 16,
  },
  photoContainer: {
    marginBottom: 16,
  },
  nameContainer: {
    marginBottom: 8,
    alignItems: 'center',
  },
  usernameContainer: {
    marginBottom: 12,
    alignItems: 'center',
  },
  bioContainer: {
    marginBottom: 20,
    alignItems: 'center',
    width: '100%',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  albumContainer: {
    padding: 16,
  },
  albumHeader: {
    marginBottom: 12,
    alignItems: 'center',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  photoGridItem: {
    width: '33.33%',
    padding: 4,
  },
});
