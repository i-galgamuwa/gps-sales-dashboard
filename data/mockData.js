// Deterministic-ish sample data so the dashboard is demoable without a live
// Firebase project. Coordinates are centered on Colombo, Sri Lanka.
// Swap this out by setting FIREBASE_* credentials in .env — see config/firebase.js
// and services/trackingService.js, which switch automatically once Firebase connects.

const REPS = [
  { id: 'rep_001', name: 'Amara Fernando' },
  { id: 'rep_002', name: 'Nadeem Perera' },
  { id: 'rep_003', name: 'Ishara Silva' },
  { id: 'rep_004', name: 'Ruwan Jayasuriya' },
  { id: 'rep_005', name: 'Tharindu Wickrama' }
];

const AREAS = [
  { name: 'Colombo Fort', lat: 6.9344, lng: 79.8428 },
  { name: 'Bambalapitiya', lat: 6.8905, lng: 79.8565 },
  { name: 'Nugegoda', lat: 6.8649, lng: 79.8997 },
  { name: 'Borella', lat: 6.9147, lng: 79.8779 },
  { name: 'Rajagiriya', lat: 6.9091, lng: 79.8945 },
  { name: 'Dehiwala', lat: 6.8567, lng: 79.8653 },
  { name: 'Maharagama', lat: 6.8481, lng: 79.9265 },
  { name: 'Kotte', lat: 6.8905, lng: 79.9018 }
];

const CLIENTS = [
  'Ceylon Retail Traders', 'Lanka Fresh Mart', 'Horizon Electronics', 'Spice Route Distributors',
  'Harbor View Pharmacy', 'Greenline Hardware', 'Sunrise Textiles', 'Metro Wholesale Foods',
  'Coral Bay Supplies', 'Island Grocers Co.', 'Palm Grove Traders', 'Silver Star Motors'
];

const ACTIVITY_TYPES = ['Client Visit', 'Product Demo', 'Order Collection', 'Follow-up Call', 'New Lead Survey'];

function jitter(value, spread = 0.01) {
  return value + (Math.random() - 0.5) * spread;
}

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getLiveLocations() {
  const now = Date.now();
  return REPS.map((rep, i) => {
    const area = AREAS[i % AREAS.length];
    const minutesAgo = Math.floor(Math.random() * 12) + 1;
    return {
      id: `ping_${rep.id}`,
      repId: rep.id,
      repName: rep.name,
      lat: jitter(area.lat),
      lng: jitter(area.lng),
      area: area.name,
      status: Math.random() > 0.25 ? 'active' : 'idle',
      timestamp: new Date(now - minutesAgo * 60 * 1000).toISOString()
    };
  });
}

let cachedLogs = null;

function generateActivityLogs() {
  const logs = [];
  let counter = 1;

  for (let dayOffset = 4; dayOffset >= 0; dayOffset--) {
    const visitsToday = 6 + Math.floor(Math.random() * 6);

    for (let v = 0; v < visitsToday; v++) {
      const rep = randomFrom(REPS);
      const area = randomFrom(AREAS);
      const day = new Date();
      day.setDate(day.getDate() - dayOffset);
      day.setHours(8 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 60), 0, 0);

      const durationMinutes = 12 + Math.floor(Math.random() * 48);
      const checkInTime = new Date(day);
      const checkOutTime = new Date(day.getTime() + durationMinutes * 60 * 1000);

      logs.push({
        id: `log_${String(counter).padStart(4, '0')}`,
        repId: rep.id,
        repName: rep.name,
        clientName: randomFrom(CLIENTS),
        address: `${area.name}, Colombo`,
        lat: jitter(area.lat),
        lng: jitter(area.lng),
        activityType: randomFrom(ACTIVITY_TYPES),
        checkInTime: checkInTime.toISOString(),
        checkOutTime: checkOutTime.toISOString(),
        durationMinutes,
        verified: Math.random() > 0.22,
        notes: 'Auto-generated sample record for local development.'
      });
      counter++;
    }
  }

  return logs.sort((a, b) => new Date(b.checkInTime) - new Date(a.checkInTime));
}

function getAllLogs() {
  if (!cachedLogs) cachedLogs = generateActivityLogs();
  return cachedLogs;
}

function getActivityLogs({ repId, date, limit = 50 } = {}) {
  let logs = getAllLogs();
  if (repId) logs = logs.filter((l) => l.repId === repId);
  if (date) logs = logs.filter((l) => l.checkInTime.slice(0, 10) === date);
  return logs.slice(0, limit);
}

function getReps() {
  return REPS;
}

module.exports = { getLiveLocations, getActivityLogs, getReps, getAllLogs };
