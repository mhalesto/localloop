/**
 * Script to restore Premium subscription for a user
 * Usage: node restore-subscription.js
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function restoreSubscription() {
  const userEmail = 'mbanjwa.hg@gmail.com';

  try {
    console.log(`\n🔍 Finding user: ${userEmail}...`);

    // Find user by email
    const userRecord = await admin.auth().getUserByEmail(userEmail);
    const userId = userRecord.uid;

    console.log(`✅ Found user ID: ${userId}`);

    // Get current user profile
    const userDoc = await db.collection('users').doc(userId).get();
    const currentData = userDoc.data();

    console.log('\n📊 Current subscription status:');
    console.log(`   Plan: ${currentData?.subscriptionPlan || 'basic'}`);
    console.log(`   Premium Unlocked: ${currentData?.premiumUnlocked || false}`);
    console.log(`   End Date: ${currentData?.subscriptionEndDate || 'none'}`);

    // Calculate new subscription end date (1 month from now)
    const now = new Date();
    const oneMonthFromNow = new Date(now);
    oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);

    // Update to Premium (gold tier)
    const updateData = {
      subscriptionPlan: 'gold', // Internal ID for Premium tier
      premiumUnlocked: true,
      subscriptionEndDate: oneMonthFromNow.toISOString(),
      subscriptionStatus: 'active',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    console.log('\n🔄 Updating subscription to Premium...');
    await db.collection('users').doc(userId).update(updateData);

    console.log('\n✅ SUCCESS! Subscription restored:');
    console.log(`   Plan: Premium (gold)`);
    console.log(`   Premium Unlocked: true`);
    console.log(`   End Date: ${oneMonthFromNow.toISOString()}`);
    console.log(`   Renews: ${oneMonthFromNow.toLocaleDateString()}`);

    console.log('\n✨ User should now have access to all Premium features!');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run the script
restoreSubscription();
