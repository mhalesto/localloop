/**
 * User Profile Service
 * Handles user profile CRUD operations in Firestore
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  serverTimestamp,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { Platform } from 'react-native';
import { db } from '../api/firebaseClient';

/**
 * Get user profile by user ID
 */
export async function getUserProfile(userId) {
  try {
    const userRef = doc(db, 'users', userId);
    const snap = await getDoc(userRef);

    if (!snap.exists()) {
      return null;
    }

    return {
      id: snap.id,
      ...snap.data(),
    };
  } catch (error) {
    console.error('[UserProfile] Error getting profile:', error);
    throw error;
  }
}

/**
 * Get user profile by username
 */
export async function getUserProfileByUsername(username) {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('username', '==', username.toLowerCase()), limit(1));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
    };
  } catch (error) {
    console.error('[UserProfile] Error getting profile by username:', error);
    throw error;
  }
}

/**
 * Create or update user profile
 */
export async function updateUserProfile(userId, data) {
  try {
    const userRef = doc(db, 'users', userId);
    const snap = await getDoc(userRef);

    const updateData = {
      ...data,
      updatedAt: serverTimestamp(),
    };

    if (!snap.exists()) {
      // Create new profile
      await setDoc(userRef, {
        ...updateData,
        createdAt: serverTimestamp(),
      });
    } else {
      // Update existing profile
      await updateDoc(userRef, updateData);
    }

    return true;
  } catch (error) {
    console.error('[UserProfile] Error updating profile:', error);
    throw error;
  }
}

/**
 * Increment follower/following counts
 */
export async function incrementFollowerCount(userId, amount = 1) {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      followersCount: increment(amount),
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error('[UserProfile] Error incrementing follower count:', error);
    throw error;
  }
}

export async function incrementFollowingCount(userId, amount = 1) {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      followingCount: increment(amount),
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error('[UserProfile] Error incrementing following count:', error);
    throw error;
  }
}

export async function incrementPublicPostsCount(userId, amount = 1) {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      publicPostsCount: increment(amount),
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error('[UserProfile] Error incrementing posts count:', error);
    throw error;
  }
}

/**
 * Search users by username
 */
export async function searchUsersByUsername(searchTerm, maxResults = 20) {
  try {
    const usersRef = collection(db, 'users');
    const lowerSearch = searchTerm.toLowerCase();

    // Query users where username starts with search term
    const q = query(
      usersRef,
      where('username', '>=', lowerSearch),
      where('username', '<=', lowerSearch + '\uf8ff'),
      where('isPublicProfile', '==', true),
      orderBy('username'),
      limit(maxResults)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('[UserProfile] Error searching users:', error);
    throw error;
  }
}

/**
 * Get trending/suggested users
 */
export async function getTrendingUsers(maxResults = 10) {
  try {
    const usersRef = collection(db, 'users');
    const q = query(
      usersRef,
      where('isPublicProfile', '==', true),
      orderBy('followersCount', 'desc'),
      limit(maxResults)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('[UserProfile] Error getting trending users:', error);
    throw error;
  }
}

/**
 * Get users by location
 */
export async function getUsersByLocation(country, province = null, city = null, maxResults = 20) {
  try {
    const usersRef = collection(db, 'users');
    let q;

    if (city) {
      q = query(
        usersRef,
        where('isPublicProfile', '==', true),
        where('country', '==', country),
        where('province', '==', province),
        where('city', '==', city),
        orderBy('followersCount', 'desc'),
        limit(maxResults)
      );
    } else if (province) {
      q = query(
        usersRef,
        where('isPublicProfile', '==', true),
        where('country', '==', country),
        where('province', '==', province),
        orderBy('followersCount', 'desc'),
        limit(maxResults)
      );
    } else {
      q = query(
        usersRef,
        where('isPublicProfile', '==', true),
        where('country', '==', country),
        orderBy('followersCount', 'desc'),
        limit(maxResults)
      );
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('[UserProfile] Error getting users by location:', error);
    throw error;
  }
}

/**
 * Save push notification token for a user
 * Supports multiple devices by storing tokens in an array
 */
export async function savePushToken(userId, token) {
  if (!userId || !token) {
    console.warn('[UserProfile] Cannot save push token - missing userId or token');
    return false;
  }

  try {
    const userRef = doc(db, 'users', userId);

    // Get current tokens to check if this token already exists
    const snap = await getDoc(userRef);
    const userData = snap.exists() ? snap.data() : {};
    const existingTokens = userData.pushTokens || [];

    // Check if token already exists (by token string, not full object)
    const tokenExists = existingTokens.some(t => t.token === token);

    if (tokenExists) {
      // Update the existing token's timestamp and platform
      const updatedTokens = existingTokens.map(t =>
        t.token === token
          ? { token, platform: Platform.OS, updatedAt: Date.now() }
          : t
      );

      await updateDoc(userRef, {
        pushTokens: updatedTokens,
        lastPushTokenUpdate: serverTimestamp(),
      });

      console.log('[UserProfile] Push token updated successfully');
    } else {
      // Add new token
      const tokenData = {
        token,
        platform: Platform.OS,
        updatedAt: Date.now(),
      };

      await updateDoc(userRef, {
        pushTokens: arrayUnion(tokenData),
        lastPushTokenUpdate: serverTimestamp(),
      });

      console.log('[UserProfile] Push token saved successfully');
    }

    return true;
  } catch (error) {
    console.error('[UserProfile] Error saving push token:', error);
    throw error;
  }
}

/**
 * Remove push notification token for a user
 */
export async function removePushToken(userId, token) {
  if (!userId || !token) {
    console.warn('[UserProfile] Cannot remove push token - missing userId or token');
    return false;
  }

  try {
    const userRef = doc(db, 'users', userId);

    // Get current tokens to find matching one
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      return false;
    }

    const userData = snap.data();
    const pushTokens = userData.pushTokens || [];

    // Find and remove the matching token
    const tokenToRemove = pushTokens.find(t => t.token === token);
    if (tokenToRemove) {
      await updateDoc(userRef, {
        pushTokens: arrayRemove(tokenToRemove),
        lastPushTokenUpdate: serverTimestamp(),
      });
      console.log('[UserProfile] Push token removed successfully');
    }

    return true;
  } catch (error) {
    console.error('[UserProfile] Error removing push token:', error);
    throw error;
  }
}

/**
 * Get all push tokens for a user
 * Used by backend to send push notifications
 */
export async function getUserPushTokens(userId) {
  try {
    const userRef = doc(db, 'users', userId);
    const snap = await getDoc(userRef);

    if (!snap.exists()) {
      return [];
    }

    const userData = snap.data();
    return userData.pushTokens || [];
  } catch (error) {
    console.error('[UserProfile] Error getting push tokens:', error);
    throw error;
  }
}
