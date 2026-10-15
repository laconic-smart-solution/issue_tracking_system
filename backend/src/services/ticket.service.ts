import { v4 as uuidv4 } from 'uuid';
import { query } from '../database/db';
import { slaService } from './sla.service';
import { socketServer } from '../sockets/socket.server';

export class TicketService {
  /**
   * Find which Company is mapped to this LINE group
   */
  async getCompanyByLineGroup(lineGroupId: string) {
    const res = await query(
      `SELECT lg.id as line_group_pk, lg.group_name, c.id as company_id, c.name as company_name, c.code as company_code
       FROM line_groups lg
       JOIN companies c ON lg.company_id = c.id
       WHERE lg.line_group_id = $1 AND lg.is_active = 1`,
      [lineGroupId]
    );
    return res.rows[0] || null;
  }

  /**
   * Bind LINE Group to a Company Code (e.g. from @bot bind KBZ)
   */
  async bindGroupToCompany(lineGroupId: string, companyCode: string, groupName: string = 'LINE Group') {
    const companyRes = await query('SELECT id, name FROM companies WHERE UPPER(code) = UPPER($1)', [companyCode]);
    if (companyRes.rows.length === 0) {
      return { success: false, message: `Company with code '${companyCode}' not found.` };
    }

    const companyId = companyRes.rows[0].id;
    const existingGroup = await query('SELECT id FROM line_groups WHERE line_group_id = $1', [lineGroupId]);

    if (existingGroup.rows.length > 0) {
      await query(
        `UPDATE line_groups SET company_id = $1, group_name = $2, is_active = 1 WHERE line_group_id = $3`,
        [companyId, groupName, lineGroupId]
      );
    } else {
      const newGroupId = uuidv4();
      await query(
        `INSERT INTO line_groups (id, company_id, line_group_id, group_name, is_active)
         VALUES ($1, $2, $3, $4, 1)`,
        [newGroupId, companyId, lineGroupId, groupName]
      );
    }

    return { success: true, companyName: companyRes.rows[0].name };
  }

  /**
   * Check if there's an ongoing active ticket for this group
   */
  async getActiveTicketForGroup(lineGroupPk: string) {
    const res = await query(
      `SELECT * FROM (
        SELECT * FROM tickets 
        WHERE line_group_id = $1 
          AND status NOT IN ('RESOLVED', 'CLOSED')
        ORDER BY created_at DESC
      ) WHERE ROWNUM = 1`,
      [lineGroupPk]
    );
    return res.rows[0] || null;
  }

  /**
   * Auto-assign ticket to least loaded online agent with matching skill or fallback
   */
  async autoAssignAgent(moduleId?: string) {
    let agentId: string | null = null;

    if (moduleId) {
      const skilledRes = await query(
        `SELECT * FROM (
          SELECT u.id, u.name, u.active_ticket_count
          FROM users u
          JOIN agent_skills s ON u.id = s.user_id
          WHERE s.module_id = $1 AND u.is_online = 1
          ORDER BY u.active_ticket_count ASC
        ) WHERE ROWNUM = 1`,
        [moduleId]
      );
      if (skilledRes.rows.length > 0) {
        agentId = skilledRes.rows[0].id;
      }
    }

    if (!agentId) {
      const anyAgentRes = await query(
        `SELECT * FROM (
          SELECT id, name FROM users 
          WHERE is_online = 1 AND role IN ('AGENT', 'TEAM_LEAD')
          ORDER BY active_ticket_count ASC
        ) WHERE ROWNUM = 1`
      );
      if (anyAgentRes.rows.length > 0) {
        agentId = anyAgentRes.rows[0].id;
      }
    }

    return agentId;
  }

  /**
   * Create a new ticket
   */
  async createTicket(params: {
    companyId: string;
    lineGroupPk: string;
    title: string;
    description: string;
    priority?: string;
    moduleId?: string;
    senderLineUserId?: string;
    senderLineName?: string;
  }) {
    const priority = params.priority || 'MEDIUM';
    const deadlines = await slaService.calculateDeadlines(priority);
    const assigneeId = await this.autoAssignAgent(params.moduleId);

    // Generate readable Ticket No: TK-YYYYMM-XXXX
    const dateStr = new Date().toISOString().slice(0, 7).replace('-', '');
    const countRes = await query('SELECT COUNT(*) as cnt FROM tickets');
    const seq = (parseInt(countRes.rows[0].cnt || '0', 10) + 1).toString().padStart(4, '0');
    const ticketNo = `TK-${dateStr}-${seq}`;
    const ticketId = uuidv4();
    const status = assigneeId ? 'ASSIGNED' : 'NEW';

    await query(
      `INSERT INTO tickets (
        id, ticket_no, company_id, line_group_id, module_id, assignee_id,
        title, description, priority, status,
        sla_response_deadline, sla_resolve_deadline,
        sender_line_user_id, sender_line_name
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        ticketId,
        ticketNo,
        params.companyId,
        params.lineGroupPk,
        params.moduleId || null,
        assigneeId,
        params.title,
        params.description,
        priority,
        status,
        deadlines.responseDeadline,
        deadlines.resolveDeadline,
        params.senderLineUserId || null,
        params.senderLineName || 'Customer',
      ]
    );

    // Increment assignee's active ticket count
    if (assigneeId) {
      await query('UPDATE users SET active_ticket_count = active_ticket_count + 1 WHERE id = $1', [assigneeId]);
    }

    // Add initial message
    const msg = await this.addMessage({
      ticketId,
      senderType: 'CUSTOMER',
      messageText: params.description,
    });

    const ticketRes = await query('SELECT * FROM tickets WHERE id = $1', [ticketId]);
    const ticket = ticketRes.rows[0];

    // Notify Dashboard via Socket.io
    socketServer.notifyNewTicket(ticket);

    return { ticket, initialMessageId: msg.id };
  }

  /**
   * Add message to a ticket
   */
  async addMessage(params: {
    ticketId: string;
    senderType: 'CUSTOMER' | 'AGENT' | 'BOT' | 'SYSTEM';
    messageText: string;
    userId?: string;
    isInternalNote?: boolean;
    lineMessageId?: string;
  }) {
    const messageId = uuidv4();
    await query(
      `INSERT INTO ticket_messages (
        id, ticket_id, sender_type, user_id, message_text, is_internal_note, line_message_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        messageId,
        params.ticketId,
        params.senderType,
        params.userId || null,
        params.messageText,
        params.isInternalNote ? 1 : 0,
        params.lineMessageId || null,
      ]
    );

    const msgRes = await query('SELECT * FROM ticket_messages WHERE id = $1', [messageId]);
    const msg = msgRes.rows[0];
    socketServer.notifyNewMessage(msg);
    return msg;
  }

  /**
   * Attach file to a message
   */
  async addAttachment(params: {
    messageId: string;
    fileName: string;
    filePath: string;
    fileType: string;
    fileSize: number;
  }) {
    const attachmentId = uuidv4();
    await query(
      `INSERT INTO attachments (id, message_id, file_name, file_path, file_type, file_size)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [attachmentId, params.messageId, params.fileName, params.filePath, params.fileType, params.fileSize]
    );

    const res = await query('SELECT * FROM attachments WHERE id = $1', [attachmentId]);
    return res.rows[0];
  }
}

export const ticketService = new TicketService();
