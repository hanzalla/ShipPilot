import { Router } from 'express';
import { list, get, create, update, remove } from '../controllers/applications.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.use(requireAuth);

router.get('/',      list);
router.post('/',     create);
router.get('/:id',   get);
router.patch('/:id',  update);
router.delete('/:id', remove);

export default router;
