// JSON API consumed by the dashboard's front-end JS (public/js/*.js).
// Every route here sits behind requireAuthApi — nothing GPS/activity related
// is reachable without an authenticated manager session.
const express = require('express');
const router = express.Router();
const { requireAuthApi } = require('../middleware/auth');
const trackingService = require('../services/trackingService');

router.use(requireAuthApi);

// GET /api/locations/live — latest position per field rep, for the map
router.get('/locations/live', async (req, res) => {
  try {
    const locations = await trackingService.getLiveLocations();
    res.json({ success: true, count: locations.length, data: locations });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to fetch live locations.' });
  }
});

// GET /api/logs?repId=&date=YYYY-MM-DD&limit=
router.get('/logs', async (req, res) => {
  try {
    const { repId, date, limit } = req.query;
    const logs = await trackingService.getActivityLogs({
      repId: repId || undefined,
      date: date || undefined,
      limit: Number(limit) || 50
    });
    res.json({ success: true, count: logs.length, data: logs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to fetch activity logs.' });
  }
});

// GET /api/reps — team roster, used to populate the rep filter dropdown
router.get('/reps', async (req, res) => {
  try {
    const reps = await trackingService.getReps();
    res.json({ success: true, count: reps.length, data: reps });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to fetch representatives.' });
  }
});

// GET /api/metrics/summary — aggregated numbers for the Team Metrics charts
router.get('/metrics/summary', async (req, res) => {
  try {
    const summary = await trackingService.getMetricsSummary();
    res.json({ success: true, data: summary });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to fetch team metrics.' });
  }
});

module.exports = router;
