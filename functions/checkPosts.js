/**
 * Quick script to check posts in Firestore
 * Run with: node checkPosts.js
 */

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function checkPosts() {
  try {
    console.log('\n📊 Checking Firestore posts...\n');

    // Check posts collection
    console.log('🔒 PRIVATE POSTS (posts collection):');
    const postsSnapshot = await db.collection('posts').limit(10).get();
    console.log(`   Total found (first 10): ${postsSnapshot.size}`);

    if (postsSnapshot.size > 0) {
      postsSnapshot.forEach((doc, index) => {
        const data = doc.data();
        console.log(`\n   Post ${index + 1}:`);
        console.log(`   - ID: ${doc.id}`);
        console.log(`   - Author: ${data.author?.displayName || data.author?.nickname || 'Unknown'}`);
        console.log(`   - Content: ${(data.content || '').substring(0, 50)}...`);
        console.log(`   - Timestamp: ${data.timestamp ? data.timestamp.toDate() : 'NO TIMESTAMP'}`);
        console.log(`   - City: ${data.city || data.location || 'Unknown'}`);
      });
    }

    // Get total count
    const allPostsSnapshot = await db.collection('posts').get();
    console.log(`\n   📝 Total private posts: ${allPostsSnapshot.size}\n`);

    // Check publicPosts collection
    console.log('🌍 PUBLIC POSTS (publicPosts collection):');
    const publicPostsSnapshot = await db.collection('publicPosts').limit(10).get();
    console.log(`   Total found (first 10): ${publicPostsSnapshot.size}`);

    if (publicPostsSnapshot.size > 0) {
      publicPostsSnapshot.forEach((doc, index) => {
        const data = doc.data();
        console.log(`\n   Post ${index + 1}:`);
        console.log(`   - ID: ${doc.id}`);
        console.log(`   - Author: ${data.author?.displayName || data.userName || 'Unknown'}`);
        console.log(`   - Content: ${(data.content || '').substring(0, 50)}...`);
        console.log(`   - Timestamp: ${data.timestamp ? data.timestamp.toDate() : 'NO TIMESTAMP'}`);
        console.log(`   - City: ${data.city || 'Unknown'}`);
      });
    }

    // Get total count
    const allPublicPostsSnapshot = await db.collection('publicPosts').get();
    console.log(`\n   📝 Total public posts: ${allPublicPostsSnapshot.size}\n`);

    console.log(`\n✅ GRAND TOTAL: ${allPostsSnapshot.size + allPublicPostsSnapshot.size} posts\n`);

    // Check date range
    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    console.log(`\n📅 Current filter: Posts from ${ninetyDaysAgo.toLocaleDateString()} to ${now.toLocaleDateString()}`);

    // Check recent posts
    const recentPrivate = await db.collection('posts')
      .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(ninetyDaysAgo))
      .get();

    const recentPublic = await db.collection('publicPosts')
      .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(ninetyDaysAgo))
      .get();

    console.log(`\n   🔒 Recent private posts (last 90 days): ${recentPrivate.size}`);
    console.log(`   🌍 Recent public posts (last 90 days): ${recentPublic.size}`);
    console.log(`   📊 Total recent posts: ${recentPrivate.size + recentPublic.size}\n`);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error);
    process.exit(1);
  }
}

checkPosts();
