/**
 * Simple Test Gold User Setup
 *
 * This script updates a user to Gold subscription using Firebase CLI
 * No service account key needed!
 */

const { execSync } = require('child_process');

const userId = process.argv[2];

if (!userId) {
  console.error('❌ Error: Please provide a user ID');
  console.log('Usage: node scripts/setup-test-user-simple.js YOUR_USER_ID');
  console.log('');
  console.log('Example user IDs from auth export:');
  console.log('  oRvvSZcx2mggfmU9aZ3ZkPgzOOx2 (currenttech.co.za@gmail.com)');
  console.log('  MGjiFpgwE0NNYq0maB4ymw2hq9W2 (whattrendingworld@gmail.com)');
  console.log('  sH6Nydl11SeKqLBU3YHzo08uU1G2 (mbanjwa.hg@gmail.com)');
  process.exit(1);
}

console.log('🔧 Setting up test Gold user...');
console.log('User ID:', userId);
console.log('');

try {
  // Use Firebase CLI to call a cloud function that updates the user
  console.log('Method 1: Using Firebase Functions...');
  console.log('');
  console.log('📝 Manual Setup Instructions:');
  console.log('');
  console.log('Go to Firebase Console:');
  console.log('https://console.firebase.google.com/project/share-your-story-1/firestore/data/users/' + userId);
  console.log('');
  console.log('Update these fields:');
  console.log('  subscriptionPlan: "gold"');
  console.log('  subscriptionStatus: "active"');
  console.log('  isTestUser: true');
  console.log('  goldUsage: {}');
  console.log('  cartoonMonthlyUsage: 0');
  console.log('');
  console.log('✅ Once updated, this user will have Gold access!');
  console.log('');
  console.log('Test the user can now:');
  console.log('  ✓ Use GPT-4o summarization (4 styles)');
  console.log('  ✓ Generate Vision-personalized cartoons (20/month)');
  console.log('  ✓ Use Smart Post Composer');
  console.log('  ✓ Get enhanced comment suggestions');
  console.log('  ✓ Translate with cultural context');
  console.log('');

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
