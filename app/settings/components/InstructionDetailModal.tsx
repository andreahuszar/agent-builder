'use client';

import { useState, useEffect, useRef, Fragment } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Plus,
  Minus,
  Sparkles,
  Send,
  Building2,
  Calendar,
  DollarSign,
  FileText,
  Loader2,
  Undo2,
  Zap,
  ChevronRight,
  AlertTriangle,
  Check,
  Play,
  Circle,
  Bot,
} from 'lucide-react';
import {
  Instruction,
  Condition,
  Action,
  ENTITY_OPTIONS,
  VENDOR_OPTIONS,
  MODE_OPTIONS,
  FIELD_OPTIONS,
  OPERATOR_OPTIONS,
  ACTION_OPTIONS,
  STAGE_OPTIONS,
} from '../types';
import { StatusPill, HexagonIcon, ConfidenceBar, StatCard, AnimatedText } from './UIComponents';

interface InstructionDetailModalProps {
  instruction?: Instruction | null;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (updatedInstruction: Instruction) => void;
  isCreateMode?: boolean;
}

function InstructionDetailModal({ instruction, isOpen, onClose, onSave, isCreateMode = false }: InstructionDetailModalProps) {
  // Edit mode state: 'assistant' (default) or 'manual'
  const [editMode, setEditMode] = useState<'assistant' | 'manual'>('assistant');

  // Basic fields state (for manual mode)
  const [editedName, setEditedName] = useState(instruction?.name || 'New Instruction');
  const [editedDescription, setEditedDescription] = useState(instruction?.description || '');

  // Scope & Mode state (for manual mode)
  const [editedEntities, setEditedEntities] = useState<string[]>(instruction?.entities || ['All entities']);
  const [editedVendors, setEditedVendors] = useState<string[]>(instruction?.vendors || ['All vendors']);
  const [editedMode, setEditedMode] = useState(instruction?.mode || 'Suggest');

  // Logic state (for manual mode)
  const [editedWhen, setEditedWhen] = useState(instruction?.logic?.when || '');
  const [editedConditions, setEditedConditions] = useState<Condition[]>(instruction?.logic?.conditions || []);
  const [editedActions, setEditedActions] = useState<Action[]>(instruction?.logic?.actions || []);

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
      type: 'confirm_amount_change' | 'create_rule';
      label: string;
      newAmount?: number;
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

  // Create mode specific state
  const [showCreatedRule, setShowCreatedRule] = useState(false);
  const [ruleAnimationStep, setRuleAnimationStep] = useState(0); // 0-4 for WHEN, IF, AND, THEN

  // Greeting text for animated display - different for create mode
  const greetingText = isCreateMode
    ? "I can help you create a new instruction.\n\nDescribe the rule you want to create, and I'll help you build it step by step."
    : "I can help you refine this instruction.\n\nAsk me anything, describe changes you'd like, or click a line on the left to modify it directly.";

  // Reset form when instruction changes or modal opens
  useEffect(() => {
    setEditMode('assistant'); // Reset to assistant mode

    // Handle create mode vs edit mode
    if (isCreateMode || !instruction) {
      setEditedName('New Instruction');
      setEditedDescription('');
      setEditedEntities(['All entities']);
      setEditedVendors(['All vendors']);
      setEditedMode('Suggest');
      setEditedWhen('');
      setEditedConditions([]);
      setEditedActions([]);
    } else {
      setEditedName(instruction.name);
      setEditedDescription(instruction.description);
      setEditedEntities(instruction.entities || ['All entities']);
      setEditedVendors(instruction.vendors || ['All vendors']);
      setEditedMode(instruction.mode || 'Suggest');
      setEditedWhen(instruction.logic?.when || '');
      setEditedConditions(instruction.logic?.conditions || []);
      setEditedActions(instruction.logic?.actions || []);
    }

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
    // Reset create mode state
    setShowCreatedRule(false);
    setRuleAnimationStep(0);
  }, [instruction, isCreateMode, isOpen]);

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
        // Delay before showing Try pill (only in edit mode)
        if (!isCreateMode) {
          setTimeout(() => setShowTryPill(true), 300);
        }
      }
    }, 50); // 50ms per word

    return () => clearInterval(interval);
  }, [instruction?.id, isOpen, isCreateMode, greetingText]);

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

  // Create Rule handler - triggered when user clicks "Create Rule" pill
  const handleCreateRule = () => {
    // Clear the action button from messages
    setChatMessages(prev => prev.map(msg =>
      msg.action ? { ...msg, action: undefined } : msg
    ));

    // Show overlay animation
    setRuleOverlayActive(true);

    // After overlay, start sequential animation
    setTimeout(() => {
      setRuleOverlayActive(false);
      setShowCreatedRule(true);

      // Animate each step with delays
      setRuleAnimationStep(1); // WHEN + Summary
      setTimeout(() => setRuleAnimationStep(2), 400); // IF
      setTimeout(() => setRuleAnimationStep(3), 800); // AND
      setTimeout(() => {
        setRuleAnimationStep(4); // THEN
        // Confirmation message after all animations
        setChatMessages(prev => [...prev, {
          id: Date.now().toString(),
          type: 'assistant',
          content: "Done! I've created the auto-reject rule. Review the instruction above and click Save when you're happy with it.",
        }]);
      }, 1200);
    }, 2000);
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

    // Create mode: Any input triggers the auto-reject rule demo
    if (isCreateMode) {
      setTimeout(() => {
        setChatMessages(prev => [...prev, {
          id: Date.now().toString(),
          type: 'assistant',
          content: "I'll create a rule to automatically reject invoices that are marked as PO-backed but have no matching PO in the ERP system. This helps catch data entry errors early.",
          action: {
            type: 'create_rule',
            label: 'Create Rule',
          }
        }]);
      }, 1000);
      return;
    }

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
    if (!onSave) return;

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
      ...(instruction || {
        id: `new-${Date.now()}`,
        status: 'Active',
        processed: 0,
        success: 0,
        rationale: '',
      }),
      name: editedName,
      description: editedDescription,
      entities: editedEntities,
      vendors: editedVendors,
      mode: editedMode,
      scope: scopeParts.length > 0 ? scopeParts.join(' • ') : (instruction?.scope || 'All vendors'),
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
              <h2 className="text-xl font-semibold text-gray-900">
                {isCreateMode ? 'New Instruction' : instruction?.name}
              </h2>
              {!isCreateMode && instruction && <StatusPill status={instruction.status} />}
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
                    <h3 className="text-sm font-semibold text-gray-900">
                      {isCreateMode ? 'New instruction' : 'Current instruction'}
                    </h3>
                    {!isCreateMode && canUndo && (
                      <button
                        onClick={handleUndo}
                        className="text-xs text-purple-600 hover:text-purple-800 flex items-center gap-1 transition-colors"
                      >
                        <Undo2 className="w-3 h-3" />
                        Undo
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-800 mb-3">
                    {isCreateMode
                      ? 'Your new instruction will appear here once created.'
                      : 'This is how the agent currently interprets this instruction.'}
                  </p>

                  {/* Create Mode: Empty Placeholder or Animated Rule */}
                  {isCreateMode && !showCreatedRule && (
                    <div className="flex items-center justify-center h-40 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                      <p className="text-sm text-gray-500">Your instruction will appear here</p>
                    </div>
                  )}

                  {/* Create Mode: Animated Rule Display */}
                  {isCreateMode && showCreatedRule && (
                    <div className="space-y-1 text-sm bg-purple-50 rounded-lg p-4 relative">
                      {/* Overlay animation during creation */}
                      {ruleOverlayActive && (
                        <div className="absolute inset-0 bg-purple-200/60 backdrop-blur-[1px] rounded-lg flex items-center justify-center z-10">
                          <div className="flex items-center gap-2 text-purple-800">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span className="text-sm font-medium">Creating instruction...</span>
                          </div>
                        </div>
                      )}

                      {/* Summary - animates in with step 1 */}
                      {ruleAnimationStep >= 1 && (
                        <div className="flex items-start gap-2 mb-3 pb-3 border-b border-purple-200 animate-[slideIn_0.4s_ease-out_forwards]">
                          <Zap className="w-4 h-4 text-purple-900 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-gray-900">
                            Auto-reject PO-backed invoices with no matching PO in ERP
                          </p>
                        </div>
                      )}

                      {/* WHEN - animates in with step 1 */}
                      {ruleAnimationStep >= 1 && (
                        <div className="flex items-start gap-2 -mx-2 px-2 py-1.5 animate-[slideIn_0.4s_ease-out_forwards]">
                          <span className="inline-block text-xs font-semibold text-purple-800 bg-purple-200 px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5">
                            WHEN
                          </span>
                          <span className="text-gray-900">Invoice reaches Validation & Exceptions stage</span>
                        </div>
                      )}

                      {/* IF - animates in with step 2 */}
                      {ruleAnimationStep >= 2 && (
                        <div className="flex items-start gap-2 -mx-2 px-2 py-1.5 pl-6 animate-[slideIn_0.4s_ease-out_forwards]">
                          <span className="inline-block text-xs font-semibold text-blue-800 bg-blue-200 px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5">
                            IF
                          </span>
                          <span className="text-gray-900">
                            Invoice type = <span className="font-medium text-purple-700">PO backed</span>
                          </span>
                        </div>
                      )}

                      {/* AND - animates in with step 3 */}
                      {ruleAnimationStep >= 3 && (
                        <div className="flex items-start gap-2 -mx-2 px-2 py-1.5 pl-6 animate-[slideIn_0.4s_ease-out_forwards]">
                          <span className="inline-block text-xs font-medium text-gray-700 bg-gray-200 px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5">
                            AND
                          </span>
                          <span className="text-gray-900">
                            PO number <span className="font-medium text-purple-700">not found in ERP</span>
                          </span>
                        </div>
                      )}

                      {/* THEN - animates in with step 4 */}
                      {ruleAnimationStep >= 4 && (
                        <div className="flex items-start gap-2 -mx-2 px-2 py-1.5 animate-[slideIn_0.4s_ease-out_forwards]">
                          <span className="inline-block text-xs font-semibold text-green-800 bg-green-200 px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5">
                            THEN
                          </span>
                          <span className="text-gray-900">Auto-reject invoice</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Edit Mode: Enhanced WHEN/IF/THEN display with overlay support */}
                  {!isCreateMode && (
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
                          : instruction?.description}
                      </p>
                    </div>
                    {/* WHEN */}
                    <button className="group w-full flex items-start gap-2 -mx-2 px-2 py-1.5 rounded-md hover:bg-purple-200/80 transition-colors text-left cursor-pointer">
                      <span className="inline-block text-xs font-semibold text-purple-800 bg-purple-200 px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5 group-hover:ring-1 group-hover:ring-white/70 transition-shadow">
                        WHEN
                      </span>
                      <span className="text-gray-900 flex-1">{instruction?.logic?.when || 'Invoice is processed'}</span>
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
                  )}

                  {/* Conflict status - only show in edit mode */}
                  {!isCreateMode && (
                  <>
                  <div className="flex items-center gap-2 mt-3">
                    {instruction?.conflictsCount === 0 ? (
                      <>
                        <span className="w-2 h-2 bg-green-500 rounded-full" />
                        <span className="text-xs text-gray-800">No conflicts detected with other instructions.</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-xs text-amber-700">
                          {instruction?.conflictsCount} potential conflict{(instruction?.conflictsCount || 0) > 1 ? 's' : ''} detected
                          {instruction?.conflictsSummary && ` – ${instruction.conflictsSummary}`}.
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
                  </>
                  )}
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
                          onClick={() => applyAmountChange(msg.action!.newAmount!)}
                          className="mt-3 inline-flex items-center px-3 py-1.5 text-xs bg-purple-100 hover:bg-purple-200 text-purple-900 rounded-full transition-all cursor-pointer"
                        >
                          {msg.action.label}
                        </button>
                      )}
                      {/* Action button for Create Rule (in create mode) */}
                      {msg.action && msg.action.type === 'create_rule' && (
                        <button
                          onClick={handleCreateRule}
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
                  placeholder={isCreateMode ? "Describe the rule you want to create..." : "Describe changes to this instruction..."}
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


export default InstructionDetailModal;
