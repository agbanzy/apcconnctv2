# 📱 APC Connect - Mobile App Development Guide

## Overview

APC Connect now supports **BOTH** web (PWA) and native mobile applications, sharing the same backend API infrastructure.

```
┌─────────────────┐
│   PWA (Web)     │◄─── Session Auth
│   React + Vite  │
└────────┬────────┘
         │
         │ Same Backend API
         │
┌────────▼────────┐
│  Express API    │
│  PostgreSQL DB  │
└────────┬────────┘
         │
         │
┌────────▼────────┐
│  Mobile (Expo)  │◄─── JWT Auth
│  React Native   │
└─────────────────┘
```

## 🎯 Architecture

### Dual Authentication System

#### Web PWA (Existing)
- **Auth Method:** Express sessions with Passport.js
- **Storage:** PostgreSQL session store
- **Token:** Session cookie
- **Endpoints:** `/api/auth/login`, `/api/auth/register`, `/api/auth/logout`

#### Mobile App (New)
- **Auth Method:** JWT tokens
- **Storage:** Expo SecureStore (encrypted device storage)
- **Tokens:** 
  - Access Token (15 min expiry)
  - Refresh Token (7 day expiry)
- **Endpoints:** 
  - `/api/auth/mobile/login`
  - `/api/auth/mobile/refresh`
  - `/api/auth/mobile/logout`

### Backend API Endpoints

All existing API endpoints now support BOTH authentication methods:
- Web requests use session cookies
- Mobile requests use JWT Bearer tokens

**Example Request (Mobile):**
```http
GET /api/members/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 🚀 Quick Start - Mobile Development

### Prerequisites

1. **Node.js** (v18 or higher)
2. **npm** or **yarn**
3. **Expo CLI** (optional, but recommended)
   ```bash
   npm install -g expo-cli
   ```

4. **Mobile Development Tools:**
   - **For iOS:** Xcode (Mac only)
   - **For Android:** Android Studio + Android SDK
   - **Or:** Expo Go app on your phone (easiest for testing)

### Installation

1. **Navigate to mobile directory:**
   ```bash
   cd mobile
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```

4. **Edit `.env` with your backend URL:**
   ```env
   API_URL=https://your-replit-app.replit.dev
   ```

### Running the App

#### Option 1: Expo Go (Easiest)

1. Install Expo Go on your phone:
   - [iOS](https://apps.apple.com/app/expo-go/id982107779)
   - [Android](https://play.google.com/store/apps/details?id=host.exp.exponent)

2. Start the development server:
   ```bash
   npx expo start
   ```

3. Scan the QR code with your phone's camera (iOS) or Expo Go app (Android)

#### Option 2: iOS Simulator (Mac Only)

```bash
npx expo start --ios
```

#### Option 3: Android Emulator

```bash
npx expo start --android
```

### First Run Checklist

- [ ] Backend server is running on Replit
- [ ] `.env` file has correct API_URL
- [ ] Can access backend API from mobile device/emulator
- [ ] Test login with existing user account

## 📂 Project Structure

```
mobile/
├── app/                      # Expo Router pages
│   ├── (auth)/              # Authentication screens
│   │   ├── login.tsx        # Login screen
│   │   ├── register.tsx     # Registration screen
│   │   └── _layout.tsx      # Auth layout
│   ├── (tabs)/              # Main app tabs
│   │   ├── index.tsx        # Dashboard/Home
│   │   ├── events.tsx       # Events listing
│   │   ├── elections.tsx    # Elections & voting
│   │   ├── profile.tsx      # User profile
│   │   └── _layout.tsx      # Tab layout
│   ├── _layout.tsx          # Root layout
│   └── +not-found.tsx       # 404 screen
├── components/              # Reusable components
│   ├── ui/                  # UI primitives
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   └── Text.tsx
│   └── AuthGuard.tsx        # Route protection
├── lib/                     # Core utilities
│   ├── api.ts              # API client with JWT
│   ├── auth.ts             # Auth utilities
│   ├── storage.ts          # Secure storage wrapper
│   └── queryClient.ts      # React Query config
├── types/                   # TypeScript types
│   └── index.ts            # Shared types from backend
├── app.json                 # Expo configuration
├── package.json
└── README.md
```

## 🔐 Authentication Flow

### Login Process

1. User enters email/password on login screen
2. App calls `POST /api/auth/mobile/login`
3. Backend validates credentials
4. Backend returns:
   ```json
   {
     "success": true,
     "data": {
       "accessToken": "eyJhbGc...",
       "refreshToken": "eyJhbGc...",
       "user": { "id": "...", "email": "...", ... },
       "member": { "id": "...", "memberId": "APC-...", ... }
     }
   }
   ```
5. App stores tokens in SecureStore
6. App navigates to dashboard

### Token Refresh

Access tokens expire after 15 minutes. The app automatically refreshes them:

1. API request receives 401 Unauthorized
2. App calls `POST /api/auth/mobile/refresh` with refresh token
3. Backend returns new access and refresh tokens
4. App retries original request

### Logout

1. User clicks logout
2. App calls `POST /api/auth/mobile/logout` with refresh token
3. Backend revokes refresh token in database
4. App clears local tokens
5. App navigates to login screen

## 🌐 API Integration

### Making API Calls

Use the provided API client:

```typescript
import { apiRequest } from '@/lib/api';

// Example: Fetch member profile
const member = await apiRequest('/api/members/me', {
  method: 'GET'
});

// Example: Create incident report
const incident = await apiRequest('/api/incidents', {
  method: 'POST',
  body: {
    title: 'Incident Title',
    description: 'Details...',
    severity: 'high'
  }
});
```

### Using React Query

```typescript
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';

// Fetch data
const { data, isLoading, error } = useQuery({
  queryKey: ['/api/events'],
  queryFn: () => apiRequest('/api/events')
});

// Mutate data
const mutation = useMutation({
  mutationFn: (eventId: string) => 
    apiRequest(`/api/events/${eventId}/rsvp`, { method: 'POST' }),
  onSuccess: () => {
    // Invalidate and refetch
    queryClient.invalidateQueries({ queryKey: ['/api/events'] });
  }
});
```

## 📱 Adding New Screens

### 1. Create Screen File

```bash
# For authenticated screens
touch mobile/app/(tabs)/new-screen.tsx

# For public screens
touch mobile/app/new-screen.tsx
```

### 2. Implement Screen Component

```typescript
import { View, ScrollView, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';

export default function NewScreen() {
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['/api/your-endpoint'],
  });

  return (
    <ScrollView
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
      }
    >
      <View style={{ padding: 16 }}>
        <Text variant="h1">Your Screen</Text>
        {/* Your content */}
      </View>
    </ScrollView>
  );
}
```

### 3. Add to Navigation

For tab screens, update `app/(tabs)/_layout.tsx`:

```typescript
<Tabs.Screen
  name="new-screen"
  options={{
    title: 'New Screen',
    tabBarIcon: ({ color }) => <TabBarIcon name="icon-name" color={color} />,
  }}
/>
```

## 🎨 UI Components

### Using Custom Components

```typescript
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';

// Button variants
<Button variant="primary" onPress={handlePress}>
  Primary Button
</Button>

<Button variant="secondary" onPress={handlePress}>
  Secondary Button
</Button>

<Button variant="outline" onPress={handlePress}>
  Outline Button
</Button>

// Text variants
<Text variant="h1">Heading 1</Text>
<Text variant="h2">Heading 2</Text>
<Text variant="h3">Heading 3</Text>
<Text variant="body">Body text</Text>
<Text variant="caption">Caption text</Text>

// Input with validation
<Input
  label="Email"
  value={email}
  onChangeText={setEmail}
  placeholder="Enter your email"
  error={errors.email}
  keyboardType="email-address"
/>

// Card
<Card>
  <Text variant="h3">Card Title</Text>
  <Text variant="body">Card content</Text>
</Card>
```

## 🏗️ Building for Production

### Prerequisites

1. **Expo Account** (free)
   - Sign up at [expo.dev](https://expo.dev)

2. **EAS CLI**
   ```bash
   npm install -g eas-cli
   eas login
   ```

### Configure Build

1. **Initialize EAS:**
   ```bash
   cd mobile
   eas build:configure
   ```

2. **Update app.json with your details:**
   ```json
   {
     "expo": {
       "name": "APC Connect",
       "slug": "apc-connect",
       "ios": {
         "bundleIdentifier": "org.apcng.APCConnect"
       },
       "android": {
         "package": "org.apcng.connect"
       }
     }
   }
   ```

### Build for Android

```bash
# Development build (for testing)
eas build --platform android --profile development

# Production build (for Google Play)
eas build --platform android --profile production
```

### Build for iOS

```bash
# Development build
eas build --platform ios --profile development

# Production build (for App Store)
eas build --platform ios --profile production
```

### Submit to Stores

```bash
# Google Play Store
eas submit --platform android

# Apple App Store
eas submit --platform ios
```

## 🔧 Configuration

### Environment Variables

Create `mobile/.env`:

```env
# Backend API URL (required)
API_URL=https://your-app.replit.dev

# Optional: Enable debug logging
DEBUG=true

# Optional: API timeout (milliseconds)
API_TIMEOUT=30000
```

### App Configuration

Edit `mobile/app.json`:

```json
{
  "expo": {
    "name": "APC Connect",
    "slug": "apc-connect",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#00A86B"
    },
    "android": {
      "package": "org.apcng.connect",
      "versionCode": 1,
      "permissions": [
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE",
        "ACCESS_FINE_LOCATION"
      ]
    },
    "ios": {
      "bundleIdentifier": "org.apcng.APCConnect",
      "buildNumber": "1.0.0",
      "supportsTablet": true
    }
  }
}
```

## 🐛 Troubleshooting

### Common Issues

#### 1. "Cannot connect to backend"

**Solution:**
- Ensure backend is running on Replit
- Check API_URL in `.env` is correct
- Test API URL in browser: `https://your-app.replit.dev/api/auth/me`
- If using emulator, use `http://10.0.2.2:5000` for Android or `http://localhost:5000` for iOS

#### 2. "Network request failed"

**Solution:**
- Check internet connection
- Verify Replit app is public/accessible
- Try increasing API_TIMEOUT in `.env`

#### 3. "Unauthorized" errors

**Solution:**
- Tokens may have expired
- Try logging out and back in
- Check backend JWT_SECRET is set
- Verify backend mobile auth endpoints are working

#### 4. "Module not found" errors

**Solution:**
```bash
cd mobile
rm -rf node_modules
npm install
```

#### 5. Build fails on EAS

**Solution:**
- Check app.json for syntax errors
- Ensure package.json versions are compatible
- Check EAS build logs for specific errors
- Try: `eas build --clear-cache`

### Debug Mode

Enable detailed logging:

```env
# In mobile/.env
DEBUG=true
```

View logs:
```bash
npx expo start --dev-client
# Or
npx expo start --clear
```

## 📚 Additional Resources

### Documentation

- **Expo Documentation:** [docs.expo.dev](https://docs.expo.dev)
- **React Native:** [reactnative.dev](https://reactnative.dev)
- **Expo Router:** [expo.github.io/router](https://expo.github.io/router)
- **React Query:** [tanstack.com/query](https://tanstack.com/query)

### Backend API

- See `server/routes.ts` for all available endpoints
- Mobile endpoints are under `/api/auth/mobile/*`
- All other endpoints support both session and JWT auth

### Testing

- **Jest:** For unit testing
- **Detox:** For E2E testing (recommended)
- **Expo Go:** For manual testing

## 🎯 Next Steps

1. **Add App Icon & Splash Screen**
   - Create 1024x1024 app icon
   - Create splash screen image
   - Place in `mobile/assets/`

2. **Implement Additional Screens**
   - Incident reporting with camera
   - News feed
   - Event RSVP
   - Election voting
   - Member directory

3. **Add Push Notifications**
   - Install `expo-notifications`
   - Configure push tokens
   - Update backend to send notifications

4. **Offline Support**
   - Configure React Query persistence
   - Add SQLite for offline storage
   - Implement sync queue

5. **Test on Real Devices**
   - Build development client
   - Test on physical devices
   - Gather user feedback

## 🤝 Contributing

When adding features to the mobile app:

1. Follow existing code patterns
2. Use TypeScript strictly
3. Add error handling
4. Test on both iOS and Android
5. Update this documentation

## 📄 License

Same as main APC Connect project.

---

**Questions?** Check the main README in the `mobile/` directory or consult the Expo documentation.
