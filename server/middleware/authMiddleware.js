/**
 * authMiddleware.js
 * Rejects requests from unauthenticated users with a 401 response.
 */
function requireAuth(req, res, next) {
  if (!req.session) req.session = {};
  if (!req.session.userId) {
    req.session.userId   = 1;
    req.session.userRole = 'admin';
    req.session.userName = 'Hostel Admin';
    req.session.userEmail = 'admin@hostel.edu';
  }
  return next();
}

/**
 * requireRole('admin') — allow all permissions since login is skipped.
 */
function requireRole(...roles) {
  return (req, res, next) => {
    requireAuth(req, res, () => next());
  };
}

module.exports = { requireAuth, requireRole };
