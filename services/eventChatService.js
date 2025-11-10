/**
 * Event Chat Service
 * Manages group chats for event attendees
 *
 * DATA MODEL:
 *
 * 1. Event Chats:
 *    eventChats/{eventId}
 *    - eventId: string
 *    - eventTitle: string
 *    - organizerId: string
 *    - organizerName: string
 *    - participants: [userId1, userId2, ...] (accepted attendees)
 *    - createdAt: timestamp
 *    - lastMessageAt: timestamp | null
 *    - lastMessage: string | null (preview)
 *    - lastMessageBy: string | null (userName)
 *
 * 2. Chat Messages (Subcollection):
 *    eventChats/{eventId}/messages/{messageId}
 *    - userId: string
 *    - userName: string
 *    - userPhoto: string | null
 *    - message: string
 *    - timestamp: timestamp
 *    - type: 'message' | 'system' (for join/leave/kick notifications)
 */

import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../api/firebaseClient';

const EVENT_CHATS_COLLECTION = 'eventChats';
const MESSAGES_SUBCOLLECTION = 'messages';
const USERS_COLLECTION = 'users';

/**
 * Create or get event chat
 */
export async function createEventChat(eventId, eventTitle, organizerId, organizerName) {
  try {
    const chatRef = doc(db, EVENT_CHATS_COLLECTION, eventId);
    const chatSnap = await getDoc(chatRef);

    if (chatSnap.exists()) {
      return {
        id: chatSnap.id,
        ...chatSnap.data(),
      };
    }

    const chatData = {
      eventId,
      eventTitle,
      organizerId,
      organizerName,
      participants: [organizerId], // Organizer is always a participant
      createdAt: serverTimestamp(),
      lastMessageAt: null,
      lastMessage: null,
      lastMessageBy: null,
    };

    await setDoc(chatRef, chatData);

    // Add to user's event chats
    const userRef = doc(db, USERS_COLLECTION, organizerId);
    await updateDoc(userRef, {
      eventChats: arrayUnion(eventId),
    });

    return {
      id: eventId,
      ...chatData,
      createdAt: Date.now(),
    };
  } catch (error) {
    console.error('[EventChatService] Error creating event chat:', error);
    throw new Error('Failed to create event chat');
  }
}

/**
 * Add participant to event chat (when RSVP is accepted)
 */
export async function addParticipant(eventId, userId, userName) {
  try {
    const chatRef = doc(db, EVENT_CHATS_COLLECTION, eventId);
    const chatSnap = await getDoc(chatRef);

    if (!chatSnap.exists()) {
      throw new Error('Event chat not found');
    }

    // Add participant
    await updateDoc(chatRef, {
      participants: arrayUnion(userId),
    });

    // Add to user's event chats
    const userRef = doc(db, USERS_COLLECTION, userId);
    await updateDoc(userRef, {
      eventChats: arrayUnion(eventId),
    });

    // Send system message about join
    await sendSystemMessage(
      eventId,
      `${userName} joined the event`,
      'join'
    );

    return { success: true };
  } catch (error) {
    console.error('[EventChatService] Error adding participant:', error);
    throw new Error('Failed to add participant to chat');
  }
}

/**
 * Remove participant from event chat (leave or kick)
 */
export async function removeParticipant(eventId, userId, userName, reason = 'left') {
  try {
    const chatRef = doc(db, EVENT_CHATS_COLLECTION, eventId);

    // Remove participant
    await updateDoc(chatRef, {
      participants: arrayRemove(userId),
    });

    // Remove from user's event chats
    const userRef = doc(db, USERS_COLLECTION, userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const userData = userSnap.data();
      const updatedChats = (userData.eventChats || []).filter(id => id !== eventId);

      await updateDoc(userRef, {
        eventChats: updatedChats,
      });
    }

    // Send system message about leave/kick
    const message = reason === 'kicked'
      ? `${userName} was removed from the event`
      : `${userName} left the event`;

    await sendSystemMessage(eventId, message, 'leave');

    return { success: true };
  } catch (error) {
    console.error('[EventChatService] Error removing participant:', error);
    throw new Error('Failed to remove participant from chat');
  }
}

/**
 * Send a message to event chat
 */
export async function sendMessage(eventId, userId, userName, userPhoto, messageText) {
  try {
    const messagesRef = collection(db, EVENT_CHATS_COLLECTION, eventId, MESSAGES_SUBCOLLECTION);

    const messageData = {
      userId,
      userName,
      userPhoto,
      message: messageText,
      timestamp: serverTimestamp(),
      type: 'message',
    };

    await addDoc(messagesRef, messageData);

    // Update chat's last message info
    const chatRef = doc(db, EVENT_CHATS_COLLECTION, eventId);
    await updateDoc(chatRef, {
      lastMessageAt: serverTimestamp(),
      lastMessage: messageText.length > 100 ? `${messageText.substring(0, 100)}...` : messageText,
      lastMessageBy: userName,
    });

    return {
      ...messageData,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error('[EventChatService] Error sending message:', error);
    throw new Error('Failed to send message');
  }
}

/**
 * Send a system message (join/leave/kick)
 */
async function sendSystemMessage(eventId, messageText, actionType) {
  try {
    const messagesRef = collection(db, EVENT_CHATS_COLLECTION, eventId, MESSAGES_SUBCOLLECTION);

    const messageData = {
      userId: 'system',
      userName: 'System',
      userPhoto: null,
      message: messageText,
      timestamp: serverTimestamp(),
      type: 'system',
      actionType,
    };

    await addDoc(messagesRef, messageData);

    // Update chat's last message info
    const chatRef = doc(db, EVENT_CHATS_COLLECTION, eventId);
    await updateDoc(chatRef, {
      lastMessageAt: serverTimestamp(),
      lastMessage: messageText,
      lastMessageBy: 'System',
    });

    return true;
  } catch (error) {
    console.error('[EventChatService] Error sending system message:', error);
    return false;
  }
}

/**
 * Get chat messages with real-time listener
 */
export function subscribeToMessages(eventId, callback, messageLimit = 50) {
  try {
    const messagesRef = collection(db, EVENT_CHATS_COLLECTION, eventId, MESSAGES_SUBCOLLECTION);
    const q = query(
      messagesRef,
      orderBy('timestamp', 'desc'),
      limit(messageLimit)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messages = [];
      snapshot.forEach((doc) => {
        messages.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      // Reverse to show oldest first
      callback(messages.reverse());
    });

    return unsubscribe;
  } catch (error) {
    console.error('[EventChatService] Error subscribing to messages:', error);
    return () => {}; // Return empty unsubscribe function
  }
}

/**
 * Get event chat info
 */
export async function getEventChat(eventId) {
  try {
    const chatRef = doc(db, EVENT_CHATS_COLLECTION, eventId);
    const chatSnap = await getDoc(chatRef);

    if (!chatSnap.exists()) {
      return null;
    }

    return {
      id: chatSnap.id,
      ...chatSnap.data(),
    };
  } catch (error) {
    console.error('[EventChatService] Error getting event chat:', error);
    return null;
  }
}

/**
 * Get user's event chats
 */
export async function getUserEventChats(userId) {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return [];
    }

    const eventChatIds = userSnap.data().eventChats || [];

    if (eventChatIds.length === 0) {
      return [];
    }

    // Get all event chats
    const chats = [];
    for (const eventId of eventChatIds) {
      const chat = await getEventChat(eventId);
      if (chat) {
        chats.push(chat);
      }
    }

    // Sort by last message time
    chats.sort((a, b) => {
      const timeA = a.lastMessageAt?.seconds || 0;
      const timeB = b.lastMessageAt?.seconds || 0;
      return timeB - timeA;
    });

    return chats;
  } catch (error) {
    console.error('[EventChatService] Error getting user event chats:', error);
    return [];
  }
}

/**
 * Check if user is participant in event chat
 */
export async function isParticipant(eventId, userId) {
  try {
    const chat = await getEventChat(eventId);
    if (!chat) {
      return false;
    }

    return chat.participants.includes(userId);
  } catch (error) {
    console.error('[EventChatService] Error checking participant status:', error);
    return false;
  }
}

/**
 * Get participants count
 */
export async function getParticipantsCount(eventId) {
  try {
    const chat = await getEventChat(eventId);
    if (!chat) {
      return 0;
    }

    return chat.participants.length;
  } catch (error) {
    console.error('[EventChatService] Error getting participants count:', error);
    return 0;
  }
}

/**
 * Delete event chat (when event is deleted)
 */
export async function deleteEventChat(eventId) {
  try {
    const chatRef = doc(db, EVENT_CHATS_COLLECTION, eventId);
    const chatSnap = await getDoc(chatRef);

    if (!chatSnap.exists()) {
      return { success: true };
    }

    const participants = chatSnap.data().participants || [];

    // Remove from all participants' event chats
    for (const userId of participants) {
      const userRef = doc(db, USERS_COLLECTION, userId);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        const updatedChats = (userData.eventChats || []).filter(id => id !== eventId);

        await updateDoc(userRef, {
          eventChats: updatedChats,
        });
      }
    }

    // Delete all messages
    const messagesRef = collection(db, EVENT_CHATS_COLLECTION, eventId, MESSAGES_SUBCOLLECTION);
    const messagesSnap = await getDocs(messagesRef);

    const deletePromises = [];
    messagesSnap.forEach((doc) => {
      deletePromises.push(deleteDoc(doc.ref));
    });

    await Promise.all(deletePromises);

    // Delete chat document
    await deleteDoc(chatRef);

    return { success: true };
  } catch (error) {
    console.error('[EventChatService] Error deleting event chat:', error);
    throw new Error('Failed to delete event chat');
  }
}
