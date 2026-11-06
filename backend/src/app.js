import express from 'express';
import session from 'express-session';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import authRoutes             from './routes/auth.js';
import appRoutes              from './routes/applications.js';
import envRoutes              from './routes/environments.js';
import deploymentRoutes       from './routes/deployments.js';
import globalDeploymentRoutes from './routes/deployments.global.js';
import repoRoutes             from './routes/repositories.js';
import githubRoutes           from './routes/github.js';
import auditRoutes            from './routes/audit.js';
import webhookRoutes          from './routes/webhooks.js';
import { errorHandler }       from './middleware/error.middleware.js';

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) throw new Error('SESSION_SECRET environment variable is required');

const isProd = process.env.NODE_ENV === 'production';

const app = express();

if (isProd) app.set('trust proxy', 1);

// Security headers
app.use(helmet());

// CORS — only allow our frontend origin
app.use(cors({
  origin: isProd
    ? process.env.FRONTEND_URL
    : ['http://localhost:5500', 'http://127.0.0.1:5500'],
  credentials: true,
}));

// Webhook MUST be registered before express.json() — it reads the raw body itself
// for HMAC signature verification. express.json() would consume the stream first.
app.use('/api/webhooks', webhookRoutes);

app.use(express.json({ limit: '50kb' })); // prevent large payload attacks
app.use(express.static('public'));

// Session
app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 24,
  },
}));

// Global rate limit — 200 requests per 15 min per IP
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 200,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
}));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth',                             authRoutes);
app.use('/api/applications',                     appRoutes);
app.use('/api/applications/:appId/environments', envRoutes);
app.use('/api/applications/:appId/deployments',  deploymentRoutes);
app.use('/api/deployments',                      globalDeploymentRoutes);
app.use('/api/repositories',                     repoRoutes);
app.use('/api/github',                           githubRoutes);
app.use('/api/audit',                            auditRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use(errorHandler);

export default app;
