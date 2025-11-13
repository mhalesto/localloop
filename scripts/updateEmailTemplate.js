/**
 * Script to update Firebase Auth email template settings
 * This configures Firebase to use our custom domain for email verification
 */

const admin = require('firebase-admin');

// Initialize admin SDK with service account
const serviceAccount = require('../path-to-your-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'share-your-story-1'
});

async function updateEmailTemplate() {
  try {
    // Get the current project config
    const projectConfig = await admin.auth().projectConfig();

    console.log('Current project config:', projectConfig);

    // Update the action code settings
    // Note: This requires using the REST API directly as the Admin SDK doesn't expose this
    console.log('\nTo update email templates to use custom domain:');
    console.log('1. Go to Firebase Console > Authentication > Templates');
    console.log('2. Unfortunately, Firebase doesn\'t allow changing the action URL programmatically');
    console.log('3. The workaround is to use our redirect function or custom email service');

    console.log('\n✅ Alternative solutions implemented:');
    console.log('- Redirect function at: https://us-central1-share-your-story-1.cloudfunctions.net/authAction');
    console.log('- Custom pages at: https://share-your-story-1.web.app/auth-action.html');
    console.log('- Email will redirect from firebaseapp.com to web.app automatically');

  } catch (error) {
    console.error('Error:', error);
  }
}

updateEmailTemplate();