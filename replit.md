# APC Connect

## Overview

APC Connect is a comprehensive political engagement platform designed to modernize the All Progressives Congress (APC) operations in Nigeria. The platform serves as a mobile-first web application that enables membership management, electronic primaries, youth engagement, and real-time election monitoring. Built with a focus on accessibility for Nigeria's youth, the system supports offline functionality, low-bandwidth optimization, and progressive web app (PWA) capabilities.

The application facilitates democratic participation through features like NIN-verified membership registration, secure blockchain-based voting, gamified political education, volunteer task management, and transparent dues payment tracking. It bridges the gap between party leadership and grassroots members while promoting inclusive governance and civic engagement.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack**: React with TypeScript, using Vite as the build tool and bundler for optimal performance and fast development experience.

**UI Framework**: Shadcn UI components built on Radix UI primitives, styled with Tailwind CSS for a consistent, accessible design system. The design follows Material Design principles adapted with APC brand identity, optimized for low-bandwidth environments.

**State Management**: TanStack Query (React Query) for server state management, providing automatic caching, background refetching, and optimistic updates. Local state managed through React hooks.

**Routing**: Wouter for lightweight client-side routing with minimal bundle size impact.

**PWA Implementation**: Service worker-based offline functionality with manifest configuration for installable app experience. Implements network-first strategy for API calls and cache-first for static assets.

**Theme System**: Custom dark/light mode implementation with HSL-based color system, supporting APC brand colors (Green: 142 65% 35%, Red: 355 75% 48%, Blue: 215 70% 45%) with automatic contrast adjustments.

### Backend Architecture

**Runtime & Framework**: Node.js with Express.js for the REST API server. TypeScript throughout for type safety.

**Authentication**: Passport.js with Local Strategy for email/password authentication. Session management using express-session with PostgreSQL session store (connect-pg-simple) for persistent sessions.

**Session Strategy**: Server-side sessions stored in PostgreSQL, with 30-day cookie expiration. Sessions survive server restarts and enable secure authentication without JWT complexity.

**Password Security**: Bcrypt for password hashing with salt rounds, ensuring secure credential storage.

**Real-time Communication**: Socket.IO integration for live updates during elections and situation room monitoring. Enables real-time vote counting, incident reporting, and polling unit status updates.

**API Design**: RESTful endpoints organized by domain (auth, members, elections, events, news, etc.). Consistent response format with `{ success: boolean, data: any }` structure.

**File Upload**: Multer middleware for handling incident reports with photo/video evidence, limited to 10MB per file with memory storage.

### Data Layer

**Database**: PostgreSQL via Neon serverless driver, providing scalable cloud database with WebSocket support for serverless environments.

**ORM**: Drizzle ORM for type-safe database operations with zero-cost abstractions. Schema defined in TypeScript with automatic type inference.

**Database Schema Design**:
- **Administrative Structure**: Hierarchical tables (states → lgas → wards) representing Nigerian geographic organization
- **User & Membership**: Separate users and members tables with ward/LGA/state associations, NIN verification support
- **Elections**: Complex voting system with elections, candidates, votes, and results tracking with blockchain audit trails
- **Engagement**: Gamification points, badges, quizzes, micro-tasks, and volunteer tasks
- **Content**: News posts, events, issue campaigns with social features (likes, comments, RSVPs)
- **Governance**: Membership dues tracking, incident reports, polling unit monitoring

**Migration Strategy**: Drizzle Kit for schema migrations with version control, using `drizzle-kit push` for development and controlled migrations for production.

### External Dependencies

**Payment Processing**: Paystack integration for membership dues collection and donations. Creates payment sessions with webhook support for payment confirmation. Optimized for Nigerian payment methods.

**Geolocation**: Planned integration with Mapbox for event navigation and location-based ward assignment.

**Blockchain**: Planned integration for election vote audit trails and tamper-proof voting records.

**Payment Gateway**: Fully integrated Paystack for Nigerian-specific payment processing (membership dues, donations, recurring payments).

**Google Fonts**: Inter (UI/body text), Plus Jakarta Sans (display/headlines), JetBrains Mono (technical data/IDs) loaded via CDN.

**Image Assets**: Static assets stored in `attached_assets` directory, served through Vite's asset handling with hash-based cache busting.

**Development Tools**: 
- Replit-specific plugins for runtime error overlay, cartographer, and dev banner
- TypeScript compiler with strict mode and path aliases (@/, @shared/, @assets/)
- PostCSS with Tailwind and Autoprefixer for CSS processing

### Security & Data Privacy

**Anonymous Reporting**: Incident reports during elections support anonymous submission while maintaining data integrity.

**NIN Verification**: Membership registration designed to integrate with National Identification Number verification (backend logic pending).

**Role-Based Access**: Three-tier permission system (member, coordinator, admin) with route-level protection and conditional data access.

**CORS & Credentials**: Socket.IO configured with CORS allowing all origins for development, credentials included in all API requests for session persistence.

### Performance Optimizations

**Code Splitting**: Vite handles automatic code splitting by route and dynamic imports.

**Query Optimization**: React Query configured with infinite stale time and disabled refetch on window focus to minimize unnecessary network requests in low-bandwidth scenarios.

**Bundle Optimization**: Shared schema between client and server eliminates type duplication. ESBuild for server-side bundling with external packages.

**Caching Strategy**: Service worker implements network-first for dynamic content, cache-first for static assets with versioned cache names for clean updates.
## Recent Updates (October 17, 2025)

### Navigation & Branding Enhancement
- **Domain Integration**: Updated all branding references to display official domain (apcng.org) across AppSidebar and AdminSidebar
- **Navigation Reorganization**: Restructured main sidebar into 6 logical categories for improved user experience:
  - **Main**: Core features (Dashboard, Profile, News)
  - **Engagement**: Gamification features (Tasks & Jobs, Rewards & Badges, Leaderboard, Invite & Earn)
  - **Political Action**: Democratic participation (Elections & Voting, Campaigns, Volunteer Tasks)
  - **Community**: Social features (Events, Ideas Hub, Donations, Dues Payment)
  - **Learn**: Educational content (Political Literacy, Knowledge Base, About APC)
  - **Monitoring**: Real-time tracking (Situation Room, Events Gallery, Leadership)
- **Footer Updates**: Added clickable apcng.org links in both user and admin sidebars with updated copyright

### Referral System Foundation
- **Database Schema**: Added referral tracking fields to members table (referral_code, referred_by)
- **Referrals Table**: Created new table to track referrals with status and points earned
- **Navigation Entry**: Added "Invite & Earn" menu item under Engagement section
- **Integration Ready**: Schema prepared for points-based referral rewards through existing gamification system
