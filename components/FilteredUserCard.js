import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '../contexts/SettingsContext';

export default function FilteredUserCard({ user, onPress, isFollowing, onFollowPress, isFollowLoading }) {
  const { themeColors } = useSettings();

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.divider }]}
      activeOpacity={0.85}
      onPress={onPress}
    >
      <View style={styles.photoContainer}>
        {user.profilePhoto ? (
          <Image source={{ uri: user.profilePhoto }} style={styles.photo} />
        ) : (
          <View style={[styles.photoPlaceholder, { backgroundColor: `${themeColors.primary}20` }]}>
            <Ionicons name="person" size={32} color={themeColors.primary} />
          </View>
        )}
      </View>
      <Text style={[styles.displayName, { color: themeColors.textPrimary }]} numberOfLines={1}>
        {user.displayName || user.username}
      </Text>
      <Text style={[styles.username, { color: themeColors.textSecondary }]} numberOfLines={1}>
        @{user.username}
      </Text>
      {user.bio && (
        <Text style={[styles.bio, { color: themeColors.textSecondary }]} numberOfLines={2}>
          {user.bio}
        </Text>
      )}

      {/* Follow Button or Following Badge */}
      {isFollowing ? (
        <View style={[styles.followingBadge, { backgroundColor: themeColors.background }]}>
          <Ionicons name="checkmark-circle" size={14} color="#10b981" />
          <Text style={[styles.followingText, { color: themeColors.textSecondary }]}>
            Following
          </Text>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.followButton, { backgroundColor: themeColors.primary }]}
          onPress={(e) => {
            e.stopPropagation();
            onFollowPress();
          }}
          activeOpacity={0.7}
          disabled={isFollowLoading}
        >
          {isFollowLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="person-add" size={14} color="#fff" />
              <Text style={styles.followButtonText}>Follow</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      <View style={styles.meta}>
        <View style={styles.metaItem}>
          <Ionicons name="location" size={12} color={themeColors.primary} />
          <Text style={[styles.metaText, { color: themeColors.textSecondary }]} numberOfLines={1}>
            {user.city}
          </Text>
        </View>
        {user.followersCount > 0 && (
          <View style={styles.metaItem}>
            <Ionicons name="people" size={12} color={themeColors.textSecondary} />
            <Text style={[styles.metaText, { color: themeColors.textSecondary }]}>
              {user.followersCount}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    marginRight: 12,
    width: 150,
    padding: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  photoContainer: {
    marginBottom: 10,
  },
  photo: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  photoPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  displayName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
    textAlign: 'center',
  },
  username: {
    fontSize: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  bio: {
    fontSize: 11,
    lineHeight: 15,
    textAlign: 'center',
    marginBottom: 8,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    fontSize: 11,
  },
  followButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 10,
    marginBottom: 6,
    width: '100%',
  },
  followButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  followingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 10,
    marginBottom: 6,
    width: '100%',
  },
  followingText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
