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
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenLayout from '../components/ScreenLayout';
import FeedSkeleton from '../components/FeedSkeleton';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { getFeedPosts } from '../services/publicPostsService';
import { getFollowing } from '../services/followService';
import { fetchMarketListingsForCity } from '../services/marketplaceService';
import useHaptics from '../hooks/useHaptics';

const categoryVisuals = {
  Essentials: { icon: 'leaf-outline', color: '#3ab370' },
  'Home & DIY': { icon: 'construct-outline', color: '#7b46ff' },
  Services: { icon: 'people-outline', color: '#ff8a5c' },
  Events: { icon: 'sparkles-outline', color: '#2f80ed' },
  'Free Finds': { icon: 'gift-outline', color: '#56ccf2' },
  Neighbors: { icon: 'hand-left-outline', color: '#f59e0b' }
};

export default function FeedScreen({ navigation }) {
  const { themeColors, accentPreset, userProfile } = useSettings();
  const { user } = useAuth();
  const haptics = useHaptics();
  const [feedItems, setFeedItems] = useState([]);
  const [rawFeedPosts, setRawFeedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const primaryColor = accentPreset?.buttonBackground || themeColors.primary;

  const loadFeed = useCallback(async () => {
    if (!user?.uid) {
      setLoading(false);
      setRefreshing(false);
      setFeedItems([]);
      setRawFeedPosts([]);
      return;
    }

    try {
      const following = await getFollowing(user.uid);
      const followingIds = following.map(u => u.id);

      let feedPosts = [];
      if (followingIds.length > 0) {
        feedPosts = await getFeedPosts(followingIds);
      }
      setRawFeedPosts(feedPosts);

      let combinedItems = feedPosts.map((post) => ({
        kind: 'post',
        id: `post-${post.id}`,
        data: post
      }));

      if (userProfile?.city) {
        const marketListings = await fetchMarketListingsForCity(userProfile.city, { limit: 6 });
        const marketItems = marketListings.map((listing) => ({
          kind: 'market',
          id: `market-${listing.id}`,
          data: listing
        }));
        combinedItems = injectMarketplaceItems(combinedItems, marketItems);
      }

      setFeedItems(combinedItems);
    } catch (error) {
      console.error('[Feed] Error loading feed:', error);
      setFeedItems([]);
      setRawFeedPosts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.uid, userProfile?.city]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const handleRefresh = useCallback(() => {
    haptics.light();
    setRefreshing(true);
    loadFeed();
  }, [loadFeed, haptics]);

  const navigateToPost = (post) => {
    haptics.light();
    // Navigate to post detail (you can create a PostDetailScreen later)
    console.log('Navigate to post:', post.id);
  };

  const navigateToProfile = (userId) => {
    haptics.light();
    navigation.push('PublicProfile', { userId });
  };

  const navigateToDiscover = () => {
    haptics.light();
    navigation.navigate('Discover');
  };

  const handleMarketPress = (listing) => {
    haptics.light();
    const details = listing.marketListing?.details || listing.message || 'Message the neighbor in the room to coordinate.';
    Alert.alert(listing.title, details, [
      { text: 'Close', style: 'cancel' },
      {
        text: 'Browse Markets',
        onPress: () => navigation.navigate('LocalLoopMarkets')
      }
    ]);
  };

  const renderPostCard = (item) => (
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

  const renderMarketPlacement = (listing) => {
    const meta = listing.marketListing || {};
    const visuals = categoryVisuals[meta.category] || { icon: 'bag-handle-outline', color: primaryColor };
    const isBoosted = (meta.boostedUntil ?? 0) > Date.now();

    return (
      <TouchableOpacity
        style={[styles.marketCard, { backgroundColor: themeColors.card }]}
        onPress={() => handleMarketPress(listing)}
        activeOpacity={0.85}
      >
        <View style={styles.marketHeader}>
          <View style={[styles.marketIcon, { backgroundColor: `${visuals.color}22` }] }>
            <Ionicons name={visuals.icon} size={18} color={visuals.color} />
          </View>
          <Text style={[styles.marketTitle, { color: themeColors.textPrimary }]} numberOfLines={2}>
            {listing.title}
          </Text>
        </View>
        <Text style={[styles.marketPrice, { color: themeColors.textPrimary }]}>{meta.price || 'Negotiable'}</Text>
        <Text style={[styles.marketLocation, { color: themeColors.textSecondary }]}>
          {meta.location || listing.city}
        </Text>
        <View style={styles.marketFooter}>
          <View style={[styles.marketBadge, { backgroundColor: `${visuals.color}1f` }] }>
            <Text style={[styles.marketBadgeText, { color: visuals.color }] }>
              {meta.intent === 'request' ? 'Request' : 'Marketplace'}
            </Text>
          </View>
          <View style={styles.marketMetaRow}>
            {isBoosted ? (
              <View style={styles.marketMetaItem}>
                <Ionicons name="rocket-outline" size={14} color="#facc15" />
                <Text style={[styles.marketMetaText, { color: '#facc15' }]}>Boosted</Text>
              </View>
            ) : null}
            <View style={styles.marketMetaItem}>
              <Ionicons name="time-outline" size={14} color={themeColors.textSecondary} />
              <Text style={[styles.marketMetaText, { color: themeColors.textSecondary }]}>
                {formatTimeAgo(listing.createdAt)}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFeedItem = ({ item }) => {
    if (item.kind === 'market') {
      return renderMarketPlacement(item.data);
    }
    return renderPostCard(item.data);
  };

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
      ) : rawFeedPosts.length === 0 ? (
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
          data={feedItems}
          renderItem={renderFeedItem}
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

function injectMarketplaceItems(postItems, marketItems) {
  if (!marketItems.length) return postItems;
  const queue = [...marketItems];
  const result = [];

  postItems.forEach((item, index) => {
    result.push(item);
    if (!queue.length) {
      return;
    }
    const shouldInsert = Math.random() < 0.25 && ((index + 1) % 3 === 0);
    if (shouldInsert) {
      result.push(queue.shift());
    }
  });

  if (queue.length) {
    const insertIndex = Math.min(2, result.length);
    result.splice(insertIndex, 0, queue.shift());
  }

  if (queue.length) {
    result.push(queue.shift());
  }

  return result;
}

function formatTimeAgo(timestamp) {
  if (timestamp == null) return 'Just now';

  let time;
  if (typeof timestamp === 'number') {
    time = timestamp;
  } else if (timestamp.toMillis) {
    time = timestamp.toMillis();
  } else if (typeof timestamp === 'object' && typeof timestamp.seconds === 'number') {
    time = timestamp.seconds * 1000;
  } else {
    return 'Just now';
  }

  const now = Date.now();
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
  marketCard: {
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  marketHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  marketIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  marketTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  marketPrice: {
    fontSize: 15,
    fontWeight: '700',
  },
  marketLocation: {
    fontSize: 13,
    lineHeight: 18,
  },
  marketFooter: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  marketBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  marketBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  marketMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  marketMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  marketMetaText: {
    fontSize: 12,
  },
});
