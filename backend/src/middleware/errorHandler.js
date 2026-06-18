export class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorHandler(err, _req, res, _next) {
  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : 'Internal server error';

  if (!err.isOperational) {
    console.error('\n🔥 Unexpected Error:');
    console.error(err.stack || err.message);
  }

  const body = { error: message };
  if (err.details) body.details = err.details;
  if (process.env.NODE_ENV !== 'production') body.stack = err.stack;

  res.status(statusCode).json(body);
}

export function notFound(_req, res) {
  res.status(404).json({ error: 'Resource not found' });
}

export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
