feat: complete full-stack REST API frontend — auth, user, mechanic, admin dashboards

════════════════════════════════════════════════════════════════
 YALLA FRONT — Next.js Frontend for REST API Backend
════════════════════════════════════════════════════════════════

## What Was Built

### 1. src/app/auth/page.js — Authentication Page
─────────────────────────────────────────────
- Split layout design: decorative panel on the left + form on the right
- Login: POST /api/auth/login → { username, password }
- Register: POST /api/auth/register → { username, password, fullName, email, role }
- Token refresh: POST /api/auth/refresh → { refreshToken } in request body
- Fetch current user: GET /api/auth/me → Bearer accessToken
- Logout: POST /api/auth/logout
- Automatic redirect based on role after login:
    user      → /user
    mechanic  → /mechanics
    admin     → /admin
- Checks localStorage on load → instantly redirects if a valid token exists
- Stores in localStorage: accessToken, refreshToken, userRole, userData
- Role selection (user/mechanic) during registration only — admin cannot be created from the frontend

### 2. src/app/user/page.js — User Dashboard
─────────────────────────────────────────────
- GET  /api/users/profile         → view and edit profile
- PUT  /api/users/profile         → update username, fullName, email, bio, phone
- GET  /api/users/mechanics       → list all mechanics with locations + search
- GET  /api/users/mechanics/:id/reviews → reviews of a specific mechanic + average rating
- POST /api/users/reviews         → submit review (rating 1–5, comment max 1000 chars)
- GET  /api/users/my-reviews      → all reviews created by the current user
- Navigation sidebar with 3 pages: Profile / Mechanics / My Reviews
- Design: teal/indigo palette — project name AutoCare

### 3. src/app/mechanics/page.js — Mechanic Dashboard
─────────────────────────────────────────────────────
- GET  /api/mechanics/profile              → view profile
- PUT  /api/mechanics/profile              → update profile data
- GET  /api/mechanics/location             → current location
- POST /api/mechanics/location-requests    → request new location { businessName, address }
- GET  /api/mechanics/location-requests    → history of all requests with status
- GET  /api/mechanics/notifications        → notifications sorted by newest
- POST /api/mechanics/notifications/read   → mark all as read
- GET  /api/mechanics/reviews              → my reviews + averageRating + totalReviews
- Overview dashboard: 4 statistics + current location + latest 3 reviews
- StatusBadge: pending / approved / rejected
- Navigation sidebar with 5 pages
- Design: amber/orange-red palette — project name MechPanel
- Animated badge for unread notifications

### 4. src/app/admin/page.js — Admin Dashboard
─────────────────────────────────────────────
- GET    /api/admin/profile                          → profile
- PUT    /api/admin/profile                          → update profile
- GET    /api/admin/stats                            → 6 global statistics
- GET    /api/admin/location-requests/pending        → pending requests only
- GET    /api/admin/location-requests                → all requests
- GET    /api/admin/location-requests/:id/verify     → verification via SerpAPI
- POST   /api/admin/location-requests/:id/approve    → approve + select SerpAPI result
- POST   /api/admin/location-requests/:id/reject     → reject + rejection reason
- GET    /api/admin/mechanics                        → all mechanics + locations + pending requests
- DELETE /api/admin/mechanics/:id/location           → delete mechanic location
- DELETE /api/admin/mechanics/:id                    → delete mechanic account
- GET    /api/admin/users                            → list all users
- DELETE /api/admin/users/:id                        → delete user account
- Confirm modal before every delete operation
- Reject modal with textarea for rejection reason
- SerpAPI verification flow: displays 3 results each with a select button
- Design: indigo/violet palette — project name AdminPanel

### 5. createAdmin.js — Admin Creation Script
─────────────────────────────────────────────
- Connects directly to MongoDB
- Checks if admin already exists (prevents duplicates)
- Manually hashes password using bcrypt
- Run once with: node createAdmin.js

════════════════════════════════════════════════════════════════
 Shared Technical Architecture
════════════════════════════════════════════════════════════════

Authentication & Tokens:
  - accessToken   → Authorization: Bearer header for all protected requests
  - refreshToken  → sent in request body for /refresh (no auth header)
  - localStorage  → accessToken, refreshToken, userRole, userData

Standard Backend Response:
  { success: true, data: { ... } }
  { success: false, error: "message" }

Shared Features Across All Dashboards:
  - useCallback fetch helper to prevent stale closures
  - Loading states for every async button
  - Toast notifications (success/error) auto-hide after 3.5 seconds
  - Protection: redirect to /auth if accessToken is missing
  - Fully responsive for mobile

Design:
  - Tajawal font (Arabic) + Sora (brand)
  - RTL layout across all pages
  - Unified dark theme with distinct colors per dashboard
  - Glass morphism cards + backdrop-filter blur
  - CSS animations: fadeUp, blob float, pulse, spin
  - No external UI libraries — pure CSS

════════════════════════════════════════════════════════════════
 Project Structure
════════════════════════════════════════════════════════════════

yalla_front/
├── src/
│   └── app/
│       ├── auth/
│       │   └── page.js        ← login & registration page + routing
│       ├── user/
│       │   └── page.js        ← user dashboard (6 routes)
│       ├── mechanics/
│       │   └── page.js        ← mechanic dashboard (8 routes)
│       ├── admin/
│       │   └── page.js        ← admin dashboard (13 routes)
│       ├── globals.css
│       ├── layout.js
│       └── page.js            ← redirect → /auth
├── createAdmin.js             ← admin creation script (backend folder)
├── package.json
└── next.config.mjs

Backend API Base URLs:
  http://localhost:3001/api/auth
  http://localhost:3001/api/users
  http://localhost:3001/api/mechanics
  http://localhost:3001/api/admin

════════════════════════════════════════════════════════════════
 Total API Routes Covered: 31 routes
════════════════════════════════════════════════════════════════

  auth      →  5 routes  (login, register, refresh, me, logout)
  users     →  6 routes  (profile GET/PUT, mechanics, reviews GET/POST, my-reviews)
  mechanics →  8 routes  (profile GET/PUT, location, location-requests GET/POST, notifications GET/POST, reviews)
  admin     → 13 routes  (profile GET/PUT, stats, location-requests×5, mechanics×3, users×2)
             ─────────
  Total     → 32 routes