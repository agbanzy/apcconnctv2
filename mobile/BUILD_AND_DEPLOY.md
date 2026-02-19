# APC Connect Mobile App - Build & Deploy Guide

## Prerequisites

Before you begin, ensure you have the following installed on your local machine:

- **Node.js** v18 or later: https://nodejs.org
- **npm** v9 or later (comes with Node.js)
- **Expo CLI**: `npm install -g expo-cli`
- **EAS CLI**: `npm install -g eas-cli`
- **Expo Go app** on your phone (for development testing):
  - Android: https://play.google.com/store/apps/details?id=host.exp.exponent
  - iOS: https://apps.apple.com/app/expo-go/id982107779
- **Expo account**: Create one at https://expo.dev/signup

### Platform-Specific Requirements

**For Android builds:**
- No additional software needed (EAS builds in the cloud)
- For local builds: Android Studio with Android SDK

**For iOS builds:**
- Apple Developer account ($99/year): https://developer.apple.com
- For local builds: macOS with Xcode installed

---

## Quick Start (Development)

### 1. Clone and Install

```bash
cd mobile
npm install
```

### 2. Configure API URL

Create a `.env` file in the `mobile/` directory:

```bash
# For local development (when backend runs on your machine)
EXPO_PUBLIC_API_URL=http://localhost:5000

# For development against deployed backend
EXPO_PUBLIC_API_URL=https://your-app.replit.app
```

Alternatively, set it inline when starting:

```bash
EXPO_PUBLIC_API_URL=https://your-app.replit.app npx expo start
```

### 3. Start Development Server

```bash
npx expo start
```

This opens the Expo Developer Tools. From here:
- **Scan the QR code** with Expo Go on your phone
- Press **`a`** to open in Android emulator
- Press **`i`** to open in iOS simulator (macOS only)
- Press **`w`** to open in web browser

### 4. Development Tips

- **Hot reload** is enabled by default - changes appear instantly
- **Shake your device** to open the developer menu
- **`r`** in terminal to reload the app
- **`m`** in terminal to toggle the developer menu

---

## Project Structure

```
mobile/
├── app/                    # Expo Router file-based routing
│   ├── _layout.tsx         # Root layout (providers, auth guard)
│   ├── (auth)/             # Auth screens (login, register)
│   └── (tabs)/             # Main tab screens
│       ├── index.tsx       # Dashboard
│       ├── news.tsx        # News feed
│       ├── events.tsx      # Events
│       ├── elections.tsx   # Elections
│       └── profile.tsx     # Profile
├── components/             # Reusable components
├── lib/                    # API client, auth, storage utilities
├── types/                  # TypeScript type definitions
├── assets/                 # App icons, splash screen
├── app.json                # Expo configuration
├── eas.json                # EAS Build configuration
└── package.json            # Dependencies
```

---

## Authentication Architecture

The mobile app uses **JWT-based authentication** (different from the web app's session-based auth):

1. **Login** → Server returns `accessToken` + `refreshToken`
2. **API calls** → `Authorization: Bearer <accessToken>` header
3. **Token expiry** → Auto-refresh via interceptor in `lib/api.ts`
4. **Token storage** → `expo-secure-store` (encrypted device storage)
5. **Logout** → Clear tokens from secure store

The backend middleware (`requireAuth`) supports both auth methods simultaneously.

---

## Building for Production

### Step 1: Configure EAS Project

```bash
# Login to your Expo account
npx eas login

# Link to your EAS project (first time only)
npx eas init
```

Update `app.json` with your actual project ID:
```json
{
  "expo": {
    "extra": {
      "eas": {
        "projectId": "your-actual-project-id"
      }
    }
  }
}
```

### Step 2: Set Environment Variables

Set the production API URL in EAS:

```bash
npx eas env:create EXPO_PUBLIC_API_URL --value "https://your-app.replit.app" --environment production
```

Or add to `eas.json`:
```json
{
  "build": {
    "production": {
      "autoIncrement": true,
      "env": {
        "EXPO_PUBLIC_API_URL": "https://your-app.replit.app"
      }
    }
  }
}
```

### Step 3: Build Android APK/AAB

```bash
# Development build (with dev tools, internal distribution)
npx eas build --platform android --profile development

# Preview build (production-like, internal distribution)
npx eas build --platform android --profile preview

# Production build (for Google Play Store)
npx eas build --platform android --profile production
```

After the build completes, EAS provides a download link for the APK/AAB.

### Step 4: Build iOS IPA

```bash
# Development build (requires Apple Developer account)
npx eas build --platform ios --profile development

# Preview build (Ad Hoc distribution)
npx eas build --platform ios --profile preview

# Production build (for App Store)
npx eas build --platform ios --profile production
```

You will need:
- Apple Developer account credentials
- An App Store Connect API key or manual certificate management

---

## Deploying to App Stores

### Google Play Store

1. **Build production AAB:**
   ```bash
   npx eas build --platform android --profile production
   ```

2. **Download the AAB** from the EAS dashboard

3. **Upload to Google Play Console:**
   - Go to https://play.google.com/console
   - Create a new app or select existing
   - Go to "Production" > "Create new release"
   - Upload the AAB file
   - Fill in release notes
   - Submit for review

4. **Auto-submit (optional):**
   ```bash
   npx eas submit --platform android
   ```

### Apple App Store

1. **Build production IPA:**
   ```bash
   npx eas build --platform ios --profile production
   ```

2. **Submit to App Store Connect:**
   ```bash
   npx eas submit --platform ios
   ```
   
   Or manually:
   - Download the IPA from EAS dashboard
   - Use Transporter app (macOS) to upload
   - Go to App Store Connect to configure and submit for review

---

## Over-the-Air (OTA) Updates

After initial app store deployment, push updates without a new build:

```bash
# Push an update to production
npx eas update --branch production --message "Bug fixes and improvements"

# Push an update to preview
npx eas update --branch preview --message "Testing new features"
```

OTA updates work for JavaScript/asset changes only. Native changes (new permissions, new native modules) require a new build.

---

## Environment Profiles

| Profile | Use Case | Distribution |
|---------|----------|-------------|
| `development` | Dev testing with Expo Dev Client | Internal (team) |
| `preview` | QA/UAT testing | Internal (team) |
| `production` | App store release | Public (stores) |

---

## Key Configuration Files

### `app.json` - App identity and permissions

- `expo.name` - Display name
- `expo.slug` - URL-safe identifier
- `expo.version` - Semantic version (update for store releases)
- `expo.ios.bundleIdentifier` - iOS app identifier: `org.apcng.APCConnect`
- `expo.android.package` - Android package name: `org.apcng.connect`
- `expo.android.versionCode` - Android version code (auto-incremented by EAS)
- `expo.ios.buildNumber` - iOS build number

### `eas.json` - Build and submit configuration

- Build profiles (development, preview, production)
- Auto-increment settings
- Distribution channels

---

## Agent Functions (Election Day)

The mobile app includes Election Day agent functionality:

### Agent Login
- Agents authenticate with their agent code and PIN
- Endpoint: `POST /api/election-day/agent-login`
- Returns agent details and assigned polling unit

### Agent Check-in
- Agents check in at their polling unit with GPS coordinates
- Endpoint: `POST /api/election-day/agent-check-in`

### Vote Submission
- Agents submit vote counts per candidate from their polling unit
- Endpoint: `POST /api/election-day/submit-results`
- Real-time Socket.IO event: `general-election:result-updated`

### Incident Reporting
- Agents report election irregularities with severity levels
- Endpoint: `POST /api/election-day/report-incident`
- Supports photo attachments

### Result Sheet Upload
- Agents photograph and upload physical result sheets
- Endpoint: `POST /api/election-day/upload-result-sheet`
- Real-time Socket.IO event: `result-sheet:uploaded`

### Activity Tracking
- All agent actions are logged in `agent_activity_logs` table
- Real-time Socket.IO event: `agent-activity:updated`
- Viewable in web admin Election Analytics dashboard

---

## Socket.IO Real-Time Events

The mobile app can connect to Socket.IO for live updates:

```typescript
import { io } from "socket.io-client";

const socket = io(API_URL, { transports: ["websocket", "polling"] });

// Listen for election result updates
socket.on("general-election:result-updated", (data) => {
  // { electionId, pollingUnitId }
});

// Listen for agent activity
socket.on("agent-activity:updated", (data) => {
  // { agentId, action, electionId }
});

// Listen for result sheet uploads
socket.on("result-sheet:uploaded", (data) => {
  // { electionId, pollingUnitId, sheetId }
});

// Listen for election day mode toggle
socket.on("election-day-mode:activated", (value) => { });
socket.on("election-day-mode:deactivated", () => { });
```

---

## Troubleshooting

### Common Issues

**"Network request failed" errors:**
- Verify `EXPO_PUBLIC_API_URL` is set correctly
- On Android emulator, use `10.0.2.2` instead of `localhost`
- On iOS simulator, `localhost` works
- Ensure the backend server is running and accessible

**"Unable to resolve module" errors:**
```bash
npx expo start --clear    # Clear Metro bundler cache
rm -rf node_modules && npm install    # Reinstall dependencies
```

**Build failures on EAS:**
- Check EAS build logs: `npx eas build:list`
- Ensure `app.json` has correct bundle identifiers
- Verify all native dependencies are compatible with SDK 52

**Token refresh loops:**
- Clear secure storage: Uninstall and reinstall the app
- Check that the backend refresh endpoint returns valid tokens

**Maps not rendering:**
- `react-native-svg` must be installed (already in dependencies)
- Verify SVG path data is correctly formatted

### Useful Commands

```bash
# Check Expo diagnostics
npx expo doctor

# Clear all caches and restart
npx expo start --clear

# View EAS build history
npx eas build:list

# Check EAS project config
npx eas project:info

# Update Expo SDK
npx expo install --fix
```

---

## Version Management

When releasing a new version:

1. Update `version` in `app.json` (e.g., "1.0.0" → "1.1.0")
2. EAS auto-increments `versionCode` (Android) and `buildNumber` (iOS) if configured
3. Build with production profile
4. Submit to stores or use OTA update

For OTA-compatible changes (JS/asset only):
```bash
npx eas update --branch production --message "v1.1.0 - Feature updates"
```

For native changes (new permissions, SDK update):
```bash
npx eas build --platform all --profile production
npx eas submit --platform all
```
