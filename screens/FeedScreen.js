import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  Alert,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenLayout from '../components/ScreenLayout';
import FeedSkeleton from '../components/FeedSkeleton';
import { useSettings, accentPresets } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { usePosts } from '../contexts/PostsContext';
import { getFeedPosts, togglePublicPostVote } from '../services/publicPostsService';
import { getFollowing } from '../services/followService';
import { fetchMarketListingsForCity } from '../services/marketplaceService';
import { fetchPostById } from '../api/postService';
import useHaptics from '../hooks/useHaptics';

const categoryVisuals = {
  Essentials: { icon: 'leaf-outline', color: '#3ab370' },
  'Home & DIY': { icon: 'construct-outline', color: '#7b46ff' },
  Services: { icon: 'people-outline', color: '#ff8a5c' },
  Events: { icon: 'sparkles-outline', color: '#2f80ed' },
  'Free Finds': { icon: 'gift-outline', color: '#56ccf2' },
  Neighbors: { icon: 'hand-left-outline', color: '#f59e0b' }
};

const presetByKey = accentPresets.reduce((acc, preset) => {
  acc[preset.key] = preset;
  return acc;
}, {});

export default function FeedScreen({ navigation }) {
  const { themeColors, accentPreset, userProfile } = useSettings();
  const { user } = useAuth();
  const haptics = useHaptics();
  const { getPostById, getPostsForCity, refreshPosts, addFetchedPost } = usePosts();
  const [rawFeedPosts, setRawFeedPosts] = useState([]);
  const [marketListings, setMarketListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const voteRequestsRef = useRef(new Set());
  const openRequestsRef = useRef(new Set());

  const primaryColor = accentPreset?.buttonBackground || themeColors.primary;

  const enhancePost = useCallback(
    (post) => {
      if (!post) {
        return post;
      }
      const votes = sanitizeVoteMap(post.votes);
      const { upvotes, downvotes } = deriveVoteCounts(votes);
      const userVote = user?.uid ? votes[user.uid] ?? post.userVote ?? null : null;
      return {
        ...post,
        votes,
        upvotes: Number.isFinite(post.upvotes) ? post.upvotes : upvotes,
        downvotes: Number.isFinite(post.downvotes) ? post.downvotes : downvotes,
        userVote,
      };
    },
    [user?.uid]
  );

  const loadFeed = useCallback(async () => {
    if (!user?.uid) {
      setLoading(false);
      setRefreshing(false);
      setRawFeedPosts([]);
      setMarketListings([]);
      return;
    }

    try {
      const following = await getFollowing(user.uid);
      const followingIds = following.map(u => u.id);

      let feedPosts = [];
      if (followingIds.length > 0) {
        feedPosts = await getFeedPosts(followingIds);
      }
      const mappedPosts = feedPosts.map(enhancePost);
      setRawFeedPosts(mappedPosts);

      if (userProfile?.city) {
        const marketListings = await fetchMarketListingsForCity(userProfile.city, { limit: 6 });
        setMarketListings(marketListings);
      } else {
        setMarketListings([]);
      }
    } catch (error) {
      console.error('[Feed] Error loading feed:', error);
      setRawFeedPosts([]);
      setMarketListings([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [enhancePost, user?.uid, userProfile?.city]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const handleRefresh = useCallback(() => {
    haptics.light();
    setRefreshing(true);
    loadFeed();
  }, [loadFeed, haptics]);

  const resolveThreadTarget = useCallback(
    async (post) => {
      if (!post) {
        return null;
      }

      const combos = buildPostTargetCombos(post);
      if (!combos.length) {
        return null;
      }

      const uniqueCities = extractUniqueCities(post, combos);

      const findExisting = () => {
        for (const combo of combos) {
          const existing = getPostById?.(combo.city, combo.postId);
          if (existing) {
            return combo;
          }
        }
        return null;
      };

      let resolved = findExisting();
      if (resolved) {
        return resolved;
      }

      if (typeof refreshPosts === 'function') {
        try {
          await refreshPosts();
          resolved = findExisting();
          if (resolved) {
            return resolved;
          }
        } catch (error) {
          console.warn('[Feed] Failed to refresh posts for thread navigation', error);
        }
      }

      const fuzzyMatch = findPostByContent(uniqueCities, post, getPostsForCity);
      if (fuzzyMatch) {
        return fuzzyMatch;
      }

      return null;
    },
    [getPostById, getPostsForCity, refreshPosts]
  );

  const handleOpenPost = useCallback(
    async (post) => {
      if (!post?.id) {
        Alert.alert('Post unavailable', 'We could not open this post right now.');
        return;
      }

      if (openRequestsRef.current.has(post.id)) {
        return;
      }

      openRequestsRef.current.add(post.id);
      haptics.light();

      // If we have sourceCity/sourcePostId, use those (original post)
      // Otherwise use the post's own data
      const targetCity = post.sourceCity || post.city;
      const targetPostId = post.sourcePostId || post.id;

      if (!targetCity || !targetPostId) {
        openRequestsRef.current.delete(post.id);
        Alert.alert(
          'Post unavailable',
          'We could not locate the original thread for this post. It may have been removed.'
        );
        return;
      }

      // Check if the post exists in cache
      const existingPost = getPostById(targetCity, targetPostId);

      if (existingPost) {
        // Post exists, navigate immediately
        navigation.navigate('PostThread', { city: targetCity, postId: targetPostId });
        openRequestsRef.current.delete(post.id);
        return;
      }

      // Post doesn't exist in cache, fetch it from Firestore
      try {
        console.log('[Feed] Fetching missing post:', targetPostId, 'from city:', targetCity);
        const fetchedPost = await fetchPostById(targetPostId);

        if (fetchedPost) {
          // Add the fetched post to the cache
          const city = fetchedPost.city || fetchedPost.sourceCity || targetCity;
          addFetchedPost(city, { ...fetchedPost, city });
          console.log('[Feed] Successfully fetched and cached post:', targetPostId);

          // Navigate to the post
          navigation.navigate('PostThread', { city, postId: targetPostId });
        } else {
          // Post not found in Firestore
          console.warn('[Feed] Post not found in Firestore:', targetPostId);
          Alert.alert(
            'Post unavailable',
            'This post is no longer available. It may have been removed.'
          );
        }
      } catch (error) {
        console.error('[Feed] Error fetching post:', error);
        Alert.alert(
          'Error',
          'Could not load the post. Please check your connection and try again.'
        );
      } finally {
        openRequestsRef.current.delete(post.id);
      }
    },
    [haptics, navigation, getPostById, addFetchedPost]
  );

  const navigateToProfile = useCallback(
    (userId) => {
      if (!userId) {
        return;
      }
      haptics.light();
      navigation.push('PublicProfile', { userId });
    },
    [haptics, navigation]
  );

  const navigateToDiscover = useCallback(() => {
    haptics.light();
    navigation.navigate('Discover');
  }, [haptics, navigation]);

  const handleMarketPress = useCallback(
    (listing) => {
      if (!listing) {
        return;
      }
      haptics.light();
      const details =
        listing.marketListing?.details ||
        listing.message ||
        'Message the neighbor in the room to coordinate.';
      Alert.alert(listing.title ?? 'Marketplace', details, [
        { text: 'Close', style: 'cancel' },
        {
          text: 'Browse Markets',
          onPress: () => navigation.navigate('LocalLoopMarkets')
        }
      ]);
    },
    [haptics, navigation]
  );

  const feedItems = useMemo(() => {
    const postEntries = rawFeedPosts.map((post) => ({
      kind: 'post',
      id: `post-${post.id}`,
      data: post,
    }));
    const marketEntries = marketListings.map((listing) => ({
      kind: 'market',
      id: `market-${listing.id}`,
      data: listing,
    }));
    return injectMarketplaceItems(postEntries, marketEntries);
  }, [marketListings, rawFeedPosts]);

  const handleVotePress = useCallback(
    async (event, post, direction) => {
      event?.stopPropagation?.();
      if (!post?.id) {
        return;
      }
      if (!user?.uid) {
        Alert.alert('Sign in required', 'Create a public profile to vote on posts.');
        return;
      }
      if (voteRequestsRef.current.has(post.id)) {
        return;
      }

      haptics.light();
      voteRequestsRef.current.add(post.id);
      let previousSnapshot = null;

      setRawFeedPosts((prev) =>
        prev.map((entry) => {
          if (entry.id !== post.id) {
            return entry;
          }

          const baseVotes = sanitizeVoteMap(entry.votes);
          previousSnapshot = {
            ...entry,
            votes: { ...baseVotes },
          };

          const currentVote = baseVotes[user.uid] ?? null;
          let nextVote = currentVote;
          if (direction === 'up') {
            nextVote = currentVote === 'up' ? null : 'up';
          } else if (direction === 'down') {
            nextVote = currentVote === 'down' ? null : 'down';
          }

          const nextVotes = { ...baseVotes };
          if (nextVote) {
            nextVotes[user.uid] = nextVote;
          } else {
            delete nextVotes[user.uid];
          }

          const counts = deriveVoteCounts(nextVotes);
          return {
            ...entry,
            votes: nextVotes,
            upvotes: counts.upvotes,
            downvotes: counts.downvotes,
            userVote: nextVote,
          };
        })
      );

      try {
        const result = await togglePublicPostVote(post.id, user.uid, direction);
        setRawFeedPosts((prev) =>
          prev.map((entry) =>
            entry.id === post.id
              ? {
                  ...entry,
                  votes: sanitizeVoteMap(result.votes),
                  upvotes: result.upvotes,
                  downvotes: result.downvotes,
                  userVote: result.userVote ?? null,
                }
              : entry
          )
        );
      } catch (error) {
        console.error('[Feed] Failed to toggle vote:', error);
        if (previousSnapshot) {
          setRawFeedPosts((prev) =>
            prev.map((entry) => (entry.id === post.id ? enhancePost(previousSnapshot) : entry))
          );
        }
        Alert.alert('Unable to vote', 'Please try again in a moment.');
      } finally {
        voteRequestsRef.current.delete(post.id);
      }
    },
    [enhancePost, haptics, user?.uid]
  );

  const renderPostCard = (post) => {
    if (!post) {
      return null;
    }

    const preset = post.colorKey ? presetByKey[post.colorKey] : null;
    const accentColor =
      preset?.buttonBackground ?? preset?.background ?? primaryColor;
    const locationLabel =
      post.sourceCity ||
      post.city ||
      post.sourceProvince ||
      post.province ||
      null;
    const upActive = post.userVote === 'up';
    const downActive = post.userVote === 'down';

    return (
      <Pressable
        style={[
          styles.postCard,
          {
            backgroundColor: themeColors.card,
            borderColor: `${accentColor}26`,
          },
        ]}
        onPress={() => handleOpenPost(post)}
      >
        <View style={styles.cardHeader}>
          <TouchableOpacity
            style={styles.authorBlock}
            onPress={(event) => {
              event?.stopPropagation?.();
              if (post.authorId) {
                navigateToProfile(post.authorId);
              }
            }}
            activeOpacity={0.75}
          >
            <View
              style={[
                styles.avatarOuter,
                {
                  borderColor: `${accentColor}40`,
                  backgroundColor: `${accentColor}1a`,
                },
              ]}
            >
              {post.authorAvatar ? (
                <Image source={{ uri: post.authorAvatar }} style={styles.avatarImage} />
              ) : (
                <Ionicons name="person" size={20} color={accentColor} />
              )}
            </View>
            <View style={styles.authorText}>
              <Text
                style={[styles.authorName, { color: themeColors.textPrimary }]}
                numberOfLines={1}
              >
                {post.authorDisplayName || post.authorUsername || 'Unknown'}
              </Text>
              {post.authorUsername ? (
                <Text
                  style={[styles.authorHandle, { color: themeColors.textSecondary }]}
                  numberOfLines={1}
                >
                  @{post.authorUsername}
                </Text>
              ) : null}
            </View>
          </TouchableOpacity>

          <View style={styles.cardMeta}>
            {locationLabel ? (
              <View style={[styles.metaChip, { backgroundColor: `${accentColor}1a` }]}>
                <Ionicons name="location-outline" size={12} color={accentColor} />
                <Text
                  style={[styles.metaChipText, { color: accentColor }]}
                  numberOfLines={1}
                >
                  {locationLabel}
                </Text>
              </View>
            ) : null}
            <Text style={[styles.timeText, { color: themeColors.textSecondary }]}>
              {formatTimeAgo(post.createdAt)}
            </Text>
          </View>
        </View>

        <View style={styles.postBody}>
          <Text
            style={[styles.postTitle, { color: themeColors.textPrimary }]}
            numberOfLines={2}
          >
            {post.title?.trim?.() || post.message?.trim?.() || 'Untitled post'}
          </Text>
          {post.message ? (
            <Text
              style={[styles.postMessage, { color: themeColors.textSecondary }]}
              numberOfLines={3}
            >
              {post.message}
            </Text>
          ) : null}
        </View>

        <View style={styles.postFooter}>
          <View style={styles.voteGroup}>
            <TouchableOpacity
              style={[
                styles.voteButton,
                upActive && { backgroundColor: `${accentColor}1f` },
              ]}
              onPress={(event) => handleVotePress(event, post, 'up')}
              activeOpacity={0.7}
            >
              <Ionicons
                name={upActive ? 'arrow-up-circle' : 'arrow-up-circle-outline'}
                size={20}
                color={upActive ? accentColor : themeColors.textSecondary}
              />
              <Text
                style={[
                  styles.voteCount,
                  { color: upActive ? accentColor : themeColors.textPrimary },
                ]}
              >
                {post.upvotes ?? 0}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.voteButton,
                downActive && { backgroundColor: `${accentColor}1f` },
              ]}
              onPress={(event) => handleVotePress(event, post, 'down')}
              activeOpacity={0.7}
            >
              <Ionicons
                name={downActive ? 'arrow-down-circle' : 'arrow-down-circle-outline'}
                size={20}
                color={downActive ? accentColor : themeColors.textSecondary}
              />
              <Text
                style={[
                  styles.voteCount,
                  { color: downActive ? accentColor : themeColors.textPrimary },
                ]}
              >
                {post.downvotes ?? 0}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footerSpacer} />

          <View style={styles.metaStat}>
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={18}
              color={themeColors.textSecondary}
            />
            <Text
              style={[styles.metaStatText, { color: themeColors.textSecondary }]}
            >
              {post.commentsCount ?? 0}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  };

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

function buildPostTargetCombos(post) {
  if (!post) {
    return [];
  }

  const combos = [];
  const seen = new Set();

  const pushCombo = (city, postId) => {
    if (!city || !postId) {
      return;
    }
    const key = `${city}::${postId}`;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    combos.push({ city, postId });
  };

  const cityCandidates = [
    post.sourceCity,
    post.city,
    post.sharedFrom?.city,
    post.author?.city,
    post.marketListing?.city,
  ].filter(Boolean);

  const idCandidates = [
    post.sourcePostId,
    post.postId,
    post.threadId,
    post.originalPostId,
    post.basePostId,
    post.sharedFrom?.postId,
    post.rootPostId,
    post.primaryPostId,
    post.id,
  ].filter(Boolean);

  if (!idCandidates.length && post.publicPostId) {
    idCandidates.push(post.publicPostId);
  }

  cityCandidates.forEach((city) => {
    idCandidates.forEach((postId) => {
      pushCombo(city, postId);
    });
  });

  // If we somehow did not include the default mapping, push fallback
  if (!combos.length && post.city && post.id) {
    pushCombo(post.city, post.id);
  }

  return combos;
}

function extractUniqueCities(post, combos) {
  const cities = new Set();
  if (combos?.length) {
    combos.forEach((combo) => {
      if (combo.city) {
        cities.add(combo.city);
      }
    });
  }
  if (post?.sourceCity) {
    cities.add(post.sourceCity);
  }
  if (post?.city) {
    cities.add(post.city);
  }
  if (post?.sharedFrom?.city) {
    cities.add(post.sharedFrom.city);
  }
  if (post?.author?.city) {
    cities.add(post.author.city);
  }
  return Array.from(cities);
}

function findPostByContent(cities, post, getPostsForCity) {
  if (!Array.isArray(cities) || !post || typeof getPostsForCity !== 'function') {
    return null;
  }

  const normalizedTitle = normalizeText(post.title);
  const normalizedMessage = normalizeText(post.message);
  const targetAuthorId =
    post.authorId ||
    post.author?.uid ||
    post.author?.id ||
    (typeof post.author === 'string' ? post.author : null);
  const referenceCreatedAt = resolveTimestampValue(post.createdAt) || post.createdAtMs || 0;

  for (const city of cities) {
    if (!city) {
      continue;
    }
    const localPosts = getPostsForCity(city) ?? [];
    if (!Array.isArray(localPosts) || !localPosts.length) {
      continue;
    }

    let fallbackMatch = null;

    for (const candidate of localPosts) {
      if (!candidate) {
        continue;
      }
      const candidateTitle = normalizeText(candidate.title);
      const candidateMessage = normalizeText(candidate.message);
      const candidateAuthorId =
        candidate.author?.uid ||
        candidate.author?.id ||
        candidate.authorId ||
        null;
      const candidateCreatedAt = Number(candidate.createdAt ?? 0);

      const titleMatches = Boolean(normalizedTitle && candidateTitle === normalizedTitle);
      const messageMatches = Boolean(normalizedMessage && candidateMessage === normalizedMessage);
      const authorMatches = Boolean(targetAuthorId && candidateAuthorId === targetAuthorId);
      const timeDelta =
        referenceCreatedAt && candidateCreatedAt
          ? Math.abs(candidateCreatedAt - referenceCreatedAt)
          : null;
      const timeAligned = timeDelta != null && timeDelta <= 10 * 60 * 1000; // within 10 minutes

      if ((titleMatches && authorMatches) || (messageMatches && authorMatches)) {
        return { city, postId: candidate.id };
      }

      if (titleMatches && timeAligned) {
        return { city, postId: candidate.id };
      }

      if (titleMatches && messageMatches && !fallbackMatch) {
        fallbackMatch = { city, postId: candidate.id };
      }
    }

    if (fallbackMatch) {
      return fallbackMatch;
    }
  }

  return null;
}

function normalizeText(value) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim().toLowerCase();
}

function resolveTimestampValue(value) {
  if (value == null) {
    return 0;
  }
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'object') {
    if (typeof value.toMillis === 'function') {
      return value.toMillis();
    }
    if (typeof value.seconds === 'number') {
      return value.seconds * 1000;
    }
  }
  return 0;
}

function sanitizeVoteMap(rawVotes) {
  if (!rawVotes || typeof rawVotes !== 'object' || Array.isArray(rawVotes)) {
    return {};
  }
  const result = {};
  Object.entries(rawVotes).forEach(([key, value]) => {
    if (!key) {
      return;
    }
    if (value === 'up' || value === 'down') {
      result[key] = value;
    }
  });
  return result;
}

function deriveVoteCounts(votes) {
  const entries = Object.values(votes ?? {});
  let upvotes = 0;
  let downvotes = 0;
  entries.forEach((value) => {
    if (value === 'up') {
      upvotes += 1;
    } else if (value === 'down') {
      downvotes += 1;
    }
  });
  return { upvotes, downvotes };
}

function hashString(value) {
  if (typeof value !== 'string' || value.length === 0) {
    return 0;
  }
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % 9973;
  }
  return hash;
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
    const hash = hashString(item.id ?? `${index}`);
    const shouldInsert = ((index + 1) % 3 === 0) && ((hash % 100) < 25);
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 18,
  },
  postCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 18,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
  },
  authorBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatarOuter: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  authorText: {
    flex: 1,
    gap: 2,
  },
  authorName: {
    fontSize: 16,
    fontWeight: '700',
  },
  authorHandle: {
    fontSize: 13,
  },
  cardMeta: {
    alignItems: 'flex-end',
    gap: 6,
    minWidth: 80,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  metaChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  timeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  postBody: {
    gap: 10,
  },
  postTitle: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 26,
  },
  postMessage: {
    fontSize: 15,
    lineHeight: 22,
  },
  postFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  voteGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  voteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  voteCount: {
    fontSize: 15,
    fontWeight: '600',
  },
  footerSpacer: {
    flex: 1,
  },
  metaStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaStatText: {
    fontSize: 13,
    fontWeight: '500',
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
