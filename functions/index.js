const functions = require("firebase-functions");
const admin = require("firebase-admin");
const {sendNotificationToUser} = require("./notificationHelper");

admin.initializeApp();

// ====================================
// POST COMMENT NOTIFICATIONS
// ====================================

/**
 * Send notification when someone comments on a post
 */
exports.onPostComment = functions.firestore
    .document("posts/{postId}/comments/{commentId}")
    .onCreate(async (snap, context) => {
      const {postId} = context.params;
      const comment = snap.data();
      const commenterUid = comment.author?.uid;

      if (!commenterUid) {
        console.log("[onPostComment] No commenter UID");
        return null;
      }

      try {
        // Get the post to find the author
        const postDoc = await admin.firestore().collection("posts").doc(postId).get();

        if (!postDoc.exists) {
          console.log(`[onPostComment] Post ${postId} not found`);
          return null;
        }

        const post = postDoc.data();
        const postAuthorUid = post.author?.uid;

        // Don't notify if commenting on own post
        if (postAuthorUid === commenterUid) {
          console.log("[onPostComment] Author commented on own post");
          return null;
        }

        if (!postAuthorUid) {
          console.log("[onPostComment] No post author UID");
          return null;
        }

        const commenterName = comment.author?.nickname || comment.author?.displayName || "Someone";
        const commentText = (comment.message || "").substring(0, 100);

        await sendNotificationToUser(postAuthorUid, {
          title: `${commenterName} commented on your post`,
          body: commentText,
          data: {
            type: "post_comment",
            postId: postId,
            commentId: snap.id,
            screen: "PostThread",
          },
          channelId: "social",
        });

        console.log(`[onPostComment] Sent notification to ${postAuthorUid}`);
        return null;
      } catch (error) {
        console.error("[onPostComment] Error:", error);
        return null;
      }
    });

// ====================================
// STATUS REPLY NOTIFICATIONS
// ====================================

/**
 * Send notification when someone replies to a status
 */
exports.onStatusReply = functions.firestore
    .document("statuses/{statusId}/replies/{replyId}")
    .onCreate(async (snap, context) => {
      const {statusId} = context.params;
      const reply = snap.data();
      const replierUid = reply.author?.uid;

      if (!replierUid) {
        console.log("[onStatusReply] No replier UID");
        return null;
      }

      try {
        // Get the status to find the author
        const statusDoc = await admin.firestore().collection("statuses").doc(statusId).get();

        if (!statusDoc.exists) {
          console.log(`[onStatusReply] Status ${statusId} not found`);
          return null;
        }

        const status = statusDoc.data();
        const statusAuthorUid = status.author?.uid;

        // Don't notify if replying to own status
        if (statusAuthorUid === replierUid) {
          console.log("[onStatusReply] Author replied to own status");
          return null;
        }

        if (!statusAuthorUid) {
          console.log("[onStatusReply] No status author UID");
          return null;
        }

        const replierName = reply.author?.nickname || reply.author?.displayName || "Someone";
        const replyText = (reply.message || "").substring(0, 100);

        await sendNotificationToUser(statusAuthorUid, {
          title: `${replierName} replied to your status`,
          body: replyText,
          data: {
            type: "status_reply",
            statusId: statusId,
            replyId: snap.id,
            screen: "StatusDetail",
          },
          channelId: "social",
        });

        console.log(`[onStatusReply] Sent notification to ${statusAuthorUid}`);
        return null;
      } catch (error) {
        console.error("[onStatusReply] Error:", error);
        return null;
      }
    });

// ====================================
// FOLLOWER NOTIFICATIONS
// ====================================

/**
 * Send notification when someone follows you
 */
exports.onNewFollower = functions.firestore
    .document("followers/{userId}/following/{followerId}")
    .onCreate(async (snap, context) => {
      const {userId} = context.params; // Person being followed
      const followerData = snap.data();
      const followerId = followerData.followerId || context.params.followerId;

      if (!followerId) {
        console.log("[onNewFollower] No follower ID");
        return null;
      }

      try {
        // Get follower's profile
        const followerDoc = await admin.firestore().collection("users").doc(followerId).get();

        if (!followerDoc.exists) {
          console.log(`[onNewFollower] Follower ${followerId} not found`);
          return null;
        }

        const follower = followerDoc.data();
        const followerName = follower.nickname || follower.displayName || "Someone";

        await sendNotificationToUser(userId, {
          title: "New Follower",
          body: `${followerName} started following you`,
          data: {
            type: "new_follower",
            followerId: followerId,
            screen: "PublicProfile",
            userId: followerId,
          },
          channelId: "social",
        });

        console.log(`[onNewFollower] Sent notification to ${userId}`);
        return null;
      } catch (error) {
        console.error("[onNewFollower] Error:", error);
        return null;
      }
    });

// ====================================
// POST REACTION NOTIFICATIONS
// ====================================

/**
 * Send notification when someone reacts to your post
 * Triggered on post update when reactions change
 */
exports.onPostReaction = functions.firestore
    .document("posts/{postId}")
    .onUpdate(async (change, context) => {
      const {postId} = context.params;
      const before = change.before.data();
      const after = change.after.data();

      const postAuthorUid = after.author?.uid;
      if (!postAuthorUid) return null;

      try {
        const beforeReactions = before.reactions || {};
        const afterReactions = after.reactions || {};

        // Check if reactions increased
        const beforeTotal = Object.values(beforeReactions).reduce(
            (sum, r) => sum + Object.keys(r.reactors || {}).length,
            0,
        );
        const afterTotal = Object.values(afterReactions).reduce(
            (sum, r) => sum + Object.keys(r.reactors || {}).length,
            0,
        );

        if (afterTotal <= beforeTotal) return null;

        // Find who reacted (simplified - gets the most recent reactor)
        let reactorUid = null;
        let emoji = null;

        for (const [emojiKey, reactionData] of Object.entries(afterReactions)) {
          const reactors = reactionData.reactors || {};
          for (const [uid] of Object.entries(reactors)) {
            if (!beforeReactions[emojiKey]?.reactors?.[uid]) {
              reactorUid = uid;
              emoji = emojiKey;
              break;
            }
          }
          if (reactorUid) break;
        }

        // Don't notify if reacting to own post
        if (!reactorUid || reactorUid === postAuthorUid) return null;

        // Get reactor's profile
        const reactorDoc = await admin.firestore().collection("users").doc(reactorUid).get();
        const reactorName = reactorDoc.exists ?
          (reactorDoc.data().nickname || reactorDoc.data().displayName || "Someone") :
          "Someone";

        await sendNotificationToUser(postAuthorUid, {
          title: `${reactorName} reacted to your post`,
          body: `${emoji || "👍"} ${(after.message || "").substring(0, 50)}`,
          data: {
            type: "post_reaction",
            postId: postId,
            screen: "PostThread",
          },
          channelId: "social",
        });

        console.log(`[onPostReaction] Sent notification to ${postAuthorUid}`);
        return null;
      } catch (error) {
        console.error("[onPostReaction] Error:", error);
        return null;
      }
    });

// ====================================
// STATUS REACTION NOTIFICATIONS
// ====================================

/**
 * Send notification when someone reacts to your status
 */
exports.onStatusReaction = functions.firestore
    .document("statuses/{statusId}")
    .onUpdate(async (change, context) => {
      const {statusId} = context.params;
      const before = change.before.data();
      const after = change.after.data();

      const statusAuthorUid = after.author?.uid;
      if (!statusAuthorUid) return null;

      try {
        const beforeReactions = before.reactions || {};
        const afterReactions = after.reactions || {};

        const beforeTotal = Object.values(beforeReactions).reduce(
            (sum, r) => sum + Object.keys(r.reactors || {}).length,
            0,
        );
        const afterTotal = Object.values(afterReactions).reduce(
            (sum, r) => sum + Object.keys(r.reactors || {}).length,
            0,
        );

        if (afterTotal <= beforeTotal) return null;

        // Find who reacted
        let reactorUid = null;
        let emoji = null;

        for (const [emojiKey, reactionData] of Object.entries(afterReactions)) {
          const reactors = reactionData.reactors || {};
          for (const [uid] of Object.entries(reactors)) {
            if (!beforeReactions[emojiKey]?.reactors?.[uid]) {
              reactorUid = uid;
              emoji = emojiKey;
              break;
            }
          }
          if (reactorUid) break;
        }

        if (!reactorUid || reactorUid === statusAuthorUid) return null;

        const reactorDoc = await admin.firestore().collection("users").doc(reactorUid).get();
        const reactorName = reactorDoc.exists ?
          (reactorDoc.data().nickname || reactorDoc.data().displayName || "Someone") :
          "Someone";

        await sendNotificationToUser(statusAuthorUid, {
          title: `${reactorName} reacted to your status`,
          body: `${emoji || "👍"} ${(after.message || "").substring(0, 50)}`,
          data: {
            type: "status_reaction",
            statusId: statusId,
            screen: "StatusDetail",
          },
          channelId: "social",
        });

        console.log(`[onStatusReaction] Sent notification to ${statusAuthorUid}`);
        return null;
      } catch (error) {
        console.error("[onStatusReaction] Error:", error);
        return null;
      }
    });

// ====================================
// ACHIEVEMENT NOTIFICATIONS
// ====================================

/**
 * Send notification when user reaches engagement milestones
 */
exports.onEngagementMilestone = functions.firestore
    .document("users/{userId}")
    .onUpdate(async (change, context) => {
      const {userId} = context.params;
      const before = change.before.data();
      const after = change.after.data();

      const beforePoints = before.engagementPoints || 0;
      const afterPoints = after.engagementPoints || 0;

      if (afterPoints <= beforePoints) return null;

      try {
        // Define milestones
        const milestones = [10, 50, 100, 250, 500, 1000, 2500, 5000];

        // Check if crossed a milestone
        const crossedMilestone = milestones.find(
            (milestone) => beforePoints < milestone && afterPoints >= milestone,
        );

        if (!crossedMilestone) return null;

        let title = "Achievement Unlocked!";
        let body = "";

        switch (crossedMilestone) {
          case 10:
            title = "🎉 First Steps!";
            body = "You've earned 10 engagement points!";
            break;
          case 50:
            title = "🌟 Getting Active!";
            body = "50 engagement points unlocked!";
            break;
          case 100:
            title = "🔥 On Fire!";
            body = "100 engagement points! Keep it up!";
            break;
          case 250:
            title = "💎 Community Builder!";
            body = "250 points! You're a valued community member!";
            break;
          case 500:
            title = "👑 Local Legend!";
            body = "500 points! You're making a real impact!";
            break;
          case 1000:
            title = "⭐ Superstar!";
            body = "1,000 points! Incredible engagement!";
            break;
          case 2500:
            title = "🚀 Community Champion!";
            body = "2,500 points! You're unstoppable!";
            break;
          case 5000:
            title = "🏆 Local Hero!";
            body = "5,000 points! You're a legend!";
            break;
        }

        await sendNotificationToUser(userId, {
          title,
          body,
          data: {
            type: "achievement",
            milestone: crossedMilestone,
            points: afterPoints,
            screen: "Profile",
          },
          channelId: "default",
        });

        console.log(`[onEngagementMilestone] Sent milestone notification to ${userId}`);
        return null;
      } catch (error) {
        console.error("[onEngagementMilestone] Error:", error);
        return null;
      }
    });

// ====================================
// NEARBY POST NOTIFICATIONS (Optional)
// ====================================

/**
 * Notify users when a new post appears in their area
 * Note: This can be noisy, so it's commented out by default
 * You can enable it and add user preferences for notification frequency
 */
/*
exports.onNewNearbyPost = functions.firestore
    .document("posts/{postId}")
    .onCreate(async (snap, context) => {
      const post = snap.data();
      const {country, province, city} = post.location || {};

      if (!city) return null;

      try {
        // Query users in the same city who have notification preferences enabled
        const usersSnapshot = await admin.firestore()
            .collection("users")
            .where("city", "==", city)
            .where("country", "==", country)
            .limit(50) // Limit to prevent spam
            .get();

        const authorUid = post.author?.uid;
        const authorName = post.author?.nickname || post.author?.displayName || "Someone";

        // Send to users (except the post author)
        const notifications = [];
        usersSnapshot.forEach((doc) => {
          if (doc.id !== authorUid) {
            notifications.push(
                sendNotificationToUser(doc.id, {
                  title: `New post in ${city}`,
                  body: `${authorName}: ${(post.message || "").substring(0, 80)}`,
                  data: {
                    type: "nearby_post",
                    postId: snap.id,
                    screen: "PostThread",
                  },
                  channelId: "posts",
                }),
            );
          }
        });

        await Promise.allSettled(notifications);
        console.log(`[onNewNearbyPost] Sent ${notifications.length} notifications`);
        return null;
      } catch (error) {
        console.error("[onNewNearbyPost] Error:", error);
        return null;
      }
    });
*/
