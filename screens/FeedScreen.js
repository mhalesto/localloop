import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenLayout from '../components/ScreenLayout';
import FeedSkeleton from '../components/FeedSkeleton';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { getFeedPosts } from '../services/publicPostsService';
import { getFollowing } from '../services/followService';

export default function FeedScreen({ navigation }) {
  const { themeColors, accentPreset, userProfile } = useSettings();
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const primaryColor = accentPreset?.buttonBackground || themeColors.primary;

  const loadFeed = useCallback(async () => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    try {
      // Get list of users being followed
      const following = await getFollowing(user.uid);
      const followingIds = following.map(u => u.id);

      if (followingIds.length === 0) {
        setPosts([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Get posts from followed users
      const feedPosts = await getFeedPosts(followingIds);
      setPosts(feedPosts);
    } catch (error) {
      console.error('[Feed] Error loading feed:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadFeed();
  }, [loadFeed]);

  const navigateToPost = (post) => {
    // Navigate to post detail (you can create a PostDetailScreen later)
    console.log('Navigate to post:', post.id);
  };

  const navigateToProfile = (userId) => {
    navigation.push('PublicProfile', { userId });
  };

  const navigateToDiscover = () => {
    navigation.navigate('Discover');
  };

  const renderPost = ({ item }) => (
    <TouchableOpacity
      style={[styles.postCard, { backgroundColor: themeColors.card }]}
      onPress={() => navigateToPost(item)}
      activeOpacity={0.7}
    >
      {/* Author Info */}
      <TouchableOpacity
        style={styles.authorRow}
        onPress={() => navigateToProfile(item.authorId)}
        activeOpacity={0.7}
      >
        <View style={[styles.authorAvatar, { borderColor: primaryColor }]}>
          {item.authorAvatar ? (
            <Image source={{ uri: item.authorAvatar }} style={styles.avatarImage} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: `${primaryColor}20` }]}>
              <Ionicons name="person" size={20} color={primaryColor} />
            </View>
          )}
        </View>
        <View style={styles.authorInfo}>
          <Text style={[styles.authorName, { color: themeColors.textPrimary }]}>
            {item.authorDisplayName || item.authorUsername}
          </Text>
          <Text style={[styles.authorUsername, { color: themeColors.textSecondary }]}>
            @{item.authorUsername}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Post Content */}
      <Text style={[styles.postTitle, { color: themeColors.textPrimary }]} numberOfLines={2}>
        {item.title}
      </Text>
      {item.message && (
        <Text style={[styles.postMessage, { color: themeColors.textSecondary }]} numberOfLines={3}>
          {item.message}
        </Text>
      )}

      {/* Post Stats */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Ionicons name="heart-outline" size={16} color={themeColors.textSecondary} />
          <Text style={[styles.statText, { color: themeColors.textSecondary }]}>
            {item.likesCount || 0}
          </Text>
        </View>
        <View style={styles.stat}>
          <Ionicons name="chatbubble-outline" size={16} color={themeColors.textSecondary} />
          <Text style={[styles.statText, { color: themeColors.textSecondary }]}>
            {item.commentsCount || 0}
          </Text>
        </View>
        <View style={styles.stat}>
          <Ionicons name="time-outline" size={16} color={themeColors.textSecondary} />
          <Text style={[styles.statText, { color: themeColors.textSecondary }]}>
            {formatTimeAgo(item.createdAt)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (!user?.uid || !userProfile?.isPublicProfile) {
    return (
      <ScreenLayout title="Feed" navigation={navigation} showFooter={true} activeTab="feed">
        <View style={styles.setupContainer}>
          <Ionicons name="people-outline" size={80} color={themeColors.textSecondary} />
          <Text style={[styles.setupTitle, { color: themeColors.textPrimary }]}>
            Set Up Your Profile
          </Text>
          <Text style={[styles.setupText, { color: themeColors.textSecondary }]}>
            Create a public profile to follow other users and see their posts in your feed.
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
    <ScreenLayout title="Feed" navigation={navigation} showFooter={true} activeTab="feed">
      {loading ? (
        <FeedSkeleton count={3} />
      ) : posts.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="newspaper-outline" size={80} color={themeColors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: themeColors.textPrimary }]}>
            Your Feed is Empty
          </Text>
          <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>
            Follow other users to see their posts here. Start by discovering interesting people!
          </Text>
          <TouchableOpacity
            style={[styles.discoverButton, { backgroundColor: primaryColor }]}
            onPress={navigateToDiscover}
            activeOpacity={0.8}
          >
            <Ionicons name="compass" size={20} color="#fff" />
            <Text style={styles.discoverButtonText}>Discover Users</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={posts}
          renderItem={renderPost}
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
    </ScreenLayout>
  );
}

function formatTimeAgo(timestamp) {
  if (!timestamp?.toMillis) return 'Just now';

  const now = Date.now();
  const time = timestamp.toMillis();
  const diff = now - time;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  return `${days}d`;
}

const styles = StyleSheet.create({
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
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  discoverButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  discoverButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  postCard: {
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
  authorInfo: {
    flex: 1,
    gap: 2,
  },
  authorName: {
    fontSize: 15,
    fontWeight: '600',
  },
  authorUsername: {
    fontSize: 13,
  },
  postTitle: {
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 24,
  },
  postMessage: {
    fontSize: 15,
    lineHeight: 22,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 4,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 13,
  },
});
