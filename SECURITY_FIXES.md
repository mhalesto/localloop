# Security Fixes - Implementation Guide

## 1. IMMEDIATE: Revoke Exposed API Keys

### Step 1: Revoke OpenAI Key
Go to: https://platform.openai.com/api-keys
Find and delete: sk-proj-JsfJ_8DF3yte3wvNjaXlE6Vruu_...
Create new key for production

### Step 2: Revoke Hugging Face Key  
Go to: https://huggingface.co/settings/tokens
Delete: hf_XXXX...REDACTED...XXXX
Create new token

### Step 3: Update .gitignore
Add these lines to .gitignore:
```
.env
.env.local
.env.*.local
*.key
*.pem
```

---

## 2. CRITICAL: Enable Payment Webhook Verification

File: functions/index.js (lines 846-851)

Replace this vulnerable code:
```javascript
if (signature !== pfData.signature) {
  console.warn('[payFastWebhook] Signature mismatch - proceeding anyway for debugging');
  // TEMPORARY: Don't reject for debugging purposes
}
```

With this:
```javascript
if (signature !== pfData.signature) {
  console.error('[payFastWebhook] SIGNATURE VERIFICATION FAILED');
  return res.status(400).json({error: 'Invalid signature'});
}
console.log('[payFastWebhook] Signature verified successfully');
```

---

## 3. CRITICAL: Replace Weak Cleanup Secret

File: functions/index.js (line 967)

The hardcoded secret 'cleanup_secret_2024_temp' must be replaced with:
- Firebase authentication (verify ID token)
- Role-based access control (admin custom claims)
- Explicit confirmation code

---

## 4. HIGH: Move OpenAI Calls to Backend

Move these from client (services/openai/profileCartoonService.js):
- DALL-E 3 image generation calls
- Image uploads and storage

To Firebase Functions backend:
- Create generateCartoonProfile callable function
- Verify user authentication server-side
- Check quotas server-side
- Use server-side API key (from Firebase config)

---

## 5. HIGH: Move Hugging Face Calls to Backend

Move auto-tagging from:
- services/autoTaggingService.js (client-side)

To Firebase Functions:
- Create classifyPostTags callable function
- Call Hugging Face with server-side key

---

## 6. HIGH: Fix Firestore Rules - Status Deletion

File: firestore.rules (line 83)

Change from:
```
allow delete: if isSignedIn();
```

To:
```
allow delete: if isSignedIn() && resource.data.authorId == request.auth.uid;
```

---

## Environment Setup

1. Add .env to .gitignore
2. Use EAS secrets for Expo environment variables
3. Use Firebase Functions config for server-side keys

Command:
```
firebase functions:config:set payfast.merchant_id="LIVE_ID"
firebase functions:config:set openai.api_key="sk_live_..."
```

---

## Testing After Implementation

1. Verify payment webhook rejects invalid signatures
2. Verify cleanup function requires Firebase auth
3. Test cartoon generation through backend
4. Test auto-tagging through backend
5. Verify rate limiting works
6. Check error handling doesn't expose sensitive data

See SECURITY_AUDIT_REPORT.md for detailed remediation code examples.
