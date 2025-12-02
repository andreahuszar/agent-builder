'use client';

import { useState, useEffect } from 'react';
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
  Minus
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
    mode: 'Auto-apply',
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
    mode: 'Auto-apply',
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
    mode: 'Auto-apply',
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

// Instruction Detail Modal Component
interface InstructionDetailModalProps {
  instruction: Instruction;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedInstruction: Instruction) => void;
}

function InstructionDetailModal({ instruction, isOpen, onClose, onSave }: InstructionDetailModalProps) {
  // Basic fields state
  const [editedName, setEditedName] = useState(instruction.name);
  const [editedDescription, setEditedDescription] = useState(instruction.description);
  const [editedNaturalLanguage, setEditedNaturalLanguage] = useState(instruction.naturalLanguage || '');

  // Scope & Mode state
  const [editedEntities, setEditedEntities] = useState<string[]>(instruction.entities || ['All entities']);
  const [editedVendors, setEditedVendors] = useState<string[]>(instruction.vendors || ['All vendors']);
  const [editedMode, setEditedMode] = useState(instruction.mode || 'Auto-apply');

  // Logic state
  const [editedWhen, setEditedWhen] = useState(instruction.logic?.when || '');
  const [editedConditions, setEditedConditions] = useState<Condition[]>(instruction.logic?.conditions || []);
  const [editedActions, setEditedActions] = useState<Action[]>(instruction.logic?.actions || []);

  // Logic view mode state
  const [logicMode, setLogicMode] = useState<'natural' | 'advanced'>('natural');
  const [editedLogicSummary, setEditedLogicSummary] = useState(instruction.logicSummary || '');

  // Reset form when instruction changes
  useEffect(() => {
    setEditedName(instruction.name);
    setEditedDescription(instruction.description);
    setEditedNaturalLanguage(instruction.naturalLanguage || '');
    setEditedEntities(instruction.entities || ['All entities']);
    setEditedVendors(instruction.vendors || ['All vendors']);
    setEditedMode(instruction.mode || 'Auto-apply');
    setEditedWhen(instruction.logic?.when || '');
    setEditedConditions(instruction.logic?.conditions || []);
    setEditedActions(instruction.logic?.actions || []);
    setLogicMode('natural'); // Reset to default mode
    setEditedLogicSummary(instruction.logicSummary || '');
  }, [instruction]);

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
      naturalLanguage: editedNaturalLanguage,
      logicSummary: editedLogicSummary,
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
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/50"
      style={{ zIndex: 10000 }}
      onClick={handleBackdropClick}
    >
      <div className="flex flex-col w-[96vw] max-w-[1800px] h-[95vh] bg-white rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-gray-900">{instruction.name}</h2>
              <StatusPill status={instruction.status} />
            </div>
            <p className="mt-1 text-sm text-gray-500">{instruction.agent} • {instruction.stage}</p>
          </div>
          <div className="flex items-center gap-3 ml-4">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-purple-700 bg-white border border-purple-300 rounded-md hover:bg-purple-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm font-medium text-white bg-purple-900 rounded-md hover:bg-purple-800 transition-colors"
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
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 p-6">
            {/* Left Column - Builder */}
            <div className="lg:col-span-3 space-y-6">
              {/* Basics Section */}
              <div className="rounded-lg border border-gray-200 bg-white p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Basics</h3>
                <div className="space-y-4">
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
                      rows={3}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Natural Language Section */}
              <div className="rounded-lg border border-gray-200 bg-white p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Instruction in natural language</h3>
                <textarea
                  value={editedNaturalLanguage}
                  onChange={(e) => setEditedNaturalLanguage(e.target.value)}
                  rows={4}
                  placeholder="Describe what this instruction does in plain language..."
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none resize-none"
                />
              </div>

              {/* Logic Overview Section - Editable */}
              <div className="rounded-lg border border-gray-200 bg-white p-5">
                {/* Header with segmented control */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-900">Logic overview</h3>
                  <div className="inline-flex bg-gray-100 rounded-md p-0.5">
                    <button
                      onClick={() => setLogicMode('natural')}
                      className={`px-3 py-1 text-sm rounded transition-colors ${
                        logicMode === 'natural'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Natural language
                    </button>
                    <button
                      onClick={() => setLogicMode('advanced')}
                      className={`px-3 py-1 text-sm rounded transition-colors ${
                        logicMode === 'advanced'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Advanced
                    </button>
                  </div>
                </div>

                {/* Natural Language Mode */}
                {logicMode === 'natural' && (
                  <div className="space-y-4">
                    {/* Auto-generated summary from conditions/actions */}
                    <div className="bg-gray-50 rounded-md p-4">
                      <p className="text-sm text-gray-700">
                        {(() => {
                          if (editedConditions.length === 0 && editedActions.length === 0) {
                            return 'No logic defined for this instruction.';
                          }

                          const conditionParts = editedConditions.map(c =>
                            `${c.field.toLowerCase()} ${c.operator} ${c.value}`
                          );

                          const actionParts = editedActions.map(a =>
                            a.details ? `${a.action.toLowerCase()} (${a.details})` : a.action.toLowerCase()
                          );

                          let summary = 'This instruction ';

                          if (conditionParts.length > 0) {
                            summary += `checks for ${conditionParts.join(', ')}. `;
                          }

                          if (actionParts.length > 0) {
                            summary += `If conditions are met, it will ${actionParts.join(', ')}.`;
                          }

                          return summary;
                        })()}
                      </p>
                    </div>

                    {/* Editable natural language textarea */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Instruction summary (natural language)
                      </label>
                      <textarea
                        value={editedLogicSummary}
                        onChange={(e) => setEditedLogicSummary(e.target.value)}
                        rows={4}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none resize-none"
                        placeholder="Describe what this instruction does in plain language..."
                      />
                      <p className="mt-1.5 text-xs text-gray-500">
                        Edit this in your own words. The system keeps an advanced version of the logic under the hood.
                      </p>
                    </div>
                  </div>
                )}

                {/* Advanced Mode */}
                {logicMode === 'advanced' && (
                  <div className="space-y-4">
                    {/* Caption */}
                    <p className="text-xs text-gray-500">
                      Advanced view – technical structure used by the agent.
                    </p>

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
                )}
              </div>

              {/* Scope & Mode Section */}
              <div className="rounded-lg border border-gray-200 bg-white p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Scope & mode</h3>
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
            </div>

            {/* Right Column - Agent Assistant */}
            <div className="lg:col-span-2">
              <div className="rounded-lg border border-gray-200 bg-white p-5 h-full">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Agent assistant</h3>
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="mb-4 rounded-full bg-purple-100 p-4">
                    <MessageSquare className="h-8 w-8 text-purple-600" />
                  </div>
                  <p className="text-sm text-gray-700 max-w-xs mb-4">
                    Here you'll be able to refine this instruction with AI and test it on sample invoices.
                  </p>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                    Coming soon
                  </span>
                </div>

                {/* Placeholder chat area */}
                <div className="mt-6 border-t border-gray-100 pt-4">
                  <div className="bg-gray-50 rounded-lg p-3 mb-3">
                    <div className="flex items-start gap-2">
                      <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
                        <Bot className="w-3.5 h-3.5 text-white" />
                      </div>
                      <p className="text-sm text-gray-700">
                        I can help you refine this instruction. What would you like to improve?
                      </p>
                    </div>
                  </div>
                  <textarea
                    disabled
                    placeholder="Type your message..."
                    className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500 placeholder:text-gray-500 resize-none cursor-not-allowed"
                    rows={2}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
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
