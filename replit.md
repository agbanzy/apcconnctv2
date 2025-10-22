# APC Connect

## Overview
APC Connect is a comprehensive political engagement platform for the All Progressives Congress (APC) in Nigeria. It's a mobile-first web application designed to modernize party operations, offering membership management, electronic primaries, youth engagement, and real-time election monitoring. The platform aims to facilitate democratic participation through features like NIN-verified registration, blockchain-based voting, gamified political education, and transparent dues tracking. It emphasizes accessibility with offline functionality, low-bandwidth optimization, and PWA capabilities, bridging the gap between leadership and grassroots members.

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