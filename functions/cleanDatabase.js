/**
 * Clean Database Script
 * Safely deletes all user data for fresh start
 *
 * ⚠️  WARNING: This will delete ALL data including:
 * - All users (including auth accounts)
 * - All posts and comments
 * - All statuses
 * - All user profiles
 * - All followers/following relationships
 *
 * Usage: cd functions && node cleanDatabase.js
 */

const admin = require('firebase-admin');
const readline = require('readline');

// Initialize Firebase Admin with explicit project ID
admin.initializeApp({
  projectId: 'share-your-story-1'
});

const db = admin.firestore();
const auth = admin.auth();

// Create readline interface for confirmation
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function deleteCollection(collectionPath, batchSize = 100) {
  const collectionRef = db.collection(collectionPath);
  const query = collectionRef.limit(batchSize);

  return new Promise((resolve, reject) => {
    deleteQueryBatch(query, resolve, reject);
  });
}

async function deleteQueryBatch(query, resolve, reject) {
  try {
    const snapshot = await query.get();

    if (snapshot.size === 0) {
      resolve();
      return;
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    process.stdout.write('.');

    // Recurse on the next batch
    process.nextTick(() => {
      deleteQueryBatch(query, resolve, reject);
    });
  } catch (error) {
    reject(error);
  }
}

async function deleteAllAuthUsers() {
  let deletedCount = 0;
  let pageToken;

  do {
    const listUsersResult = await auth.listUsers(1000, pageToken);

    for (const userRecord of listUsersResult.users) {
      try {
        await auth.deleteUser(userRecord.uid);
        deletedCount++;
        process.stdout.write('.');
      } catch (error) {
        console.error(`\nError deleting user ${userRecord.uid}:`, error.message);
      }
    }

    pageToken = listUsersResult.pageToken;
  } while (pageToken);

  return deletedCount;
}

async function cleanDatabase() {
  console.log('\n🧹 LocalLoop Database Cleanup Tool\n');
  console.log('This will permanently delete:');
  console.log('  ❌ All user authentication accounts');
  console.log('  ❌ All user profiles and data');
  console.log('  ❌ All posts and comments');
  console.log('  ❌ All statuses');
  console.log('  ❌ All followers/following data');
  console.log('  ❌ All notifications');
  console.log('  ❌ All marketplace listings');
  console.log('\n⚠️  This action CANNOT be undone!\n');

  const answer = await question('Type "DELETE EVERYTHING" to confirm: ');

  if (answer !== 'DELETE EVERYTHING') {
    console.log('\n❌ Cleanup cancelled.');
    rl.close();
    process.exit(0);
  }

  console.log('\n🔥 Starting database cleanup...\n');

  try {
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
      'reports'
    ];

    for (const collectionName of collections) {
      try {
        process.stdout.write(`\nDeleting ${collectionName} `);
        await deleteCollection(collectionName);
        console.log(` ✓ Done`);
      } catch (error) {
        console.log(` ✗ Error: ${error.message}`);
      }
    }

    // Delete Authentication users
    console.log('\nDeleting authentication users ');
    const deletedUsers = await deleteAllAuthUsers();
    console.log(` ✓ Done (${deletedUsers} users)`);

    console.log('\n✅ Database cleanup complete!');
    console.log('\n📝 Summary:');
    console.log('  - All Firestore collections deleted');
    console.log(`  - ${deletedUsers} auth users deleted`);
    console.log('\n🎉 Your database is now fresh and ready for new users!\n');

  } catch (error) {
    console.error('\n❌ Error during cleanup:', error);
  } finally {
    rl.close();
    process.exit(0);
  }
}

// Run the cleanup
cleanDatabase().catch((error) => {
  console.error('Fatal error:', error);
  rl.close();
  process.exit(1);
});
