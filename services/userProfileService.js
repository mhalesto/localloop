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
} from 'firebase/firestore';
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
