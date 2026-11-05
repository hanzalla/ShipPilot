import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { register, login, logout, me } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

// 10 attempts per 15 min — prevents brute-force on login/register
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many attempts, please try again in 15 minutes' },
});

const router = Router();

router.post('/register', authLimiter, register);
router.post('/login',    authLimiter, login);
router.post('/logout',   requireAuth, logout);
router.get('/me',        requireAuth, me);

export default router;
