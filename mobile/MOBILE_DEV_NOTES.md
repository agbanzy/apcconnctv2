# APC Connect Mobile App - Development Notes

## For Claude Code (Local Development Bot)

This document describes the current state of the mobile app, what's working, what's missing, and what needs to be done to achieve feature parity with the web platform.

---

## Current State

The mobile app skeleton is set up with Expo SDK 52, Expo Router v4, and TanStack Query v5. The following screens exist but may need completion or bug fixes:

### Files Structure
```
mobile/
├── app/
│   ├── _layout.tsx          # Root layout with QueryClient, SafeAreaProvider, AuthGuard
│   ├── +not-found.tsx       # 404 screen
│   ├── (auth)/
│   │   ├── _layout.tsx      # Auth stack layout
│   │   ├── login.tsx         # Login screen (email + password)
│   │   └── register.tsx      # Registration with state/LGA/ward cascading picker
│   └── (tabs)/
│       ├── _layout.tsx       # Tab navigation (5 tabs)
│       ├── index.tsx          # Dashboard (greeting, stats, news/events previews)
│       ├── news.tsx           # News feed with category filtering
│       ├── events.tsx         # Events with RSVP
│       ├── elections.tsx      # Elections with voting
│       └── profile.tsx        # Profile management, NIN verification, badges
├── components/
│   ├── AuthGuard.tsx          # Auth state check, redirects to login/tabs
│   ├── NigeriaMap.tsx         # SVG-based Nigeria state map (uses react-native-svg)
│   └── ui/
│       ├── Button.tsx         # Custom button component
│       ├── Card.tsx           # Shadow card wrapper
│       ├── Input.tsx          # Text input with label/error
│       └── Text.tsx           # Typography component with variants
├── lib/
│   ├── api.ts                 # API client with JWT auth, token refresh, timeout
│   ├── auth.ts                # Auth functions (login, register, logout, refresh)
│   ├── queryClient.ts         # TanStack Query client + apiRequest helper
│   └── storage.ts             # Secure storage (expo-secure-store) for tokens
├── types/
│   └── index.ts               # Shared TypeScript types
├── package.json
├── tsconfig.json
├── app.json
└── eas.json
```

---

## Backend API Endpoints Available

The backend (server/routes.ts) already has all endpoints the mobile app needs. All authenticated endpoints accept `Authorization: Bearer <accessToken>` headers.

### Authentication (Mobile-Specific)
- `POST /api/auth/mobile/register` - Register with {email, password, firstName, lastName, phone?, wardId, referralCode?}
- `POST /api/auth/mobile/login` - Login with {email, password} → returns {user, member, accessToken, refreshToken}
- `POST /api/auth/mobile/refresh` - Refresh token with {refreshToken} → returns {accessToken, refreshToken}
- `POST /api/auth/mobile/logout` - Logout with {refreshToken}
- `GET /api/auth/me` - Get current user info (requires auth)

### Profile
- `GET /api/profile` - Get profile with member data, ward/LGA/state info
- `PATCH /api/profile` - Update profile fields (firstName, lastName, phone, etc.)
- `GET /api/profile/badges` - Get user's earned badges
- `POST /api/profile/verify-nin` - Submit NIN for verification {nin}

### Location Data (Public, No Auth)
- `GET /api/states` - List all 37 Nigerian states
- `GET /api/lgas?stateId=<id>` - List LGAs for a state
- `GET /api/wards?lgaId=<id>` - List wards for an LGA

### News
- `GET /api/news?limit=N&category=C` - List news posts (public)
- `GET /api/news/:id` - Get single news post (public)
- `POST /api/news/:id/like` - Like/unlike a news post (auth)
- `GET /api/news/:id/comments` - Get comments (public)
- `POST /api/news/:id/comments` - Add comment (auth)

### Events
- `GET /api/events?limit=N&category=C` - List events (public, includes attendeeCount, member's RSVP status if authed)
- `GET /api/events/:id` - Event details (includes member's RSVP if authed)
- `POST /api/events/:id/rsvp` - RSVP to event (auth)
- `DELETE /api/events/:id/rsvp` - Cancel own RSVP (auth)

### Elections
- `GET /api/elections` - List elections (includes member's vote status if authed)
- `GET /api/elections/:id` - Election details with candidates (includes hasVoted if authed)
- `POST /api/elections/:id/vote` - Cast vote {candidateId} (auth)
- `GET /api/elections/:id/results` - Get election results (public)

### Member Data
- `GET /api/members/me` - Get own member record (auth)
- `GET /api/members/points` - Get points balance (auth)

### Analytics
- `GET /api/analytics/member-overview` - Dashboard stats: points, badges, events, tasks, rank (auth)
- `GET /api/analytics/map-data` - State-level analytics for Nigeria map

### Micro-Tasks
- `GET /api/micro-tasks?limit=N` - List available tasks (auth)

### Rewards
- `GET /api/rewards/conversion-settings` - Get points conversion rates (auth)
- `POST /api/rewards/quote` - Get redemption quote (auth)
- `POST /api/rewards/redeem` - Redeem points for airtime/data/cash (auth)
- `GET /api/rewards/redemptions` - Redemption history (auth)

---

## API Response Format

All API responses follow this structure:
```json
{
  "success": true,
  "data": { ... }
}
```

On error:
```json
{
  "success": false,
  "error": "Error message"
}
```

---

## Known Issues to Fix

1. **`lib/api.ts` imports `./storage`** - This is correct, uses `expo-secure-store` for token persistence.

2. **Missing `@expo/vector-icons` in dependencies** - The `Ionicons` import from `@expo/vector-icons` should work because it's bundled with Expo SDK 52, but verify it's available.

3. **NigeriaMap component** uses `react-native-svg` which is in dependencies. Should work but may need testing.

4. **Environment variable for API URL**: Set `EXPO_PUBLIC_API_URL` in `.env` to point to the deployed backend:
   ```
   EXPO_PUBLIC_API_URL=https://your-replit-app-url.replit.app
   ```

---

## What Needs to Be Done

### Priority 1: Core Functionality Verification
- [ ] Verify login/register flow works end-to-end with the backend
- [ ] Test JWT token refresh flow (api.ts handles 401 → refresh → retry automatically)
- [ ] Confirm AuthGuard routing works (unauthenticated → login, authenticated → tabs)

### Priority 2: Screen Completeness
- [ ] **Dashboard** (`(tabs)/index.tsx`): Verify stats API integration, pull-to-refresh, quick actions grid
- [ ] **News** (`(tabs)/news.tsx`): Category filtering, like functionality, news detail view
- [ ] **Events** (`(tabs)/events.tsx`): RSVP flow, event details modal, cancel RSVP, online meeting links
- [ ] **Elections** (`(tabs)/elections.tsx`): Candidate list, vote confirmation dialog, results display with progress bars
- [ ] **Profile** (`(tabs)/profile.tsx`): Edit modal, NIN verification submission, badges display, stats

### Priority 3: Missing Features (Not Yet Implemented)
- [ ] **Points & Rewards screen**: Show points balance, redemption options (airtime/data/cash), history
- [ ] **Notifications**: Push notification integration (backend supports it)
- [ ] **Offline support**: Cache critical data for offline viewing
- [ ] **Dark mode**: Currently hardcoded to light theme colors

### Priority 4: Polish
- [ ] Loading/skeleton states for all data-fetching screens
- [ ] Error states with retry buttons
- [ ] Empty states when no data available
- [ ] Pull-to-refresh on all list screens
- [ ] Proper image handling for news/event thumbnails

---

## APC Brand Colors

- Primary Green: `#00A86B`
- Active/Success: `#10B981`
- Background: `#FFFFFF`
- Surface: `#F9FAFB`
- Border: `#E5E7EB`
- Text Primary: `#111827`
- Text Secondary: `#374151`
- Text Muted: `#6B7280`
- Text Placeholder: `#9CA3AF`
- Error/Destructive: `#EF4444`
- Warning: `#F59E0B`

---

## Running the App

```bash
cd mobile
npm install
npx expo start
```

For development, set the API URL to your Replit dev URL:
```bash
EXPO_PUBLIC_API_URL=https://your-replit-url.replit.dev npx expo start
```

For EAS builds:
```bash
npx eas build --platform android --profile development
npx eas build --platform ios --profile development
```

---

## Important Notes

- The web app uses session-based auth (cookies). The mobile app uses JWT-based auth (Bearer tokens). Both work simultaneously - the server middleware checks for JWT Bearer header first, falls back to session.
- The `requireAuth` middleware works for both web and mobile - it checks `req.isAuthenticated()` (session) OR `req.user` (set by JWT middleware).
- Ward selection during registration uses cascading pickers: State → LGA → Ward. The data comes from `/api/states`, `/api/lgas?stateId=`, `/api/wards?lgaId=`.
- All API endpoint query params and bodies are documented in `server/routes.ts`.
