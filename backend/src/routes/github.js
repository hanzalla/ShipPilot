import { Router } from 'express';
import { status, connect, callback, repos, branches, disconnect } from '../controllers/github.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

// callback doesn't require auth cookie — GitHub redirects here with state param
router.get('/callback', callback);

router.use(requireAuth);
router.get('/status',                        status);
router.get('/connect',                       connect);
router.get('/repos',                         repos);
router.get('/repos/:owner/:repo/branches',   branches);
router.delete('/disconnect',                 disconnect);

export default router;
