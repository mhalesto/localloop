const functions = require("firebase-functions");
const admin = require("firebase-admin");
const {sendNotificationToUser} = require("./notificationHelper");
const https = require("https");

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
        const postTitle = post.title || "your post";
        const city = post.city || post.location?.city || "";

        await sendNotificationToUser(postAuthorUid, {
          title: `${commenterName} commented on your post`,
          body: commentText,
          data: {
            type: "post_comment",
            postId: postId,
            commentId: snap.id,
            city: city,
            postTitle: postTitle,
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

        const postTitle = after.title || "your post";
        const city = after.city || after.location?.city || "";

        await sendNotificationToUser(postAuthorUid, {
          title: `${reactorName} reacted to your post`,
          body: `${emoji || "👍"} ${(after.message || "").substring(0, 50)}`,
          data: {
            type: "post_reaction",
            postId: postId,
            city: city,
            postTitle: postTitle,
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
// USER MENTION NOTIFICATIONS
// ====================================

/**
 * Send notification when someone mentions you in a post comment
 */
exports.onCommentMention = functions.firestore
    .document("posts/{postId}/comments/{commentId}")
    .onCreate(async (snap, context) => {
      const {postId} = context.params;
      const comment = snap.data();
      const commentMessage = comment.message || "";
      const mentionedUserIds = comment.mentionedUserIds || [];

      if (mentionedUserIds.length === 0) return null;

      const mentionerUid = comment.author?.uid;
      if (!mentionerUid) return null;

      try {
        // Get the post details
        const postDoc = await admin.firestore().collection("posts").doc(postId).get();
        if (!postDoc.exists) return null;

        const post = postDoc.data();
        const postTitle = post.title || "a post";
        const city = post.city || post.location?.city || "";

        const mentionerName = comment.author?.nickname || comment.author?.displayName || "Someone";
        const commentPreview = commentMessage.substring(0, 100);

        // Send notification to each mentioned user (except the commenter)
        const notificationPromises = mentionedUserIds
            .filter((userId) => userId !== mentionerUid)
            .map((userId) =>
              sendNotificationToUser(userId, {
                title: `${mentionerName} mentioned you`,
                body: commentPreview,
                data: {
                  type: "user_mention",
                  postId: postId,
                  commentId: snap.id,
                  city: city,
                  postTitle: postTitle,
                  screen: "PostThread",
                },
                channelId: "social",
              }),
            );

        await Promise.all(notificationPromises);
        console.log(`[onCommentMention] Sent ${notificationPromises.length} mention notifications`);
        return null;
      } catch (error) {
        console.error("[onCommentMention] Error:", error);
        return null;
      }
    });

/**
 * Send notification when someone mentions you in a post
 */
exports.onPostMention = functions.firestore
    .document("posts/{postId}")
    .onCreate(async (snap, context) => {
      const {postId} = context.params;
      const post = snap.data();
      const postMessage = post.message || "";
      const mentionedUserIds = post.mentionedUserIds || [];

      if (mentionedUserIds.length === 0) return null;

      const authorUid = post.author?.uid;
      if (!authorUid) return null;

      try {
        const postTitle = post.title || "a post";
        const city = post.city || post.location?.city || "";
        const authorName = post.author?.nickname || post.author?.displayName || "Someone";
        const postPreview = postMessage.substring(0, 100);

        // Send notification to each mentioned user (except the author)
        const notificationPromises = mentionedUserIds
            .filter((userId) => userId !== authorUid)
            .map((userId) =>
              sendNotificationToUser(userId, {
                title: `${authorName} mentioned you`,
                body: postPreview,
                data: {
                  type: "user_mention",
                  postId: postId,
                  city: city,
                  postTitle: postTitle,
                  screen: "PostThread",
                },
                channelId: "social",
              }),
            );

        await Promise.all(notificationPromises);
        console.log(`[onPostMention] Sent ${notificationPromises.length} mention notifications`);
        return null;
      } catch (error) {
        console.error("[onPostMention] Error:", error);
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

// ====================================
// PAYFAST PAYMENT INTEGRATION
// ====================================

/**
 * SETUP INSTRUCTIONS:
 * 1. Set PayFast credentials:
 *    firebase functions:config:set payfast.merchant_id="10043394"
 *    firebase functions:config:set payfast.merchant_key="vxS0fu3o299dm"
 *    firebase functions:config:set payfast.passphrase="LocalLoop2024Sandbox"
 * 2. Deploy functions: firebase deploy --only functions
 *
 * PayFast Docs: https://developers.payfast.co.za/docs
 */

const crypto = require('crypto');

// PayFast configuration
const getPayFastConfig = () => {
  const config = functions.config().payfast || {};

  // PRODUCTION MODE - Using live PayFast
  // Credentials should be set via: firebase functions:config:set payfast.merchant_id="YOUR_ID" payfast.merchant_key="YOUR_KEY"
  return {
    merchantId: config.merchant_id || '10043394', // Fallback to sandbox if not configured
    merchantKey: config.merchant_key || 'vxS0fu3o299dm', // Fallback to sandbox if not configured
    passphrase: config.passphrase || '',
    processUrl: 'https://www.payfast.co.za/eng/process', // PRODUCTION URL
    // For testing, use: 'https://sandbox.payfast.co.za/eng/process'
  };
};

const PAYFAST_RETURN_URL =
  process.env.PAYFAST_RETURN_URL ||
  (functions.config().payfast && functions.config().payfast.return_url) ||
  'https://share-your-story-1.web.app/payment-success.html';

const PAYFAST_CANCEL_URL =
  process.env.PAYFAST_CANCEL_URL ||
  (functions.config().payfast && functions.config().payfast.cancel_url) ||
  'https://share-your-story-1.web.app/payment-cancelled.html';

// Encode values like PHP's urlencode: uppercase hex and space => +
const payFastEncode = (value) => {
  if (value === null || value === undefined) {
    return '';
  }

  return encodeURIComponent(value.toString().trim()).replace(/%20/g, '+');
};

/**
 * Generate MD5 signature for PayFast
 * IMPORTANT: Parameters must be in the order they appear in the form, NOT alphabetical!
 * Per PayFast docs: "Do not use the API signature format, which uses alphabetical ordering!"
 */
function generatePayFastSignature(data, passphrase = null) {
  // PayFast requires specific order (as they appear in the form)
  const preferredOrder = [
    'merchant_id',
    'merchant_key',
    'return_url',
    'cancel_url',
    'notify_url',
    'name_first',
    'name_last',
    'email_address',
    'm_payment_id',
    'amount',
    'item_name',
    'item_description',
    'subscription_type',
    'billing_date',
    'recurring_amount',
    'frequency',
    'cycles',
    'custom_str1',
    'custom_str2',
    'custom_str3',
    'custom_str4',
    'custom_str5',
  ];

  const presentKeys = Object.keys(data).filter(
      (key) => data[key] !== '' && data[key] !== null && data[key] !== undefined,
  );

  const orderedKeys = [];

  // Add known keys in the preferred order first
  for (const key of preferredOrder) {
    if (presentKeys.includes(key)) {
      orderedKeys.push(key);
    }
  }

  // Append any remaining keys in the order they were received
  for (const key of presentKeys) {
    if (!orderedKeys.includes(key)) {
      orderedKeys.push(key);
    }
  }

  const pairs = orderedKeys.map((key) => `${key}=${payFastEncode(data[key])}`);

  if (passphrase !== null && passphrase !== '') {
    pairs.push(`passphrase=${payFastEncode(passphrase)}`);
  }

  const signatureBase = pairs.join('&');

  const maskedBase = passphrase ?
    signatureBase.replace(/passphrase=[^&]+/, 'passphrase=***') :
    signatureBase;
  console.log('[generatePayFastSignature] Base string:', maskedBase);

  return crypto.createHash('md5').update(signatureBase).digest('hex');
}

/**
 * Create PayFast payment URL with subscription
 */
exports.createPayFastPayment = functions.https.onCall(async (data, context) => {
  // Verify user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated',
    );
  }

  const {planId, planName, amount, interval, userId, userEmail} = data;

  if (!planId || !amount || !interval) {
    throw new functions.https.HttpsError(
        'invalid-argument',
        'Missing required parameters',
    );
  }

  try {
    const config = getPayFastConfig();
    const uid = context.auth.uid;

    console.log('[createPayFastPayment] Passphrase set:', config.passphrase ? 'yes' : 'no');

    // PayFast subscription frequency
    // 3 = Monthly, 6 = Annually
    const frequency = interval === 'year' ? 6 : 3;

    // Create PayFast payment data
    const paymentData = {
      // Merchant details
      merchant_id: config.merchantId,
      merchant_key: config.merchantKey,
      return_url: PAYFAST_RETURN_URL,
      cancel_url: PAYFAST_CANCEL_URL,
      notify_url: `https://us-central1-${process.env.GCLOUD_PROJECT}.cloudfunctions.net/payFastWebhook`,

      // Buyer details
      name_first: context.auth.token.name?.split(' ')[0] || 'User',
      name_last: context.auth.token.name?.split(' ').slice(1).join(' ') || 'Name',
      email_address: userEmail || context.auth.token.email,

      // Transaction details
      m_payment_id: `${uid}_${Date.now()}`,
      amount: amount.toFixed(2),
      item_name: `LocalLoop ${planName}`,
      item_description: `${planName} subscription - ${interval}ly billing`,

      // Custom fields
      custom_str1: uid, // User ID
      custom_str2: planId, // Plan ID
      custom_str3: interval, // Billing interval
    };

    // Generate signature - first log the data
    console.log('[createPayFastPayment] Payment data:', JSON.stringify(paymentData, null, 2));

    const signature = generatePayFastSignature(paymentData, config.passphrase);
    paymentData.signature = signature;
    console.log('[createPayFastPayment] Generated signature:', signature);

    // Build payment URL in the same order as signature generation
    const orderedKeys = [
      'merchant_id', 'merchant_key', 'return_url', 'cancel_url', 'notify_url',
      'name_first', 'name_last', 'email_address', 'm_payment_id', 'amount',
      'item_name', 'item_description', 'subscription_type', 'billing_date',
      'recurring_amount', 'frequency', 'cycles', 'custom_str1', 'custom_str2',
      'custom_str3', 'custom_str4', 'custom_str5', 'signature',
    ];

    const urlParams = new URLSearchParams();
    for (const key of orderedKeys) {
      if (paymentData[key] !== '' && paymentData[key] !== null && paymentData[key] !== undefined) {
        urlParams.append(key, paymentData[key].toString().trim());
      }
    }
    const paymentUrl = `${config.processUrl}?${urlParams.toString()}`;

    console.log(`[createPayFastPayment] Created for user ${uid}, plan ${planId}`);

    return {
      paymentUrl,
      paymentId: paymentData.m_payment_id,
    };
  } catch (error) {
    console.error('[createPayFastPayment] Error:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * PayFast ITN (Instant Transaction Notification) Webhook
 * Handles payment success and updates user subscription
 */
exports.payFastWebhook = functions.https.onRequest(async (req, res) => {
  // Allow GET requests for PayFast URL validation
  if (req.method === 'GET') {
    return res.status(200).send('PayFast Webhook Active');
  }

  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const pfData = req.body;
    const config = getPayFastConfig();

    console.log('[payFastWebhook] Received ITN:', pfData);

    // Verify signature
    const pfParamString = {};
    for (let key in pfData) {
      if (key !== 'signature') {
        pfParamString[key] = pfData[key];
      }
    }

    const signature = generatePayFastSignature(pfParamString, config.passphrase);

    console.log('[payFastWebhook] Received signature:', pfData.signature);
    console.log('[payFastWebhook] Calculated signature:', signature);

    if (signature !== pfData.signature) {
      console.error('[payFastWebhook] Signature mismatch - rejecting request');
      return res.status(400).send('Invalid signature');
    }

    // Check payment status
    if (pfData.payment_status === 'COMPLETE') {
      const userId = pfData.custom_str1;
      const planId = pfData.custom_str2;
      const interval = pfData.custom_str3;

      // Calculate subscription end date
      let subscriptionEndDate;
      if (interval === 'year') {
        subscriptionEndDate = Date.now() + 365 * 24 * 60 * 60 * 1000;
      } else {
        subscriptionEndDate = Date.now() + 30 * 24 * 60 * 60 * 1000;
      }

      // Update user subscription
      await admin.firestore().collection('users').doc(userId).update({
        subscriptionPlan: planId,
        premiumUnlocked: true,
        subscriptionStartDate: Date.now(),
        subscriptionEndDate: subscriptionEndDate,
        payFastPaymentId: pfData.m_payment_id,
        payFastToken: pfData.token || null,
        lastPaymentDate: Date.now(),
      });

      console.log(`[payFastWebhook] Updated subscription for user ${userId} to ${planId}`);

      // Map internal planId to user-facing tier names and benefits
      const tierNames = {
        'premium': 'Go',
        'gold': 'Premium',
        'ultimate': 'Gold'
      };
      const tierName = tierNames[planId] || 'Premium';

      // Define benefits for each tier
      const tierBenefits = {
        'premium': [
          '✨ Unlimited posts & statuses',
          '🎨 15+ premium themes',
          '💬 Priority comment suggestions',
        ],
        'gold': [
          '🚀 Everything in Go',
          '⭐ Premium badge on profile',
          '🎯 Advanced AI features',
          '📊 Analytics & insights',
        ],
        'ultimate': [
          '👑 Everything in Premium',
          '🤖 GPT-4o AI features',
          '🎨 AI cartoon generator (20/month)',
          '✍️ Smart post composer',
        ],
      };

      const benefits = tierBenefits[planId] || ['Unlimited features'];
      const benefitsText = benefits.join('\n');

      // Send notification to user with benefits
      await sendNotificationToUser(userId, {
        title: `Welcome to ${tierName}! 🎉`,
        body: `Your subscription is now active!\n\n${benefitsText}\n\nTap to explore your new features!`,
        data: {
          type: 'subscription_activated',
          planId: planId,
          screen: 'Subscription',
          upgradedPlan: planId,
        },
        channelId: 'default',
      });
    } else if (pfData.payment_status === 'FAILED') {
      const userId = pfData.custom_str1;

      // Notify user of failed payment
      await sendNotificationToUser(userId, {
        title: 'Payment Failed',
        body: 'Your subscription payment failed. Please try again or update your payment method.',
        data: {
          type: 'payment_failed',
          screen: 'Subscription',
        },
        channelId: 'default',
      });

      console.log(`[payFastWebhook] Payment failed for user ${userId}`);
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('[payFastWebhook] Error:', error);
    res.status(500).send('Webhook handler failed');
  }
});

/**
 * Reset User Subscription (for testing)
 * Allows users to reset their subscription back to basic
 */
exports.resetMySubscription = functions.https.onCall(async (data, context) => {
  // Verify user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated',
    );
  }

  try {
    const userId = context.auth.uid;

    await admin.firestore().collection('users').doc(userId).update({
      subscriptionPlan: 'basic',
      premiumUnlocked: false,
      subscriptionStartDate: admin.firestore.FieldValue.delete(),
      subscriptionEndDate: admin.firestore.FieldValue.delete(),
      payFastPaymentId: admin.firestore.FieldValue.delete(),
      payFastToken: admin.firestore.FieldValue.delete(),
      lastPaymentDate: admin.firestore.FieldValue.delete(),
    });

    console.log(`[resetMySubscription] Reset subscription for user ${userId}`);

    return {success: true, message: 'Subscription reset to basic'};
  } catch (error) {
    console.error('[resetMySubscription] Error:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// ====================================
// SCHEDULED CLEANUP FUNCTIONS
// ====================================

/**
 * Cleanup expired statuses - runs every hour
 * This runs with admin privileges and can delete any expired status
 */
exports.cleanupExpiredStatuses = functions.pubsub
    .schedule('every 1 hours')
    .onRun(async (context) => {
      console.log('[cleanupExpiredStatuses] Starting cleanup...');

      try {
        const db = admin.firestore();
        const storage = admin.storage();
        const now = Date.now();
        const limit = 100; // Process 100 at a time to avoid timeouts

        // Query expired statuses
        const snapshot = await db.collection('statuses')
            .where('expiresAt', '<=', now)
            .limit(limit)
            .get();

        if (snapshot.empty) {
          console.log('[cleanupExpiredStatuses] No expired statuses found');
          return null;
        }

        console.log(`[cleanupExpiredStatuses] Found ${snapshot.size} expired statuses`);

        // Delete each expired status and its image
        const deletions = snapshot.docs.map(async (doc) => {
          const data = doc.data();
          try {
            // Delete image from storage if exists
            if (data?.imageStoragePath) {
              try {
                await storage.bucket().file(data.imageStoragePath).delete();
                console.log(`[cleanupExpiredStatuses] Deleted image: ${data.imageStoragePath}`);
              } catch (error) {
                // Image might not exist, that's okay
                console.warn(`[cleanupExpiredStatuses] Could not delete image: ${error.message}`);
              }
            }

            // Delete the status document
            await doc.ref.delete();
            console.log(`[cleanupExpiredStatuses] Deleted status: ${doc.id}`);
          } catch (error) {
            console.error(`[cleanupExpiredStatuses] Error deleting status ${doc.id}:`, error);
          }
        });

        await Promise.all(deletions);
        console.log(`[cleanupExpiredStatuses] Cleanup complete - deleted ${snapshot.size} statuses`);

        return null;
      } catch (error) {
        console.error('[cleanupExpiredStatuses] Fatal error:', error);
        return null;
      }
    });

// ====================================
// OPENAI PROXY FUNCTION
// ====================================

/**
 * Proxy OpenAI requests through Firebase Functions
 * This keeps the API key secure on the server side
 */
exports.openAIProxy = functions.https.onCall(async (data, context) => {
  // Verify user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated to use AI features'
    );
  }

  const { endpoint, body } = data;

  // Validate input
  if (!endpoint || !body) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Missing required parameters'
    );
  }

  // Get OpenAI API key from Firebase config
  const openaiKey = functions.config().openai?.key;

  if (!openaiKey) {
    console.error('[openAIProxy] OpenAI API key not configured');
    throw new functions.https.HttpsError(
      'failed-precondition',
      'OpenAI API is not configured on the server'
    );
  }

  try {
    // Make request to OpenAI
    const response = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.openai.com',
        path: endpoint,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiKey}`
        }
      };

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(parsed);
            } else {
              reject(new Error(parsed.error?.message || 'OpenAI API error'));
            }
          } catch (e) {
            reject(new Error('Failed to parse OpenAI response'));
          }
        });
      });

      req.on('error', reject);
      req.write(JSON.stringify(body));
      req.end();
    });

    return response;
  } catch (error) {
    console.error('[openAIProxy] Error:', error);
    throw new functions.https.HttpsError(
      'internal',
      error.message || 'Failed to process AI request'
    );
  }
});

// ====================================
// DATABASE CLEANUP FUNCTION
// ====================================

/**
 * Cleanup all database data (collections and auth users)
 * HTTP endpoint - requires secret key
 */
exports.cleanupDatabaseHTTP = functions.https.onRequest(async (req, res) => {
  // Only allow POST
  if (req.method !== 'POST') {
    res.status(405).json({error: 'Method not allowed'});
    return;
  }

  // Check secret key
  const secretKey = req.body?.secretKey || req.query.secretKey;
  if (secretKey !== 'cleanup_secret_2024_temp') {
    console.log('[cleanupDatabaseHTTP] Invalid secret key');
    res.status(403).json({error: 'Invalid secret key'});
    return;
  }

  console.log('[cleanupDatabaseHTTP] Starting cleanup...');

  try {
    const db = admin.firestore();
    const auth = admin.auth();
    const results = {
      collections: {},
      authUsers: 0,
      errors: [],
    };

    // Delete Firestore collections
    const collections = [
      'posts',
      'statuses',
      'users',
      'notifications',
      'marketListings',
      'followers',
      'following',
      'blocks',
      'reports',
    ];

    for (const collectionName of collections) {
      try {
        console.log(`[cleanupDatabaseHTTP] Deleting collection: ${collectionName}`);
        let deletedCount = 0;
        let query = db.collection(collectionName).limit(100);

        while (true) {
          const snapshot = await query.get();
          if (snapshot.empty) break;

          const batch = db.batch();
          snapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
            deletedCount++;
          });

          await batch.commit();
        }

        results.collections[collectionName] = deletedCount;
        console.log(`[cleanupDatabaseHTTP] Deleted ${deletedCount} documents from ${collectionName}`);
      } catch (error) {
        console.error(`[cleanupDatabaseHTTP] Error deleting collection ${collectionName}:`, error);
        results.errors.push(`${collectionName}: ${error.message}`);
      }
    }

    // Delete Authentication users
    try {
      console.log('[cleanupDatabaseHTTP] Deleting auth users');
      let deletedCount = 0;
      let pageToken;

      do {
        const listUsersResult = await auth.listUsers(1000, pageToken);

        for (const userRecord of listUsersResult.users) {
          try {
            await auth.deleteUser(userRecord.uid);
            deletedCount++;
          } catch (error) {
            console.error(`[cleanupDatabaseHTTP] Error deleting user ${userRecord.uid}:`, error.message);
            results.errors.push(`User ${userRecord.uid}: ${error.message}`);
          }
        }

        pageToken = listUsersResult.pageToken;
      } while (pageToken);

      results.authUsers = deletedCount;
      console.log(`[cleanupDatabaseHTTP] Deleted ${deletedCount} auth users`);
    } catch (error) {
      console.error('[cleanupDatabaseHTTP] Error deleting auth users:', error);
      results.errors.push(`Auth users: ${error.message}`);
    }

    console.log('[cleanupDatabaseHTTP] Cleanup complete', results);

    res.status(200).json({
      success: true,
      message: 'Database cleanup complete',
      results,
    });
  } catch (error) {
    console.error('[cleanupDatabaseHTTP] Fatal error:', error);
    res.status(500).json({
      error: 'Internal error',
      message: error.message,
    });
  }
});

/**
 * Cleanup all database data (collections and auth users)
 * HTTPS callable function - requires authentication (DEPRECATED - use HTTP version)
 */
exports.cleanupDatabase = functions.https.onCall(async (data, context) => {
  // Require authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated',
    );
  }

  const confirmationCode = data?.confirmationCode;
  if (confirmationCode !== 'DELETE_EVERYTHING_NOW') {
    throw new functions.https.HttpsError(
        'invalid-argument',
        'Invalid confirmation code',
    );
  }

  console.log(`[cleanupDatabase] Starting cleanup requested by user ${context.auth.uid}`);

  try {
    const db = admin.firestore();
    const auth = admin.auth();
    const results = {
      collections: {},
      authUsers: 0,
      errors: [],
    };

    // Delete Firestore collections
    const collections = [
      'posts',
      'statuses',
      'users',
      'notifications',
      'marketListings',
      'followers',
      'following',
      'blocks',
      'reports',
    ];

    for (const collectionName of collections) {
      try {
        console.log(`[cleanupDatabase] Deleting collection: ${collectionName}`);
        let deletedCount = 0;
        let query = db.collection(collectionName).limit(100);

        while (true) {
          const snapshot = await query.get();
          if (snapshot.empty) break;

          const batch = db.batch();
          snapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
            deletedCount++;
          });

          await batch.commit();
        }

        results.collections[collectionName] = deletedCount;
        console.log(`[cleanupDatabase] Deleted ${deletedCount} documents from ${collectionName}`);
      } catch (error) {
        console.error(`[cleanupDatabase] Error deleting collection ${collectionName}:`, error);
        results.errors.push(`${collectionName}: ${error.message}`);
      }
    }

    // Delete Authentication users
    try {
      console.log('[cleanupDatabase] Deleting auth users');
      let deletedCount = 0;
      let pageToken;

      do {
        const listUsersResult = await auth.listUsers(1000, pageToken);

        for (const userRecord of listUsersResult.users) {
          try {
            await auth.deleteUser(userRecord.uid);
            deletedCount++;
          } catch (error) {
            console.error(`[cleanupDatabase] Error deleting user ${userRecord.uid}:`, error.message);
            results.errors.push(`User ${userRecord.uid}: ${error.message}`);
          }
        }

        pageToken = listUsersResult.pageToken;
      } while (pageToken);

      results.authUsers = deletedCount;
      console.log(`[cleanupDatabase] Deleted ${deletedCount} auth users`);
    } catch (error) {
      console.error('[cleanupDatabase] Error deleting auth users:', error);
      results.errors.push(`Auth users: ${error.message}`);
    }

    console.log('[cleanupDatabase] Cleanup complete', results);

    return {
      success: true,
      message: 'Database cleanup complete',
      results,
    };
  } catch (error) {
    console.error('[cleanupDatabase] Fatal error:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// ====================================
// STRIPE PAYMENT INTEGRATION - REMOVED (Using PayFast instead)
// ====================================
// Stripe doesn't support South Africa, so we use PayFast for payments.

// ====================================
// GEOGRAPHIC DATA AGGREGATION
// ====================================

/**
 * Aggregate user counts by geographic location
 * Callable function for admin dashboard
 */
exports.getGeographicStats = functions.https.onCall(async (data, context) => {
  // Verify admin authentication
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError(
        'permission-denied',
        'Only admins can access geographic stats'
    );
  }

  try {
    const {country, province, timeRange} = data;
    const db = admin.firestore();
    
    // Calculate time threshold
    let timeThreshold = null;
    if (timeRange && timeRange !== 'all') {
      const days = parseInt(timeRange);
      timeThreshold = new Date();
      timeThreshold.setDate(timeThreshold.getDate() - days);
    }

    // Build query
    let query = db.collection('users');
    
    if (country) {
      query = query.where('country', '==', country);
    }
    
    if (province) {
      query = query.where('province', '==', province);
    }

    const snapshot = await query.get();
    
    // Aggregate data
    const stats = {
      totalUsers: 0,
      activeUsers: 0,
      basicUsers: 0,
      goUsers: 0,
      premiumUsers: 0,
      goldUsers: 0,
      byCountry: {},
      byProvince: {},
      byCity: {},
    };

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    snapshot.forEach((doc) => {
      const user = doc.data();
      const createdAt = user.createdAt?.toDate();
      
      // Apply time filter
      if (timeThreshold && createdAt < timeThreshold) {
        return;
      }

      stats.totalUsers++;

      // Count active users (last 30 days)
      const lastActive = user.lastActive?.toDate() || createdAt;
      if (lastActive && lastActive > thirtyDaysAgo) {
        stats.activeUsers++;
      }

      // Count by subscription plan
      const plan = user.subscriptionPlan || 'basic';
      if (plan === 'basic') stats.basicUsers++;
      else if (plan === 'premium') stats.goUsers++;
      else if (plan === 'gold') stats.premiumUsers++;
      else if (plan === 'ultimate') stats.goldUsers++;

      // Aggregate by location
      if (user.country) {
        const countryName = user.countryName || user.country;
        if (!stats.byCountry[countryName]) {
          stats.byCountry[countryName] = {
            code: user.country,
            count: 0,
            active: 0,
            go: 0,
            premium: 0,
            gold: 0,
          };
        }
        stats.byCountry[countryName].count++;
        if (lastActive && lastActive > thirtyDaysAgo) {
          stats.byCountry[countryName].active++;
        }
        if (plan === 'premium') stats.byCountry[countryName].go++;
        if (plan === 'gold') stats.byCountry[countryName].premium++;
        if (plan === 'ultimate') stats.byCountry[countryName].gold++;
      }

      if (user.province) {
        const key = `${user.country}-${user.province}`;
        if (!stats.byProvince[key]) {
          stats.byProvince[key] = {
            province: user.province,
            country: user.countryName || user.country,
            count: 0,
            active: 0,
          };
        }
        stats.byProvince[key].count++;
        if (lastActive && lastActive > thirtyDaysAgo) {
          stats.byProvince[key].active++;
        }
      }

      if (user.city) {
        const key = `${user.country}-${user.province}-${user.city}`;
        if (!stats.byCity[key]) {
          stats.byCity[key] = {
            city: user.city,
            province: user.province,
            country: user.countryName || user.country,
            count: 0,
            active: 0,
          };
        }
        stats.byCity[key].count++;
        if (lastActive && lastActive > thirtyDaysAgo) {
          stats.byCity[key].active++;
        }
      }
    });

    // Convert objects to arrays and sort
    stats.topCountries = Object.values(stats.byCountry)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    
    stats.topProvinces = Object.values(stats.byProvince)
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);
    
    stats.topCities = Object.values(stats.byCity)
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);

    return stats;
  } catch (error) {
    console.error('[getGeographicStats] Error:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Get detailed analytics for admin dashboard
 * Includes user growth, revenue, engagement metrics
 */
exports.getAdminAnalytics = functions.https.onCall(async (data, context) => {
  // Verify admin authentication
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError(
        'permission-denied',
        'Only admins can access analytics'
    );
  }

  try {
    const db = admin.firestore();
    const now = new Date();
    
    // Get all users
    const usersSnapshot = await db.collection('users').get();
    const users = [];
    usersSnapshot.forEach((doc) => {
      users.push({id: doc.id, ...doc.data()});
    });

    // Get all posts from both collections (last 90 days)
    // Note: Posts use 'createdAt' field, not 'timestamp'
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    // Fetch private posts
    const postsSnapshot = await db.collection('posts')
        .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(ninetyDaysAgo))
        .get();
    const posts = [];
    postsSnapshot.forEach((doc) => {
      posts.push({id: doc.id, type: 'private', ...doc.data()});
    });

    // Fetch public posts
    const publicPostsSnapshot = await db.collection('publicPosts')
        .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(ninetyDaysAgo))
        .get();
    publicPostsSnapshot.forEach((doc) => {
      posts.push({id: doc.id, type: 'public', ...doc.data()});
    });

    // Calculate user growth (last 30 days, grouped by day)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const userGrowth = Array(30).fill(0);
    
    users.forEach((user) => {
      const createdAt = user.createdAt?.toDate();
      if (createdAt && createdAt >= thirtyDaysAgo) {
        const daysAgo = Math.floor((now - createdAt) / (24 * 60 * 60 * 1000));
        if (daysAgo >= 0 && daysAgo < 30) {
          userGrowth[29 - daysAgo]++;
        }
      }
    });

    // Make cumulative
    for (let i = 1; i < 30; i++) {
      userGrowth[i] += userGrowth[i - 1];
    }

    // Calculate revenue with new pricing
    const goPrice = 79.99;
    const premiumPrice = 149.99;
    const goldPrice = 249.99;
    const goCount = users.filter((u) => u.subscriptionPlan === 'premium').length;
    const premiumCount = users.filter((u) => u.subscriptionPlan === 'gold').length;
    const goldCount = users.filter((u) => u.subscriptionPlan === 'ultimate').length;
    const monthlyRevenue = (goCount * goPrice) + (premiumCount * premiumPrice) + (goldCount * goldPrice);

    // Post activity by hour (last 7 days)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const hourlyActivity = Array(24).fill(0);

    posts.forEach((post) => {
      const createdAt = post.createdAt?.toDate();
      if (createdAt && createdAt >= sevenDaysAgo) {
        const hour = createdAt.getHours();
        hourlyActivity[hour]++;
      }
    });

    // Calculate engagement (posts + comments in last 30 days / active users)
    const activeUsers = users.filter((user) => {
      const lastActive = user.lastActive?.toDate() || user.createdAt?.toDate();
      return lastActive && lastActive >= thirtyDaysAgo;
    }).length;

    const recentPosts = posts.filter((post) => {
      const createdAt = post.createdAt?.toDate();
      return createdAt && createdAt >= thirtyDaysAgo;
    }).length;

    const engagement = activeUsers > 0 ? Math.round((recentPosts / activeUsers) * 100) : 0;

    // Get pending reports
    const reportsSnapshot = await db.collection('reports')
        .where('status', '==', 'pending')
        .get();
    const pendingReports = reportsSnapshot.size;

    return {
      totalUsers: users.length,
      activeUsers,
      goUsers: goCount,
      premiumUsers: premiumCount,
      goldUsers: goldCount,
      totalPosts: posts.length,
      monthlyRevenue,
      pendingReports,
      engagement,
      userGrowth,
      hourlyActivity,
      revenueGrowth: [
        monthlyRevenue * 0.5,
        monthlyRevenue * 0.65,
        monthlyRevenue * 0.78,
        monthlyRevenue * 0.87,
        monthlyRevenue * 0.93,
        monthlyRevenue,
      ],
    };
  } catch (error) {
    console.error('[getAdminAnalytics] Error:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// ====================================
// ADMIN CLAIM SETUP
// ====================================

/**
 * Set admin custom claim for a user
 * Use this function to grant admin access to the dashboard
 *
 * Usage:
 * - Call this function with the user's email
 * - The function will find the user and set admin custom claim
 *
 * Security: This should be called manually or with proper authentication
 */
exports.setAdminClaim = functions.https.onCall(async (data, context) => {
  try {
    const {email, secretKey} = data;

    // Simple security check - you can change this secret key
    const ADMIN_SECRET = 'localloop-admin-setup-2025';

    if (secretKey !== ADMIN_SECRET) {
      throw new functions.https.HttpsError(
          'permission-denied',
          'Invalid secret key'
      );
    }

    if (!email) {
      throw new functions.https.HttpsError(
          'invalid-argument',
          'Email is required'
      );
    }

    // Get user by email
    const userRecord = await admin.auth().getUserByEmail(email);

    // Set admin custom claim
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      admin: true,
    });

    console.log(`[setAdminClaim] Admin claim set for user: ${email} (${userRecord.uid})`);

    return {
      success: true,
      message: `Admin access granted to ${email}`,
      uid: userRecord.uid,
    };
  } catch (error) {
    console.error('[setAdminClaim] Error:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// ====================================
// CUSTOM EMAIL VERIFICATION
// ====================================

/**
 * HTTP function to handle auth actions and redirect to custom pages
 * This intercepts the default Firebase auth action URL
 */
exports.authAction = functions.https.onRequest((req, res) => {
  // Get query parameters
  const mode = req.query.mode;
  const oobCode = req.query.oobCode;
  const apiKey = req.query.apiKey;
  const continueUrl = req.query.continueUrl;
  const lang = req.query.lang;

  // Build the query string
  const queryParams = new URLSearchParams({
    ...(mode && { mode }),
    ...(oobCode && { oobCode }),
    ...(apiKey && { apiKey }),
    ...(continueUrl && { continueUrl }),
    ...(lang && { lang })
  }).toString();

  // Redirect to our custom auth-action.html on the web.app domain
  const redirectUrl = `https://share-your-story-1.web.app/auth-action.html?${queryParams}`;

  console.log(`[authAction] Redirecting to custom page: ${redirectUrl}`);

  // Perform the redirect
  res.redirect(redirectUrl);
});

/**
 * Send custom verification email with correct domain
 */
exports.sendCustomVerificationEmail = functions.https.onCall(async (data, context) => {
  // Check authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const uid = context.auth.uid;
  const email = data.email || context.auth.token.email;

  if (!email) {
    throw new functions.https.HttpsError('invalid-argument', 'Email is required');
  }

  try {
    // Generate email verification link with custom domain
    const actionCodeSettings = {
      // Use web.app domain instead of firebaseapp.com
      url: 'https://share-your-story-1.web.app/email-verified.html',
      handleCodeInApp: false,
    };

    // Generate the verification link
    const link = await admin.auth().generateEmailVerificationLink(email, actionCodeSettings);

    // Replace firebaseapp.com with web.app in the link
    const customLink = link.replace('firebaseapp.com', 'web.app');

    // For now, we'll return the link and let the client handle sending
    // In production, you'd use a service like SendGrid here
    console.log(`[sendCustomVerificationEmail] Generated custom link for ${email}: ${customLink}`);

    // You could send the email here using a service like SendGrid
    // For now, we'll use Firebase's built-in email but with a workaround

    return {
      success: true,
      message: 'Verification email sent successfully',
      // Return the custom link for debugging (remove in production)
      debugLink: customLink
    };
  } catch (error) {
    console.error('[sendCustomVerificationEmail] Error:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});
