/**
 * Explore Content Service
 * Fetch filtered content for the Explore screen
 */

import { getFirestore, collection, query, where, orderBy, limit, getDocs, startAfter } from 'firebase/firestore';
import { app } from '../api/firebaseConfig';

const db = getFirestore(app);

/**
 * Normalize Firebase Timestamp to milliseconds
 */
const normalizeTimestamp = (value) => {
  if (!value) return Date.now();
  if (typeof value === 'number') return value;
  if (typeof value === 'object') {
    if (typeof value.toMillis === 'function') return value.toMillis();
    if (typeof value.seconds === 'number') return value.seconds * 1000;
  }
  return Date.now();
};

/**
 * Get posts from all cities (global feed)
 * If userCity is provided, prioritizes posts from that city first
 * @param {string|null} userCity - Optional user's city for prioritization
 * @param {number} maxResults - Maximum number of posts to return (default: 100 for better UX)
 * @returns {Promise<Array>}
 */
export async function getPostsFromAllCities(userCity = null, maxResults = 100) {
  try {
    // Get a large batch of recent posts for good content discovery
    const postsQuery = query(
      collection(db, 'publicPosts'),
      limit(maxResults * 2) // Get more to allow for prioritization
    );

    const snapshot = await getDocs(postsQuery);
    const posts = [];

    for (const doc of snapshot.docs) {
      const data = doc.data();

      posts.push({
        id: doc.id,
        postId: doc.id,
        ...data,
        createdAt: normalizeTimestamp(data.createdAt),
        updatedAt: data.updatedAt ? normalizeTimestamp(data.updatedAt) : null,
        author: data.author || {
          uid: data.authorId,
          username: data.authorUsername || 'Unknown',
          displayName: data.authorDisplayName || 'Unknown User',
        },
      });
    }

    // Sort: user's city first, then by recency
    posts.sort((a, b) => {
      if (userCity) {
        const aIsUserCity = a.city === userCity;
        const bIsUserCity = b.city === userCity;

        if (aIsUserCity && !bIsUserCity) return -1;
        if (!aIsUserCity && bIsUserCity) return 1;
      }

      return (b.createdAt || 0) - (a.createdAt || 0);
    });

    return posts.slice(0, maxResults);
  } catch (error) {
    console.error('[exploreContentService] Error getting posts from all cities:', error);
    return [];
  }
}

/**
 * Get posts from current city (legacy function - kept for compatibility)
 * @param {string} city - City name
 * @param {number} maxResults - Maximum number of posts to return
 * @returns {Promise<Array>}
 */
export async function getPostsFromCity(city, maxResults = 10) {
  try {
    if (!city) return [];

    const postsQuery = query(
      collection(db, 'publicPosts'),
      where('city', '==', city),
      limit(maxResults)
    );

    const snapshot = await getDocs(postsQuery);
    const posts = [];

    for (const doc of snapshot.docs) {
      const data = doc.data();

      // Ensure we have all post data including author info
      posts.push({
        id: doc.id,
        postId: doc.id, // Some screens use postId
        ...data,
        // Normalize timestamp to milliseconds
        createdAt: normalizeTimestamp(data.createdAt),
        updatedAt: data.updatedAt ? normalizeTimestamp(data.updatedAt) : null,
        // Ensure author object exists
        author: data.author || {
          uid: data.authorId,
          username: data.authorUsername || 'Unknown',
          displayName: data.authorDisplayName || 'Unknown User',
        },
      });
    }

    // Sort by createdAt in memory to avoid index requirement
    posts.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    return posts;
  } catch (error) {
    console.error('[exploreContentService] Error getting posts from city:', error);
    return [];
  }
}

/**
 * Get AI artwork from all cities (global feed)
 * If userCity is provided, prioritizes artwork from that city first
 * Includes both individual artworks and Story Teller collections
 * @param {string|null} userCity - Optional user's city for prioritization
 * @param {number} maxResults - Maximum number of artworks to return (default: 120 for better UX)
 * @returns {Promise<Array>}
 */
export async function getAIArtworkFromAllCities(userCity = null, maxResults = 120) {
  try {
    const allItems = [];

    // First, get Story Teller collections from cartoonStories collection
    try {
      console.log('[exploreContentService] 🔍 Fetching Story Teller collections...');

      const storiesQuery = query(
        collection(db, 'cartoonStories'),
        limit(50) // Get recent story collections
      );

      const storiesSnapshot = await getDocs(storiesQuery);
      console.log('[exploreContentService] 📚 Found', storiesSnapshot.size, 'documents in cartoonStories collection');

      for (const doc of storiesSnapshot.docs) {
        const data = doc.data();
        console.log('[exploreContentService] 🧵 Story document', doc.id, 'raw images:', data.images);

        console.log('[exploreContentService] 📄 Processing story:', {
          docId: doc.id,
          hasImages: !!data.images,
          isArray: Array.isArray(data.images),
          imageCount: data.images ? data.images.length : 0,
          type: data.type,
          userId: data.userId
        });

        // Only include stories with multiple images
        if (data.images && Array.isArray(data.images) && data.images.length > 1) {
          console.log('[exploreContentService] ✅ Story qualifies for display:', {
            id: doc.id,
            imageCount: data.images.length,
            images: data.images.map((img, idx) => ({
              index: idx,
              hasUrl: !!img.url,
              id: img.id
            }))
          });
          // Get user info for the story
          let userInfo = {
            username: 'Unknown',
            displayName: 'Unknown User',
            profilePhoto: null,
            city: null
          };

          try {
            const userDoc = await getDocs(query(
              collection(db, 'users'),
              where('__name__', '==', data.userId),
              limit(1)
            ));

            if (!userDoc.empty) {
              const userData = userDoc.docs[0].data();
              userInfo = {
                username: userData.username,
                displayName: userData.displayName,
                profilePhoto: userData.profilePhoto,
                city: userData.city
              };
            }
          } catch (userError) {
            console.warn('[exploreContentService] Could not fetch user info for story:', userError);
          }

          // Format timestamp for display
          const timestamp = normalizeTimestamp(data.createdAt);
          const date = new Date(timestamp);
          const now = new Date();
          const diffMs = now - date;
          const diffMins = Math.floor(diffMs / 60000);
          const diffHours = Math.floor(diffMs / 3600000);
          const diffDays = Math.floor(diffMs / 86400000);

          let formattedTime;
          if (diffMins < 1) {
            formattedTime = 'just now';
          } else if (diffMins < 60) {
            formattedTime = `${diffMins}m ago`;
          } else if (diffHours < 24) {
            formattedTime = `${diffHours}h ago`;
          } else if (diffDays < 7) {
            formattedTime = `${diffDays}d ago`;
          } else {
            formattedTime = date.toLocaleDateString();
          }

          allItems.push({
            id: doc.id,
            type: 'story',
            images: data.images,
            style: data.style || 'Story',
            title: data.style || 'Story Collection',
            createdAt: timestamp,
            createdAtFormatted: formattedTime, // Add formatted time for display
            userId: data.userId,
            username: userInfo.username,
            displayName: userInfo.displayName,
            profilePhoto: userInfo.profilePhoto,
            prompt: data.prompt || null,
            city: userInfo.city,
            likes: data.likes || 0,
            comments: data.comments || 0,
          });
        }
      }
    } catch (storiesError) {
      console.warn('[exploreContentService] ❌ Could not fetch story collections:', storiesError);
      // Continue even if stories fail
    }

    // Log summary of story collections found
    const storyCollections = allItems.filter(item => item.type === 'story');
    console.log('[exploreContentService] 📊 Story collection summary:', {
      totalStoryCollections: storyCollections.length,
      storyDetails: storyCollections.map(s => ({
        id: s.id,
        imageCount: s.images ? s.images.length : 0,
        style: s.style
      }))
    });

    // Create a Set of all image URLs that are part of Story collections
    // to avoid showing them as individual images (prevent duplicates)
    const storyImageUrls = new Set();
    storyCollections.forEach(story => {
      if (story.images && Array.isArray(story.images)) {
        story.images.forEach(img => {
          if (img.url) {
            storyImageUrls.add(img.url);
          }
        });
      }
    });

    console.log('[exploreContentService] 🚫 Excluding', storyImageUrls.size, 'story images from individual display');

    // Get all users with public profiles who have cartoon pictures
    const usersQuery = query(
      collection(db, 'users'),
      where('isPublicProfile', '==', true),
      limit(maxResults * 3) // Get more users to ensure enough artwork
    );

    const snapshot = await getDocs(usersQuery);

    for (const doc of snapshot.docs) {
      const data = doc.data();

      // Check if user has cartoon picture history
      if (data.cartoonPictureHistory && Array.isArray(data.cartoonPictureHistory)) {
        data.cartoonPictureHistory.forEach((cartoon) => {
          // Only add if the image URL is NOT part of a Story collection
          if (cartoon.url && !storyImageUrls.has(cartoon.url)) {
            allItems.push({
              id: cartoon.id || `${doc.id}-${cartoon.createdAt}`,
              url: cartoon.url,
              style: cartoon.style || 'Unknown',
              createdAt: normalizeTimestamp(cartoon.createdAt),
              userId: doc.id,
              username: data.username,
              displayName: data.displayName,
              profilePhoto: data.profilePhoto,
              prompt: cartoon.prompt || null,
              city: data.city, // Include city for sorting
            });
          }
        });
      }
    }

    // Sort: user's city first, then by recency
    allItems.sort((a, b) => {
      if (userCity) {
        const aIsUserCity = a.city === userCity;
        const bIsUserCity = b.city === userCity;

        if (aIsUserCity && !bIsUserCity) return -1;
        if (!aIsUserCity && bIsUserCity) return 1;
      }

      return (b.createdAt || 0) - (a.createdAt || 0);
    });

    return allItems.slice(0, maxResults);
  } catch (error) {
    console.error('[exploreContentService] Error getting AI artwork from all cities:', error);
    return [];
  }
}

/**
 * Get AI artwork (cartoon profile pictures) from current city (legacy - kept for compatibility)
 * @param {string} city - City name
 * @param {number} maxResults - Maximum number of artworks to return
 * @returns {Promise<Array>}
 */
export async function getAIArtworkFromCity(city, maxResults = 20) {
  try {
    if (!city) return [];

    // Get users from the city who have cartoon pictures
    const usersQuery = query(
      collection(db, 'users'),
      where('city', '==', city),
      where('isPublicProfile', '==', true),
      limit(maxResults * 2) // Get more users to filter for artwork
    );

    const snapshot = await getDocs(usersQuery);
    const artworks = [];

    for (const doc of snapshot.docs) {
      const data = doc.data();

      // Check if user has cartoon picture history
      if (data.cartoonPictureHistory && Array.isArray(data.cartoonPictureHistory)) {
        data.cartoonPictureHistory.forEach((cartoon) => {
          if (cartoon.url) {
            artworks.push({
              id: cartoon.id || `${doc.id}-${cartoon.createdAt}`,
              url: cartoon.url,
              style: cartoon.style || 'Unknown',
              createdAt: normalizeTimestamp(cartoon.createdAt),
              userId: doc.id,
              username: data.username,
              displayName: data.displayName,
              profilePhoto: data.profilePhoto,
              prompt: cartoon.prompt || null, // Include prompt if available
            });
          }
        });
      }
    }

    // Sort by createdAt in memory (newest first)
    artworks.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    // Limit to maxResults
    return artworks.slice(0, maxResults);
  } catch (error) {
    console.error('[exploreContentService] Error getting AI artwork from city:', error);
    return [];
  }
}

/**
 * Get users from all cities (global feed)
 * If userCity is provided, prioritizes users from that city first
 * @param {string|null} userCity - Optional user's city for prioritization
 * @param {string} currentUserId - Current user ID to exclude
 * @param {number} maxResults - Maximum number of users to return (default: 100 for better UX)
 * @returns {Promise<Array>}
 */
export async function getUsersFromAllCities(userCity = null, currentUserId, maxResults = 100) {
  try {
    const usersQuery = query(
      collection(db, 'users'),
      where('isPublicProfile', '==', true),
      limit(maxResults * 2) // Get more for filtering
    );

    const snapshot = await getDocs(usersQuery);
    const users = [];

    for (const doc of snapshot.docs) {
      // Exclude current user
      if (doc.id === currentUserId) continue;

      const data = doc.data();
      users.push({
        uid: doc.id,
        username: data.username,
        displayName: data.displayName,
        profilePhoto: data.profilePhoto,
        bio: data.bio,
        city: data.city,
        province: data.province,
        country: data.country,
        followersCount: data.followersCount || 0,
      });
    }

    // Sort: user's city first, then by followers count
    users.sort((a, b) => {
      if (userCity) {
        const aIsUserCity = a.city === userCity;
        const bIsUserCity = b.city === userCity;

        if (aIsUserCity && !bIsUserCity) return -1;
        if (!aIsUserCity && bIsUserCity) return 1;
      }

      // Secondary sort by followers
      return (b.followersCount || 0) - (a.followersCount || 0);
    });

    return users.slice(0, maxResults);
  } catch (error) {
    console.error('[exploreContentService] Error getting users from all cities:', error);
    return [];
  }
}

/**
 * Get local users from current city (legacy - kept for compatibility)
 * @param {string} city - City name
 * @param {string} currentUserId - Current user ID to exclude
 * @param {number} maxResults - Maximum number of users to return
 * @returns {Promise<Array>}
 */
export async function getLocalUsers(city, currentUserId, maxResults = 20) {
  try {
    if (!city) return [];

    const usersQuery = query(
      collection(db, 'users'),
      where('city', '==', city),
      where('isPublicProfile', '==', true),
      limit(maxResults + 1) // +1 to account for current user
    );

    const snapshot = await getDocs(usersQuery);
    const users = [];

    for (const doc of snapshot.docs) {
      // Exclude current user
      if (doc.id === currentUserId) continue;

      const data = doc.data();
      users.push({
        uid: doc.id,
        username: data.username,
        displayName: data.displayName,
        profilePhoto: data.profilePhoto,
        bio: data.bio,
        city: data.city,
        province: data.province,
        country: data.country,
        followersCount: data.followersCount || 0,
      });
    }

    return users.slice(0, maxResults);
  } catch (error) {
    console.error('[exploreContentService] Error getting local users:', error);
    return [];
  }
}
