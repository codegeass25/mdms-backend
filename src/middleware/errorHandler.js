// Centralized error handler. Never leaks stack traces to clients.
function errorHandler(err, req, res, _next) {
  console.error('[ROOT EXCEPTION]', err && err.stack ? err.stack : err);
  if (res.headersSent) return;
  res.status(500).json({
    error: 'System error.',
    context: (err && err.message) || 'unknown',
  });
}

// Wraps async route handlers so thrown errors reach the error handler.
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { errorHandler, asyncHandler };
