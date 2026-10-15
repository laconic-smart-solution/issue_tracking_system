-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Companies Table
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    contract_type VARCHAR(50) DEFAULT 'Standard',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. LINE Groups Mapping Table
CREATE TABLE IF NOT EXISTS line_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    line_group_id VARCHAR(100) UNIQUE NOT NULL,
    group_name VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_line_groups_group_id ON line_groups(line_group_id);

-- 3. Users Table (IT Support Engineers & Admins)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(30) DEFAULT 'AGENT', -- 'ADMIN', 'TEAM_LEAD', 'AGENT'
    is_online BOOLEAN DEFAULT FALSE,
    active_ticket_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. ERP Modules Table
CREATE TABLE IF NOT EXISTS erp_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    code VARCHAR(30) UNIQUE NOT NULL,
    description TEXT
);

-- 5. Agent Skills Table
CREATE TABLE IF NOT EXISTS agent_skills (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    module_id UUID REFERENCES erp_modules(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, module_id)
);

-- 6. Ticket Enums & Table
DO $$ BEGIN
    CREATE TYPE ticket_priority AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE ticket_status AS ENUM ('NEW', 'ASSIGNED', 'IN_PROGRESS', 'PENDING_CLIENT', 'RESOLVED', 'CLOSED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_no VARCHAR(50) UNIQUE NOT NULL,
    company_id UUID NOT NULL REFERENCES companies(id),
    line_group_id UUID REFERENCES line_groups(id),
    module_id UUID REFERENCES erp_modules(id),
    assignee_id UUID REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority ticket_priority DEFAULT 'MEDIUM',
    status ticket_status DEFAULT 'NEW',
    sla_response_deadline TIMESTAMP WITH TIME ZONE,
    sla_resolve_deadline TIMESTAMP WITH TIME ZONE,
    first_responded_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE,
    sender_line_user_id VARCHAR(100),
    sender_line_name VARCHAR(150),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_tickets_status_priority ON tickets(status, priority);
CREATE INDEX IF NOT EXISTS idx_tickets_company ON tickets(company_id);
CREATE INDEX IF NOT EXISTS idx_tickets_assignee ON tickets(assignee_id);

-- 7. Ticket Messages Table
DO $$ BEGIN
    CREATE TYPE sender_role AS ENUM ('CUSTOMER', 'AGENT', 'BOT', 'SYSTEM');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS ticket_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    sender_type sender_role NOT NULL,
    user_id UUID REFERENCES users(id),
    message_text TEXT NOT NULL,
    is_internal_note BOOLEAN DEFAULT FALSE,
    line_message_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket ON ticket_messages(ticket_id);

-- 8. Attachments Table
CREATE TABLE IF NOT EXISTS attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES ticket_messages(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(100),
    file_size BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Ticket History Table
CREATE TABLE IF NOT EXISTS ticket_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    old_value VARCHAR(255),
    new_value VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. SLA Configuration Table
CREATE TABLE IF NOT EXISTS sla_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    priority ticket_priority UNIQUE NOT NULL,
    response_time_minutes INT NOT NULL,
    resolve_time_minutes INT NOT NULL,
    warning_threshold_minutes INT NOT NULL
);

-- Default SLA Seed
INSERT INTO sla_config (priority, response_time_minutes, resolve_time_minutes, warning_threshold_minutes)
VALUES
    ('CRITICAL', 15, 120, 10),
    ('HIGH', 30, 240, 20),
    ('MEDIUM', 60, 480, 45),
    ('LOW', 120, 1440, 90)
ON CONFLICT (priority) DO NOTHING;
