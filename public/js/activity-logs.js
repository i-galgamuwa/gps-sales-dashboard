// Activity Logs page: date/rep/verified filters, a data-dense table, and a
// "Load more" button that widens the query limit instead of true pagination
// (kept simple since Firestore offset pagination needs cursors).
let currentLimit = 25;
const PAGE_SIZE = 25;

function verifiedBadge(verified) {
  return verified
    ? '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-teal-50 text-verified">Verified</span>'
    : '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-pending">Pending</span>';
}

function formatTime(iso) {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

async function loadReps() {
  try {
    const res = await fetch('/api/reps');
    const json = await res.json();
    const select = document.getElementById('filter-rep');
    if (json.success) {
      json.data.forEach((rep) => {
        const opt = document.createElement('option');
        opt.value = rep.id;
        opt.textContent = rep.name;
        select.appendChild(opt);
      });
    }
  } catch (err) {
    console.error('Failed to load representatives', err);
  }
}

async function loadLogs({ append = false } = {}) {
  const tbody = document.getElementById('logs-body');
  const date = document.getElementById('filter-date').value;
  const repId = document.getElementById('filter-rep').value;
  const verifiedOnly = document.getElementById('filter-verified').checked;

  if (!append) {
    currentLimit = PAGE_SIZE;
    tbody.innerHTML = '<tr><td colspan="8" class="px-6 py-6 text-center text-slate-400">Loading…</td></tr>';
  }

  const params = new URLSearchParams({ limit: currentLimit });
  if (date) params.set('date', date);
  if (repId) params.set('repId', repId);

  try {
    const res = await fetch(`/api/logs?${params.toString()}`);
    const json = await res.json();
    let rows = json.success ? json.data : [];
    if (verifiedOnly) rows = rows.filter((r) => r.verified);

    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="8" class="px-6 py-6 text-center text-slate-400">No visit logs match these filters.</td></tr>';
      return;
    }

    tbody.innerHTML = rows.map((log) => `
      <tr class="hover:bg-slate-50">
        <td class="px-6 py-3 font-medium text-ink">${log.repName}</td>
        <td class="px-6 py-3 text-slate-600">${log.clientName}</td>
        <td class="px-6 py-3 text-slate-500">${log.address}</td>
        <td class="px-6 py-3 text-slate-500">${log.activityType || '—'}</td>
        <td class="px-6 py-3 font-mono text-slate-500">${formatTime(log.checkInTime)}</td>
        <td class="px-6 py-3 font-mono text-slate-500">${log.durationMinutes} min</td>
        <td class="px-6 py-3 font-mono text-slate-400">${log.lat?.toFixed(4)}, ${log.lng?.toFixed(4)}</td>
        <td class="px-6 py-3">${verifiedBadge(log.verified)}</td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="8" class="px-6 py-6 text-center text-red-500">Failed to load activity logs.</td></tr>';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadReps();
  loadLogs();
  document.getElementById('apply-filters').addEventListener('click', () => loadLogs());
  document.getElementById('load-more').addEventListener('click', () => {
    currentLimit += PAGE_SIZE;
    loadLogs({ append: true });
  });
});
