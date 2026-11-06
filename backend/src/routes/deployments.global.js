import { Router } from 'express';
import { listAll } from '../controllers/deployments.global.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.use(requireAuth);
router.get('/', listAll);

export default router;
