import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { verifyGithubWebhook } from '../middleware/webhook.middleware.js';
import { handleGithubEvent }   from '../controllers/webhook.controller.js';

// GitHub sends a burst of events — allow reasonable throughput but block floods
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Webhook rate limit exceeded' },
});

const router = Router();

// No session auth — authenticated via HMAC signature instead
router.post('/github', webhookLimiter, verifyGithubWebhook, handleGithubEvent);

export default router;
