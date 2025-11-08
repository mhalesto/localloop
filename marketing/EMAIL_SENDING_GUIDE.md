# Email Campaign Launch Guide

## Overview

This guide walks you through sending all launch emails for the Gold tier. We'll start with Premium users (50% off offer), then announce to all users.

---

## Email Service Setup

### Option 1: Firebase Extensions (Recommended for Small Lists)

**Pros:** Easy, integrated with Firebase
**Cons:** Limited to 200 emails/day on free tier

```bash
# Install Trigger Email extension
firebase ext:install firebase/firestore-send-email
```

### Option 2: SendGrid (Recommended for 1000+ users)

**Pros:** Free tier (100 emails/day), good deliverability
**Cons:** Requires API setup

1. Sign up at https://sendgrid.com
2. Get API key from Settings → API Keys
3. Verify sender email
4. Use SendGrid Node.js library

### Option 3: Mailchimp (Best for Marketing)

**Pros:** Templates, automation, analytics
**Cons:** Paid for 500+ subscribers ($13/month)

1. Sign up at https://mailchimp.com
2. Create audience
3. Import user emails
4. Use campaign builder

### Option 4: Manual (For Testing)

Use your email client for small batches (<50 users)

---

## Step 1: Export User Emails from Firebase

### 1.1 Create Export Script

Create `scripts/export-user-emails.js`:

```javascript
const admin = require('firebase-admin');
const fs = require('fs');

admin.initializeApp();
const db = admin.firestore();

async function exportEmails() {
  console.log('Exporting user emails...');

  const users = await db.collection('users').get();

  const allUsers = [];
  const basicUsers = [];
  const premiumUsers = [];
  const goldUsers = [];

  users.forEach(doc => {
    const data = doc.data();
    const user = {
      email: data.email,
      firstName: data.displayName?.split(' ')[0] || 'User',
      lastName: data.displayName?.split(' ').slice(1).join(' ') || '',
      subscriptionPlan: data.subscriptionPlan || 'basic',
      subscriptionStatus: data.subscriptionStatus || 'none',
      createdAt: data.createdAt,
      lastActive: data.lastLoginAt
    };

    allUsers.push(user);

    if (user.subscriptionPlan === 'premium') {
      premiumUsers.push(user);
    } else if (user.subscriptionPlan === 'gold') {
      goldUsers.push(user);
    } else {
      basicUsers.push(user);
    }
  });

  // Export to CSV
  const csvAll = convertToCSV(allUsers);
  const csvBasic = convertToCSV(basicUsers);
  const csvPremium = convertToCSV(premiumUsers);
  const csvGold = convertToCSV(goldUsers);

  fs.writeFileSync('user-emails-all.csv', csvAll);
  fs.writeFileSync('user-emails-basic.csv', csvBasic);
  fs.writeFileSync('user-emails-premium.csv', csvPremium);
  fs.writeFileSync('user-emails-gold.csv', csvGold);

  console.log('✅ Export complete!');
  console.log(`All Users: ${allUsers.length}`);
  console.log(`Basic: ${basicUsers.length}`);
  console.log(`Premium: ${premiumUsers.length}`);
  console.log(`Gold: ${goldUsers.length}`);

  process.exit(0);
}

function convertToCSV(users) {
  const headers = 'Email,First Name,Last Name,Subscription Plan,Status\n';
  const rows = users.map(u =>
    `${u.email},${u.firstName},${u.lastName},${u.subscriptionPlan},${u.subscriptionStatus}`
  ).join('\n');

  return headers + rows;
}

exportEmails();
```

### 1.2 Run Export

```bash
node scripts/export-user-emails.js
```

**Output:**
- `user-emails-all.csv` - All users
- `user-emails-basic.csv` - Basic users
- `user-emails-premium.csv` - Premium users
- `user-emails-gold.csv` - Gold users

---

## Step 2: Send to Premium Users First (50% Off)

### Why Premium Users First?
- Most likely to upgrade
- Higher conversion rate (20-30%)
- Reward early supporters
- Test email deliverability

### Template

**File:** `marketing/EMAIL_TEMPLATES.md` - Section 2

**Subject:** 🎁 Premium User? Get Gold features for 50% off!

**Personalization Fields:**
- `{{firstName}}` - User's first name
- `{{email}}` - User's email

### Using Mailchimp

1. **Import Contacts**
   - Go to Audience → Manage Audience → Import contacts
   - Upload `user-emails-premium.csv`
   - Map fields: Email, First Name, Last Name

2. **Create Campaign**
   - Click "Create Campaign" → Email
   - To: Premium Users segment
   - From: LocalLoop Team <hello@localloop.co.za>
   - Subject: 🎁 Premium User? Get Gold features for 50% off!

3. **Design Email**
   - Use email template from `EMAIL_TEMPLATES.md` Section 2
   - Replace `[First Name]` with merge tag `*|FNAME|*`
   - Add "Claim Your 50% Discount" button linking to app

4. **Add Tracking**
   - Enable Google Analytics tracking
   - UTM parameters:
     - Source: email
     - Medium: premium_upgrade
     - Campaign: gold_launch_50off

5. **Test Send**
   - Send test to yourself
   - Check all links work
   - Verify personalization
   - Check mobile rendering

6. **Schedule Send**
   - Best time: Tuesday 10:00 AM SAST
   - Or Wednesday 10:00 AM SAST
   - Avoid Monday (inbox overload) and Friday (low engagement)

### Using SendGrid

```javascript
// scripts/send-premium-offer.js
const sgMail = require('@sendgrid/mail');
const fs = require('fs');
const csv = require('csv-parser');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const emailTemplate = fs.readFileSync('marketing/templates/premium-offer.html', 'utf8');

async function sendPremiumOffer() {
  const users = [];

  // Read CSV
  fs.createReadStream('user-emails-premium.csv')
    .pipe(csv())
    .on('data', (row) => users.push(row))
    .on('end', async () => {
      console.log(`Sending to ${users.length} Premium users...`);

      for (const user of users) {
        const personalizedEmail = emailTemplate
          .replace(/\[First Name\]/g, user['First Name'])
          .replace(/\[Link\]/g, `https://localloop.app/gold?utm_source=email&utm_medium=premium_upgrade&email=${user.Email}`);

        const msg = {
          to: user.Email,
          from: 'hello@localloop.co.za',
          subject: '🎁 Premium User? Get Gold features for 50% off!',
          html: personalizedEmail,
        };

        try {
          await sgMail.send(msg);
          console.log(`✓ Sent to ${user.Email}`);

          // Rate limit: 1 email per second
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`✗ Failed to send to ${user.Email}:`, error);
        }
      }

      console.log('✅ All emails sent!');
    });
}

sendPremiumOffer();
```

Run:
```bash
SENDGRID_API_KEY="your_key" node scripts/send-premium-offer.js
```

---

## Step 3: Wait 24 Hours, Then Send to All Users

### Why Wait?
- Give Premium users exclusive early access
- Measure Premium conversion separately
- Avoid overwhelming support

### Template

**File:** `marketing/EMAIL_TEMPLATES.md` - Section 1

**Subject Line A/B Test:**
- A: ✨ Introducing LocalLoop Gold with GPT-4o
- B: Same AI as ChatGPT Plus, now in LocalLoop!

### Using Mailchimp

1. **Import All Users**
   - Upload `user-emails-all.csv`
   - Exclude Premium segment (already contacted)

2. **Create A/B Test Campaign**
   - Campaign type: A/B Test
   - Test: Subject line
   - Send Version A to 50%, Version B to 50%
   - Wait 2 hours, then send winning version to rest

3. **Design Email**
   - Use template from Section 1
   - Add clear CTA: "Try Gold Free for 7 Days"
   - Include unsubscribe link (required)

4. **Schedule**
   - 24 hours after Premium email
   - Best time: Wednesday 10:00 AM SAST

---

## Step 4: Send Post-Trial Conversion Emails

### When: 6 days after trial starts

**Template:** `EMAIL_TEMPLATES.md` - Section 5

**Subject:** Your Gold trial ends tomorrow ⏰

### Automation Setup (Mailchimp)

1. **Create Automation**
   - Go to Automations → Create → Custom
   - Trigger: API call when user starts trial
   - Delay: 6 days
   - Send: Post-trial email

2. **Add Conditions**
   - If user already converted to paid: Skip email
   - If user canceled trial: Send different email

### Manual Approach

Export users who started trial 6 days ago:

```javascript
// scripts/export-trial-ending.js
const admin = require('firebase-admin');
admin.initializeApp();

async function getTrialEnding() {
  const sixDaysAgo = Date.now() - (6 * 24 * 60 * 60 * 1000);

  const users = await admin.firestore()
    .collection('users')
    .where('trialStartDate', '>=', sixDaysAgo)
    .where('trialStartDate', '<=', sixDaysAgo + 86400000) // +1 day buffer
    .where('subscriptionPlan', '==', 'basic') // Haven't converted yet
    .get();

  users.forEach(doc => {
    const user = doc.data();
    console.log(`${user.email},${user.displayName}`);
  });
}

getTrialEnding();
```

---

## Step 5: Send Welcome Email (New Gold Subscribers)

### When: Immediately after subscription

**Template:** `EMAIL_TEMPLATES.md` - Section 6

**Subject:** Welcome to Gold! 🌟 Here's how to get started

### Automation (Recommended)

Use Firebase Functions to trigger email on subscription:

```javascript
// functions/index.js
exports.onGoldSubscription = functions.firestore
  .document('users/{userId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    // Check if user just subscribed to Gold
    if (before.subscriptionPlan !== 'gold' && after.subscriptionPlan === 'gold') {
      const userId = context.params.userId;

      // Send welcome email
      await sendGoldWelcomeEmail(after.email, after.displayName);

      console.log(`Sent Gold welcome email to ${userId}`);
    }
  });

async function sendGoldWelcomeEmail(email, name) {
  // Use SendGrid or Firebase Email Extension
  const msg = {
    to: email,
    from: 'hello@localloop.co.za',
    subject: 'Welcome to Gold! 🌟 Here\'s how to get started',
    html: getWelcomeEmailTemplate(name),
  };

  await sgMail.send(msg);
}
```

---

## Step 6: Send Monthly Usage Reports (Ongoing)

### When: 1st of each month

**Template:** `EMAIL_TEMPLATES.md` - Section 7

**Subject:** Your Gold stats for [Month] 📊

### Automation Setup

```javascript
// functions/index.js
exports.sendMonthlyGoldReports = functions.pubsub
  .schedule('0 9 1 * *') // 9 AM on 1st of month
  .timeZone('Africa/Johannesburg')
  .onRun(async (context) => {
    const goldUsers = await admin.firestore()
      .collection('users')
      .where('subscriptionPlan', '==', 'gold')
      .get();

    for (const doc of goldUsers.docs) {
      const user = doc.data();
      const stats = await calculateMonthlyStats(doc.id);

      await sendMonthlyReport(user.email, user.displayName, stats);
    }

    console.log(`Sent monthly reports to ${goldUsers.size} Gold users`);
  });
```

---

## Email Best Practices

### Deliverability

1. **Verify Your Domain**
   - Add SPF record: `v=spf1 include:sendgrid.net ~all`
   - Add DKIM record (provided by SendGrid/Mailchimp)
   - Add DMARC record: `v=DMARC1; p=none; rua=mailto:dmarc@localloop.co.za`

2. **Warm Up Your Domain**
   - Day 1: Send to 50 users
   - Day 2: Send to 100 users
   - Day 3: Send to 200 users
   - Day 4+: Send to all

3. **Avoid Spam Triggers**
   - Don't use ALL CAPS in subject
   - Limit exclamation marks (max 1)
   - Include physical address in footer
   - Add unsubscribe link
   - Keep spam score <5 (use https://www.mail-tester.com)

### Personalization

**Good:**
```
Hi Sarah,

We're excited to announce...
```

**Bad:**
```
Dear Valued Customer,

It has come to our attention...
```

### Call-to-Action

**One primary CTA per email:**
- Make it a button, not just a link
- Use action words: "Try Free", "Claim Discount", "Get Started"
- Repeat CTA 2-3 times (top, middle, bottom)

**Example:**
```html
<a href="[link]" style="background: #ffd700; color: #000; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
  Try Gold Free for 7 Days
</a>
```

### Mobile Optimization

60% of emails are opened on mobile. Ensure:
- Single column layout
- Font size ≥14px
- Buttons ≥44px tall (touch-friendly)
- Images have alt text
- Test on iPhone and Android

---

## Tracking & Analytics

### UTM Parameters

Add to all links:

```
https://localloop.app/gold?utm_source=email&utm_medium=premium_upgrade&utm_campaign=gold_launch&utm_content=button_cta
```

Parameters:
- **utm_source:** email
- **utm_medium:** premium_upgrade, announcement, trial_ending, welcome, monthly_report
- **utm_campaign:** gold_launch
- **utm_content:** button_cta, text_link, header_link

### Metrics to Track

**Email Performance:**
- Open rate (target: >25%)
- Click-through rate (target: >5%)
- Conversion rate (target: >10% for Premium, >3% for Basic)
- Unsubscribe rate (target: <0.5%)

**App Performance:**
- Email → App opens
- Email → Trial starts
- Email → Subscription completes

### Tools

- **Mailchimp Analytics:** Built-in
- **SendGrid Analytics:** Built-in
- **Google Analytics:** Track UTM parameters
- **Firebase Analytics:** Track app opens from email

---

## Email Schedule Calendar

### Week 1: Launch Week

**Monday:**
- 🟢 No emails (social media launch only)

**Tuesday:**
- 🟡 10:00 AM: Premium users 50% off offer
- 📊 Track: Opens, clicks, conversions

**Wednesday:**
- 🟢 10:00 AM: All users announcement (A/B test subjects)
- 📊 Track: Which subject line wins

**Thursday-Sunday:**
- 🔵 Monitor: Support emails, questions
- 📊 Track: Trial signups from emails

### Week 2: Follow-Up

**Monday:**
- 🟡 10:00 AM: Reminder to Premium users (if <50% opened)

**Tuesday-Friday:**
- 🔵 Daily: Post-trial emails (6 days after trial start)

### Ongoing: Every Month

**1st of Month:**
- 🟢 9:00 AM: Monthly usage reports to Gold subscribers

**15th of Month:**
- 🟡 Optional: Mid-month engagement email

---

## Segment-Specific Strategies

### Premium Users (Best ROI)
- **When:** First to contact
- **Offer:** 50% off for 7 days
- **Expected conversion:** 20-30%
- **Follow-up:** If no response in 3 days, send reminder

### Basic Users
- **When:** After Premium campaign
- **Offer:** 7-day free trial
- **Expected conversion:** 5-10%
- **Follow-up:** Post-trial conversion email

### Lapsed Users (Inactive >30 days)
- **Template:** Section 4 (Win-Back)
- **Offer:** Extended 30-day trial
- **Expected conversion:** 10-15% to reactivate

### Gold Users (Retention)
- **Monthly:** Usage reports
- **Quarterly:** Feedback surveys
- **Yearly:** Renewal discounts

---

## Legal Requirements

### Required Elements

1. **Physical Address**
```
LocalLoop
123 Main Street
Johannesburg, 2000
South Africa
```

2. **Unsubscribe Link**
```html
<a href="{{unsubscribe}}">Unsubscribe</a> | <a href="{{preferences}}">Update Preferences</a>
```

3. **Privacy Policy Link**
```
<a href="https://localloop.co.za/privacy">Privacy Policy</a>
```

### POPIA Compliance (South Africa)

- ✅ Have user consent (they signed up)
- ✅ Include unsubscribe option
- ✅ Don't share data with third parties
- ✅ Store data securely
- ✅ Delete data on request

### CAN-SPAM (International)

- ✅ Accurate "From" name
- ✅ No deceptive subject lines
- ✅ Include physical address
- ✅ Honor unsubscribe within 10 days

---

## Troubleshooting

### Low Open Rates (<15%)

**Possible causes:**
- Emails going to spam
- Boring subject lines
- Wrong send time

**Fixes:**
- Test subject lines with A/B testing
- Verify SPF/DKIM records
- Send at different times (test 10 AM vs 2 PM vs 6 PM)
- Clean list (remove bounces, inactive users)

### Low Click Rates (<2%)

**Possible causes:**
- Weak CTA
- Too much text
- Broken links

**Fixes:**
- Make CTA more prominent
- Simplify email (less text, more images)
- Test all links before sending
- Add urgency: "Offer expires in 48 hours"

### High Unsubscribe Rate (>2%)

**Possible causes:**
- Sending too frequently
- Irrelevant content
- No value in emails

**Fixes:**
- Reduce frequency
- Segment better (Premium vs Basic)
- Add more value: tips, tutorials, success stories

### Emails Going to Spam

**Check:**
- SPF/DKIM/DMARC records configured
- Spam score <5 (test at mail-tester.com)
- Not using spam trigger words
- Sending from verified domain
- List hygiene (remove bounces)

**Test:**
Send to seed list:
- Gmail account
- Outlook account
- Yahoo account
- Check which folder it lands in

---

## Cost Estimation

### SendGrid Pricing

- **Free:** 100 emails/day
- **Essentials:** $20/month for 50,000 emails
- **Pro:** $90/month for 100,000 emails

### Mailchimp Pricing

- **Free:** Up to 500 contacts
- **Essentials:** $13/month for 500-2,500 contacts
- **Standard:** $20/month for 2,500+ contacts

### Recommended for LocalLoop

If you have:
- <500 users: Mailchimp Free
- 500-2,500 users: Mailchimp Essentials ($13/mo)
- 2,500+ users: SendGrid Essentials ($20/mo)

---

## Success Checklist

### Before Sending:
- [ ] Export user emails segmented by plan
- [ ] Set up email service (SendGrid/Mailchimp)
- [ ] Verify sender domain (SPF/DKIM)
- [ ] Create email templates with personalization
- [ ] Test send to yourself
- [ ] Check mobile rendering
- [ ] Verify all links work
- [ ] Add UTM tracking parameters
- [ ] Set up analytics tracking

### After Sending:
- [ ] Monitor open rates (first 4 hours)
- [ ] Respond to replies within 2 hours
- [ ] Track trial signups from email
- [ ] Adjust strategy based on metrics
- [ ] Send follow-up to non-openers (3 days later)

---

## Email Templates Summary

Quick reference to `EMAIL_TEMPLATES.md` sections:

1. **All Users Announcement** - Main launch email
2. **Premium 50% Off** - Special Premium upgrade offer
3. **Basic Users Path** - Encourage Basic users to try Gold
4. **Lapsed Users** - Win-back inactive users
5. **Post-Trial** - Convert trial users before expiry
6. **Welcome New Subscribers** - Onboard Gold users
7. **Monthly Reports** - Ongoing engagement

---

## Quick Start Commands

```bash
# 1. Export emails
node scripts/export-user-emails.js

# 2. Send to Premium users (day 1)
# Use Mailchimp web interface OR:
SENDGRID_API_KEY="xxx" node scripts/send-premium-offer.js

# 3. Send to all users (day 2)
# Use Mailchimp web interface OR:
SENDGRID_API_KEY="xxx" node scripts/send-announcement.js

# 4. Monitor results
# Check Mailchimp/SendGrid dashboard
# Check Firebase Analytics for attributed signups
```

---

## Questions?

- **Email templates:** See `EMAIL_TEMPLATES.md`
- **Social media:** See `SOCIAL_MEDIA_POSTS.md`
- **App Store:** See `APP_STORE_DESCRIPTION.md`
- **Deployment:** See `GOLD_DEPLOYMENT_CHECKLIST.md`

**Need help?** Email marketing@localloop.co.za

**Good luck with your launch! 🚀**
