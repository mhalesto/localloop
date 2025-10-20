import {
  collection,
  deleteDoc,
  doc,
  getDocs,
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

    posts.push({
      id: postDoc.id,
      ...data,
      createdAt: normaliseTimestamp(data.createdAt),
      comments
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

