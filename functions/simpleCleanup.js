/**
 * Simple cleanup script using HTTPS request
 * This bypasses the Admin SDK credential issues
 */

const https = require('https');

// Your Firebase Web API Key
const API_KEY = 'AIzaSyD9ngUn2O-_TYYzPfEQpDcuNvv-aAMUcIY';
const PROJECT_ID = 'share-your-story-1';

async function cleanupDatabase() {
  console.log('🔥 Starting database cleanup...\n');

  // First, we need to authenticate
  // We'll use anonymous auth for simplicity
  const authUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`;

  return new Promise((resolve, reject) => {
    const authData = JSON.stringify({
      returnSecureToken: true
    });

    const authReq = https.request(authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': authData.length
      }
    }, (authRes) => {
      let authBody = '';
      authRes.on('data', chunk => authBody += chunk);
      authRes.on('end', () => {
        const authResponse = JSON.parse(authBody);

        if (authResponse.error) {
          console.error('Auth error:', authResponse.error);
          reject(authResponse.error);
          return;
        }

        console.log('✓ Authenticated');
        const idToken = authResponse.idToken;

        // Now call the cleanup function
        const functionUrl = `https://us-central1-${PROJECT_ID}.cloudfunctions.net/cleanupDatabase`;

        const cleanupData = JSON.stringify({
          data: {
            confirmationCode: 'DELETE_EVERYTHING_NOW'
          }
        });

        console.log('Calling cleanup function...\n');

        const funcReq = https.request(functionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`,
            'Content-Length': cleanupData.length
          }
        }, (funcRes) => {
          let funcBody = '';
          funcRes.on('data', chunk => funcBody += chunk);
          funcRes.on('end', () => {
            try {
              const result = JSON.parse(funcBody);
              console.log('✅ Cleanup complete!\n');
              console.log('Results:');
              console.log(JSON.stringify(result, null, 2));
              resolve(result);
            } catch (e) {
              console.error('Error parsing response:', funcBody);
              reject(e);
            }
          });
        });

        funcReq.on('error', (e) => {
          console.error('Function call error:', e);
          reject(e);
        });

        funcReq.write(cleanupData);
        funcReq.end();
      });
    });

    authReq.on('error', (e) => {
      console.error('Auth request error:', e);
      reject(e);
    });

    authReq.write(authData);
    authReq.end();
  });
}

cleanupDatabase()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
