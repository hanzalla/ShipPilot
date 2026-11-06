import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { status, connect, callback, repos, branches, disconnect } from '../controllers/github.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

// GitHub API is a proxy — tighter limit prevents exhausting the user's GitHub rate quota
const githubApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many GitHub API requests, please try again later' },
});

// OAuth flow — 10 initiations per 15 min is generous enough for legitimate use
const oauthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many OAuth attempts, please try again later' },
});

const router = Router();

// callback has no auth cookie — GitHub redirects here; still protected by state nonce + global limit
router.get('/callback', callback);

router.use(requireAuth);
router.get('/status',                       status);
router.get('/connect',                      oauthLimiter, connect);
router.get('/repos',                        githubApiLimiter, repos);
router.get('/repos/:owner/:repo/branches',  githubApiLimiter, branches);
router.delete('/disconnect',                disconnect);

export default router;
