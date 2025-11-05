/**
 * Clear Subscription Data Script
 * Run this to reset all users' subscription data for testing
 *
 * Usage: node clearSubscriptions.js
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function clearAllSubscriptions() {
  console.log('🧹 Starting subscription cleanup...\n');

  try {
    // Get all users
    const usersSnapshot = await db.collection('users').get();

    console.log(`📊 Found ${usersSnapshot.size} users in database\n`);

    const batch = db.batch();
    let updateCount = 0;

    usersSnapshot.forEach((doc) => {
      const userData = doc.data();

      // Check if user has any subscription data
      const hasSubscriptionData =
        userData.subscriptionPlan !== 'basic' ||
        userData.premiumUnlocked === true ||
        userData.subscriptionStartDate ||
        userData.subscriptionEndDate ||
        userData.payFastPaymentId ||
        userData.payFastToken;

      if (hasSubscriptionData) {
        console.log(`   Resetting: ${userData.email || doc.id}`);

        // Reset to basic plan
        batch.update(doc.ref, {
          subscriptionPlan: 'basic',
          premiumUnlocked: false,
          subscriptionStartDate: admin.firestore.FieldValue.delete(),
          subscriptionEndDate: admin.firestore.FieldValue.delete(),
          payFastPaymentId: admin.firestore.FieldValue.delete(),
          payFastToken: admin.firestore.FieldValue.delete(),
          lastPaymentDate: admin.firestore.FieldValue.delete(),
        });

        updateCount++;
      }
    });

    if (updateCount > 0) {
      await batch.commit();
      console.log(`\n✅ Successfully reset ${updateCount} users to basic plan`);
    } else {
      console.log('\n✅ No subscription data found - database already clean');
    }

    console.log('\n🎉 Cleanup complete!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
}

// Run the cleanup
clearAllSubscriptions();
