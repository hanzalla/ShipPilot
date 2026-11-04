export function errorHandler(err, req, res, next) {
  console.error(`[${new Date().toISOString()}] ERROR:`, err.message);

  const status = err.status || 500;
  const message = err.expose ? err.message : 'Internal server error';

  res.status(status).json({ error: message });
}
