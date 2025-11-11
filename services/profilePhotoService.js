/**
 * Profile Photo Upload Service
 * Handles uploading profile photos to Firebase Storage
 */

import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../api/firebaseClient';

/**
 * Upload profile photo to Firebase Storage
 * Converts local file URI to publicly accessible Firebase Storage URL
 *
 * @param {string} userId - User ID
 * @param {string} localUri - Local file URI from image picker
 * @returns {Promise<string>} Firebase Storage download URL
 */
export async function uploadProfilePhotoToStorage(userId, localUri) {
  try {
    console.log('[profilePhotoService] Uploading profile photo to Firebase Storage');
    console.log('[profilePhotoService] Local URI:', localUri);

    // Fetch the image from local URI
    const response = await fetch(localUri);
    const blob = await response.blob();

    // Create storage reference
    const timestamp = Date.now();
    const filename = `profile-photos/${userId}/profile-${timestamp}.jpg`;
    const storageRef = ref(storage, filename);

    // Upload to Firebase Storage
    await uploadBytes(storageRef, blob, {
      contentType: 'image/jpeg',
      customMetadata: {
        uploadedAt: new Date().toISOString(),
        userId: userId,
      },
    });

    // Get public download URL
    const downloadURL = await getDownloadURL(storageRef);
    console.log('[profilePhotoService] Upload successful:', downloadURL);

    return downloadURL;
  } catch (error) {
    console.error('[profilePhotoService] Error uploading profile photo:', error);
    throw new Error(`Failed to upload profile photo: ${error.message}`);
  }
}

/**
 * Delete old profile photo from Firebase Storage
 *
 * @param {string} photoUrl - Firebase Storage URL to delete
 * @returns {Promise<void>}
 */
export async function deleteProfilePhotoFromStorage(photoUrl) {
  try {
    // Only delete if it's a Firebase Storage URL
    if (!photoUrl || !photoUrl.includes('firebasestorage.googleapis.com')) {
      console.log('[profilePhotoService] Skipping delete - not a Firebase Storage URL');
      return;
    }

    // Extract the path from the URL
    const urlParts = photoUrl.split('/o/')[1];
    if (!urlParts) {
      console.warn('[profilePhotoService] Could not parse Storage path from URL');
      return;
    }

    const pathWithParams = urlParts.split('?')[0];
    const path = decodeURIComponent(pathWithParams);

    const storageRef = ref(storage, path);
    await deleteObject(storageRef);

    console.log('[profilePhotoService] Successfully deleted old profile photo');
  } catch (error) {
    // Don't throw error if file doesn't exist
    if (error.code === 'storage/object-not-found') {
      console.log('[profilePhotoService] Old photo already deleted or not found');
    } else {
      console.error('[profilePhotoService] Error deleting old profile photo:', error);
    }
  }
}
