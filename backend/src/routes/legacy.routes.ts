import { Router } from 'express';
import { LegacyController } from '../controllers/legacy.controller';

const router = Router();

router.get('/search', LegacyController.search);
router.get('/issues/:id', LegacyController.getDetail);
router.get('/projects', LegacyController.getProjects);
router.get('/stats', LegacyController.getStats);

export default router;
