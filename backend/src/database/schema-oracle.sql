-- 1. COMPANIES Table
BEGIN
  EXECUTE IMMEDIATE '
    CREATE TABLE companies (
      id VARCHAR2(50) PRIMARY KEY,
      name VARCHAR2(255) NOT NULL,
      code VARCHAR2(50) UNIQUE NOT NULL,
      contract_type VARCHAR2(50) DEFAULT ''Standard'',
      is_active NUMBER(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  ';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -955 THEN RAISE; END IF;
END;
/

-- 2. LINE_GROUPS Table
BEGIN
  EXECUTE IMMEDIATE '
    CREATE TABLE line_groups (
      id VARCHAR2(50) PRIMARY KEY,
      company_id VARCHAR2(50) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      line_group_id VARCHAR2(100) UNIQUE NOT NULL,
      group_name VARCHAR2(255),
      is_active NUMBER(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  ';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -955 THEN RAISE; END IF;
END;
/

-- 3. USERS Table
BEGIN
  EXECUTE IMMEDIATE '
    CREATE TABLE users (
      id VARCHAR2(50) PRIMARY KEY,
      name VARCHAR2(100) NOT NULL,
      email VARCHAR2(150) UNIQUE NOT NULL,
      password_hash VARCHAR2(255) NOT NULL,
      role VARCHAR2(30) DEFAULT ''AGENT'',
      is_online NUMBER(1) DEFAULT 0,
      active_ticket_count NUMBER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  ';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -955 THEN RAISE; END IF;
END;
/

-- 4. ERP_MODULES Table
BEGIN
  EXECUTE IMMEDIATE '
    CREATE TABLE erp_modules (
      id VARCHAR2(50) PRIMARY KEY,
      name VARCHAR2(100) UNIQUE NOT NULL,
      code VARCHAR2(30) UNIQUE NOT NULL,
      description VARCHAR2(1000)
    )
  ';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -955 THEN RAISE; END IF;
END;
/

-- 5. AGENT_SKILLS Table
BEGIN
  EXECUTE IMMEDIATE '
    CREATE TABLE agent_skills (
      user_id VARCHAR2(50) REFERENCES users(id) ON DELETE CASCADE,
      module_id VARCHAR2(50) REFERENCES erp_modules(id) ON DELETE CASCADE,
      PRIMARY KEY (user_id, module_id)
    )
  ';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -955 THEN RAISE; END IF;
END;
/

-- 6. TICKETS Table
BEGIN
  EXECUTE IMMEDIATE '
    CREATE TABLE tickets (
      id VARCHAR2(50) PRIMARY KEY,
      ticket_no VARCHAR2(50) UNIQUE NOT NULL,
      company_id VARCHAR2(50) NOT NULL REFERENCES companies(id),
      line_group_id VARCHAR2(50) REFERENCES line_groups(id),
      module_id VARCHAR2(50) REFERENCES erp_modules(id),
      assignee_id VARCHAR2(50) REFERENCES users(id),
      title VARCHAR2(255) NOT NULL,
      description CLOB,
      priority VARCHAR2(20) DEFAULT ''MEDIUM'' CHECK (priority IN (''CRITICAL'', ''HIGH'', ''MEDIUM'', ''LOW'')),
      status VARCHAR2(30) DEFAULT ''NEW'' CHECK (status IN (''NEW'', ''ASSIGNED'', ''IN_PROGRESS'', ''PENDING_CLIENT'', ''RESOLVED'', ''CLOSED'')),
      sla_response_deadline TIMESTAMP,
      sla_resolve_deadline TIMESTAMP,
      first_responded_at TIMESTAMP,
      resolved_at TIMESTAMP,
      closed_at TIMESTAMP,
      sender_line_user_id VARCHAR2(100),
      sender_line_name VARCHAR2(150),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  ';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -955 THEN RAISE; END IF;
END;
/

-- 7. TICKET_MESSAGES Table
BEGIN
  EXECUTE IMMEDIATE '
    CREATE TABLE ticket_messages (
      id VARCHAR2(50) PRIMARY KEY,
      ticket_id VARCHAR2(50) NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
      sender_type VARCHAR2(20) NOT NULL CHECK (sender_type IN (''CUSTOMER'', ''AGENT'', ''BOT'', ''SYSTEM'')),
      user_id VARCHAR2(50) REFERENCES users(id),
      message_text CLOB NOT NULL,
      is_internal_note NUMBER(1) DEFAULT 0,
      line_message_id VARCHAR2(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  ';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -955 THEN RAISE; END IF;
END;
/

-- 8. ATTACHMENTS Table
BEGIN
  EXECUTE IMMEDIATE '
    CREATE TABLE attachments (
      id VARCHAR2(50) PRIMARY KEY,
      message_id VARCHAR2(50) NOT NULL REFERENCES ticket_messages(id) ON DELETE CASCADE,
      file_name VARCHAR2(255) NOT NULL,
      file_path VARCHAR2(500) NOT NULL,
      file_type VARCHAR2(100),
      file_size NUMBER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  ';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -955 THEN RAISE; END IF;
END;
/

-- 9. TICKET_HISTORY Table
BEGIN
  EXECUTE IMMEDIATE '
    CREATE TABLE ticket_history (
      id VARCHAR2(50) PRIMARY KEY,
      ticket_id VARCHAR2(50) NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
      user_id VARCHAR2(50) REFERENCES users(id),
      action VARCHAR2(50) NOT NULL,
      old_value VARCHAR2(255),
      new_value VARCHAR2(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  ';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -955 THEN RAISE; END IF;
END;
/

-- 10. SLA_CONFIG Table
BEGIN
  EXECUTE IMMEDIATE '
    CREATE TABLE sla_config (
      id VARCHAR2(50) PRIMARY KEY,
      priority VARCHAR2(20) UNIQUE NOT NULL,
      response_time_minutes NUMBER NOT NULL,
      resolve_time_minutes NUMBER NOT NULL,
      warning_threshold_minutes NUMBER NOT NULL
    )
  ';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -955 THEN RAISE; END IF;
END;
/
