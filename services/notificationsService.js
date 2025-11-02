import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Request notification permissions from the user
 * @returns {Promise<boolean>} true if permission granted
 */
export async function requestNotificationPermissions() {
  try {
    if (!Device.isDevice) {
      console.warn('[Notifications] Not a physical device - notifications not supported');
      return false;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('[Notifications] Permission not granted');
      return false;
    }

    console.log('[Notifications] Permission granted');
    return true;
  } catch (error) {
    console.error('[Notifications] Error requesting permissions:', error);
    return false;
  }
}

/**
 * Get Expo push token for this device
 * @returns {Promise<string|null>} Expo push token or null if failed
 */
export async function getExpoPushToken() {
  try {
    if (!Device.isDevice) {
      console.warn('[Notifications] Physical device required for push notifications');
      return null;
    }

    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      return null;
    }

    // Get Expo push token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: 'b7176364-6956-455a-8d9b-231e7877ba5a',
    });

    console.log('[Notifications] Expo push token:', tokenData.data);
    return tokenData.data;
  } catch (error) {
    console.error('[Notifications] Error getting push token:', error);
    return null;
  }
}

/**
 * Configure Android notification channel
 */
export async function configureAndroidChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      sound: 'default',
    });

    // Create additional channels for different notification types
    await Notifications.setNotificationChannelAsync('posts', {
      name: 'New Posts',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 150, 150],
      lightColor: '#4B8BFF',
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('statuses', {
      name: 'Status Updates',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 150, 150],
      lightColor: '#9B5BFF',
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('social', {
      name: 'Social',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 200, 200],
      lightColor: '#FF6FA9',
      sound: 'default',
    });
  }
}

/**
 * Schedule a local notification
 * @param {Object} options - Notification options
 * @param {string} options.title - Notification title
 * @param {string} options.body - Notification body
 * @param {Object} options.data - Additional data
 * @param {number} options.delay - Delay in seconds (optional)
 * @param {string} options.channelId - Android channel ID (optional)
 */
export async function scheduleLocalNotification({
  title,
  body,
  data = {},
  delay = 0,
  channelId = 'default',
}) {
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      return null;
    }

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        categoryIdentifier: channelId,
      },
      trigger: delay > 0 ? { seconds: delay } : null,
    });

    console.log('[Notifications] Scheduled notification:', identifier);
    return identifier;
  } catch (error) {
    console.error('[Notifications] Error scheduling notification:', error);
    return null;
  }
}

/**
 * Cancel a scheduled notification
 * @param {string} identifier - Notification identifier
 */
export async function cancelNotification(identifier) {
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
    console.log('[Notifications] Cancelled notification:', identifier);
  } catch (error) {
    console.error('[Notifications] Error cancelling notification:', error);
  }
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('[Notifications] Cancelled all notifications');
  } catch (error) {
    console.error('[Notifications] Error cancelling all notifications:', error);
  }
}

/**
 * Get notification badge count
 * @returns {Promise<number>} Badge count
 */
export async function getBadgeCount() {
  try {
    const count = await Notifications.getBadgeCountAsync();
    return count;
  } catch (error) {
    console.error('[Notifications] Error getting badge count:', error);
    return 0;
  }
}

/**
 * Set notification badge count
 * @param {number} count - Badge count
 */
export async function setBadgeCount(count) {
  try {
    await Notifications.setBadgeCountAsync(count);
    console.log('[Notifications] Set badge count:', count);
  } catch (error) {
    console.error('[Notifications] Error setting badge count:', error);
  }
}

/**
 * Clear notification badge
 */
export async function clearBadge() {
  await setBadgeCount(0);
}

/**
 * Add notification received listener
 * @param {Function} handler - Handler function
 * @returns {Object} Subscription object
 */
export function addNotificationReceivedListener(handler) {
  return Notifications.addNotificationReceivedListener(handler);
}

/**
 * Add notification response listener (when user taps notification)
 * @param {Function} handler - Handler function
 * @returns {Object} Subscription object
 */
export function addNotificationResponseListener(handler) {
  return Notifications.addNotificationResponseReceivedListener(handler);
}

/**
 * Remove notification listener
 * @param {Object} subscription - Subscription object
 */
export function removeNotificationListener(subscription) {
  if (subscription) {
    subscription.remove();
  }
}
