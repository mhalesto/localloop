import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenLayout from '../components/ScreenLayout';
import ProgressiveImage from '../components/ProgressiveImage';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { useAlert } from '../contexts/AlertContext';
import { getThumbnailUrl } from '../utils/imageUtils';
import { getFollowing, unfollowUser } from '../services/followService';

export default function FollowingScreen({ navigation, route }) {
  const { userId, username } = route.params;
  const { themeColors, accentPreset } = useSettings();
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const [following, setFollowing] = useState([]);
  const [filteredFollowing, setFilteredFollowing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [unfollowingIds, setUnfollowingIds] = useState(new Set());

  const primaryColor = accentPreset?.buttonBackground || themeColors.primary;
  const isOwnProfile = user?.uid === userId;

  const loadFollowing = useCallback(async () => {
    try {
      const data = await getFollowing(userId);
      setFollowing(data);
      setFilteredFollowing(data);
    } catch (error) {
      console.error('[Following] Error loading following:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    loadFollowing();
  }, [loadFollowing]);

  useEffect(() => {
    if (searchQuery) {
      const filtered = following.filter(
        (user) =>
          user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredFollowing(filtered);
    } else {
      setFilteredFollowing(following);
    }
  }, [searchQuery, following]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadFollowing();
  }, [loadFollowing]);

  const navigateToProfile = (followedId) => {
    navigation.push('PublicProfile', { userId: followedId });
  };

  const handleUnfollow = async (followedUser) => {
    if (!isOwnProfile) return;

    showAlert(
      'Unfollow User',
      `Are you sure you want to unfollow @${followedUser.username}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unfollow',
          style: 'destructive',
          onPress: async () => {
            setUnfollowingIds(prev => new Set(prev).add(followedUser.id));
            try {
              await unfollowUser(user.uid, followedUser.id);
              setFollowing(prev => prev.filter(u => u.id !== followedUser.id));
            } catch (error) {
              console.error('[Following] Error unfollowing user:', error);
              showAlert('Error', 'Failed to unfollow user. Please try again.', [], { type: 'error' });
            } finally {
              setUnfollowingIds(prev => {
                const next = new Set(prev);
                next.delete(followedUser.id);
                return next;
              });
            }
          },
        },
      ],
      { type: 'warning' }
    );
  };

  const renderFollowedUser = ({ item }) => (
    <TouchableOpacity
      style={[styles.userCard, { backgroundColor: themeColors.card }]}
      onPress={() => navigateToProfile(item.id)}
      activeOpacity={0.7}
    >
      <View style={[styles.avatar, { borderColor: primaryColor }]}>
        {item.profilePhoto ? (
          <ProgressiveImage
            source={item.profilePhoto}
            thumbnail={getThumbnailUrl(item.profilePhoto, 50, 70)}
            style={styles.avatarImage}
            contentFit="cover"
            transition={150}
          />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: `${primaryColor}20` }]}>
            <Ionicons name="person" size={24} color={primaryColor} />
          </View>
        )}
      </View>

      <View style={styles.userInfo}>
        <Text style={[styles.displayName, { color: themeColors.textPrimary }]}>
          {item.displayName || item.username}
        </Text>
        <Text style={[styles.username, { color: themeColors.textSecondary }]}>
          @{item.username}
        </Text>
        {item.bio && (
          <Text style={[styles.bio, { color: themeColors.textSecondary }]} numberOfLines={1}>
            {item.bio}
          </Text>
        )}
      </View>

      {isOwnProfile && (
        <TouchableOpacity
          style={[
            styles.unfollowButton,
            {
              borderColor: themeColors.divider,
              opacity: unfollowingIds.has(item.id) ? 0.5 : 1,
            },
          ]}
          onPress={() => handleUnfollow(item)}
          disabled={unfollowingIds.has(item.id)}
        >
          {unfollowingIds.has(item.id) ? (
            <ActivityIndicator size="small" color={themeColors.textSecondary} />
          ) : (
            <Text style={[styles.unfollowText, { color: themeColors.textSecondary }]}>
              Unfollow
            </Text>
          )}
        </TouchableOpacity>
      )}

      {!isOwnProfile && (
        <Ionicons name="chevron-forward" size={20} color={themeColors.textSecondary} />
      )}
    </TouchableOpacity>
  );

  return (
    <ScreenLayout
      title="Following"
      subtitle={username ? `@${username}` : ''}
      navigation={navigation}
      onBack={() => navigation.goBack()}
      showFooter={false}
    >
      <View style={styles.container}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View
            style={[
              styles.searchBar,
              {
                backgroundColor: themeColors.background,
                borderColor: themeColors.divider,
              },
            ]}
          >
            <Ionicons name="search" size={20} color={themeColors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: themeColors.textPrimary }]}
              placeholder="Search following..."
              placeholderTextColor={themeColors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={themeColors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Following List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={primaryColor} />
          </View>
        ) : filteredFollowing.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name={searchQuery ? 'search' : 'people-outline'}
              size={64}
              color={themeColors.textSecondary}
            />
            <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>
              {searchQuery ? 'No users found' : 'Not following anyone yet'}
            </Text>
            {!searchQuery && (
              <Text style={[styles.emptySubtext, { color: themeColors.textSecondary }]}>
                {isOwnProfile
                  ? 'Users you follow will appear here'
                  : 'This user isn\'t following anyone yet'}
              </Text>
            )}
          </View>
        ) : (
          <FlatList
            data={filteredFollowing}
            renderItem={renderFollowedUser}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={primaryColor}
              />
            }
          />
        )}
      </View>
    </ScreenLayout>
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
    gap: 8,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
    gap: 12,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
    gap: 2,
  },
  displayName: {
    fontSize: 16,
    fontWeight: '600',
  },
  username: {
    fontSize: 14,
  },
  bio: {
    fontSize: 13,
    marginTop: 2,
  },
  unfollowButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 80,
    alignItems: 'center',
  },
  unfollowText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
});
