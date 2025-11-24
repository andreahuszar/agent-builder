/**
 * AI Agent Panel - Type Definitions
 *
 * Data models for the Invoice Agent's summary, insights, and chat functionality.
 * These are used for mocked Agent responses based on front-end invoice state.
 */

export type AgentMessageRole = 'system' | 'agent' | 'user';

export type AgentMessageKind = 'summary' | 'insight' | 'chat';

export type AgentInsightSeverity = 'info' | 'warning' | 'error';

export type AgentInsightStatus = 'open' | 'inProgress' | 'resolved';

export type AgentInsightType = 'exception' | 'training';

export interface AgentMessage {
  id: string;
  role: AgentMessageRole;
  createdAt: string; // ISO string
  content: string;
  kind?: AgentMessageKind;
  insightId?: string; // Links to AgentInsight if kind === 'insight'
}

export interface AgentInsight {
  id: string;
  type: AgentInsightType;
  title: string;
  description: string;
  severity: AgentInsightSeverity;
  status: AgentInsightStatus;
  relatedFieldId?: string; // e.g. 'job_number', 'invoice_number', 'vendor_tax_id_snapshot'
  learnedValue?: string; // For training insights: the value that was learned
}

/**
 * Exception data structure (reused from existing front-end exception system)
 */
export interface InvoiceException {
  id?: string;
  type: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  fieldName?: string;
  lineNumber?: number;
  suggestedValue?: string;
}

/**
 * Per-invoice Agent state stored in session
 */
export interface AgentSessionState {
  invoiceId: string;
  messages: AgentMessage[];
  insights: AgentInsight[];
  initialized: boolean; // Whether initial summary has been generated
}
