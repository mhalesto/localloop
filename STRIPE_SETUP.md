# Stripe Integration Setup Guide

This guide will help you complete the Stripe payment integration for your subscription system.

## Overview

The Stripe integration is **ready to use** but requires configuration of API keys. Currently, the app uses **simulated payments** for testing. Follow these steps to enable real Stripe payments.

## What's Already Done ✅

- ✅ Stripe SDK installed in mobile app (`@stripe/stripe-react-native`)
- ✅ PaymentScreen updated with Stripe CardField component
- ✅ Firebase Functions created for payment processing
- ✅ Subscription enforcement and limits implemented
- ✅ Upgrade prompts for premium features

## Setup Steps

### 1. Create Stripe Account

1. Go to [https://stripe.com](https://stripe.com) and sign up
2. Complete account verification
3. Navigate to [Dashboard → API Keys](https://dashboard.stripe.com/apikeys)

### 2. Get Your API Keys

You'll need two keys:

**Publishable Key** (starts with `pk_test_` or `pk_live_`)
- This goes in your mobile app
- Safe to expose publicly

**Secret Key** (starts with `sk_test_` or `sk_live_`)
- This goes in Firebase Functions
- Keep this private and secure

### 3. Configure Mobile App

**File:** `screens/PaymentScreen.js` (Line 22)

Replace:
```javascript
const STRIPE_PUBLISHABLE_KEY = 'pk_test_YOUR_PUBLISHABLE_KEY_HERE';
```

With your actual publishable key:
```javascript
const STRIPE_PUBLISHABLE_KEY = 'pk_test_abc123...'; // Your real key
```

### 4. Install Stripe in Firebase Functions

Run this command from your project root:

```bash
npm install stripe --prefix functions
```

### 5. Configure Firebase Functions

Set your Stripe secret key as a Firebase config variable:

```bash
firebase functions:config:set stripe.secret_key="sk_test_YOUR_SECRET_KEY"
```

Set your Stripe webhook secret (get this from step 7):

```bash
firebase functions:config:set stripe.webhook_secret="whsec_YOUR_WEBHOOK_SECRET"
```

### 6. Enable Stripe Functions

**File:** `functions/index.js` (Lines 500-683)

Uncomment the Stripe integration code:
1. Remove `/*` at line 501
2. Remove `*/` at line 683
3. Uncomment line 502: `const stripe = require('stripe')(functions.config().stripe.secret_key);`

### 7. Deploy Firebase Functions

```bash
firebase deploy --only functions
```

This will deploy:
- `createPaymentIntent` - Creates payment intents
- `stripeWebhook` - Handles payment success/failure

Note the function URLs in the deployment output.

### 8. Configure Stripe Webhook

1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Enter your webhook URL:
   ```
   https://YOUR_REGION-YOUR_PROJECT.cloudfunctions.net/stripeWebhook
   ```
4. Select events to listen for:
   - `payment_intent.succeeded`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the "Signing secret" (starts with `whsec_`)
6. Add it to Firebase config (see step 5)

### 9. Enable Real Stripe Payments

**File:** `screens/PaymentScreen.js` (Lines 44-78)

1. **Uncomment** the Stripe payment code (lines 45-77)
2. **Comment out** or **remove** the simulated payment code (lines 80-102)

The payment flow will now:
1. Collect card details with Stripe CardField
2. Create payment intent via Firebase Function
3. Confirm payment with Stripe
4. Webhook updates user subscription in Firestore

### 10. Test the Integration

#### Test Mode (Recommended First)

Use Stripe test cards:
- **Success:** `4242 4242 4242 4242`
- **Decline:** `4000 0000 0000 0002`
- **Requires Auth:** `4000 0025 0000 3155`

Any future expiry date and any 3-digit CVC.

#### Test Flow

1. Navigate to Subscription screen
2. Select a plan (Premium or Gold)
3. Enter test card details
4. Complete payment
5. Verify:
   - Payment appears in [Stripe Dashboard](https://dashboard.stripe.com/payments)
   - User profile updated in Firestore
   - Premium features unlocked

### 11. Go Live

When ready for production:

1. Switch to **Live mode** in Stripe Dashboard
2. Get your **live API keys** (`pk_live_...` and `sk_live_...`)
3. Update keys in:
   - Mobile app (PaymentScreen.js)
   - Firebase Functions config
4. Update webhook to use live mode
5. Re-deploy functions with live keys

## Currency Configuration

Currently set to **ZAR (South African Rand)**. To change:

**File:** `functions/index.js` (Line 517)
```javascript
const {planId, amount, currency = 'zar'} = data;
```

Change `'zar'` to your currency code (e.g., `'usd'`, `'gbp'`, `'eur'`).

Also update in **`config/subscriptionPlans.js`** if needed.

## Subscription Plans

Current pricing:
- **Basic:** R0 (Free)
- **Premium:** R49.99/month
- **Gold:** R499.99/year

To modify, edit: `config/subscriptionPlans.js`

## Troubleshooting

### Card Field Not Showing
- Ensure Stripe SDK is installed: `npm install @stripe/stripe-react-native`
- Check Metro bundler is running
- Clear cache: `npm start -- --reset-cache`

### Payment Intent Creation Fails
- Verify Firebase Functions deployed: `firebase functions:list`
- Check logs: `firebase functions:log`
- Ensure secret key is set correctly

### Webhook Not Working
- Verify webhook URL is correct
- Check webhook signing secret is configured
- Test webhook in Stripe Dashboard (Send test webhook)
- Check Firebase Functions logs

### Payment Succeeds But Subscription Not Updated
- Check webhook is configured and receiving events
- Verify `stripeWebhook` function is deployed
- Check Firestore security rules allow function writes
- Review Firebase Functions logs for errors

## Security Best Practices

✅ **DO:**
- Use test mode during development
- Keep secret keys in Firebase config (never in code)
- Validate payments on server (Firebase Functions)
- Use webhook signatures to verify events
- Test error scenarios

❌ **DON'T:**
- Commit API keys to git
- Use live keys in development
- Trust client-side payment status
- Skip webhook signature verification
- Ignore failed payment webhooks

## Cost Considerations

**Stripe Fees:**
- International cards: **2.9% + $0.30** per transaction
- Local cards (South Africa): **2.9% + R2.00** per transaction
- No monthly fees
- No setup fees

**Example:**
- Premium (R49.99): **R1.45 + R2.00 = R3.45 fee** (R46.54 net)
- Gold (R499.99): **R14.50 + R2.00 = R16.50 fee** (R483.49 net)

## Support

- **Stripe Documentation:** https://stripe.com/docs
- **Stripe React Native:** https://stripe.com/docs/payments/accept-a-payment?platform=react-native
- **Firebase Functions:** https://firebase.google.com/docs/functions

## Next Steps

After Stripe is working:
1. Add subscription management (cancel, upgrade, downgrade)
2. Implement subscription renewal logic
3. Add email receipts via Stripe
4. Set up customer portal
5. Monitor failed payments and retry logic

---

Need help? Check Stripe's test mode thoroughly before going live!
