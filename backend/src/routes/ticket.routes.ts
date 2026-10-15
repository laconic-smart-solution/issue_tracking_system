import { Router } from 'express';
import { TicketController } from '../controllers/ticket.controller';

const router = Router();

// Ticket CRUD
router.get('/', TicketController.getTickets);
router.post('/', TicketController.createTicket);

router.get('/:id', TicketController.getTicketById);
router.put('/:id', TicketController.updateTicket);
router.patch('/:id', TicketController.updateTicket);
router.delete('/:id', TicketController.deleteTicket);

router.patch('/:id/status', TicketController.updateStatus);
router.post('/:id/reply', TicketController.reply);

export default router;
