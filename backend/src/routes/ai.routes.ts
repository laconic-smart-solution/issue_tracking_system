import { Router } from 'express';
import { AiController } from '../controllers/ai.controller';

const router = Router();

// AI Recurring Radar & Clusters
router.get('/clusters', AiController.getClusters);
router.get('/clusters/:id', AiController.getClusterDetail);

// AI Developer Copilot Diagnostic
router.post('/diagnose', AiController.diagnose);

export default router;
