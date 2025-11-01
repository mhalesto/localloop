import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenLayout from '../components/ScreenLayout';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { getUserProfile } from '../services/userProfileService';
import { followUser, unfollowUser, isFollowing } from '../services/followService';

export default function PublicProfileScreen({ navigation, route }) {
  const { userId, username } = route.params;
  const { themeColors, accentPreset, userProfile: currentUserProfile } = useSettings();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isFollowingUser, setIsFollowingUser] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('posts'); // 'posts', 'statuses'

  const primaryColor = accentPreset?.buttonBackground || themeColors.primary;
  const isOwnProfile = user?.uid === userId;

  const loadProfile = useCallback(async () => {
    try {
      const profileData = await getUserProfile(userId);
      setProfile(profileData);

      if (!isOwnProfile && user?.uid) {
        const following = await isFollowing(user.uid, userId);
        setIsFollowingUser(following);
      }
    } catch (error) {
      console.error('[PublicProfile] Error loading profile:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, isOwnProfile, user?.uid]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadProfile();
  }, [loadProfile]);

  const handleFollow = async () => {
    if (!user?.uid) {
      navigation.navigate('Settings');
      return;
    }

    setFollowLoading(true);
    try {
      if (isFollowingUser) {
        await unfollowUser(user.uid, userId);
        setIsFollowingUser(false);
        setProfile(prev => ({
          ...prev,
          followersCount: Math.max((prev?.followersCount || 0) - 1, 0),
        }));
      } else {
        await followUser(user.uid, userId);
        setIsFollowingUser(true);
        setProfile(prev => ({
          ...prev,
          followersCount: (prev?.followersCount || 0) + 1,
        }));
      }
    } catch (error) {
      console.error('[PublicProfile] Error toggling follow:', error);
    } finally {
      setFollowLoading(false);
    }
  };

  const navigateToFollowers = () => {
    navigation.navigate('Followers', { userId, username: profile?.username });
  };

  const navigateToFollowing = () => {
    navigation.navigate('Following', { userId, username: profile?.username });
  };

  const navigateToEdit = () => {
    navigation.navigate('ProfileSetup', { isEditing: true });
  };

  if (loading) {
    return (
      <ScreenLayout
        title="Profile"
        navigation={navigation}
        onBack={() => navigation.goBack()}
        showFooter={false}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={primaryColor} />
        </View>
      </ScreenLayout>
    );
  }

  if (!profile) {
    return (
      <ScreenLayout
        title="Profile"
        navigation={navigation}
        onBack={() => navigation.goBack()}
        showFooter={false}
      >
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color={themeColors.textSecondary} />
          <Text style={[styles.errorText, { color: themeColors.textSecondary }]}>
            Profile not found
          </Text>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout
      title={profile.displayName || profile.username}
      subtitle={`@${profile.username}`}
      navigation={navigation}
      onBack={() => navigation.goBack()}
      showFooter={false}
    >
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={primaryColor}
          />
        }
      >
        {/* Profile Header */}
        <View style={[styles.header, { backgroundColor: themeColors.card }]}>
          {/* Profile Photo */}
          <View style={[styles.photoContainer, { borderColor: primaryColor }]}>
            {profile.profilePhoto ? (
              <Image source={{ uri: profile.profilePhoto }} style={styles.photo} />
            ) : (
              <View style={[styles.photoPlaceholder, { backgroundColor: `${primaryColor}20` }]}>
                <Ionicons name="person" size={50} color={primaryColor} />
              </View>
            )}
          </View>

          {/* Display Name & Username */}
          <Text style={[styles.displayName, { color: themeColors.textPrimary }]}>
            {profile.displayName || profile.username}
          </Text>
          <Text style={[styles.username, { color: themeColors.textSecondary }]}>
            @{profile.username}
          </Text>

          {/* Bio */}
          {profile.bio && (
            <Text style={[styles.bio, { color: themeColors.textPrimary }]}>{profile.bio}</Text>
          )}

          {/* Location */}
          {(profile.city || profile.province || profile.country) && (
            <View style={styles.locationRow}>
              <Ionicons name="location" size={16} color={themeColors.textSecondary} />
              <Text style={[styles.location, { color: themeColors.textSecondary }]}>
                {[profile.city, profile.province, profile.country].filter(Boolean).join(', ')}
              </Text>
            </View>
          )}

          {/* Stats */}
          <View style={styles.statsRow}>
            <TouchableOpacity
              style={styles.stat}
              onPress={navigateToFollowers}
              activeOpacity={0.7}
            >
              <Text style={[styles.statNumber, { color: themeColors.textPrimary }]}>
                {profile.followersCount || 0}
              </Text>
              <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>
                Followers
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.stat}
              onPress={navigateToFollowing}
              activeOpacity={0.7}
            >
              <Text style={[styles.statNumber, { color: themeColors.textPrimary }]}>
                {profile.followingCount || 0}
              </Text>
              <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>
                Following
              </Text>
            </TouchableOpacity>

            <View style={styles.stat}>
              <Text style={[styles.statNumber, { color: themeColors.textPrimary }]}>
                {profile.publicPostsCount || 0}
              </Text>
              <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>Posts</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsRow}>
            {isOwnProfile ? (
              <TouchableOpacity
                style={[styles.actionButton, { borderColor: primaryColor }]}
                onPress={navigateToEdit}
                activeOpacity={0.7}
              >
                <Ionicons name="create-outline" size={20} color={primaryColor} />
                <Text style={[styles.actionButtonText, { color: primaryColor }]}>
                  Edit Profile
                </Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  style={[
                    styles.followButton,
                    {
                      backgroundColor: isFollowingUser ? 'transparent' : primaryColor,
                      borderColor: primaryColor,
                      borderWidth: isFollowingUser ? 1 : 0,
                    },
                  ]}
                  onPress={handleFollow}
                  disabled={followLoading}
                  activeOpacity={0.7}
                >
                  {followLoading ? (
                    <ActivityIndicator
                      size="small"
                      color={isFollowingUser ? primaryColor : '#fff'}
                    />
                  ) : (
                    <>
                      <Ionicons
                        name={isFollowingUser ? 'checkmark' : 'person-add'}
                        size={20}
                        color={isFollowingUser ? primaryColor : '#fff'}
                      />
                      <Text
                        style={[
                          styles.followButtonText,
                          { color: isFollowingUser ? primaryColor : '#fff' },
                        ]}
                      >
                        {isFollowingUser ? 'Following' : 'Follow'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.messageButton, { borderColor: primaryColor }]}
                  activeOpacity={0.7}
                >
                  <Ionicons name="mail-outline" size={20} color={primaryColor} />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* Tabs */}
        <View style={[styles.tabsContainer, { borderBottomColor: themeColors.divider }]}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'posts' && {
                borderBottomColor: primaryColor,
                borderBottomWidth: 2,
              },
            ]}
            onPress={() => setActiveTab('posts')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="grid-outline"
              size={20}
              color={activeTab === 'posts' ? primaryColor : themeColors.textSecondary}
            />
            <Text
              style={[
                styles.tabText,
                {
                  color: activeTab === 'posts' ? primaryColor : themeColors.textSecondary,
                },
              ]}
            >
              Posts
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'statuses' && {
                borderBottomColor: primaryColor,
                borderBottomWidth: 2,
              },
            ]}
            onPress={() => setActiveTab('statuses')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="flash-outline"
              size={20}
              color={activeTab === 'statuses' ? primaryColor : themeColors.textSecondary}
            />
            <Text
              style={[
                styles.tabText,
                {
                  color: activeTab === 'statuses' ? primaryColor : themeColors.textSecondary,
                },
              ]}
            >
              Statuses
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        <View style={styles.contentContainer}>
          {activeTab === 'posts' ? (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={64} color={themeColors.textSecondary} />
              <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>
                {isOwnProfile ? 'No public posts yet' : 'No posts to show'}
              </Text>
              <Text style={[styles.emptySubtext, { color: themeColors.textSecondary }]}>
                {isOwnProfile
                  ? 'Posts you create in public mode will appear here'
                  : 'This user hasn\'t posted publicly yet'}
              </Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="flash-outline" size={64} color={themeColors.textSecondary} />
              <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>
                {isOwnProfile ? 'No statuses yet' : 'No statuses to show'}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
    gap: 16,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
  },
  header: {
    padding: 20,
    alignItems: 'center',
    marginBottom: 1,
  },
  photoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    overflow: 'hidden',
    marginBottom: 16,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  displayName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  username: {
    fontSize: 16,
    marginBottom: 12,
  },
  bio: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 20,
  },
  location: {
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  stat: {
    alignItems: 'center',
    gap: 4,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 13,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    paddingHorizontal: 20,
  },
  actionButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  followButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  followButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  messageButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
  },
  contentContainer: {
    flex: 1,
    padding: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
