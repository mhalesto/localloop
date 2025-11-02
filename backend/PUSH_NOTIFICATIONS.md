# Push Notifications Implementation Guide

This guide explains how to send push notifications to users using Expo's Push Notification service.

## Overview

The frontend app automatically:
- Requests notification permissions on startup
- Obtains Expo push tokens
- Saves tokens to Firestore (`users/{userId}/pushTokens` array)
- Listens for incoming notifications
- Handles notification taps

## User Push Tokens Storage

Push tokens are stored in the `users` collection in Firestore:

```javascript
{
  userId: "abc123",
  pushTokens: [
    {
      token: "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
      platform: "ios",
      updatedAt: 1234567890
    },
    {
      token: "ExponentPushToken[yyyyyyyyyyyyyyyyyyyyyy]",
      platform: "android",
      updatedAt: 1234567891
    }
  ],
  lastPushTokenUpdate: Timestamp
}
```

## Sending Push Notifications from Backend

### 1. Install Expo Server SDK

```bash
npm install expo-server-sdk
```

### 2. Example: Send Notification to a User

```javascript
import { Expo } from 'expo-server-sdk';
import { getUserPushTokens } from '../services/userProfileService';

const expo = new Expo();

async function sendPushNotification(userId, notification) {
  // Get user's push tokens from Firestore
  const userTokens = await getUserPushTokens(userId);

  // Extract valid Expo push tokens
  const messages = [];
  for (const tokenData of userTokens) {
    const { token } = tokenData;

    // Check if token is valid
    if (!Expo.isExpoPushToken(token)) {
      console.warn(`Invalid push token: ${token}`);
      continue;
    }

    messages.push({
      to: token,
      sound: 'default',
      title: notification.title,
      body: notification.body,
      data: notification.data || {},
      channelId: notification.channelId || 'default', // Android channel
      priority: 'high',
      badge: notification.badge || 1,
    });
  }

  // Send notifications in chunks
  const chunks = expo.chunkPushNotifications(messages);
  const tickets = [];

  for (const chunk of chunks) {
    try {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    } catch (error) {
      console.error('Error sending push notifications:', error);
    }
  }

  return tickets;
}
```

### 3. Example: Notify User of New Post

```javascript
async function notifyNewPost(userId, post) {
  await sendPushNotification(userId, {
    title: 'New Post in Your Area',
    body: post.message.substring(0, 100),
    data: {
      type: 'post',
      postId: post.id,
      screen: 'PostThread',
    },
    channelId: 'posts',
    badge: 1,
  });
}
```

### 4. Example: Notify User of Status Reply

```javascript
async function notifyStatusReply(userId, status, reply) {
  await sendPushNotification(userId, {
    title: `${reply.author.nickname} replied to your status`,
    body: reply.message,
    data: {
      type: 'status',
      statusId: status.id,
      screen: 'StatusDetail',
    },
    channelId: 'social',
    badge: 1,
  });
}
```

### 5. Handle Push Receipts

It's important to check receipts to detect failed deliveries:

```javascript
async function checkPushReceipts(tickets) {
  const receiptIds = tickets
    .filter(ticket => ticket.id)
    .map(ticket => ticket.id);

  const receiptIdChunks = expo.chunkPushNotificationReceiptIds(receiptIds);

  for (const chunk of receiptIdChunks) {
    try {
      const receipts = await expo.getPushNotificationReceiptsAsync(chunk);

      for (const receiptId in receipts) {
        const receipt = receipts[receiptId];

        if (receipt.status === 'error') {
          console.error('Push notification error:', {
            receiptId,
            message: receipt.message,
            details: receipt.details,
          });

          // Handle errors:
          // - DeviceNotRegistered: Remove token from database
          // - MessageTooBig: Reduce notification size
          // - MessageRateExceeded: Implement rate limiting
        }
      }
    } catch (error) {
      console.error('Error fetching push receipts:', error);
    }
  }
}
```

## Notification Channels (Android)

The app has pre-configured Android notification channels:

- **default**: General notifications (HIGH importance)
- **posts**: New posts nearby (DEFAULT importance)
- **statuses**: Status updates (DEFAULT importance)
- **social**: Social interactions - likes, replies, follows (HIGH importance)

Use the `channelId` parameter when sending notifications to route them to the appropriate channel.

## Testing Push Notifications

### Using Expo Push Tool

Test push notifications manually: https://expo.dev/notifications

1. Get a user's push token from Firestore
2. Enter the token in the Expo Push Tool
3. Send a test notification

### Example Test Notification

```json
{
  "to": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "title": "Test Notification",
  "body": "This is a test from Expo Push Tool",
  "data": {
    "type": "test"
  }
}
```

## Frontend Integration

The app handles notification taps in `contexts/NotificationsContext.js`:

```javascript
// When user taps notification
responseListener.current = addNotificationResponseListener((response) => {
  const data = response.notification.request.content.data;

  // Navigate based on notification type
  if (data.type === 'post') {
    navigation.navigate('PostThread', { postId: data.postId });
  } else if (data.type === 'status') {
    navigation.navigate('StatusDetail', { statusId: data.statusId });
  }
});
```

To add new notification types, update the `handleNotificationResponse` function.

## Best Practices

1. **Rate Limiting**: Don't send too many notifications to the same user
2. **Batching**: Use Expo's chunking for bulk sends
3. **Error Handling**: Remove invalid tokens from database
4. **Quiet Hours**: Respect user's timezone and don't send notifications late at night
5. **Personalization**: Include relevant user data in notification content
6. **Deep Linking**: Always include navigation data so users can tap to view content

## Security

- Push tokens are stored securely in Firestore
- Only authenticated backend functions should send notifications
- Validate user permissions before sending sensitive notifications
- Don't include sensitive data in notification body (visible on lock screen)

## Useful Links

- [Expo Push Notifications](https://docs.expo.dev/push-notifications/overview/)
- [Expo Server SDK](https://github.com/expo/expo-server-sdk-node)
- [Firebase Cloud Functions](https://firebase.google.com/docs/functions)
