'use client';

import { useState, useEffect, Fragment, useRef } from 'react';
import { createPortal } from 'react-dom';
import AppLayout from '@/app/components/AppLayout';
import {
  Bot,
  Pencil,
  Copy,
  Trash2,
  Check,
  AlertTriangle,
  Users,
  Shield,
  ChevronRight,
  Play,
  Circle,
  Clock,
  Zap,
  Mail,
  Database,
  X,
  MessageSquare,
  Plus,
  Minus,
  Sparkles,
  Send,
  Building2,
  Calendar,
  DollarSign,
  FileText,
  Loader2,
  Undo2
} from 'lucide-react';
import {
  getChartsInDrawerPreference,
  setChartsInDrawerPreference,
  getPOVisibilityPreference,
  setPOVisibilityPreference,
  getLaunchpadVisibilityPreference,
  setLaunchpadVisibilityPreference,
  getExceptionNavigationPreference,
  setExceptionNavigationPreference,
  getInvoiceAgentPreference,
  setInvoiceAgentPreference
} from '@/app/utils/cookies';

// Stat Card Component
function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}

// Structured types for Logic
interface Condition {
  id: string;
  field: string;
  operator: string;
  value: string;
}

interface Action {
  id: string;
  action: string;
  details?: string;
}

interface InstructionLogic {
  when: string;
  conditions: Condition[];
  actions: Action[];
}

// Dropdown options constants
const ENTITY_OPTIONS = [
  'All entities',
  'Acme UK',
  'Acme US',
  'Acme Germany',
  'Subsidiary A',
];

const VENDOR_OPTIONS = [
  'All vendors',
  'Trusted vendors',
  'New vendors',
  'High-risk vendors',
  'Preferred vendors',
];

const MODE_OPTIONS = [
  { value: 'Observe', label: 'Observe only', description: 'Monitor without taking action' },
  { value: 'Suggest', label: 'Suggest', description: 'Recommend actions for review' },
  { value: 'Auto-apply', label: 'Auto-apply', description: 'Execute actions automatically' },
];

const FIELD_OPTIONS = ['Vendor', 'Amount', 'Invoice type', 'Exception type', 'Cost center', 'Invoice number'];

const OPERATOR_OPTIONS = ['equals', 'contains', 'is in', 'is not', '=', '<', '>', '<=', '>='];

const ACTION_OPTIONS = [
  'Auto-approve invoice',
  'Flag exception',
  'Route to approver',
  'Send email notification',
  'Add to queue',
  'Convert units',
  'Skip manual review',
  'Notify assigned reviewer',
];

const STAGE_OPTIONS = [
  'Invoice reaches Validation & Exceptions stage',
  'Invoice enters Non-PO Approval Workflow',
  'Invoice reaches PO Matching stage',
  'Invoice is created',
];

// Simulation types
interface SimulationSummary {
  invoicesEvaluated: number;
  wouldApply: number;
  autoApply: number;
  suggest: number;
  observe: number;
}

interface SimulationInvoice {
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
interface LiveSummary {
  triggersLast24h: number;
  autoApplied: number;
  overriddenByAP: number;
  avgDecisionTime: string;
}

interface LiveEvent {
  id: string;
  time: string;
  invoiceNumber: string;
  supplier: string;
  action: 'Auto-approve' | 'Suggest' | 'Observe' | 'Skipped';
  outcome: 'Accepted' | 'Overridden' | 'Pending';
  hasConflict: boolean;
  explanation: string;
}

// Mock Instructions Data
interface Instruction {
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

const mockInstructions: Instruction[] = [
  {
    id: '1',
    name: 'Auto-approve small vendors',
    type: 'automation',
    status: 'Active',
    agent: 'Validation Agent',
    stage: 'Validation & Exceptions',
    processed: 1234,
    success: 1180,
    failed: 54,
    scope: 'Trusted vendors • Amount < 500',
    mode: 'Suggest',
    description: 'Automatically approve invoices under $500 from trusted vendors',
    confidence: 95,
    avgTime: '320ms',
    integrations: [],
    recentActivity: [
      { status: 'success', message: 'Successfully processed invoice #4821' },
      { status: 'success', message: 'Validated vendor ABC Corp' },
      { status: 'warning', message: 'Warning: Amount exceeds threshold' },
    ],
    naturalLanguage: 'When an invoice arrives from a trusted vendor and the total is under $500, automatically approve it without manual review.',
    logicSummary: 'When an invoice arrives from a trusted vendor and the total is under $500, automatically approve it without manual review.',
    logic: {
      when: 'Invoice reaches Validation & Exceptions stage',
      conditions: [
        { id: 'c1-1', field: 'Vendor', operator: 'is in', value: 'Trusted vendors list' },
        { id: 'c1-2', field: 'Amount', operator: '<', value: '500' },
      ],
      actions: [
        { id: 'a1-1', action: 'Auto-approve invoice', details: '' },
        { id: 'a1-2', action: 'Skip manual review', details: '' },
      ],
    },
    entities: ['All entities'],
    vendors: ['Trusted vendors'],
    conflictsCount: 0,
    simulationSummary: {
      invoicesEvaluated: 2134,
      wouldApply: 182,
      autoApply: 120,
      suggest: 62,
      observe: 0,
    },
    simulationInvoices: [
      {
        id: 'sim-1',
        invoiceNumber: 'INV-2025-001',
        supplier: 'Acme Corp',
        date: '2025-01-15',
        amount: '$450.00',
        outcome: 'Would auto-approve',
        hasConflict: false,
        explanation: 'Matched because vendor is trusted and amount ($450) < $500.',
      },
      {
        id: 'sim-2',
        invoiceNumber: 'INV-2025-002',
        supplier: 'TechSupply Inc',
        date: '2025-01-14',
        amount: '$320.00',
        outcome: 'Would auto-approve',
        hasConflict: false,
        explanation: 'Vendor is in trusted list, amount ($320) is under threshold.',
      },
      {
        id: 'sim-3',
        invoiceNumber: 'INV-2025-003',
        supplier: 'Office Depot',
        date: '2025-01-13',
        amount: '$499.99',
        outcome: 'Would auto-approve',
        hasConflict: true,
        conflictWith: 'Flag duplicate invoices',
        explanation: 'Would approve but conflicts with duplicate detection rule.',
      },
      {
        id: 'sim-4',
        invoiceNumber: 'INV-2025-004',
        supplier: 'New Vendor LLC',
        date: '2025-01-12',
        amount: '$250.00',
        outcome: 'No action',
        hasConflict: false,
        explanation: 'Vendor is not in trusted list, instruction does not apply.',
      },
      {
        id: 'sim-5',
        invoiceNumber: 'INV-2025-005',
        supplier: 'Acme Corp',
        date: '2025-01-11',
        amount: '$750.00',
        outcome: 'Would suggest',
        hasConflict: false,
        explanation: 'Vendor is trusted but amount ($750) exceeds $500 threshold.',
      },
    ],
    liveSummary: {
      triggersLast24h: 42,
      autoApplied: 30,
      overriddenByAP: 3,
      avgDecisionTime: '1.2s',
    },
    liveEvents: [
      {
        id: 'live-1',
        time: '14:32:15',
        invoiceNumber: 'INV-2025-089',
        supplier: 'TechSupply Inc',
        action: 'Auto-approve',
        outcome: 'Accepted',
        hasConflict: false,
        explanation: 'Vendor is in trusted list, amount $320 is under threshold.',
      },
      {
        id: 'live-2',
        time: '14:28:42',
        invoiceNumber: 'INV-2025-088',
        supplier: 'Acme Corp',
        action: 'Auto-approve',
        outcome: 'Accepted',
        hasConflict: false,
        explanation: 'Matched: trusted vendor, amount $480 < $500.',
      },
      {
        id: 'live-3',
        time: '14:15:03',
        invoiceNumber: 'INV-2025-087',
        supplier: 'Office Depot',
        action: 'Auto-approve',
        outcome: 'Overridden',
        hasConflict: true,
        explanation: 'Auto-approved but AP overrode due to duplicate suspicion.',
      },
      {
        id: 'live-4',
        time: '13:58:21',
        invoiceNumber: 'INV-2025-086',
        supplier: 'TechSupply Inc',
        action: 'Suggest',
        outcome: 'Pending',
        hasConflict: false,
        explanation: 'Amount $520 slightly over threshold, suggested for review.',
      },
      {
        id: 'live-5',
        time: '13:42:09',
        invoiceNumber: 'INV-2025-085',
        supplier: 'Acme Corp',
        action: 'Auto-approve',
        outcome: 'Accepted',
        hasConflict: false,
        explanation: 'Trusted vendor, amount $199 well under threshold.',
      },
    ],
  },
  {
    id: '2',
    name: 'Flag duplicate invoices',
    type: 'exception',
    status: 'Active',
    agent: 'Validation Agent',
    stage: 'Validation & Exceptions',
    processed: 892,
    success: 880,
    failed: 12,
    scope: 'All vendors • 30-day window',
    mode: 'Suggest',
    description: 'Detect and flag potential duplicate invoices within 30-day window',
    confidence: 78,
    avgTime: '450ms',
    integrations: [],
    recentActivity: [
      { status: 'success', message: 'Flagged duplicate INV-2024-8832' },
      { status: 'error', message: 'Failed to process batch #442' },
      { status: 'success', message: 'Cleared 12 false positives' },
    ],
    naturalLanguage: 'Check all incoming invoices against invoices received in the last 30 days. If a potential duplicate is found based on vendor, amount, and invoice number similarity, flag it for manual review.',
    logicSummary: 'Check all incoming invoices against invoices received in the last 30 days. If a potential duplicate is found, flag it for manual review.',
    logic: {
      when: 'Invoice reaches Validation & Exceptions stage',
      conditions: [
        { id: 'c2-1', field: 'Invoice number', operator: 'contains', value: 'existing pattern' },
        { id: 'c2-2', field: 'Vendor', operator: 'equals', value: 'Same vendor (30-day window)' },
        { id: 'c2-3', field: 'Amount', operator: 'equals', value: 'within 1% tolerance' },
      ],
      actions: [
        { id: 'a2-1', action: 'Flag exception', details: 'Potential duplicate' },
        { id: 'a2-2', action: 'Add to queue', details: 'Exception queue' },
        { id: 'a2-3', action: 'Notify assigned reviewer', details: '' },
      ],
    },
    entities: ['All entities'],
    vendors: ['All vendors'],
    conflictsCount: 1,
    conflictsSummary: "overlaps with 'Auto-approve small vendors'",
  },
  {
    id: '3',
    name: 'Route to department heads',
    type: 'routing',
    status: 'Active',
    agent: 'Routing Agent',
    stage: 'Non-PO Approval Workflow',
    processed: 567,
    success: 539,
    failed: 28,
    scope: 'Invoices > $5,000',
    mode: 'Suggest',
    description: 'Route invoices over $5000 to respective department heads for approval',
    confidence: 92,
    avgTime: '180ms',
    integrations: ['EMAIL'],
    recentActivity: [
      { status: 'success', message: 'Routed INV-2024-9001 to Finance' },
      { status: 'success', message: 'Notified J. Smith via email' },
      { status: 'warning', message: 'Pending approval for 3 invoices' },
    ],
    naturalLanguage: 'For non-PO invoices exceeding $5,000, automatically route to the appropriate department head based on the cost center. Send email notification to the approver.',
    logicSummary: 'For non-PO invoices exceeding $5,000, automatically route to the appropriate department head and send email notification.',
    logic: {
      when: 'Invoice enters Non-PO Approval Workflow',
      conditions: [
        { id: 'c3-1', field: 'Amount', operator: '>', value: '5000' },
        { id: 'c3-2', field: 'Invoice type', operator: 'equals', value: 'Non-PO' },
        { id: 'c3-3', field: 'Cost center', operator: 'is not', value: 'empty' },
      ],
      actions: [
        { id: 'a3-1', action: 'Route to approver', details: 'Department head' },
        { id: 'a3-2', action: 'Send email notification', details: 'Approver' },
      ],
    },
    entities: ['All entities'],
    vendors: ['All vendors'],
    conflictsCount: 0,
  },
  {
    id: '4',
    name: 'Validate PO matching',
    type: 'validation',
    status: 'Active',
    agent: 'Matching Agent',
    stage: 'PO Matching',
    processed: 2341,
    success: 2015,
    failed: 326,
    scope: 'All PO invoices • 3% tolerance',
    mode: 'Suggest',
    description: 'Check all invoices against purchase orders with 3% tolerance',
    confidence: 88,
    avgTime: '520ms',
    integrations: ['ERP'],
    recentActivity: [
      { status: 'success', message: 'Matched INV-2024-9102 to PO-8821' },
      { status: 'error', message: 'Variance exceeded on INV-2024-9098' },
      { status: 'success', message: 'Auto-resolved 15 minor variances' },
    ],
    naturalLanguage: 'Match all invoices with referenced purchase orders from the ERP system. Allow a 3% variance tolerance for price differences. Auto-resolve minor variances and flag significant mismatches.',
    logicSummary: 'Match all invoices with referenced purchase orders, allowing 3% variance tolerance. Auto-resolve minor variances and flag significant mismatches.',
    logic: {
      when: 'Invoice reaches PO Matching stage',
      conditions: [
        { id: 'c4-1', field: 'Invoice type', operator: 'equals', value: 'PO Invoice' },
        { id: 'c4-2', field: 'Amount', operator: '<=', value: '3% variance' },
      ],
      actions: [
        { id: 'a4-1', action: 'Auto-approve invoice', details: 'If variance ≤ 3%' },
        { id: 'a4-2', action: 'Flag exception', details: 'If variance > 3%' },
      ],
    },
    entities: ['All entities'],
    vendors: ['All vendors'],
    conflictsCount: 0,
  },
];

// Hexagon Icon Component - SVG-based with gradient and shadow
function HexagonIcon({ type }: { type: Instruction['type'] }) {
  const colorMap = {
    automation: {
      gradient: ['#4ade80', '#16a34a'], // green-400 → green-600
      shadow: 'rgba(74, 222, 128, 0.3)',
    },
    exception: {
      gradient: ['#fb923c', '#ea580c'], // orange-400 → orange-600
      shadow: 'rgba(251, 146, 60, 0.3)',
    },
    routing: {
      gradient: ['#c084fc', '#9333ea'], // purple-400 → purple-600
      shadow: 'rgba(192, 132, 252, 0.3)',
    },
    validation: {
      gradient: ['#60a5fa', '#2563eb'], // blue-400 → blue-600
      shadow: 'rgba(96, 165, 250, 0.3)',
    },
  };

  const colors = colorMap[type];
  const gradientId = `hex-gradient-${type}`;

  // SVG hexagon path
  const hexPath = "M 36.027 11.2 Q 39.491 13.2 39.491 17.2 L 39.491 30.8 Q 39.491 34.8 36.027 36.8 L 24.249 43.6 Q 20.785 45.6 17.321 43.6 L 5.543 36.8 Q 2.078 34.8 2.078 30.8 L 2.078 17.2 Q 2.078 13.2 5.543 11.2 L 17.321 4.4 Q 20.785 2.4 24.249 4.4 Z";

  // Icon paths for each type (white stroke icons)
  const iconPaths: Record<string, React.ReactNode> = {
    automation: (
      // CircleCheckBig icon
      <>
        <path d="M21.801 10A10 10 0 1 1 17 3.335" />
        <path d="m9 11 3 3L22 4" />
      </>
    ),
    exception: (
      // AlertCircle icon
      <>
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </>
    ),
    routing: (
      // Users icon
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    validation: (
      // Shield icon
      <>
        <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      </>
    ),
  };

  return (
    <div
      className="relative flex-shrink-0 transition-all duration-200 hover:scale-105"
      style={{
        width: '32px',
        height: '37px',
        filter: `drop-shadow(${colors.shadow} 0px 3px 4px)`,
      }}
    >
      <svg
        width="32"
        height="37"
        viewBox="0 0 41.569 48"
        className="transition-all duration-200"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors.gradient[0]} />
            <stop offset="100%" stopColor={colors.gradient[1]} />
          </linearGradient>
        </defs>
        <path
          d={hexPath}
          fill={`url(#${gradientId})`}
          className="transition-all duration-200"
        />
        <foreignObject x="10" y="13" width="22" height="22">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {iconPaths[type]}
          </svg>
        </foreignObject>
      </svg>
    </div>
  );
}

// Confidence Bar Component
function ConfidenceBar({ value }: { value: number }) {
  const getBarColor = (val: number) => {
    if (val >= 80) return 'bg-green-500';
    if (val >= 60) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${getBarColor(value)}`}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-xs font-medium text-gray-700">{value}%</span>
    </div>
  );
}

// Type Pill Component
function TypePill({ type }: { type: Instruction['type'] }) {
  const styles = {
    automation: 'bg-gray-100 text-gray-700 border border-gray-300',
    exception: 'bg-gray-100 text-gray-700 border border-gray-300',
    routing: 'bg-gray-100 text-gray-700 border border-gray-300',
    validation: 'bg-gray-100 text-gray-700 border border-gray-300',
  };

  // Capitalize first letter
  const label = type.charAt(0).toUpperCase() + type.slice(1);

  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium ${styles[type]}`}>
      {label}
    </span>
  );
}

// Integration Pill Component
function IntegrationPill({ name }: { name: string }) {
  const iconMap: Record<string, React.ReactNode> = {
    EMAIL: <Mail className="w-2.5 h-2.5 mr-0.5" />,
    ERP: <Database className="w-2.5 h-2.5 mr-0.5" />,
  };

  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
      {iconMap[name]}
      {name}
    </span>
  );
}

// Status Pill Component
function StatusPill({ status }: { status: Instruction['status'] }) {
  const styles = {
    Active: 'bg-green-100 text-green-700 border border-green-300',
    Draft: 'bg-gray-100 text-gray-600 border border-gray-300',
    Paused: 'bg-yellow-100 text-yellow-700 border border-yellow-300',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[status]}`}>
      {status}
    </span>
  );
}

// Activity Status Dot Component
function ActivityDot({ status }: { status: 'success' | 'warning' | 'error' }) {
  const colors = {
    success: 'bg-green-500',
    warning: 'bg-amber-500',
    error: 'bg-red-500',
  };

  return <span className={`inline-block w-2 h-2 rounded-full ${colors[status]}`} />;
}

// Animated Text Component - word by word animation
function AnimatedText({ text, speed = 50 }: { text: string; speed?: number }) {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    setDisplayedText('');
    setIsComplete(false);

    const words = text.split(' ');
    let currentIndex = 0;

    const interval = setInterval(() => {
      if (currentIndex < words.length) {
        setDisplayedText(words.slice(0, currentIndex + 1).join(' '));
        currentIndex++;
      } else {
        clearInterval(interval);
        setIsComplete(true);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed]);

  return (
    <span>
      {displayedText}
      {!isComplete && <span className="animate-pulse">|</span>}
    </span>
  );
}

// Instruction Detail Modal Component
interface InstructionDetailModalProps {
  instruction: Instruction;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedInstruction: Instruction) => void;
}

function InstructionDetailModal({ instruction, isOpen, onClose, onSave }: InstructionDetailModalProps) {
  // Edit mode state: 'assistant' (default) or 'manual'
  const [editMode, setEditMode] = useState<'assistant' | 'manual'>('assistant');

  // Basic fields state (for manual mode)
  const [editedName, setEditedName] = useState(instruction.name);
  const [editedDescription, setEditedDescription] = useState(instruction.description);

  // Scope & Mode state (for manual mode)
  const [editedEntities, setEditedEntities] = useState<string[]>(instruction.entities || ['All entities']);
  const [editedVendors, setEditedVendors] = useState<string[]>(instruction.vendors || ['All vendors']);
  const [editedMode, setEditedMode] = useState(instruction.mode || 'Suggest');

  // Logic state (for manual mode)
  const [editedWhen, setEditedWhen] = useState(instruction.logic?.when || '');
  const [editedConditions, setEditedConditions] = useState<Condition[]>(instruction.logic?.conditions || []);
  const [editedActions, setEditedActions] = useState<Action[]>(instruction.logic?.actions || []);

  // Collapsible Details section state (for manual mode, collapsed by default)
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Rationale expansion state (for assistant mode)
  const [rationaleOpen, setRationaleOpen] = useState(false);

  // Tab state for modal sections
  const [activeTab, setActiveTab] = useState<'instruction' | 'simulation' | 'live'>('instruction');

  // Simulation tab state
  const [simulationRange, setSimulationRange] = useState('last-30');
  const [hasSimulated, setHasSimulated] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  // Expandable row states for tables
  const [expandedSimRow, setExpandedSimRow] = useState<string | null>(null);
  const [expandedLiveRow, setExpandedLiveRow] = useState<string | null>(null);

  // Demo invoice drawer state
  const [demoInvoiceDrawerOpen, setDemoInvoiceDrawerOpen] = useState(false);
  const [demoDrawerVisible, setDemoDrawerVisible] = useState(false);

  // Demo invoice data for simulation/live activity preview
  const demoInvoice = {
    id: 'demo-invoice-1',
    invoice_number: 'INV-2025-0042',
    vendor_name_snapshot: 'Office Supplies Inc.',
    invoice_date: '2025-01-15',
    due_date: '2025-02-15',
    currency: 'USD',
    total: 4250.00,
    subtotal: 3500.00,
    tax_total: 750.00,
    status: 'processing',
    match_status: 'matched',
    department: 'Operations'
  };

  // Chat state with action support
  const [chatMessages, setChatMessages] = useState<Array<{
    id: string;
    type: 'assistant' | 'user';
    content: string;
    action?: {
      type: 'confirm_amount_change';
      label: string;
      newAmount: number;
    };
  }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [isGreetingComplete, setIsGreetingComplete] = useState(false);
  const [showTryPill, setShowTryPill] = useState(false);
  const [displayedGreeting, setDisplayedGreeting] = useState('');
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Interactive demo state for Non-PO and Amount scenarios
  const [ruleOverlayActive, setRuleOverlayActive] = useState(false);
  const [showNewCondition, setShowNewCondition] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [invoiceTypeLabel, setInvoiceTypeLabel] = useState('Invoice type');
  const [awaitingAmountChange, setAwaitingAmountChange] = useState(false);
  const [currentAmount, setCurrentAmount] = useState(500);

  // Greeting text for animated display
  const greetingText = "I can help you refine this instruction.\n\nAsk me anything, describe changes you'd like, or click a line on the left to modify it directly.";

  // Reset form when instruction changes
  useEffect(() => {
    setEditMode('assistant'); // Reset to assistant mode
    setEditedName(instruction.name);
    setEditedDescription(instruction.description);
    setEditedEntities(instruction.entities || ['All entities']);
    setEditedVendors(instruction.vendors || ['All vendors']);
    setEditedMode(instruction.mode || 'Suggest');
    setEditedWhen(instruction.logic?.when || '');
    setEditedConditions(instruction.logic?.conditions || []);
    setEditedActions(instruction.logic?.actions || []);
    setDetailsOpen(false); // Reset to collapsed
    setRationaleOpen(false); // Reset rationale to collapsed
    setActiveTab('instruction'); // Reset to instruction tab
    setHasSimulated(false); // Reset simulation state
    setIsSimulating(false);
    setExpandedSimRow(null); // Reset expanded rows
    setExpandedLiveRow(null);
    // Reset chat state
    setChatMessages([]);
    setChatInput('');
    setDisplayedGreeting('');
    setIsGreetingComplete(false);
    setShowTryPill(false);
    // Reset interactive demo state
    setRuleOverlayActive(false);
    setShowNewCondition(false);
    setCanUndo(false);
    setInvoiceTypeLabel('Invoice type');
    setAwaitingAmountChange(false);
    setCurrentAmount(500);
  }, [instruction]);

  // Greeting animation - word by word like ChatGPT
  useEffect(() => {
    if (!isOpen) return;

    const words = greetingText.split(' ');
    let currentIndex = 0;

    const interval = setInterval(() => {
      if (currentIndex < words.length) {
        setDisplayedGreeting(words.slice(0, currentIndex + 1).join(' '));
        currentIndex++;
      } else {
        clearInterval(interval);
        setIsGreetingComplete(true);
        // Delay before showing Try pill
        setTimeout(() => setShowTryPill(true), 300);
      }
    }, 50); // 50ms per word

    return () => clearInterval(interval);
  }, [instruction.id, isOpen]);

  // Auto-scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [chatMessages, displayedGreeting]);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Helper functions for editing conditions and actions
  const addCondition = () => {
    setEditedConditions([...editedConditions, {
      id: `c${Date.now()}`,
      field: 'Vendor',
      operator: 'equals',
      value: '',
    }]);
  };

  const updateCondition = (id: string, updates: Partial<Condition>) => {
    setEditedConditions(editedConditions.map(c =>
      c.id === id ? { ...c, ...updates } : c
    ));
  };

  const removeCondition = (id: string) => {
    setEditedConditions(editedConditions.filter(c => c.id !== id));
  };

  const addAction = () => {
    setEditedActions([...editedActions, {
      id: `a${Date.now()}`,
      action: 'Auto-approve invoice',
      details: '',
    }]);
  };

  const updateAction = (id: string, updates: Partial<Action>) => {
    setEditedActions(editedActions.map(a =>
      a.id === id ? { ...a, ...updates } : a
    ));
  };

  const removeAction = (id: string) => {
    setEditedActions(editedActions.filter(a => a.id !== id));
  };

  // Get action text based on mode
  const getModeActionText = (mode: string): string => {
    switch (mode) {
      case 'Observe':
        return 'Monitor activity, Log for review';
      case 'Suggest':
        return 'Suggest approval, Flag for review';
      case 'Auto-apply':
        return 'Auto-approve invoice, Skip manual review';
      default:
        return instruction.logic?.actions?.map(a => a.action).join(', ') || 'No actions';
    }
  };

  // Helper for multi-select
  const addEntity = (entity: string) => {
    if (!editedEntities.includes(entity)) {
      setEditedEntities([...editedEntities, entity]);
    }
  };

  const removeEntity = (entity: string) => {
    setEditedEntities(editedEntities.filter(e => e !== entity));
  };

  const addVendor = (vendor: string) => {
    if (!editedVendors.includes(vendor)) {
      setEditedVendors([...editedVendors, vendor]);
    }
  };

  const removeVendor = (vendor: string) => {
    setEditedVendors(editedVendors.filter(v => v !== vendor));
  };

  // Handler for Non-PO scenario
  const handleNonPoScenario = () => {
    // First response: explain what will happen
    setTimeout(() => {
      setChatMessages(prev => [...prev, {
        id: Date.now().toString(),
        type: 'assistant',
        content: "I'll add a new condition to filter for Non-PO backed invoices. Let me update the instruction...",
      }]);

      // Rename Invoice type to Invoice timing
      setInvoiceTypeLabel('Invoice timing');

      // Start overlay animation
      setRuleOverlayActive(true);

      // After 5 seconds, show the new condition
      setTimeout(() => {
        setRuleOverlayActive(false);
        setShowNewCondition(true);
        setCanUndo(true);

        // Final confirmation message
        setChatMessages(prev => [...prev, {
          id: Date.now().toString(),
          type: 'assistant',
          content: "Done! I've added an AND condition for Non-PO backed invoices. Please review the updated instruction above. You can click Undo if you'd like to revert this change.",
        }]);
      }, 5000);
    }, 1000);
  };

  // Handler for Amount row click
  const handleModifyAmountClick = () => {
    setAwaitingAmountChange(true);
    setChatMessages(prev => [...prev, {
      id: Date.now().toString(),
      type: 'assistant',
      content: `This condition checks if the invoice amount is less than $${currentAmount}. What would you like to change the threshold to?`,
    }]);
  };

  // Handler for amount change confirmation
  const handleAmountChangeConfirm = (userMessage: string) => {
    const match = userMessage.match(/\d+/);
    if (match) {
      const newAmount = parseInt(match[0], 10);

      setTimeout(() => {
        setChatMessages(prev => [...prev, {
          id: Date.now().toString(),
          type: 'assistant',
          content: `I'll change the amount threshold from $${currentAmount} to $${newAmount}.`,
          action: {
            type: 'confirm_amount_change' as const,
            label: 'Change Instruction',
            newAmount,
          }
        }]);
      }, 1000);
    }
  };

  // Apply amount change with animation
  const applyAmountChange = (newAmount: number) => {
    setRuleOverlayActive(true);
    setAwaitingAmountChange(false);

    // Clear the action from the message to hide the Apply button
    setChatMessages(prev => prev.map(msg =>
      msg.action ? { ...msg, action: undefined } : msg
    ));

    setTimeout(() => {
      setRuleOverlayActive(false);
      setCurrentAmount(newAmount);
      setCanUndo(true);

      setChatMessages(prev => [...prev, {
        id: Date.now().toString(),
        type: 'assistant',
        content: `Done! The amount threshold has been updated to $${newAmount}. Please review the change above.`,
      }]);
    }, 3000);
  };

  // Undo handler
  const handleUndo = () => {
    if (showNewCondition) {
      // Undo the Non-PO condition (but keep Invoice timing rename)
      setShowNewCondition(false);
      setCanUndo(false);
      setChatMessages(prev => [...prev, {
        id: Date.now().toString(),
        type: 'assistant',
        content: "I've removed the Non-PO backed condition. The instruction has been reverted.",
      }]);
    } else if (currentAmount !== 500) {
      // Undo amount change
      setCurrentAmount(500);
      setCanUndo(false);
      setChatMessages(prev => [...prev, {
        id: Date.now().toString(),
        type: 'assistant',
        content: "I've reverted the amount threshold back to $500.",
      }]);
    }
  };

  // Chat submit handler with pattern detection
  const handleChatSubmit = () => {
    if (!chatInput.trim()) return;

    const userMessage = chatInput.trim();
    const lowerMessage = userMessage.toLowerCase();
    setChatInput('');
    setShowTryPill(false);

    // Add user message
    setChatMessages(prev => [...prev, {
      id: Date.now().toString(),
      type: 'user',
      content: userMessage,
    }]);

    // Scenario 1: Detect "non po" or "non-po"
    if (lowerMessage.includes('non po') || lowerMessage.includes('non-po') || lowerMessage.includes('nonpo')) {
      handleNonPoScenario();
      return;
    }

    // Scenario 2: Detect number when awaiting amount change
    if (awaitingAmountChange && /\d+/.test(lowerMessage)) {
      handleAmountChangeConfirm(userMessage);
      return;
    }

    // Default response
    setTimeout(() => {
      setChatMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: "I understand. I'll update the instruction to reflect your request. Here's what I'll change...",
      }]);
    }, 1000);
  };

  const handleSave = () => {
    // Generate scope string from entities/vendors
    const scopeParts = [];
    if (editedVendors.length > 0 && !editedVendors.includes('All vendors')) {
      scopeParts.push(editedVendors.join(', '));
    } else if (editedVendors.includes('All vendors')) {
      scopeParts.push('All vendors');
    }
    if (editedEntities.length > 0 && !editedEntities.includes('All entities')) {
      scopeParts.push(editedEntities.join(', '));
    }

    const updated: Instruction = {
      ...instruction,
      name: editedName,
      description: editedDescription,
      entities: editedEntities,
      vendors: editedVendors,
      mode: editedMode,
      scope: scopeParts.length > 0 ? scopeParts.join(' • ') : instruction.scope,
      logic: {
        when: editedWhen,
        conditions: editedConditions,
        actions: editedActions,
      },
    };
    console.log('Saving instruction:', updated);
    onSave(updated);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/50"
      style={{ zIndex: 10000 }}
      onClick={handleBackdropClick}
    >
      <div className="flex flex-col w-[96vw] max-w-[1800px] h-[95vh] bg-white rounded-xl shadow-2xl overflow-hidden">
        {/* Header - Full Width */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-gray-900">{instruction.name}</h2>
              <StatusPill status={instruction.status} />
            </div>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm font-medium text-purple-700 bg-white border border-purple-300 rounded-md hover:bg-purple-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-3 py-1.5 text-sm font-medium text-white bg-purple-900 rounded-md hover:bg-purple-800 transition-colors"
            >
              Save
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body - Two Column Layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Side - Content */}
          <div className="flex-1 overflow-y-auto p-6 min-w-0">
            <div className="space-y-4">
              {/* Tab Bar */}
              <div className="flex border-b border-gray-200">
                {[
                  { id: 'instruction' as const, label: 'Instruction' },
                  { id: 'simulation' as const, label: 'Simulation' },
                  { id: 'live' as const, label: 'Live activity' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                      activeTab === tab.id
                        ? 'border-purple-600 text-purple-600'
                        : 'border-transparent text-gray-800 hover:text-gray-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Instruction Tab Content */}
              {activeTab === 'instruction' && (
                <>
              {/* Assistant Mode: Review Current Instruction Read-Only Card */}
              {editMode === 'assistant' && (
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-semibold text-gray-900">Current instruction</h3>
                    {canUndo && (
                      <button
                        onClick={handleUndo}
                        className="text-xs text-purple-600 hover:text-purple-800 flex items-center gap-1 transition-colors"
                      >
                        <Undo2 className="w-3 h-3" />
                        Undo
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-800 mb-3">This is how the agent currently interprets this instruction.</p>

                  {/* Enhanced WHEN/IF/THEN display with overlay support */}
                  <div className="space-y-1 text-sm bg-purple-50 rounded-lg p-4 relative">
                    {/* Overlay animation during updates */}
                    {ruleOverlayActive && (
                      <div className="absolute inset-0 bg-purple-200/60 backdrop-blur-[1px] rounded-lg flex items-center justify-center z-10">
                        <div className="flex items-center gap-2 text-purple-800">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span className="text-sm font-medium">Updating instruction...</span>
                        </div>
                      </div>
                    )}
                    {/* Summary sentence - dynamic based on amount changes */}
                    <div className="flex items-start gap-2 mb-3 pb-3 border-b border-purple-200">
                      <Zap className="w-4 h-4 text-purple-900 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-gray-900">
                        {currentAmount !== 500
                          ? `Automatically approve invoices under $${currentAmount} from trusted vendors`
                          : instruction.description}
                      </p>
                    </div>
                    {/* WHEN */}
                    <button className="group w-full flex items-start gap-2 -mx-2 px-2 py-1.5 rounded-md hover:bg-purple-200/80 transition-colors text-left cursor-pointer">
                      <span className="inline-block text-xs font-semibold text-purple-800 bg-purple-200 px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5 group-hover:ring-1 group-hover:ring-white/70 transition-shadow">
                        WHEN
                      </span>
                      <span className="text-gray-900 flex-1">{instruction.logic?.when || 'Invoice is processed'}</span>
                      <span className="text-xs text-purple-500 group-hover:text-purple-800 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 font-medium inline-flex items-center gap-1 self-center">
                        Modify line in assistant
                        <Sparkles className="w-3 h-3" />
                      </span>
                    </button>

                    {/* IF with AND conditions and grouping */}
                    <button className="group w-full flex items-start gap-2 -mx-2 px-2 py-1.5 rounded-md hover:bg-purple-200/80 transition-colors text-left cursor-pointer">
                      <span className="inline-block text-xs font-semibold text-blue-800 bg-blue-200 px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5 group-hover:ring-1 group-hover:ring-white/70 transition-shadow">
                        IF
                      </span>
                      <span className="flex-1">
                        <span className="border-b border-dotted border-gray-500" title="Click to see vendor list">
                          Vendor
                        </span>
                        {' '}is in{' '}
                        <span className="border-b border-dotted border-gray-500" title="Acme Corp, TechSupply Inc, Office Depot...">
                          Trusted vendors list
                        </span>
                      </span>
                      <span className="text-xs text-purple-500 group-hover:text-purple-800 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 font-medium inline-flex items-center gap-1 self-center">
                        Modify line in assistant
                        <Sparkles className="w-3 h-3" />
                      </span>
                    </button>

                    {/* AND condition - Amount (clickable for demo) */}
                    <button
                      onClick={handleModifyAmountClick}
                      className={`group w-full flex items-center gap-2 -mx-2 px-2 py-1.5 rounded-md hover:bg-purple-200/80 transition-colors pl-6 text-left cursor-pointer ${currentAmount !== 500 ? 'bg-purple-200/50' : ''}`}
                    >
                      {currentAmount !== 500 && (
                        <span className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0" aria-label="Modified" />
                      )}
                      <span className="text-xs font-medium text-gray-700 bg-gray-200 px-1.5 py-0.5 rounded group-hover:ring-1 group-hover:ring-white/70 transition-shadow">AND</span>
                      <span className="flex-1">
                        <span className="border-b border-dotted border-gray-500" title="Invoice total amount">
                          Amount
                        </span>
                        {' '}&lt;{' '}
                        <span className={`border-b border-dotted border-gray-500 transition-all duration-500 ${currentAmount !== 500 ? 'font-medium text-purple-700' : ''}`} title="Currency: USD">
                          ${currentAmount}
                        </span>
                      </span>
                      <span className="text-xs text-purple-500 group-hover:text-purple-800 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 font-medium inline-flex items-center gap-1 self-center">
                        Modify line in assistant
                        <Sparkles className="w-3 h-3" />
                      </span>
                    </button>

                    {/* AND with grouped OR conditions - Invoice timing (renamed from Invoice type) */}
                    <button className="group w-full flex items-start gap-2 -mx-2 px-2 py-1.5 rounded-md hover:bg-purple-200/80 transition-colors pl-6 text-left cursor-pointer">
                      <span className="text-xs font-medium text-gray-700 bg-gray-200 px-1.5 py-0.5 rounded flex-shrink-0 group-hover:ring-1 group-hover:ring-white/70 transition-shadow">AND</span>
                      <div className="border-l-2 border-gray-300 pl-3 space-y-1 flex-1">
                        <div>
                          <span className="border-b border-dotted border-gray-500" title="Invoice document type">
                            {invoiceTypeLabel}
                          </span>
                          {' '}={' '}
                          <span className="border-b border-dotted border-gray-500" title="Standard invoice">
                            Standard
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-amber-800 bg-amber-200 px-1.5 py-0.5 rounded group-hover:ring-1 group-hover:ring-white/70 transition-shadow">OR</span>
                          <span>
                            <span className="border-b border-dotted border-gray-500" title="Invoice document type">
                              {invoiceTypeLabel}
                            </span>
                            {' '}={' '}
                            <span className="border-b border-dotted border-gray-500" title="Recurring monthly invoice">
                              Recurring
                            </span>
                          </span>
                        </div>
                      </div>
                      <span className="text-xs text-purple-500 group-hover:text-purple-800 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 font-medium inline-flex items-center gap-1 self-center">
                        Modify line in assistant
                        <Sparkles className="w-3 h-3" />
                      </span>
                    </button>

                    {/* New AND condition - Non-PO backed (animated entry) */}
                    {showNewCondition && (
                      <button className="group w-full flex items-center gap-2 -mx-2 px-2 py-1.5 rounded-md hover:bg-purple-200/80 transition-colors pl-6 text-left cursor-pointer animate-[slideIn_0.5s_ease-out_forwards] bg-purple-200/50">
                        <span className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0" aria-label="Modified" />
                        <span className="text-xs font-medium text-gray-700 bg-gray-200 px-1.5 py-0.5 rounded group-hover:ring-1 group-hover:ring-white/70 transition-shadow">AND</span>
                        <span className="flex-1">
                          <span className="border-b border-dotted border-gray-500">Invoice type</span>
                          {' '}={' '}
                          <span className="border-b border-dotted border-gray-500 font-medium text-purple-700">Non-PO backed</span>
                        </span>
                        <span className="text-xs text-purple-500 group-hover:text-purple-800 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 font-medium inline-flex items-center gap-1 self-center">
                          Modify line in assistant
                          <Sparkles className="w-3 h-3" />
                        </span>
                      </button>
                    )}

                    {/* THEN - dynamic based on mode */}
                    <button className="group w-full flex items-start gap-2 -mx-2 px-2 py-1.5 rounded-md hover:bg-purple-200/80 transition-colors text-left cursor-pointer">
                      <span className="inline-block text-xs font-semibold text-green-800 bg-green-200 px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5 group-hover:ring-1 group-hover:ring-white/70 transition-shadow">
                        THEN
                      </span>
                      <span className="text-gray-900 flex-1 transition-all duration-200">
                        {getModeActionText(editedMode)}
                      </span>
                      <span className="text-xs text-purple-500 group-hover:text-purple-800 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 font-medium inline-flex items-center gap-1 self-center">
                        Modify line in assistant
                        <Sparkles className="w-3 h-3" />
                      </span>
                    </button>
                  </div>

                  {/* Conflict status */}
                  <div className="flex items-center gap-2 mt-3">
                    {instruction.conflictsCount === 0 ? (
                      <>
                        <span className="w-2 h-2 bg-green-500 rounded-full" />
                        <span className="text-xs text-gray-800">No conflicts detected with other instructions.</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-xs text-amber-700">
                          {instruction.conflictsCount} potential conflict{instruction.conflictsCount > 1 ? 's' : ''} detected
                          {instruction.conflictsSummary && ` – ${instruction.conflictsSummary}`}.
                        </span>
                      </>
                    )}
                  </div>

                  {/* Expandable Agent Rationale */}
                  <div className="mt-4 border-t border-gray-200 pt-3">
                    <button
                      onClick={() => setRationaleOpen(!rationaleOpen)}
                      className="flex items-center gap-1.5 text-xs text-purple-900 hover:text-purple-800 transition-colors"
                    >
                      <ChevronRight
                        className={`w-3.5 h-3.5 transition-transform duration-200 ${rationaleOpen ? 'rotate-90' : ''}`}
                      />
                      <span className="font-medium">Why this rule?</span>
                      <span className="text-purple-700">Agent rationale</span>
                    </button>

                    {rationaleOpen && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-md text-xs space-y-3">
                        {/* Original query */}
                        <div>
                          <span className="font-semibold text-gray-900 block mb-1">Original request:</span>
                          <p className="text-gray-700 italic">
                            &ldquo;Auto-approve small invoices from our trusted vendors, but only for standard or recurring invoices under $500&rdquo;
                          </p>
                        </div>

                        {/* Agent reasoning */}
                        <div>
                          <span className="font-semibold text-gray-900 block mb-1">Agent reasoning:</span>
                          <ul className="text-gray-700 space-y-1.5 list-disc list-inside">
                            <li>
                              Added <span className="font-medium text-gray-900">Trusted vendors list</span> check to ensure only pre-approved vendors qualify
                            </li>
                            <li>
                              Set amount threshold at <span className="font-medium text-gray-900">$500</span> as specified for &ldquo;small invoices&rdquo;
                            </li>
                            <li>
                              Created <span className="font-medium text-gray-900">OR group</span> for invoice types to allow both Standard and Recurring
                            </li>
                            <li>
                              Actions will <span className="font-medium text-gray-900">auto-approve</span> and <span className="font-medium text-gray-900">skip manual review</span> to speed up processing
                            </li>
                          </ul>
                        </div>

                        {/* Confidence indicator */}
                        <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                          <span className="text-gray-600">Confidence:</span>
                          <div className="flex items-center gap-1">
                            <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div className="w-[95%] h-full bg-green-500 rounded-full" />
                            </div>
                            <span className="text-green-600 font-medium">95%</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Helper text */}
                  <p className="mt-3 text-xs text-gray-600">
                    To change this instruction, describe what you want in the assistant on the right. You do not need to edit anything here.
                  </p>
                </div>
              )}

              {/* Mode Section - Visible in assistant mode only */}
              {editMode === 'assistant' && (
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Mode</h3>
                  <div className="flex gap-2">
                    {MODE_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setEditedMode(option.value)}
                        className={`flex-1 px-3 py-1.5 rounded-lg text-left transition-colors border-2 flex flex-col gap-0 ${
                          editedMode === option.value
                            ? 'bg-purple-50 border-purple-600'
                            : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <span className={`text-xs font-semibold flex items-center justify-between ${
                          editedMode === option.value ? 'text-purple-900' : 'text-gray-900'
                        }`}>
                          {option.label}
                          {editedMode === option.value && <Check className="w-3.5 h-3.5 text-purple-600" />}
                        </span>
                        <span className={`text-xs ${
                          editedMode === option.value ? 'text-purple-600' : 'text-gray-500'
                        }`}>{option.description}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Manual Mode: Editing UI */}
              {editMode === 'manual' && (
                <>
                  {/* Collapsible Details Section */}
                  <div className="rounded-lg border border-gray-200 bg-white">
                    <button
                      onClick={() => setDetailsOpen(!detailsOpen)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <ChevronRight
                          className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${detailsOpen ? 'rotate-90' : ''}`}
                        />
                        <div className="text-left">
                          <span className="text-sm font-semibold text-gray-900">Details</span>
                          <span className="text-xs text-gray-500 ml-2">Name & description</span>
                        </div>
                      </div>
                      {!detailsOpen && editedName && (
                        <span className="text-sm text-gray-500 truncate max-w-[200px]">{editedName}</span>
                      )}
                    </button>
                    {detailsOpen && (
                      <div className="px-4 pb-4 pt-1 space-y-3 border-t border-gray-100">
                        <div>
                          <label htmlFor="instruction-name" className="block text-sm font-medium text-gray-700 mb-1">
                            Name
                          </label>
                          <input
                            type="text"
                            id="instruction-name"
                            value={editedName}
                            onChange={(e) => setEditedName(e.target.value)}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label htmlFor="instruction-description" className="block text-sm font-medium text-gray-700 mb-1">
                            Description
                          </label>
                          <textarea
                            id="instruction-description"
                            value={editedDescription}
                            onChange={(e) => setEditedDescription(e.target.value)}
                            rows={2}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none resize-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Logic Section - WHEN/IF/THEN Builder */}
                  <div className="rounded-lg border border-gray-200 bg-white p-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Logic</h3>
                    <p className="text-xs text-gray-500 mb-3">
                      Technical structure used by the agent.
                    </p>

                    <div className="space-y-4">
                      {/* WHEN */}
                      <div>
                        <span className="inline-block text-xs font-semibold text-purple-700 bg-purple-100 px-2 py-0.5 rounded mb-2">
                          WHEN
                        </span>
                        <select
                          value={editedWhen}
                          onChange={(e) => setEditedWhen(e.target.value)}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 bg-gray-50 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                        >
                          {STAGE_OPTIONS.map((stage) => (
                            <option key={stage} value={stage}>{stage}</option>
                          ))}
                        </select>
                      </div>

                      {/* IF - Conditions */}
                      <div>
                        <span className="inline-block text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded mb-2">
                          IF
                        </span>
                        <div className="space-y-2">
                          {editedConditions.map((condition) => (
                            <div key={condition.id} className="flex items-center gap-2 bg-gray-50 rounded-md p-2">
                              <select
                                value={condition.field}
                                onChange={(e) => updateCondition(condition.id, { field: e.target.value })}
                                className="flex-shrink-0 w-[130px] rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                              >
                                {FIELD_OPTIONS.map((field) => (
                                  <option key={field} value={field}>{field}</option>
                                ))}
                              </select>
                              <select
                                value={condition.operator}
                                onChange={(e) => updateCondition(condition.id, { operator: e.target.value })}
                                className="flex-shrink-0 w-[100px] rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                              >
                                {OPERATOR_OPTIONS.map((op) => (
                                  <option key={op} value={op}>{op}</option>
                                ))}
                              </select>
                              <input
                                type="text"
                                value={condition.value}
                                onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
                                className="flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                                placeholder="Value..."
                              />
                              <button
                                onClick={() => removeCondition(condition.id)}
                                className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={addCondition}
                            className="inline-flex items-center gap-1 text-sm text-purple-600 hover:text-purple-800 mt-1"
                          >
                            <Plus className="w-4 h-4" />
                            Add condition
                          </button>
                        </div>
                      </div>

                      {/* THEN - Actions */}
                      <div>
                        <span className="inline-block text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded mb-2">
                          THEN
                        </span>
                        <div className="space-y-2">
                          {editedActions.map((action) => (
                            <div key={action.id} className="flex items-center gap-2 bg-gray-50 rounded-md p-2">
                              <select
                                value={action.action}
                                onChange={(e) => updateAction(action.id, { action: e.target.value })}
                                className="flex-shrink-0 w-[180px] rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                              >
                                {ACTION_OPTIONS.map((act) => (
                                  <option key={act} value={act}>{act}</option>
                                ))}
                              </select>
                              <input
                                type="text"
                                value={action.details || ''}
                                onChange={(e) => updateAction(action.id, { details: e.target.value })}
                                className="flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                                placeholder="Details (optional)..."
                              />
                              <button
                                onClick={() => removeAction(action.id)}
                                className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={addAction}
                            className="inline-flex items-center gap-1 text-sm text-purple-600 hover:text-purple-800 mt-1"
                          >
                            <Plus className="w-4 h-4" />
                            Add action
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Scope & Mode Section */}
                  <div className="rounded-lg border border-gray-200 bg-white p-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Scope & mode</h3>
                    <div className="space-y-4">
                      {/* Entities */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Entities</label>
                        <div className="flex flex-wrap gap-2 p-2 border border-gray-300 rounded-md min-h-[44px] bg-white">
                          {editedEntities.map((entity) => (
                            <span
                              key={entity}
                              className="inline-flex items-center px-2.5 py-1 bg-purple-100 text-purple-800 rounded-md text-sm"
                            >
                              {entity}
                              <button
                                onClick={() => removeEntity(entity)}
                                className="ml-1.5 text-purple-600 hover:text-purple-900"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </span>
                          ))}
                          <select
                            onChange={(e) => {
                              if (e.target.value) {
                                addEntity(e.target.value);
                                e.target.value = '';
                              }
                            }}
                            className="border-0 bg-transparent text-sm text-gray-500 focus:ring-0 cursor-pointer"
                            defaultValue=""
                          >
                            <option value="" disabled>Add entity...</option>
                            {ENTITY_OPTIONS.filter(e => !editedEntities.includes(e)).map((entity) => (
                              <option key={entity} value={entity}>{entity}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Vendors */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Vendors</label>
                        <div className="flex flex-wrap gap-2 p-2 border border-gray-300 rounded-md min-h-[44px] bg-white">
                          {editedVendors.map((vendor) => (
                            <span
                              key={vendor}
                              className="inline-flex items-center px-2.5 py-1 bg-purple-100 text-purple-800 rounded-md text-sm"
                            >
                              {vendor}
                              <button
                                onClick={() => removeVendor(vendor)}
                                className="ml-1.5 text-purple-600 hover:text-purple-900"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </span>
                          ))}
                          <select
                            onChange={(e) => {
                              if (e.target.value) {
                                addVendor(e.target.value);
                                e.target.value = '';
                              }
                            }}
                            className="border-0 bg-transparent text-sm text-gray-500 focus:ring-0 cursor-pointer"
                            defaultValue=""
                          >
                            <option value="" disabled>Add vendor...</option>
                            {VENDOR_OPTIONS.filter(v => !editedVendors.includes(v)).map((vendor) => (
                              <option key={vendor} value={vendor}>{vendor}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Mode */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">Mode</label>
                        <div className="space-y-3">
                          {MODE_OPTIONS.map((option) => (
                            <label key={option.value} className="flex items-start gap-3 cursor-pointer">
                              <input
                                type="radio"
                                name="mode"
                                value={option.value}
                                checked={editedMode === option.value}
                                onChange={(e) => setEditedMode(e.target.value)}
                                className="mt-0.5 w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                              />
                              <div>
                                <span className="text-sm font-medium text-gray-900">{option.label}</span>
                                <p className="text-sm text-gray-500">{option.description}</p>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
              </>
              )}

              {/* Simulation Tab Content */}
              {activeTab === 'simulation' && (
                <div className="space-y-4">
                  <div className="rounded-lg border border-gray-200 bg-white p-4">
                    <h3 className="text-sm font-semibold text-gray-900">Simulation</h3>
                    <p className="text-xs text-gray-500 mb-4">
                      See how this instruction would have behaved on past invoices.
                    </p>

                    {/* Controls Row */}
                    <div className="flex items-center gap-3 mb-4">
                      <select
                        value={simulationRange}
                        onChange={(e) => setSimulationRange(e.target.value)}
                        className="text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none"
                      >
                        <option value="last-7">Last 7 days</option>
                        <option value="last-30">Last 30 days</option>
                        <option value="last-90">Last 90 days</option>
                      </select>
                      <button
                        onClick={() => {
                          setIsSimulating(true);
                          setHasSimulated(false);
                          setTimeout(() => {
                            setIsSimulating(false);
                            setHasSimulated(true);
                          }, 1500);
                        }}
                        disabled={isSimulating}
                        className="px-3 py-1.5 text-sm bg-purple-900 text-white rounded-md hover:bg-purple-800 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {isSimulating && (
                          <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        )}
                        {isSimulating ? 'Running...' : 'Run simulation'}
                      </button>
                    </div>

                    {/* Loading state */}
                    {isSimulating && (
                      <div className="py-12 flex flex-col items-center justify-center gap-3">
                        <svg className="animate-spin h-8 w-8 text-purple-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <p className="text-sm text-gray-500">Evaluating past invoices...</p>
                      </div>
                    )}

                    {hasSimulated && instruction.simulationSummary && (
                      <>
                        {/* KPIs Row */}
                        <div className="grid grid-cols-3 gap-3 mb-4">
                          <div className="p-3 bg-gray-50 rounded-md">
                            <p className="text-xs text-gray-500">Invoices evaluated</p>
                            <p className="text-lg font-semibold text-gray-900">
                              {instruction.simulationSummary.invoicesEvaluated.toLocaleString()}
                            </p>
                          </div>
                          <div className="p-3 bg-gray-50 rounded-md">
                            <p className="text-xs text-gray-500">Would apply</p>
                            <p className="text-lg font-semibold text-gray-900">
                              {instruction.simulationSummary.wouldApply}
                            </p>
                          </div>
                          <div className="p-3 bg-gray-50 rounded-md">
                            <p className="text-xs text-gray-500">Actions</p>
                            <p className="text-xs text-gray-700">
                              Auto: {instruction.simulationSummary.autoApply} • Suggest: {instruction.simulationSummary.suggest} • Observe: {instruction.simulationSummary.observe}
                            </p>
                          </div>
                        </div>

                        {/* Results Table */}
                        <div className="border border-gray-200 rounded-md overflow-hidden">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Invoice</th>
                                <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Supplier</th>
                                <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Date</th>
                                <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Amount</th>
                                <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Outcome</th>
                                <th className="w-8"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {instruction.simulationInvoices?.map((inv) => (
                                <Fragment key={inv.id}>
                                  <tr className="border-t border-gray-100 hover:bg-gray-50">
                                    <td className="px-3 py-2 font-medium text-gray-900">{inv.invoiceNumber}</td>
                                    <td className="px-3 py-2 text-gray-600">{inv.supplier}</td>
                                    <td className="px-3 py-2 text-gray-600">{inv.date}</td>
                                    <td className="px-3 py-2 text-gray-600">{inv.amount}</td>
                                    <td className="px-3 py-2">
                                      <span className="inline-flex items-center gap-1">
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                                          inv.outcome === 'Would auto-approve' ? 'bg-green-100 text-green-700' :
                                          inv.outcome === 'Would suggest' ? 'bg-blue-100 text-blue-700' :
                                          'bg-gray-100 text-gray-600'
                                        }`}>
                                          {inv.outcome}
                                        </span>
                                        {inv.hasConflict && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2">
                                      <button
                                        onClick={() => setExpandedSimRow(expandedSimRow === inv.id ? null : inv.id)}
                                        className="p-1 hover:bg-gray-100 rounded"
                                      >
                                        <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${expandedSimRow === inv.id ? 'rotate-90' : ''}`} />
                                      </button>
                                    </td>
                                  </tr>
                                  {expandedSimRow === inv.id && (
                                    <tr>
                                      <td colSpan={6} className="px-3 py-3 bg-gray-50 border-t border-gray-100">
                                        <p className="text-xs text-gray-600 mb-2">{inv.explanation}</p>
                                        {inv.hasConflict && inv.conflictWith && (
                                          <p className="text-xs text-amber-600 mb-2">
                                            <AlertTriangle className="w-3 h-3 inline mr-1" />
                                            Conflicts with: {inv.conflictWith}
                                          </p>
                                        )}
                                        <button
                                          onClick={() => {
                                            setDemoInvoiceDrawerOpen(true);
                                            setTimeout(() => setDemoDrawerVisible(true), 10);
                                          }}
                                          className="text-xs text-purple-600 hover:underline"
                                        >
                                          Open invoice
                                        </button>
                                      </td>
                                    </tr>
                                  )}
                                </Fragment>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Live Activity Tab Content */}
              {activeTab === 'live' && (
                <div className="space-y-4">
                  <div className="rounded-lg border border-gray-200 bg-white p-4">
                    <h3 className="text-sm font-semibold text-gray-900">Live activity</h3>
                    <p className="text-xs text-gray-500 mb-4">
                      Monitor recent triggers for this instruction.
                    </p>

                    {instruction.liveSummary && (
                      <>
                        {/* KPI Row */}
                        <div className="grid grid-cols-4 gap-3 mb-4">
                          <div className="p-3 bg-gray-50 rounded-md">
                            <p className="text-xs text-gray-500">Triggers (24h)</p>
                            <p className="text-lg font-semibold text-gray-900">
                              {instruction.liveSummary.triggersLast24h}
                            </p>
                          </div>
                          <div className="p-3 bg-gray-50 rounded-md">
                            <p className="text-xs text-gray-500">Auto-applied</p>
                            <p className="text-lg font-semibold text-gray-900">
                              {instruction.liveSummary.autoApplied}
                            </p>
                          </div>
                          <div className="p-3 bg-gray-50 rounded-md">
                            <p className="text-xs text-gray-500">Overridden</p>
                            <p className="text-lg font-semibold text-gray-900">
                              {instruction.liveSummary.overriddenByAP}
                            </p>
                          </div>
                          <div className="p-3 bg-gray-50 rounded-md">
                            <p className="text-xs text-gray-500">Avg time</p>
                            <p className="text-lg font-semibold text-gray-900">
                              {instruction.liveSummary.avgDecisionTime}
                            </p>
                          </div>
                        </div>

                        {/* Recent Triggers Table */}
                        <div className="border border-gray-200 rounded-md overflow-hidden">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Time</th>
                                <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Invoice</th>
                                <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Supplier</th>
                                <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Action</th>
                                <th className="text-left px-3 py-2 text-xs font-medium text-gray-500">Outcome</th>
                                <th className="w-8"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {instruction.liveEvents?.map((event) => (
                                <Fragment key={event.id}>
                                  <tr className="border-t border-gray-100 hover:bg-gray-50">
                                    <td className="px-3 py-2 text-xs text-gray-500">{event.time}</td>
                                    <td className="px-3 py-2 font-medium text-gray-900">{event.invoiceNumber}</td>
                                    <td className="px-3 py-2 text-gray-600">{event.supplier}</td>
                                    <td className="px-3 py-2">
                                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                                        event.action === 'Auto-approve' ? 'bg-green-100 text-green-700' :
                                        event.action === 'Suggest' ? 'bg-blue-100 text-blue-700' :
                                        event.action === 'Observe' ? 'bg-gray-100 text-gray-600' :
                                        'bg-gray-100 text-gray-600'
                                      }`}>
                                        {event.action}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2">
                                      <span className={`inline-flex items-center gap-1 text-xs ${
                                        event.outcome === 'Accepted' ? 'text-green-600' :
                                        event.outcome === 'Overridden' ? 'text-amber-600' :
                                        'text-gray-500'
                                      }`}>
                                        {event.outcome}
                                        {event.hasConflict && <AlertTriangle className="w-3 h-3 text-amber-500" />}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2">
                                      <button
                                        onClick={() => setExpandedLiveRow(expandedLiveRow === event.id ? null : event.id)}
                                        className="p-1 hover:bg-gray-100 rounded"
                                      >
                                        <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${expandedLiveRow === event.id ? 'rotate-90' : ''}`} />
                                      </button>
                                    </td>
                                  </tr>
                                  {expandedLiveRow === event.id && (
                                    <tr>
                                      <td colSpan={6} className="px-3 py-3 bg-gray-50 border-t border-gray-100">
                                        <p className="text-xs text-gray-600 mb-2">{event.explanation}</p>
                                        <button
                                          onClick={() => {
                                            setDemoInvoiceDrawerOpen(true);
                                            setTimeout(() => setDemoDrawerVisible(true), 10);
                                          }}
                                          className="text-xs text-purple-600 hover:underline"
                                        >
                                          Open invoice
                                        </button>
                                      </td>
                                    </tr>
                                  )}
                                </Fragment>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Side - Agent Assistant (full height, left border only) */}
          <div className="w-[400px] flex flex-col border-l border-gray-200 bg-white flex-shrink-0">
          {/* Header - Fixed */}
          <div className="px-4 py-3 flex-shrink-0 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900 mb-0.5">Agent assistant</h3>

            {/* Tab-specific helper messaging */}
            {activeTab === 'instruction' && editMode === 'manual' && (
              <div className="mt-1.5 p-2 bg-amber-50 border border-amber-200 rounded-md">
                <p className="text-xs text-amber-700">
                  Assistant is paused while you edit manually. Your changes below will override any suggestions.
                </p>
              </div>
            )}

            {activeTab === 'instruction' && editMode === 'assistant' && (
              <p className="text-xs text-gray-500">Use the agent to update this instruction.</p>
            )}

            {(activeTab === 'simulation' || activeTab === 'live') && (
              <div className="mt-1.5 p-2 bg-gray-50 border border-gray-200 rounded-md">
                <p className="text-xs text-gray-600">
                  View-only. To change how this instruction behaves, go to the Instruction tab and use the agent there.
                </p>
              </div>
            )}
          </div>

          {/* Chat messages - Scrollable */}
          <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-4 py-4">
            <div className="space-y-4">
              {/* AI Greeting Message with word-by-word animation */}
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="flex-1">
                  <div className="text-sm text-gray-900">
                    {displayedGreeting.split('\n\n').map((part, i) => (
                      <p key={i} className={i > 0 ? 'mt-3' : ''}>
                        {part}
                        {i === displayedGreeting.split('\n\n').length - 1 && !isGreetingComplete && (
                          <span className="animate-pulse">|</span>
                        )}
                      </p>
                    ))}
                  </div>
                  {/* Try pill with fade-in animation - only shown on Instruction tab in assistant mode */}
                  {showTryPill && activeTab === 'instruction' && editMode === 'assistant' && (
                    <button
                      onClick={() => {
                        const tryMessage = "Also approve invoices up to $750 for Acme Corp.";
                        setShowTryPill(false);

                        // Add user message immediately
                        setChatMessages(prev => [...prev, {
                          id: Date.now().toString(),
                          type: 'user',
                          content: tryMessage,
                        }]);

                        // Simulate agent response after delay
                        setTimeout(() => {
                          setChatMessages(prev => [...prev, {
                            id: (Date.now() + 1).toString(),
                            type: 'assistant',
                            content: "I understand. I'll update the instruction to reflect your request. Here's what I'll change...",
                          }]);
                        }, 1000);
                      }}
                      className="mt-3 inline-flex items-center px-3 py-1.5 text-xs bg-purple-100 hover:bg-purple-200 rounded-full transition-all cursor-pointer animate-[fadeIn_0.3s_ease-out_forwards]"
                    >
                      <span className="text-purple-500 mr-1.5">Try:</span>
                      <span className="text-purple-900">&quot;Also approve invoices up to $750 for Acme Corp.&quot;</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Dynamic chat messages */}
              {chatMessages.map((msg) => (
                msg.type === 'user' ? (
                  <div key={msg.id} className="flex items-start gap-2 justify-end animate-[slideIn_0.3s_ease-out_forwards]">
                    <div className="bg-gray-100 rounded-2xl rounded-tr-sm px-4 py-2 max-w-[80%]">
                      <p className="text-sm text-gray-900">{msg.content}</p>
                    </div>
                    <div className="w-6 h-6 rounded-full bg-purple-900 flex items-center justify-center flex-shrink-0 text-white text-[10px] font-medium">
                      CW
                    </div>
                  </div>
                ) : (
                  <div key={msg.id} className="flex items-start gap-2 animate-[slideIn_0.3s_ease-out_forwards]">
                    <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">
                        <AnimatedText text={msg.content} speed={50} />
                      </p>
                      {/* Action button for confirmation (Apply to Instruction pill) */}
                      {msg.action && msg.action.type === 'confirm_amount_change' && (
                        <button
                          onClick={() => applyAmountChange(msg.action!.newAmount)}
                          className="mt-3 inline-flex items-center px-3 py-1.5 text-xs bg-purple-100 hover:bg-purple-200 text-purple-900 rounded-full transition-all cursor-pointer"
                        >
                          {msg.action.label}
                        </button>
                      )}
                    </div>
                  </div>
                )
              ))}
            </div>
          </div>

          {/* Input - Fixed at bottom */}
          <div className="p-4 flex-shrink-0">
            <form onSubmit={(e) => { e.preventDefault(); handleChatSubmit(); }}>
              <div className="flex items-center gap-2 w-full rounded-full border border-gray-200 bg-white px-4 py-2.5 shadow-sm focus-within:border-purple-600 focus-within:ring-2 focus-within:ring-purple-200 transition-all">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Describe changes to this instruction..."
                  className="flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:ring-0 focus:outline-none border-none"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim()}
                  className="w-8 h-8 rounded-full bg-purple-900 flex items-center justify-center hover:bg-purple-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4 text-white" />
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  </div>

      {/* Demo Invoice Drawer */}
      {demoInvoiceDrawerOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[10001] overflow-hidden pointer-events-none">
          <div
            data-drawer="demo-invoice"
            className={`absolute right-0 top-0 h-full w-[500px] bg-white shadow-2xl transform transition-transform duration-200 ease-in-out pointer-events-auto ${
              demoDrawerVisible ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            <div className="flex h-full flex-col">
              {/* Header */}
              <div className="border-b border-gray-200 px-4 py-3 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        setDemoDrawerVisible(false);
                        setTimeout(() => setDemoInvoiceDrawerOpen(false), 200);
                      }}
                      className="rounded-lg p-1 hover:bg-gray-100 transition-colors"
                      aria-label="Close drawer"
                    >
                      <X className="h-5 w-5 text-gray-500" />
                    </button>
                    <h2 className="text-lg font-semibold text-gray-950">
                      {demoInvoice.invoice_number}
                    </h2>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                      {demoInvoice.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-6">
                  {/* Vendor Information */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Building2 className="h-4 w-4 text-purple-600" />
                      <h3 className="text-sm font-semibold text-gray-950">Vendor</h3>
                    </div>
                    <p className="text-sm text-gray-700">{demoInvoice.vendor_name_snapshot}</p>
                  </div>

                  {/* Dates */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar className="h-4 w-4 text-purple-600" />
                      <h3 className="text-sm font-semibold text-gray-950">Dates</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-gray-500">Invoice Date</label>
                        <p className="text-sm text-gray-700">{new Date(demoInvoice.invoice_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500">Due Date</label>
                        <p className="text-sm text-gray-700">{new Date(demoInvoice.due_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                      </div>
                    </div>
                  </div>

                  {/* Financial */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <DollarSign className="h-4 w-4 text-purple-600" />
                      <h3 className="text-sm font-semibold text-gray-950">Financial Details</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-gray-500">Subtotal</label>
                        <p className="text-sm text-gray-700">{new Intl.NumberFormat('en-US', { style: 'currency', currency: demoInvoice.currency }).format(demoInvoice.subtotal)}</p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500">Tax</label>
                        <p className="text-sm text-gray-700">{new Intl.NumberFormat('en-US', { style: 'currency', currency: demoInvoice.currency }).format(demoInvoice.tax_total)}</p>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex justify-between items-center">
                        <label className="text-sm font-semibold text-gray-950">Total</label>
                        <p className="text-lg font-bold text-gray-950">{new Intl.NumberFormat('en-US', { style: 'currency', currency: demoInvoice.currency }).format(demoInvoice.total)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Additional Info */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="h-4 w-4 text-purple-600" />
                      <h3 className="text-sm font-semibold text-gray-950">Additional Information</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-gray-500">Department</label>
                        <p className="text-sm text-gray-700">{demoInvoice.department}</p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500">Match Status</label>
                        <p className="text-sm text-gray-700 capitalize">{demoInvoice.match_status}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

// Instruction Card Component
interface InstructionCardProps {
  instruction: Instruction;
  onEdit: (instruction: Instruction) => void;
}

function InstructionCard({ instruction, onEdit }: InstructionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const formatNumber = (num: number) => num.toLocaleString();

  // Calculate success rate
  const successRate = instruction.processed > 0
    ? Math.round((instruction.success / instruction.processed) * 100)
    : 0;

  // Get success rate color
  const getSuccessColor = (rate: number) => {
    if (rate >= 90) return 'text-green-600';
    if (rate >= 70) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      {/* Main Row - Always Visible */}
      <div className="flex items-center gap-2.5 px-3 py-2">
        {/* Chevron Toggle */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 text-gray-800 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
          aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
        >
          <ChevronRight
            className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
          />
        </button>

        {/* Hexagon Icon - clickable to open modal */}
        <button
          onClick={() => onEdit(instruction)}
          className="flex-shrink-0 hover:opacity-80 transition-opacity"
          aria-label={`Edit ${instruction.name}`}
        >
          <HexagonIcon type={instruction.type} />
        </button>

        {/* Title Section - clickable to open modal */}
        <button
          onClick={() => onEdit(instruction)}
          className="flex-1 min-w-0 text-left hover:bg-gray-50 rounded-md px-2 py-1 -mx-2 -my-1 transition-colors"
        >
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-900">{instruction.name}</span>
            <TypePill type={instruction.type} />
            {instruction.integrations?.map((integration) => (
              <IntegrationPill key={integration} name={integration} />
            ))}
          </div>
          <p className="text-xs text-gray-700 truncate mt-0.5">{instruction.description}</p>
        </button>

        {/* Metrics Section */}
        <div className="flex items-center gap-6 flex-shrink-0">
          {/* Confidence */}
          <div className="text-right hidden sm:block">
            <p className="text-xs text-gray-700 mb-1">Confidence</p>
            <ConfidenceBar value={instruction.confidence} />
          </div>

          {/* Success Rate */}
          <div className="text-right hidden sm:block">
            <p className="text-xs text-gray-700 mb-1">Success</p>
            <span className={`text-sm font-medium ${getSuccessColor(successRate)}`}>
              {successRate}%
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => console.log('Simulate instruction:', instruction.id)}
              className="p-1.5 text-gray-800 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
              aria-label="Simulate instruction"
            >
              <Play className="w-4 h-4" />
            </button>
            <button
              onClick={() => onEdit(instruction)}
              className="p-1.5 text-gray-800 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
              aria-label="Edit instruction"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={() => console.log('Duplicate instruction:', instruction.id)}
              className="p-1.5 text-gray-800 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
              aria-label="Duplicate instruction"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              onClick={() => console.log('Delete instruction:', instruction.id)}
              className="p-1.5 text-gray-800 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              aria-label="Delete instruction"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-100 bg-gray-50/70 px-3 py-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pl-10">
            {/* Performance Column */}
            <div>
              <p className="text-xs font-medium text-gray-700 uppercase tracking-wide mb-1.5">Performance</p>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-gray-800">
                  <span className="text-gray-700">Processed:</span>
                  <span className="font-medium">{formatNumber(instruction.processed)}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-800">
                  <span className="text-gray-700">Success:</span>
                  <span className="font-medium text-green-600">{formatNumber(instruction.success)}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-800">
                  <span className="text-gray-700">Failed:</span>
                  <span className="font-medium text-red-600">{formatNumber(instruction.failed)}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-800">
                  <span className="text-gray-700">Avg Time:</span>
                  <span className="font-medium">{instruction.avgTime}</span>
                </div>
              </div>
            </div>

            {/* Configuration Column */}
            <div>
              <p className="text-xs font-medium text-gray-700 uppercase tracking-wide mb-1.5">Configuration</p>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-gray-800">
                  <Circle className="w-3 h-3 text-gray-500" />
                  <span>Validation enabled</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-800">
                  <Clock className="w-3 h-3 text-gray-500" />
                  <span>30s timeout</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-800">
                  <Zap className="w-3 h-3 text-gray-500" />
                  <span>{instruction.mode}</span>
                </div>
              </div>
            </div>

            {/* Recent Activity Column */}
            <div>
              <p className="text-xs font-medium text-gray-700 uppercase tracking-wide mb-1.5">Recent Activity</p>
              <div className="space-y-1">
                {instruction.recentActivity.map((activity, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-gray-800">
                    <ActivityDot status={activity.status} />
                    <span className="truncate">{activity.message}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Empty State Component
function EmptyState() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="mb-4 rounded-full bg-purple-100 p-3">
          <Bot className="h-8 w-8 text-purple-600" />
        </div>
        <h2 className="mb-2 text-lg font-semibold text-gray-900">No agent instructions yet</h2>
        <p className="mb-6 max-w-md text-sm text-gray-600">
          You will soon be able to create and manage invoice automation instructions here.
        </p>
        <button
          onClick={() => console.log('Create instruction clicked')}
          disabled
          className="px-4 py-2 text-sm font-medium bg-purple-900 text-white rounded-md opacity-50 cursor-not-allowed"
        >
          Create instruction
        </button>
      </div>
    </div>
  );
}

// Agent Builder Content
function AgentBuilderContent() {
  // State for instructions (mutable)
  const [instructions, setInstructions] = useState<Instruction[]>(mockInstructions);

  // State for modal
  const [selectedInstruction, setSelectedInstruction] = useState<Instruction | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Calculate stats from instructions state
  const totalInstructions = instructions.length;
  const activeInstructions = instructions.filter(i => i.status === 'Active').length;
  const totalEvaluations = instructions.reduce((sum, i) => sum + i.processed, 0);
  const totalSuccess = instructions.reduce((sum, i) => sum + i.success, 0);
  const successRate = totalEvaluations > 0
    ? `${Math.round((totalSuccess / totalEvaluations) * 100)}%`
    : '–';

  const handleOpenDetail = (instruction: Instruction) => {
    setSelectedInstruction(instruction);
    setIsDetailOpen(true);
  };

  const handleCloseDetail = () => {
    setSelectedInstruction(null);
    setIsDetailOpen(false);
  };

  const handleSaveInstruction = (updated: Instruction) => {
    // Update the instructions array
    setInstructions(prev => prev.map(inst =>
      inst.id === updated.id ? updated : inst
    ));
    handleCloseDetail();
  };

  return (
    <div className="w-full p-4 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-950">Agent Builder</h1>
        <p className="mt-1 text-sm text-gray-800">Configure how Xelix agents handle invoice lines and exceptions.</p>
      </div>

      {/* Stats Strip */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Configured instructions" value={totalInstructions.toString()} />
        <StatCard label="Active instructions" value={activeInstructions.toString()} />
        <StatCard label="Agent evaluations (last 30 days)" value={totalEvaluations.toLocaleString()} />
        <StatCard label="Agent success rate" value={successRate} />
      </div>

      {/* Configured Instructions Section */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Configured instructions</h2>
        <p className="mt-1 text-sm text-gray-600">Review and manage agent instructions for your invoice workflows.</p>
      </div>

      {/* Instructions List or Empty State */}
      {instructions.length > 0 ? (
        <div className="space-y-2">
          {instructions.map((instruction) => (
            <InstructionCard
              key={instruction.id}
              instruction={instruction}
              onEdit={handleOpenDetail}
            />
          ))}
        </div>
      ) : (
        <EmptyState />
      )}

      {/* Instruction Detail Modal */}
      {selectedInstruction && (
        <InstructionDetailModal
          instruction={selectedInstruction}
          isOpen={isDetailOpen}
          onClose={handleCloseDetail}
          onSave={handleSaveInstruction}
        />
      )}
    </div>
  );
}

// General Settings Content
function GeneralSettingsContent() {
  const [chartsInDrawer, setChartsInDrawerState] = useState(false);
  const [poVisibility, setPOVisibilityState] = useState(false);
  const [launchpadVisibility, setLaunchpadVisibilityState] = useState(false);
  const [exceptionNavigation, setExceptionNavigationState] = useState(true);
  const [invoiceAgent, setInvoiceAgentState] = useState(false);

  // Load preferences from cookies on mount
  useEffect(() => {
    const chartsPreference = getChartsInDrawerPreference();
    setChartsInDrawerState(chartsPreference);

    const poPreference = getPOVisibilityPreference();
    setPOVisibilityState(poPreference);

    const launchpadPreference = getLaunchpadVisibilityPreference();
    setLaunchpadVisibilityState(launchpadPreference);

    const exceptionPreference = getExceptionNavigationPreference();
    setExceptionNavigationState(exceptionPreference);

    const invoiceAgentPreference = getInvoiceAgentPreference();
    setInvoiceAgentState(invoiceAgentPreference);
  }, []);

  // Handle toggle change for charts
  const handleToggleChange = () => {
    const newValue = !chartsInDrawer;
    setChartsInDrawerState(newValue);
    setChartsInDrawerPreference(newValue);
  };

  // Handle toggle change for PO/GRs/Escalations visibility
  const handlePOVisibilityToggle = () => {
    const newValue = !poVisibility;
    setPOVisibilityState(newValue);
    setPOVisibilityPreference(newValue);
  };

  // Handle toggle change for Launchpad visibility
  const handleLaunchpadVisibilityToggle = () => {
    const newValue = !launchpadVisibility;
    setLaunchpadVisibilityState(newValue);
    setLaunchpadVisibilityPreference(newValue);
  };

  // Handle toggle change for Exception Navigation
  const handleExceptionNavigationToggle = () => {
    const newValue = !exceptionNavigation;
    setExceptionNavigationState(newValue);
    setExceptionNavigationPreference(newValue);
  };

  // Handle toggle change for Invoice Agent
  const handleInvoiceAgentToggle = () => {
    const newValue = !invoiceAgent;
    setInvoiceAgentState(newValue);
    setInvoiceAgentPreference(newValue);
  };

  return (
    <div className="w-full p-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-950">General Settings</h1>
        <p className="mt-1 text-sm text-gray-800">Customize display preferences, automation workflows, and system behavior</p>
      </div>

      {/* Settings sections */}
      <div className="space-y-6">
        {/* Display Settings */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Display Settings</h2>
          <p className="mb-4 text-sm text-gray-600">Customize the display of invoice management features</p>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded bg-gray-50 p-4">
              <div>
                <span className="text-sm font-medium text-gray-700">Charts in a drawer</span>
                <p className="text-xs text-gray-500 mt-1">(on invoice management page)</p>
              </div>
              <button
                onClick={handleToggleChange}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  chartsInDrawer ? 'bg-purple-600' : 'bg-gray-200'
                }`}
                aria-pressed={chartsInDrawer}
                aria-label="Toggle charts in drawer"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    chartsInDrawer ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            <div className="flex items-center justify-between rounded bg-gray-50 p-4">
              <div>
                <span className="text-sm font-medium text-gray-700">PO/GRs/Escalations list visibility</span>
                <p className="text-xs text-gray-500 mt-1">Show Purchase Orders, Goods Receipts, and Escalations in top menu</p>
              </div>
              <button
                onClick={handlePOVisibilityToggle}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  poVisibility ? 'bg-purple-600' : 'bg-gray-200'
                }`}
                aria-pressed={poVisibility}
                aria-label="Toggle PO/GRs/Escalations visibility"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    poVisibility ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            <div className="flex items-center justify-between rounded bg-gray-50 p-4">
              <div>
                <span className="text-sm font-medium text-gray-700">Launchpad (concept)</span>
                <p className="text-xs text-gray-500 mt-1">Show Launchpad concept in top navigation menu</p>
              </div>
              <button
                onClick={handleLaunchpadVisibilityToggle}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  launchpadVisibility ? 'bg-purple-600' : 'bg-gray-200'
                }`}
                aria-pressed={launchpadVisibility}
                aria-label="Toggle Launchpad visibility"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    launchpadVisibility ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            <div className="flex items-center justify-between rounded bg-gray-50 p-4">
              <div>
                <span className="text-sm font-medium text-gray-700">Invoice navigation by exception/approval</span>
                <p className="text-xs text-gray-500 mt-1">Focus on exceptions with separate PO/Non-PO tabs</p>
              </div>
              <button
                onClick={handleExceptionNavigationToggle}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  exceptionNavigation ? 'bg-purple-600' : 'bg-gray-200'
                }`}
                aria-pressed={exceptionNavigation}
                aria-label="Toggle exception navigation"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    exceptionNavigation ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            <div className="flex items-center justify-between rounded bg-gray-50 p-4">
              <div>
                <span className="text-sm font-medium text-gray-700">Enable Invoice Agent</span>
                <p className="text-xs text-gray-500 mt-1">Show AI Agent button on invoice detail pages</p>
              </div>
              <button
                onClick={handleInvoiceAgentToggle}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  invoiceAgent ? 'bg-purple-600' : 'bg-gray-200'
                }`}
                aria-pressed={invoiceAgent}
                aria-label="Toggle Invoice Agent"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    invoiceAgent ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Workflow Automation */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Workflow Automation</h2>
          <p className="mb-4 text-sm text-gray-600">Set up automated actions for invoice processing</p>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded bg-gray-50 p-3">
              <span className="text-sm text-gray-700">Auto-approve invoices under $1,000</span>
              <span className="text-xs text-gray-500">Coming soon</span>
            </div>
            <div className="flex items-center justify-between rounded bg-gray-50 p-3">
              <span className="text-sm text-gray-700">Route invoices by vendor category</span>
              <span className="text-xs text-gray-500">Coming soon</span>
            </div>
          </div>
        </div>

        {/* Email Integration */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Email Integration</h2>
          <p className="mb-4 text-sm text-gray-600">Automatically process invoices from email</p>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded bg-gray-50 p-3">
              <span className="text-sm text-gray-700">Email forwarding rules</span>
              <span className="text-xs text-gray-500">Coming soon</span>
            </div>
            <div className="flex items-center justify-between rounded bg-gray-50 p-3">
              <span className="text-sm text-gray-700">Automatic attachment extraction</span>
              <span className="text-xs text-gray-500">Coming soon</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Settings Content - renders based on currentView prop
interface SettingsContentProps {
  currentView?: string;
}

function SettingsContent({ currentView = 'agent-builder' }: SettingsContentProps) {
  if (currentView === 'general') {
    return <GeneralSettingsContent />;
  }

  // Default to Agent Builder
  return <AgentBuilderContent />;
}

export default function SettingsPage() {
  return (
    <AppLayout activeModule="settings">
      <SettingsContent />
    </AppLayout>
  );
}
