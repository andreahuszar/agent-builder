'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/app/components/AppLayout';
import {
  Bot,
  Pencil,
  Copy,
  Trash2,
  ChevronRight,
  Circle,
  Clock,
  Zap,
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

// Import types
import { Instruction } from './types';

// Import mock data
import { mockInstructions } from './mockData';

// Import components
import {
  InstructionDetailModal,
  StatCard,
  HexagonIcon,
  ConfidenceBar,
  TypePill,
  IntegrationPill,
  StatusPill,
  ActivityDot,
} from './components';

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

  // State for create instruction modal
  const [showCreateInstructionModal, setShowCreateInstructionModal] = useState(false);

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
    // Don't update selectedInstruction - this would trigger the modal's useEffect
    // and reset all state including chat messages and saved email actions
    // The modal already has the updated values in its local state
  };

  return (
    <div className="w-full p-4 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-950">Agent Builder</h1>
          <p className="mt-1 text-sm text-gray-800">Configure how Xelix agents handle invoice lines and exceptions.</p>
        </div>
        <button
          onClick={() => setShowCreateInstructionModal(true)}
          className="px-4 py-2 text-sm bg-purple-900 text-white rounded-md hover:bg-purple-800 transition-colors"
        >
          Add Instruction
        </button>
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

      {/* Create Instruction Modal */}
      <InstructionDetailModal
        instruction={null}
        isOpen={showCreateInstructionModal}
        onClose={() => setShowCreateInstructionModal(false)}
        isCreateMode={true}
      />
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
