# APC Connect

## Overview
APC Connect is a comprehensive political engagement platform for the All Progressives Congress (APC) in Nigeria. It is a mobile-first web application designed to modernize party operations, offering membership management, electronic primaries, youth engagement, and real-time election monitoring. The platform aims to facilitate democratic participation through features like NIN-verified registration, blockchain-based voting, gamified political education, and transparent dues tracking. It emphasizes accessibility with offline functionality, low-bandwidth optimization, and PWA capabilities, bridging the gap between leadership and grassroots members. The project's ambition is to enhance democratic participation and modernize party operations across Nigeria.

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
- **Multi-Language Support**: Translation system supporting English, Igbo, Hausa, and Yoruba with localStorage persistence, SSR-safe implementation, and fallback handling.

### Backend
- **Runtime & Framework**: Node.js with Express.js (TypeScript).
- **Authentication**: Passport.js (Local Strategy), server-side sessions with `express-session` and PostgreSQL store.
- **Password Security**: Bcrypt hashing.
- **Real-time Communication**: Socket.IO for live updates (elections, monitoring).
- **API Design**: RESTful endpoints, consistent `{ success: boolean, data: any }` response structure.
- **File Upload**: Multer for incident report attachments.
- **Admin User & Account Management**: Comprehensive system for managing member accounts including suspension, activation, deletion, restoration, session revocation, status history tracking, member notes, password resets, and bulk operations. All status changes are logged and require a reason for audit compliance.

### Data Layer
- **Database**: PostgreSQL via Neon serverless driver.
- **ORM**: Drizzle ORM for type-safe operations.
- **Database Schema**: Hierarchical administrative structure (states, LGAs, wards), users/members (NIN verification), elections (voting, blockchain audit), engagement (gamification, tasks), content (news, events), governance (dues, incident reports).
- **Migrations**: Drizzle Kit.
- **Administrative Boundaries Data**: Utilizes Nigeria's administrative structure (states, LGAs, wards) sourced from `attached_assets/nga_admin_boundaries_1762975238593.xlsx`. A seeding script (`server/seed-admin-boundaries.ts`) handles atomic data insertion and unique code generation.

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
- **Communication Frameworks**: Email, SMS, and Push Notifications with templating and scheduling.
- **Automation & Scheduling**: `CronService` for scheduled jobs (reminders, renewals, cleanup) with Nigerian timezone support.
- **Membership Dues System**: Recurring membership dues with payment integration, status tracking, and admin management.
- **Interactive Map**: Displays real-time, state-level analytics for members, events, and campaigns.
- **Custom Point Purchases**: Flexible system allowing users to buy custom amounts of points with configurable exchange rates.
- **Task Approval System**: Workflow for image-based micro-tasks requiring admin approval, with proof image uploads and status tracking.
- **Multi-Language Translation**: Comprehensive translation infrastructure supporting English, Igbo (ig), Hausa (ha), and Yoruba (yo) via `useLanguage()` hook. Translation keys defined in `client/src/lib/translations.ts`, language selector in app header with localStorage persistence.

## External Dependencies
- **Payment Processing**: Flutterwave for membership dues, point purchases, donations, airtime/data redemption, and bank transfers for cash withdrawals.
- **Geolocation**: Mapbox (planned) for event navigation and ward assignment.
- **Blockchain**: For election vote audit trails (planned).
- **Google Fonts**: Inter, Plus Jakarta Sans, JetBrains Mono (via CDN).