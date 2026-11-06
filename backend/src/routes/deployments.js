import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { list, get, create, updateStatus } from '../controllers/deployments.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

// Deployment creation is a write op that kicks off a pipeline — limit abuse
const deployLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many deployment requests, please slow down' },
});

const router = Router({ mergeParams: true });

router.use(requireAuth);

router.get('/',         list);
router.post('/',        deployLimiter, create);
router.get('/:id',      get);
router.patch('/:id/status', updateStatus);

export default router;
