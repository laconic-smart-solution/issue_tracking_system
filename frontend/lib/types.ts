export type TicketPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type TicketStatus =
  | 'NEW'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'PENDING_CLIENT'
  | 'RESOLVED'
  | 'CLOSED';

export type SenderRole = 'CUSTOMER' | 'AGENT' | 'BOT' | 'SYSTEM';
export type UserRole = 'AGENT' | 'TEAM_LEAD' | 'ADMIN';

export interface Company {
  id: string;
  name: string;
  code: string;
  contract_type: string;
  is_active: number;
  line_group_count?: number;
  total_tickets?: number;
  created_at: string;
  updated_at: string;
}

export interface ErpModule {
  id: string;
  name: string;
  code: string;
  description: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  is_online: boolean;
  active_ticket_count: number;
  created_at: string;
}

export interface Attachment {
  id: string;
  message_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  created_at: string;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_type: SenderRole;
  user_id: string | null;
  sender_user_name?: string;
  message_text: string;
  is_internal_note: boolean;
  line_message_id: string | null;
  created_at: string;
  attachments?: Attachment[];
}

export interface TicketHistory {
  id: string;
  ticket_id: string;
  user_id: string | null;
  user_name?: string;
  action: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

export interface Ticket {
  id: string;
  ticket_no: string;
  company_id: string;
  company_name?: string;
  company_code?: string;
  line_group_id: string | null;
  module_id: string | null;
  module_name?: string;
  assignee_id: string | null;
  assignee_name?: string;
  title: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  sla_response_deadline: string | null;
  sla_resolve_deadline: string | null;
  first_responded_at: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  sender_line_user_id: string | null;
  sender_line_name: string | null;
  created_at: string;
  updated_at: string;
  messages?: TicketMessage[];
  history?: TicketHistory[];
}

export interface DashboardStats {
  total_open: number;
  critical_open: number;
  unassigned: number;
  resolved_today: number;
}

export interface TicketFilters {
  companyId?: string;
  moduleId?: string;
  priority?: TicketPriority | '';
  status?: TicketStatus | '';
  assigneeId?: string;
  search?: string;
}

export interface SocketNewTicket extends Ticket {}

export interface SocketSLAWarning {
  ticketId: string;
  ticketNo: string;
  priority: TicketPriority;
  minutesLeft: number;
  deadline: string;
}

// ================= Legacy Mantis Types =================

export interface LegacyIssue {
  id: number;
  project_id: number;
  project_name: string;
  summary: string;
  priority: number;
  severity: number;
  status: number;
  resolution: number;
  date_submitted: string;
  last_updated: string;
  short_description?: string;
  notes_count?: number;
}

export interface LegacyNote {
  id: number;
  reporter_id: number;
  date_submitted: string;
  note: string;
}

export interface LegacyIssueDetail extends LegacyIssue {
  description: string;
  steps_to_reproduce: string;
  additional_information: string;
  notes: LegacyNote[];
}

export interface LegacyProject {
  id: number;
  name: string;
  status: number;
}

export interface LegacyStats {
  total_issues: number;
  total_projects: number;
  status: string;
}

// ================= AI Knowledge & Copilot Types =================

export interface GoldenSop {
  cluster_id: string;
  title_en: string;
  title_my: string;
  category: 'INVENTORY' | 'PROCUREMENT' | 'TAX_ACCOUNTING' | 'SECURITY' | 'FINANCE' | 'SYSTEM';
  occurrence_count: number;
  sample_issue_ids: number[];
  root_cause: {
    en: string;
    my: string;
  };
  golden_solution: {
    title: string;
    description_en: string;
    description_my: string;
    sql_script: string;
    procedure_name?: string;
  };
  prevention_tips: {
    en: string[];
    my: string[];
  };
  verified_by: string;
  last_updated: string;
}

export interface MatchedMantisIssue {
  id: number;
  project_name: string;
  summary: string;
  match_confidence: number;
  short_description?: string;
  date_submitted?: string;
  notes_count: number;
}

export interface AiDiagnosisResult {
  input_text: string;
  detected_category: string;
  detected_keywords: string[];
  clarification: {
    summary_my: string;
    summary_en: string;
    impact_level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    affected_module: string;
  };
  matched_issues: MatchedMantisIssue[];
  root_cause: {
    en: string;
    my: string;
  };
  master_solution: {
    solution_steps: string[];
    sql_script: string;
  };
  auto_draft_line_reply: {
    thai: string;
    burmese: string;
    english: string;
  };
}
