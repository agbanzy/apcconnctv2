# APC Connect — Changelog (February 18, 2026)

## Session Summary
Full-stack audit, batch agent management, mobile incident reporting enhancements, and cross-layer data validation fixes across server, web admin, and mobile app.

---

## New Features

### 1. Batch Polling Unit Agent Management
**Files:** `server/routes.ts`, `client/src/pages/admin/agent-management.tsx`, `client/src/App.tsx`, `client/src/components/admin-sidebar.tsx`

- **POST `/api/admin/polling-agents/batch`** — Batch-generate polling agents by State → LGA → Ward filter. Creates full user → member → pollingAgent chain with auto-generated agentCode (APC-XXXXX) and agentPin (6-digit).
- **GET `/api/admin/polling-agents/export`** — CSV export of all agents with full details (name, email, phone, polling unit, ward, LGA, state, agentCode, agentPin, status).
- **POST `/api/admin/polling-agents/import`** — CSV import that creates user/member/agent records from uploaded file.
- New admin page at `/admin/agent-management` with cascading State → LGA → Ward dropdowns, stats cards, agent list table, and CSV import/export UI.
- "Agent Management" added to admin sidebar navigation with `UserCheck` icon.

### 2. Party & Candidate CRUD (Admin)
**File:** `server/routes.ts`

- **PATCH `/api/parties/:id`** — Update party name, abbreviation, logoUrl, description.
- **DELETE `/api/parties/:id`** — Delete party with FK constraint protection (prevents deletion if candidates reference it).
- **PATCH `/api/general-elections/:id/candidates/:candidateId`** — Update candidate details.
- **DELETE `/api/general-elections/:id/candidates/:candidateId`** — Remove candidate from election.

### 3. Mobile Incident Image Upload & GPS Tagging
**File:** `mobile/app/election-day.tsx`

- Incident reporting now supports up to 5 image attachments via camera or gallery (using `expo-image-picker`).
- GPS location tagging via `expo-location` with high-accuracy coordinates.
- Image preview grid with individual remove buttons.
- FormData multipart upload via `api.upload()` method.
- Server endpoint updated to handle `upload.array("images", 5)` middleware and save to `incidentMedia` table.

---

## Critical Bug Fixes (Data Audit)

### 4. Elections Admin Page — Wrong Table Mapping (REVERTED)
**File:** `client/src/pages/admin/elections.tsx`

**Problem:** Admin elections interface was incorrectly mapped to `generalElections` table fields (electionYear, electionDate, totalVotesCast, cancelled status).
**Fix:** Reverted to correctly match `elections` (party primaries) table — uses `startDate`, `endDate`, `totalVotes`, status enum `upcoming/ongoing/completed` (no `cancelled`).

### 5. Incidents Schema Mismatch — Non-Existent Fields
**Files:** `server/routes.ts`, `client/src/pages/admin/incidents.tsx`

**Problem:** `POST /api/incidents` sent `title` and `pollingUnit` fields that don't exist in the incidents table. `PATCH /api/incidents` validated `title`, `type`, `resolution` — also non-existent.
**Fix:** Removed all references to non-existent columns. POST now uses correct field names (`pollingUnitId`, `description`, `severity`, `location`, `coordinates`). PATCH schema reduced to valid fields only.

### 6. Admin Incidents Interface — Field Mismatch
**File:** `client/src/pages/admin/incidents.tsx`

**Problem:** Interface referenced `title`, `stateId`, `assignedTo`, `resolution` columns that don't exist in incidents table.
**Fix:** Rebuilt interface to match actual schema — shows `pollingUnitId`, `reporterId`, `coordinates`, nested `pollingUnit`, `reporter`, `media` relations. Updated status enum from `pending/investigating/resolved/closed` to `reported/investigating/resolved`.

### 7. Batch Agent SQL — Missing ward_id Column
**File:** `server/routes.ts`

**Problem:** SELECT query didn't include `pu.ward_id` but code used `unit.ward_id` for member creation.
**Fix:** Added `pu.ward_id` to SELECT clause. Removed unnecessary ward lookup query.

### 8. Paystack Email — Empty String
**Files:** `mobile/app/donations.tsx`, `mobile/app/dues.tsx`

**Problem:** `email={''}` meant Paystack would reject all payments.
**Fix:** Added user profile query, passes actual user email to Paystack component.

### 9. Profile Mutations — Silent Failures
**File:** `mobile/app/(tabs)/profile.tsx`

**Problem:** `updateProfileMutation` and `verifyNinMutation` didn't check `response.success`, swallowing API errors.
**Fix:** Added `if (!response.success) throw new Error(response.error || 'Operation failed')`.

### 10. storage.listIncidents() — Missing Media Relation
**File:** `server/storage.ts`

**Problem:** `with:` clause didn't include `media: true`, so admin incidents page couldn't display attached photos.
**Fix:** Added `media: true` to the Drizzle relation include.

---

## Mobile Dependencies Added
**File:** `mobile/package.json`

- `expo-location: ~18.0.0` — GPS coordinate tagging for incidents
- `expo-notifications: ~0.29.0` — Push notification support
- `expo-device: ~7.0.0` — Device info for push tokens
- `@react-native-community/netinfo: 11.4.1` — Network connectivity detection

---

## Architecture Notes

### Two Election Systems
- **`elections` table** — Party primaries (startDate, endDate, totalVotes, status: upcoming/ongoing/completed)
- **`generalElections` table** — National elections (electionYear, electionDate, totalVotesCast, status: +cancelled)
- Admin `/api/admin/elections` → queries `elections` (party primaries)

### Agent Authentication (Separate from User Auth)
- Agents use `agentCode + agentPin` from `pollingAgents` table (stateless per-request)
- Users use `email + password` via Passport.js sessions (web) or JWT (mobile)

### Agent Creation Chain
- `pollingAgents.memberId` → `members.userId` → `users.id` (all NOT NULL FKs)
- Batch creation must create: user → member → pollingAgent records in sequence

---

## Files Modified (11 files, ~750 lines added)

| File | Changes |
|------|---------|
| `server/routes.ts` | +481 lines — batch agent endpoints, party/candidate CRUD, incident image upload, fixed POST/PATCH incidents |
| `server/storage.ts` | +3 lines — added media relation to listIncidents |
| `client/src/App.tsx` | +2 lines — AdminAgentManagement lazy import and route |
| `client/src/components/admin-sidebar.tsx` | +6 lines — Agent Management nav item |
| `client/src/pages/admin/elections.tsx` | ~66 lines changed — reverted to match elections table |
| `client/src/pages/admin/incidents.tsx` | ~178 lines changed — rebuilt to match incidents schema |
| `client/src/pages/admin/agent-management.tsx` | NEW — full admin agent management page |
| `mobile/app/election-day.tsx` | +162 lines — image upload, GPS tagging, FormData |
| `mobile/app/donations.tsx` | +11 lines — Paystack email fix |
| `mobile/app/dues.tsx` | +11 lines — Paystack email fix |
| `mobile/app/(tabs)/profile.tsx` | +2 lines — response.success checks |
| `mobile/package.json` | +4 deps — expo-location, notifications, device, netinfo |
