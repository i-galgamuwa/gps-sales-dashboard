// Live Map page: renders field-rep positions on Leaflet and the latest
// visit-log table underneath it, then polls both every 30 seconds.
const DEFAULT_CENTER = [6.9271, 79.8612]; // Colombo, Sri Lanka
let map;
const markers = {};

function initMap() {
  map = L.map('live-map').setView(DEFAULT_CENTER, 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);
}

function statusColor(status) {
  return status === 'active' ? '#2563EB' : '#94A3B8';
}

function timeAgo(iso) {
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  return mins === 1 ? '1 min ago' : `${mins} mins ago`;
}

function upsertMarker(loc) {
  const icon = L.divIcon({
    html: `<span style="background:${statusColor(loc.status)}" class="block w-3.5 h-3.5 rounded-full ring-2 ring-white shadow"></span>`,
    className: '',
    iconSize: [14, 14]
  });

  if (markers[loc.repId]) {
    markers[loc.repId].setLatLng([loc.lat, loc.lng]).setIcon(icon);
  } else {
    markers[loc.repId] = L.marker([loc.lat, loc.lng], { icon }).addTo(map);
  }

  markers[loc.repId].bindPopup(`
    <div class="text-sm">
      <p class="font-semibold">${loc.repName}</p>
      <p class="text-slate-500">${loc.status === 'active' ? 'Active' : 'Idle'} · updated ${timeAgo(loc.timestamp)}</p>
    </div>
  `);
}

async function loadLiveLocations() {
  try {
    const res = await fetch('/api/locations/live');
    const json = await res.json();
    if (json.success) json.data.forEach(upsertMarker);
  } catch (err) {
    console.error('Failed to load live locations', err);
  }
}

function verifiedBadge(verified) {
  return verified
    ? '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-teal-50 text-verified">Verified</span>'
    : '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-pending">Pending</span>';
}

function formatTime(iso) {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

async function loadLatestLogs() {
  const tbody = document.getElementById('latest-logs-body');
  try {
    const res = await fetch('/api/logs?limit=8');
    const json = await res.json();
    if (!json.success || !json.data.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-6 text-center text-slate-400">No visit logs yet.</td></tr>';
      return;
    }
    tbody.innerHTML = json.data.map((log) => `
      <tr class="hover:bg-slate-50">
        <td class="px-6 py-3 font-medium text-ink">${log.repName}</td>
        <td class="px-6 py-3 text-slate-600">${log.clientName}</td>
        <td class="px-6 py-3 text-slate-500">${log.address}</td>
        <td class="px-6 py-3 font-mono text-slate-500">${formatTime(log.checkInTime)}</td>
        <td class="px-6 py-3 font-mono text-slate-500">${log.durationMinutes} min</td>
        <td class="px-6 py-3">${verifiedBadge(log.verified)}</td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-6 text-center text-red-500">Failed to load logs.</td></tr>';
  }
}

function touchLastSynced() {
  const el = document.getElementById('last-synced');
  if (el) el.textContent = new Date().toLocaleTimeString();
}

async function refreshAll() {
  await Promise.all([loadLiveLocations(), loadLatestLogs()]);
  touchLastSynced();
}

document.addEventListener('DOMContentLoaded', () => {
  initMap();
  refreshAll();
  document.getElementById('refresh-btn')?.addEventListener('click', refreshAll);
  setInterval(refreshAll, 30000);
});
