# APC Connect

## Overview
APC Connect is a comprehensive political engagement platform for the All Progressives Congress (APC) in Nigeria. It's a mobile-first web application designed to modernize party operations, offering membership management, electronic primaries, youth engagement, and real-time election monitoring. The platform aims to facilitate democratic participation through features like NIN-verified registration, blockchain-based voting, gamified political education, and transparent dues tracking. It emphasizes accessibility with offline functionality, low-bandwidth optimization, and PWA capabilities, bridging the gap between leadership and grassroots members.

## Recent Bug Fixes (Nov 13, 2025)

### Database Schema & API Fixes
1. **Analytics API Number Conversion**: Fixed string-to-number type mismatch where PostgreSQL bigint counts were serialized as strings by Neon driver. All analytics endpoints now wrap count values with `Number()` to ensure proper JavaScript number types.

2. **Leaderboard SQL Column Fix**: Corrected SQL queries in `server/services/leaderboards.ts` that referenced non-existent `m.created_at` column. Updated all 4 queries to use `m.join_date` for member sorting.

3. **Referrals Table Schema**: Added missing `referral_code` and `completed_at` columns to referrals table via `ALTER TABLE` statements to match schema definition.

4. **Ideas Relation Naming**: Renamed `author` relation to `member` in `ideasRelations` schema for consistency. Updated all ideas API endpoints (`/api/ideas`, `/api/ideas/:id`, PATCH, DELETE) to use `member` instead of `author`, aligning backend responses with frontend expectations.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Technology Stack**: React with TypeScript, Vite.
- **UI Framework**: Shadcn UI (Radix UI + Tailwind CSS), Material Design principles adapted for APC branding.
- **State Management**: TanStack Query for server state; React hooks for local state.
- **Routing**: Wouter for lightweight client-side routing.
- **PWA**: Service worker-based offline functionality (network-first for API, cache-first for assets).
- **Theme System**: Custom dark/light mode with HSL-based APC brand colors.

### Backend
- **Runtime & Framework**: Node.js with Express.js (TypeScript).
- **Authentication**: Passport.js (Local Strategy), server-side sessions with `express-session` and PostgreSQL store.
- **Password Security**: Bcrypt hashing.
- **Real-time Communication**: Socket.IO for live updates (elections, monitoring).
- **API Design**: RESTful endpoints, consistent `{ success: boolean, data: any }` response structure.
- **File Upload**: Multer for incident report attachments.

### Data Layer
- **Database**: PostgreSQL via Neon serverless driver.
- **ORM**: Drizzle ORM for type-safe operations.
- **Database Schema**: Hierarchical administrative structure (states, LGAs, wards), users/members (NIN verification), elections (voting, blockchain audit), engagement (gamification, tasks), content (news, events), governance (dues, incident reports).
- **Migrations**: Drizzle Kit.

#### Administrative Boundaries Data
The platform uses Nigeria's administrative structure (states, LGAs, wards) for member registration, event organization, and election management.

**Data Source**: `attached_assets/nga_admin_boundaries_1762975238593.xlsx`
- **States**: 38 entries (all 36 states + FCT)
- **LGAs**: 775 Local Government Areas
- **Wards**: 715 wards (administrative capitals and major wards only)

**Important Note**: The ward data represents a curated subset of administrative capitals and major wards, not Nigeria's full ~8,809 ward list. This subset is sufficient for administrative operations while keeping the database manageable.

**Seeding Script**: `server/seed-admin-boundaries.ts`
- Uses transaction wrapping for atomicity (all-or-nothing)
- Configurable file path via parameter or `ADMIN_BOUNDARIES_FILE` environment variable
- Validates Excel structure and data counts before seeding
- Automatically generates unique codes for states, LGAs, and wards
- Skips existing entries to support incremental updates

**Production Deployment**: Set `ADMIN_BOUNDARIES_FILE` environment variable to the Excel file path in production environments.

### Security & Data Privacy
- **Anonymous Reporting**: Supports anonymous incident submissions.
- **NIN Verification**: Integration framework for National Identification Number verification.
- **Role-Based Access**: Three-tier permission system (member, coordinator, admin).
- **Security Headers**: Helmet.js for CSP, XSS, HSTS.
- **Rate Limiting**: `express-rate-limit` for API and authentication endpoints.

### Performance Optimizations
- **Code Splitting**: Vite handles automatic code splitting.
- **Query Optimization**: React Query configured for low-bandwidth environments.
- **Bundle Optimization**: Shared schema, ESBuild for server-side bundling.
- **Caching Strategy**: Service worker with network-first for dynamic, cache-first for static assets.

### Features
- **Search System**: Multi-category full-text search across various content types.
- **Data Export (Admin)**: CSV export for members, votes, donations.
- **Communication Frameworks**:
    - **Email Notifications**: `EmailService` class with templating for welcome, event, election notifications.
    - **SMS Notifications**: `SMSService` class for Nigerian numbers, optimized messages for reminders, OTPs.
    - **Push Notifications**: `PushService` for broadcast, segment, and individual targeting with multiple templates.
- **Automation & Scheduling**: `CronService` for scheduled jobs (event/dues reminders, membership renewals, election notices, inactive member cleanup, analytics aggregation), supporting Nigerian timezone (Africa/Lagos).
- **Membership Dues System**: Recurring membership dues with Paystack integration, status tracking, and admin management for bulk operations and overdue checks.

## External Dependencies
- **Payment Processing**: Paystack for membership dues and donations.
- **Geolocation**: Mapbox (planned) for event navigation and ward assignment.
- **Blockchain**: For election vote audit trails (planned).
- **Google Fonts**: Inter, Plus Jakarta Sans, JetBrains Mono (via CDN).
- **Development Tools**: Replit-specific plugins, TypeScript, PostCSS with Tailwind and Autoprefixer.