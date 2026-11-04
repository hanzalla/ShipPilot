import { Router } from 'express';
import { list, create, update } from '../controllers/environments.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router({ mergeParams: true });

router.use(requireAuth);

router.get('/',          list);
router.post('/',         create);
router.patch('/:envId',  update);

export default router;
