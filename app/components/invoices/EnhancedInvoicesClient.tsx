'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Upload,
  Plus,
  Search,
  Check,
  ChevronDown,
  Filter,
  UserPlus,
  MessageSquare,
  Send,
  CheckSquare,
  Square
} from 'lucide-react';
import { EnhancedInvoiceTable } from './EnhancedInvoiceTable';
import { UploadDialog } from './UploadDialog';
import { ArchiveInvoiceDialog } from './ArchiveInvoiceDialog';
import InvoicePipeline from './InvoicePipeline';
import { calculatePipelineCounts, PipelineStage } from '@/app/utils/pipelineCalculations';
import { PurchaseOrderDrawer } from '../purchase-orders/PurchaseOrderDrawer';
import { cn } from '@/lib/utils';

interface Invoice {
  id: string;
  invoice_number: string;
  vendor_name_snapshot: string;
  invoice_date: string;
  due_date: string;
  currency: string;
  total: number;
  status?: string;
  match_status?: string;
  vendor_requires_po?: boolean | null;
  vendor_is_verified?: boolean;
  approval_status?: string;
  po_numbers_cached?: string[];
  gr_numbers?: string[];
}

interface EnhancedInvoicesClientProps {
  initialInvoices: Invoice[];
}

// Time filter options
const timeFilters = [
  { id: 'all', label: 'All time', value: null },
  { id: '30days', label: 'Last 30 Days', value: 30 },
  { id: '7days', label: 'Last 7 Days', value: 7 },
  { id: 'yesterday', label: 'Yesterday', value: 1 },
  { id: 'today', label: 'Today', value: 0 },
  { id: 'custom', label: 'Custom range', value: -1 }
];

// Exception types from kanban lanes
const exceptionTypes = [
  { id: 'all', label: 'All Statuses', value: 'all' },
  { id: 'exceptions', label: 'All Exceptions', value: 'exceptions' },
  { id: 'needs-data', label: 'Needs Data', value: 'needs-data' },
  { id: 'po-gr-mismatch', label: 'PO/GR Mismatch', value: 'po-gr-mismatch' },
  { id: 'services-no-gr', label: 'Services (No GR)', value: 'services-no-gr' },
  { id: 'waiting-approver', label: 'Waiting Approver', value: 'waiting-approver' },
  { id: 'ready-to-pay', label: 'Ready to Pay', value: 'ready-to-pay' },
  { id: 'on-hold', label: 'On Hold', value: 'on-hold' }
];

export default function EnhancedInvoicesClient({ initialInvoices }: EnhancedInvoicesClientProps) {
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>(initialInvoices);
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>([]);
  const [pipelineLoading, setPipelineLoading] = useState(false);
  const [selectedPO, setSelectedPO] = useState<any>(null);
  const [loadingPO, setLoadingPO] = useState(false);
  const [archivingInvoice, setArchivingInvoice] = useState<{ id: string; number: string } | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);

  // Filter states
  const [selectedTimeFilter, setSelectedTimeFilter] = useState('30days');
  const [selectedVendor, setSelectedVendor] = useState('all');
  const [selectedDueDate, setSelectedDueDate] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [selectedException, setSelectedException] = useState('all');

  const router = useRouter();

  // Get unique vendors from invoices
  const uniqueVendors = useMemo(() => {
    const vendors = new Set(invoices.map(inv => inv.vendor_name_snapshot).filter(Boolean));
    return Array.from(vendors).sort();
  }, [invoices]);

  // Calculate pipeline stages when invoices change
  useEffect(() => {
    const validInvoices = invoices.filter(inv => inv.status !== undefined);
    const stages = calculatePipelineCounts(validInvoices as any);
    setPipelineStages(stages);
  }, [invoices]);

  // Apply all filters
  useEffect(() => {
    let filtered = [...invoices];

    // Time filter
    if (selectedTimeFilter !== 'all' && selectedTimeFilter !== 'custom') {
      const daysAgo = timeFilters.find(f => f.id === selectedTimeFilter)?.value;
      if (daysAgo !== null && daysAgo !== undefined && daysAgo >= 0) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
        cutoffDate.setHours(0, 0, 0, 0);

        filtered = filtered.filter(invoice => {
          const invoiceDate = new Date(invoice.invoice_date);
          return invoiceDate >= cutoffDate;
        });
      }
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(invoice => {
        if (invoice.invoice_number?.toLowerCase().includes(query)) return true;
        if (invoice.vendor_name_snapshot?.toLowerCase().includes(query)) return true;
        if (invoice.po_numbers_cached?.some(po => po.toLowerCase().includes(query))) return true;
        if (invoice.total?.toString().includes(query)) return true;
        return false;
      });
    }

    // Vendor filter
    if (selectedVendor !== 'all') {
      filtered = filtered.filter(invoice => invoice.vendor_name_snapshot === selectedVendor);
    }

    // Due date filter
    if (selectedDueDate !== 'all') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      filtered = filtered.filter(invoice => {
        const dueDate = new Date(invoice.due_date);
        dueDate.setHours(0, 0, 0, 0);
        const daysDiff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        switch(selectedDueDate) {
          case 'overdue':
            return daysDiff < 0;
          case 'today':
            return daysDiff === 0;
          case 'week':
            return daysDiff >= 0 && daysDiff <= 7;
          case 'month':
            return daysDiff >= 0 && daysDiff <= 30;
          default:
            return true;
        }
      });
    }

    // Exception filter
    if (selectedException !== 'all') {
      if (selectedException === 'exceptions') {
        filtered = filtered.filter(invoice => invoice.match_status === 'exception');
      } else {
        // Map exception types to match_status values
        filtered = filtered.filter(invoice => invoice.status === selectedException);
      }
    }

    setFilteredInvoices(filtered);
  }, [searchQuery, invoices, selectedTimeFilter, selectedVendor, selectedDueDate, selectedPriority, selectedException]);

  const handleUploadComplete = useCallback((invoiceId: string) => {
    router.push(`/invoices/${invoiceId}`);
  }, [router]);

  const refreshInvoices = useCallback(async () => {
    try {
      const response = await fetch('/api/invoices');
      if (response.ok) {
        const data = await response.json();
        setInvoices(data.invoices || []);
      }
    } catch (error) {
      console.error('Error refreshing invoices:', error);
    }
  }, []);

  const handleDelete = useCallback(async (invoiceId: string) => {
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (!invoice) return;
    setArchivingInvoice({ id: invoiceId, number: invoice.invoice_number });
  }, [invoices]);

  const handleArchiveConfirm = useCallback(async () => {
    if (!archivingInvoice) return;

    setIsArchiving(true);
    try {
      const response = await fetch(`/api/invoices/${archivingInvoice.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setInvoices(prev => prev.filter(inv => inv.id !== archivingInvoice.id));
        setArchivingInvoice(null);
        await refreshInvoices();
      } else {
        const error = await response.json();
        alert(`Failed to archive invoice: ${error.error || 'Unknown error'}`);
        setArchivingInvoice(null);
        await refreshInvoices();
      }
    } catch (error) {
      console.error('Error archiving invoice:', error);
      alert('Failed to archive invoice. Please try again.');
      setArchivingInvoice(null);
      await refreshInvoices();
    } finally {
      setIsArchiving(false);
    }
  }, [archivingInvoice, refreshInvoices]);

  const handleArchiveCancel = useCallback(() => {
    setArchivingInvoice(null);
    setIsArchiving(false);
  }, []);

  const handlePOClick = useCallback(async (poNumber: string) => {
    setLoadingPO(true);
    try {
      const response = await fetch(`/api/purchase-orders/by-number/${encodeURIComponent(poNumber)}`);
      if (response.ok) {
        const poData = await response.json();
        if (poData) {
          setSelectedPO(poData);
        }
      }
    } catch (error) {
      console.error('Error fetching PO details:', error);
    } finally {
      setLoadingPO(false);
    }
  }, []);

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
    if (selectedInvoices.size === filteredInvoices.length && filteredInvoices.length > 0) {
      setSelectedInvoices(new Set());
    } else {
      setSelectedInvoices(new Set(filteredInvoices.map(inv => inv.id)));
    }
  };

  const clearSelection = () => {
    setSelectedInvoices(new Set());
  };

  return (
    <>
      {/* Header with Add Invoice button */}
      <div className="mb-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-950">Invoices</h1>
        <button
          onClick={() => setUploadDialogOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-900 text-white rounded-md hover:bg-purple-800"
        >
          <Plus className="h-4 w-4" />
          Add Invoice
        </button>
      </div>

      {/* Invoice Pipeline */}
      <InvoicePipeline
        stages={pipelineStages}
        loading={pipelineLoading}
        onStageClick={() => {}}
      />

      {/* Search bar and filter pills */}
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <div className="relative w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="search"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-2 w-full border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <button className="px-3 py-2 bg-white border border-purple-600 text-purple-600 text-sm rounded-md hover:bg-purple-50 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2">
            <Filter className="h-4 w-4 inline mr-1.5" />
            Columns & Filters
          </button>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 ml-auto">
            {/* Vendor Filter */}
            <select
              value={selectedVendor}
              onChange={(e) => setSelectedVendor(e.target.value)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-colors border appearance-none cursor-pointer",
                selectedVendor !== 'all'
                  ? "bg-purple-100 text-purple-900 border-purple-300"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              )}
            >
              <option value="all">All Vendors</option>
              {uniqueVendors.map(vendor => (
                <option key={vendor} value={vendor}>{vendor}</option>
              ))}
            </select>

            {/* Due Date Filter */}
            <select
              value={selectedDueDate}
              onChange={(e) => setSelectedDueDate(e.target.value)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-colors border appearance-none cursor-pointer",
                selectedDueDate !== 'all'
                  ? "bg-purple-100 text-purple-900 border-purple-300"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              )}
            >
              <option value="all">All Due Dates</option>
              <option value="overdue">Overdue</option>
              <option value="today">Due Today</option>
              <option value="week">Due This Week</option>
              <option value="month">Due This Month</option>
            </select>

            {/* Priority Filter */}
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-colors border appearance-none cursor-pointer",
                selectedPriority !== 'all'
                  ? "bg-purple-100 text-purple-900 border-purple-300"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              )}
            >
              <option value="all">All Priorities</option>
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </select>

            {/* Exception Filter */}
            <select
              value={selectedException}
              onChange={(e) => setSelectedException(e.target.value)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-colors border appearance-none cursor-pointer",
                selectedException !== 'all'
                  ? "bg-purple-100 text-purple-900 border-purple-300"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              )}
            >
              {exceptionTypes.map(type => (
                <option key={type.id} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <EnhancedInvoiceTable
        invoices={filteredInvoices as any}
        selectedInvoices={selectedInvoices}
        onToggleSelection={toggleInvoiceSelection}
        onToggleAll={toggleAllSelection}
        onDelete={handleDelete}
        onPOClick={handlePOClick}
      />

      {/* Bulk Actions Bar */}
      {selectedInvoices.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-white rounded-lg shadow-lg border border-gray-200 p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-gray-900">
                {selectedInvoices.size} selected
              </span>
            </div>
            <div className="h-6 w-px bg-gray-300" />
            <div className="flex items-center gap-2">
              <button className="px-3 py-1.5 text-sm bg-white text-purple-600 border border-purple-600 rounded-md hover:bg-purple-50">
                Approve
              </button>
              <button className="px-3 py-1.5 text-sm bg-white text-purple-600 border border-purple-600 rounded-md hover:bg-purple-50">
                To Approval
              </button>
              <button className="flex items-center gap-1 px-3 py-1.5 text-sm bg-white text-purple-600 border border-purple-600 rounded-md hover:bg-purple-50">
                <UserPlus className="h-3 w-3" />
                Assign
              </button>
              <button className="flex items-center gap-1 px-3 py-1.5 text-sm bg-white text-purple-600 border border-purple-600 rounded-md hover:bg-purple-50">
                <MessageSquare className="h-3 w-3" />
                Comment
              </button>
            </div>
            <button
              onClick={clearSelection}
              className="ml-auto text-sm text-gray-500 hover:text-gray-700"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      <UploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onUploadComplete={handleUploadComplete}
      />

      {selectedPO && (
        <PurchaseOrderDrawer
          purchaseOrderId={selectedPO.id}
          purchaseOrder={selectedPO}
          onClose={() => setSelectedPO(null)}
        />
      )}

      <ArchiveInvoiceDialog
        isOpen={archivingInvoice !== null}
        onClose={handleArchiveCancel}
        onConfirm={handleArchiveConfirm}
        invoiceNumber={archivingInvoice?.number || ''}
        isLoading={isArchiving}
      />
    </>
  );
}