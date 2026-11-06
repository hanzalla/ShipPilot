import express from 'express';

const app = express();
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'shippilot-demo-app',
    version: process.env.APP_VERSION || '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/greet', (req, res) => {
  if ('name' in req.query && req.query.name.trim().length === 0) {
    return res.status(400).json({ error: 'name must be a non-empty string' });
  }
  const name = req.query.name?.trim() || 'World';
  res.json({ message: `Hello, ${name}!` });
});

app.get('/api/add', (req, res) => {
  const a = Number(req.query.a);
  const b = Number(req.query.b);
  if (isNaN(a) || isNaN(b)) {
    return res.status(400).json({ error: 'a and b must be numbers' });
  }
  res.json({ result: a + b });
});

export default app;
