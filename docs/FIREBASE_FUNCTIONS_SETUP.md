# Firebase Functions Setup Guide

## OpenAI Proxy Configuration

The `openAIProxy` Firebase Function is **already implemented** in `functions/index.js` (lines 959-1036). This guide shows how to configure and deploy it.

---

## Prerequisites

1. Firebase CLI installed:
```bash
npm install -g firebase-tools
```

2. Logged into Firebase:
```bash
firebase login
```

3. OpenAI API Key (from https://platform.openai.com/api-keys)

---

## Step 1: Set OpenAI API Key

The OpenAI API key must be stored in Firebase Functions config (NOT in your codebase).

### Set the Key

```bash
cd functions
firebase functions:config:set openai.key="sk-your-openai-api-key-here"
```

### Verify the Key is Set

```bash
firebase functions:config:get
```

Should output:
```json
{
  "openai": {
    "key": "sk-your-openai-api-key-here"
  }
}
```

---

## Step 2: Deploy Firebase Functions

### Deploy All Functions

```bash
firebase deploy --only functions
```

### Deploy Only OpenAI Proxy (Faster)

```bash
firebase deploy --only functions:openAIProxy
```

### Check Deployment Status

```bash
firebase functions:list
```

Should show:
```
✔ openAIProxy(us-central1) - https://us-central1-your-project.cloudfunctions.net/openAIProxy
```

---

## Step 3: Test the Proxy

### Test from Firebase Console

1. Go to Firebase Console → Functions
2. Find `openAIProxy`
3. Click "Logs" to monitor requests

### Test from Your App

The client already calls the proxy via `services/openai/config.js`:

```javascript
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions(app);
const openAIProxy = httpsCallable(functions, 'openAIProxy');

const result = await openAIProxy({
  endpoint: '/v1/chat/completions',
  body: {
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: 'Hello!' }],
  }
});

console.log(result.data); // OpenAI response
```

### Manual Test via curl

```bash
# Get your Firebase project ID
firebase projects:list

# Get an ID token (from browser console while logged in)
# In browser console: firebase.auth().currentUser.getIdToken().then(console.log)

# Make request
curl -X POST \
  https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/openAIProxy \
  -H "Authorization: Bearer YOUR_ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "endpoint": "/v1/chat/completions",
      "body": {
        "model": "gpt-4o-mini",
        "messages": [{"role": "user", "content": "Say hello"}],
        "max_tokens": 50
      }
    }
  }'
```

---

## Step 4: Monitor Usage and Costs

### View Function Logs

```bash
firebase functions:log
```

Or in Firebase Console → Functions → openAIProxy → Logs

### Monitor OpenAI Costs

1. Go to https://platform.openai.com/usage
2. Set up billing alerts
3. Monitor daily usage

**Recommended alerts:**
- Daily usage > $10
- Monthly usage > $100

### Track User Usage

The proxy logs every request:
```javascript
console.log(`[openAIProxy] Request from ${context.auth.uid}`);
```

You can analyze logs to see:
- Which users are making requests
- Which endpoints are most used
- Error rates

---

## Security Features

### ✅ Already Implemented

1. **Authentication Required**
   - Only authenticated users can call the function
   - User UID is available in `context.auth.uid`

2. **API Key Security**
   - API key stored server-side only
   - Never exposed to client

3. **Request Validation**
   - Validates endpoint and body exist
   - Checks for OpenAI API key

4. **Error Handling**
   - Proper error messages
   - Logs errors for debugging

### 🚀 Optional Enhancements

Consider adding these for production:

#### 1. Rate Limiting

Add rate limiting to prevent abuse:

```javascript
// At top of functions/index.js
const rateLimit = new Map(); // userId -> { count, resetTime }

exports.openAIProxy = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  const userId = context.auth.uid;
  const now = Date.now();

  // Rate limit: 100 requests per hour
  const limit = rateLimit.get(userId);
  if (limit) {
    if (now < limit.resetTime) {
      if (limit.count >= 100) {
        throw new functions.https.HttpsError(
          'resource-exhausted',
          'Rate limit exceeded. Please try again later.'
        );
      }
      limit.count++;
    } else {
      rateLimit.set(userId, { count: 1, resetTime: now + 3600000 });
    }
  } else {
    rateLimit.set(userId, { count: 1, resetTime: now + 3600000 });
  }

  // Rest of function...
});
```

#### 2. Subscription Tier Validation

Verify user has required subscription:

```javascript
// Get user's subscription tier
const userDoc = await admin.firestore()
  .collection('users')
  .doc(context.auth.uid)
  .get();

const subscriptionPlan = userDoc.data()?.subscriptionPlan || 'basic';

// Check if endpoint requires Gold
if (endpoint.includes('gpt-4o') && subscriptionPlan !== 'gold') {
  throw new functions.https.HttpsError(
    'permission-denied',
    'This feature requires Gold subscription'
  );
}
```

#### 3. Usage Tracking

Track OpenAI API usage per user:

```javascript
// After successful OpenAI request
await admin.firestore()
  .collection('users')
  .doc(context.auth.uid)
  .update({
    'aiUsage.month': admin.firestore.FieldValue.increment(1),
    'aiUsage.lastUsed': admin.firestore.FieldValue.serverTimestamp(),
  });
```

#### 4. Cost Tracking

Estimate costs based on model/tokens:

```javascript
const MODEL_COSTS = {
  'gpt-4o': { input: 0.0025, output: 0.01 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'dall-e-3': { standard: 0.04, hd: 0.08 },
};

// Log cost estimate
const model = body.model || 'gpt-4o-mini';
const tokens = response.usage?.total_tokens || 0;
const estimatedCost = (tokens / 1000) * MODEL_COSTS[model]?.input || 0;

console.log(`[openAIProxy] Estimated cost: $${estimatedCost.toFixed(4)}`);
```

---

## Environment-Specific Configuration

### Development vs Production

Use different API keys for dev and prod:

```bash
# Development
firebase use dev
firebase functions:config:set openai.key="sk-dev-key"

# Production
firebase use prod
firebase functions:config:set openai.key="sk-prod-key"
```

### Local Development

For local testing with Firebase Emulator:

1. Start emulator:
```bash
firebase emulators:start
```

2. Set environment variable:
```bash
firebase functions:config:get > .runtimeconfig.json
```

3. The emulator will use `.runtimeconfig.json`

**⚠️ IMPORTANT:** Add `.runtimeconfig.json` to `.gitignore`!

---

## Troubleshooting

### Error: "OpenAI API is not configured"

**Cause:** API key not set in Firebase config

**Solution:**
```bash
firebase functions:config:set openai.key="your-key"
firebase deploy --only functions:openAIProxy
```

### Error: "User must be authenticated"

**Cause:** User not logged in or token expired

**Solution:**
- Ensure user is logged in
- Check Firebase Auth is initialized
- Verify token hasn't expired

### Error: "Failed to parse OpenAI response"

**Cause:** Invalid response from OpenAI

**Solution:**
- Check OpenAI API key is valid
- Verify endpoint is correct
- Check request body format
- Review Firebase Function logs

### High Costs

**Cause:** Too many requests or using expensive models

**Solutions:**
- Implement rate limiting (see above)
- Use gpt-4o-mini instead of gpt-4o when possible
- Cache responses when appropriate
- Monitor usage in OpenAI dashboard

### Function Timeout

**Cause:** OpenAI request taking too long

**Solution:** Increase function timeout in `functions/index.js`:

```javascript
exports.openAIProxy = functions
  .runWith({ timeoutSeconds: 300 }) // 5 minutes
  .https.onCall(async (data, context) => {
    // ...
  });
```

---

## Cost Optimization

### 1. Use gpt-4o-mini When Possible

- **gpt-4o**: $0.0025/1K input tokens
- **gpt-4o-mini**: $0.00015/1K input tokens (17x cheaper!)

Most Gold features use gpt-4o-mini:
- Summarization ✓
- Post composition ✓
- Comment suggestions ✓
- Translation ✓

Only GPT-4o Vision (cartoon personalization) uses full gpt-4o.

### 2. Implement Caching

Cache common requests:

```javascript
const cache = new Map(); // Simple in-memory cache

const cacheKey = `${endpoint}:${JSON.stringify(body)}`;
if (cache.has(cacheKey)) {
  console.log('[openAIProxy] Returning cached response');
  return cache.get(cacheKey);
}

const response = await makeOpenAIRequest();
cache.set(cacheKey, response);
```

For production, use Redis or Firestore for caching.

### 3. Limit Token Usage

Set reasonable max_tokens limits:

```javascript
// In client code
await callOpenAI(endpoint, {
  model: 'gpt-4o-mini',
  messages: [...],
  max_tokens: 150, // Limit response length
});
```

### 4. Monitor Per-User Usage

Track and limit usage per user:

```javascript
// Monthly limit for Gold users
const GOLD_MONTHLY_LIMIT = 1000; // requests

const userUsage = await getUserMonthlyUsage(userId);
if (userUsage >= GOLD_MONTHLY_LIMIT) {
  throw new functions.https.HttpsError(
    'resource-exhausted',
    'Monthly AI usage limit reached'
  );
}
```

---

## Deployment Checklist

Before deploying to production:

- [ ] OpenAI API key set in Firebase config
- [ ] API key has billing enabled in OpenAI dashboard
- [ ] Billing alerts set up in OpenAI dashboard
- [ ] Function deployed successfully
- [ ] Tested with real user authentication
- [ ] Logs show successful requests
- [ ] Error handling tested
- [ ] Rate limiting implemented (optional but recommended)
- [ ] Usage tracking implemented (optional but recommended)
- [ ] Cost monitoring set up

---

## Next Steps

1. **Deploy the Function:**
   ```bash
   firebase functions:config:set openai.key="your-key"
   firebase deploy --only functions:openAIProxy
   ```

2. **Test Gold Features:**
   - Set a test user to `subscriptionPlan: 'gold'`
   - Try summarization with different styles
   - Generate a personalized cartoon
   - Use Smart Composer

3. **Monitor Costs:**
   - Watch OpenAI usage dashboard
   - Check Firebase Function logs
   - Track per-user usage

4. **Optimize:**
   - Add rate limiting if needed
   - Implement caching for common requests
   - Monitor and adjust max_tokens limits

---

## Support

If you encounter issues:

1. Check Firebase Functions logs:
   ```bash
   firebase functions:log
   ```

2. Check OpenAI dashboard:
   https://platform.openai.com/usage

3. Review the function code:
   `functions/index.js` lines 959-1036

4. Test with curl to isolate issues

---

## References

- [Firebase Functions Documentation](https://firebase.google.com/docs/functions)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Firebase Functions Config](https://firebase.google.com/docs/functions/config-env)
- [OpenAI Pricing](https://openai.com/pricing)
