// Simple script to create admin users using Firebase REST API
// This can be run directly in the browser console from the admin dashboard

const createAdminUsers = async () => {
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

    console.log('Creating admin users...');

    // Import Firebase
    const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
    const { getAuth, createUserWithEmailAndPassword, updateProfile } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
    const { getFirestore, doc, setDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

    // Firebase configuration
    const firebaseConfig = {
        apiKey: "AIzaSyD9ngUn2O-_TYYzPfEQpDcuNvv-aAMUcIY",
        authDomain: "share-your-story-1.firebaseapp.com",
        projectId: "share-your-story-1",
        storageBucket: "share-your-story-1.firebasestorage.app",
        messagingSenderId: "673056432219",
        appId: "1:673056432219:web:8d54e53d9124fb6e441f7e"
    };

    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);

    for (const userData of adminUsers) {
        try {
            // Create user in Firebase Auth
            const userCredential = await createUserWithEmailAndPassword(
                auth,
                userData.email,
                userData.password
            );

            const user = userCredential.user;

            // Update display name
            await updateProfile(user, {
                displayName: userData.displayName
            });

            // Create Firestore document with admin role
            await setDoc(doc(db, 'users', user.uid), {
                email: userData.email,
                name: userData.displayName,
                role: 'admin',
                isAdmin: true,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                subscriptionPlan: 'gold',
                uid: user.uid
            });

            // Also add to admins collection
            await setDoc(doc(db, 'admins', user.uid), {
                email: userData.email,
                name: userData.displayName,
                addedAt: serverTimestamp(),
                uid: user.uid
            });

            console.log(`✅ Admin user created: ${userData.email}`);
            console.log(`   Password: ${userData.password}`);
            console.log(`   UID: ${user.uid}`);

        } catch (error) {
            if (error.code === 'auth/email-already-in-use') {
                console.log(`ℹ️ User ${userData.email} already exists`);
                // You can still update their Firestore document to make them admin
                // But you'll need to sign in as them first
            } else {
                console.error(`❌ Error creating ${userData.email}:`, error);
            }
        }
    }

    console.log('\n✨ Admin setup complete!');
    console.log('Admin users can login at: https://mhalesto.github.io/toilet/admin.html');
};

// Instructions for use:
console.log(`
=== HOW TO CREATE ADMIN USERS ===

Option 1: Run in Node.js (requires Firebase Admin SDK setup)
---------------------------------------------------------
1. Install dependencies: npm install firebase-admin
2. Get service account key from Firebase Console
3. Run: node createAdmins.js

Option 2: Run in Browser Console (easier)
--------------------------------------
1. Open: https://mhalesto.github.io/toilet/admin-firebase.html
2. Open browser console (F12)
3. Copy and paste the entire createAdminUsers function
4. Run: createAdminUsers()

Option 3: Manual creation in Firebase Console
-------------------------------------------
1. Go to Firebase Console > Authentication
2. Add users with these credentials:

   User 1:
   - Email: currenttech.co.za@gmail.com
   - Password: 42524Halahc.

   User 2:
   - Email: mbanjwa.hg@gmail.com
   - Password: 42524Halah

3. Then go to Firestore > users collection
4. Find each user by their UID and add:
   - role: "admin"
   - isAdmin: true
   - subscriptionPlan: "gold"
`);

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = createAdminUsers;
}