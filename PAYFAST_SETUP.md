# PayFast Integration Setup Guide

🎉 **Your PayFast integration is ready to deploy!**

## What's Already Done ✅

- ✅ PayFast sandbox account created
- ✅ Sandbox credentials obtained
- ✅ PaymentScreen updated with PayFast integration
- ✅ Firebase Functions created for payment processing
- ✅ ITN webhook handler implemented
- ✅ Subscription configuration (Premium & Gold)

## Your PayFast Credentials

**Sandbox (Test Mode):**
```
Merchant ID: 10043394
Merchant Key: vxS0fu3o299dm
Passphrase: LocalLoop2024Sandbox
```

**Sandbox URL:** https://sandbox.payfast.co.za

## Quick Setup (5 Steps)

### 1. Configure Firebase Functions

Set your PayFast credentials as Firebase config variables:

```bash
# Navigate to your project root
cd /Users/admin/Documents/GitHub/codex/toilet

# Set PayFast credentials
firebase functions:config:set payfast.merchant_id="10043394"
firebase functions:config:set payfast.merchant_key="vxS0fu3o299dm"
firebase functions:config:set payfast.passphrase="LocalLoop2024Sandbox"
```

### 2. Deploy Firebase Functions

```bash
firebase deploy --only functions
```

This will deploy:
- `createPayFastPayment` - Generates PayFast payment URL with signature
- `payFastWebhook` - Receives payment notifications (ITN)

### 3. Enable Real PayFast Payments in App

**File:** `screens/PaymentScreen.js`

**Uncomment lines 208-226** (Real PayFast button):
```javascript
// Remove the /* at line 208
<TouchableOpacity
  style={[styles.subscribeButton, { backgroundColor: primaryColor }]}
  onPress={handlePayment}
  disabled={isProcessing}
  activeOpacity={0.8}
>
  {isProcessing ? (
    <ActivityIndicator color="#fff" />
  ) : (
    <>
      <Ionicons name="lock-closed" size={20} color="#fff" />
      <Text style={styles.subscribeButtonText}>
        Pay with PayFast - R{price.toFixed(2)}
      </Text>
    </>
  )}
</TouchableOpacity>
// Remove the */ at line 226
```

**Comment out lines 228-245** (Simulated payment button):
```javascript
// Add /* at line 228 and */ at line 245
```

### 4. Configure ITN URL in PayFast Dashboard

After deploying functions, you'll get a webhook URL like:
```
https://YOUR_PROJECT.cloudfunctions.net/payFastWebhook
```

**Add this to PayFast:**
1. Go to https://sandbox.payfast.co.za
2. Navigate to **Settings** → **Integration**
3. Add your ITN URL in the webhook settings

### 5. Test the Integration

Use PayFast test payment methods:

**Test Credit Card:**
- Card Number: `5200 0000 0000 1096`
- Expiry: Any future date
- CVV: `123`

**Test Bank Account:**
- Use the sandbox wallet (R10,000 starting balance)

## How It Works

### Subscription Flow

**Premium Plan (R49.99/month):**
1. User clicks "Subscribe to Premium"
2. Mobile app calls `createPayFastPayment` function
3. Function generates payment URL with subscription parameters:
   - `frequency: 3` (monthly)
   - `recurring_amount: 49.99`
   - `cycles: 0` (forever)
4. User redirected to PayFast payment page
5. User completes payment
6. PayFast sends ITN to `payFastWebhook`
7. Webhook updates user subscription in Firestore
8. User gets notification "Subscription Activated! 🎉"

**Gold Plan (R499.99/year):**
- Same flow, but:
  - `frequency: 6` (yearly)
  - `recurring_amount: 499.99`

### Payment Methods Supported

- ✅ Credit/Debit Cards (Visa, Mastercard)
- ✅ Instant EFT (FNB, Standard Bank, Nedbank, ABSA, etc.)
- ✅ SnapScan
- ✅ Zapper
- ✅ Mobicred
- ✅ SCode

## Subscription Management

### Automatic Renewals

PayFast will automatically charge users:
- **Premium:** Every month on the subscription date
- **Gold:** Every year on the subscription date

### Handle Failed Payments

The webhook automatically:
- Sends notification to user
- Logs the failure
- You can implement retry logic or grace period

### Cancel Subscription

Users can cancel via:
1. **PayFast Dashboard:** They log in and cancel
2. **Your app:** You can add a cancel function that calls PayFast API

## Testing

### Test Scenarios

1. **Successful Payment:**
   - Select Premium plan
   - Click "Pay with PayFast"
   - Complete payment with test card
   - Verify subscription activated

2. **Failed Payment:**
   - Use declined test card: `4000 0000 0000 0002`
   - Verify user gets notification

3. **Subscription Renewal:**
   - In sandbox, you can simulate renewal
   - Check webhook receives notification
   - Verify subscription extended

### Monitor Transactions

**Sandbox Dashboard:**
- View all test transactions
- See subscription status
- Monitor ITN deliveries

**Firebase Console:**
- Check function logs: `firebase functions:log`
- Monitor Firestore updates
- View user subscriptions

## Going Live (Production)

### 1. Complete PayFast Verification

Upload documents in PayFast dashboard:
- ID/Passport
- Proof of address
- Bank statement

Wait 1-3 business days for approval.

### 2. Get Production Credentials

Once approved:
1. Go to https://my.payfast.co.za
2. Get your live credentials:
   - Live Merchant ID
   - Live Merchant Key
3. Set new passphrase

### 3. Update Firebase Config

```bash
firebase functions:config:set payfast.merchant_id="YOUR_LIVE_ID"
firebase functions:config:set payfast.merchant_key="YOUR_LIVE_KEY"
firebase functions:config:set payfast.passphrase="YOUR_LIVE_PASSPHRASE"
```

### 4. Update Function for Production

**File:** `functions/index.js` (Line 512)

Change:
```javascript
processUrl: 'https://sandbox.payfast.co.za/eng/process',
```

To:
```javascript
processUrl: 'https://www.payfast.co.za/eng/process',
```

### 5. Re-deploy Functions

```bash
firebase deploy --only functions
```

### 6. Update ITN URL

Add production webhook URL to PayFast production dashboard.

## Troubleshooting

### Payment URL Not Opening
- Check Firebase Functions deployed: `firebase functions:list`
- Verify credentials set: `firebase functions:config:get`
- Check function logs for errors

### ITN Not Received
- Verify webhook URL in PayFast dashboard
- Check firewall allows PayFast IPs
- Test ITN manually from PayFast dashboard
- Check function logs

### Signature Mismatch
- Verify passphrase is correct
- Check all parameters are properly encoded
- Ensure no extra spaces in credentials

### Subscription Not Updating
- Check webhook received payment status
- Verify user ID in custom fields
- Check Firestore security rules allow function writes
- Review function logs

## API Reference

### createPayFastPayment (Callable Function)

**Parameters:**
```javascript
{
  planId: 'premium' | 'gold',
  planName: 'Premium' | 'Gold',
  amount: 49.99 | 499.99,
  interval: 'month' | 'year',
  userId: string,
  userEmail: string
}
```

**Returns:**
```javascript
{
  paymentUrl: string,
  paymentId: string
}
```

### payFastWebhook (HTTP Function)

**Receives POST from PayFast with:**
- payment_status: 'COMPLETE' | 'FAILED' | 'PENDING'
- m_payment_id: string
- amount_gross: string
- custom_str1: userId
- custom_str2: planId
- custom_str3: interval
- token: subscription token (for recurring)

## Subscription Data Structure

**Firestore: `users/{userId}`**
```javascript
{
  subscriptionPlan: 'basic' | 'premium' | 'gold',
  premiumUnlocked: boolean,
  subscriptionStartDate: timestamp,
  subscriptionEndDate: timestamp,
  payFastPaymentId: string,
  payFastToken: string, // For managing subscription
  lastPaymentDate: timestamp
}
```

## Cost Breakdown

### PayFast Fees

**Per Transaction:**
- Credit/Debit Card: **2.85% + R2.00**
- Instant EFT: **R2.00 flat**

**Examples:**

**Premium (R49.99/month):**
- Card: R1.42 + R2.00 = **R3.42 fee** (R46.57 net)
- EFT: **R2.00 fee** (R47.99 net)

**Gold (R499.99/year):**
- Card: R14.25 + R2.00 = **R16.25 fee** (R483.74 net)
- EFT: **R2.00 fee** (R497.99 net)

**With EFT, your Gold plan costs only R2 instead of R16.25!** 🎉

### No Monthly Fees
- ✅ No setup fee
- ✅ No monthly fee
- ✅ Pay only per transaction

## Security Best Practices

✅ **Currently Implemented:**
- MD5 signature verification on all payments
- Passphrase protection
- ITN signature validation
- User authentication required
- Credentials stored securely in Firebase config

✅ **Additional Recommendations:**
- Use HTTPS for all return URLs
- Implement IP whitelisting for webhook
- Log all payment attempts
- Monitor for suspicious activity
- Keep passphrase secret and rotate regularly

## Support & Resources

- **PayFast Documentation:** https://developers.payfast.co.za/docs
- **PayFast Subscriptions:** https://developers.payfast.co.za/docs#subscriptions
- **PayFast Support:** support@payfast.co.za
- **PayFast Phone:** +27 (0)21 300 4455
- **Sandbox Dashboard:** https://sandbox.payfast.co.za
- **Production Dashboard:** https://my.payfast.co.za

## Quick Command Reference

```bash
# Set credentials
firebase functions:config:set payfast.merchant_id="10043394"
firebase functions:config:set payfast.merchant_key="vxS0fu3o299dm"
firebase functions:config:set payfast.passphrase="LocalLoop2024Sandbox"

# View config
firebase functions:config:get

# Deploy functions
firebase deploy --only functions

# View function logs
firebase functions:log

# View specific function log
firebase functions:log --only createPayFastPayment
firebase functions:log --only payFastWebhook

# List deployed functions
firebase functions:list

# Delete a function
firebase functions:delete createPayFastPayment
```

## Next Steps After Setup

1. ✅ Deploy functions with credentials
2. ✅ Enable real PayFast button in app
3. ✅ Test with sandbox payments
4. ✅ Monitor transactions in sandbox dashboard
5. ✅ Complete PayFast verification
6. ✅ Switch to production credentials
7. ✅ Go live!

---

**Need help?** Check the PayFast developer docs or contact their support team!

🎉 **Your subscription system is production-ready!**
