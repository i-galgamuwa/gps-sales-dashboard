const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again in a few minutes.' }
});

router.get('/', (req, res) => {
  res.redirect(req.session.user ? '/dashboard' : '/login');
});

router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.render('login', { error: null });
});

router.post('/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body;
  const adminUser = process.env.ADMIN_USERNAME || 'admin';
  const adminHash = process.env.ADMIN_PASSWORD_HASH;

  try {
    let validPassword = false;
    if (adminHash) {
      validPassword = await bcrypt.compare(password || '', adminHash);
    } else {
      // Dev-only fallback — set ADMIN_PASSWORD_HASH in .env for anything real
      validPassword = password === (process.env.ADMIN_PASSWORD || 'admin123');
    }

    if (username === adminUser && validPassword) {
      req.session.user = { username };
      return res.redirect('/dashboard');
    }
    return res.status(401).render('login', { error: 'Invalid username or password.' });
  } catch (err) {
    console.error(err);
    return res.status(500).render('login', { error: 'Something went wrong. Please try again.' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

router.get('/dashboard', requireAuth, (req, res) => {
  res.render('dashboard', { active: 'live-map' });
});

router.get('/activity-logs', requireAuth, (req, res) => {
  res.render('activity-logs', { active: 'activity-logs' });
});

router.get('/team-metrics', requireAuth, (req, res) => {
  res.render('team-metrics', { active: 'team-metrics' });
});

module.exports = router;
