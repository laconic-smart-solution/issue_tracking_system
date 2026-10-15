import { Router } from 'express';
import { WebhookController } from '../controllers/webhook.controller';

const router = Router();

// LINE Platform calls this POST webhook endpoint
router.post('/line', WebhookController.handleLineWebhook);

export default router;
