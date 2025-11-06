# Firebase Budget Alerts Setup Guide

## 🚨 CRITICAL: Set Up Cost Protection NOW

Protect your Firebase and Google Cloud resources from unexpected costs by setting up budget alerts. Follow this guide step-by-step.

---

## 1. Google Cloud Budget Alerts (for Firebase Functions & OpenAI)

### Step 1: Access Google Cloud Console
1. Go to https://console.cloud.google.com/
2. Select your project: `share-your-story-1`
3. Navigate to **Billing** → **Budgets & Alerts**

### Step 2: Create a Budget
1. Click **CREATE BUDGET**
2. Configure the budget:
   - **Name**: "Firebase Monthly Budget"
   - **Time range**: Monthly
   - **Projects**: Select `share-your-story-1`
   - **Services**: All services (or select specific ones like Cloud Functions, Firestore)

### Step 3: Set Budget Amount
**Recommended budget tiers based on your app usage:**

#### Starter (Testing/Development)
- **Budget**: $50/month
- **Alert thresholds**: 50%, 75%, 90%, 100%

#### Small App (< 1000 users)
- **Budget**: $200/month
- **Alert thresholds**: 50%, 75%, 90%, 100%, 120%

#### Growing App (1000-10000 users)
- **Budget**: $500/month
- **Alert thresholds**: 50%, 75%, 90%, 100%, 120%

### Step 4: Configure Alert Thresholds
Add these alert thresholds:
- **50%**: Early warning
- **75%**: Consider optimization
- **90%**: Urgent review needed
- **100%**: Budget reached
- **120%**: Emergency - immediate action required

### Step 5: Set Up Notifications
1. Add email recipients (your email + team members)
2. Optional: Set up Pub/Sub for programmatic alerts
3. Enable "Email alerts to billing admins and users"

---

## 2. Firebase-Specific Monitoring

### Firestore Daily Quotas
```javascript
// Set in Firebase Console > Firestore > Usage
Daily Limits:
- Reads: 50,000
- Writes: 20,000
- Deletes: 20,000
```

### Cloud Functions Quotas
```javascript
// Monitor in Google Cloud Console > Cloud Functions
Recommended Limits:
- Invocations: 125,000/month (free tier)
- GB-seconds: 400,000/month (free tier)
- Outbound networking: 5GB/month (free tier)
```

---

## 3. OpenAI API Budget Protection

### Set Usage Limits in OpenAI Dashboard
1. Go to https://platform.openai.com/account/limits
2. Set monthly budget: $100 (adjust based on your needs)
3. Set up email alerts at 50%, 75%, 90%

### Monitor Usage
```bash
# Check your OpenAI usage
curl https://api.openai.com/v1/usage \
  -H "Authorization: Bearer YOUR_API_KEY"
```

---

## 4. Programmatic Cost Control

### Auto-disable expensive features when budget exceeded
Add this to your Firebase Functions:

```javascript
// functions/budgetMonitor.js
exports.checkBudget = functions.pubsub
  .topic('budget-alerts')
  .onPublish(async (message) => {
    const data = JSON.parse(Buffer.from(message.data, 'base64').toString());

    if (data.costAmount > data.budgetAmount) {
      // Disable expensive features
      await admin.firestore().collection('config').doc('features').update({
        aiEnabled: false,
        reason: 'Budget exceeded',
        disabledAt: Date.now()
      });

      // Send emergency notification
      console.error('BUDGET EXCEEDED - AI features disabled');
    }
  });
```

---

## 5. Cost Optimization Tips

### Reduce Firestore Costs
- Use `.limit()` on all queries
- Implement pagination (limit: 20-50 items)
- Cache frequently accessed data
- Use composite indexes efficiently

### Reduce Cloud Functions Costs
- Set minimum instances to 0 for non-critical functions
- Use smaller memory allocation (256MB default)
- Implement the rate limiting (already done ✅)
- Use regional functions (us-central1 is cheapest)

### Reduce OpenAI Costs
- Use GPT-3.5-turbo instead of GPT-4 when possible
- Implement response caching
- Use the rate limiting (already done ✅)
- Consider tiered access (Basic users get fewer AI features)

---

## 6. Monitoring Dashboard

### Create a Custom Dashboard
1. Go to https://console.cloud.google.com/monitoring
2. Create new dashboard: "LocalLoop Cost Monitor"
3. Add these widgets:
   - **Cloud Functions invocations** (line chart, 1-hour window)
   - **Firestore operations** (reads/writes/deletes)
   - **Storage bandwidth** (GB transferred)
   - **Active users** (from Analytics)
   - **Error rate** (percentage)

---

## 7. Emergency Response Plan

### If Budget is Exceeded:
1. **Immediate Actions:**
   - Disable AI features temporarily
   - Reduce Firestore query limits
   - Enable strict rate limiting

2. **Investigation:**
   - Check for infinite loops in code
   - Look for missing `.limit()` on queries
   - Review Cloud Functions logs for errors
   - Check for abuse/bot traffic

3. **Recovery:**
   - Fix identified issues
   - Gradually re-enable features
   - Monitor closely for 24 hours

---

## 8. Monthly Cost Review Checklist

- [ ] Review actual vs. budgeted costs
- [ ] Identify top 3 cost drivers
- [ ] Check for unused resources
- [ ] Review rate limit effectiveness
- [ ] Update budgets if needed
- [ ] Optimize expensive queries
- [ ] Review user growth vs. cost growth

---

## 9. Recommended Budget Settings for LocalLoop

Based on your app's current state:

```yaml
Monthly Budget: $200
Breakdown:
  - Firestore: $50
  - Cloud Functions: $30
  - Firebase Auth: $10
  - Cloud Storage: $20
  - OpenAI API: $50
  - Buffer: $40

Alert Thresholds:
  - 50% ($100): Email notification
  - 75% ($150): Team alert + review
  - 90% ($180): Consider disabling features
  - 100% ($200): Auto-disable AI features
  - 120% ($240): Emergency - all hands
```

---

## 10. Quick Links

- [Google Cloud Billing](https://console.cloud.google.com/billing)
- [Firebase Console](https://console.firebase.google.com/project/share-your-story-1/usage)
- [OpenAI Usage](https://platform.openai.com/usage)
- [Budget API Docs](https://cloud.google.com/billing/docs/how-to/budgets)

---

## ⚡ Action Items

1. **NOW**: Set up a $200/month budget with email alerts
2. **TODAY**: Configure OpenAI usage limits
3. **THIS WEEK**: Create monitoring dashboard
4. **ONGOING**: Weekly cost review every Monday

Remember: **It's better to have conservative limits and increase them than to get a surprise bill!**