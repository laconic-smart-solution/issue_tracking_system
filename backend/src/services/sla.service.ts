import { query } from '../database/db';

export interface SLADeadlines {
  responseDeadline: Date;
  resolveDeadline: Date;
}

export class SLAService {
  /**
   * Calculate deadlines according to priority from DB or fallback
   */
  async calculateDeadlines(priority: string): Promise<SLADeadlines> {
    const now = new Date();

    const result = await query(
      'SELECT response_time_minutes, resolve_time_minutes FROM sla_config WHERE priority = $1',
      [priority.toUpperCase()]
    );

    let responseMinutes = 60;
    let resolveMinutes = 480;

    if (result.rows.length > 0) {
      responseMinutes = result.rows[0].response_time_minutes;
      resolveMinutes = result.rows[0].resolve_time_minutes;
    } else {
      switch (priority.toUpperCase()) {
        case 'CRITICAL':
          responseMinutes = 15;
          resolveMinutes = 120;
          break;
        case 'HIGH':
          responseMinutes = 30;
          resolveMinutes = 240;
          break;
        case 'LOW':
          responseMinutes = 120;
          resolveMinutes = 1440;
          break;
      }
    }

    const responseDeadline = new Date(now.getTime() + responseMinutes * 60000);
    const resolveDeadline = new Date(now.getTime() + resolveMinutes * 60000);

    return { responseDeadline, resolveDeadline };
  }
}

export const slaService = new SLAService();
