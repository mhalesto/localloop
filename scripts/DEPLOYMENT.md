# Gold Features Deployment Guide

## Quick Deployment (Recommended)

### Step 1: Get Your OpenAI API Key

1. Go to https://platform.openai.com/api-keys
2. Click "Create new secret key"
3. Copy the key (starts with `sk-`)

### Step 2: Run Deployment Script

```bash
# Export your API key
export OPENAI_API_KEY='sk-your-actual-key-here'

# Run deployment script
./scripts/deploy-gold-features.sh
```

The script will:
- ✅ Verify Firebase CLI is installed
- ✅ Check you're logged in
- ✅ Set OpenAI API key in Firebase config
- ✅ Deploy OpenAI proxy function
- ✅ Verify deployment

---

## Manual Deployment

If you prefer to deploy manually:

```bash
# 1. Set OpenAI API key
firebase functions:config:set openai.key="sk-your-key-here"

# 2. Install function dependencies
cd functions
npm install
cd ..

# 3. Deploy function
firebase deploy --only functions:openAIProxy

# 4. Verify
firebase functions:list
```

---

## Verification

### Check Function is Deployed

```bash
firebase functions:list
```

Should show:
```
openAIProxy(us-central1)
```

### Check API Key is Set

```bash
firebase functions:config:get
```

Should show:
```json
{
  "openai": {
    "key": "sk-..."
  }
}
```

### View Logs

```bash
firebase functions:log --only openAIProxy
```

---

## Testing

After deployment, test in your app:

1. **Set Test User to Gold**
   ```javascript
   // In Firebase Console or via script
   users/{userId}.subscriptionPlan = 'gold'
   ```

2. **Try Each Feature:**
   - AI Summarization (4 styles)
   - Cartoon Generation (with Vision)
   - Smart Post Composer
   - Comment Suggestions
   - Translation

3. **Check Logs:**
   ```bash
   firebase functions:log --only openAIProxy --limit 50
   ```

---

## Monitor Costs

### OpenAI Dashboard
https://platform.openai.com/usage

Set up billing alerts:
- Daily usage > $10
- Monthly usage > $100

### View Costs in App

Use the monitoring script:
```bash
node scripts/monitor-gold-costs.js
```

---

## Troubleshooting

### "OpenAI API key not configured"

```bash
firebase functions:config:set openai.key="sk-your-key"
firebase deploy --only functions:openAIProxy
```

### "User must be authenticated"

Make sure user is logged in and token is valid.

### Function timeout

Increase timeout in `functions/index.js`:

```javascript
exports.openAIProxy = functions
  .runWith({ timeoutSeconds: 300 })
  .https.onCall(async (data, context) => {
    // ...
  });
```

### High costs

1. Check usage: https://platform.openai.com/usage
2. Implement rate limiting (see `docs/FIREBASE_FUNCTIONS_SETUP.md`)
3. Monitor per-user usage

---

## Rollback

If something goes wrong:

```bash
# Remove API key
firebase functions:config:unset openai.key

# Revert to previous deployment
firebase deploy --only functions:openAIProxy
```

---

## Support

- Firebase Console: https://console.firebase.google.com
- OpenAI Dashboard: https://platform.openai.com
- Logs: `firebase functions:log`
- Documentation: `docs/FIREBASE_FUNCTIONS_SETUP.md`
