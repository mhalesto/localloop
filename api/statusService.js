import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit as limitQuery,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  increment,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from 'firebase/storage';

import { db, storage } from './firebaseClient';
import { STATUS_TTL_MS, STATUS_REPORT_THRESHOLD } from '../constants/authConfig';
const STATUSES_COLLECTION = 'statuses';
const REPLIES_COLLECTION = 'replies';

const ensureDb = () => {
  if (!db) {
    throw new Error('Firebase database is not initialised.');
  }
};

const ensureStorage = () => {
  if (!storage) {
    throw new Error('Firebase storage is not initialised.');
  }
};

const normalizeTimestamp = (value, fallback = Date.now()) => {
  if (!value) return fallback;
  if (typeof value === 'number') return value;
  if (typeof value?.toMillis === 'function') return value.toMillis();
  return fallback;
};

const sanitizeReactions = (raw = {}) => {
  const reactions = {};
  Object.entries(raw).forEach(([emoji, data]) => {
    if (!emoji || !data) return;
    const reactors = typeof data.reactors === 'object' ? { ...data.reactors } : {};
    const reactorIds = Object.keys(reactors).filter(Boolean);
    const count = Number.isFinite(data.count) ? data.count : reactorIds.length;
    if (reactorIds.length || count) {
      reactions[emoji] = {
        reactors: reactorIds.reduce((acc, id) => {
          acc[id] = true;
          return acc;
        }, {}),
        count,
      };
    }
  });
  return reactions;
};

const normalizeStatus = (docSnap) => {
  if (!docSnap) return null;
  const data = docSnap.data?.() ?? docSnap;

  const reactions = sanitizeReactions(data.reactions);
  const reportCount = Number.isFinite(data.reportCount) ? data.reportCount : 0;

  return {
    id: docSnap.id ?? data.id,
    message: data.message ?? '',
    imageUrl: data.imageUrl ?? null,
    imageStoragePath: data.imageStoragePath ?? null,
    createdAt: normalizeTimestamp(data.createdAt),
    expiresAt: normalizeTimestamp(data.expiresAt, Date.now() + STATUS_TTL_MS),
    author: data.author ?? {},
    city: data.city ?? '',
    province: data.province ?? '',
    country: data.country ?? '',
    reactions,
    userReactions: data.userReactions ?? {},
    repliesCount: Number.isFinite(data.repliesCount) ? data.repliesCount : 0,
    reportCount,
    reports: data.reports ?? {},
    isHidden: Boolean(data.isHidden),
    lastInteractionAt: normalizeTimestamp(data.lastInteractionAt, normalizeTimestamp(data.createdAt)),
  };
};

const buildImagePath = (uid, statusId) => `statuses/${uid || 'guest'}/${statusId}.jpg`;

const uploadStatusImageAsync = async (uri, uid, statusId) => {
  if (!uri) {
    return { imageUrl: null, imageStoragePath: null };
  }

  ensureStorage();
  const path = buildImagePath(uid, statusId);
  const storageRef = ref(storage, path);
  const response = await fetch(uri);
  const blob = await response.blob();
  await uploadBytes(storageRef, blob);
  const downloadUrl = await getDownloadURL(storageRef);
  return { imageUrl: downloadUrl, imageStoragePath: path };
};

export async function createStatus({
  message,
  imageUri,
  author,
  location,
}) {
  ensureDb();

  const trimmed = message?.trim?.() ?? '';
  if (!trimmed) {
    throw new Error('Status message cannot be empty.');
  }

  const statusId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  let imagePayload = { imageUrl: null, imageStoragePath: null };
  if (imageUri) {
    try {
      imagePayload = await uploadStatusImageAsync(imageUri, author?.uid ?? 'guest', statusId);
    } catch (error) {
      console.warn('[statusService] upload image failed', error);
      throw new Error('Unable to upload image right now.');
    }
  }

  const now = Date.now();
  const expiresAt = now + STATUS_TTL_MS;
  const payload = {
    id: statusId,
    message: trimmed,
    ...imagePayload,
    createdAt: now,
    expiresAt,
    lastInteractionAt: now,
    author: {
      uid: author?.uid ?? null,
      displayName: author?.displayName ?? '',
      photoURL: author?.photoURL ?? '',
      nickname: author?.nickname ?? '',
      email: author?.email ?? '',
    },
    city: location?.city ?? '',
    province: location?.province ?? '',
    country: location?.country ?? '',
    reactions: {},
    repliesCount: 0,
    reports: {},
    reportCount: 0,
    isHidden: false,
  };

  await setDoc(doc(collection(db, STATUSES_COLLECTION), statusId), payload, { merge: true });
  return payload;
}

export function subscribeToStatuses({
  city,
  province,
  country,
  limit = 50,
  onChange,
  includeHidden = false,
  onError,
}) {
  try {
    ensureDb();
  } catch (error) {
    console.warn('[statusService] subscribeToStatuses skipped:', error.message);
    onError?.(error);
    return () => {};
  }

  const constraints = [orderBy('createdAt', 'desc'), limitQuery(limit)];

  if (city) {
    constraints.unshift(where('city', '==', city));
  } else if (province) {
    constraints.unshift(where('province', '==', province));
  } else if (country) {
    constraints.unshift(where('country', '==', country));
  }

  const q = query(collection(db, STATUSES_COLLECTION), ...constraints);

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const now = Date.now();
      const statuses = snapshot.docs
        .map((docSnap) => normalizeStatus(docSnap))
        .filter((status) => {
          if (!status) return false;
          if (!includeHidden && status.isHidden) return false;
          if (status.expiresAt <= now) return false;
          if (status.reportCount >= STATUS_REPORT_THRESHOLD && !includeHidden) return false;
          return true;
        });

      onChange?.(statuses);
    },
    (error) => {
      console.warn('[statusService] subscribeToStatuses error', error);
      onError?.(error);
    }
  );

  return unsubscribe;
}

export function subscribeToStatusReplies(statusId, onChange) {
  if (!statusId) {
    return () => {};
  }

  ensureDb();

  const repliesQuery = query(
    collection(db, STATUSES_COLLECTION, statusId, REPLIES_COLLECTION),
    orderBy('createdAt', 'asc')
  );

  return onSnapshot(
    repliesQuery,
    (snapshot) => {
      const replies = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
        createdAt: normalizeTimestamp(docSnap.data()?.createdAt),
      }));
      onChange?.(replies);
    },
    (error) => console.warn('[statusService] subscribeToStatusReplies error', error)
  );
}

export async function addStatusReply(statusId, { message, author }) {
  ensureDb();
  const trimmed = message?.trim?.() ?? '';
  if (!trimmed) {
    throw new Error('Reply cannot be empty.');
  }

  const replyId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const now = Date.now();

  await setDoc(
    doc(collection(db, STATUSES_COLLECTION, statusId, REPLIES_COLLECTION), replyId),
    {
      id: replyId,
      message: trimmed,
      createdAt: now,
      author: {
        uid: author?.uid ?? null,
        displayName: author?.displayName ?? '',
        nickname: author?.nickname ?? '',
        photoURL: author?.photoURL ?? '',
      },
    },
    { merge: true }
  );

  await updateDoc(doc(db, STATUSES_COLLECTION, statusId), {
    repliesCount: increment(1),
    lastInteractionAt: now,
  }).catch((error) => {
    console.warn('[statusService] update repliesCount failed', error);
  });
}

const toggleReactionInPayload = (statusData, emoji, userId) => {
  const next = sanitizeReactions(statusData.reactions ?? {});
  if (!emoji || !userId) {
    return next;
  }

  const entry = next[emoji] ?? { reactors: {}, count: 0 };
  const hasReacted = Boolean(entry.reactors[userId]);
  if (hasReacted) {
    delete entry.reactors[userId];
  } else {
    entry.reactors[userId] = true;
  }

  entry.count = Math.max(0, Object.keys(entry.reactors).length);
  if (entry.count === 0) {
    delete next[emoji];
  } else {
    next[emoji] = entry;
  }
  return next;
};

export async function toggleStatusReaction(statusId, emoji, userId) {
  ensureDb();
  if (!statusId || !emoji || !userId) {
    return { ok: false, error: 'invalid_arguments' };
  }

  try {
    const result = await runTransaction(db, async (tx) => {
      const ref = doc(db, STATUSES_COLLECTION, statusId);
      const snap = await tx.get(ref);
      if (!snap.exists()) {
        throw new Error('Status not found.');
      }

      const data = snap.data() ?? {};
      const reactions = toggleReactionInPayload(data, emoji, userId);
      const lastInteractionAt = Date.now();
      tx.update(ref, { reactions, lastInteractionAt });
      return { reactions, lastInteractionAt };
    });

    return { ok: true, ...result };
  } catch (error) {
    console.warn('[statusService] toggleStatusReaction failed', error);
    return { ok: false, error: error?.message ?? 'reaction_failed' };
  }
}

export async function reportStatus(statusId, userId, reason = 'inappropriate') {
  ensureDb();
  if (!statusId || !userId) {
    return { ok: false, error: 'invalid_arguments' };
  }

  try {
    const result = await runTransaction(db, async (tx) => {
      const ref = doc(db, STATUSES_COLLECTION, statusId);
      const snap = await tx.get(ref);
      if (!snap.exists()) {
        throw new Error('Status not found.');
      }

      const data = snap.data() ?? {};
      const existingReports = typeof data.reports === 'object' ? { ...data.reports } : {};
      if (existingReports[userId]) {
        return {
          reportCount: data.reportCount ?? Object.keys(existingReports).length,
          isHidden: Boolean(data.isHidden),
          alreadyReported: true,
        };
      }

      existingReports[userId] = {
        reason,
        reportedAt: Date.now(),
      };

      const reportCount = Object.keys(existingReports).length;
      const isHidden = reportCount >= STATUS_REPORT_THRESHOLD;

      tx.update(ref, {
        reports: existingReports,
        reportCount,
        isHidden,
        lastInteractionAt: Date.now(),
      });

      return { reportCount, isHidden, alreadyReported: false };
    });

    return { ok: true, ...result };
  } catch (error) {
    console.warn('[statusService] reportStatus failed', error);
    return { ok: false, error: error?.message ?? 'report_failed' };
  }
}

export async function fetchReportedStatuses({ limit = 50 } = {}) {
  ensureDb();
  const q = query(
    collection(db, STATUSES_COLLECTION),
    where('reportCount', '>=', 1),
    orderBy('reportCount', 'desc'),
    limitQuery(limit)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => normalizeStatus(docSnap));
}

export async function cleanupExpiredStatuses({ limit = 25 } = {}) {
  ensureDb();
  const now = Date.now();
  const snapshot = await getDocs(
    query(
      collection(db, STATUSES_COLLECTION),
      where('expiresAt', '<=', now),
      limitQuery(limit)
    )
  );

  const deletions = snapshot.docs.map(async (docSnap) => {
    const data = docSnap.data();
    try {
      if (data?.imageStoragePath) {
        await deleteObject(ref(storage, data.imageStoragePath)).catch(() => {});
      }
      await deleteDoc(docSnap.ref);
    } catch (error) {
      console.warn('[statusService] cleanupExpiredStatuses failed', error);
    }
  });

  await Promise.all(deletions);
}

export { STATUS_TTL_MS, STATUS_REPORT_THRESHOLD };
