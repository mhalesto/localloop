/**
 * Setup Test Gold User
 *
 * This script creates or updates a test user with Gold subscription
 * Run with: node scripts/setup-test-gold-user.js YOUR_USER_ID
 */

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json'); // You'll need to download this

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function setupTestGoldUser(userId) {
  if (!userId) {
    console.error('❌ Error: Please provide a user ID');
    console.log('Usage: node scripts/setup-test-gold-user.js YOUR_USER_ID');
    process.exit(1);
  }

  console.log('🔧 Setting up test Gold user...');
  console.log('User ID:', userId);
  console.log('');

  try {
    // Get user document
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      console.error(`❌ User ${userId} not found`);
      process.exit(1);
    }

    const userData = userDoc.data();
    console.log('Current user data:');
    console.log('  Email:', userData.email);
    console.log('  Display Name:', userData.displayName);
    console.log('  Current Plan:', userData.subscriptionPlan || 'basic');
    console.log('');

    // Update to Gold
    await userRef.update({
      subscriptionPlan: 'gold',
      subscriptionStatus: 'active',
      subscriptionStartDate: admin.firestore.FieldValue.serverTimestamp(),
      subscriptionEndDate: null, // Ongoing

      // Reset usage counters
      'goldUsage.summarization.count': 0,
      'goldUsage.cartoon.count': 0,
      'goldUsage.composition.count': 0,
      'goldUsage.comments.count': 0,
      'goldUsage.translation.count': 0,

      // Set monthly cartoon limit
      'cartoonMonthlyUsage': 0,
      'cartoonLifetimeUsage': 0,

      // Mark as test user
      isTestUser: true,
      testGoldActivatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log('✅ User upgraded to Gold!');
    console.log('');
    console.log('Test this user can now:');
    console.log('  ✓ Use GPT-4o summarization (4 styles)');
    console.log('  ✓ Generate Vision-personalized cartoons (20/month)');
    console.log('  ✓ Use Smart Post Composer');
    console.log('  ✓ Get enhanced comment suggestions');
    console.log('  ✓ Translate with cultural context');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Log into the app as this user');
    console.log('  2. Run: node scripts/test-gold-features.js ' + userId);
    console.log('');

  } catch (error) {
    console.error('❌ Error setting up user:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Get user ID from command line
const userId = process.argv[2];
setupTestGoldUser(userId);
