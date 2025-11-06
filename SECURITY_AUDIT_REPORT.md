# LocalLoop Application - Security & Production Readiness Audit Report
**Date:** November 6, 2025
**Status:** CRITICAL SECURITY ISSUES IDENTIFIED

---

## Executive Summary

The LocalLoop application has several **CRITICAL** security issues that require immediate remediation before production deployment. The primary concerns are:

1. **Exposed API Keys** in version control (.env file)
2. **Hardcoded PayFast credentials** with sandbox values in production code
3. **Disabled signature verification** for payment webhooks
4. **Exposed Firebase credentials** in cleanup scripts
5. **Client-side API keys for server-only services** (OpenAI)
6. **Weak secret validation** for dangerous operations
7. **Missing error handling** in critical payment paths

---

## 1. CRITICAL: API KEY MANAGEMENT

### 1.1 Exposed API Keys in .env File
**Severity:** CRITICAL  
**File:** `/Users/admin/Documents/GitHub/codex/toilet/.env`

**Issues Found:**
- **OpenAI API Key exposed:** `sk-proj-XXXX...REDACTED...XXXX` (key starting with sk-proj-)
- **Hugging Face API Key exposed:** `hf_XXXX...REDACTED...XXXX` (key starting with hf_)
- Both keys are in version control and have been committed to Git history
- .env file is not in .gitignore (likely committed)

**Impact:**
- Attackers can immediately use these API keys
- $100+ per day in unauthorized API usage possible
- Data breach risk for any requests made through these keys

**Remediation:**
```
1. IMMEDIATELY revoke both API keys in provider dashboards:
   - OpenAI: https://platform.openai.com/api-keys
   - Hugging Face: https://huggingface.co/settings/tokens

2. Remove sensitive keys from Git history:
   git filter-branch --tree-filter 'rm -f .env' HEAD
   force push to remote (if no public repository)

3. Add to .gitignore:
   echo ".env" >> .gitignore
   echo ".env.local" >> .gitignore
   echo "*.key" >> .gitignore

4. Use environment-specific configuration:
   - Use EAS secrets for Expo builds
   - Use Firebase Functions config for backend
   - Never commit actual keys

5. Re-generate all API keys after removal
```

---

### 1.2 Firebase Web API Key in Multiple Locations
**Severity:** HIGH  
**Files:** 
- `/Users/admin/Documents/GitHub/codex/toilet/api/firebaseConfig.js` (line 47)
- `/Users/admin/Documents/GitHub/codex/toilet/functions/callCleanup.js` (line 43)

**Issues Found:**
```javascript
// api/firebaseConfig.js
export const firebaseConfig = {
  apiKey: "AIzaSyD9ngUn2O-_TYYzPfEQpDcuNvv-aAMUcIY", // EXPOSED
  authDomain: "share-your-story-1.firebaseapp.com",
  projectId: "share-your-story-1",
  // ...
};
```

**Analysis:**
- Firebase Web API keys are browser-safe by design (restricted by rules)
- However, should still not be exposed in cleanup scripts
- The projectId and authDomain are also exposed but less critical

**Remediation:**
- Use Firebase App Check for additional security
- Implement reCAPTCHA v3 (partially configured in firebaseClient.js with placeholder)
- Restrict API key in Firebase Console to specific referrers

---

### 1.3 PayFast Sandbox Credentials as Fallback
**Severity:** HIGH  
**File:** `/Users/admin/Documents/GitHub/codex/toilet/functions/index.js` (lines 629-630)

**Code:**
```javascript
const getPayFastConfig = () => {
  const config = functions.config().payfast || {};
  return {
    merchantId: config.merchant_id || '10043394', // FALLBACK TO SANDBOX
    merchantKey: config.merchant_key || 'vxS0fu3o299dm', // FALLBACK TO SANDBOX
    passphrase: config.passphrase || '',
    processUrl: 'https://www.payfast.co.za/eng/process', // PRODUCTION URL
  };
};
```

**Issues:**
- If Firebase Functions config not set, uses hardcoded sandbox credentials
- Production URL with sandbox credentials = security vulnerability
- Tests may silently pass with wrong credentials
- Fallback to empty passphrase if not configured

**Remediation:**
```javascript
// DO NOT provide fallbacks for sensitive credentials
const getPayFastConfig = () => {
  const config = functions.config().payfast;
  
  if (!config?.merchant_id || !config?.merchant_key || !config?.passphrase) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'PayFast credentials not configured in Firebase Functions config'
    );
  }
  
  // Validate production setup
  if (process.env.NODE_ENV === 'production') {
    if (config.merchant_id === '10043394') {
      throw new Error('PRODUCTION MODE: Sandbox merchant ID detected!');
    }
  }
  
  return {
    merchantId: config.merchant_id,
    merchantKey: config.merchant_key,
    passphrase: config.passphrase,
    processUrl: process.env.NODE_ENV === 'production' 
      ? 'https://www.payfast.co.za/eng/process'
      : 'https://sandbox.payfast.co.za/eng/process',
  };
};

// Setup instructions:
// firebase functions:config:set payfast.merchant_id="LIVE_ID"
// firebase functions:config:set payfast.merchant_key="LIVE_KEY"
// firebase functions:config:set payfast.passphrase="LIVE_PASSPHRASE"
```

---

### 1.4 OpenAI API Key in Client-Side Code
**Severity:** HIGH  
**Files:**
- `/Users/admin/Documents/GitHub/codex/toilet/services/openai/config.js` (line 14)
- `/Users/admin/Documents/GitHub/codex/toilet/services/openai/profileCartoonService.js` (line 7)

**Issues:**
- OpenAI key is accessed in client JavaScript
- DALL-E 3 calls made directly from mobile app (lines 196-210)
- Key is in .env file marked as EXPO_PUBLIC_*
- Cost exposure: $0.04 per image generation = potential $400/day if abused

**Code Example:**
```javascript
// services/openai/profileCartoonService.js
const response = await fetch('https://api.openai.com/v1/images/generations', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`, // CLIENT-SIDE API KEY
  },
  body: JSON.stringify({
    model: 'dall-e-3',
    prompt: prompt,
    n: 1,
    size: '1024x1024',
    quality: 'standard',
    style: 'vivid',
  }),
});
```

**Remediation:**
- Move all OpenAI API calls to backend (Firebase Functions)
- Use Firebase Functions to proxy OpenAI requests
- Implement rate limiting per user (already partially done)
- Add request signature/authentication

```javascript
// Better approach: Create Firebase Function
exports.generateCartoonProfile = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const userId = context.auth.uid;
  
  // Check user's quota (server-side)
  const userDoc = await admin.firestore().collection('users').doc(userId).get();
  if (!canGenerateCartoon(userDoc.data())) {
    throw new functions.https.HttpsError('resource-exhausted', 'Quota exceeded');
  }
  
  // Call OpenAI with server-side API key
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, // SERVER-SIDE
    },
    body: JSON.stringify({ /* ... */ }),
  });
  
  // Store result and update quota
  // ...
  return { imageUrl };
});
```

---

### 1.5 Hugging Face API Key Exposure
**Severity:** HIGH  
**File:** `/Users/admin/Documents/GitHub/codex/toilet/services/autoTaggingService.js` (line 109)

**Issues:**
- Used in client-side code via `process.env.EXPO_PUBLIC_HF_API_KEY`
- Hugging Face API cost exposure
- No rate limiting visible in service
- 15-second timeout may cause failed requests without retry

**Remediation:**
- Move Hugging Face calls to Firebase Functions backend
- Implement server-side rate limiting
- Cache results to reduce API calls
- Add circuit breaker pattern for API failures

---

## 2. CRITICAL: PAYMENT SECURITY

### 2.1 Disabled Webhook Signature Verification
**Severity:** CRITICAL  
**File:** `/Users/admin/Documents/GitHub/codex/toilet/functions/index.js` (lines 846-851)

**Code:**
```javascript
if (signature !== pfData.signature) {
  console.warn('[payFastWebhook] Signature mismatch - proceeding anyway for debugging');
  // TEMPORARY: Don't reject for debugging purposes
  // return res.status(400).send('Invalid signature');
}
```

**Impact:**
- **ANY ATTACKER** can send fake payment confirmations
- Users can claim they paid without actually paying
- All subscription validations bypass
- Loss of all payment integrity

**Remediation - URGENT:**
```javascript
// Enable signature verification immediately
if (signature !== pfData.signature) {
  console.error('[payFastWebhook] Signature mismatch - REJECTING', {
    received: pfData.signature,
    calculated: signature,
    data: pfData
  });
  return res.status(400).json({ error: 'Invalid signature' });
}

// Log for investigation but don't process
console.log('[payFastWebhook] Signature verification successful', {
  signature: signature.substring(0, 8) + '...',
  status: pfData.payment_status
});
```

### 2.2 Weak Database Cleanup Secret
**Severity:** CRITICAL  
**File:** `/Users/admin/Documents/GitHub/codex/toilet/functions/index.js` (line 967)

**Code:**
```javascript
if (secretKey !== 'cleanup_secret_2024_temp') {
  console.log('[cleanupDatabaseHTTP] Invalid secret key');
  res.status(403).json({error: 'Invalid secret key'});
  return;
}
```

**Issues:**
- Secret key is visible in source code
- "TEMP" indicates it's a placeholder that was never replaced
- Allows deletion of entire database with single HTTP request
- No authentication required, only secret string matching
- String is weak (predictable, short, contains "temp")

**Impact:**
- Attacker can delete all user data, posts, subscriptions, authentication records
- One curl request to destroy entire application

**Remediation:**
```javascript
// Option 1: Use Firebase Authentication + elevated permissions
exports.cleanupDatabaseHTTP = functions.https.onRequest(async (req, res) => {
  // Verify user is admin (use Firebase custom claims)
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({error: 'Missing bearer token'});
  }
  
  try {
    const decodedToken = await admin.auth().verifyIdToken(authHeader.slice(7));
    if (decodedToken.customClaims?.admin !== true) {
      return res.status(403).json({error: 'Admin privilege required'});
    }
  } catch (error) {
    return res.status(401).json({error: 'Invalid token'});
  }
  
  // Require explicit confirmation (MFA-like)
  const confirmationCode = req.body?.confirmationCode;
  if (confirmationCode !== generateConfirmationCode(decodedToken.uid)) {
    return res.status(400).json({error: 'Invalid confirmation code'});
  }
  
  // Proceed with cleanup
  // Log all changes
  // ...
});

// Option 2: Require approval from multiple admins (safer)
// Option 3: Only allow through Google Cloud Console, not HTTP endpoint
```

### 2.3 Missing Idempotency for Payment Webhook
**Severity:** HIGH  
**File:** `/Users/admin/Documents/GitHub/codex/toilet/functions/index.js` (line 854)

**Issues:**
- Payment webhook can be received multiple times (PayFast retries)
- No idempotency key checking
- Duplicate payments could update subscription multiple times
- Missing transaction locks

**Remediation:**
```javascript
exports.payFastWebhook = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  
  try {
    const pfData = req.body;
    const idempotencyKey = pfData.m_payment_id; // PayFast payment ID
    
    // Check if we already processed this payment
    const existingDoc = await admin.firestore()
      .collection('payments')
      .where('payFastPaymentId', '==', idempotencyKey)
      .limit(1)
      .get();
    
    if (!existingDoc.empty) {
      console.log('[payFastWebhook] Duplicate webhook detected, ignoring');
      return res.status(200).json({ success: true, duplicate: true });
    }
    
    // Process payment in transaction
    await admin.firestore().runTransaction(async (transaction) => {
      // Record payment
      transaction.set(admin.firestore().collection('payments').doc(), {
        payFastPaymentId: idempotencyKey,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        status: pfData.payment_status,
        userId: pfData.custom_str1,
        // ...
      });
      
      // Update user subscription
      if (pfData.payment_status === 'COMPLETE') {
        transaction.update(
          admin.firestore().collection('users').doc(pfData.custom_str1),
          { subscriptionPlan: pfData.custom_str2, /* ... */ }
        );
      }
    });
    
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('[payFastWebhook] Error:', error);
    return res.status(500).json({ error: 'Webhook handler failed' });
  }
});
```

---

## 3. FIRESTORE SECURITY RULES

### 3.1 Public Read on User Data
**Severity:** MEDIUM  
**File:** `/Users/admin/Documents/GitHub/codex/toilet/firestore.rules` (line 94)

**Code:**
```
match /users/{userId} {
  allow read: if true;  // PUBLIC READ
  allow create: if isOwner(userId);
  allow update: if isOwner(userId);
  allow delete: if isOwner(userId);
}
```

**Analysis:**
- User profiles are intentionally public (social app design)
- Acceptable for general user info (username, bio, avatar)
- **Check:** Ensure sensitive data not stored in user documents:
  - No payment info ✓ (good)
  - No email addresses (verify in code)
  - No private settings
  - No API keys ✓ (good - in .env)

**Recommendation:**
```
match /users/{userId} {
  // Public profile info only
  allow read: if true;
  
  // Own profile (all data)
  allow read: if isOwner(userId);
  
  allow create: if isOwner(userId);
  allow update: if isOwner(userId);
  allow delete: if isOwner(userId);
  
  // Sensitive subcollections
  match /subscriptions/{doc=**} {
    allow read, write: if isOwner(userId);
  }
  
  match /payments/{doc=**} {
    allow read, write: if isOwner(userId);
  }
}
```

### 3.2 Status Deletion by Any Signed-In User
**Severity:** MEDIUM  
**File:** `/Users/admin/Documents/GitHub/codex/toilet/firestore.rules` (line 83)

**Code:**
```
match /statuses/{statusId} {
  allow read: if true;
  allow create: if isSignedIn()
    && request.resource.data.authorId == request.auth.uid;
  allow update: if isSignedIn()
    && (resource.data.authorId == request.auth.uid || ...);
  allow delete: if isSignedIn();  // ANY SIGNED-IN USER CAN DELETE
}
```

**Issues:**
- Any authenticated user can delete any status
- Enables griefing/harassment
- Violates data ownership

**Remediation:**
```
allow delete: if isSignedIn() && resource.data.authorId == request.auth.uid;
```

### 3.3 Status Update Permissions
**Severity:** LOW  
**File:** `/Users/admin/Documents/GitHub/codex/toilet/firestore.rules` (lines 76-81)

**Code:**
```
allow update: if isSignedIn()
  && (
    resource.data.authorId == request.auth.uid ||
    !request.resource.data.diff(resource.data).affectedKeys()
      .hasAny(['authorId', 'createdAt'])
  );
```

**Analysis:**
- Non-owners can update reactions/votes (good)
- Complex rule - verify it works correctly
- Consider breaking into separate subcollections for clarity

---

## 4. AUTHENTICATION SECURITY

### 4.1 Google OAuth Configuration
**Status:** ACCEPTABLE  
**File:** `/Users/admin/Documents/GitHub/codex/toilet/contexts/AuthContext.js`

**Good practices found:**
- Uses Expo Auth Session (proper OAuth flow)
- No hardcoded credentials in auth flow
- Google providers properly configured

**Verification needed:**
- Verify Google Cloud OAuth consent screen is set to "Internal" (not public)
- Verify redirect URIs in Google Cloud match code
- Check iOS/Android native client IDs are configured (currently reusing Web ID)

---

## 5. ERROR HANDLING & CRASH REPORTING

### 5.1 Missing Error Handling in Critical Paths
**Severity:** MEDIUM  
**File:** `/Users/admin/Documents/GitHub/codex/toilet/api/statusService.js` (line 287)

**Code:**
```javascript
.catch((e) => console.warn('[statusService] update repliesCount failed', e));
```

**Issues:**
- Silent failure - error logged but no user feedback
- Application continues with inconsistent state
- No retry mechanism

**Recommendation:**
```javascript
.catch((e) => {
  console.error('[statusService] Uncaught error:', e);
  // Send to crash reporting service (Sentry, Firebase Crashlytics)
  // Notify user through AlertContext
  // Implement exponential backoff retry
});
```

### 5.2 Unhandled Promise Rejections in Services
**Severity:** MEDIUM  
**Files:** Multiple service files

**Recommendation:**
- Add global unhandled rejection handler:
```javascript
// In root of app
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Send to crash reporting
  // Show error to user
});
```

---

## 6. PRODUCTION CONFIGURATION

### 6.1 Debug Code in Production
**Severity:** MEDIUM  
**Files:**
- `/Users/admin/Documents/GitHub/codex/toilet/screens/PaymentScreen.js` (lines 93-130) - Simulated payment
- `/Users/admin/Documents/GitHub/codex/toilet/screens/SettingsScreen.js` - "Reset subscription for testing"

**Issues:**
```javascript
// screens/PaymentScreen.js
const handleSimulatedPayment = async () => {
  // Simulated payment for testing (when PayFast Functions not deployed)
  setIsProcessing(true);
  try {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await updateUserProfile(user.uid, {
      subscriptionPlan: planId,
      // ... Manually updates profile without actual payment
    });
```

**Remediation:**
- Remove test functions before shipping
- Use Firebase Remote Config to disable features:
```javascript
const testsEnabled = await remoteConfig.getBoolean('enableTestPayments');
if (!testsEnabled && !paymentUrl) {
  throw new Error('Payment system not available');
}
```

### 6.2 Console Logging of Sensitive Data
**Severity:** MEDIUM  
**File:** `/Users/admin/Documents/GitHub/codex/toilet/functions/index.js` (line 779)

**Code:**
```javascript
console.log('[createPayFastPayment] Payment data:', JSON.stringify(paymentData, null, 2));
```

**Issues:**
- Logs full payment data including user email, payment amounts
- Visible in production logs
- Contains personally identifiable information (PII)

**Remediation:**
```javascript
// Mask sensitive data before logging
const maskedData = {
  ...paymentData,
  email_address: '***@***.com',
  amount: '***',
};
console.log('[createPayFastPayment] Payment initiated for user:', paymentData.custom_str1);

// Better: Use structured logging with levels
if (process.env.NODE_ENV === 'development') {
  console.debug('[createPayFastPayment] Full data:', paymentData);
}
```

---

## 7. SECURITY CHECKLIST

### Critical (Must Fix Before Production)
- [ ] Remove exposed API keys from .env file
- [ ] Revoke compromised API keys (OpenAI, Hugging Face)
- [ ] Enable PayFast webhook signature verification
- [ ] Replace weak cleanup secret with proper authentication
- [ ] Move OpenAI calls from client to backend
- [ ] Move Hugging Face calls from client to backend
- [ ] Add idempotency to payment webhook
- [ ] Remove hardcoded PayFast sandbox credentials

### High Priority (Fix Before Launch)
- [ ] Implement proper error handling and crash reporting
- [ ] Add rate limiting to all API endpoints
- [ ] Configure Firebase App Check with reCAPTCHA
- [ ] Fix status deletion rule in Firestore
- [ ] Remove test payment functions
- [ ] Stop logging sensitive data (PII, payment info)
- [ ] Implement idempotency keys for all operations

### Medium Priority (Near-term)
- [ ] Add environment variable validation at startup
- [ ] Implement proper authentication for admin functions
- [ ] Break down complex Firestore rules
- [ ] Add transaction locks for payment updates
- [ ] Implement proper secret rotation procedure
- [ ] Add backend rate limiting

### Low Priority (Best Practices)
- [ ] Use structured logging (Winston, Pino)
- [ ] Implement API request signing
- [ ] Add security headers
- [ ] Implement API versioning
- [ ] Add request/response validation schema

---

## 8. RECOMMENDATIONS

### Environment Management
```bash
# .env.example (safe to commit)
EXPO_PUBLIC_OPENAI_API_KEY=sk_test_YOUR_KEY_HERE
EXPO_PUBLIC_HF_API_KEY=hf_YOUR_KEY_HERE

# .env (add to .gitignore)
EXPO_PUBLIC_OPENAI_API_KEY=sk_live_...
EXPO_PUBLIC_HF_API_KEY=hf_...
```

### Backend API Pattern
```javascript
// Create Firebase Function wrapper for sensitive APIs

// Client: Call safe backend function
const functions = getFunctions();
const generateCartoon = httpsCallable(functions, 'generateCartoonProfile');
const result = await generateCartoon({ styleId: 'pixar' });

// Backend: Handle authentication, rate limiting, billing
exports.generateCartoonProfile = functions.https.onCall(async (data, context) => {
  // 1. Verify user
  // 2. Check quota
  // 3. Call OpenAI with server-side key
  // 4. Store result
  // 5. Update quota
  return { imageUrl };
});
```

### Sensitive Operations
```javascript
// Require confirmation for destructive operations
exports.deleteAccount = functions.https.onCall(async (data, context) => {
  const { confirmationCode } = data;
  const expectedCode = hashUid(context.auth.uid);
  
  if (confirmationCode !== expectedCode) {
    throw new functions.https.HttpsError('permission-denied', 'Invalid confirmation');
  }
  
  // Proceed with deletion
});
```

---

## Immediate Action Items

**Next 24 hours:**
1. Revoke API keys: OpenAI, Hugging Face
2. Enable webhook signature verification
3. Replace cleanup secret with proper auth
4. Commit .gitignore changes
5. Force push Git history cleanup (if no public repository)

**Next 1 week:**
1. Move OpenAI calls to backend
2. Move Hugging Face calls to backend
3. Implement proper error handling
4. Add rate limiting
5. Remove test payment functions
6. Fix Firestore rules

**Before production launch:**
1. Complete all critical items
2. Penetration testing
3. Security code review
4. Set up crash reporting
5. Set up monitoring and logging

---

## Conclusion

The LocalLoop application has a solid architecture but contains critical security flaws that must be addressed before production. The exposed API keys alone could cost thousands in unauthorized API usage. The disabled payment verification is a critical vulnerability that undermines the entire business model.

**Risk Assessment:** **CRITICAL** - Do not deploy to production without addressing critical items.

**Estimated Fix Time:** 1-2 weeks for comprehensive remediation
