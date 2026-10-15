import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../database/db';

export class MetaController {
  // ================= COMPANY CRUD =================

  static async getCompanies(req: Request, res: Response) {
    try {
      const result = await query(
        `SELECT c.*, 
                COUNT(DISTINCT lg.id) as line_group_count,
                COUNT(DISTINCT t.id) as total_tickets
         FROM companies c
         LEFT JOIN line_groups lg ON c.id = lg.company_id AND lg.is_active = 1
         LEFT JOIN tickets t ON c.id = t.company_id
         WHERE c.is_active = 1
         GROUP BY c.id, c.name, c.code, c.contract_type, c.is_active, c.created_at, c.updated_at
         ORDER BY c.name ASC`
      );
      return res.json(result.rows);
    } catch (error) {
      console.error('[MetaController] Error fetching companies:', error);
      return res.status(500).json({ error: 'Failed to fetch companies' });
    }
  }

  static async createCompany(req: Request, res: Response) {
    try {
      const { name, code, contract_type } = req.body;
      if (!name || !code) {
        return res.status(400).json({ error: 'Company name and code are required' });
      }

      const id = uuidv4();
      await query(
        `INSERT INTO companies (id, name, code, contract_type, is_active)
         VALUES ($1, $2, $3, $4, 1)`,
        [id, name.trim(), code.trim().toUpperCase(), contract_type || 'Standard']
      );

      const created = await query('SELECT * FROM companies WHERE id = $1', [id]);
      return res.status(201).json(created.rows[0]);
    } catch (error: any) {
      console.error('[MetaController] Error creating company:', error);
      if (error.message?.includes('unique') || error.message?.includes('UNIQUE')) {
        return res.status(400).json({ error: 'Company code already exists' });
      }
      return res.status(500).json({ error: 'Failed to create company' });
    }
  }

  static async updateCompany(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, code, contract_type } = req.body;

      if (!name || !code) {
        return res.status(400).json({ error: 'Name and Code are required' });
      }

      await query(
        `UPDATE companies 
         SET name = $1, code = $2, contract_type = $3, updated_at = CURRENT_TIMESTAMP
         WHERE id = $4`,
        [name.trim(), code.trim().toUpperCase(), contract_type || 'Standard', id]
      );

      const updated = await query('SELECT * FROM companies WHERE id = $1', [id]);
      if (updated.rows.length === 0) {
        return res.status(404).json({ error: 'Company not found' });
      }
      return res.json(updated.rows[0]);
    } catch (error: any) {
      console.error('[MetaController] Error updating company:', error);
      if (error.message?.includes('unique') || error.message?.includes('UNIQUE')) {
        return res.status(400).json({ error: 'Company code already exists' });
      }
      return res.status(500).json({ error: 'Failed to update company' });
    }
  }

  static async deleteCompany(req: Request, res: Response) {
    try {
      const { id } = req.params;
      // Soft-delete company
      await query('UPDATE companies SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [id]);
      return res.json({ success: true, message: 'Company deactivated successfully' });
    } catch (error) {
      console.error('[MetaController] Error deleting company:', error);
      return res.status(500).json({ error: 'Failed to delete company' });
    }
  }

  // ================= AGENT / USER CRUD =================

  static async getAgents(req: Request, res: Response) {
    try {
      const result = await query(
        'SELECT id, name, email, role, is_online, active_ticket_count, created_at FROM users ORDER BY name ASC'
      );
      const mapped = result.rows.map((r: any) => ({
        ...r,
        is_online: Boolean(r.is_online),
      }));
      return res.json(mapped);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch agents' });
    }
  }

  static async createAgent(req: Request, res: Response) {
    try {
      const { name, email, role } = req.body;
      if (!name || !email) {
        return res.status(400).json({ error: 'Name and email are required' });
      }

      const id = uuidv4();
      await query(
        `INSERT INTO users (id, name, email, password_hash, role, is_online, active_ticket_count)
         VALUES ($1, $2, $3, $4, $5, 1, 0)`,
        [id, name.trim(), email.trim().toLowerCase(), 'password123', role || 'AGENT']
      );

      const created = await query('SELECT id, name, email, role, is_online, active_ticket_count FROM users WHERE id = $1', [id]);
      return res.status(201).json({
        ...created.rows[0],
        is_online: Boolean(created.rows[0].is_online),
      });
    } catch (error: any) {
      console.error('[MetaController] Error creating agent:', error);
      if (error.message?.includes('unique') || error.message?.includes('UNIQUE')) {
        return res.status(400).json({ error: 'Email already registered' });
      }
      return res.status(500).json({ error: 'Failed to create agent' });
    }
  }

  static async updateAgent(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, email, role } = req.body;

      if (!name || !email) {
        return res.status(400).json({ error: 'Name and email are required' });
      }

      await query(
        `UPDATE users SET name = $1, email = $2, role = $3 WHERE id = $4`,
        [name.trim(), email.trim().toLowerCase(), role || 'AGENT', id]
      );

      const updated = await query('SELECT id, name, email, role, is_online, active_ticket_count FROM users WHERE id = $1', [id]);
      if (updated.rows.length === 0) {
        return res.status(404).json({ error: 'Agent not found' });
      }
      return res.json({
        ...updated.rows[0],
        is_online: Boolean(updated.rows[0].is_online),
      });
    } catch (error: any) {
      console.error('[MetaController] Error updating agent:', error);
      if (error.message?.includes('unique') || error.message?.includes('UNIQUE')) {
        return res.status(400).json({ error: 'Email already registered' });
      }
      return res.status(500).json({ error: 'Failed to update agent' });
    }
  }

  static async deleteAgent(req: Request, res: Response) {
    try {
      const { id } = req.params;
      // Reassign any active tickets to null
      await query('UPDATE tickets SET assignee_id = NULL WHERE assignee_id = $1', [id]);
      // Remove agent skills
      await query('DELETE FROM agent_skills WHERE user_id = $1', [id]);
      // Delete user
      await query('DELETE FROM users WHERE id = $1', [id]);
      return res.json({ success: true, message: 'Agent deleted successfully' });
    } catch (error) {
      console.error('[MetaController] Error deleting agent:', error);
      return res.status(500).json({ error: 'Failed to delete agent' });
    }
  }

  static async toggleAgentOnline(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const current = await query('SELECT is_online FROM users WHERE id = $1', [id]);
      if (current.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const newStatus = current.rows[0].is_online ? 0 : 1;
      await query('UPDATE users SET is_online = $1 WHERE id = $2', [newStatus, id]);

      const updated = await query('SELECT id, name, email, role, is_online, active_ticket_count FROM users WHERE id = $1', [id]);
      return res.json({
        ...updated.rows[0],
        is_online: Boolean(updated.rows[0].is_online),
      });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to update status' });
    }
  }

  // ================= MODULES & STATS =================

  static async getModules(req: Request, res: Response) {
    try {
      const result = await query('SELECT * FROM erp_modules ORDER BY name ASC');
      return res.json(result.rows);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch modules' });
    }
  }

  static async getStats(req: Request, res: Response) {
    try {
      const statsRes = await query(`
        SELECT 
          COUNT(CASE WHEN status NOT IN ('RESOLVED', 'CLOSED') THEN 1 END) as total_open,
          COUNT(CASE WHEN priority = 'CRITICAL' AND status NOT IN ('RESOLVED', 'CLOSED') THEN 1 END) as critical_open,
          COUNT(CASE WHEN status = 'NEW' THEN 1 END) as unassigned,
          COUNT(CASE WHEN status = 'RESOLVED' AND resolved_at >= TRUNC(CURRENT_TIMESTAMP) THEN 1 END) as resolved_today
        FROM tickets
      `);
      return res.json(statsRes.rows[0]);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch stats' });
    }
  }
}
