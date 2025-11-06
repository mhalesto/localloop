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
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  increment,
  runTransaction,
} from 'firebase/firestore';
import { db } from '../api/firebaseClient';

const PUBLIC_POSTS_COLLECTION = 'publicPosts';

const normalizeTimestamp = (value) => {
  if (!value) {
    return null;
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
  return null;
};

const sanitizeVotesMap = (rawVotes) => {
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
};

const computeVoteCounts = (votesMap) => {
  const values = Object.values(votesMap);
  const upvotes = values.filter((value) => value === 'up').length;
  const downvotes = values.filter((value) => value === 'down').length;
  return { upvotes, downvotes };
};

const normalisePublicPost = (docId, data = {}) => {
  const votes = sanitizeVotesMap(data.votes);
  const derivedCounts = computeVoteCounts(votes);

  return {
    id: docId ?? data.id,
    ...data,
    votes,
    upvotes: Number.isFinite(data.upvotes) ? data.upvotes : derivedCounts.upvotes,
    downvotes: Number.isFinite(data.downvotes) ? data.downvotes : derivedCounts.downvotes,
    createdAtMs: normalizeTimestamp(data.createdAt) ?? Date.now(),
  };
};

/**
 * Create a public post
 */
export async function createPublicPost(authorId, postData) {
  try {
    const postsRef = collection(db, PUBLIC_POSTS_COLLECTION);
    const postRef = doc(postsRef);

    const {
      sourcePostId,
      sourceCity,
      sourceProvince,
      sourceCountry,
      votes,
      upvotes,
      downvotes,
      likesCount,
      commentsCount,
      ...rest
    } = postData ?? {};

    const post = {
      ...rest,
      authorId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastInteractionAt: serverTimestamp(),
      likesCount: Number.isFinite(likesCount) ? likesCount : 0,
      commentsCount: Number.isFinite(commentsCount) ? commentsCount : 0,
      upvotes: Number.isFinite(upvotes) ? upvotes : 0,
      downvotes: Number.isFinite(downvotes) ? downvotes : 0,
      votes: sanitizeVotesMap(votes),
    };

    if (sourcePostId) {
      post.sourcePostId = sourcePostId;
    }
    if (sourceCity) {
      post.sourceCity = sourceCity;
    }
    if (sourceProvince) {
      post.sourceProvince = sourceProvince;
    }
    if (sourceCountry) {
      post.sourceCountry = sourceCountry;
    }

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
    const postsRef = collection(db, PUBLIC_POSTS_COLLECTION);

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
        posts.push(normalisePublicPost(doc.id, doc.data()));
      });
    });

    // Sort all posts by creation date
    posts.sort((a, b) => {
      const aTime = normalizeTimestamp(a.createdAt) ?? a.createdAtMs ?? 0;
      const bTime = normalizeTimestamp(b.createdAt) ?? b.createdAtMs ?? 0;
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
    const postsRef = collection(db, PUBLIC_POSTS_COLLECTION);
    const q = query(
      postsRef,
      where('authorId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(maxResults)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => normalisePublicPost(doc.id, doc.data()));
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
    const postsRef = collection(db, PUBLIC_POSTS_COLLECTION);
    const q = query(
      postsRef,
      orderBy('likesCount', 'desc'),
      orderBy('createdAt', 'desc'),
      limit(maxResults)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => normalisePublicPost(doc.id, doc.data()));
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
    const postsRef = collection(db, PUBLIC_POSTS_COLLECTION);
    const q = query(
      postsRef,
      orderBy('createdAt', 'desc'),
      limit(maxResults)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => normalisePublicPost(doc.id, doc.data()));
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
    const postRef = doc(db, PUBLIC_POSTS_COLLECTION, postId);
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

/**
 * Toggle an upvote or downvote for a public post
 */
export async function togglePublicPostVote(postId, voterId, direction) {
  if (!postId || !voterId) {
    throw new Error('Invalid arguments for togglePublicPostVote');
  }
  if (direction !== 'up' && direction !== 'down') {
    throw new Error(`Unsupported vote direction: ${direction}`);
  }

  try {
    return await runTransaction(db, async (tx) => {
      const postRef = doc(db, PUBLIC_POSTS_COLLECTION, postId);
      const snap = await tx.get(postRef);
      if (!snap.exists()) {
        throw new Error('Post not found');
      }

      const data = snap.data() ?? {};
      const votes = sanitizeVotesMap(data.votes);
      const currentVote = votes[voterId] ?? null;

      let nextVote = currentVote;
      if (direction === 'up') {
        nextVote = currentVote === 'up' ? null : 'up';
      } else if (direction === 'down') {
        nextVote = currentVote === 'down' ? null : 'down';
      }

      if (nextVote) {
        votes[voterId] = nextVote;
      } else {
        delete votes[voterId];
      }

      const { upvotes, downvotes } = computeVoteCounts(votes);

      tx.update(postRef, {
        votes,
        upvotes,
        downvotes,
        updatedAt: serverTimestamp(),
        lastInteractionAt: serverTimestamp(),
      });

      return {
        votes,
        upvotes,
        downvotes,
        userVote: nextVote ?? null,
      };
    });
  } catch (error) {
    console.error('[PublicPosts] Error toggling vote:', error);
    throw error;
  }
}
