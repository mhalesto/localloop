const admin = require('firebase-admin');
const serviceAccount = require('../functions/share-your-story-1-firebase-adminsdk-2v4jx-15e95c0d76.json');

// Initialize admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://share-your-story-1.firebaseio.com"
});

const auth = admin.auth();
const db = admin.firestore();

// Admin users to create
const adminUsers = [
  {
    email: 'currenttech.co.za@gmail.com',
    password: '42524Halahc.',
    displayName: 'Admin - CurrentTech'
  },
  {
    email: 'mbanjwa.hg@gmail.com',
    password: '42524Halah',
    displayName: 'Admin - Mbanjwa'
  }
];

async function createAdminUser(userData) {
  try {
    let user;

    // Try to get existing user first
    try {
      user = await auth.getUserByEmail(userData.email);
      console.log(`User ${userData.email} already exists. Updating...`);

      // Update password
      await auth.updateUser(user.uid, {
        password: userData.password,
        displayName: userData.displayName
      });
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        // Create new user
        console.log(`Creating new user: ${userData.email}`);
        user = await auth.createUser({
          email: userData.email,
          password: userData.password,
          displayName: userData.displayName,
          emailVerified: true
        });
      } else {
        throw error;
      }
    }

    // Set admin custom claim
    await auth.setCustomUserClaims(user.uid, { admin: true });
    console.log(`Set admin claim for ${userData.email}`);

    // Create or update Firestore document
    const userDoc = {
      email: userData.email,
      name: userData.displayName,
      role: 'admin',
      isAdmin: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      subscriptionPlan: 'gold', // Give admins gold plan
      uid: user.uid
    };

    await db.collection('users').doc(user.uid).set(userDoc, { merge: true });
    console.log(`Updated Firestore document for ${userData.email}`);

    // Also add to admins collection for easy reference
    await db.collection('admins').doc(user.uid).set({
      email: userData.email,
      name: userData.displayName,
      addedAt: admin.firestore.FieldValue.serverTimestamp(),
      uid: user.uid
    });

    console.log(`✅ Successfully set up admin user: ${userData.email}`);
    console.log(`   UID: ${user.uid}`);
    console.log(`   Password: ${userData.password}`);
    console.log('');

    return user;
  } catch (error) {
    console.error(`❌ Error creating admin user ${userData.email}:`, error);
    return null;
  }
}

async function setupAllAdmins() {
  console.log('🔧 Setting up admin users...\n');

  for (const userData of adminUsers) {
    await createAdminUser(userData);
  }

  console.log('\n✨ Admin setup complete!');
  console.log('\nAdmin users can now login at:');
  console.log('https://mhalesto.github.io/toilet/admin.html');
  console.log('\nLogin credentials:');
  adminUsers.forEach(user => {
    console.log(`\nEmail: ${user.email}`);
    console.log(`Password: ${user.password}`);
  });

  process.exit(0);
}

// Run the setup
setupAllAdmins().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});