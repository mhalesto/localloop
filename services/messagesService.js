import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc
} from 'firebase/firestore';
import { db } from '../api/firebaseClient';

const conversationsCollection = () => collection(db, 'directMessages');
const conversationDoc = (conversationId) => doc(db, 'directMessages', conversationId);
const conversationMessagesCollection = (conversationId) => collection(db, 'directMessages', conversationId, 'messages');

export const buildConversationId = (a, b) => {
  const ids = [a, b].filter(Boolean).sort();
  return ids.join('_');
};

export async function ensureConversation(conversationId, participants) {
  const ref = conversationDoc(conversationId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      participants,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastMessagePreview: ''
    });
  } else {
    await updateDoc(ref, {
      participants,
      updatedAt: serverTimestamp()
    }).catch(() => {});
  }
}

export async function sendDirectMessage({ conversationId, senderId, recipientId, text }) {
  if (!conversationId || !senderId || !recipientId || !text?.trim()) {
    throw new Error('Incomplete message payload');
  }
  const participants = [senderId, recipientId];
  await ensureConversation(conversationId, participants);

  const messagesRef = conversationMessagesCollection(conversationId);
  await addDoc(messagesRef, {
    senderId,
    recipientId,
    text: text.trim(),
    createdAt: serverTimestamp()
  });

  await updateDoc(conversationDoc(conversationId), {
    lastMessagePreview: text.trim().slice(0, 120),
    updatedAt: serverTimestamp()
  }).catch(() => {});
}

export function subscribeToMessages(conversationId, callback) {
  if (!conversationId) {
    callback([]);
    return () => {};
  }
  const q = query(conversationMessagesCollection(conversationId), orderBy('createdAt', 'asc'));
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map((docSnap) => {
      const data = docSnap.data() ?? {};
      return {
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt?.toMillis?.() ?? data.createdAt ?? 0
      };
    });
    callback(items);
  });
  return unsubscribe;
}
