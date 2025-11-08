# CI/CD Setup for LocalLoop

This document describes the Continuous Integration and Deployment setup for the LocalLoop app.

## Overview

The CI/CD pipeline automatically:
1. **Builds Android APK** when code is pushed to the `production` branch
2. **Deploys the marketing website** to GitHub Pages if there are changes to `localloop-site/`
3. **Creates GitHub releases** with downloadable APK files

## Workflow Triggers

The pipeline runs on:
- **Push to `production` branch**: Full build, release, and deployment
- **Pull request to `production` branch**: Build verification only (no release/deployment)

## Jobs

### 1. Build Android APK (`build-android`)

**What it does:**
- Sets up Node.js 20 and Java 17
- Installs npm dependencies
- Configures Expo CLI
- Builds release APK using Gradle
- Uploads APK as workflow artifact (retained for 30 days)
- Creates a GitHub release with the APK attached (on push only)

**Build output:**
- APK location: `android/app/build/outputs/apk/release/app-release.apk`
- Artifact name: `app-release-{commit-sha}`
- Release tag: `v{version}-{build-number}` (e.g., `v1.1.0-42`)

**Requirements:**
- Valid Android build configuration in `android/app/build.gradle`
- Signing key configured (currently using debug keystore)

### 2. Deploy GitHub Pages (`deploy-website`)

**What it does:**
- Checks if any files in `localloop-site/` were modified
- Deploys the static website to GitHub Pages if changes detected
- Publishes to `gh-pages` branch
- Configures custom domain: `localloop.co.za`

**Only runs on:**
- Push events (not pull requests)
- When files in `localloop-site/` directory have changed

## GitHub Repository Settings Required

### 1. Enable GitHub Actions
1. Go to **Settings** → **Actions** → **General**
2. Set "Workflow permissions" to "Read and write permissions"
3. Check "Allow GitHub Actions to create and approve pull requests"

### 2. Configure GitHub Pages
1. Go to **Settings** → **Pages**
2. Source: **Deploy from a branch**
3. Branch: **gh-pages** / **(root)**
4. Custom domain: `localloop.co.za` (optional)

### 3. Add Secrets (Optional)

If you're using Expo EAS features, add:
1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Add `EXPO_TOKEN`:
   - Run `npx expo login` locally
   - Run `npx expo whoami --token` to get your token
   - Add the token as a repository secret

**Note:** The current workflow uses local Gradle builds and doesn't require `EXPO_TOKEN`, but it's included for future EAS integration.

## Usage

### Deploying to Production

1. **Merge changes to production branch:**
   ```bash
   git checkout main
   git pull origin main
   git checkout production
   git merge main
   git push origin production
   ```

2. **Monitor the workflow:**
   - Go to **Actions** tab in GitHub
   - Click on the latest workflow run
   - Watch the build progress

3. **Download the APK:**
   - Option A: From workflow artifacts (30-day retention)
   - Option B: From GitHub Releases page (permanent)

### Testing Before Production

Create a pull request to `production` branch to verify builds without deploying:
```bash
git checkout -b feature/my-feature
# Make changes...
git push origin feature/my-feature
# Create PR targeting production branch
```

## Build Artifacts

### APK Artifacts (Workflow)
- **Retention**: 30 days
- **Location**: Actions → Workflow run → Artifacts section
- **Name**: `app-release-{commit-sha}`

### GitHub Releases
- **Retention**: Permanent
- **Location**: Releases page
- **Tag format**: `v{version}-{build-number}`
- **Includes**: APK file attached as release asset

## Customization

### Switching to AAB (Android App Bundle)

To switch from APK to AAB for Google Play Store:

1. **Update workflow** (`.github/workflows/production.yml`):
   ```yaml
   # Change this line:
   run: ./gradlew assembleRelease --no-daemon

   # To this:
   run: ./gradlew bundleRelease --no-daemon
   ```

2. **Update artifact path**:
   ```yaml
   # Change this:
   path: android/app/build/outputs/apk/release/app-release.apk

   # To this:
   path: android/app/build/outputs/bundle/release/app-release.aab
   ```

### Signing the Release Build

Currently using debug keystore. For production release:

1. **Generate a release keystore:**
   ```bash
   keytool -genkeypair -v -storetype PKCS12 -keystore release.keystore \
     -alias localloop-release -keyalg RSA -keysize 2048 -validity 10000
   ```

2. **Add keystore to GitHub Secrets:**
   - Encode keystore: `base64 release.keystore > release.keystore.b64`
   - Add `ANDROID_KEYSTORE_BASE64` secret with the base64 content
   - Add `KEYSTORE_PASSWORD` secret
   - Add `KEY_ALIAS` secret (e.g., "localloop-release")
   - Add `KEY_PASSWORD` secret

3. **Update workflow to decode and use keystore:**
   ```yaml
   - name: Decode keystore
     run: |
       echo "${{ secrets.ANDROID_KEYSTORE_BASE64 }}" | base64 -d > android/app/release.keystore

   - name: Build signed APK
     env:
       KEYSTORE_PASSWORD: ${{ secrets.KEYSTORE_PASSWORD }}
       KEY_ALIAS: ${{ secrets.KEY_ALIAS }}
       KEY_PASSWORD: ${{ secrets.KEY_PASSWORD }}
     working-directory: android
     run: ./gradlew assembleRelease --no-daemon
   ```

4. **Update `android/app/build.gradle`:**
   ```gradle
   android {
     signingConfigs {
       release {
         storeFile file('release.keystore')
         storePassword System.getenv("KEYSTORE_PASSWORD")
         keyAlias System.getenv("KEY_ALIAS")
         keyPassword System.getenv("KEY_PASSWORD")
       }
     }

     buildTypes {
       release {
         signingConfig signingConfigs.release
         // ... other config
       }
     }
   }
   ```

## Troubleshooting

### Build fails with "Permission denied" on gradlew
- The workflow includes `chmod +x android/gradlew`
- If it still fails, ensure `gradlew` is committed with execute permissions

### GitHub Pages not deploying
- Check that **Actions** have write permissions in repository settings
- Verify `gh-pages` branch is selected in Pages settings
- Check workflow logs for deployment errors

### APK not signed properly
- Debug builds use debug keystore (for testing only)
- Follow "Signing the Release Build" section above for production

### Workflow doesn't trigger
- Ensure workflow file is in `main` branch before merging to `production`
- Check that Actions are enabled in repository settings
- Verify branch name is exactly `production` (case-sensitive)

## Future Enhancements

- [ ] Add automated testing before build
- [ ] Integrate Firebase App Distribution
- [ ] Add Expo EAS Build for iOS
- [ ] Implement semantic versioning automation
- [ ] Add Slack/Discord notifications on build completion
- [ ] Cache dependencies for faster builds
- [ ] Add lint and type-checking steps
- [ ] Deploy to Google Play Console automatically (with AAB)

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Expo and GitHub Actions](https://docs.expo.dev/build-reference/github-actions/)
- [Android Gradle Plugin](https://developer.android.com/build)
- [GitHub Pages Documentation](https://docs.github.com/en/pages)
