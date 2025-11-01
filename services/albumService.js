import { collection, deleteDoc, doc, increment, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, storage } from '../api/firebaseClient';

const MAX_ALBUM_ITEMS = 10;
const buildPhotoId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const albumCollection = (userId) => collection(db, 'users', userId, 'album');

export const ALBUM_MAX_ITEMS = MAX_ALBUM_ITEMS;

export function listenToAlbum(userId, callback) {
  if (!userId) {
    callback([]);
    return () => {};
  }

  const q = query(albumCollection(userId), orderBy('createdAt', 'desc'));
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map((docSnap) => {
      const data = docSnap.data() ?? {};
      return {
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt?.toMillis?.() ?? data.createdAt ?? 0,
      };
    });
    callback(items);
  }, (error) => {
    console.warn('[albumService] listenToAlbum error', error);
    callback([]);
  });

  return unsubscribe;
}

export async function uploadAlbumPhoto(userId, uri) {
  if (!userId || !uri) {
    throw new Error('Missing user or photo URI.');
  }

  const photoId = buildPhotoId();
  const storagePath = `albums/${userId}/${photoId}`;
  const storageRef = ref(storage, storagePath);

  const response = await fetch(uri);
  const blob = await response.blob();

  try {
    await uploadBytes(storageRef, blob, {
      contentType: blob.type ?? 'image/jpeg'
    });
  } finally {
    blob.close?.();
  }

  const downloadUrl = await getDownloadURL(storageRef);

  const docRef = doc(albumCollection(userId), photoId);
  await setDoc(docRef, {
    ownerId: userId,
    downloadUrl,
    storagePath,
    createdAt: serverTimestamp()
  });

  await updateDoc(doc(db, 'users', userId), {
    albumCount: increment(1),
    albumUpdatedAt: serverTimestamp()
  }).catch(() => {});

  return { id: photoId, downloadUrl, storagePath };
}

export async function deleteAlbumPhoto(userId, photo) {
  if (!userId || !photo?.id) {
    return;
  }

  const docRef = doc(albumCollection(userId), photo.id);
  await deleteDoc(docRef);

  await updateDoc(doc(db, 'users', userId), {
    albumCount: increment(-1),
    albumUpdatedAt: serverTimestamp()
  }).catch(() => {});

  if (photo.storagePath) {
    try {
      const storageRef = ref(storage, photo.storagePath);
      await deleteObject(storageRef);
    } catch (error) {
      console.warn('[albumService] deleteAlbumPhoto storage cleanup failed', error);
    }
  }
}

export async function updateAlbumPreferences(userId, preferences = {}) {
  if (!userId) return;
  const payload = {
    albumUpdatedAt: serverTimestamp()
  };

  if (typeof preferences.columns === 'number') {
    payload.albumLayout = preferences.columns;
  }
  if (preferences.shape) {
    payload.albumShape = preferences.shape;
  }

  await updateDoc(doc(db, 'users', userId), payload).catch((error) => {
    console.warn('[albumService] updateAlbumPreferences failed', error);
  });
}
