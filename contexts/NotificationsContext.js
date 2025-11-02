// contexts/NotificationsContext.js
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import {
  requestNotificationPermissions,
  getExpoPushToken,
  configureAndroidChannel,
  scheduleLocalNotification,
  cancelNotification,
  cancelAllNotifications,
  getBadgeCount,
  setBadgeCount,
  clearBadge,
  addNotificationReceivedListener,
  addNotificationResponseListener,
  removeNotificationListener,
} from '../services/notificationsService';
import { savePushToken } from '../services/userProfileService';
import { useAuth } from './AuthContext';

const NotificationsContext = createContext(null);

export function NotificationsProvider({ children }) {
  const { user } = useAuth();

  const [permissionGranted, setPermissionGranted] = useState(false);
  const [expoPushToken, setExpoPushToken] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);

  const notificationListener = useRef();
  const responseListener = useRef();

  // Initialize notifications on mount
  useEffect(() => {
    const initializeNotifications = async () => {
      try {
        console.log('[NotificationsContext] Initializing notifications...');

        // Configure Android channels
        await configureAndroidChannel();

        // Request permissions
        const hasPermission = await requestNotificationPermissions();
        setPermissionGranted(hasPermission);

        if (hasPermission) {
          // Get push token
          const token = await getExpoPushToken();
          setExpoPushToken(token);

          // Save token to Firestore if user is logged in
          if (token && user?.uid) {
            try {
              await savePushToken(user.uid, token);
              console.log('[NotificationsContext] Push token saved to Firebase');
            } catch (error) {
              console.warn('[NotificationsContext] Failed to save push token:', error);
            }
          }

          // Get initial badge count
          const count = await getBadgeCount();
          setUnreadCount(count);

          console.log('[NotificationsContext] Initialized successfully', {
            token: token?.substring(0, 20) + '...',
            badgeCount: count,
          });
        }

        setIsInitialized(true);
      } catch (error) {
        console.error('[NotificationsContext] Initialization failed:', error);
        setIsInitialized(true);
      }
    };

    initializeNotifications();
  }, [user?.uid]);

  // Set up notification listeners
  useEffect(() => {
    if (!isInitialized) return;

    // Listen for notifications received while app is foregrounded
    notificationListener.current = addNotificationReceivedListener((notification) => {
      console.log('[NotificationsContext] Notification received:', notification);

      const newNotification = {
        id: notification.request.identifier,
        title: notification.request.content.title,
        body: notification.request.content.body,
        data: notification.request.content.data,
        timestamp: Date.now(),
        read: false,
      };

      setNotifications((prev) => [newNotification, ...prev]);
      setUnreadCount((prev) => prev + 1);
      setBadgeCount(unreadCount + 1);
    });

    // Listen for user tapping on notifications
    responseListener.current = addNotificationResponseListener((response) => {
      console.log('[NotificationsContext] Notification tapped:', response);

      const notificationId = response.notification.request.identifier;
      const data = response.notification.request.content.data;

      // Mark notification as read
      markAsRead(notificationId);

      // Handle navigation based on notification type
      handleNotificationResponse(data);
    });

    return () => {
      removeNotificationListener(notificationListener.current);
      removeNotificationListener(responseListener.current);
    };
  }, [isInitialized, unreadCount]);

  const handleNotificationResponse = useCallback((data) => {
    // TODO: Integrate with navigation to handle different notification types
    // Example:
    // if (data.type === 'post') navigation.navigate('PostDetail', { postId: data.postId });
    // if (data.type === 'status') navigation.navigate('StatusDetail', { statusId: data.statusId });
    console.log('[NotificationsContext] Handle notification response:', data);
  }, []);

  const requestPermissions = useCallback(async () => {
    const hasPermission = await requestNotificationPermissions();
    setPermissionGranted(hasPermission);

    if (hasPermission) {
      const token = await getExpoPushToken();
      setExpoPushToken(token);
    }

    return hasPermission;
  }, []);

  const sendLocalNotification = useCallback(
    async ({ title, body, data = {}, delay = 0, channelId = 'default' }) => {
      if (!permissionGranted) {
        console.warn('[NotificationsContext] No permission to send notification');
        return null;
      }

      const identifier = await scheduleLocalNotification({
        title,
        body,
        data,
        delay,
        channelId,
      });

      return identifier;
    },
    [permissionGranted]
  );

  const markAsRead = useCallback(async (notificationId) => {
    setNotifications((prev) =>
      prev.map((notif) =>
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    );

    setUnreadCount((prev) => {
      const newCount = Math.max(0, prev - 1);
      setBadgeCount(newCount);
      return newCount;
    });
  }, []);

  const markAllAsRead = useCallback(async () => {
    setNotifications((prev) => prev.map((notif) => ({ ...notif, read: true })));
    setUnreadCount(0);
    await clearBadge();
  }, []);

  const clearNotifications = useCallback(async () => {
    setNotifications([]);
    setUnreadCount(0);
    await clearBadge();
    await cancelAllNotifications();
  }, []);

  const removeNotification = useCallback(async (notificationId) => {
    setNotifications((prev) => {
      const notification = prev.find((n) => n.id === notificationId);
      if (notification && !notification.read) {
        setUnreadCount((count) => {
          const newCount = Math.max(0, count - 1);
          setBadgeCount(newCount);
          return newCount;
        });
      }
      return prev.filter((n) => n.id !== notificationId);
    });

    await cancelNotification(notificationId);
  }, []);

  const updateBadgeCount = useCallback(async (count) => {
    setUnreadCount(count);
    await setBadgeCount(count);
  }, []);

  const registerPushToken = useCallback(
    async (token = expoPushToken) => {
      if (!token || !user?.uid) {
        console.warn('[NotificationsContext] Cannot register token - missing token or user');
        return false;
      }

      try {
        await savePushToken(user.uid, token);
        console.log('[NotificationsContext] Push token registered successfully:', {
          userId: user.uid,
          token: token.substring(0, 20) + '...',
        });
        return true;
      } catch (error) {
        console.error('[NotificationsContext] Failed to register push token:', error);
        return false;
      }
    },
    [expoPushToken, user?.uid]
  );

  const value = useMemo(
    () => ({
      // State
      permissionGranted,
      expoPushToken,
      notifications,
      unreadCount,
      isInitialized,

      // Methods
      requestPermissions,
      sendLocalNotification,
      markAsRead,
      markAllAsRead,
      clearNotifications,
      removeNotification,
      updateBadgeCount,
      registerPushToken,
    }),
    [
      permissionGranted,
      expoPushToken,
      notifications,
      unreadCount,
      isInitialized,
      requestPermissions,
      sendLocalNotification,
      markAsRead,
      markAllAsRead,
      clearNotifications,
      removeNotification,
      updateBadgeCount,
      registerPushToken,
    ]
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
}
