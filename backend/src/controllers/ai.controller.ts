import { Request, Response } from 'express';
import { AiService } from '../services/ai.service';

export class AiController {
  /**
   * GET /api/ai/clusters
   * Returns recurring bug clusters for the AI Recurring Radar
   */
  static async getClusters(req: Request, res: Response) {
    try {
      const clusters = AiService.getClusters();
      return res.json(clusters);
    } catch (error: any) {
      console.error('[AiController] Error getting clusters:', error.message);
      return res.status(500).json({ error: 'Failed to retrieve recurring issue clusters' });
    }
  }

  /**
   * GET /api/ai/clusters/:id
   * Returns single Golden SOP by cluster ID
   */
  static async getClusterDetail(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const cluster = AiService.getClusterById(id);
      if (!cluster) {
        return res.status(404).json({ error: 'Cluster / Golden SOP not found' });
      }
      return res.json(cluster);
    } catch (error: any) {
      console.error('[AiController] Error getting cluster detail:', error.message);
      return res.status(500).json({ error: 'Failed to retrieve cluster detail' });
    }
  }

  /**
   * POST /api/ai/diagnose
   * Live Developer Copilot diagnostic for an error or ticket
   * Body: { text: string }
   */
  static async diagnose(req: Request, res: Response) {
    try {
      const { text } = req.body;
      if (!text || typeof text !== 'string' || text.trim() === '') {
        return res.status(400).json({ error: 'Field "text" is required for diagnosis' });
      }

      const diagnosis = await AiService.diagnoseIssue(text.trim());
      return res.json(diagnosis);
    } catch (error: any) {
      console.error('[AiController] Error running diagnosis:', error.message);
      return res.status(500).json({ error: 'Failed to run AI diagnosis' });
    }
  }
}
