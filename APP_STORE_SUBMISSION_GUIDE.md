# App Store Submission Guide for LocalLoop Connect

## ✅ Completed Steps

1. ✅ Bundle ID registered: `com.halalisani.localloop`
2. ✅ App created in App Store Connect: "LocalLoop Connect"
3. ✅ App metadata prepared
4. ✅ Privacy policy created
5. ✅ EAS configuration updated for iOS

---

## 📝 Next Steps

### Step 1: Fill in App Information in App Store Connect

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Click on "LocalLoop Connect"
3. Click "App Information" in the left sidebar

**Fill in the following** (use `app-store-metadata.md` as reference):

#### Basic Information
- **Name**: LocalLoop Connect
- **Subtitle**: Connect with your neighborhood
- **Primary Category**: Social Networking
- **Secondary Category**: Lifestyle

#### General Information
- **Privacy Policy URL**: `https://github.com/halalisani/localloop/blob/main/PRIVACY.md`
  - ⚠️ **Important**: You need to push the PRIVACY.md file to GitHub first!
- **Support URL**: `https://github.com/halalisani/localloop`
  - Or create a dedicated support page/email

---

### Step 2: Set Up App Privacy

1. In App Store Connect, go to "App Privacy" (left sidebar)
2. Click "Get Started"
3. Use the guide in `app-privacy-details.md` to fill in all sections

**Quick Summary:**
- ✅ Collect: Email, User Content, User ID, Usage Data, Coarse Location
- ❌ Don't collect: Precise Location, Financial Info, Health Data
- ❌ No tracking for advertising

---

### Step 3: Add App Description & Keywords

1. Go to "Distribution" → "iOS App" → "Version 1.0"
2. Scroll to "App Information" section

**Copy from** `app-store-metadata.md`:
- **Description**: Full app description (4000 char max)
- **Keywords**: Local search keywords (100 char max)
- **Promotional Text**: Short promo (170 char max)
- **What's New**: Version 1.0 release notes

---

### Step 4: Set Age Rating

1. In left sidebar, click "Age Rating"
2. Answer the questionnaire:
   - **Profanity or Crude Humor**: Infrequent/Mild
   - **Mature/Suggestive Themes**: Infrequent/Mild
   - **Unrestricted Web Access**: NO
   - **Made for Kids**: NO

Result should be: **12+**

---

### Step 5: Prepare Screenshots

You need to capture screenshots of your app. See `SCREENSHOTS_GUIDE.md` for detailed instructions.

**Required**: Minimum 3 screenshots, 1290 × 2796 pixels

**Recommended screens to capture**:
1. Home Feed with posts
2. City Room
3. Post Composer
4. Post Detail with comments
5. Profile/Settings

**To capture screenshots**:
```bash
# Run your app in simulator
npm start
# Then press 'i' for iOS

# Or use physical iPhone 14 Pro Max / 15 Pro Max
```

Take screenshots, resize to required dimensions, and upload to App Store Connect.

---

### Step 6: Update Privacy Policy URL

Before submitting, push the PRIVACY.md to your GitHub repository:

```bash
git add PRIVACY.md app-store-metadata.md
git commit -m "Add privacy policy and App Store metadata"
git push origin main
```

Then verify the URL works: `https://github.com/halalisani/localloop/blob/main/PRIVACY.md`

---

### Step 7: Build Your App with EAS

**Important**: Update the appleId in eas.json first!

```bash
# Open eas.json and replace the placeholder email
# Line 38: "appleId": "your-real-apple-id@example.com"
```

Then build:

```bash
# Install EAS CLI if not already installed
npm install -g eas-cli

# Login to Expo
eas login

# Configure credentials
eas credentials

# Build for iOS App Store
eas build --platform ios --profile production
```

This will:
- Create an iOS build
- Sign it with your Apple Developer certificate
- Upload to EAS servers
- Provide a build URL

**Build time**: 10-20 minutes

---

### Step 8: Submit Build to App Store Connect

After the build completes:

```bash
# Submit to App Store Connect
eas submit --platform ios --profile production
```

Or manually:
1. Download the .ipa from EAS dashboard
2. Upload using Transporter app (Mac App Store)

---

### Step 9: Complete App Review Information

1. Go to "App Review Information" in App Store Connect
2. Fill in:
   - **Contact Information**: Your name, phone, email
   - **Notes**: Include test account credentials
   - **Demo Account** (if needed):
     - Username: `testuser@localloop.com`
     - Password: `Test123!`

**Review Notes Example**:
```
This app allows users to post content anonymously or publicly within city-based community rooms.

To test:
1. Select a country, province, and city
2. Browse posts in the city room
3. Create a test post
4. Navigate using the bottom tab bar

Test Account:
- Email: testuser@localloop.com
- Password: Test123!

Content moderation is implemented to filter inappropriate content.
```

---

### Step 10: Add App Icon

1. Ensure your app has a 1024×1024px app icon
2. In App Store Connect, upload it in the "App Information" section

**Your current icon**: `./assets/icon.png`
- Verify it's exactly 1024×1024px
- No transparency, no rounded corners

---

### Step 11: Submit for Review

Once everything is complete:

1. ✅ App Information filled
2. ✅ Privacy details complete
3. ✅ Screenshots uploaded (minimum 3)
4. ✅ Build uploaded
5. ✅ Age rating set
6. ✅ Review information complete

**Click "Add for Review"** → **"Submit for Review"**

---

## ⏱️ Timeline

- **Review Time**: Typically 24-48 hours
- **Build Time**: 10-20 minutes
- **Total Prep Time**: 2-3 hours (first time)

---

## 🔧 Quick Commands Summary

```bash
# Push privacy policy to GitHub
git add PRIVACY.md app-store-metadata.md APP_STORE_SUBMISSION_GUIDE.md
git commit -m "Add App Store submission materials"
git push origin main

# Update eas.json with your real Apple ID email

# Build for iOS
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios --profile production
```

---

## 📋 Checklist

- [ ] Push PRIVACY.md to GitHub
- [ ] Update appleId in eas.json (line 38)
- [ ] Fill in App Information in App Store Connect
- [ ] Complete App Privacy questionnaire
- [ ] Add app description and keywords
- [ ] Set age rating to 12+
- [ ] Capture and upload 3-10 screenshots
- [ ] Upload app icon (1024×1024px)
- [ ] Build app with EAS
- [ ] Submit build to App Store Connect
- [ ] Fill in App Review Information
- [ ] Submit for review

---

## 🆘 Need Help?

- **EAS Build Issues**: https://docs.expo.dev/build/introduction/
- **App Store Connect**: https://developer.apple.com/app-store-connect/
- **App Review Guidelines**: https://developer.apple.com/app-store/review/guidelines/

---

## 📞 Support Contacts

Before submitting, make sure you have:
- ✅ Valid support email or URL
- ✅ Phone number for App Review contact
- ✅ Privacy policy URL (live and accessible)

Good luck with your submission! 🚀
