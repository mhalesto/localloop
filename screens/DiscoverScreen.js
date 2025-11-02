import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenLayout from '../components/ScreenLayout';
import ProgressiveImage from '../components/ProgressiveImage';
import DiscoverSkeleton from '../components/DiscoverSkeleton';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { getThumbnailUrl } from '../utils/imageUtils';
import {
  getTrendingUsers,
  getUsersByLocation,
  searchUsersByUsername,
} from '../services/userProfileService';

export default function DiscoverScreen({ navigation }) {
  const { themeColors, accentPreset, userProfile } = useSettings();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('trending'); // 'trending', 'local', 'search'
  const [trendingUsers, setTrendingUsers] = useState([]);
  const [localUsers, setLocalUsers] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searching, setSearching] = useState(false);

  const primaryColor = accentPreset?.buttonBackground || themeColors.primary;

  const loadTrendingUsers = useCallback(async () => {
    try {
      const users = await getTrendingUsers(20);
      // Filter out current user
      setTrendingUsers(users.filter(u => u.id !== user?.uid));
    } catch (error) {
      console.error('[Discover] Error loading trending users:', error);
    }
  }, [user?.uid]);

  const loadLocalUsers = useCallback(async () => {
    if (!userProfile?.country) return;

    try {
      const users = await getUsersByLocation(
        userProfile.country,
        userProfile.province,
        userProfile.city,
        20
      );
      // Filter out current user
      setLocalUsers(users.filter(u => u.id !== user?.uid));
    } catch (error) {
      console.error('[Discover] Error loading local users:', error);
    }
  }, [userProfile?.country, userProfile?.province, userProfile?.city, user?.uid]);

  const loadData = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadTrendingUsers(), loadLocalUsers()]);
    setLoading(false);
    setRefreshing(false);
  }, [loadTrendingUsers, loadLocalUsers]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const searchUsers = async () => {
      if (!searchQuery || searchQuery.length < 2) {
        setSearchResults([]);
        setSearching(false);
        return;
      }

      setSearching(true);
      try {
        const results = await searchUsersByUsername(searchQuery);
        // Filter out current user
        setSearchResults(results.filter(u => u.id !== user?.uid));
      } catch (error) {
        console.error('[Discover] Error searching users:', error);
      } finally {
        setSearching(false);
      }
    };

    const debounce = setTimeout(searchUsers, 500);
    return () => clearTimeout(debounce);
  }, [searchQuery, user?.uid]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const navigateToProfile = (userId) => {
    navigation.push('PublicProfile', { userId });
  };

  const renderUser = ({ item }) => (
    <TouchableOpacity
      style={[styles.userCard, { backgroundColor: themeColors.card }]}
      onPress={() => navigateToProfile(item.id)}
      activeOpacity={0.7}
    >
      <View style={[styles.avatar, { borderColor: primaryColor }]}>
        {item.profilePhoto ? (
          <ProgressiveImage
            source={item.profilePhoto}
            thumbnail={getThumbnailUrl(item.profilePhoto, 60, 70)}
            style={styles.avatarImage}
            contentFit="cover"
            transition={150}
          />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: `${primaryColor}20` }]}>
            <Ionicons name="person" size={32} color={primaryColor} />
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
          <Text style={[styles.bio, { color: themeColors.textSecondary }]} numberOfLines={2}>
            {item.bio}
          </Text>
        )}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={[styles.statNumber, { color: themeColors.textPrimary }]}>
              {item.followersCount || 0}
            </Text>
            <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>
              Followers
            </Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statNumber, { color: themeColors.textPrimary }]}>
              {item.publicPostsCount || 0}
            </Text>
            <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>Posts</Text>
          </View>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={24} color={themeColors.textSecondary} />
    </TouchableOpacity>
  );

  if (!user?.uid || !userProfile?.isPublicProfile) {
    return (
      <ScreenLayout title="Discover" navigation={navigation} showFooter={true} activeTab="discover">
        <View style={styles.setupContainer}>
          <Ionicons name="compass-outline" size={80} color={themeColors.textSecondary} />
          <Text style={[styles.setupTitle, { color: themeColors.textPrimary }]}>
            Set Up Your Profile
          </Text>
          <Text style={[styles.setupText, { color: themeColors.textSecondary }]}>
            Create a public profile to discover and connect with other users.
          </Text>
          <TouchableOpacity
            style={[styles.setupButton, { backgroundColor: primaryColor }]}
            onPress={() => navigation.navigate('ProfileSetup')}
            activeOpacity={0.8}
          >
            <Text style={styles.setupButtonText}>Create Profile</Text>
          </TouchableOpacity>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout title="Discover" navigation={navigation} showFooter={true} activeTab="discover">
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
              placeholder="Search users..."
              placeholderTextColor={themeColors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searching && <ActivityIndicator size="small" color={primaryColor} />}
            {!searching && searchQuery && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={themeColors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Tabs (only show if not searching) */}
        {!searchQuery && (
          <View style={[styles.tabsContainer, { borderBottomColor: themeColors.divider }]}>
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === 'trending' && {
                  borderBottomColor: primaryColor,
                  borderBottomWidth: 2,
                },
              ]}
              onPress={() => setActiveTab('trending')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabText,
                  {
                    color: activeTab === 'trending' ? primaryColor : themeColors.textSecondary,
                  },
                ]}
              >
                Trending
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === 'local' && {
                  borderBottomColor: primaryColor,
                  borderBottomWidth: 2,
                },
              ]}
              onPress={() => setActiveTab('local')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabText,
                  {
                    color: activeTab === 'local' ? primaryColor : themeColors.textSecondary,
                  },
                ]}
              >
                Nearby
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Content */}
        {loading ? (
          <DiscoverSkeleton count={5} />
        ) : (
          <FlatList
            data={searchQuery ? searchResults : activeTab === 'trending' ? trendingUsers : localUsers}
            renderItem={renderUser}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons
                  name={searchQuery ? 'search' : 'people-outline'}
                  size={64}
                  color={themeColors.textSecondary}
                />
                <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>
                  {searchQuery
                    ? 'No users found'
                    : activeTab === 'trending'
                    ? 'No trending users yet'
                    : 'No nearby users found'}
                </Text>
              </View>
            }
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
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  setupContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    gap: 16,
  },
  setupTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  setupText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  setupButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  setupButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
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
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
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
    gap: 4,
  },
  displayName: {
    fontSize: 17,
    fontWeight: '600',
  },
  username: {
    fontSize: 14,
  },
  bio: {
    fontSize: 13,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 4,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statNumber: {
    fontSize: 14,
    fontWeight: '600',
  },
  statLabel: {
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
