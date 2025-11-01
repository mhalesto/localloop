/**
 * Follow Service
 * Handles follow/unfollow operations and follower management
 */

import {
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
  runTransaction,
} from 'firebase/firestore';
import { db } from '../api/firebaseClient';

/**
 * Follow a user
 */
export async function followUser(followerId, followedId) {
  if (followerId === followedId) {
    throw new Error('You cannot follow yourself');
  }

  try {
    await runTransaction(db, async (transaction) => {
      // ALL READS FIRST (Firestore requirement)
      const followedUserRef = doc(db, 'users', followedId);
      const followerUserRef = doc(db, 'users', followerId);

      const followedSnap = await transaction.get(followedUserRef);
      const followerSnap = await transaction.get(followerUserRef);

      // NOW DO ALL WRITES
      // Create follower relationship
      const followerRef = doc(db, 'followers', followedId, 'followers', followerId);
      transaction.set(followerRef, {
        followerId,
        followedAt: serverTimestamp(),
      });

      // Create following relationship
      const followingRef = doc(db, 'following', followerId, 'following', followedId);
      transaction.set(followingRef, {
        followedId,
        followedAt: serverTimestamp(),
      });

      // Increment follower count for followed user
      if (followedSnap.exists()) {
        transaction.update(followedUserRef, {
          followersCount: (followedSnap.data().followersCount || 0) + 1,
        });
      }

      // Increment following count for follower
      if (followerSnap.exists()) {
        transaction.update(followerUserRef, {
          followingCount: (followerSnap.data().followingCount || 0) + 1,
        });
      }
    });

    return true;
  } catch (error) {
    console.error('[Follow] Error following user:', error);
    throw error;
  }
}

/**
 * Unfollow a user
 */
export async function unfollowUser(followerId, followedId) {
  try {
    await runTransaction(db, async (transaction) => {
      // ALL READS FIRST (Firestore requirement)
      const followedUserRef = doc(db, 'users', followedId);
      const followerUserRef = doc(db, 'users', followerId);

      const followedSnap = await transaction.get(followedUserRef);
      const followerSnap = await transaction.get(followerUserRef);

      // NOW DO ALL WRITES
      // Delete follower relationship
      const followerRef = doc(db, 'followers', followedId, 'followers', followerId);
      transaction.delete(followerRef);

      // Delete following relationship
      const followingRef = doc(db, 'following', followerId, 'following', followedId);
      transaction.delete(followingRef);

      // Decrement follower count for followed user
      if (followedSnap.exists()) {
        transaction.update(followedUserRef, {
          followersCount: Math.max((followedSnap.data().followersCount || 0) - 1, 0),
        });
      }

      // Decrement following count for follower
      if (followerSnap.exists()) {
        transaction.update(followerUserRef, {
          followingCount: Math.max((followerSnap.data().followingCount || 0) - 1, 0),
        });
      }
    });

    return true;
  } catch (error) {
    console.error('[Follow] Error unfollowing user:', error);
    throw error;
  }
}

/**
 * Check if user is following another user
 */
export async function isFollowing(followerId, followedId) {
  try {
    const followingRef = doc(db, 'following', followerId, 'following', followedId);
    const snap = await getDoc(followingRef);
    return snap.exists();
  } catch (error) {
    console.error('[Follow] Error checking follow status:', error);
    return false;
  }
}

/**
 * Get user's followers
 */
export async function getFollowers(userId, maxResults = 50) {
  try {
    const followersRef = collection(db, 'followers', userId, 'followers');
    const q = query(followersRef, orderBy('followedAt', 'desc'), limit(maxResults));
    const snapshot = await getDocs(q);

    // Get full user profiles for each follower
    const followerIds = snapshot.docs.map(doc => doc.data().followerId);
    const followers = await Promise.all(
      followerIds.map(async (id) => {
        const userRef = doc(db, 'users', id);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          return {
            id: userSnap.id,
            ...userSnap.data(),
          };
        }
        return null;
      })
    );

    return followers.filter(f => f !== null);
  } catch (error) {
    console.error('[Follow] Error getting followers:', error);
    throw error;
  }
}

/**
 * Get users that a user is following
 */
export async function getFollowing(userId, maxResults = 50) {
  try {
    const followingRef = collection(db, 'following', userId, 'following');
    const q = query(followingRef, orderBy('followedAt', 'desc'), limit(maxResults));
    const snapshot = await getDocs(q);

    // Get full user profiles for each followed user
    const followedIds = snapshot.docs.map(doc => doc.data().followedId);
    const following = await Promise.all(
      followedIds.map(async (id) => {
        const userRef = doc(db, 'users', id);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          return {
            id: userSnap.id,
            ...userSnap.data(),
          };
        }
        return null;
      })
    );

    return following.filter(f => f !== null);
  } catch (error) {
    console.error('[Follow] Error getting following:', error);
    throw error;
  }
}

/**
 * Get mutual follows (users who follow each other)
 */
export async function getMutualFollows(userId, maxResults = 20) {
  try {
    const followers = await getFollowers(userId, maxResults);
    const following = await getFollowing(userId, maxResults);

    const followingIds = new Set(following.map(u => u.id));
    const mutuals = followers.filter(follower => followingIds.has(follower.id));

    return mutuals;
  } catch (error) {
    console.error('[Follow] Error getting mutual follows:', error);
    throw error;
  }
}
