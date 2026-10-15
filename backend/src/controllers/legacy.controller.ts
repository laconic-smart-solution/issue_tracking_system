import { Request, Response } from 'express';
import axios from 'axios';

const BRIDGE_URL = process.env.MANTIS_BRIDGE_URL || 'http://192.168.0.118:8081/api_mantis_bridge.php';

export class LegacyController {
  static async search(req: Request, res: Response) {
    try {
      const { q, project_id, limit } = req.query;
      const resp = await axios.get(BRIDGE_URL, {
        params: {
          action: 'search',
          q: q || '',
          project_id: project_id || '',
          limit: limit || 20,
        },
        timeout: 10000,
      });
      return res.json(resp.data);
    } catch (error: any) {
      console.error('[LegacyController] Error searching legacy issues:', error.message);
      return res.status(500).json({ error: 'Failed to search legacy database' });
    }
  }

  static async getDetail(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const resp = await axios.get(BRIDGE_URL, {
        params: {
          action: 'detail',
          id,
        },
        timeout: 10000,
      });
      return res.json(resp.data);
    } catch (error: any) {
      console.error('[LegacyController] Error fetching legacy issue detail:', error.message);
      return res.status(500).json({ error: 'Failed to fetch legacy issue' });
    }
  }

  static async getProjects(req: Request, res: Response) {
    try {
      const resp = await axios.get(BRIDGE_URL, {
        params: { action: 'projects' },
        timeout: 10000,
      });
      return res.json(resp.data);
    } catch (error: any) {
      console.error('[LegacyController] Error fetching legacy projects:', error.message);
      return res.status(500).json({ error: 'Failed to fetch legacy projects' });
    }
  }

  static async getStats(req: Request, res: Response) {
    try {
      const resp = await axios.get(BRIDGE_URL, {
        params: { action: 'stats' },
        timeout: 10000,
      });
      return res.json(resp.data);
    } catch (error: any) {
      console.error('[LegacyController] Error fetching legacy stats:', error.message);
      return res.status(500).json({ error: 'Failed to fetch legacy stats' });
    }
  }
}
