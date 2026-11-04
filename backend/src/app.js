import express from 'express';
import session from 'express-session';
import cors from 'cors';

import authRoutes       from './routes/auth.js';
import appRoutes        from './routes/applications.js';
import envRoutes        from './routes/environments.js';
import deploymentRoutes from './routes/deployments.js';
import repoRoutes       from './routes/repositories.js';
import githubRoutes     from './routes/github.js';
import { errorHandler } from './middleware/error.middleware.js';

const app = express();

app.use(cors({
  origin: ['http://localhost:5500', 'http://127.0.0.1:5500'],
  credentials: true,
}));
app.use(express.json());
app.use(express.static('public'));

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 24,
  },
}));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth',                             authRoutes);
app.use('/api/applications',                     appRoutes);
app.use('/api/applications/:appId/environments', envRoutes);
app.use('/api/applications/:appId/deployments',  deploymentRoutes);
app.use('/api/repositories',                     repoRoutes);
app.use('/api/github',                           githubRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use(errorHandler);

export default app;
