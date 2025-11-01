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
import { getThumbnailUrl } from '../utils/imageUtils';
import { getFollowers } from '../services/followService';

export default function FollowersScreen({ navigation, route }) {
  const { userId, username } = route.params;
  const { themeColors, accentPreset } = useSettings();
  const { user } = useAuth();
  const [followers, setFollowers] = useState([]);
  const [filteredFollowers, setFilteredFollowers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const primaryColor = accentPreset?.buttonBackground || themeColors.primary;

  const loadFollowers = useCallback(async () => {
    try {
      const data = await getFollowers(userId);
      setFollowers(data);
      setFilteredFollowers(data);
    } catch (error) {
      console.error('[Followers] Error loading followers:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    loadFollowers();
  }, [loadFollowers]);

  useEffect(() => {
    if (searchQuery) {
      const filtered = followers.filter(
        (follower) =>
          follower.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          follower.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredFollowers(filtered);
    } else {
      setFilteredFollowers(followers);
    }
  }, [searchQuery, followers]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadFollowers();
  }, [loadFollowers]);

  const navigateToProfile = (followerId) => {
    navigation.push('PublicProfile', { userId: followerId });
  };

  const renderFollower = ({ item }) => (
    <TouchableOpacity
      style={[styles.followerCard, { backgroundColor: themeColors.card }]}
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

      <View style={styles.followerInfo}>
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

      <Ionicons name="chevron-forward" size={20} color={themeColors.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <ScreenLayout
      title="Followers"
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
              placeholder="Search followers..."
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

        {/* Followers List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={primaryColor} />
          </View>
        ) : filteredFollowers.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name={searchQuery ? 'search' : 'people-outline'}
              size={64}
              color={themeColors.textSecondary}
            />
            <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>
              {searchQuery ? 'No followers found' : 'No followers yet'}
            </Text>
            {!searchQuery && (
              <Text style={[styles.emptySubtext, { color: themeColors.textSecondary }]}>
                {user?.uid === userId
                  ? 'When people follow you, they will appear here'
                  : 'This user doesn\'t have any followers yet'}
              </Text>
            )}
          </View>
        ) : (
          <FlatList
            data={filteredFollowers}
            renderItem={renderFollower}
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
  followerCard: {
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
  followerInfo: {
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
