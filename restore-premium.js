/**
 * Restore Premium subscription using Firestore REST API
 * This script uses your existing Firebase CLI authentication
 */

const { execSync } = require('child_process');

async function restoreSubscription() {
  const userEmail = 'mbanjwa.hg@gmail.com';

  try {
    console.log(`\n🔍 Finding user: ${userEmail}...`);

    // First, let's find the user ID by querying Firestore
    // We'll use Firebase CLI commands which use your existing auth

    console.log('\n📝 Please run these commands manually in Firebase Console:');
    console.log('\n1. Go to: https://console.firebase.google.com/project/share-your-story-1/firestore/data');
    console.log('2. Navigate to the "users" collection');
    console.log('3. Find the document for user: mbanjwa.hg@gmail.com');
    console.log('   (You can search by email field)');
    console.log('\n4. Update these fields:');
    console.log('   - subscriptionPlan: "gold"');
    console.log('   - premiumUnlocked: true');
    console.log('   - subscriptionStatus: "active"');

    const oneMonthFromNow = new Date();
    oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);
    console.log(`   - subscriptionEndDate: "${oneMonthFromNow.toISOString()}"`);

    console.log('\n5. Save the changes');
    console.log('\n✅ After updating, you will have Premium access until:', oneMonthFromNow.toLocaleDateString());

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
  }
}

restoreSubscription();
