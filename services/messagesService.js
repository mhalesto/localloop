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
  console.log('[Messages] Ensuring conversation exists:', { conversationId, participants });
  const ref = conversationDoc(conversationId);

  try {
    // Try to create the conversation
    // If it already exists, this will fail but that's okay
    console.log('[Messages] Attempting to create conversation...');
    await setDoc(ref, {
      participants,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastMessagePreview: ''
    }).catch((error) => {
      // If the error is NOT "already exists", rethrow it
      if (error.code !== 'already-exists') {
        throw error;
      }
      console.log('[Messages] Conversation already exists, continuing...');
    });
    console.log('[Messages] Conversation ensured successfully');
  } catch (error) {
    console.error('[Messages] Error ensuring conversation:', error.code, error.message);
    throw error;
  }
}

export async function sendDirectMessage({ conversationId, senderId, recipientId, text, voiceNote }) {
  console.log('[Messages] sendDirectMessage called:', { conversationId, senderId, recipientId, textLength: text?.length, hasVoiceNote: !!voiceNote });

  if (!conversationId || !senderId || !recipientId || !text?.trim()) {
    throw new Error('Incomplete message payload');
  }

  try {
    const participants = [senderId, recipientId];
    console.log('[Messages] Participants array:', participants);

    // Ensure conversation exists first
    console.log('[Messages] Step 1: Ensuring conversation exists...');
    await ensureConversation(conversationId, participants);

    // Small delay to ensure Firestore has processed the conversation creation
    console.log('[Messages] Step 2: Waiting 100ms for Firestore to process...');
    await new Promise(resolve => setTimeout(resolve, 100));

    // Now create the message
    console.log('[Messages] Step 3: Creating message document...');
    const messagesRef = conversationMessagesCollection(conversationId);
    const messageData = {
      senderId,
      recipientId,
      text: text.trim(),
      createdAt: serverTimestamp(),
      ...(voiceNote ? { voiceNote } : {})
    };
    console.log('[Messages] Message data:', messageData);

    await addDoc(messagesRef, messageData);
    console.log('[Messages] Message created successfully!');

    // Update last message preview
    console.log('[Messages] Step 4: Updating conversation preview...');
    const previewText = voiceNote ? '🎤 Voice Note' : text.trim().slice(0, 120);
    await updateDoc(conversationDoc(conversationId), {
      lastMessagePreview: previewText,
      updatedAt: serverTimestamp()
    }).catch((err) => {
      console.warn('[Messages] Failed to update last message preview:', err.code, err.message);
    });

    console.log('[Messages] Message sent successfully!');
  } catch (error) {
    console.error('[Messages] Error sending message:', error.code, error.message, error);
    throw error;
  }
}

export async function addReaction(conversationId, messageId, userId, emoji, remove = false) {
  try {
    const messageRef = doc(db, 'directMessages', conversationId, 'messages', messageId);

    if (remove) {
      // Remove reaction
      await updateDoc(messageRef, {
        [`reactions.${userId}`]: null
      });
      console.log('[Messages] Reaction removed:', { messageId, userId, emoji });
    } else {
      // Add reaction
      await updateDoc(messageRef, {
        [`reactions.${userId}`]: emoji
      });
      console.log('[Messages] Reaction added:', { messageId, userId, emoji });
    }
  } catch (error) {
    console.error('[Messages] Error updating reaction:', error);
    throw error;
  }
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
  }, (error) => {
    // Handle permission errors gracefully
    // This happens when the conversation document doesn't exist yet
    if (error.code === 'permission-denied') {
      console.warn('[Messages] Permission denied - conversation may not exist yet');
      callback([]);
    } else {
      console.error('[Messages] Error subscribing to messages:', error);
      callback([]);
    }
  });
  return unsubscribe;
}
