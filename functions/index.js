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
  return {
    merchantId: config.merchant_id || '10043394', // Sandbox default
    merchantKey: config.merchant_key || 'vxS0fu3o299dm', // Sandbox default
    passphrase: config.passphrase || 'LocalLoop2024Sandbox', // Sandbox default
    // Use sandbox for testing, change to https://www.payfast.co.za/eng/process for production
    processUrl: 'https://sandbox.payfast.co.za/eng/process',
  };
};

/**
 * Generate MD5 signature for PayFast
 */
function generatePayFastSignature(data, passphrase = null) {
  // Create parameter string
  let pfOutput = '';
  for (let key in data) {
    if (data.hasOwnProperty(key)) {
      if (data[key] !== '') {
        pfOutput += `${key}=${encodeURIComponent(data[key].toString().trim()).replace(/%20/g, '+')}&`;
      }
    }
  }

  // Remove last ampersand
  let getString = pfOutput.slice(0, -1);

  if (passphrase !== null) {
    getString += `&passphrase=${encodeURIComponent(passphrase.trim()).replace(/%20/g, '+')}`;
  }

  return crypto.createHash('md5').update(getString).digest('hex');
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

    // PayFast subscription frequency
    // 3 = Monthly, 6 = Annually
    const frequency = interval === 'year' ? 6 : 3;

    // Create PayFast payment data
    const paymentData = {
      // Merchant details
      merchant_id: config.merchantId,
      merchant_key: config.merchantKey,
      return_url: `https://localloop.app/payment-success`,
      cancel_url: `https://localloop.app/payment-cancelled`,
      notify_url: `https://${process.env.GCLOUD_PROJECT}.cloudfunctions.net/payFastWebhook`,

      // Buyer details
      name_first: context.auth.token.name?.split(' ')[0] || 'User',
      name_last: context.auth.token.name?.split(' ').slice(1).join(' ') || 'Name',
      email_address: userEmail || context.auth.token.email,

      // Transaction details
      m_payment_id: `${uid}_${Date.now()}`,
      amount: amount.toFixed(2),
      item_name: `LocalLoop ${planName}`,
      item_description: `${planName} subscription - ${interval}ly billing`,

      // Subscription details
      subscription_type: '1', // 1 = subscription
      billing_date: new Date().toISOString().split('T')[0],
      recurring_amount: amount.toFixed(2),
      frequency: frequency.toString(),
      cycles: '0', // 0 = forever

      // Custom fields
      custom_str1: uid, // User ID
      custom_str2: planId, // Plan ID
      custom_str3: interval, // Billing interval
    };

    // Generate signature
    const signature = generatePayFastSignature(paymentData, config.passphrase);
    paymentData.signature = signature;

    // Build payment URL
    const params = new URLSearchParams(paymentData).toString();
    const paymentUrl = `${config.processUrl}?${params}`;

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

    if (signature !== pfData.signature) {
      console.error('[payFastWebhook] Invalid signature');
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

      // Send notification to user
      await sendNotificationToUser(userId, {
        title: 'Subscription Activated! 🎉',
        body: `Your ${planId === 'gold' ? 'Gold' : 'Premium'} subscription is now active. Enjoy unlimited features!`,
        data: {
          type: 'subscription_activated',
          planId: planId,
          screen: 'Settings',
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

// ====================================
// STRIPE PAYMENT INTEGRATION (OLD - KEPT FOR REFERENCE)
// ====================================

// Uncomment after setting up Stripe keys
/*
const stripe = require('stripe')(functions.config().stripe.secret_key);

/**
 * Create a Payment Intent for one-time subscription purchase
 * Called from mobile app when user wants to subscribe
 */
exports.createPaymentIntent = functions.https.onCall(async (data, context) => {
  // Verify user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated to create payment intent',
    );
  }

  const {planId, amount, currency = 'zar'} = data;

  if (!planId || !amount) {
    throw new functions.https.HttpsError(
        'invalid-argument',
        'Missing required parameters: planId, amount',
    );
  }

  try {
    const uid = context.auth.uid;

    // Create or retrieve customer
    let customer;
    const userDoc = await admin.firestore().collection('users').doc(uid).get();
    const userData = userDoc.data();

    if (userData?.stripeCustomerId) {
      customer = await stripe.customers.retrieve(userData.stripeCustomerId);
    } else {
      customer = await stripe.customers.create({
        email: context.auth.token.email,
        metadata: {
          firebaseUID: uid,
        },
      });

      // Save customer ID to user document
      await admin.firestore().collection('users').doc(uid).update({
        stripeCustomerId: customer.id,
      });
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      customer: customer.id,
      metadata: {
        firebaseUID: uid,
        planId: planId,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    console.log(`[createPaymentIntent] Created for user ${uid}, plan ${planId}`);

    return {
      clientSecret: paymentIntent.client_secret,
      customerId: customer.id,
    };
  } catch (error) {
    console.error('[createPaymentIntent] Error:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Stripe Webhook Handler
 * Handles payment success and updates user subscription
 *
 * Setup: Add webhook endpoint in Stripe Dashboard
 * URL: https://YOUR_REGION-YOUR_PROJECT.cloudfunctions.net/stripeWebhook
 * Events to listen: payment_intent.succeeded, invoice.payment_succeeded
 */
exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = functions.config().stripe?.webhook_secret;

  if (!webhookSecret) {
    console.error('[stripeWebhook] Webhook secret not configured');
    return res.status(500).send('Webhook secret not configured');
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
  } catch (err) {
    console.error('[stripeWebhook] Signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        const {firebaseUID, planId} = paymentIntent.metadata;

        if (!firebaseUID || !planId) {
          console.log('[stripeWebhook] Missing metadata in payment intent');
          break;
        }

        // Calculate subscription end date
        let subscriptionEndDate;
        if (planId === 'gold') {
          // Gold is yearly
          subscriptionEndDate = Date.now() + 365 * 24 * 60 * 60 * 1000;
        } else {
          // Premium is monthly
          subscriptionEndDate = Date.now() + 30 * 24 * 60 * 60 * 1000;
        }

        // Update user subscription in Firestore
        await admin.firestore().collection('users').doc(firebaseUID).update({
          subscriptionPlan: planId,
          premiumUnlocked: true,
          subscriptionStartDate: Date.now(),
          subscriptionEndDate: subscriptionEndDate,
          stripePaymentIntentId: paymentIntent.id,
          lastPaymentDate: Date.now(),
        });

        console.log(`[stripeWebhook] Updated subscription for user ${firebaseUID} to ${planId}`);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const customerId = invoice.customer;

        // Find user by Stripe customer ID
        const usersSnapshot = await admin.firestore()
            .collection('users')
            .where('stripeCustomerId', '==', customerId)
            .limit(1)
            .get();

        if (!usersSnapshot.empty) {
          const userDoc = usersSnapshot.docs[0];
          // Optionally downgrade or flag account
          await userDoc.ref.update({
            paymentFailed: true,
            lastPaymentFailedDate: Date.now(),
          });

          // Send notification to user
          await sendNotificationToUser(userDoc.id, {
            title: 'Payment Failed',
            body: 'Your subscription payment failed. Please update your payment method.',
            data: {
              type: 'payment_failed',
              screen: 'Subscription',
            },
            channelId: 'default',
          });

          console.log(`[stripeWebhook] Payment failed for user ${userDoc.id}`);
        }
        break;
      }

      default:
        console.log(`[stripeWebhook] Unhandled event type: ${event.type}`);
    }

    res.json({received: true});
  } catch (error) {
    console.error('[stripeWebhook] Error handling event:', error);
    res.status(500).send('Webhook handler failed');
  }
});
*/
