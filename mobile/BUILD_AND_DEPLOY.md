# APC Connect Mobile App - Build & Deploy Guide

## Prerequisites

Before you begin, ensure you have the following installed on your local machine:

- **Node.js** v18 or later: https://nodejs.org
- **npm** v9 or later (comes with Node.js)
- **EAS CLI**: `npm install -g eas-cli`
- **Expo Go app** on your phone (for development testing):
  - Android: https://play.google.com/store/apps/details?id=host.exp.exponent
  - iOS: https://apps.apple.com/app/expo-go/id982107779
- **Expo account**: Create one at https://expo.dev/signup

### Platform-Specific Requirements

**For Android local builds:**
- Java JDK 17 (required by Android Gradle)
- Android Studio with Android SDK (API 34 recommended)
- Android SDK Build-Tools, Platform-Tools
- Set `ANDROID_HOME` environment variable

**For iOS local builds:**
- macOS only
- Xcode 15+ with command-line tools
- CocoaPods: `sudo gem install cocoapods`
- Apple Developer account ($99/year): https://developer.apple.com

---

## Quick Start (Development)

### 1. Copy the mobile folder to your local machine

```bash
# From your local machine, copy the mobile/ directory from Replit
# You can download it as a ZIP or use git clone
```

### 2. Install Dependencies

```bash
cd mobile
npm install
```

### 3. Start Development Server

```bash
# The API URL is already configured in app.json to point to production
npx expo start
```

This opens the Expo Developer Tools. From here:
- **Scan the QR code** with Expo Go on your phone
- Press **`a`** to open in Android emulator
- Press **`i`** to open in iOS simulator (macOS only)
- Press **`w`** to open in web browser

---

## Project Structure

```
mobile/
├── app/                    # Expo Router file-based routing
│   ├── _layout.tsx         # Root layout (providers, auth guard)
│   ├── onboarding.tsx      # First-time onboarding
│   ├── (auth)/             # Auth screens (login, register)
│   ├── (tabs)/             # Main tab screens
│   │   ├── index.tsx       # Dashboard
│   │   ├── news.tsx        # News feed
│   │   ├── events.tsx      # Events
│   │   ├── elections.tsx   # Elections (primaries + general)
│   │   └── profile.tsx     # Profile
│   ├── digital-id.tsx      # Digital membership ID card
│   ├── points.tsx          # Points overview
│   ├── tasks.tsx           # Micro-tasks with image proof
│   ├── volunteer.tsx       # Volunteer opportunities
│   ├── rewards.tsx         # Points redemption (airtime, data, cash)
│   ├── donations.tsx       # Make donations
│   ├── referrals.tsx       # Referral program
│   ├── dues.tsx            # Membership dues payment
│   ├── election-day.tsx    # Election Day agent functions
│   ├── manage-agents.tsx   # Admin: manage polling agents
│   ├── leaderboard.tsx     # Global rankings
│   ├── campaigns.tsx       # Issue campaigns
│   ├── knowledge-base.tsx  # Articles and FAQs
│   ├── quizzes.tsx         # Political literacy quizzes
│   ├── ideas.tsx           # Ideas board
│   ├── search.tsx          # Multi-category search
│   └── notification-settings.tsx # Push/email/SMS preferences
├── components/             # Reusable components
│   ├── AuthGuard.tsx       # Authentication wrapper
│   ├── SideDrawer.tsx      # Left drawer navigation
│   ├── NigeriaMap.tsx      # SVG map component
│   └── ui/                 # Base UI components (Text, Button, Card, Input)
├── lib/                    # API client, auth, storage utilities
│   ├── api.ts              # API client with JWT auto-refresh
│   ├── auth.ts             # Login/logout/register functions
│   ├── storage.ts          # Secure token storage
│   ├── queryClient.ts      # TanStack Query setup
│   └── push-notifications.ts # Push notification registration
├── types/                  # TypeScript type definitions
├── assets/                 # App icons, splash screen
├── app.json                # Expo configuration
├── eas.json                # EAS Build configuration
└── package.json            # Dependencies
```

---

## API Configuration

The app connects to the production backend at:

```
https://apc-connect.replit.app
```

This is configured in three places (already set):
- `app.json` → `expo.extra.apiUrl` (fallback)
- `eas.json` → build profiles → `env.EXPO_PUBLIC_API_URL` (used during EAS builds)
- `lib/api.ts` → reads from `EXPO_PUBLIC_API_URL` first, then `expo.extra.apiUrl`

### For local development

Create a `.env` file in the `mobile/` directory:

```bash
EXPO_PUBLIC_API_URL=https://apc-connect.replit.app
```

Or set it inline:
```bash
EXPO_PUBLIC_API_URL=https://apc-connect.replit.app npx expo start
```

### Important: EAS Project ID

Before any EAS build (cloud or local), you must set the project ID in `app.json`:

```json
{
  "expo": {
    "extra": {
      "eas": {
        "projectId": "YOUR-ACTUAL-PROJECT-ID"
      }
    }
  }
}
```

Get your project ID by running:
```bash
cd mobile
npx eas init
```

This will create a project on expo.dev and update `app.json` automatically.

---

## Authentication Architecture

The mobile app uses **JWT-based authentication** (different from the web app's session-based auth):

1. **Login** → Server returns `accessToken` + `refreshToken`
2. **API calls** → `Authorization: Bearer <accessToken>` header
3. **Token expiry** → Auto-refresh via interceptor in `lib/api.ts`
4. **Token storage** → `expo-secure-store` (encrypted device storage)
5. **Logout** → Clear tokens from secure store

---

## Building for Production (Local Builds)

### Option A: Local Android APK Build (No EAS Cloud Needed)

This builds the APK directly on your machine. No Expo account charges.

#### Step 1: Install prerequisites

```bash
# Install EAS CLI globally
npm install -g eas-cli

# Login to Expo (free account is fine)
npx eas login

# Link project (first time only)
cd mobile
npx eas init
```

Update `app.json` with the project ID from `eas init`:
```json
{
  "expo": {
    "extra": {
      "eas": {
        "projectId": "YOUR-ACTUAL-PROJECT-ID"
      }
    }
  }
}
```

#### Step 2: Generate native Android project

```bash
npx expo prebuild --platform android
```

This creates the `android/` folder with native code.

#### Step 3: Build APK locally

```bash
# Build a release APK (distributable, unsigned for testing)
cd android
./gradlew assembleRelease

# The APK will be at:
# android/app/build/outputs/apk/release/app-release.apk
```

**Or build a signed AAB for Play Store:**

```bash
# First, create a keystore (one time only)
keytool -genkeypair -v -storetype PKCS12 \
  -keystore apc-connect.keystore \
  -alias apc-connect \
  -keyalg RSA -keysize 2048 -validity 10000
```

Then configure signing credentials securely:

1. Add to `android/gradle.properties` (do NOT commit this file):
```properties
APC_RELEASE_STORE_FILE=../../apc-connect.keystore
APC_RELEASE_STORE_PASSWORD=your_keystore_password
APC_RELEASE_KEY_ALIAS=apc-connect
APC_RELEASE_KEY_PASSWORD=your_key_password
```

2. Add to `android/app/build.gradle` under `android {}`:
```gradle
signingConfigs {
    release {
        storeFile file(findProperty('APC_RELEASE_STORE_FILE') ?: '../../apc-connect.keystore')
        storePassword findProperty('APC_RELEASE_STORE_PASSWORD') ?: ''
        keyAlias findProperty('APC_RELEASE_KEY_ALIAS') ?: 'apc-connect'
        keyPassword findProperty('APC_RELEASE_KEY_PASSWORD') ?: ''
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled true
        proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
    }
}
```

3. Add `gradle.properties` to `.gitignore` so credentials are never committed.

4. Build the signed AAB:
```bash
cd android
./gradlew bundleRelease

# AAB will be at:
# android/app/build/outputs/bundle/release/app-release.aab
```

#### Step 4: Install on device

```bash
# Install APK on connected device via USB
adb install android/app/build/outputs/apk/release/app-release.apk

# Or share the APK file directly (WhatsApp, email, Google Drive, etc.)
```

---

### Option B: Local iOS Build (macOS only)

#### Step 1: Generate native iOS project

```bash
cd mobile
npx expo prebuild --platform ios
```

#### Step 2: Install CocoaPods dependencies

```bash
cd ios
pod install
cd ..
```

#### Step 3: Build with Xcode

```bash
# Open in Xcode
open ios/APCConnect.xcworkspace

# In Xcode:
# 1. Select your Team in Signing & Capabilities
# 2. Select target device or "Any iOS Device"
# 3. Product → Archive (for distribution)
# 4. Or Product → Run (for testing on device)
```

**Command-line build (alternative):**
```bash
cd ios
xcodebuild -workspace APCConnect.xcworkspace \
  -scheme APCConnect \
  -configuration Release \
  -sdk iphoneos \
  -archivePath build/APCConnect.xcarchive \
  archive
```

---

### Option C: EAS Cloud Build (Easiest, but uses EAS credits)

```bash
cd mobile

# Android APK (internal testing)
npx eas build --platform android --profile preview

# Android AAB (Play Store)
npx eas build --platform android --profile production

# iOS (App Store)
npx eas build --platform ios --profile production
```

After the build completes, EAS provides a download link.

---

### Option D: EAS Local Build (Uses your machine, no cloud credits)

```bash
# Android
npx eas build --platform android --profile production --local

# iOS (macOS only)
npx eas build --platform ios --profile production --local
```

This runs the EAS build pipeline on your machine. Output:
- Android: `.apk` or `.aab` file in current directory
- iOS: `.ipa` file in current directory

---

## Deploying to App Stores

### Google Play Store

1. Build production AAB (use Option A, C, or D above)

2. Go to https://play.google.com/console

3. Create a new app or select existing

4. Go to "Production" > "Create new release"

5. Upload the AAB file

6. Fill in:
   - App title: **APC Connect**
   - Short description: Political engagement platform for APC Nigeria
   - Category: Social / News
   - Content rating questionnaire
   - Privacy policy URL

7. Submit for review

### Apple App Store

1. Build production IPA (use Option B, C, or D above)

2. Upload via:
   ```bash
   # Automated
   npx eas submit --platform ios
   
   # Or use Transporter app on macOS
   ```

3. Go to App Store Connect → configure metadata → submit for review

---

## Over-the-Air (OTA) Updates

After initial app store deployment, push JS/asset updates without a new build:

```bash
npx eas update --branch production --message "Bug fixes and improvements"
```

OTA updates work for JavaScript/asset changes only. Native changes (new permissions, new native modules) require a new build.

---

## Key App Features

| Feature | Screen | Description |
|---------|--------|-------------|
| Dashboard | `(tabs)/index` | Stats, news/events previews, quick actions |
| News | `(tabs)/news` | Category filtered news feed with like/share |
| Events | `(tabs)/events` | RSVP, event details, online meeting support |
| Elections | `(tabs)/elections` | Party primaries + general elections voting |
| Profile | `(tabs)/profile` | Edit profile, NIN verification, badges |
| Digital ID | `digital-id` | Membership card with QR code |
| Points | `points` | Points balance and earning history |
| Tasks | `tasks` | Micro-tasks with image proof upload |
| Rewards | `rewards` | Redeem points for airtime, data, cash |
| Donations | `donations` | Flutterwave-powered donations |
| Dues | `dues` | Membership dues payment and history |
| Election Day | `election-day` | Agent login, check-in, vote submission, incidents |
| Manage Agents | `manage-agents` | Admin: assign/manage polling agents |
| Leaderboard | `leaderboard` | Rankings with time/state filters |
| Campaigns | `campaigns` | Issue campaigns with voting and comments |
| Knowledge Base | `knowledge-base` | Articles and FAQs |
| Quizzes | `quizzes` | Political literacy quizzes with scoring |
| Ideas | `ideas` | Ideas board with upvoting and comments |
| Search | `search` | Multi-category content search |
| Notifications | `notification-settings` | Push/email/SMS channel preferences |

---

## Election Day Agent Functions

| Function | Endpoint | Description |
|----------|----------|-------------|
| Agent Login | `POST /api/election-day/agent-login` | Auth with agent code + PIN |
| Check-in | `POST /api/election-day/agent-check-in` | GPS check-in at polling unit |
| Submit Results | `POST /api/election-day/submit-results` | Vote counts per candidate |
| Report Incident | `POST /api/election-day/report-incident` | Irregularity reports with photos |
| Upload Sheet | `POST /api/election-day/upload-result-sheet` | Physical result sheet photos |

Real-time Socket.IO events: `general-election:result-updated`, `agent-activity:updated`, `result-sheet:uploaded`

---

## Troubleshooting

### Common Issues

**"Network request failed" errors:**
- Verify the backend at https://apc-connect.replit.app is running
- On Android emulator, use `10.0.2.2` instead of `localhost`
- Check your internet connection

**"Unable to resolve module" errors:**
```bash
npx expo start --clear
rm -rf node_modules && npm install
```

**Android local build fails:**
- Ensure Java 17 is installed: `java -version`
- Ensure `ANDROID_HOME` is set: `echo $ANDROID_HOME`
- Try: `cd android && ./gradlew clean && ./gradlew assembleRelease`

**iOS build fails:**
- Update CocoaPods: `cd ios && pod install --repo-update`
- Ensure Xcode command-line tools: `xcode-select --install`
- Clean build: Xcode → Product → Clean Build Folder

**Token refresh loops:**
- Clear secure storage: Uninstall and reinstall the app
- Check that the backend refresh endpoint returns valid tokens

### Useful Commands

```bash
# Check Expo diagnostics
npx expo doctor

# Clear all caches and restart
npx expo start --clear

# Regenerate native projects (after adding native modules)
npx expo prebuild --clean

# View EAS build history
npx eas build:list

# Check project config
npx eas project:info

# Fix Expo SDK compatibility
npx expo install --fix
```

---

## Version Management

When releasing a new version:

1. Update `version` in `app.json` (e.g., "1.0.0" to "1.1.0")
2. EAS auto-increments `versionCode` (Android) and `buildNumber` (iOS)
3. Build with production profile
4. Submit to stores or use OTA update

For JS-only changes (no new native modules):
```bash
npx eas update --branch production --message "v1.1.0 - Feature updates"
```

For native changes (new permissions, SDK update):
```bash
npx expo prebuild --clean
# Then rebuild using Option A, B, C, or D
```
