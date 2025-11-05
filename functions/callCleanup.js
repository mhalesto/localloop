/**
 * Call the cleanupDatabase Cloud Function
 * This script calls the deployed function to clean all data
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp({
  projectId: 'share-your-story-1'
});

async function callCleanupFunction() {
  try {
    console.log('🔥 Calling cleanupDatabase function...\n');

    // Get the first auth user to use for authentication
    const listUsersResult = await admin.auth().listUsers(1);

    let customToken;
    if (listUsersResult.users.length > 0) {
      const userId = listUsersResult.users[0].uid;
      console.log(`Using user ${userId} for authentication`);
      customToken = await admin.auth().createCustomToken(userId);
    } else {
      // Create a temporary user for the cleanup
      console.log('Creating temporary user for cleanup...');
      const tempUser = await admin.auth().createUser({
        email: 'cleanup@temp.com',
        password: 'TempPassword123!'
      });
      customToken = await admin.auth().createCustomToken(tempUser.uid);
      console.log('Created temporary user:', tempUser.uid);
    }

    // Import Firebase client SDK for calling the function
    const {initializeApp: initializeClientApp} = require('firebase/app');
    const {getFunctions, httpsCallable, connectFunctionsEmulator} = require('firebase/functions');
    const {getAuth, signInWithCustomToken} = require('firebase/auth');

    // Initialize client app
    const clientApp = initializeClientApp({
      apiKey: 'AIzaSyDZqYQcvxQNH8xz8hK6X2F0fZ7lVB8XY9g',
      authDomain: 'share-your-story-1.firebaseapp.com',
      projectId: 'share-your-story-1',
    }, 'cleanup-client');

    const auth = getAuth(clientApp);
    const functions = getFunctions(clientApp);

    // Sign in with custom token
    console.log('Authenticating...');
    await signInWithCustomToken(auth, customToken);
    console.log('Authenticated successfully\n');

    // Call the cleanup function
    console.log('Calling cleanup function...');
    const cleanupFn = httpsCallable(functions, 'cleanupDatabase');
    const result = await cleanupFn({confirmationCode: 'DELETE_EVERYTHING_NOW'});

    console.log('\n✅ Cleanup complete!');
    console.log('\nResults:');
    console.log(JSON.stringify(result.data, null, 2));

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

callCleanupFunction();
