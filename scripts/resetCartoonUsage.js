/**
 * Reset Cartoon Usage Script
 * Quickly reset your cartoon generation usage for testing
 *
 * Usage: node scripts/resetCartoonUsage.js
 */

const admin = require('firebase-admin');
const readline = require('readline');

// Initialize Firebase Admin (uses default credentials or GOOGLE_APPLICATION_CREDENTIALS env)
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: 'share-your-story-1'
    });
    console.log('✅ Firebase Admin initialized');
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin:', error.message);
    console.log('\nPlease set GOOGLE_APPLICATION_CREDENTIALS environment variable');
    console.log('Or run: firebase login');
    process.exit(1);
  }
}

const db = admin.firestore();

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function resetCartoonUsage(userId) {
  try {
    console.log(`\n🔄 Resetting cartoon usage for user: ${userId}`);

    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      console.log('❌ User not found');
      return;
    }

    // Show current usage
    const data = userDoc.data();
    console.log('\n📊 Current usage:');
    console.log(`   Monthly: ${data.cartoonMonthlyUsage || 0}`);
    console.log(`   Lifetime: ${data.cartoonLifetimeUsage || 0}`);
    console.log(`   History: ${(data.cartoonPictureHistory || []).length} items`);

    // Reset usage
    await userRef.update({
      cartoonMonthlyUsage: 0,
      cartoonLifetimeUsage: 0,
      // Optionally keep history, just reset counts
    });

    console.log('\n✅ Usage reset successfully!');
    console.log('   Monthly: 0');
    console.log('   Lifetime: 0');
    console.log('   (History preserved)');
    console.log('\n💡 Reload your app to see the changes\n');

  } catch (error) {
    console.error('❌ Error resetting usage:', error.message);
  }
}

async function resetAllUsage() {
  try {
    console.log('\n🔄 Resetting ALL users\' cartoon usage...');

    const usersSnapshot = await db.collection('users')
      .where('cartoonLifetimeUsage', '>', 0)
      .get();

    if (usersSnapshot.empty) {
      console.log('✅ No users with cartoon usage found');
      return;
    }

    const batch = db.batch();
    let count = 0;

    usersSnapshot.forEach(doc => {
      batch.update(doc.ref, {
        cartoonMonthlyUsage: 0,
        cartoonLifetimeUsage: 0,
      });
      count++;
    });

    await batch.commit();

    console.log(`✅ Reset ${count} users' usage`);
    console.log('💡 Reload your app to see the changes\n');

  } catch (error) {
    console.error('❌ Error resetting all usage:', error.message);
  }
}

// Main menu
function showMenu() {
  console.log('\n=================================');
  console.log('  Cartoon Usage Reset Tool');
  console.log('=================================\n');
  console.log('Options:');
  console.log('  1. Reset specific user');
  console.log('  2. Reset ALL users (⚠️  use with caution)');
  console.log('  3. Exit\n');

  rl.question('Choose an option (1-3): ', async (option) => {
    switch (option) {
      case '1':
        rl.question('\nEnter User ID: ', async (userId) => {
          if (userId.trim()) {
            await resetCartoonUsage(userId.trim());
          }
          rl.close();
        });
        break;

      case '2':
        rl.question('\n⚠️  Reset ALL users? Type "yes" to confirm: ', async (confirm) => {
          if (confirm.toLowerCase() === 'yes') {
            await resetAllUsage();
          } else {
            console.log('❌ Cancelled');
          }
          rl.close();
        });
        break;

      case '3':
        console.log('👋 Goodbye!\n');
        rl.close();
        break;

      default:
        console.log('❌ Invalid option');
        rl.close();
        break;
    }
  });
}

// Run the menu
showMenu();

// Handle exit
rl.on('close', () => {
  process.exit(0);
});
