import { Router } from 'express';
import { list } from '../controllers/audit.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.use(requireAuth);
router.get('/', list);

export default router;
