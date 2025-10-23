# APC Connect Mobile App

A React Native mobile application built with Expo for the All Progressives Congress (APC) Connect platform. This app enables party members to engage with party activities, vote in elections, attend events, and earn rewards through gamification.

## Features

- 🔐 **JWT Authentication** - Secure login and registration with automatic token refresh
- 📱 **Native Mobile Experience** - Built with React Native and Expo for iOS and Android
- 📊 **Member Dashboard** - View stats, points, badges, and quick actions
- 📅 **Events Management** - Browse and RSVP to party events
- 🗳️ **Elections & Voting** - Participate in party elections
- 👤 **Profile Management** - View and manage your member profile
- 🔄 **Offline Support** - React Query caching for offline data access

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **npm** or **yarn** - Comes with Node.js
- **Expo CLI** - Will be installed as a dev dependency
- **iOS Simulator** (Mac only) or **Android Studio** for emulator

### For iOS Development (Mac only)
- Xcode (latest version from App Store)
- Xcode Command Line Tools

### For Android Development
- Android Studio with Android SDK
- Android Emulator or physical Android device

## Installation

1. **Navigate to the mobile directory:**
   ```bash
   cd mobile
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```
   or
   ```bash
   yarn install
   ```

3. **Set up environment variables:**
   
   Copy the `.env.example` file to `.env`:
   ```bash
   cp .env.example .env
   ```
   
   Update the `.env` file with your backend API URL:
   ```env
   API_URL=https://your-replit-url.replit.dev
   ```
   
   For local development:
   ```env
   API_URL=http://localhost:5000
   ```

## Running the App

### Start the Development Server

```bash
npm start
```

or

```bash
npx expo start
```

This will open the Expo Dev Tools in your browser.

### Run on iOS Simulator (Mac only)

```bash
npm run ios
```

or press `i` in the Expo Dev Tools terminal.

### Run on Android Emulator

```bash
npm run android
```

or press `a` in the Expo Dev Tools terminal.

### Run on Physical Device

1. Install the **Expo Go** app from the App Store (iOS) or Google Play Store (Android)
2. Scan the QR code shown in the terminal or Expo Dev Tools
3. The app will load on your device

## Project Structure

```
mobile/
├── app/                    # Expo Router app directory
│   ├── (auth)/            # Authentication screens
│   │   ├── login.tsx      # Login screen
│   │   ├── register.tsx   # Registration screen
│   │   └── _layout.tsx    # Auth layout
│   ├── (tabs)/            # Main app tabs
│   │   ├── index.tsx      # Dashboard/Home
│   │   ├── events.tsx     # Events listing
│   │   ├── elections.tsx  # Elections & voting
│   │   ├── profile.tsx    # User profile
│   │   └── _layout.tsx    # Tab layout
│   ├── _layout.tsx        # Root layout
│   └── +not-found.tsx     # 404 screen
├── components/            # Shared UI components
│   ├── ui/
│   │   ├── Button.tsx     # Custom button component
│   │   ├── Card.tsx       # Card component
│   │   ├── Input.tsx      # Input component
│   │   └── Text.tsx       # Text component
│   └── AuthGuard.tsx      # Route protection wrapper
├── lib/
│   ├── api.ts            # API client with JWT handling
│   ├── auth.ts           # Authentication utilities
│   ├── storage.ts        # Secure storage wrapper
│   └── queryClient.ts    # React Query configuration
├── types/                # TypeScript type definitions
│   └── index.ts
├── app.json              # Expo configuration
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
└── .env.example          # Environment variables template
```

## API Integration

### Authentication Flow

The app uses JWT (JSON Web Tokens) for authentication:

1. **Login/Register** - User credentials are sent to `/api/auth/mobile/login` or `/api/auth/mobile/register`
2. **Token Storage** - Access and refresh tokens are securely stored using `expo-secure-store`
3. **API Requests** - Access token is automatically added to all API requests
4. **Token Refresh** - When the access token expires, the refresh token is used to get a new one
5. **Logout** - Tokens are cleared from secure storage

### API Client

The API client (`lib/api.ts`) handles:

- Automatic JWT token injection
- Token refresh on 401 responses
- Request/response error handling
- Type-safe API calls

Example usage:

```typescript
import { api } from '@/lib/api';

// GET request
const response = await api.get('/api/events');

// POST request
const response = await api.post('/api/auth/mobile/login', {
  email: 'user@example.com',
  password: 'password'
});
```

### Data Fetching with React Query

The app uses `@tanstack/react-query` for data fetching:

```typescript
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

function MyComponent() {
  const { data, isLoading } = useQuery({
    queryKey: ['/api/events'],
    queryFn: async () => {
      const response = await api.get('/api/events');
      return response.data;
    },
  });

  // Use the data...
}
```

## Backend Requirements

The mobile app expects the following API endpoints to be available on the backend:

### Authentication
- `POST /api/auth/mobile/login` - Login endpoint
- `POST /api/auth/mobile/register` - Registration endpoint
- `POST /api/auth/mobile/refresh` - Token refresh endpoint
- `POST /api/auth/mobile/logout` - Logout endpoint

### Data Endpoints
- `GET /api/events` - List events
- `GET /api/elections` - List elections
- `GET /api/analytics/member-overview` - Member stats

Ensure your backend server is running and accessible from your mobile device.

## Building for Production

### Configure App Credentials

Update `app.json` with your specific configuration:

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

### Build with EAS (Expo Application Services)

1. **Install EAS CLI:**
   ```bash
   npm install -g eas-cli
   ```

2. **Login to Expo:**
   ```bash
   eas login
   ```

3. **Configure EAS:**
   ```bash
   eas build:configure
   ```

4. **Build for Android:**
   ```bash
   eas build --platform android
   ```

5. **Build for iOS:**
   ```bash
   eas build --platform ios
   ```

### Alternative: Classic Build (Deprecated)

```bash
# iOS
expo build:ios

# Android
expo build:android
```

## Environment Variables

The app supports the following environment variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `API_URL` | Backend API base URL | `https://your-replit-url.replit.dev` |

Environment variables are accessed via `expo-constants`:

```typescript
import Constants from 'expo-constants';

const apiUrl = Constants.expoConfig?.extra?.apiUrl || process.env.API_URL;
```

## Troubleshooting

### Common Issues

#### "Unable to connect to backend"

**Solution:** 
- Ensure your backend server is running
- Check that `API_URL` in `.env` is correct
- If using localhost on a physical device, use your computer's IP address instead
- For iOS simulator, `localhost` should work
- For Android emulator, use `10.0.2.2` instead of `localhost`

#### "Network request failed"

**Solution:**
- Check your internet connection
- Verify the backend URL is accessible from your device
- For development, ensure your device and development machine are on the same network

#### "Session expired" or "Unauthorized"

**Solution:**
- The JWT token may have expired
- Try logging out and logging back in
- Check that token refresh is working correctly

#### Metro bundler issues

**Solution:**
```bash
# Clear Metro cache
npx expo start -c

# Or delete node_modules and reinstall
rm -rf node_modules
npm install
```

## Testing

### Manual Testing Checklist

- [ ] Registration with valid data
- [ ] Registration with invalid data (error handling)
- [ ] Login with correct credentials
- [ ] Login with incorrect credentials
- [ ] Dashboard loads correctly
- [ ] Events list displays
- [ ] Elections list displays
- [ ] Profile displays user data
- [ ] Logout works correctly
- [ ] Token refresh works on expired token
- [ ] Offline caching works

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [Expo Router Documentation](https://expo.github.io/router/)
- [React Query Documentation](https://tanstack.com/query/latest)

## License

Copyright © 2024 All Progressives Congress (APC) Nigeria

## Support

For support, please contact the APC Connect development team or open an issue in the repository.
