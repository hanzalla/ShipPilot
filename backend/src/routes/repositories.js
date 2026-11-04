import { Router } from 'express';
import { createWithApp } from '../controllers/repositories.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.use(requireAuth);
router.post('/with-app', createWithApp);

export default router;
