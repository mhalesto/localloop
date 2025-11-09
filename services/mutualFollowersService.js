/**
 * Mutual Followers Service
 * Find users who follow both the current user and the profile being viewed
 */

import { getFirestore, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { app } from '../api/firebaseConfig';

const db = getFirestore(app);

/**
 * Get mutual followers between current user and profile user
 * @param {string} currentUserId - The logged-in user's ID
 * @param {string} profileUserId - The profile being viewed
 * @param {number} maxResults - Maximum number of mutual followers to return
 * @returns {Promise<{mutualFollowers: Array, totalCount: number}>}
 */
export async function getMutualFollowers(currentUserId, profileUserId, maxResults = 3) {
  try {
    // Don't show mutual followers on own profile
    if (currentUserId === profileUserId) {
      return { mutualFollowers: [], totalCount: 0 };
    }

    // Get users that the current user follows
    const currentUserFollowingQuery = query(
      collection(db, 'follows'),
      where('followerId', '==', currentUserId),
      where('status', '==', 'active')
    );

    const currentUserFollowingSnapshot = await getDocs(currentUserFollowingQuery);
    const currentUserFollowingIds = currentUserFollowingSnapshot.docs.map(
      (doc) => doc.data().followingId
    );

    if (currentUserFollowingIds.length === 0) {
      return { mutualFollowers: [], totalCount: 0 };
    }

    // Get users that follow the profile user
    const profileFollowersQuery = query(
      collection(db, 'follows'),
      where('followingId', '==', profileUserId),
      where('status', '==', 'active')
    );

    const profileFollowersSnapshot = await getDocs(profileFollowersQuery);
    const profileFollowerIds = profileFollowersSnapshot.docs.map(
      (doc) => doc.data().followerId
    );

    // Find intersection (mutual followers)
    const mutualFollowerIds = currentUserFollowingIds.filter((id) =>
      profileFollowerIds.includes(id)
    );

    if (mutualFollowerIds.length === 0) {
      return { mutualFollowers: [], totalCount: 0 };
    }

    // Get user details for the first N mutual followers
    const mutualFollowers = [];
    const idsToFetch = mutualFollowerIds.slice(0, maxResults);

    for (const userId of idsToFetch) {
      try {
        const userDoc = await getDocs(
          query(collection(db, 'users'), where('__name__', '==', userId), limit(1))
        );

        if (!userDoc.empty) {
          const userData = userDoc.docs[0].data();
          mutualFollowers.push({
            uid: userId,
            username: userData.username,
            displayName: userData.displayName,
            profilePhoto: userData.profilePhoto,
          });
        }
      } catch (error) {
        console.warn('[mutualFollowersService] Error fetching user:', userId, error);
      }
    }

    return {
      mutualFollowers,
      totalCount: mutualFollowerIds.length,
    };
  } catch (error) {
    console.error('[mutualFollowersService] Error getting mutual followers:', error);
    return { mutualFollowers: [], totalCount: 0 };
  }
}

/**
 * Get count of local connections (users in same city)
 * @param {string} userId - User ID
 * @param {string} city - City name
 * @returns {Promise<number>}
 */
export async function getLocalConnectionsCount(userId, city) {
  try {
    if (!city) return 0;

    const localUsersQuery = query(
      collection(db, 'users'),
      where('city', '==', city),
      where('isPublicProfile', '==', true)
    );

    const snapshot = await getDocs(localUsersQuery);

    // Exclude the current user
    const count = snapshot.docs.filter((doc) => doc.id !== userId).length;

    return count;
  } catch (error) {
    console.error('[mutualFollowersService] Error getting local connections:', error);
    return 0;
  }
}
