// Single entry point the routes use to read tracking data. It prefers live
// Firestore data and transparently falls back to local mock data when no
// Firebase project is configured, so the same API routes work either way.
const { initFirebase, isFirebaseConnected } = require('../config/firebase');
const mock = require('../data/mockData');
const { summarizeLogs } = require('../utils/aggregate');

const db = initFirebase();

function toIso(value) {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  return value;
}

// Latest known GPS position per field representative, for the live map.
// Expects a Firestore collection `locationPings` with documents shaped like:
// { repId, repName, lat, lng, status: 'active' | 'idle', timestamp }
async function getLiveLocations() {
  if (isFirebaseConnected() && db) {
    const snapshot = await db.collection('locationPings')
      .orderBy('timestamp', 'desc')
      .limit(300)
      .get();

    const latestByRep = new Map();
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (!latestByRep.has(data.repId)) {
        latestByRep.set(data.repId, { id: doc.id, ...data, timestamp: toIso(data.timestamp) });
      }
    });
    return Array.from(latestByRep.values());
  }
  return mock.getLiveLocations();
}

// Daily activity / visit logs, optionally filtered by rep and/or date.
// Expects a Firestore collection `activityLogs` with documents shaped like:
// { repId, repName, clientName, address, lat, lng, activityType,
//   checkInTime, checkOutTime, durationMinutes, verified, notes }
async function getActivityLogs({ repId, date, limit = 50 } = {}) {
  if (isFirebaseConnected() && db) {
    let query = db.collection('activityLogs').orderBy('checkInTime', 'desc');
    if (repId) query = query.where('repId', '==', repId);
    query = query.limit(limit);

    const snapshot = await query.get();
    let logs = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        checkInTime: toIso(data.checkInTime),
        checkOutTime: toIso(data.checkOutTime)
      };
    });

    if (date) logs = logs.filter((l) => (l.checkInTime || '').slice(0, 10) === date);
    return logs;
  }
  return mock.getActivityLogs({ repId, date, limit });
}

// Team roster, used to populate the "Representative" filter on Activity Logs.
// Expects a `reps` collection; falls back to deriving unique reps from recent
// activity logs if that collection doesn't exist yet.
async function getReps() {
  if (isFirebaseConnected() && db) {
    const snapshot = await db.collection('reps').get();
    if (!snapshot.empty) {
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    }
    const logs = await getActivityLogs({ limit: 200 });
    const unique = new Map();
    logs.forEach((l) => unique.set(l.repId, { id: l.repId, name: l.repName }));
    return Array.from(unique.values());
  }
  return mock.getReps();
}

// Aggregated numbers for the Team Metrics charts. Pulls a bounded recent
// window of logs and aggregates in-process — enough for a team-sized roster
// without needing a separate rollup/analytics pipeline.
async function getMetricsSummary() {
  if (isFirebaseConnected() && db) {
    const snapshot = await db.collection('activityLogs')
      .orderBy('checkInTime', 'desc')
      .limit(500)
      .get();

    const logs = snapshot.docs.map((doc) => {
      const data = doc.data();
      return { ...data, checkInTime: toIso(data.checkInTime) };
    });
    return summarizeLogs(logs);
  }
  return summarizeLogs(mock.getAllLogs());
}

module.exports = { getLiveLocations, getActivityLogs, getReps, getMetricsSummary };
