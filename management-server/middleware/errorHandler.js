/**
 * Custom error class for API errors with status codes
 */
class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'ApiError';
  }
}

/**
 * Async handler wrapper to catch errors in async route handlers
 * @param {Function} fn - Async route handler function
 * @returns {Function} Wrapped function that catches errors
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Centralized error handling middleware
 * Must be registered after all routes
 */
function errorHandler(err, req, res, next) {
  // Log the error
  console.error(`[${new Date().toISOString()}] Error:`, err.message);

  // If headers already sent, delegate to Express default handler
  if (res.headersSent) {
    return next(err);
  }

  // Handle known API errors
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  // Handle file not found errors
  if (err.code === 'ENOENT') {
    return res.status(404).json({ error: 'Resource not found' });
  }

  // Handle JSON parse errors
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Invalid JSON in request body' });
  }

  // Default to 500 Internal Server Error
  res.status(500).json({ error: 'Internal server error' });
}

module.exports = {
  ApiError,
  asyncHandler,
  errorHandler,
};
