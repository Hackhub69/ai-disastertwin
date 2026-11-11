import axios from 'axios';
import type {
  Incident,
  Resource,
  DashboardSummary,
  AlertDraft,
  AuditEvent,
  SimulationSession,
  IntegrationStatus,
  WeatherData,
  ResourceRecommendation,
  RescueTeam,
  RescueAssignment,
  ResponsePlan,
  ChecklistItem,
  TeamMessage,
  RescueDashboard,
} from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Dashboard
export const getDashboardSummary = () => api.get<DashboardSummary>('/dashboard').then(r => r.data);

// Incidents
export const getIncidents = (params?: Record<string, any>) => api.get<{items: Incident[], total: number, page: number}>('/incidents', { params }).then(r => r.data);
export const getIncident = (id: string) => api.get<Incident>(`/incidents/${id}`).then(r => r.data);
export const createIncident = (data: Partial<Incident>) => api.post<Incident>('/incidents', data).then(r => r.data);
export const updateIncident = (id: string, data: Partial<Incident>) => api.patch<Incident>(`/incidents/${id}`, data).then(r => r.data);
export const triageIncident = (id: string) => api.post<any>(`/incidents/${id}/triage`).then(r => r.data);

// Resources
export const getResources = (params?: Record<string, any>) => api.get<{items: Resource[], total: number}>('/resources', { params }).then(r => r.data);
export const createResource = (data: Partial<Resource>) => api.post<Resource>('/resources', data).then(r => r.data);

// Recommendations
export const getRecommendations = (incidentId: string) => api.post<{candidates: ResourceRecommendation[]}>('/recommendations', { incident_id: incidentId }).then(r => r.data);
export const approveRecommendation = (recommendationId: string, decision: 'approved' | 'rejected', decidedBy: string, reason: string) =>
  api.post('/approvals', { recommendation_id: recommendationId, decision, decided_by: decidedBy, reason }).then(r => r.data);

// Alerts
export const getAlerts = () => api.get<{items: AlertDraft[], total: number}>('/alerts').then(r => r.data);
export const createAlertDraft = (incidentId: string, createdBy: string = 'operator') =>
  api.post<AlertDraft>('/alerts/draft', { incident_id: incidentId, created_by: createdBy }).then(r => r.data);
export const approveAlert = (alertId: string, decision: string, decidedBy: string, note: string = '') =>
  api.post(`/alerts/${alertId}/approve`, { decision, decided_by: decidedBy, note }).then(r => r.data);

// Simulations
export const createSimulation = (data: { scenario_type: string; intensity: number; num_locations: number; num_resources: number; name?: string }) =>
  api.post<any>('/simulations', data).then(r => r.data);
export const getSimulation = (id: string) => api.get<SimulationSession>(`/simulations/${id}`).then(r => r.data);

// Audit
export const getAuditLog = (params?: Record<string, any>) => api.get<{items: AuditEvent[], total: number}>('/audit', { params }).then(r => r.data);

// Integrations
export const getIntegrationStatus = () => api.get<IntegrationStatus>('/integrations/status').then(r => r.data);

// Weather
export const getWeather = (lat: number, lon: number, locationName: string = '') =>
  api.get<WeatherData>('/weather', { params: { lat, lon, location_name: locationName } }).then(r => r.data);

// Health
export const getHealth = () => api.get('/health').then(r => r.data);

// ─── Rescue Response API ──────────────────────────────────────────────────────

export const rescueApi = {
  getDashboard: (): Promise<RescueDashboard> =>
    api.get<RescueDashboard>('/rescue/dashboard').then(r => r.data),

  // Teams
  getTeams: (params?: {status?: string; specialty?: string}): Promise<RescueTeam[]> =>
    api.get<RescueTeam[]>('/rescue/teams', { params }).then(r => r.data),
  createTeam: (data: Partial<RescueTeam>): Promise<RescueTeam> =>
    api.post<RescueTeam>('/rescue/teams', data).then(r => r.data),
  updateTeam: (id: string, data: {status?: string; notes?: string}): Promise<RescueTeam> =>
    api.patch<RescueTeam>(`/rescue/teams/${id}`, data).then(r => r.data),

  // Plans
  getPlans: (params?: {incident_id?: string; approval_status?: string}): Promise<ResponsePlan[]> =>
    api.get<ResponsePlan[]>('/rescue/plans', { params }).then(r => r.data),
  generatePlan: (incident_id: string): Promise<ResponsePlan> =>
    api.post<ResponsePlan>('/rescue/plans', { incident_id }).then(r => r.data),
  approvePlan: (id: string, action: 'approve' | 'reject', approved_by: string): Promise<ResponsePlan> =>
    api.patch<ResponsePlan>(`/rescue/plans/${id}/approve`, { action, approved_by }).then(r => r.data),

  // Assignments
  getAssignments: (params?: {status?: string; incident_id?: string}): Promise<RescueAssignment[]> =>
    api.get<RescueAssignment[]>('/rescue/assignments', { params }).then(r => r.data),
  createAssignment: (data: {incident_id: string; team_id: string; response_plan_id?: string; notes?: string}): Promise<RescueAssignment> =>
    api.post<RescueAssignment>('/rescue/assignments', data).then(r => r.data),
  getAssignment: (id: string): Promise<RescueAssignment> =>
    api.get<RescueAssignment>(`/rescue/assignments/${id}`).then(r => r.data),
  approveAssignment: (id: string, action: 'approve' | 'reject', approved_by: string, rejection_reason?: string): Promise<RescueAssignment> =>
    api.post<RescueAssignment>(`/rescue/assignments/${id}/approve`, { action, approved_by, rejection_reason }).then(r => r.data),
  updateAssignmentStatus: (id: string, new_status: string, updated_by?: string): Promise<RescueAssignment> =>
    api.patch<RescueAssignment>(`/rescue/assignments/${id}/status`, { new_status, updated_by: updated_by || 'operator' }).then(r => r.data),
  completeAssignment: (id: string, data: {people_assisted: number; outstanding_risks?: string; notes?: string}): Promise<RescueAssignment> =>
    api.post<RescueAssignment>(`/rescue/assignments/${id}/complete`, data).then(r => r.data),

  // Checklist
  updateChecklistItem: (item_id: string, completed: boolean, notes?: string): Promise<ChecklistItem> =>
    api.patch<ChecklistItem>(`/rescue/checklist/${item_id}`, { completed, completed_by: 'operator', notes }).then(r => r.data),

  // Messages
  generateMessage: (data: {message_type: string; assignment_id?: string; incident_id?: string; extra?: Record<string, string>}): Promise<TeamMessage> =>
    api.post<TeamMessage>('/rescue/messages', data).then(r => r.data),
  getMessages: (assignment_id: string): Promise<TeamMessage[]> =>
    api.get<TeamMessage[]>(`/rescue/assignments/${assignment_id}/messages`).then(r => r.data),
  approveMessage: (id: string, action: 'approve' | 'reject', approved_by: string): Promise<TeamMessage> =>
    api.post<TeamMessage>(`/rescue/messages/${id}/approve`, { action, approved_by }).then(r => r.data),
};

export default api;
