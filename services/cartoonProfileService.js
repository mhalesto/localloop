/**
 * Cartoon Profile Service
 * Manages cartoon profile picture generation, usage tracking, and history
 */

import { getFirestore, doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, serverTimestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { app } from '../api/firebaseConfig';

const db = getFirestore(app);
const storage = getStorage(app);

/**
 * Get user's cartoon profile data
 * @param {string} userId - User ID
 * @returns {Promise<object>} Cartoon profile data
 */
export async function getCartoonProfileData(userId) {
  try {
    const docRef = doc(db, 'users', userId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return {
        monthlyUsage: 0,
        lifetimeUsage: 0,
        lastResetMonth: new Date().getMonth(),
        lastResetYear: new Date().getFullYear(),
        pictureHistory: [],
      };
    }

    const data = docSnap.data();
    return {
      monthlyUsage: data.cartoonMonthlyUsage || 0,
      lifetimeUsage: data.cartoonLifetimeUsage || 0,
      lastResetMonth: data.cartoonLastResetMonth || new Date().getMonth(),
      lastResetYear: data.cartoonLastResetYear || new Date().getFullYear(),
      pictureHistory: data.cartoonPictureHistory || [],
    };
  } catch (error) {
    console.error('[cartoonProfileService] Error getting data:', error);
    throw error;
  }
}

/**
 * Check and reset monthly usage if needed
 * @param {string} userId - User ID
 * @returns {Promise<object>} Updated cartoon data
 */
export async function checkAndResetMonthlyUsage(userId) {
  const data = await getCartoonProfileData(userId);
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  // Check if we need to reset monthly usage
  if (data.lastResetMonth !== currentMonth || data.lastResetYear !== currentYear) {
    const docRef = doc(db, 'users', userId);
    await updateDoc(docRef, {
      cartoonMonthlyUsage: 0,
      cartoonLastResetMonth: currentMonth,
      cartoonLastResetYear: currentYear,
    });

    return {
      ...data,
      monthlyUsage: 0,
      lastResetMonth: currentMonth,
      lastResetYear: currentYear,
    };
  }

  return data;
}

/**
 * Upload cartoon image to Firebase Storage
 * @param {string} userId - User ID
 * @param {string} imageUrl - URL of generated image (from DALL-E)
 * @param {string} styleId - Style used
 * @returns {Promise<string>} Firebase Storage URL
 */
export async function uploadCartoonToStorage(userId, imageUrl, styleId) {
  try {
    // Download image from DALL-E URL
    const response = await fetch(imageUrl);
    const blob = await response.blob();

    // Upload to Firebase Storage
    const timestamp = Date.now();
    const filename = `cartoon-profiles/${userId}/${styleId}-${timestamp}.jpg`;
    const storageRef = ref(storage, filename);

    await uploadBytes(storageRef, blob, {
      contentType: 'image/jpeg',
      customMetadata: {
        style: styleId,
        generatedAt: new Date().toISOString(),
      },
    });

    // Get download URL
    const downloadURL = await getDownloadURL(storageRef);
    console.log('[cartoonProfileService] Uploaded to Storage:', downloadURL);

    return downloadURL;
  } catch (error) {
    console.error('[cartoonProfileService] Error uploading to storage:', error);
    throw error;
  }
}

/**
 * Upload temporary custom image to Firebase Storage (Gold exclusive)
 * This image is used for custom generation and deleted after use
 * @param {string} userId - User ID
 * @param {object} imageAsset - Image asset from expo-image-picker
 * @returns {Promise<{url: string, storagePath: string}>} Public URL and storage path
 */
export async function uploadTemporaryCustomImage(userId, imageAsset) {
  try {
    console.log('[cartoonProfileService] Uploading temporary custom image');

    // Fetch the local image file
    const response = await fetch(imageAsset.uri);
    const blob = await response.blob();

    // Upload to temp folder in Firebase Storage
    const timestamp = Date.now();
    const filename = `temp-custom-images/${userId}/temp-${timestamp}.jpg`;
    const storageRef = ref(storage, filename);

    await uploadBytes(storageRef, blob, {
      contentType: 'image/jpeg',
      customMetadata: {
        temporary: 'true',
        uploadedAt: new Date().toISOString(),
      },
    });

    // Get public download URL for GPT Vision access
    const downloadURL = await getDownloadURL(storageRef);
    console.log('[cartoonProfileService] Temporary image uploaded:', downloadURL);

    return {
      url: downloadURL,
      storagePath: filename,
    };
  } catch (error) {
    console.error('[cartoonProfileService] Error uploading temporary image:', error);
    throw error;
  }
}

/**
 * Delete temporary custom image from Firebase Storage
 * @param {string} storagePath - Storage path to delete
 * @returns {Promise<void>}
 */
export async function deleteTemporaryCustomImage(storagePath) {
  try {
    if (!storagePath) return;

    console.log('[cartoonProfileService] Deleting temporary image:', storagePath);
    const storageRef = ref(storage, storagePath);
    await deleteObject(storageRef);
    console.log('[cartoonProfileService] Temporary image deleted successfully');
  } catch (error) {
    // Don't throw - just log the error as this is cleanup
    console.error('[cartoonProfileService] Error deleting temporary image:', error);
  }
}

/**
 * Record a cartoon generation and save to history
 * @param {string} userId - User ID
 * @param {string} imageUrl - Firebase Storage URL
 * @param {string} styleId - Style used
 * @param {boolean} isAdmin - Whether the user is an admin
 * @param {string} planId - User's subscription plan ('basic', 'premium', 'gold')
 * @returns {Promise<void>}
 */
export async function recordCartoonGeneration(userId, imageUrl, styleId, isAdmin = false, planId = 'basic') {
  try {
    const data = await checkAndResetMonthlyUsage(userId);
    const docRef = doc(db, 'users', userId);

    // Create history entry
    const historyEntry = {
      url: imageUrl,
      style: styleId,
      createdAt: Date.now(),
      id: `${Date.now()}-${styleId}`,
    };

    // Get current history
    let updatedHistory = [...(data.pictureHistory || [])];

    // Add new entry at the beginning
    updatedHistory.unshift(historyEntry);

    // Determine max history based on plan
    let maxHistory = 3; // Basic: 3
    if (planId === 'premium') {
      maxHistory = 5; // Premium: 5
    } else if (planId === 'gold') {
      maxHistory = 10; // Gold: 10
    }

    // Admins get unlimited history
    if (isAdmin) {
      maxHistory = 50; // Large number for admin
    }

    if (updatedHistory.length > maxHistory) {
      // Delete old images from storage before removing from history
      const toDelete = updatedHistory.slice(maxHistory);
      for (const entry of toDelete) {
        try {
          await deleteCartoonImage(entry.url);
        } catch (error) {
          console.warn('[cartoonProfileService] Failed to delete old image:', error);
        }
      }
      updatedHistory = updatedHistory.slice(0, maxHistory);
    }

    // Update Firestore - Don't increment usage counters for admins
    const updateData = {
      cartoonPictureHistory: updatedHistory,
      cartoonLastGeneratedAt: serverTimestamp(),
    };

    // Only track usage for non-admin users
    if (!isAdmin) {
      updateData.cartoonMonthlyUsage = (data.monthlyUsage || 0) + 1;
      updateData.cartoonLifetimeUsage = (data.lifetimeUsage || 0) + 1;
    }

    await updateDoc(docRef, updateData);

    console.log('[cartoonProfileService] Recorded generation, new usage:', {
      monthly: data.monthlyUsage + 1,
      lifetime: data.lifetimeUsage + 1,
    });
  } catch (error) {
    console.error('[cartoonProfileService] Error recording generation:', error);
    throw error;
  }
}

/**
 * Delete a cartoon image from storage
 * @param {string} imageUrl - Firebase Storage URL
 * @returns {Promise<void>}
 */
export async function deleteCartoonImage(imageUrl) {
  try {
    // Extract path from URL
    const url = new URL(imageUrl);
    const path = decodeURIComponent(url.pathname.split('/o/')[1]?.split('?')[0]);

    if (!path) {
      console.warn('[cartoonProfileService] Invalid URL format:', imageUrl);
      return;
    }

    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
    console.log('[cartoonProfileService] Deleted image from storage');
  } catch (error) {
    if (error.code === 'storage/object-not-found') {
      console.log('[cartoonProfileService] Image already deleted');
    } else {
      console.error('[cartoonProfileService] Error deleting image:', error);
      throw error;
    }
  }
}

/**
 * Remove a picture from user's history
 * @param {string} userId - User ID
 * @param {string} pictureId - Picture ID to remove
 * @returns {Promise<void>}
 */
export async function removePictureFromHistory(userId, pictureId) {
  try {
    const data = await getCartoonProfileData(userId);
    const pictureToRemove = data.pictureHistory.find(p => p.id === pictureId);

    if (!pictureToRemove) {
      console.warn('[cartoonProfileService] Picture not found:', pictureId);
      return;
    }

    // Delete from storage
    await deleteCartoonImage(pictureToRemove.url);

    // Remove from Firestore
    const docRef = doc(db, 'users', userId);
    const updatedHistory = data.pictureHistory.filter(p => p.id !== pictureId);

    await updateDoc(docRef, {
      cartoonPictureHistory: updatedHistory,
    });

    console.log('[cartoonProfileService] Removed picture from history');
  } catch (error) {
    console.error('[cartoonProfileService] Error removing picture:', error);
    throw error;
  }
}

/**
 * Set a cartoon as profile picture
 * @param {string} userId - User ID
 * @param {string} pictureUrl - URL of the cartoon to set
 * @returns {Promise<void>}
 */
export async function setAsProfilePicture(userId, pictureUrl) {
  try {
    const docRef = doc(db, 'users', userId);
    await updateDoc(docRef, {
      profilePhoto: pictureUrl,
      profilePhotoUpdatedAt: serverTimestamp(),
    });

    console.log('[cartoonProfileService] Set as profile picture');
  } catch (error) {
    console.error('[cartoonProfileService] Error setting profile picture:', error);
    throw error;
  }
}

/**
 * Clear all cartoon history for a user
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
export async function clearCartoonHistory(userId) {
  try {
    const data = await getCartoonProfileData(userId);

    // Delete all images from storage
    for (const entry of data.pictureHistory) {
      try {
        await deleteCartoonImage(entry.url);
      } catch (error) {
        console.warn('[cartoonProfileService] Failed to delete image:', error);
      }
    }

    // Clear history in Firestore
    const docRef = doc(db, 'users', userId);
    await updateDoc(docRef, {
      cartoonPictureHistory: [],
    });

    console.log('[cartoonProfileService] Cleared all history');
  } catch (error) {
    console.error('[cartoonProfileService] Error clearing history:', error);
    throw error;
  }
}
