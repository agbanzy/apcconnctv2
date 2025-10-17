# APC Connect Design Guidelines

## Design Approach
**Hybrid System-Based Approach**: Material Design principles adapted with APC brand identity, incorporating elements from civic tech platforms (GOV.UK clarity) and modern engagement apps (Linear's typography, Instagram's feed design) to balance professional governance with youth appeal.

**Core Principle**: Build trust through clarity and transparency while engaging Nigeria's youth with modern, accessible interfaces optimized for low-bandwidth environments.

---

## Brand Identity & Color System

### APC Party Colors (from logo analysis)
**Primary Colors:**
- APC Green: `142 65% 35%` - Main brand color, primary CTAs, active states
- APC Red: `355 75% 48%` - Accent for alerts, important actions, badges
- APC Blue: `215 70% 45%` - Secondary actions, information, trust signals

**Interface Colors (Dark Mode Primary):**
- Background: `220 15% 12%` - Main app background
- Surface: `220 13% 18%` - Cards, elevated elements
- Surface Elevated: `220 12% 22%` - Modals, dropdowns
- Border: `220 10% 28%` - Dividers, input borders

**Light Mode:**
- Background: `0 0% 98%`
- Surface: `0 0% 100%`
- Border: `220 13% 88%`

**Semantic Colors:**
- Success (Membership Active): `142 60% 40%`
- Warning (Dues Due): `35 92% 55%`
- Error (Voting Issues): `355 75% 48%`
- Info (Notifications): `215 70% 50%`

**Text Hierarchy:**
- Dark Mode: Primary `0 0% 98%`, Secondary `220 9% 75%`, Tertiary `220 9% 60%`
- Light Mode: Primary `220 15% 15%`, Secondary `220 9% 40%`, Tertiary `220 9% 55%`

---

## Typography

**Font Families:**
- Primary: 'Inter' (via Google Fonts) - UI, body text, data displays
- Display: 'Plus Jakarta Sans' (via Google Fonts) - Headlines, hero sections, emphasis
- Monospace: 'JetBrains Mono' - Membership IDs, vote confirmations, technical data

**Type Scale:**
- Hero/H1: text-5xl md:text-6xl, font-bold, tracking-tight
- H2: text-3xl md:text-4xl, font-bold
- H3: text-2xl md:text-3xl, font-semibold
- H4: text-xl font-semibold
- Body: text-base leading-relaxed
- Small: text-sm
- Caption: text-xs text-secondary

**Special Treatments:**
- Political Slogans: Plus Jakarta Sans, font-black, uppercase, tracking-wide
- Vote Counts: Monospace, text-3xl, tabular-nums
- User Stats: Monospace, tabular-nums for alignment

---

## Layout System

**Spacing Primitives**: Use Tailwind units of **2, 4, 6, 8, 12, 16, 20** for consistent rhythm
- Micro spacing: p-2, gap-2 (tight elements)
- Component spacing: p-4, gap-4 (default padding)
- Section spacing: py-12 md:py-16 lg:py-20 (vertical sections)
- Container gaps: gap-6, gap-8 (card grids)

**Container Widths:**
- Max content: max-w-7xl mx-auto px-4 (dashboards, feeds)
- Reading width: max-w-3xl mx-auto (articles, forms)
- Full bleed: w-full (election situation room, maps)

**Grid Systems:**
- Dashboard: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6
- Stats: grid-cols-2 md:grid-cols-4 gap-4
- Feature cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6
- Mobile: Always single column with adequate spacing

---

## Component Library

### Navigation
- **Top Bar**: Fixed header with APC logo, user avatar, notification bell (with badge count), dark/light toggle
- **Bottom Nav (Mobile)**: 5 items - Home, Engage, Vote, Events, Profile - with active state using APC Green
- **Sidebar (Desktop)**: Collapsible left sidebar with icon + label, expandable sections for admin features

### Cards & Containers
- **Standard Card**: bg-surface, rounded-lg, border border-border, p-6
- **Elevated Card**: bg-surface-elevated, rounded-lg, shadow-lg
- **Membership Card**: QR code in corner, holographic gradient overlay (subtle), APC colors in border
- **Stat Card**: Large number (text-4xl monospace), label below, trend indicator (arrow icon)

### Forms & Inputs
- **Input Fields**: Dark mode with bg-surface, border-border, focus:ring-2 ring-apc-green
- **Buttons**: 
  - Primary: bg-apc-green, hover:brightness-110
  - Secondary: border-2 border-apc-green text-apc-green hover:bg-apc-green/10
  - Danger: bg-apc-red
- **Select/Dropdown**: Custom styled with Heroicons chevron, matches input style
- **File Upload**: Drag-and-drop zone with upload icon, preview thumbnails

### Voting Interface
- **Candidate Cards**: Photo, name, manifesto summary, radio button selection
- **Vote Confirm Modal**: Large preview, blockchain verification indicator, final confirm button
- **Results Display**: Horizontal bar charts, percentage labels, vote counts in monospace

### Dashboards
- **KPI Section**: Grid of stat cards at top (membership count, dues collected, active volunteers)
- **Charts**: Use Chart.js with APC color palette, dark mode optimized
- **Tables**: Zebra striping (subtle), sortable headers, pagination at bottom
- **Filters**: Top bar with dropdowns for ward/LGA/state selection

### Gamification Elements
- **Badges**: Circular icons with APC colors, glow effect on hover, stack display (max 5 visible)
- **Leaderboard**: Rank number, avatar, name, points, progress bar
- **Quest Cards**: Task title, reward points, progress indicator, "Complete" button

### Election Features
- **Situation Room**: Real-time map (Mapbox integration), polling unit markers colored by status, side panel with incident feed
- **Incident Report**: Photo/video preview, timestamp, location tag, severity badge
- **Canvassing Tools**: Voter list with checkboxes, notes field, sync status indicator

### Social Features
- **News Feed**: Card-based, image thumbnails, engagement metrics (likes, shares), share button with platform icons
- **Event Card**: Date badge (calendar style), location with map pin icon, RSVP count, "Attend" CTA
- **Comment Section**: Nested replies (max 2 levels), relative timestamps, like counter

---

## Images & Media

### Hero Images
**Homepage Hero**: Large, inspiring image of APC youth rally or leadership - full-width, h-[60vh] md:h-[70vh], overlay gradient (from-black/70 to-transparent) for text readability

**Section Images:**
- Political Literacy Hub: Illustrated graphics of Nigeria map, educational icons
- Volunteer Marketplace: Photos of young volunteers in action, diverse Nigerian youth
- Election Day: Real polling station images (stock or authentic), results dashboard screenshots

**Image Specifications:**
- All images optimized for low bandwidth (WebP format, max 200KB)
- Lazy loading with blur-up placeholders
- Offline fallbacks with illustrative icons

---

## Micro-interactions (Minimal)
- **Button Press**: Scale down slightly (scale-95 on active)
- **Card Hover**: Subtle lift (hover:shadow-xl transition)
- **Notification Badge**: Pulse animation (animate-pulse) for new items
- **Vote Submission**: Success checkmark animation (scale + fade in)
- **Data Sync**: Spinning icon for sync status, green check when complete

**No**: Page transitions, parallax effects, scroll-triggered animations (bandwidth consideration)

---

## Accessibility & Offline Considerations
- Minimum touch target: 44px × 44px for mobile
- Color contrast: WCAG AAA for text, AA for UI elements
- Offline indicators: Toast notification with sync queue count
- Low-data mode: Text-only toggle, image loading control
- Bilingual support: English/Pidgin toggle (use system font stack for Pidgin)

---

## Platform-Specific Patterns

### Mobile (Flutter/PWA)
- Bottom sheet modals for forms
- Swipe gestures for navigation (feed items, event cards)
- Floating Action Button (FAB) for primary actions (Pay Dues, Create Event)
- Pull-to-refresh on feed and dashboard

### Desktop (Next.js)
- Multi-column layouts (3-col dashboard, 2-col forms)
- Keyboard shortcuts (/ for search, n for notifications)
- Hover states for interactive elements
- Expandable sidebar for admin features

### Admin Dashboard
- **Data Density**: Compact table view with filters
- **Color Coding**: Ward/LGA/state by color for quick scanning
- **Export Actions**: CSV download buttons, print-friendly views
- **Real-time Updates**: WebSocket indicator, auto-refresh toggle

---

This design system creates a trustworthy, youth-friendly platform that balances APC's political gravitas with modern engagement patterns, optimized for Nigeria's connectivity challenges.