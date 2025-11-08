const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function setAdminClaim(email) {
  try {
    // Get user by email
    const userRecord = await admin.auth().getUserByEmail(email);

    // Set admin custom claim
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      admin: true
    });

    console.log(`✅ Admin access granted to: ${email}`);
    console.log(`   User ID: ${userRecord.uid}`);
    console.log('\n📝 Next steps:');
    console.log('   1. Log out of the admin dashboard');
    console.log('   2. Log back in');
    console.log('   3. You should now have full admin access!\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Get email from command line argument
const email = process.argv[2];

if (!email) {
  console.error('Usage: node setAdmin.js <email>');
  console.error('Example: node setAdmin.js admin@example.com');
  process.exit(1);
}

setAdminClaim(email);
