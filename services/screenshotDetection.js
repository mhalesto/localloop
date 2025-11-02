import { useEffect, useCallback } from 'react';
import * as ScreenCapture from 'expo-screen-capture';
import { Alert, Platform } from 'react-native';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../api/firebaseClient';

/**
 * Hook to detect screenshots and optionally prevent them
 * @param {Object} options
 * @param {Function} options.onScreenshot - Callback when screenshot is detected
 * @param {boolean} options.preventScreenshots - Whether to prevent screenshots (Android only)
 * @param {string} options.contentId - ID of the content being viewed (post, status, message, etc.)
 * @param {string} options.contentType - Type of content (post, status, message)
 * @param {string} options.contentOwnerId - UID of content owner
 * @param {string} options.currentUserId - UID of current user
 */
export function useScreenshotDetection({
  onScreenshot,
  preventScreenshots = false,
  contentId,
  contentType,
  contentOwnerId,
  currentUserId,
}) {
  const handleScreenshot = useCallback(async () => {
    console.log('[ScreenshotDetection] Screenshot detected!');

    // Log to Firestore
    if (contentId && contentType && contentOwnerId && currentUserId) {
      try {
        await addDoc(collection(db, 'screenshotEvents'), {
          contentId,
          contentType,
          contentOwnerId,
          screenshotterId: currentUserId,
          timestamp: serverTimestamp(),
          platform: Platform.OS,
        });

        // Optionally notify content owner
        if (contentOwnerId !== currentUserId) {
          await addDoc(collection(db, 'notifications'), {
            userId: contentOwnerId,
            type: 'screenshot_taken',
            contentId,
            contentType,
            actorId: currentUserId,
            createdAt: serverTimestamp(),
            read: false,
          });
        }
      } catch (error) {
        console.error('[ScreenshotDetection] Failed to log screenshot:', error);
      }
    }

    // Call custom callback
    if (onScreenshot) {
      onScreenshot();
    }

    // Show alert to user (optional)
    Alert.alert(
      'Screenshot Detected',
      'The content owner has been notified that you took a screenshot.',
      [{ text: 'OK' }]
    );
  }, [contentId, contentType, contentOwnerId, currentUserId, onScreenshot]);

  useEffect(() => {
    let subscription = null;

    const setup = async () => {
      // Add screenshot listener
      subscription = ScreenCapture.addScreenshotListener(handleScreenshot);

      // Prevent screenshots if enabled (Android only)
      if (preventScreenshots && Platform.OS === 'android') {
        try {
          await ScreenCapture.preventScreenCaptureAsync();
          console.log('[ScreenshotDetection] Screenshot prevention enabled');
        } catch (error) {
          console.warn('[ScreenshotDetection] Failed to prevent screenshots:', error);
        }
      }
    };

    setup();

    return () => {
      // Remove listener
      if (subscription) {
        subscription.remove();
      }

      // Re-allow screenshots (Android only)
      if (preventScreenshots && Platform.OS === 'android') {
        ScreenCapture.allowScreenCaptureAsync().catch((error) => {
          console.warn('[ScreenshotDetection] Failed to allow screenshots:', error);
        });
      }
    };
  }, [handleScreenshot, preventScreenshots]);
}

/**
 * Check if screenshot prevention is supported
 */
export async function hasScreenshotPermissions() {
  if (Platform.OS !== 'android') {
    return false;
  }

  try {
    // Check if we can prevent screenshots
    const hasPermission = await ScreenCapture.isAvailableAsync();
    return hasPermission;
  } catch (error) {
    console.error('[ScreenshotDetection] Error checking permissions:', error);
    return false;
  }
}

/**
 * Get screenshot events for a specific content
 */
export async function getScreenshotEvents(contentId) {
  try {
    const { getDocs, query, where, orderBy, collection } = await import('firebase/firestore');
    const q = query(
      collection(db, 'screenshotEvents'),
      where('contentId', '==', contentId),
      orderBy('timestamp', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('[ScreenshotDetection] Failed to get screenshot events:', error);
    return [];
  }
}
