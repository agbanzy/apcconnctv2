# 🔌 APC Connect - Mobile API Reference

Complete API documentation for mobile app integration using JWT authentication.

## 🔐 Authentication

All mobile endpoints use JWT Bearer token authentication.

### Login

**Endpoint:** `POST /api/auth/mobile/login`

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "phone": "+234...",
      "role": "member"
    },
    "member": {
      "id": "uuid",
      "memberId": "APC-2024-NG-12345",
      "referralCode": "ABC123XYZ",
      "status": "active",
      "wardId": "uuid"
    }
  }
}
```

**Error Response (401):**
```json
{
  "success": false,
  "error": "Invalid email or password"
}
```

### Refresh Token

**Endpoint:** `POST /api/auth/mobile/refresh`

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Response (401):**
```json
{
  "success": false,
  "error": "Invalid or expired refresh token"
}
```

### Logout

**Endpoint:** `POST /api/auth/mobile/logout`

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

## 👤 User & Member

### Get Current User

**Endpoint:** `GET /api/auth/me`

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "phone": "+234...",
      "role": "member"
    }
  }
}
```

### Get Current Member Profile

**Endpoint:** `GET /api/members/me`

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "memberId": "APC-2024-NG-12345",
    "referralCode": "ABC123XYZ",
    "status": "active",
    "ninVerified": true,
    "ward": {
      "id": "uuid",
      "name": "Ward 1",
      "lga": {
        "id": "uuid",
        "name": "Ikeja",
        "state": {
          "id": "uuid",
          "name": "Lagos",
          "code": "LAG"
        }
      }
    }
  }
}
```

### Get Member Points

**Endpoint:** `GET /api/members/points`

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "totalPoints": "1750"
  }
}
```

## 📅 Events

### Get All Events

**Endpoint:** `GET /api/events`

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Query Parameters:**
- `status` (optional): Filter by status (upcoming, ongoing, completed)

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Town Hall Meeting",
      "description": "Community engagement session",
      "location": "Lagos State Secretariat",
      "startDate": "2024-11-15T10:00:00Z",
      "endDate": "2024-11-15T14:00:00Z",
      "capacity": 500,
      "currentAttendees": 234,
      "status": "upcoming"
    }
  ]
}
```

### RSVP to Event

**Endpoint:** `POST /api/events/:id/rsvp`

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "RSVP confirmed"
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "Event is at full capacity"
}
```

### Cancel RSVP

**Endpoint:** `DELETE /api/events/:id/rsvp`

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "RSVP cancelled"
}
```

## 🗳️ Elections

### Get All Elections

**Endpoint:** `GET /api/elections`

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Query Parameters:**
- `status` (optional): Filter by status (upcoming, ongoing, completed)

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "State Chairman Election",
      "position": "State Chairman",
      "status": "ongoing",
      "startDate": "2024-11-01T00:00:00Z",
      "endDate": "2024-11-07T23:59:59Z",
      "totalVotes": 15420,
      "candidates": [
        {
          "id": "uuid",
          "name": "John Doe",
          "manifesto": "Development agenda...",
          "votes": 8542
        }
      ]
    }
  ]
}
```

### Vote in Election

**Endpoint:** `POST /api/elections/:electionId/vote`

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request:**
```json
{
  "candidateId": "uuid"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Vote recorded successfully"
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "You have already voted in this election"
}
```

## 📰 News

### Get All News Posts

**Endpoint:** `GET /api/news`

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Query Parameters:**
- `limit` (optional): Number of posts to return (default: 20)
- `offset` (optional): Pagination offset

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "APC Launches New Initiative",
      "content": "Full article content...",
      "excerpt": "Brief summary...",
      "imageUrl": "https://...",
      "publishedAt": "2024-10-20T10:00:00Z",
      "likes": 542,
      "comments": 89
    }
  ]
}
```

### Like News Post

**Endpoint:** `POST /api/news/:id/like`

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Post liked"
}
```

### Get News Comments

**Endpoint:** `GET /api/news/:id/comments`

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "content": "Great initiative!",
      "likes": 12,
      "createdAt": "2024-10-20T11:30:00Z",
      "user": {
        "firstName": "Jane",
        "lastName": "Smith"
      }
    }
  ]
}
```

## 🚨 Incident Reporting

### Create Incident Report

**Endpoint:** `POST /api/incidents`

**Headers:**
```
Authorization: Bearer <accessToken>
Content-Type: multipart/form-data
```

**Request (FormData):**
```
title: "Voter Intimidation"
description: "Details of the incident..."
severity: "high"
location: "Polling Unit 01"
pollingUnitId: "uuid"
reporterName: "Anonymous" (optional)
reporterPhone: "+234..." (optional)
images: [File, File] (optional)
```

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Voter Intimidation",
    "description": "Details...",
    "severity": "high",
    "status": "pending",
    "createdAt": "2024-10-23T12:00:00Z"
  }
}
```

### Get My Incidents

**Endpoint:** `GET /api/incidents/my-reports`

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Incident Title",
      "severity": "medium",
      "status": "investigating",
      "createdAt": "2024-10-23T10:00:00Z"
    }
  ]
}
```

## 🎯 Tasks & Gamification

### Get Available Tasks

**Endpoint:** `GET /api/micro-tasks`

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Share Party News",
      "description": "Share latest party updates on social media",
      "points": 50,
      "difficulty": "Easy",
      "timeEstimate": "5 minutes"
    }
  ]
}
```

### Complete Task

**Endpoint:** `POST /api/micro-tasks/:id/complete`

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request:**
```json
{
  "proof": "Link to social media post or screenshot URL"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "pointsEarned": 50,
    "totalPoints": 1800
  }
}
```

### Get My Badges

**Endpoint:** `GET /api/gamification/badges`

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Event Champion",
      "description": "Attended 10+ events",
      "iconUrl": "https://...",
      "rarity": "silver",
      "earnedAt": "2024-10-15T14:30:00Z"
    }
  ]
}
```

## 💰 Donations

### Get Donation Campaigns

**Endpoint:** `GET /api/donation-campaigns`

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Infrastructure Development Fund",
      "description": "Support party infrastructure...",
      "goalAmount": "10000000.00",
      "currentAmount": "6540000.00",
      "status": "active",
      "endDate": "2024-12-31T23:59:59Z"
    }
  ]
}
```

### Make Donation

**Endpoint:** `POST /api/donations/initialize`

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request:**
```json
{
  "amount": "5000",
  "category": "general",
  "donationCampaignId": "uuid",
  "anonymous": false
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "authorizationUrl": "https://paystack.com/pay/...",
    "reference": "PSK_..."
  }
}
```

### Verify Donation

**Endpoint:** `GET /api/donations/verify/:reference`

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "status": "completed",
    "amount": "5000.00",
    "receiptUrl": "https://..."
  }
}
```

## 📍 Locations

### Get All States

**Endpoint:** `GET /api/locations/states`

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Lagos",
      "code": "LAG"
    }
  ]
}
```

### Get LGAs in State

**Endpoint:** `GET /api/locations/states/:stateId/lgas`

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Ikeja",
      "code": "IKJ",
      "stateId": "uuid"
    }
  ]
}
```

### Get Wards in LGA

**Endpoint:** `GET /api/locations/lgas/:lgaId/wards`

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Ward 1",
      "code": "IKJ-W01",
      "lgaId": "uuid"
    }
  ]
}
```

## 📊 Analytics

### Get Public Overview

**Endpoint:** `GET /api/analytics/public-overview`

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "totalMembers": 125420,
    "activeMembers": 98234,
    "totalEvents": 345,
    "totalVotes": 542100
  }
}
```

## ⚙️ Error Responses

All endpoints follow consistent error format:

### 400 Bad Request
```json
{
  "success": false,
  "error": "Invalid request data",
  "details": {
    "field": "email",
    "message": "Invalid email format"
  }
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": "Unauthorized"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "error": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Resource not found"
}
```

### 429 Too Many Requests
```json
{
  "success": false,
  "error": "Rate limit exceeded. Try again later."
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "An unexpected error occurred"
}
```

## 📝 Request Guidelines

### Headers

All authenticated requests must include:
```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

### Token Expiry

- **Access Token:** 15 minutes
- **Refresh Token:** 7 days

When access token expires (401 response), use refresh endpoint to get new tokens.

### Rate Limiting

- **Standard endpoints:** 100 requests/minute
- **Auth endpoints:** 10 requests/minute
- **Upload endpoints:** 20 requests/minute

### File Uploads

For endpoints accepting files (e.g., incident reports):

```
Content-Type: multipart/form-data
```

Maximum file size: 10MB per file
Accepted formats: JPEG, PNG, PDF

### Pagination

Endpoints supporting pagination use:
- `limit`: Number of items (default: 20, max: 100)
- `offset`: Starting position (default: 0)

Example:
```
GET /api/news?limit=10&offset=20
```

Response includes:
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "total": 156,
    "limit": 10,
    "offset": 20,
    "hasMore": true
  }
}
```

## 🔄 Versioning

Current API version: **v1**

Future versions will be accessible via:
```
/api/v2/...
```

## 🛡️ Security

### Best Practices

1. **Never store tokens in plain text**
   - Use expo-secure-store or equivalent

2. **Implement token refresh logic**
   - Automatically refresh when access token expires

3. **Handle 401 responses**
   - Clear tokens and redirect to login

4. **Validate all user input**
   - Client-side and server-side validation

5. **Use HTTPS only**
   - Never make requests over HTTP

### CORS

Mobile apps bypass CORS restrictions. Web apps must use the same domain or configure CORS headers.

---

**Base URL:** `https://your-replit-app.replit.dev`

**Support:** Check backend `server/routes.ts` for additional endpoints not documented here.
