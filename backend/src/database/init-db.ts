import oracledb from 'oracledb';
import { config } from '../config';

const tables = [
  {
    name: 'COMPANIES',
    sql: `CREATE TABLE companies (
      id VARCHAR2(50) PRIMARY KEY,
      name VARCHAR2(255) NOT NULL,
      code VARCHAR2(50) UNIQUE NOT NULL,
      contract_type VARCHAR2(50) DEFAULT 'Standard',
      is_active NUMBER(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
  },
  {
    name: 'LINE_GROUPS',
    sql: `CREATE TABLE line_groups (
      id VARCHAR2(50) PRIMARY KEY,
      company_id VARCHAR2(50) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      line_group_id VARCHAR2(100) UNIQUE NOT NULL,
      group_name VARCHAR2(255),
      is_active NUMBER(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
  },
  {
    name: 'USERS',
    sql: `CREATE TABLE users (
      id VARCHAR2(50) PRIMARY KEY,
      name VARCHAR2(100) NOT NULL,
      email VARCHAR2(150) UNIQUE NOT NULL,
      password_hash VARCHAR2(255) NOT NULL,
      role VARCHAR2(30) DEFAULT 'AGENT',
      is_online NUMBER(1) DEFAULT 0,
      active_ticket_count NUMBER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
  },
  {
    name: 'ERP_MODULES',
    sql: `CREATE TABLE erp_modules (
      id VARCHAR2(50) PRIMARY KEY,
      name VARCHAR2(100) UNIQUE NOT NULL,
      code VARCHAR2(30) UNIQUE NOT NULL,
      description VARCHAR2(1000)
    )`
  },
  {
    name: 'AGENT_SKILLS',
    sql: `CREATE TABLE agent_skills (
      user_id VARCHAR2(50) REFERENCES users(id) ON DELETE CASCADE,
      module_id VARCHAR2(50) REFERENCES erp_modules(id) ON DELETE CASCADE,
      PRIMARY KEY (user_id, module_id)
    )`
  },
  {
    name: 'TICKETS',
    sql: `CREATE TABLE tickets (
      id VARCHAR2(50) PRIMARY KEY,
      ticket_no VARCHAR2(50) UNIQUE NOT NULL,
      company_id VARCHAR2(50) NOT NULL REFERENCES companies(id),
      line_group_id VARCHAR2(50) REFERENCES line_groups(id),
      module_id VARCHAR2(50) REFERENCES erp_modules(id),
      assignee_id VARCHAR2(50) REFERENCES users(id),
      title VARCHAR2(255) NOT NULL,
      description CLOB,
      priority VARCHAR2(20) DEFAULT 'MEDIUM' CHECK (priority IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
      status VARCHAR2(30) DEFAULT 'NEW' CHECK (status IN ('NEW', 'ASSIGNED', 'IN_PROGRESS', 'PENDING_CLIENT', 'RESOLVED', 'CLOSED')),
      sla_response_deadline TIMESTAMP,
      sla_resolve_deadline TIMESTAMP,
      first_responded_at TIMESTAMP,
      resolved_at TIMESTAMP,
      closed_at TIMESTAMP,
      sender_line_user_id VARCHAR2(100),
      sender_line_name VARCHAR2(150),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
  },
  {
    name: 'TICKET_MESSAGES',
    sql: `CREATE TABLE ticket_messages (
      id VARCHAR2(50) PRIMARY KEY,
      ticket_id VARCHAR2(50) NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
      sender_type VARCHAR2(20) NOT NULL CHECK (sender_type IN ('CUSTOMER', 'AGENT', 'BOT', 'SYSTEM')),
      user_id VARCHAR2(50) REFERENCES users(id),
      message_text CLOB NOT NULL,
      is_internal_note NUMBER(1) DEFAULT 0,
      line_message_id VARCHAR2(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
  },
  {
    name: 'ATTACHMENTS',
    sql: `CREATE TABLE attachments (
      id VARCHAR2(50) PRIMARY KEY,
      message_id VARCHAR2(50) NOT NULL REFERENCES ticket_messages(id) ON DELETE CASCADE,
      file_name VARCHAR2(255) NOT NULL,
      file_path VARCHAR2(500) NOT NULL,
      file_type VARCHAR2(100),
      file_size NUMBER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
  },
  {
    name: 'TICKET_HISTORY',
    sql: `CREATE TABLE ticket_history (
      id VARCHAR2(50) PRIMARY KEY,
      ticket_id VARCHAR2(50) NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
      user_id VARCHAR2(50) REFERENCES users(id),
      action VARCHAR2(50) NOT NULL,
      old_value VARCHAR2(255),
      new_value VARCHAR2(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
  },
  {
    name: 'SLA_CONFIG',
    sql: `CREATE TABLE sla_config (
      id VARCHAR2(50) PRIMARY KEY,
      priority VARCHAR2(20) UNIQUE NOT NULL,
      response_time_minutes NUMBER NOT NULL,
      resolve_time_minutes NUMBER NOT NULL,
      warning_threshold_minutes NUMBER NOT NULL
    )`
  }
];

async function initDb() {
  console.log('[Oracle] Connecting to initialize tables...');
  let conn: oracledb.Connection | null = null;
  try {
    conn = await oracledb.getConnection({
      user: config.database.user,
      password: config.database.password,
      connectString: config.database.connectString,
    });

    for (const t of tables) {
      try {
        await conn.execute(t.sql);
        console.log(`✅ [Oracle] Created table: ${t.name}`);
      } catch (err: any) {
        // ORA-00955: name is already used by an existing object
        if (err.errorNum === 955) {
          console.log(`ℹ️ [Oracle] Table ${t.name} already exists. Skipping.`);
        } else {
          console.error(`❌ [Oracle] Error creating table ${t.name}:`, err.message);
        }
      }
    }

    // Default SLA Seed
    const slaRows = [
      { priority: 'CRITICAL', res: 15, resolve: 120, warn: 10 },
      { priority: 'HIGH', res: 30, resolve: 240, warn: 20 },
      { priority: 'MEDIUM', res: 60, resolve: 480, warn: 45 },
      { priority: 'LOW', res: 120, resolve: 1440, warn: 90 },
    ];

    for (const s of slaRows) {
      const check = await conn.execute('SELECT COUNT(*) as cnt FROM sla_config WHERE priority = :p', [s.priority], {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      });
      const cnt = (check.rows?.[0] as any)?.CNT || 0;
      if (cnt === 0) {
        await conn.execute(
          `INSERT INTO sla_config (id, priority, response_time_minutes, resolve_time_minutes, warning_threshold_minutes)
           VALUES (SYS_GUID(), :1, :2, :3, :4)`,
          [s.priority, s.res, s.resolve, s.warn],
          { autoCommit: true }
        );
        console.log(`✅ [Oracle] Seeded SLA config for ${s.priority}`);
      }
    }

    console.log('🎉 [Oracle] Database schema initialization completed!');
  } catch (error) {
    console.error('❌ [Oracle] Fatal error initializing database:', error);
  } finally {
    if (conn) {
      await conn.close();
    }
  }
}

initDb();
