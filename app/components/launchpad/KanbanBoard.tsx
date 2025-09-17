'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  CheckSquare,
  Square,
  MoreVertical,
  AlertCircle,
  Clock,
  Building2,
  FileText,
  ChevronRight,
  X,
  CheckCircle,
  XCircle,
  MessageSquare,
  TrendingUp,
  Info,
  DollarSign,
  Calendar,
  Tag,
  Users,
  FileWarning,
  AlertTriangle,
  Loader2,
  ArrowUpRight,
  ArrowRight,
  Check,
  UserPlus,
  Send,
  ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/app/components/ui/card';
import { InvoiceDetailsDrawer } from './InvoiceDetailsDrawer';

// Types
type LaneType = 'needs-data' | 'po-gr-mismatch' | 'services-no-gr' | 'waiting-approver' | 'ready-to-pay' | 'on-hold';
type PriorityType = 'high' | 'medium' | 'low';

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
  grNumber?: string;
  status: LaneType;
  priority: PriorityType;
  issues: string[];
  whyHere: string;
  actions?: string[];
  selected?: boolean;
}

interface Lane {
  id: LaneType;
  title: string;
  count: number;
  totalValue: number;
  invoices: Invoice[];
  color: string;
  icon: React.ReactNode;
}

// Mock data generator
const generateMockInvoices = (): Invoice[] => {
  const vendors = ['Acme Corp Ltd', 'British Supplies Co', 'Tech Solutions UK', 'London Office Supplies', 'Professional Services Ltd', 'Global Services Inc'];
  const issues = {
    'needs-data': ['Missing tax info', 'Incomplete coding', 'Missing VAT', 'No cost center'],
    'po-gr-mismatch': ['Price variance', 'Quantity mismatch', 'Wrong PO line', 'Unit price difference'],
    'services-no-gr': ['Awaiting coding', 'No budget owner', 'Service not confirmed', 'Missing approval'],
    'waiting-approver': ['Pending approval', 'Escalated', 'Manager OOO', 'Over authority'],
    'ready-to-pay': ['Approved', 'Payment scheduled', 'Discount available'],
    'on-hold': ['Under review', 'Dispute', 'Duplicate check', 'Credit note expected']
  };

  const invoices: Invoice[] = [];
  const statuses: LaneType[] = ['needs-data', 'po-gr-mismatch', 'services-no-gr', 'waiting-approver', 'ready-to-pay', 'on-hold'];
  const counts = [12, 8, 15, 22, 18, 5]; // Match wireframe counts

  statuses.forEach((status, statusIdx) => {
    for (let i = 0; i < counts[statusIdx]; i++) {
      const vendor = vendors[Math.floor(Math.random() * vendors.length)];
      const amount = Math.floor(Math.random() * 50000) + 500;
      const ageInDays = Math.floor(Math.random() * 30) + 1;

      invoices.push({
        id: `INV-2024-${String(statusIdx * 100 + i).padStart(3, '0')}`,
        vendor,
        invoiceNumber: `INV-2024-${String(Math.floor(Math.random() * 999)).padStart(3, '0')}`,
        amount,
        currency: 'GBP',
        hasVAT: Math.random() > 0.3,
        vatAmount: amount * 0.2,
        dueDate: new Date(Date.now() + (30 - ageInDays) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        ageInDays,
        poNumber: status !== 'services-no-gr' ? `PO-2024-${String(Math.floor(Math.random() * 999)).padStart(3, '0')}` : undefined,
        status,
        priority: ageInDays > 20 ? 'high' : ageInDays > 10 ? 'medium' : 'low',
        issues: [issues[status][Math.floor(Math.random() * issues[status].length)]],
        whyHere: getWhyHereText(status),
        selected: false
      });
    }
  });

  return invoices;
};

function getWhyHereText(status: LaneType): string {
  const reasons = {
    'needs-data': 'Missing required information for processing',
    'po-gr-mismatch': 'Price or quantity doesn\'t match PO/GR',
    'services-no-gr': 'Service invoice awaiting coding',
    'waiting-approver': 'Pending approval from authorized person',
    'ready-to-pay': 'Approved and ready for payment run',
    'on-hold': 'On hold pending resolution'
  };
  return reasons[status];
}

export default function KanbanBoard() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());
  const [filterVendor, setFilterVendor] = useState<string>('all');
  const [filterDueDate, setFilterDueDate] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<PriorityType | 'all'>('all');
  const [isDragging, setIsDragging] = useState(false);
  const [draggedInvoice, setDraggedInvoice] = useState<Invoice | null>(null);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showDetailsDrawer, setShowDetailsDrawer] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [uniqueVendors, setUniqueVendors] = useState<string[]>([]);

  useEffect(() => {
    const generatedInvoices = generateMockInvoices();
    setInvoices(generatedInvoices);
    // Extract unique vendors
    const vendors = [...new Set(generatedInvoices.map(inv => inv.vendor))].sort();
    setUniqueVendors(vendors);
  }, []);

  useEffect(() => {
    setShowBulkActions(selectedInvoices.size > 0);
  }, [selectedInvoices]);

  // Filter invoices based on vendor and due date
  const getFilteredLaneInvoices = (laneInvoices: Invoice[]) => {
    return laneInvoices.filter(invoice => {
      // Vendor filter
      const matchesVendor = filterVendor === 'all' || invoice.vendor === filterVendor;

      // Due date filter
      let matchesDueDate = true;
      if (filterDueDate !== 'all') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dueDate = new Date(invoice.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        const daysDiff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        switch(filterDueDate) {
          case 'overdue':
            matchesDueDate = daysDiff < 0;
            break;
          case 'today':
            matchesDueDate = daysDiff === 0;
            break;
          case 'week':
            matchesDueDate = daysDiff >= 0 && daysDiff <= 7;
            break;
          case 'month':
            matchesDueDate = daysDiff >= 0 && daysDiff <= 30;
            break;
        }
      }

      // Priority filter
      const matchesPriority = filterPriority === 'all' || invoice.priority === filterPriority;

      return matchesVendor && matchesDueDate && matchesPriority;
    });
  };

  // Define lanes with filtering
  const lanes: Lane[] = [
    {
      id: 'needs-data',
      title: 'Needs Data',
      count: getFilteredLaneInvoices(invoices.filter(i => i.status === 'needs-data')).length,
      totalValue: getFilteredLaneInvoices(invoices.filter(i => i.status === 'needs-data')).reduce((sum, i) => sum + i.amount, 0),
      invoices: getFilteredLaneInvoices(invoices.filter(i => i.status === 'needs-data')),
      color: 'orange',
      icon: <AlertCircle className="h-4 w-4" />
    },
    {
      id: 'po-gr-mismatch',
      title: 'PO/GR Mismatch',
      count: getFilteredLaneInvoices(invoices.filter(i => i.status === 'po-gr-mismatch')).length,
      totalValue: getFilteredLaneInvoices(invoices.filter(i => i.status === 'po-gr-mismatch')).reduce((sum, i) => sum + i.amount, 0),
      invoices: getFilteredLaneInvoices(invoices.filter(i => i.status === 'po-gr-mismatch')),
      color: 'red',
      icon: <FileWarning className="h-4 w-4" />
    },
    {
      id: 'services-no-gr',
      title: 'Services (No GR)',
      count: getFilteredLaneInvoices(invoices.filter(i => i.status === 'services-no-gr')).length,
      totalValue: getFilteredLaneInvoices(invoices.filter(i => i.status === 'services-no-gr')).reduce((sum, i) => sum + i.amount, 0),
      invoices: getFilteredLaneInvoices(invoices.filter(i => i.status === 'services-no-gr')),
      color: 'blue',
      icon: <FileText className="h-4 w-4" />
    },
    {
      id: 'waiting-approver',
      title: 'Waiting Approver',
      count: getFilteredLaneInvoices(invoices.filter(i => i.status === 'waiting-approver')).length,
      totalValue: getFilteredLaneInvoices(invoices.filter(i => i.status === 'waiting-approver')).reduce((sum, i) => sum + i.amount, 0),
      invoices: getFilteredLaneInvoices(invoices.filter(i => i.status === 'waiting-approver')),
      color: 'amber',
      icon: <Clock className="h-4 w-4" />
    },
    {
      id: 'ready-to-pay',
      title: 'Ready to Pay',
      count: getFilteredLaneInvoices(invoices.filter(i => i.status === 'ready-to-pay')).length,
      totalValue: getFilteredLaneInvoices(invoices.filter(i => i.status === 'ready-to-pay')).reduce((sum, i) => sum + i.amount, 0),
      invoices: getFilteredLaneInvoices(invoices.filter(i => i.status === 'ready-to-pay')),
      color: 'green',
      icon: <CheckCircle className="h-4 w-4" />
    },
    {
      id: 'on-hold',
      title: 'On Hold',
      count: getFilteredLaneInvoices(invoices.filter(i => i.status === 'on-hold')).length,
      totalValue: getFilteredLaneInvoices(invoices.filter(i => i.status === 'on-hold')).reduce((sum, i) => sum + i.amount, 0),
      invoices: getFilteredLaneInvoices(invoices.filter(i => i.status === 'on-hold')),
      color: 'gray',
      icon: <AlertTriangle className="h-4 w-4" />
    }
  ].filter(lane => lane.invoices.length > 0); // Hide empty lanes

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

  const toggleAllInLane = (laneInvoices: Invoice[]) => {
    setSelectedInvoices(prev => {
      const newSet = new Set(prev);
      const allSelected = laneInvoices.every(inv => prev.has(inv.id));

      if (allSelected) {
        // Deselect all in this lane
        laneInvoices.forEach(inv => newSet.delete(inv.id));
      } else {
        // Select all in this lane
        laneInvoices.forEach(inv => newSet.add(inv.id));
      }
      return newSet;
    });
  };

  const clearSelection = () => {
    setSelectedInvoices(new Set());
  };

  const handleDragStart = (e: React.DragEvent, invoice: Invoice) => {
    setIsDragging(true);
    setDraggedInvoice(invoice);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('invoiceStatus', invoice.status); // Track original lane
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDraggedInvoice(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    const originalStatus = e.dataTransfer.types.includes('invoiceStatus') ?
      e.dataTransfer.getData('invoiceStatus') : null;
    // Only allow drop if it's within same lane
    if (draggedInvoice && e.currentTarget.getAttribute('data-lane') === draggedInvoice.status) {
      e.dataTransfer.dropEffect = 'move';
    } else {
      e.dataTransfer.dropEffect = 'none';
    }
  };

  const handleDrop = (e: React.DragEvent, targetStatus: LaneType) => {
    e.preventDefault();
    // Prevent cross-lane drops
    if (draggedInvoice && draggedInvoice.status === targetStatus) {
      // Allow reordering within the same lane if needed
      // For now, just reset the drag state
    }
    handleDragEnd();
  };

  const handleInvoiceClick = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowDetailsDrawer(true);
  };

  const formatCurrency = (amount: number) => {
    return `£${amount.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const getPriorityColor = (priority: PriorityType) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-amber-600 bg-amber-100';
      case 'low': return 'text-green-600 bg-green-100';
    }
  };

  const getStatusColor = (status: LaneType) => {
    switch (status) {
      case 'needs-data': return 'border-gray-200';
      case 'po-gr-mismatch': return 'border-gray-200';
      case 'services-no-gr': return 'border-gray-200';
      case 'waiting-approver': return 'border-gray-200';
      case 'ready-to-pay': return 'border-gray-200';
      case 'on-hold': return 'border-gray-200';
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header with filters */}
      <div className="mb-4">
        <div className="flex items-center justify-between gap-4">
          {/* Filters */}
          <div className="flex items-center gap-2 flex-1">
            <select
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={filterVendor}
              onChange={(e) => setFilterVendor(e.target.value)}
            >
              <option value="all">All Vendors</option>
              {uniqueVendors.map(vendor => (
                <option key={vendor} value={vendor}>{vendor}</option>
              ))}
            </select>

            <select
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={filterDueDate}
              onChange={(e) => setFilterDueDate(e.target.value)}
            >
              <option value="all">All Due Dates</option>
              <option value="overdue">Overdue</option>
              <option value="today">Due Today</option>
              <option value="week">Due This Week</option>
              <option value="month">Due This Month</option>
            </select>

            <select
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value as PriorityType | 'all')}
            >
              <option value="all">All Priorities</option>
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </select>

            {selectedInvoices.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  {selectedInvoices.size} selected
                </span>
                <button
                  onClick={clearSelection}
                  className="text-sm text-purple-600 hover:text-purple-700"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          {/* Summary stats */}
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600">
              <span className="font-semibold text-gray-950">{invoices.length}</span> total invoices
            </div>
            <div className="text-sm text-gray-600">
              <span className="font-semibold text-gray-950">
                {formatCurrency(invoices.reduce((sum, i) => sum + i.amount, 0))}
              </span> total value
            </div>
          </div>
        </div>

        {/* Bulk actions bar */}
        {showBulkActions && (
          <div className="mt-3 p-3 bg-purple-50 rounded-md flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-900">
                {selectedInvoices.size} invoices selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1.5 text-sm bg-white text-purple-600 rounded-md hover:bg-purple-50 border border-purple-600">
                Approve
              </button>
              <button className="px-3 py-1.5 text-sm bg-white text-purple-600 rounded-md hover:bg-purple-50 border border-purple-600">
                To Approval
              </button>
              <button className="px-3 py-1.5 text-sm bg-white text-purple-600 rounded-md hover:bg-purple-50 border border-purple-600">
                <UserPlus className="h-4 w-4 inline mr-1" />
                Assign
              </button>
              <button className="px-3 py-1.5 text-sm bg-white text-purple-600 rounded-md hover:bg-purple-50 border border-purple-600">
                <MessageSquare className="h-4 w-4 inline mr-1" />
                Comment
              </button>

              {/* Dropdown for more actions */}
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="px-3 py-1.5 text-sm bg-white text-purple-600 rounded-md hover:bg-purple-50 border border-purple-600 flex items-center gap-1"
                >
                  <MoreVertical className="h-4 w-4" />
                  <ChevronDown className="h-3 w-3" />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-10">
                    <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100">Export Selected</button>
                    <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100">Bulk Query</button>
                    <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100">Mark as Urgent</button>
                    <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100">Change Priority</button>
                    <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100">Add to Batch</button>
                    <button className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50">Reject</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Kanban lanes */}
      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-4 h-full min-w-max pb-4">
          {lanes.map((lane) => (
            <KanbanLane
              key={lane.id}
              lane={lane}
              isDragging={isDragging}
              selectedInvoices={selectedInvoices}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onToggleSelection={toggleInvoiceSelection}
              onToggleAll={toggleAllInLane}
              onInvoiceClick={handleInvoiceClick}
              formatCurrency={formatCurrency}
              getPriorityColor={getPriorityColor}
              getStatusColor={getStatusColor}
              filterPriority={filterPriority}
            />
          ))}
        </div>
      </div>

      {/* Invoice Details Drawer */}
      <InvoiceDetailsDrawer
        isOpen={showDetailsDrawer}
        onClose={() => setShowDetailsDrawer(false)}
        invoice={selectedInvoice}
      />
    </div>
  );
}

// KanbanLane component
interface KanbanLaneProps {
  lane: Lane;
  isDragging: boolean;
  selectedInvoices: Set<string>;
  onDragStart: (e: React.DragEvent, invoice: Invoice) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, status: LaneType) => void;
  onToggleSelection: (invoiceId: string) => void;
  onToggleAll: (invoices: Invoice[]) => void;
  onInvoiceClick: (invoice: Invoice) => void;
  formatCurrency: (amount: number) => string;
  getPriorityColor: (priority: PriorityType) => string;
  getStatusColor: (status: LaneType) => string;
  filterPriority: PriorityType | 'all';
}

function KanbanLane({
  lane,
  isDragging,
  selectedInvoices,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onToggleSelection,
  onToggleAll,
  onInvoiceClick,
  formatCurrency,
  getPriorityColor,
  getStatusColor,
  filterPriority
}: KanbanLaneProps) {
  const [showAll, setShowAll] = useState(false);
  const INITIAL_DISPLAY_COUNT = 6;

  // Lane invoices are already filtered by the parent component
  const filteredInvoices = lane.invoices;

  const displayedInvoices = showAll ? filteredInvoices : filteredInvoices.slice(0, INITIAL_DISPLAY_COUNT);
  const hasMore = filteredInvoices.length > INITIAL_DISPLAY_COUNT;
  const hiddenCount = filteredInvoices.length - INITIAL_DISPLAY_COUNT;
  const allSelected = filteredInvoices.length > 0 && filteredInvoices.every(inv => selectedInvoices.has(inv.id));

  const laneColorClasses = {
    orange: 'bg-orange-500',
    red: 'bg-red-500',
    blue: 'bg-blue-500',
    amber: 'bg-amber-500',
    green: 'bg-green-500',
    gray: 'bg-gray-500'
  };

  return (
    <div className="flex-shrink-0 w-80 flex flex-col bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Lane header */}
      <div className="p-3 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={cn("w-1 h-6 rounded", laneColorClasses[lane.color as keyof typeof laneColorClasses])} />
            <div className="flex items-center gap-1.5">
              {lane.icon}
              <h3 className="font-semibold text-gray-950">{lane.title}</h3>
            </div>
            <span className="px-2.5 py-0.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-sm">
              {lane.count}
            </span>
          </div>
          {filteredInvoices.length > 0 && (
            <button
              onClick={() => onToggleAll(filteredInvoices)}
              className="text-xs text-purple-600 hover:text-purple-700"
            >
              {allSelected ? 'Deselect all' : 'Select all'}
            </button>
          )}
        </div>
        <div className="text-sm text-gray-700">
          Total value: <span className="font-semibold text-gray-950">{formatCurrency(lane.totalValue)}</span>
        </div>
      </div>

      {/* Lane content */}
      <div
        className={cn(
          "flex-1 p-3 overflow-y-auto space-y-2 bg-white",
          isDragging && "bg-gray-50"
        )}
        data-lane={lane.id}
        onDragOver={onDragOver}
        onDrop={(e) => onDrop(e, lane.id)}
      >
        {filteredInvoices.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">{lane.icon}</div>
            <p className="text-sm text-gray-600">No invoices in this lane</p>
            <p className="text-xs text-gray-500 mt-1">
              Items will appear here when they match the criteria
            </p>
          </div>
        ) : (
          <>
            {displayedInvoices.map((invoice) => (
              <InvoiceCard
                key={invoice.id}
                invoice={invoice}
                isSelected={selectedInvoices.has(invoice.id)}
                onToggleSelection={onToggleSelection}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onCardClick={onInvoiceClick}
                formatCurrency={formatCurrency}
                getPriorityColor={getPriorityColor}
                getStatusColor={getStatusColor}
              />
            ))}

            {hasMore && (
              <button
                onClick={() => setShowAll(!showAll)}
                className="w-full py-2 text-sm text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-md transition-colors font-medium"
              >
                {showAll ? (
                  <span className="flex items-center justify-center gap-1">
                    Show less
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-1">
                    Show {hiddenCount} more
                  </span>
                )}
              </button>
            )}
          </>
        )}
      </div>

      {/* Lane footer */}
      <div className="p-3 border-t border-gray-200 bg-white">
        <button className="w-full flex items-center justify-center gap-1 text-sm text-purple-600 hover:text-purple-700 font-medium">
          Open Queue
          <ChevronRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

// InvoiceCard component
interface InvoiceCardProps {
  invoice: Invoice;
  isSelected: boolean;
  onToggleSelection: (invoiceId: string) => void;
  onDragStart: (e: React.DragEvent, invoice: Invoice) => void;
  onDragEnd: () => void;
  onCardClick: (invoice: Invoice) => void;
  formatCurrency: (amount: number) => string;
  getPriorityColor: (priority: PriorityType) => string;
  getStatusColor: (status: LaneType) => string;
}

function InvoiceCard({
  invoice,
  isSelected,
  onToggleSelection,
  onDragStart,
  onDragEnd,
  onCardClick,
  formatCurrency,
  getPriorityColor,
  getStatusColor
}: InvoiceCardProps) {
  const handleCardClick = (e: React.MouseEvent) => {
    // Only trigger if not clicking on checkbox or action buttons
    const target = e.target as HTMLElement;
    if (!target.closest('button') && !target.closest('input')) {
      onCardClick(invoice);
    }
  };

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, invoice)}
      onDragEnd={onDragEnd}
      onClick={handleCardClick}
      className={cn(
        "p-3 bg-white rounded-md border cursor-pointer transition-all shadow-sm",
        isSelected ? "border-purple-500 shadow-md ring-2 ring-purple-100" : "border-gray-200 hover:shadow-md hover:border-gray-300"
      )}
    >
      {/* Card header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-start gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelection(invoice.id);
            }}
            className="mt-0.5"
          >
            {isSelected ? (
              <CheckSquare className="h-4 w-4 text-purple-600" />
            ) : (
              <Square className="h-4 w-4 text-gray-400" />
            )}
          </button>
          <div>
            <div className="flex items-center gap-2">
              <Building2 className="h-3 w-3 text-gray-500" />
              <p className="text-sm font-medium text-gray-950">{invoice.vendor}</p>
              {invoice.hasVAT && (
                <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded">VAT</span>
              )}
            </div>
            <p className="text-xs text-gray-600">{invoice.invoiceNumber}</p>
          </div>
        </div>
      </div>

      {/* Amount and details */}
      <div className="mb-2">
        <p className="text-lg font-bold text-gray-950">{formatCurrency(invoice.amount)}</p>
        <div className="flex items-center gap-3 mt-1">
          {invoice.ageInDays > 0 && (
            <div className="flex items-center gap-1 text-xs text-gray-700">
              <Clock className="h-3 w-3" />
              <span className={cn(
                invoice.ageInDays > 20 ? "text-red-600 font-medium" : ""
              )}>
                {invoice.ageInDays} {invoice.ageInDays === 1 ? 'day' : 'days'}
                {invoice.ageInDays > 20 && ' Due today'}
              </span>
            </div>
          )}
          {invoice.poNumber && (
            <div className="text-xs text-gray-700">
              <span className="font-medium">PO:</span> {invoice.poNumber}
            </div>
          )}
        </div>
      </div>

      {/* Issue tags */}
      <div className="flex flex-wrap gap-1 mb-2">
        {invoice.issues.map((issue, idx) => (
          <span
            key={idx}
            className={cn(
              "text-[10px] px-2 py-0.5 rounded font-medium",
              getPriorityColor(invoice.priority)
            )}
          >
            {issue}
          </span>
        ))}
      </div>

      {/* Why here section */}
      <div className="pt-2 border-t border-gray-200">
        <p className="text-[10px] text-gray-600 italic">Why here: {invoice.whyHere}</p>
      </div>

      {/* Quick actions - always visible */}
      <div className="mt-2 pt-2 border-t border-gray-200 flex items-center gap-1">
        {invoice.status === 'waiting-approver' || invoice.status === 'po-gr-mismatch' ? (
          <>
            <button
              onClick={(e) => e.stopPropagation()}
              className="flex-1 px-2 py-1 text-xs bg-purple-100 text-purple-900 rounded hover:bg-purple-200"
            >
              Accept
            </button>
            <button
              onClick={(e) => e.stopPropagation()}
              className="flex-1 px-2 py-1 text-xs bg-purple-100 text-purple-900 rounded hover:bg-purple-200"
            >
              Escalate
            </button>
          </>
        ) : invoice.status === 'ready-to-pay' ? (
          <button
            onClick={(e) => e.stopPropagation()}
            className="flex-1 px-2 py-1 text-xs bg-purple-100 text-purple-900 rounded hover:bg-purple-200"
          >
            Schedule Payment
          </button>
        ) : invoice.status === 'needs-data' ? (
          <button
            onClick={(e) => e.stopPropagation()}
            className="flex-1 px-2 py-1 text-xs bg-purple-100 text-purple-900 rounded hover:bg-purple-200"
          >
            Add Info
          </button>
        ) : (
          <button
            onClick={(e) => e.stopPropagation()}
            className="flex-1 px-2 py-1 text-xs bg-purple-100 text-purple-900 rounded hover:bg-purple-200"
          >
            Review
          </button>
        )}
      </div>
    </div>
  );
}