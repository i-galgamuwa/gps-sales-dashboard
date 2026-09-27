# TrackPoint — GPS Sales & Marketing Tracking Dashboard

A foundational codebase for a centralized management dashboard that lets managers
see field representatives' live GPS positions, review daily activity logs, and
track team-wide efficiency metrics.

## Tech stack

| Layer          | Choice                                              |
|----------------|------------------------------------------------------|
| Server         | Node.js + Express                                    |
| Templating     | EJS                                                   |
| Database       | Firebase Admin SDK → Cloud Firestore (mock-data fallback included) |
| Styling        | Tailwind CSS (CDN build)                              |
| Map            | Leaflet.js + OpenStreetMap tiles                      |
| Charts         | Chart.js                                              |
| Auth           | express-session + bcrypt (dashboard login), Firebase Admin verifies data server-side |

## Project structure

```
gps-sales-dashboard/
├── server.js                 # Express app entry point
├── config/firebase.js        # Firebase Admin SDK init (falls back to mock data)
├── services/trackingService.js  # Single data-access layer used by all routes
├── data/mockData.js          # Realistic sample data for local development
├── utils/aggregate.js        # Shared metrics aggregation logic
├── middleware/auth.js        # Session guards for pages and API routes
├── routes/
│   ├── pages.js              # /login, /dashboard, /activity-logs, /team-metrics
│   └── api.js                # /api/locations/live, /api/logs, /api/reps, /api/metrics/summary
├── views/                    # EJS templates (login, dashboard, activity-logs, team-metrics)
│   └── partials/             # head, sidebar, topbar — shared across all pages
└── public/
    ├── css/style.css
    └── js/                   # live-map.js, activity-logs.js, team-metrics.js
```

## Getting started

```bash
npm install
cp .env.example .env
npm run dev        # nodemon, auto-restarts on changes
# or
npm start
```

Visit `http://localhost:3000` and sign in with the demo credentials printed on
the login page (`admin` / `admin123` by default — see **Authentication** below).

### Runs without Firebase out of the box

If no Firebase credentials are set, `config/firebase.js` logs a warning and the
app automatically serves realistic **mock data** (Colombo-area sample reps,
visits, and live pings) from `data/mockData.js`, so you can explore the full UI
immediately. Once you add Firebase credentials, the exact same routes switch to
live Firestore data with no code changes on the frontend.

## Connecting a real Firebase project

1. In the [Firebase console](https://console.firebase.google.com), create a
   project and enable **Cloud Firestore**.
2. Under **Project settings → Service accounts**, generate a new private key
   (downloads a JSON file). **Never commit this file or expose it client-side**
   — it only ever lives on the server, loaded via `firebase-admin`.
3. Set either:
   - `FIREBASE_SERVICE_ACCOUNT_JSON` — the whole JSON file content as one line, or
   - `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` individually
     (useful on hosts like Render/Heroku where multi-line secrets are awkward).
4. Create these Firestore collections (matching what the mobile app should write):

   **`locationPings`** — one document per GPS ping
   ```
   { repId, repName, lat, lng, status: "active" | "idle", timestamp }
   ```

   **`activityLogs`** — one document per visit/check-in
   ```
   { repId, repName, clientName, address, lat, lng, activityType,
     checkInTime, checkOutTime, durationMinutes, verified, notes }
   ```

   **`reps`** *(optional)* — team roster; if omitted, the app derives the
   rep list from recent `activityLogs` instead.

5. Restart the server — `services/trackingService.js` detects the connection
   and reads from Firestore automatically.

## Authentication

Two separate concerns, intentionally kept apart:

- **Dashboard login** (this codebase): a single admin/manager account guarded
  by `express-session` + bcrypt, defined via `ADMIN_USERNAME` and
  `ADMIN_PASSWORD_HASH`. Generate a hash with:
  ```bash
  node -e "console.log(require('bcryptjs').hashSync('yourpassword', 10))"
  ```
  For local dev only, an `ADMIN_PASSWORD` plaintext fallback is used if no hash
  is set — replace this before deploying.
- **Field-rep data** is read using the Firebase Admin SDK's service-account
  credentials, which bypass Firestore security rules entirely on the server —
  the browser never receives Firebase credentials.

## API reference

All routes below require an authenticated dashboard session (`401` otherwise).

| Method | Route                    | Description                                   |
|--------|---------------------------|------------------------------------------------|
| GET    | `/api/locations/live`     | Latest known GPS position per representative    |
| GET    | `/api/logs`                | Activity logs. Query: `repId`, `date` (YYYY-MM-DD), `limit` |
| GET    | `/api/reps`                | Team roster for filter dropdowns                |
| GET    | `/api/metrics/summary`     | Aggregated totals, verified rate, per-rep and 7-day trend data |

## Security notes & suggested next steps

This is a **foundational** codebase — solid defaults, but review before
production:

- `helmet` is enabled with `contentSecurityPolicy: false` because this starter
  loads Tailwind/Leaflet/Chart.js/fonts from public CDNs. Once you self-host or
  bundle those assets, turn on a strict CSP.
- The login route is rate-limited (`express-rate-limit`); consider extending
  rate limiting to the `/api/*` routes too if the dashboard is internet-facing.
- `getActivityLogs`/`getMetricsSummary` read a bounded recent window (300–500
  docs) and aggregate in memory — fine for a team-sized roster. For larger
  fleets, add Firestore composite indexes for date-range queries, or a
  scheduled rollup (e.g. Cloud Functions) for `/api/metrics/summary`.
- "Load more" on Activity Logs widens the query `limit` rather than using
  cursor-based pagination — swap in `startAfter()` cursors if log volume grows.
- If the mobile app also needs to *write* pings/logs, add a separate ingestion
  route authenticated with Firebase Auth ID tokens (`admin.auth().verifyIdToken`)
  rather than the session-based auth used here, since field reps and dashboard
  managers are different audiences.
- Set `SESSION_SECRET` to a long random value and run behind HTTPS in production
  (`cookie.secure` is already toggled on via `NODE_ENV=production`).
