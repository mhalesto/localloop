/**
 * Explore Content Service
 * Fetch filtered content for the Explore screen
 */

import { getFirestore, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { app } from '../api/firebaseConfig';

const db = getFirestore(app);

/**
 * Get posts from current city
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
      posts.push({
        id: doc.id,
        ...data,
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
 * Get statuses from current city
 * @param {string} city - City name
 * @param {number} maxResults - Maximum number of statuses to return
 * @returns {Promise<Array>}
 */
export async function getStatusesFromCity(city, maxResults = 10) {
  try {
    if (!city) return [];

    const statusesQuery = query(
      collection(db, 'statuses'),
      where('city', '==', city),
      limit(maxResults)
    );

    const snapshot = await getDocs(statusesQuery);
    const statuses = [];

    for (const doc of snapshot.docs) {
      const data = doc.data();

      // Get author details
      let authorData = null;
      if (data.authorId) {
        try {
          const userQuery = query(
            collection(db, 'users'),
            where('__name__', '==', data.authorId),
            limit(1)
          );
          const userSnapshot = await getDocs(userQuery);
          if (!userSnapshot.empty) {
            authorData = userSnapshot.docs[0].data();
          }
        } catch (err) {
          console.warn('[exploreContentService] Error fetching author:', err);
        }
      }

      statuses.push({
        id: doc.id,
        ...data,
        author: authorData || {
          username: 'Unknown',
          displayName: 'Unknown User',
        },
      });
    }

    // Sort by createdAt in memory to avoid index requirement
    statuses.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    return statuses;
  } catch (error) {
    console.error('[exploreContentService] Error getting statuses from city:', error);
    return [];
  }
}

/**
 * Get local users from current city
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
