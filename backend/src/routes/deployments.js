import { Router } from 'express';
import { list, get, create } from '../controllers/deployments.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router({ mergeParams: true });

router.use(requireAuth);

router.get('/',    list);
router.post('/',   create);
router.get('/:id', get);

export default router;
