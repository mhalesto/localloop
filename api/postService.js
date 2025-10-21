import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc
} from 'firebase/firestore';
import { db } from './firebaseClient';

const POSTS_COLLECTION = 'posts';

const ensureDb = () => {
  if (!db) {
    throw new Error('Firebase database is not initialised.');
  }
};

const normaliseTimestamp = (value) => {
  if (!value) return Date.now();
  if (typeof value === 'number') return value;
  if (value.toMillis) return value.toMillis();
  return Date.now();
};

export async function fetchAllPostsRemote() {
  try {
    ensureDb();
  } catch (error) {
    console.warn('[postService] fetchAllPostsRemote skipped:', error.message);
    return [];
  }

  const snapshot = await getDocs(collection(db, POSTS_COLLECTION));
  const posts = [];

  for (const postDoc of snapshot.docs) {
    const data = postDoc.data();
    const commentsSnapshot = await getDocs(
      query(collection(db, POSTS_COLLECTION, postDoc.id, 'comments'), orderBy('createdAt', 'asc'))
    );
    const comments = commentsSnapshot.docs.map((commentDoc) => {
      const comment = commentDoc.data();
      return {
        id: commentDoc.id,
        ...comment,
        createdAt: normaliseTimestamp(comment.createdAt)
      };
    });

    const normalizedTitle =
      typeof data.title === 'string' && data.title.trim().length > 0
        ? data.title
        : typeof data.message === 'string'
        ? data.message
        : '';

    posts.push({
      id: postDoc.id,
      ...data,
      title: normalizedTitle,
      createdAt: normaliseTimestamp(data.createdAt),
      comments,
      highlightDescription: !!data.highlightDescription
    });
  }

  return posts;
}

export async function savePostRemote(post) {
  try {
    ensureDb();
  } catch (error) {
    console.warn('[postService] savePostRemote skipped:', error.message);
    return;
  }

  const { comments, ...rest } = post;
  await setDoc(doc(db, POSTS_COLLECTION, post.id), rest, { merge: true });
}

export async function saveCommentRemote(postId, comment) {
  try {
    ensureDb();
  } catch (error) {
    console.warn('[postService] saveCommentRemote skipped:', error.message);
    return;
  }

  const { id, ...rest } = comment;
  await setDoc(doc(collection(db, POSTS_COLLECTION, postId, 'comments'), id), rest, { merge: true });
}

export async function deletePostRemote(postId) {
  try {
    ensureDb();
  } catch (error) {
    console.warn('[postService] deletePostRemote skipped:', error.message);
    return;
  }

  const commentsSnapshot = await getDocs(collection(db, POSTS_COLLECTION, postId, 'comments'));
  await Promise.all(commentsSnapshot.docs.map((commentDoc) => deleteDoc(commentDoc.ref)));
  await deleteDoc(doc(db, POSTS_COLLECTION, postId));
}

export function subscribeToAllPosts(onChange) {
  try {
    ensureDb();
  } catch (error) {
    console.warn('[postService] subscribeToAllPosts skipped:', error.message);
    return () => {};
  }

  const unsubscribe = onSnapshot(
    collection(db, POSTS_COLLECTION),
    (snapshot) => {
      const changes = snapshot.docChanges().map((change) => {
        const data = change.doc.data();
        return {
          type: change.type,
          post: {
            id: change.doc.id,
            ...data,
            createdAt: normaliseTimestamp(data.createdAt),
            highlightDescription: !!data.highlightDescription
          }
        };
      });

      if (changes.length > 0) {
        onChange(changes);
      }
    },
    (error) => {
      console.warn('[postService] subscribeToAllPosts error', error);
    }
  );

  return unsubscribe;
}

export function subscribeToPostComments(postId, onComments) {
  if (!postId) {
    return () => {};
  }

  try {
    ensureDb();
  } catch (error) {
    console.warn('[postService] subscribeToPostComments skipped:', error.message);
    return () => {};
  }

  const commentsQuery = query(
    collection(db, POSTS_COLLECTION, postId, 'comments'),
    orderBy('createdAt', 'asc')
  );

  const unsubscribe = onSnapshot(
    commentsQuery,
    (snapshot) => {
      const comments = snapshot.docs.map((commentDoc) => {
        const data = commentDoc.data();
        return {
          id: commentDoc.id,
          ...data,
          createdAt: normaliseTimestamp(data.createdAt)
        };
      });

      onComments(comments);
    },
    (error) => {
      console.warn('[postService] subscribeToPostComments error', error);
    }
  );

  return unsubscribe;
}

export async function updateTypingPresence(postId, clientId, payload) {
  if (!postId || !clientId) {
    return;
  }

  try {
    ensureDb();
  } catch (error) {
    console.warn('[postService] updateTypingPresence skipped:', error.message);
    return;
  }

  const presenceRef = doc(collection(db, POSTS_COLLECTION, postId, 'presence'), clientId);
  const { nickname = '', isTyping = false } = payload ?? {};
  await setDoc(
    presenceRef,
    {
      clientId,
      nickname,
      isTyping,
      updatedAt: Date.now()
    },
    { merge: true }
  );
}

export function subscribeToTypingPresence(postId, onPresence) {
  if (!postId) {
    return () => {};
  }

  try {
    ensureDb();
  } catch (error) {
    console.warn('[postService] subscribeToTypingPresence skipped:', error.message);
    return () => {};
  }

  const unsubscribe = onSnapshot(
    collection(db, POSTS_COLLECTION, postId, 'presence'),
    (snapshot) => {
      const entries = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          updatedAt: normaliseTimestamp(data.updatedAt)
        };
      });

      onPresence(entries);
    },
    (error) => {
      console.warn('[postService] subscribeToTypingPresence error', error);
    }
  );

  return unsubscribe;
}

