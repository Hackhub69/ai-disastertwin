export interface Incident {
  id: string;
  title: string;
  description: string;
  incident_type: 'flood' | 'fire' | 'heatwave' | 'earthquake' | 'other';
  latitude: number;
  longitude: number;
  address: string;
  severity: number;
  priority_score: number;
  priority_level: 'critical' | 'high' | 'medium' | 'low';
  status: 'reported' | 'triaged' | 'dispatched' | 'resolved' | 'closed';
  source_type: 'manual' | 'api' | 'simulation' | 'sensor';
  is_demo: boolean;
  is_synthetic: boolean;
  data_confidence: number;
  affected_population?: number;
  reporter_name?: string;
  agent_notes?: string;
  score_components?: string;
  created_at: string;
  updated_at: string;
  triaged_at?: string;
}

export interface Resource {
  id: string;
  name: string;
  resource_type: 'ambulance' | 'rescue_team' | 'shelter' | 'fire_engine' | 'medical_supply' | 'water_tanker' | 'helicopter' | 'other';
  latitude: number;
  longitude: number;
  address: string;
  status: 'available' | 'deployed' | 'maintenance' | 'offline';
  capacity: number;
  current_load: number;
  is_demo: boolean;
  operator_name?: string;
  contact?: string;
  last_updated: string;
}

export interface ResourceRecommendation {
  id: string;
  incident_id: string;
  resource_id: string;
  resource_name?: string;
  resource_type?: string;
  recommendation_score: number;
  distance_km: number;
  reasoning: string;
  status: 'pending' | 'approved' | 'rejected' | 'withdrawn';
  recommended_at: string;
  decided_at?: string;
  decided_by?: string;
}

export interface AlertDraft {
  id: string;
  incident_id: string;
  content_en: string;
  content_hi: string;
  content_mr: string;
  status: 'draft' | 'approved' | 'rejected' | 'published';
  created_by: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  publication_note?: string;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  entity_type: string;
  entity_id: string;
  reason?: string;
  old_value?: any;
  new_value?: any;
  is_demo: boolean;
}

export type AuditLogEntry = AuditEvent;

export interface DashboardSummary {
  total_incidents: number;
  active_incidents: number;
  critical_incidents: number;
  available_resources: number;
  pending_approvals: number;
  incidents_by_severity: Record<string, number>;
  incidents_by_type: Record<string, number>;
  recent_incidents: Partial<Incident>[];
  recent_audit: Partial<AuditEvent>[];
}

export interface SimulationResult {
  session_id: string;
  name: string;
  scenario_type: string;
  intensity: number;
  status: string;
  incidents: Partial<Incident & { priority_level: string }>[];
  summary: {
    total_incidents: number;
    by_severity: Record<string, number>;
    critical_count: number;
    average_severity: number;
  };
  warning: string;
}

// Legacy alias
export type SimulationSession = SimulationResult;

export interface WeatherData {
  location: string;
  latitude: number;
  longitude: number;
  retrieved_at: string;
  current?: {
    temperature_c: number;
    precipitation_mm: number;
    windspeed_kmh: number;
    humidity_pct: number;
    weather_description: string;
  };
  data_notice?: string;
  error?: string;
  from_cache?: boolean;
}

export interface IntegrationStatus {
  openai: { configured: boolean; status: string; model?: string; note?: string };
  open_meteo: { configured: boolean; status: string; note?: string };
  nasa_firms: { configured: boolean; status: string; note?: string };
  database: { status: string; url_type?: string };
  demo_mode?: boolean;
  app_env?: string;
}

// ─── Rescue Response Types ────────────────────────────────────────────────────

export interface RescueTeam {
  id: string;
  name: string;
  team_code: string | null;
  team_leader: string | null;
  responder_count: number;
  skills: string[];
  equipment: string[];
  base_location: string | null;
  latitude: number | null;
  longitude: number | null;
  status: 'available' | 'deployed' | 'standby' | 'offline';
  specialty: string | null;
  contact_number: string | null;
  notes: string | null;
  is_demo: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface ResponsePlan {
  id: string;
  incident_id: string;
  situation_summary: string | null;
  known_hazards: string[];
  recommended_team_type: string | null;
  required_skills: string[];
  recommended_equipment: string[];
  action_checklist: Array<{step: number; title: string; description: string; category: string; is_mandatory: boolean; requires_approval?: boolean}>;
  coordination_instructions: string | null;
  external_services_needed: string[];
  uncertainties: string[];
  escalation_conditions: string[];
  additional_resources_needed: string[];
  generated_by: string | null;
  template_used: string | null;
  approval_status: 'draft' | 'approved' | 'rejected';
  approved_by: string | null;
  approved_at: string | null;
  is_demo: boolean;
  created_at: string | null;
}

export interface ChecklistItem {
  id: string;
  assignment_id: string | null;
  response_plan_id: string | null;
  step_number: number;
  title: string;
  description: string | null;
  category: string;
  is_mandatory: boolean;
  requires_approval: boolean;
  completed: boolean;
  completed_by: string | null;
  completed_at: string | null;
  notes: string | null;
  is_demo: boolean;
}

export interface TimelineEvent {
  id: string;
  old_status: string | null;
  new_status: string;
  updated_by: string;
  notes: string | null;
  timestamp: string;
}

export interface TeamMessage {
  id: string;
  assignment_id: string | null;
  incident_id: string | null;
  message_type: string;
  content_en: string | null;
  content_hi: string | null;
  content_mr: string | null;
  status: 'draft' | 'approved' | 'sent' | 'simulated';
  created_by: string;
  approved_by: string | null;
  approved_at: string | null;
  sent_at: string | null;
  delivery_note: string | null;
  is_demo: boolean;
  created_at: string | null;
}

export interface RescueAssignment {
  id: string;
  incident_id: string;
  incident_title: string | null;
  incident_type: string | null;
  team_id: string;
  team_name: string | null;
  team_code: string | null;
  response_plan_id: string | null;
  status: string;
  recommended_by: string;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  priority_at_assignment: string | null;
  notes: string | null;
  completion_report: Record<string, unknown>;
  resources_used: string[];
  people_assisted: number;
  outstanding_risks: string | null;
  is_demo: boolean;
  created_at: string | null;
  updated_at: string | null;
  completed_at: string | null;
  checklist: ChecklistItem[];
  timeline: TimelineEvent[];
}

export interface RescueDashboard {
  active_plans: number;
  teams_available: number;
  teams_deployed: number;
  pending_approvals: number;
  active_assignments: number;
  pending_messages: number;
}
