const {Expo} = require("expo-server-sdk");
const admin = require("firebase-admin");

const expo = new Expo();

/**
 * Get push tokens for a user from Firestore
 * @param {string} userId - User ID
 * @return {Promise<Array>} Array of push token objects
 */
async function getUserPushTokens(userId) {
  if (!userId) {
    console.warn("[Notifications] getUserPushTokens: No userId provided");
    return [];
  }

  try {
    const userDoc = await admin.firestore().collection("users").doc(userId).get();

    if (!userDoc.exists) {
      console.warn(`[Notifications] User ${userId} not found`);
      return [];
    }

    const userData = userDoc.data();
    const pushTokens = userData.pushTokens || [];

    // Filter to only valid Expo push tokens
    return pushTokens.filter((tokenData) => {
      if (!tokenData || !tokenData.token) return false;
      return Expo.isExpoPushToken(tokenData.token);
    });
  } catch (error) {
    console.error(`[Notifications] Error getting push tokens for user ${userId}:`, error);
    return [];
  }
}

/**
 * Send push notification to a user
 * @param {string} userId - User ID to send notification to
 * @param {Object} notification - Notification details
 * @param {string} notification.title - Notification title
 * @param {string} notification.body - Notification body
 * @param {Object} notification.data - Additional data
 * @param {string} notification.channelId - Android channel ID
 * @param {number} notification.badge - Badge count
 * @return {Promise<Object>} Result object
 */
async function sendNotificationToUser(userId, notification) {
  if (!userId || !notification) {
    console.warn("[Notifications] sendNotificationToUser: Missing userId or notification");
    return {success: false, error: "Missing parameters"};
  }

  const {title, body, data = {}, channelId = "default", badge} = notification;

  if (!title || !body) {
    console.warn("[Notifications] sendNotificationToUser: Missing title or body");
    return {success: false, error: "Missing title or body"};
  }

  try {
    const tokenData = await getUserPushTokens(userId);

    if (!tokenData.length) {
      console.log(`[Notifications] No push tokens for user ${userId}`);
      return {success: true, sent: 0, message: "No push tokens available"};
    }

    // Deduplicate tokens by token string to prevent duplicate notifications
    const uniqueTokens = [];
    const seenTokens = new Set();

    for (const td of tokenData) {
      if (!seenTokens.has(td.token)) {
        seenTokens.add(td.token);
        uniqueTokens.push(td);
      }
    }

    console.log(`[Notifications] Tokens for user ${userId}: ${tokenData.length} total, ${uniqueTokens.length} unique`);

    const messages = uniqueTokens.map((td) => ({
      to: td.token,
      sound: "default",
      title,
      body,
      data,
      channelId,
      priority: "high",
      badge: badge || 1,
    }));

    // Send notifications in chunks
    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
        console.log(`[Notifications] Sent ${ticketChunk.length} notifications to user ${userId}`);
      } catch (error) {
        console.error(`[Notifications] Error sending chunk:`, error);
      }
    }

    // Check for any errors in tickets
    const errors = tickets.filter((ticket) => ticket.status === "error");
    if (errors.length > 0) {
      console.warn(`[Notifications] ${errors.length} failed tickets:`, errors);
    }

    return {
      success: true,
      sent: messages.length,
      tickets: tickets.length,
      errors: errors.length,
    };
  } catch (error) {
    console.error(`[Notifications] Error sending notification to user ${userId}:`, error);
    return {success: false, error: error.message};
  }
}

/**
 * Send notification to multiple users
 * @param {Array<string>} userIds - Array of user IDs
 * @param {Object} notification - Notification details
 * @return {Promise<Object>} Result object
 */
async function sendNotificationToUsers(userIds, notification) {
  if (!userIds || !userIds.length) {
    return {success: false, error: "No user IDs provided"};
  }

  const results = await Promise.allSettled(
      userIds.map((userId) => sendNotificationToUser(userId, notification)),
  );

  const successful = results.filter((r) => r.status === "fulfilled" && r.value.success).length;
  const failed = results.length - successful;

  return {
    success: true,
    total: userIds.length,
    successful,
    failed,
  };
}

/**
 * Clean up invalid push tokens (call this periodically or after errors)
 * @param {string} userId - User ID
 * @param {Array<Object>} receipts - Expo push notification receipts
 * @return {Promise<void>}
 */
async function cleanupInvalidTokens(userId, receipts) {
  if (!userId || !receipts || !receipts.length) return;

  try {
    const userRef = admin.firestore().collection("users").doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) return;

    const userData = userDoc.data();
    const pushTokens = userData.pushTokens || [];

    // Find tokens that should be removed
    const invalidTokens = new Set();
    for (const receipt of receipts) {
      if (receipt.status === "error") {
        // DeviceNotRegistered means the token is no longer valid
        if (receipt.details && receipt.details.error === "DeviceNotRegistered") {
          // Find the token that matches this receipt
          // This is simplified - in production you'd track which token produced which receipt
          console.log(`[Notifications] Marking token for removal due to DeviceNotRegistered`);
        }
      }
    }

    // In a real implementation, you'd remove the invalid tokens here
    // For now, we just log them
    if (invalidTokens.size > 0) {
      console.log(`[Notifications] Found ${invalidTokens.size} invalid tokens for user ${userId}`);
    }
  } catch (error) {
    console.error(`[Notifications] Error cleaning up tokens for user ${userId}:`, error);
  }
}

module.exports = {
  getUserPushTokens,
  sendNotificationToUser,
  sendNotificationToUsers,
  cleanupInvalidTokens,
};
