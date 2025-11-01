/**
 * Username Validation and Management Service
 * Handles username uniqueness checking and validation
 */

import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../api/firebaseClient';

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;
const RESERVED_USERNAMES = [
  'admin', 'moderator', 'support', 'help', 'official',
  'toilet', 'system', 'anonymous', 'deleted', 'banned',
  'user', 'test', 'demo', 'null', 'undefined'
];

/**
 * Validate username format
 */
export function validateUsernameFormat(username) {
  if (!username) {
    return { valid: false, error: 'Username is required' };
  }

  if (username.length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters' };
  }

  if (username.length > 20) {
    return { valid: false, error: 'Username must be 20 characters or less' };
  }

  if (!USERNAME_REGEX.test(username)) {
    return {
      valid: false,
      error: 'Username can only contain letters, numbers, and underscores',
    };
  }

  const lowerUsername = username.toLowerCase();
  if (RESERVED_USERNAMES.includes(lowerUsername)) {
    return { valid: false, error: 'This username is reserved' };
  }

  return { valid: true };
}

/**
 * Check if username is available
 */
export async function isUsernameAvailable(username) {
  try {
    const lowerUsername = username.toLowerCase();
    const usernameRef = doc(db, 'usernames', lowerUsername);
    const snap = await getDoc(usernameRef);
    return !snap.exists();
  } catch (error) {
    console.error('[Username] Error checking availability:', error);
    throw new Error('Failed to check username availability');
  }
}

/**
 * Reserve a username for a user
 */
export async function reserveUsername(username, userId) {
  try {
    const lowerUsername = username.toLowerCase();
    const usernameRef = doc(db, 'usernames', lowerUsername);

    // Check if already taken
    const snap = await getDoc(usernameRef);
    if (snap.exists() && snap.data().uid !== userId) {
      throw new Error('Username is already taken');
    }

    // Reserve the username
    await setDoc(usernameRef, {
      uid: userId,
      originalUsername: username,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return true;
  } catch (error) {
    console.error('[Username] Error reserving username:', error);
    throw error;
  }
}

/**
 * Release a username (when user changes username)
 */
export async function releaseUsername(username) {
  try {
    const lowerUsername = username.toLowerCase();
    const usernameRef = doc(db, 'usernames', lowerUsername);
    await deleteDoc(usernameRef);
    return true;
  } catch (error) {
    console.error('[Username] Error releasing username:', error);
    throw error;
  }
}

/**
 * Get user ID from username
 */
export async function getUserIdFromUsername(username) {
  try {
    const lowerUsername = username.toLowerCase();
    const usernameRef = doc(db, 'usernames', lowerUsername);
    const snap = await getDoc(usernameRef);

    if (!snap.exists()) {
      return null;
    }

    return snap.data().uid;
  } catch (error) {
    console.error('[Username] Error getting user ID:', error);
    return null;
  }
}

/**
 * Validate and reserve username (combined operation)
 */
export async function validateAndReserveUsername(username, userId, currentUsername = null) {
  // Validate format
  const validation = validateUsernameFormat(username);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // If username hasn't changed, no need to reserve
  if (currentUsername && username.toLowerCase() === currentUsername.toLowerCase()) {
    return true;
  }

  // Check availability
  const available = await isUsernameAvailable(username);
  if (!available) {
    throw new Error('Username is already taken');
  }

  // Release old username if changing
  if (currentUsername) {
    await releaseUsername(currentUsername);
  }

  // Reserve new username
  await reserveUsername(username, userId);

  return true;
}
