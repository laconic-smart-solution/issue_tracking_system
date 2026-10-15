import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../database/db';
import { ticketService } from '../services/ticket.service';
import { slaService } from '../services/sla.service';
import { lineService } from '../services/line.service';
import { socketServer } from '../sockets/socket.server';

export class TicketController {
  /**
   * Create ticket manually from Webapp Dashboard
   */
  static async createTicket(req: Request, res: Response) {
    try {
      const { companyId, title, description, priority, moduleId, assigneeId } = req.body;

      if (!companyId || !title || !description) {
        return res.status(400).json({ error: 'Company, Title, and Description are required' });
      }

      const p = priority || 'MEDIUM';
      const deadlines = await slaService.calculateDeadlines(p);

      // Generate Ticket No: TK-YYYYMM-XXXX
      const dateStr = new Date().toISOString().slice(0, 7).replace('-', '');
      const countRes = await query('SELECT COUNT(*) as cnt FROM tickets');
      const seq = (parseInt(countRes.rows[0].cnt || '0', 10) + 1).toString().padStart(4, '0');
      const ticketNo = `TK-${dateStr}-${seq}`;
      const ticketId = uuidv4();
      const status = assigneeId ? 'ASSIGNED' : 'NEW';

      await query(
        `INSERT INTO tickets (
          id, ticket_no, company_id, module_id, assignee_id,
          title, description, priority, status,
          sla_response_deadline, sla_resolve_deadline,
          sender_line_name
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'Web Portal')`,
        [
          ticketId,
          ticketNo,
          companyId,
          moduleId || null,
          assigneeId || null,
          title.trim(),
          description.trim(),
          p,
          status,
          deadlines.responseDeadline,
          deadlines.resolveDeadline,
        ]
      );

      // Increment assignee ticket count
      if (assigneeId) {
        await query('UPDATE users SET active_ticket_count = active_ticket_count + 1 WHERE id = $1', [assigneeId]);
      }

      // Add initial description as first message
      await ticketService.addMessage({
        ticketId,
        senderType: 'CUSTOMER',
        messageText: description.trim(),
      });

      const createdRes = await query(
        `SELECT t.*, c.name as company_name, m.name as module_name, u.name as assignee_name
         FROM tickets t
         LEFT JOIN companies c ON t.company_id = c.id
         LEFT JOIN erp_modules m ON t.module_id = m.id
         LEFT JOIN users u ON t.assignee_id = u.id
         WHERE t.id = $1`,
        [ticketId]
      );

      const createdTicket = createdRes.rows[0];
      socketServer.notifyNewTicket(createdTicket);

      return res.status(201).json(createdTicket);
    } catch (error) {
      console.error('[TicketController] Error creating ticket:', error);
      return res.status(500).json({ error: 'Failed to create ticket' });
    }
  }

  /**
   * Get list of tickets with multi-filter
   */
  static async getTickets(req: Request, res: Response) {
    try {
      const { companyId, moduleId, priority, status, assigneeId, search } = req.query;

      let sql = `
        SELECT t.*, 
               c.name as company_name, c.code as company_code,
               m.name as module_name,
               u.name as assignee_name
        FROM tickets t
        LEFT JOIN companies c ON t.company_id = c.id
        LEFT JOIN erp_modules m ON t.module_id = m.id
        LEFT JOIN users u ON t.assignee_id = u.id
        WHERE 1=1
      `;
      const params: any[] = [];

      if (companyId) {
        params.push(companyId);
        sql += ` AND t.company_id = $${params.length}`;
      }
      if (moduleId) {
        params.push(moduleId);
        sql += ` AND t.module_id = $${params.length}`;
      }
      if (priority) {
        params.push(priority);
        sql += ` AND t.priority = $${params.length}`;
      }
      if (status) {
        params.push(status);
        sql += ` AND t.status = $${params.length}`;
      }
      if (assigneeId) {
        params.push(assigneeId);
        sql += ` AND t.assignee_id = $${params.length}`;
      }
      if (search) {
        params.push(`%${search}%`);
        sql += ` AND (LOWER(t.ticket_no) LIKE LOWER($${params.length}) OR LOWER(t.title) LIKE LOWER($${params.length}) OR LOWER(t.description) LIKE LOWER($${params.length}))`;
      }

      sql += ` ORDER BY t.created_at DESC`;

      const result = await query(sql, params);
      return res.json(result.rows);
    } catch (error) {
      console.error('[TicketController] Error fetching tickets:', error);
      return res.status(500).json({ error: 'Failed to fetch tickets' });
    }
  }

  /**
   * Get single ticket detail with messages, attachments & history
   */
  static async getTicketById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const ticketRes = await query(
        `SELECT t.*, 
                c.name as company_name, c.code as company_code,
                lg.line_group_id,
                m.name as module_name,
                u.name as assignee_name
         FROM tickets t
         LEFT JOIN companies c ON t.company_id = c.id
         LEFT JOIN line_groups lg ON t.line_group_id = lg.id
         LEFT JOIN erp_modules m ON t.module_id = m.id
         LEFT JOIN users u ON t.assignee_id = u.id
         WHERE t.id = $1`,
        [id]
      );

      if (ticketRes.rows.length === 0) {
        return res.status(404).json({ error: 'Ticket not found' });
      }

      const ticket = ticketRes.rows[0];

      // Fetch messages
      const messagesRes = await query(
        `SELECT tm.*, u.name as sender_user_name
         FROM ticket_messages tm
         LEFT JOIN users u ON tm.user_id = u.id
         WHERE tm.ticket_id = $1
         ORDER BY tm.created_at ASC`,
        [id]
      );

      // Fetch all attachments
      const attachmentsRes = await query(
        `SELECT a.* FROM attachments a
         JOIN ticket_messages tm ON a.message_id = tm.id
         WHERE tm.ticket_id = $1`,
        [id]
      );

      const attachmentMap: Record<string, any[]> = {};
      for (const att of attachmentsRes.rows) {
        if (!attachmentMap[att.message_id]) {
          attachmentMap[att.message_id] = [];
        }
        attachmentMap[att.message_id].push(att);
      }

      const messagesWithAttachments = messagesRes.rows.map((msg: any) => ({
        ...msg,
        is_internal_note: Boolean(msg.is_internal_note),
        attachments: attachmentMap[msg.id] || [],
      }));

      // Fetch history
      const historyRes = await query(
        `SELECT th.*, u.name as user_name
         FROM ticket_history th
         LEFT JOIN users u ON th.user_id = u.id
         WHERE th.ticket_id = $1
         ORDER BY th.created_at DESC`,
        [id]
      );

      return res.json({
        ...ticket,
        messages: messagesWithAttachments,
        history: historyRes.rows,
      });
    } catch (error) {
      console.error('[TicketController] Error fetching ticket detail:', error);
      return res.status(500).json({ error: 'Failed to fetch ticket detail' });
    }
  }

  /**
   * Update full ticket details (title, description, priority, module, assignee, status)
   */
  static async updateTicket(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { title, description, priority, moduleId, assigneeId, status, userId } = req.body;

      const currentRes = await query('SELECT * FROM tickets WHERE id = $1', [id]);
      if (currentRes.rows.length === 0) {
        return res.status(404).json({ error: 'Ticket not found' });
      }

      const current = currentRes.rows[0];

      // Update fields
      const newTitle = title !== undefined ? title : current.title;
      const newDesc = description !== undefined ? description : current.description;
      const newPriority = priority !== undefined ? priority : current.priority;
      const newModule = moduleId !== undefined ? moduleId : current.module_id;
      const newAssignee = assigneeId !== undefined ? assigneeId : current.assignee_id;
      const newStatus = status !== undefined ? status : current.status;

      let extraUpdate = '';
      if (newStatus === 'RESOLVED' && current.status !== 'RESOLVED') {
        extraUpdate = ', resolved_at = CURRENT_TIMESTAMP';
      } else if (newStatus === 'CLOSED' && current.status !== 'CLOSED') {
        extraUpdate = ', closed_at = CURRENT_TIMESTAMP';
      }

      await query(
        `UPDATE tickets 
         SET title = $1, description = $2, priority = $3, module_id = $4, assignee_id = $5, status = $6, updated_at = CURRENT_TIMESTAMP ${extraUpdate}
         WHERE id = $7`,
        [newTitle, newDesc, newPriority, newModule || null, newAssignee || null, newStatus, id]
      );

      // Log changes to history
      if (newStatus !== current.status) {
        await query(
          `INSERT INTO ticket_history (id, ticket_id, user_id, action, old_value, new_value)
           VALUES ($1, $2, $3, 'STATUS_CHANGED', $4, $5)`,
          [uuidv4(), id, userId || null, current.status, newStatus]
        );
      }
      if (newPriority !== current.priority) {
        await query(
          `INSERT INTO ticket_history (id, ticket_id, user_id, action, old_value, new_value)
           VALUES ($1, $2, $3, 'PRIORITY_CHANGED', $4, $5)`,
          [uuidv4(), id, userId || null, current.priority, newPriority]
        );
      }
      if (newAssignee !== current.assignee_id) {
        await query(
          `INSERT INTO ticket_history (id, ticket_id, user_id, action, old_value, new_value)
           VALUES ($1, $2, $3, 'ASSIGNEE_CHANGED', $4, $5)`,
          [uuidv4(), id, userId || null, current.assignee_id || 'Unassigned', newAssignee || 'Unassigned']
        );
      }

      const updatedRes = await query(
        `SELECT t.*, c.name as company_name, m.name as module_name, u.name as assignee_name
         FROM tickets t
         LEFT JOIN companies c ON t.company_id = c.id
         LEFT JOIN erp_modules m ON t.module_id = m.id
         LEFT JOIN users u ON t.assignee_id = u.id
         WHERE t.id = $1`,
        [id]
      );

      const updatedTicket = updatedRes.rows[0];
      socketServer.notifyTicketUpdate(updatedTicket);

      return res.json(updatedTicket);
    } catch (error) {
      console.error('[TicketController] Error updating ticket:', error);
      return res.status(500).json({ error: 'Failed to update ticket' });
    }
  }

  /**
   * Delete ticket
   */
  static async deleteTicket(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const ticketRes = await query('SELECT assignee_id FROM tickets WHERE id = $1', [id]);
      if (ticketRes.rows.length === 0) {
        return res.status(404).json({ error: 'Ticket not found' });
      }

      const assigneeId = ticketRes.rows[0].assignee_id;
      if (assigneeId) {
        await query('UPDATE users SET active_ticket_count = GREATEST(active_ticket_count - 1, 0) WHERE id = $1', [assigneeId]);
      }

      // Attachments & messages cascade delete automatically via foreign keys
      await query('DELETE FROM tickets WHERE id = $1', [id]);

      return res.json({ success: true, message: 'Ticket deleted successfully' });
    } catch (error) {
      console.error('[TicketController] Error deleting ticket:', error);
      return res.status(500).json({ error: 'Failed to delete ticket' });
    }
  }

  /**
   * Agent sends a reply or internal note
   */
  static async reply(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { messageText, isInternalNote, userId } = req.body;

      if (!messageText) {
        return res.status(400).json({ error: 'Message text is required' });
      }

      const ticketRes = await query(
        `SELECT t.*, lg.line_group_id 
         FROM tickets t
         LEFT JOIN line_groups lg ON t.line_group_id = lg.id
         WHERE t.id = $1`,
        [id]
      );

      if (ticketRes.rows.length === 0) {
        return res.status(404).json({ error: 'Ticket not found' });
      }

      const ticket = ticketRes.rows[0];

      // Add message
      const msg = await ticketService.addMessage({
        ticketId: id,
        senderType: 'AGENT',
        messageText,
        userId: userId || null,
        isInternalNote: !!isInternalNote,
      });

      // If not internal note, push to LINE Group!
      if (!isInternalNote && ticket.line_group_id) {
        await lineService.pushMessageToGroup(
          ticket.line_group_id,
          `💬 [IT Support Reply - Ticket #${ticket.ticket_no}]\n${messageText}`
        );
      }

      return res.json(msg);
    } catch (error) {
      console.error('[TicketController] Error replying to ticket:', error);
      return res.status(500).json({ error: 'Failed to reply' });
    }
  }

  /**
   * Quick status update
   */
  static async updateStatus(req: Request, res: Response) {
    return TicketController.updateTicket(req, res);
  }
}
