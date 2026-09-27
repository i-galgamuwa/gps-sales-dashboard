// Guards dashboard pages (redirect to /login) and JSON API routes (401)
// behind a server-side session, so activity/location data is never served
// to an unauthenticated request.
function requireAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  return res.redirect('/login');
}

function requireAuthApi(req, res, next) {
  if (req.session && req.session.user) return next();
  return res.status(401).json({ success: false, error: 'Unauthorized. Please log in to the dashboard.' });
}

module.exports = { requireAuth, requireAuthApi };
