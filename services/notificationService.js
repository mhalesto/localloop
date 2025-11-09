/**
 * Notification Service
 * Handles local notifications for cartoon generation completion
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Request notification permissions from the user
 * @returns {Promise<boolean>} true if permission granted
 */
export async function requestNotificationPermission() {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return false;
    }

    // For Android, configure channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('cartoon-generation', {
        name: 'Cartoon Generation',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6C4DF4',
      });
    }

    return true;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
}

/**
 * Schedule a local notification for cartoon generation completion
 * @param {string} style - The cartoon style that was generated
 * @returns {Promise<string>} notification identifier
 */
export async function scheduleCartoonReadyNotification(style = 'cartoon') {
  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '✨ Your Cartoon Avatar is Ready!',
        body: `Your ${style} style cartoon has been generated. Tap to view your new avatar!`,
        data: { type: 'cartoon-ready', style },
        sound: true,
      },
      trigger: null, // null means immediate delivery
    });

    return notificationId;
  } catch (error) {
    console.error('Error scheduling notification:', error);
    return null;
  }
}

/**
 * Cancel all pending cartoon notifications
 */
export async function cancelCartoonNotifications() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Error canceling notifications:', error);
  }
}

/**
 * Check if notifications are enabled
 * @returns {Promise<boolean>}
 */
export async function areNotificationsEnabled() {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error checking notification status:', error);
    return false;
  }
}
