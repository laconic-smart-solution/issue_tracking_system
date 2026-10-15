import axios from 'axios';
import {
  Ticket,
  TicketFilters,
  Company,
  ErpModule,
  User,
  DashboardStats,
  LegacyIssue,
  LegacyIssueDetail,
  LegacyProject,
  LegacyStats,
  GoldenSop,
  AiDiagnosisResult,
} from './types';

export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:5000`;
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://192.168.23.197:5000';
}

export const api = axios.create({
  timeout: 15000,
});

api.interceptors.request.use((req) => {
  if (!req.baseURL) {
    req.baseURL = getApiBaseUrl();
  }
  return req;
});

// ==================== TICKETS CRUD ====================

export async function getTickets(filters: TicketFilters = {}): Promise<Ticket[]> {
  const params = Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v !== '' && v !== undefined)
  );
  const res = await api.get('/api/tickets', { params });
  return res.data;
}

export async function getTicketById(id: string): Promise<Ticket> {
  const res = await api.get(`/api/tickets/${id}`);
  return res.data;
}

export async function createTicket(data: {
  companyId: string;
  title: string;
  description: string;
  priority?: string;
  moduleId?: string;
  assigneeId?: string;
}): Promise<Ticket> {
  const res = await api.post('/api/tickets', data);
  return res.data;
}

export async function updateTicket(
  id: string,
  data: Partial<Ticket> & { userId?: string }
): Promise<Ticket> {
  const res = await api.patch(`/api/tickets/${id}`, data);
  return res.data;
}

export async function deleteTicket(id: string): Promise<void> {
  await api.delete(`/api/tickets/${id}`);
}

export async function replyToTicket(
  id: string,
  messageText: string,
  isInternalNote: boolean,
  userId?: string
): Promise<void> {
  await api.post(`/api/tickets/${id}/reply`, { messageText, isInternalNote, userId });
}

export async function updateTicketStatus(
  id: string,
  status: string,
  userId?: string
): Promise<Ticket> {
  const res = await api.patch(`/api/tickets/${id}/status`, { status, userId });
  return res.data;
}

// ==================== COMPANIES CRUD ====================

export async function getCompanies(): Promise<Company[]> {
  const res = await api.get('/api/meta/companies');
  return res.data;
}

export async function createCompany(data: { name: string; code: string; contract_type?: string }): Promise<Company> {
  const res = await api.post('/api/meta/companies', data);
  return res.data;
}

export async function updateCompany(
  id: string,
  data: { name: string; code: string; contract_type?: string }
): Promise<Company> {
  const res = await api.put(`/api/meta/companies/${id}`, data);
  return res.data;
}

export async function deleteCompany(id: string): Promise<void> {
  await api.delete(`/api/meta/companies/${id}`);
}

// ==================== AGENTS CRUD ====================

export async function getAgents(): Promise<User[]> {
  const res = await api.get('/api/meta/agents');
  return res.data;
}

export async function createAgent(data: { name: string; email: string; role?: string }): Promise<User> {
  const res = await api.post('/api/meta/agents', data);
  return res.data;
}

export async function updateAgent(
  id: string,
  data: { name: string; email: string; role?: string }
): Promise<User> {
  const res = await api.put(`/api/meta/agents/${id}`, data);
  return res.data;
}

export async function deleteAgent(id: string): Promise<void> {
  await api.delete(`/api/meta/agents/${id}`);
}

export async function toggleAgentStatus(id: string): Promise<User> {
  const res = await api.patch(`/api/meta/agents/${id}/status`);
  return res.data;
}

// ==================== MODULES & STATS ====================

export async function getModules(): Promise<ErpModule[]> {
  const res = await api.get('/api/meta/modules');
  return res.data;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const res = await api.get('/api/meta/stats');
  return res.data;
}

// ==================== LEGACY MANTIS API ====================

export async function searchLegacyIssues(params: {
  q?: string;
  project_id?: number | string;
  has_notes?: boolean | number | string;
  limit?: number;
}): Promise<LegacyIssue[]> {
  const res = await api.get('/api/legacy/search', { params });
  return res.data;
}

export async function getLegacyIssueDetail(id: number | string): Promise<LegacyIssueDetail> {
  const res = await api.get(`/api/legacy/issues/${id}`);
  return res.data;
}

export async function getLegacyProjects(): Promise<LegacyProject[]> {
  const res = await api.get('/api/legacy/projects');
  return res.data;
}

export async function getLegacyStats(): Promise<LegacyStats> {
  const res = await api.get('/api/legacy/stats');
  return res.data;
}

// ==================== AI COPILOT & KNOWLEDGE API ====================

export async function getRecurringClusters(): Promise<GoldenSop[]> {
  const res = await api.get('/api/ai/clusters');
  return res.data;
}

export async function getGoldenSopDetail(clusterId: string): Promise<GoldenSop> {
  const res = await api.get(`/api/ai/clusters/${clusterId}`);
  return res.data;
}

export async function diagnoseWithAi(text: string): Promise<AiDiagnosisResult> {
  const res = await api.post('/api/ai/diagnose', { text });
  return res.data;
}
