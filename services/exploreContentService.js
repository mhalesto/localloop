/**
 * Explore Content Service
 * Fetch filtered content for the Explore screen
 */

import { getFirestore, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
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
 * @param {number} maxResults - Maximum number of posts to return
 * @returns {Promise<Array>}
 */
export async function getPostsFromAllCities(userCity = null, maxResults = 30) {
  try {
    // Get all recent public posts
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
 * @param {string|null} userCity - Optional user's city for prioritization
 * @param {number} maxResults - Maximum number of artworks to return
 * @returns {Promise<Array>}
 */
export async function getAIArtworkFromAllCities(userCity = null, maxResults = 40) {
  try {
    // Get all users with public profiles who have cartoon pictures
    const usersQuery = query(
      collection(db, 'users'),
      where('isPublicProfile', '==', true),
      limit(maxResults * 3) // Get more users to ensure enough artwork
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
              prompt: cartoon.prompt || null,
              city: data.city, // Include city for sorting
            });
          }
        });
      }
    }

    // Sort: user's city first, then by recency
    artworks.sort((a, b) => {
      if (userCity) {
        const aIsUserCity = a.city === userCity;
        const bIsUserCity = b.city === userCity;

        if (aIsUserCity && !bIsUserCity) return -1;
        if (!aIsUserCity && bIsUserCity) return 1;
      }

      return (b.createdAt || 0) - (a.createdAt || 0);
    });

    return artworks.slice(0, maxResults);
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
 * @param {number} maxResults - Maximum number of users to return
 * @returns {Promise<Array>}
 */
export async function getUsersFromAllCities(userCity = null, currentUserId, maxResults = 30) {
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
