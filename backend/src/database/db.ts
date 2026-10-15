import oracledb from 'oracledb';
import { config } from '../config';

// Fetch CLOB as string automatically
oracledb.fetchAsString = [oracledb.CLOB];
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

let pool: oracledb.Pool | null = null;

export async function getPool(): Promise<oracledb.Pool> {
  if (!pool) {
    pool = await oracledb.createPool({
      user: config.database.user,
      password: config.database.password,
      connectString: config.database.connectString,
      poolMin: 2,
      poolMax: 10,
      poolIncrement: 2,
    });
    console.log('✅ [Oracle] Connection pool initialized.');
  }
  return pool;
}

export interface QueryResult {
  rows: any[];
  rowsAffected?: number;
}

/**
 * Universal query function:
 * - Converts PostgreSQL $1, $2 to Oracle :1, :2
 * - Replaces PostgreSQL ILIKE with Oracle LOWER(...) LIKE LOWER(...)
 * - Normalizes returned column keys to lowercase
 * - Auto-commits DML statements
 */
export async function query(sql: string, params: any[] = []): Promise<QueryResult> {
  const p = await getPool();
  const conn = await p.getConnection();

  try {
    // 1. Transform PostgreSQL $1, $2 syntax to Oracle :1, :2
    let transformedSql = sql.replace(/\$(\d+)/g, ':$1');

    // 2. Transform ILIKE to LOWER(col) LIKE LOWER(:param)
    transformedSql = transformedSql.replace(/(\w+(?:\.\w+)?)\s+ILIKE\s+(:?\w+)/gi, 'LOWER($1) LIKE LOWER($2)');

    // 3. Transform CURRENT_TIMESTAMP (Oracle handles CURRENT_TIMESTAMP natively)
    const isDml = /^\s*(INSERT|UPDATE|DELETE|MERGE)/i.test(transformedSql);

    const result = await conn.execute(transformedSql, params, {
      autoCommit: isDml,
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    });

    // 4. Normalize column names to lowercase
    const rows = (result.rows || []).map((row: any) => {
      const normalized: any = {};
      for (const key of Object.keys(row)) {
        normalized[key.toLowerCase()] = row[key];
      }
      return normalized;
    });

    return {
      rows,
      rowsAffected: result.rowsAffected,
    };
  } finally {
    await conn.close();
  }
}
