/**
 * Public Posts Service
 * Handles public posts from users (non-anonymous posts)
 */

import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  increment,
} from 'firebase/firestore';
import { db } from '../api/firebaseClient';

/**
 * Create a public post
 */
export async function createPublicPost(authorId, postData) {
  try {
    const postsRef = collection(db, 'publicPosts');
    const postRef = doc(postsRef);

    const post = {
      ...postData,
      authorId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      likesCount: 0,
      commentsCount: 0,
    };

    await setDoc(postRef, post);

    // Increment user's public posts count
    const userRef = doc(db, 'users', authorId);
    await updateDoc(userRef, {
      publicPostsCount: increment(1),
    });

    return postRef.id;
  } catch (error) {
    console.error('[PublicPosts] Error creating post:', error);
    throw error;
  }
}

/**
 * Get feed posts (from users you follow)
 */
export async function getFeedPosts(followingUserIds, maxResults = 20) {
  if (!followingUserIds || followingUserIds.length === 0) {
    return [];
  }

  try {
    const postsRef = collection(db, 'publicPosts');

    // Firestore 'in' query has a limit of 10 items
    const batches = [];
    for (let i = 0; i < followingUserIds.length; i += 10) {
      const batch = followingUserIds.slice(i, i + 10);
      const q = query(
        postsRef,
        where('authorId', 'in', batch),
        orderBy('createdAt', 'desc'),
        limit(maxResults)
      );
      batches.push(getDocs(q));
    }

    const snapshots = await Promise.all(batches);
    const posts = [];

    snapshots.forEach(snapshot => {
      snapshot.docs.forEach(doc => {
        posts.push({
          id: doc.id,
          ...doc.data(),
        });
      });
    });

    // Sort all posts by creation date
    posts.sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() || 0;
      const bTime = b.createdAt?.toMillis?.() || 0;
      return bTime - aTime;
    });

    return posts.slice(0, maxResults);
  } catch (error) {
    console.error('[PublicPosts] Error getting feed:', error);
    throw error;
  }
}

/**
 * Get posts by a specific user
 */
export async function getUserPosts(userId, maxResults = 20) {
  try {
    const postsRef = collection(db, 'publicPosts');
    const q = query(
      postsRef,
      where('authorId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(maxResults)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('[PublicPosts] Error getting user posts:', error);
    throw error;
  }
}

/**
 * Get trending/popular posts
 */
export async function getTrendingPosts(maxResults = 20) {
  try {
    const postsRef = collection(db, 'publicPosts');
    const q = query(
      postsRef,
      orderBy('likesCount', 'desc'),
      orderBy('createdAt', 'desc'),
      limit(maxResults)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('[PublicPosts] Error getting trending posts:', error);
    throw error;
  }
}

/**
 * Get recent public posts
 */
export async function getRecentPublicPosts(maxResults = 20) {
  try {
    const postsRef = collection(db, 'publicPosts');
    const q = query(
      postsRef,
      orderBy('createdAt', 'desc'),
      limit(maxResults)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('[PublicPosts] Error getting recent posts:', error);
    throw error;
  }
}

/**
 * Delete a public post
 */
export async function deletePublicPost(postId, authorId) {
  try {
    const postRef = doc(db, 'publicPosts', postId);
    await deleteDoc(postRef);

    // Decrement user's public posts count
    const userRef = doc(db, 'users', authorId);
    await updateDoc(userRef, {
      publicPostsCount: increment(-1),
    });

    return true;
  } catch (error) {
    console.error('[PublicPosts] Error deleting post:', error);
    throw error;
  }
}
