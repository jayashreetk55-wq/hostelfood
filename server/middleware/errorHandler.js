/**
 * errorHandler.js
 * Centralised error handler — catches all errors thrown in controllers.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);

  // SQLite unique constraint violation
  if (err.message && err.message.includes('UNIQUE constraint failed')) {
    return res.status(409).json({ error: 'A record with this data already exists.' });
  }

  // SQLite foreign key violation
  if (err.message && err.message.includes('FOREIGN KEY constraint failed')) {
    return res.status(400).json({ error: 'Referenced record does not exist.' });
  }

  const status = err.status || 500;
  const message = err.message || 'An unexpected error occurred.';
  res.status(status).json({ error: message });
}

module.exports = { errorHandler };
