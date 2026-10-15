import { Router } from 'express';
import { MetaController } from '../controllers/meta.controller';

const router = Router();

// Companies CRUD
router.get('/companies', MetaController.getCompanies);
router.post('/companies', MetaController.createCompany);
router.put('/companies/:id', MetaController.updateCompany);
router.delete('/companies/:id', MetaController.deleteCompany);

// Modules
router.get('/modules', MetaController.getModules);

// Agents CRUD
router.get('/agents', MetaController.getAgents);
router.post('/agents', MetaController.createAgent);
router.put('/agents/:id', MetaController.updateAgent);
router.delete('/agents/:id', MetaController.deleteAgent);
router.patch('/agents/:id/status', MetaController.toggleAgentOnline);

// Stats
router.get('/stats', MetaController.getStats);

export default router;
