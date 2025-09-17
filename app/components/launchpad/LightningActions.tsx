'use client';

import React, { useState, useEffect } from 'react';
import {
  Clock,
  AlertCircle,
  Zap,
  Package,
  Star,
  TrendingUp,
  Plus,
  Settings,
  Play,
  Search,
  Filter,
  MoreVertical,
  CheckSquare,
  Square,
  Building2,
  FileText,
  DollarSign,
  Calendar,
  AlertTriangle,
  ChevronRight,
  X,
  Save,
  Trash2,
  Copy,
  Edit2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { InvoiceDetailsDrawer } from './InvoiceDetailsDrawer';

// Types
type ActionType = 'approve' | 'escalate' | 'request_po' | 'auto_code' | 'fast_track' | 'review' | 'query' | 'hold';
type FilterCriteria = {
  minAmount?: number;
  maxAmount?: number;
  daysOverdue?: number;
  vendor?: string;
  hasPO?: boolean;
  hasVAT?: boolean;
  priority?: 'high' | 'medium' | 'low';
  status?: string;
  confidence?: number;
};

interface SmartAction {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  count: number;
  criteria: FilterCriteria;
  action: ActionType;
  actionLabel: string;
  isActive?: boolean;
  color?: string;
}

interface Invoice {
  id: string;
  vendor: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  hasVAT: boolean;
  vatAmount?: number;
  dueDate: string;
  ageInDays: number;
  poNumber?: string;
  status: string;
  priority: 'high' | 'medium' | 'low';
  issues: string[];
  selected?: boolean;
  confidence?: number;
}

// Mock invoice generator
const generateMockInvoices = (): Invoice[] => {
  const vendors = ['Acme Corp Ltd', 'British Supplies Co', 'Tech Solutions UK', 'London Office Supplies', 'Professional Services Ltd', 'Global Services Inc'];
  const invoices: Invoice[] = [];

  for (let i = 0; i < 100; i++) {
    const vendor = vendors[Math.floor(Math.random() * vendors.length)];
    const amount = Math.floor(Math.random() * 50000) + 500;
    const ageInDays = Math.floor(Math.random() * 60) - 30; // -30 to +30 days

    invoices.push({
      id: `INV-2024-${String(i).padStart(3, '0')}`,
      vendor,
      invoiceNumber: `INV-2024-${String(Math.floor(Math.random() * 999)).padStart(3, '0')}`,
      amount,
      currency: 'GBP',
      hasVAT: Math.random() > 0.3,
      vatAmount: amount * 0.2,
      dueDate: new Date(Date.now() + ageInDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      ageInDays: Math.abs(ageInDays),
      poNumber: Math.random() > 0.3 ? `PO-2024-${String(Math.floor(Math.random() * 999)).padStart(3, '0')}` : undefined,
      status: ['pending', 'approved', 'on_hold'][Math.floor(Math.random() * 3)],
      priority: ageInDays < -20 ? 'high' : ageInDays < -10 ? 'medium' : 'low',
      issues: [],
      confidence: Math.random() * 100
    });
  }

  return invoices;
};

// Default smart actions
const defaultSmartActions: SmartAction[] = [
  {
    id: 'due-today',
    name: 'Due Today',
    description: 'Invoices due for payment today',
    icon: <Clock className="h-4 w-4" />,
    count: 0,
    criteria: { daysOverdue: 0 },
    action: 'approve',
    actionLabel: 'Process',
    color: 'purple',
    isActive: true
  },
  {
    id: 'missing-po',
    name: 'Missing PO',
    description: 'Invoices without purchase orders',
    icon: <AlertCircle className="h-4 w-4" />,
    count: 0,
    criteria: { hasPO: false },
    action: 'request_po',
    actionLabel: 'Request PO',
    color: 'orange'
  },
  {
    id: 'auto-codeable',
    name: 'Auto-Codeable',
    description: 'Ready for automatic coding',
    icon: <Zap className="h-4 w-4" />,
    count: 0,
    criteria: { confidence: 90 },
    action: 'auto_code',
    actionLabel: 'Auto-code',
    color: 'green'
  },
  {
    id: 'high-value',
    name: 'High Value',
    description: 'Invoices over £10,000',
    icon: <Package className="h-4 w-4" />,
    count: 0,
    criteria: { minAmount: 10000 },
    action: 'review',
    actionLabel: 'Review',
    color: 'blue'
  },
  {
    id: 'discount-expiring',
    name: 'Discount Expiring',
    description: 'Early payment discount available',
    icon: <Star className="h-4 w-4" />,
    count: 0,
    criteria: { daysOverdue: -7 }, // Due in 7 days
    action: 'fast_track',
    actionLabel: 'Fast Track',
    color: 'yellow'
  },
  {
    id: 'overdue-urgent',
    name: 'Overdue Urgent',
    description: 'Overdue more than 30 days',
    icon: <AlertTriangle className="h-4 w-4" />,
    count: 0,
    criteria: { daysOverdue: 30 },
    action: 'escalate',
    actionLabel: 'Escalate',
    color: 'red'
  }
];

export default function LightningActions() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [smartActions, setSmartActions] = useState<SmartAction[]>(defaultSmartActions);
  const [selectedAction, setSelectedAction] = useState<SmartAction | null>(null);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showDetailsDrawer, setShowDetailsDrawer] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const generatedInvoices = generateMockInvoices();
    setInvoices(generatedInvoices);

    // Update counts for smart actions
    const updatedActions = smartActions.map(action => ({
      ...action,
      count: filterInvoicesByCriteria(generatedInvoices, action.criteria).length
    }));
    setSmartActions(updatedActions);

    // Select first action by default
    if (updatedActions.length > 0) {
      setSelectedAction(updatedActions[0]);
      setFilteredInvoices(filterInvoicesByCriteria(generatedInvoices, updatedActions[0].criteria));
    }
  }, []);

  const filterInvoicesByCriteria = (invoiceList: Invoice[], criteria: FilterCriteria): Invoice[] => {
    return invoiceList.filter(invoice => {
      if (criteria.minAmount && invoice.amount < criteria.minAmount) return false;
      if (criteria.maxAmount && invoice.amount > criteria.maxAmount) return false;
      if (criteria.daysOverdue !== undefined) {
        if (criteria.daysOverdue === 0 && invoice.ageInDays !== 0) return false;
        if (criteria.daysOverdue > 0 && invoice.ageInDays < criteria.daysOverdue) return false;
        if (criteria.daysOverdue < 0 && invoice.ageInDays > Math.abs(criteria.daysOverdue)) return false;
      }
      if (criteria.hasPO !== undefined && (invoice.poNumber ? true : false) !== criteria.hasPO) return false;
      if (criteria.hasVAT !== undefined && invoice.hasVAT !== criteria.hasVAT) return false;
      if (criteria.priority && invoice.priority !== criteria.priority) return false;
      if (criteria.confidence && invoice.confidence < criteria.confidence) return false;
      return true;
    });
  };

  const handleActionSelect = (action: SmartAction) => {
    setSelectedAction(action);
    const filtered = filterInvoicesByCriteria(invoices, action.criteria);
    setFilteredInvoices(filtered);
    setSelectedInvoices(new Set());
  };

  const toggleInvoiceSelection = (invoiceId: string) => {
    setSelectedInvoices(prev => {
      const newSet = new Set(prev);
      if (newSet.has(invoiceId)) {
        newSet.delete(invoiceId);
      } else {
        newSet.add(invoiceId);
      }
      return newSet;
    });
  };

  const toggleAllSelection = () => {
    if (selectedInvoices.size === filteredInvoices.length) {
      setSelectedInvoices(new Set());
    } else {
      setSelectedInvoices(new Set(filteredInvoices.map(inv => inv.id)));
    }
  };

  const handleInvoiceClick = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowDetailsDrawer(true);
  };

  const formatCurrency = (amount: number) => {
    return `£${amount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getActionColor = (color?: string) => {
    const colors = {
      purple: 'bg-purple-600 text-white',
      orange: 'bg-orange-500 text-white',
      green: 'bg-green-600 text-white',
      blue: 'bg-blue-600 text-white',
      yellow: 'bg-yellow-500 text-white',
      red: 'bg-red-600 text-white',
      gray: 'bg-gray-600 text-white'
    };
    return colors[color as keyof typeof colors] || 'bg-gray-600 text-white';
  };

  const getSearchFilteredInvoices = () => {
    if (!searchTerm) return filteredInvoices;
    return filteredInvoices.filter(invoice =>
      invoice.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const displayInvoices = getSearchFilteredInvoices();

  return (
    <div className="flex h-full gap-4">
      {/* Left Panel - Smart Actions */}
      <div className="w-96 bg-white rounded-lg border border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-gray-950">Smart Actions Library</h2>
            <button
              onClick={() => setShowCreateModal(true)}
              className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
            >
              <Plus className="h-5 w-5 text-gray-600" />
            </button>
          </div>
          <p className="text-sm text-gray-600">Quick workflows for common tasks</p>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {smartActions.map((action) => (
            <div
              key={action.id}
              onClick={() => handleActionSelect(action)}
              className={cn(
                "p-3 rounded-lg border cursor-pointer transition-all",
                selectedAction?.id === action.id
                  ? "border-purple-500 bg-purple-50 shadow-md"
                  : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "p-2 rounded-md",
                    selectedAction?.id === action.id ? getActionColor(action.color) : "bg-gray-100"
                  )}>
                    {action.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-950">{action.name}</h3>
                      <span className={cn(
                        "px-2 py-0.5 text-xs font-medium rounded-full",
                        selectedAction?.id === action.id ? "bg-purple-600 text-white" : "bg-gray-200 text-gray-700"
                      )}>
                        {action.count}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{action.description}</p>
                    <button className={cn(
                      "mt-2 px-3 py-1 text-xs font-medium rounded-md transition-colors",
                      selectedAction?.id === action.id
                        ? "bg-purple-600 text-white hover:bg-purple-700"
                        : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                    )}>
                      <Play className="h-3 w-3 inline mr-1" />
                      {action.actionLabel}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="p-3 border-t border-gray-200">
          <button className="w-full flex items-center justify-center gap-2 py-2 text-sm text-purple-600 hover:text-purple-700 font-medium">
            <Settings className="h-4 w-4" />
            Manage Smart Actions
          </button>
        </div>
      </div>

      {/* Right Panel - Invoice List */}
      <div className="flex-1 bg-white rounded-lg border border-gray-200 flex flex-col">
        {selectedAction && (
          <>
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-950">{selectedAction.name}</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {displayInvoices.length} {displayInvoices.length === 1 ? 'item' : 'items'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search invoices..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 w-64"
                    />
                  </div>
                  <button className="p-2 border border-gray-300 rounded-md hover:bg-gray-50">
                    <Filter className="h-4 w-4 text-gray-600" />
                  </button>
                </div>
              </div>

              {/* Keyboard shortcuts hint */}
              <div className="mt-3 text-xs text-gray-500">
                Keyboard shortcuts: A (Accept) • R (Request) • E (Escalate) • M (Merge) • S (Schedule)
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {displayInvoices.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>No invoices match this criteria</p>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {displayInvoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      onClick={() => handleInvoiceClick(invoice)}
                      className={cn(
                        "p-4 hover:bg-gray-50 cursor-pointer transition-colors",
                        selectedInvoices.has(invoice.id) && "bg-purple-50"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleInvoiceSelection(invoice.id);
                          }}
                          className="mt-1"
                        >
                          {selectedInvoices.has(invoice.id) ? (
                            <CheckSquare className="h-4 w-4 text-purple-600" />
                          ) : (
                            <Square className="h-4 w-4 text-gray-400" />
                          )}
                        </button>

                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-gray-500" />
                                <span className="font-medium text-gray-950">{invoice.vendor}</span>
                                {invoice.hasVAT && (
                                  <span className="px-1.5 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">
                                    VAT
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 mt-1">Invoice {invoice.invoiceNumber}</p>
                            </div>

                            <div className="text-right">
                              <p className="font-bold text-lg text-gray-950">{formatCurrency(invoice.amount)}</p>
                              {invoice.priority === 'high' && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full mt-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  high
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                            {invoice.ageInDays > 0 && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {invoice.ageInDays === 0 ? 'Due today' : `${invoice.ageInDays} days`}
                              </span>
                            )}
                            {invoice.poNumber && (
                              <span className="flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                {invoice.poNumber}
                              </span>
                            )}
                          </div>

                          {/* Issue tags */}
                          <div className="flex items-center gap-2 mt-2">
                            {!invoice.poNumber && selectedAction?.id === 'missing-po' && (
                              <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded">
                                Missing PO
                              </span>
                            )}
                            {invoice.confidence && invoice.confidence > 90 && selectedAction?.id === 'auto-codeable' && (
                              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                                {Math.round(invoice.confidence)}% confidence
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-gray-500 italic mt-2">
                            Why here: {selectedAction?.description}
                          </p>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          <MoreVertical className="h-4 w-4 text-gray-400" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bulk Actions Bar */}
            {selectedInvoices.size > 0 && (
              <div className="p-4 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {selectedInvoices.size} {selectedInvoices.size === 1 ? 'invoice' : 'invoices'} selected
                  </span>
                  <div className="flex items-center gap-2">
                    <button className="px-3 py-1.5 text-sm bg-white text-purple-600 border border-purple-600 rounded-md hover:bg-purple-50">
                      Bulk Code
                    </button>
                    <button className="px-3 py-1.5 text-sm bg-white text-purple-600 border border-purple-600 rounded-md hover:bg-purple-50">
                      Bulk Approve
                    </button>
                    <button className="px-3 py-1.5 text-sm bg-purple-900 text-white rounded-md hover:bg-purple-800">
                      {selectedAction?.actionLabel}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Smart Action Modal */}
      {showCreateModal && <CreateActionModal onClose={() => setShowCreateModal(false)} />}

      {/* Invoice Details Drawer */}
      <InvoiceDetailsDrawer
        isOpen={showDetailsDrawer}
        onClose={() => setShowDetailsDrawer(false)}
        invoice={selectedInvoice}
      />
    </div>
  );
}

// Create Action Modal Component
function CreateActionModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div className="relative z-10 bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-950">Create Smart Action</h2>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Action Name</label>
            <input
              type="text"
              placeholder="e.g., Urgent Processing"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              type="text"
              placeholder="e.g., High priority invoices requiring immediate attention"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Filter Criteria</label>
            <div className="space-y-2">
              <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                <option>Amount greater than...</option>
                <option>Days overdue...</option>
                <option>Missing PO</option>
                <option>Has VAT</option>
                <option>Confidence score above...</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Default Action</label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
              <option>Approve</option>
              <option>Escalate</option>
              <option>Request PO</option>
              <option>Auto-code</option>
              <option>Review</option>
              <option>Hold</option>
            </select>
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button className="px-4 py-2 text-sm text-white bg-purple-900 rounded-md hover:bg-purple-800">
            Create Action
          </button>
        </div>
      </div>
    </div>
  );
}