// Pure aggregation helper shared by both the Firestore-backed path and the
// mock-data path in services/trackingService.js, so team metrics are always
// computed the same way regardless of the data source.

function summarizeLogs(logs) {
  const totalVisits = logs.length;
  const verifiedCount = logs.filter((l) => l.verified).length;
  const unverifiedCount = totalVisits - verifiedCount;

  const avgDurationMinutes = totalVisits
    ? Math.round(logs.reduce((sum, l) => sum + (l.durationMinutes || 0), 0) / totalVisits)
    : 0;

  const perRep = {};
  logs.forEach((l) => {
    perRep[l.repName] = (perRep[l.repName] || 0) + 1;
  });
  const visitsPerRep = Object.entries(perRep)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });
  const perDay = Object.fromEntries(days.map((d) => [d, 0]));
  logs.forEach((l) => {
    if (!l.checkInTime) return;
    const day = new Date(l.checkInTime).toISOString().slice(0, 10);
    if (day in perDay) perDay[day] += 1;
  });
  const visitsByDay = days.map((date) => ({ date, count: perDay[date] }));

  return {
    totalVisits,
    verifiedCount,
    unverifiedCount,
    avgDurationMinutes,
    visitsPerRep,
    visitsByDay
  };
}

module.exports = { summarizeLogs };
