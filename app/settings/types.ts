// Structured types for Logic
export interface Condition {
  id: string;
  field: string;
  operator: string;
  value: string;
}

export interface Action {
  id: string;
  action: string;
  details?: string;
}

export interface InstructionLogic {
  when: string;
  conditions: Condition[];
  actions: Action[];
}

// Simulation types
export interface SimulationSummary {
  invoicesEvaluated: number;
  wouldApply: number;
  autoApply: number;
  suggest: number;
  observe: number;
}

export interface SimulationInvoice {
  id: string;
  invoiceNumber: string;
  supplier: string;
  date: string;
  amount: string;
  outcome: 'Would auto-approve' | 'Would suggest' | 'No action';
  hasConflict: boolean;
  conflictWith?: string;
  explanation: string;
}

// Live activity types
export interface LiveSummary {
  triggersLast24h: number;
  autoApplied: number;
  overriddenByAP: number;
  avgDecisionTime: string;
}

export interface LiveEvent {
  id: string;
  time: string;
  invoiceNumber: string;
  supplier: string;
  action: 'Auto-approve' | 'Suggest' | 'Observe' | 'Skipped';
  outcome: 'Accepted' | 'Overridden' | 'Pending';
  hasConflict: boolean;
  explanation: string;
}

// Instruction type
export interface Instruction {
  id: string;
  name: string;
  type: 'automation' | 'exception' | 'routing' | 'validation';
  status: 'Active' | 'Draft' | 'Paused';
  agent: string;
  stage: string;
  processed: number;
  success: number;
  failed: number;
  scope: string;
  mode: string;
  description: string;
  confidence: number;
  avgTime: string;
  integrations?: string[];
  recentActivity: {
    status: 'success' | 'warning' | 'error';
    message: string;
  }[];
  // Fields for detail modal
  naturalLanguage?: string;
  logicSummary?: string;  // Human-readable summary for NL mode
  logic?: InstructionLogic;
  entities?: string[];
  vendors?: string[];
  // Conflict detection
  conflictsCount?: number;
  conflictsSummary?: string;
  // Simulation data
  simulationSummary?: SimulationSummary;
  simulationInvoices?: SimulationInvoice[];
  // Live activity data
  liveSummary?: LiveSummary;
  liveEvents?: LiveEvent[];
}

// Dropdown options constants
export const ENTITY_OPTIONS = [
  'All entities',
  'Acme UK',
  'Acme US',
  'Acme Germany',
  'Subsidiary A',
];

export const VENDOR_OPTIONS = [
  'All vendors',
  'Trusted vendors',
  'New vendors',
  'High-risk vendors',
  'Preferred vendors',
];

export const MODE_OPTIONS = [
  { value: 'Observe', label: 'Observe only', description: 'Monitor without taking action' },
  { value: 'Suggest', label: 'Suggest', description: 'Recommend actions for review' },
  { value: 'Auto-apply', label: 'Auto-apply', description: 'Execute actions automatically' },
];

export const FIELD_OPTIONS = ['Vendor', 'Amount', 'Invoice type', 'Exception type', 'Cost center', 'Invoice number'];

export const OPERATOR_OPTIONS = ['equals', 'contains', 'is in', 'is not', '=', '<', '>', '<=', '>='];

export const ACTION_OPTIONS = [
  'Auto-approve invoice',
  'Flag exception',
  'Route to approver',
  'Send email notification',
  'Add to queue',
  'Convert units',
  'Skip manual review',
  'Notify assigned reviewer',
];

export const STAGE_OPTIONS = [
  'Invoice reaches Validation & Exceptions stage',
  'Invoice enters Non-PO Approval Workflow',
  'Invoice reaches PO Matching stage',
  'Invoice is created',
];
