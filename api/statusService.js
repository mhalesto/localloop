// api/statusService.js
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
  uploadBytesResumable,
} from 'firebase/storage';

import { db, storage } from './firebaseClient';
import { STATUS_TTL_MS, STATUS_REPORT_THRESHOLD } from '../constants/authConfig';

const STATUSES_COLLECTION = 'statuses';
const REPLIES_COLLECTION = 'replies';

const ensureDb = () => { if (!db) throw new Error('Firebase database is not initialised.'); };
const ensureStorage = () => { if (!storage) throw new Error('Firebase storage is not initialised.'); };

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
        reactors: reactorIds.reduce((acc, id) => { acc[id] = true; return acc; }, {}),
        count,
      };
    }
  });
  return reactions;
};

const normalizeStatus = (docSnap) => {
  if (!docSnap) return null;
  const data = docSnap.data?.() ?? docSnap;

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
    reactions: sanitizeReactions(data.reactions),
    userReactions: data.userReactions ?? {},
    repliesCount: Number.isFinite(data.repliesCount) ? data.repliesCount : 0,
    reportCount: Number.isFinite(data.reportCount) ? data.reportCount : 0,
    reports: data.reports ?? {},
    isHidden: Boolean(data.isHidden),
    lastInteractionAt: normalizeTimestamp(data.lastInteractionAt, normalizeTimestamp(data.createdAt)),
  };
};

const buildImagePath = (uid, statusId) => {
  if (!uid) throw new Error('Please sign in to upload images.');
  return `statuses/${uid}/${statusId}.jpg`;
};

const logErr = (label, e) => {
  const code = e?.code || '';
  const server = e?.customData?.serverResponse || e?.serverResponse || '';
  console.error(`[statusService] ${label}`, {
    code,
    message: e?.message,
    name: e?.name,
    serverResponse: typeof server === 'string' ? server.slice(0, 500) : server,
  });
};

// Resumable upload with exponential backoff + progress callback
async function uploadWithBackoff(storageRef, blob, metadata, onProgress) {
  const shouldRetry = (code) =>
    ['storage/retry-limit-exceeded', 'storage/unknown', 'storage/network-request-failed']
      .some((c) => (code || '').includes(c));

  let attempt = 0;
  const max = 3;

  while (true) {
    attempt += 1;
    try {
      return await new Promise((resolve, reject) => {
        const task = uploadBytesResumable(storageRef, blob, metadata);
        task.on(
          'state_changed',
          (snap) => {
            if (onProgress && snap.totalBytes) {
              const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
              onProgress(pct);
            }
          },
          reject,
          async () => {
            try {
              const url = await getDownloadURL(storageRef);
              resolve(url);
            } catch (e) {
              reject(e);
            }
          }
        );
      });
    } catch (e) {
      const code = e?.code || '';
      if (attempt >= max || !shouldRetry(code)) throw e;
      const delay = (500 * Math.pow(2, attempt - 1)) * (0.5 + Math.random()); // jitter
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

const uploadStatusImageAsync = async (image, uid, statusId, onProgress) => {
  if (!image?.uri) return { imageUrl: null, imageStoragePath: null };

  ensureStorage();
  const path = buildImagePath(uid, statusId);
  const storageRef = ref(storage, path);

  console.log('[statusService] upload start', {
    uid, statusId, path, bucket: storage?.app?.options?.storageBucket, imageUri: image.uri,
  });

  let blob;
  try {
    const resp = await fetch(image.uri);
    blob = await resp.blob();
  } catch (e) {
    logErr('fetch(blob) failed', e);
    throw new Error('Could not read image from device.');
  }

  const metadata = { contentType: image?.mimeType || blob?.type || 'image/jpeg' };
  console.log('[statusService] upload blob ready', { size: blob?.size, contentType: metadata.contentType });

  try {
    const downloadUrl = await uploadWithBackoff(storageRef, blob, metadata, onProgress);
    console.log('[statusService] upload OK -> url ready');
    return { imageUrl: downloadUrl, imageStoragePath: path };
  } catch (e) {
    logErr('upload error', e);
    const code = String(e?.code || '');
    if (code.includes('unauthorized') || code.includes('permission')) {
      throw new Error('Not allowed to upload. Check Storage rules and that you are signed in.');
    }
    if (code.includes('app-check')) {
      throw new Error('Upload blocked by App Check. Initialize App Check or disable enforcement.');
    }
    throw new Error('Unable to upload image right now.');
  }
};

export async function createStatus({
  message,
  image,
  author,
  location,
  onUploadProgress, // optional callback (pct)
}) {
  ensureDb();

  const trimmed = message?.trim?.() ?? '';
  if (!trimmed) throw new Error('Status message cannot be empty.');
  if (!author?.uid) throw new Error('Please sign in to share a status.');

  const statusId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  let imagePayload = { imageUrl: null, imageStoragePath: null };
  if (image) {
    imagePayload = await uploadStatusImageAsync(image, author.uid, statusId, onUploadProgress);
  }

  const now = Date.now();
  const payload = {
    id: statusId,
    authorId: author.uid,
    message: trimmed,
    ...imagePayload,
    createdAt: now,
    expiresAt: now + STATUS_TTL_MS,
    lastInteractionAt: now,
    author: {
      uid: author.uid,
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

// === the rest (subscribe, replies, reactions, report, cleanup) unchanged ===
export function subscribeToStatuses({ city, province, country, limit = 50, onChange, includeHidden = false, onError }) {
  try { ensureDb(); } catch (error) { console.warn('[statusService] subscribeToStatuses skipped:', error.message); onError?.(error); return () => { }; }
  const constraints = [orderBy('createdAt', 'desc'), limitQuery(limit)];
  if (city) constraints.unshift(where('city', '==', city));
  else if (province) constraints.unshift(where('province', '==', province));
  else if (country) constraints.unshift(where('country', '==', country));
  const q = query(collection(db, STATUSES_COLLECTION), ...constraints);
  return onSnapshot(
    q,
    (snapshot) => {
      const now = Date.now();
      const statuses = snapshot.docs
        .map((docSnap) => normalizeStatus(docSnap))
        .filter((s) => s && !s.isHidden && s.expiresAt > now && s.reportCount < STATUS_REPORT_THRESHOLD);
      onChange?.(statuses);
    },
    (error) => { console.warn('[statusService] subscribeToStatuses error', error); onError?.(error); }
  );
}

export function subscribeToStatusReplies(statusId, onChange) {
  if (!statusId) return () => { };
  ensureDb();
  const repliesQuery = query(collection(db, STATUSES_COLLECTION, statusId, REPLIES_COLLECTION), orderBy('createdAt', 'asc'));
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
  if (!trimmed) throw new Error('Reply cannot be empty.');
  const replyId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const now = Date.now();
  await setDoc(doc(collection(db, STATUSES_COLLECTION, statusId, REPLIES_COLLECTION), replyId), {
    id: replyId,
    message: trimmed,
    createdAt: now,
    author: {
      uid: author?.uid ?? null,
      displayName: author?.displayName ?? '',
      nickname: author?.nickname ?? '',
      photoURL: author?.photoURL ?? '',
    },
  }, { merge: true });
  await updateDoc(doc(db, STATUSES_COLLECTION, statusId), { repliesCount: increment(1), lastInteractionAt: now })
    .catch((e) => console.warn('[statusService] update repliesCount failed', e));
}

export async function toggleStatusReaction(statusId, emoji, userId) {
  ensureDb();
  if (!statusId || !emoji || !userId) return { ok: false, error: 'invalid_arguments' };
  try {
    const result = await runTransaction(db, async (tx) => {
      const ref = doc(db, STATUSES_COLLECTION, statusId);
      const snap = await tx.get(ref);
      if (!snap.exists()) throw new Error('Status not found.');
      const data = snap.data() ?? {};
      const next = sanitizeReactions(data.reactions ?? {});
      const entry = next[emoji] ?? { reactors: {}, count: 0 };
      if (entry.reactors[userId]) delete entry.reactors[userId]; else entry.reactors[userId] = true;
      entry.count = Math.max(0, Object.keys(entry.reactors).length);
      if (entry.count === 0) delete next[emoji]; else next[emoji] = entry;
      const lastInteractionAt = Date.now();
      tx.update(ref, { reactions: next, lastInteractionAt });
      return { reactions: next, lastInteractionAt };
    });
    return { ok: true, ...result };
  } catch (e) {
    console.warn('[statusService] toggleStatusReaction failed', e);
    return { ok: false, error: e?.message ?? 'reaction_failed' };
  }
}

export async function reportStatus(statusId, userId, reason = 'inappropriate') {
  ensureDb();
  if (!statusId || !userId) return { ok: false, error: 'invalid_arguments' };
  try {
    const result = await runTransaction(db, async (tx) => {
      const ref = doc(db, STATUSES_COLLECTION, statusId);
      const snap = await tx.get(ref);
      if (!snap.exists()) throw new Error('Status not found.');
      const data = snap.data() ?? {};
      const existing = typeof data.reports === 'object' ? { ...data.reports } : {};
      if (existing[userId]) {
        return {
          reportCount: data.reportCount ?? Object.keys(existing).length,
          isHidden: Boolean(data.isHidden),
          alreadyReported: true,
        };
      }
      existing[userId] = { reason, reportedAt: Date.now() };
      const reportCount = Object.keys(existing).length;
      const isHidden = reportCount >= STATUS_REPORT_THRESHOLD;
      tx.update(ref, { reports: existing, reportCount, isHidden, lastInteractionAt: Date.now() });
      return { reportCount, isHidden, alreadyReported: false };
    });
    return { ok: true, ...result };
  } catch (e) {
    console.warn('[statusService] reportStatus failed', e);
    return { ok: false, error: e?.message ?? 'report_failed' };
  }
}

export async function fetchReportedStatuses({ limit = 50 } = {}) {
  ensureDb();
  const q = query(collection(db, STATUSES_COLLECTION), where('reportCount', '>=', 1), orderBy('reportCount', 'desc'), limitQuery(limit));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => normalizeStatus(docSnap));
}

export async function cleanupExpiredStatuses({ limit = 25 } = {}) {
  ensureDb();
  const now = Date.now();
  const snapshot = await getDocs(query(collection(db, STATUSES_COLLECTION), where('expiresAt', '<=', now), limitQuery(limit)));
  const deletions = snapshot.docs.map(async (docSnap) => {
    const data = docSnap.data();
    try {
      if (data?.imageStoragePath) await deleteObject(ref(storage, data.imageStoragePath)).catch(() => { });
      await deleteDoc(docSnap.ref);
    } catch (e) { console.warn('[statusService] cleanupExpiredStatuses failed', e); }
  });
  await Promise.all(deletions);
}

export { STATUS_TTL_MS, STATUS_REPORT_THRESHOLD };
