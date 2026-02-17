'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Clock, CheckCircle, XCircle, AlertTriangle,
  Calendar, Users, Filter, ChevronDown,
  Check, X, Forward, MoreVertical, Plus,
  User, DollarSign, Building2, Hash, FileText, Search, CalendarDays
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { ApprovalsTable } from '@/app/components/approvals/ApprovalsTable';
import { InvoiceDrawer } from '@/app/components/approvals/InvoiceDrawer';
import { DelegationModal } from '@/app/components/approvals/DelegationModal';
import { IntelligentAssignmentModal } from '@/app/components/approvals/IntelligentAssignmentModal';
import { UnassignModal } from '@/app/components/approvals/UnassignModal';
import { TeamWorkloadDrawer } from '@/app/components/approvals/TeamWorkloadDrawer';
import { BulkAssignmentDrawer } from '@/app/components/approvals/BulkAssignmentDrawer';
import { compareBySLA, type SLAStatus } from '@/app/services/slaService';
import { useToast } from '@/app/components/ui/Toast';
import { getRoutingSuggestions, type ApproverSuggestion } from '@/app/services/approvalRoutingService';

export type ViewType = 'pending' | 'on-hold' | 'approved' | 'rejected' | 'completed_rejected' | 'all';
export type UserRole = 'user' | 'admin';

interface Invoice {
  id: string;
  invoice_number: string;
  vendor_name_snapshot: string;
  invoice_date: string;
  due_date: string;
  currency: string;
  total: number;
  status: string;
  match_status: string;
  workflow_status?: string;
  assigned_to_user_id?: string;
  assigned_to_name?: string;
  department?: string;
  po_numbers_cached?: string[];
  approval_status?: string;
  days_past_due?: number;
  hold_reason?: string;
  rejection_reason?: string;
  approved_date?: string;
  rejected_date?: string;
  // SLA fields
  assigned_at?: string;
  sla_hours?: number;
  sla_status?: SLAStatus;
  hours_overdue?: number;
}

interface TeamMember {
  id: string;
  name: string;
  initials: string;
  email?: string;
  role?: string;
  color: string;
  current_workload?: number;
  capacity?: number;
  status?: 'available' | 'busy' | 'out-of-office';
}

export function ApprovalsClient() {
  const router = useRouter();
  const { showToast } = useToast();
  const [activeView, setActiveView] = useState<ViewType>('pending');
  const [userRole, setUserRole] = useState<UserRole>('user');
  const [allInvoices, setAllInvoices] = useState<Invoice[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [showDelegationModal, setShowDelegationModal] = useState<{ invoiceId: string; assignee: TeamMember } | null>(null);
  const [showIntelligentAssignmentModal, setShowIntelligentAssignmentModal] = useState<{ 
    invoiceId: string; 
    invoice: Invoice; 
    suggestions: ApproverSuggestion[];
    autoRouteEligible: boolean;
  } | null>(null);
  const [showUnassignModal, setShowUnassignModal] = useState<{ invoiceId: string; currentAssigneeName: string } | null>(null);
  const [showTeamWorkloadDrawer, setShowTeamWorkloadDrawer] = useState(false);
  const [showBulkAssignmentDrawer, setShowBulkAssignmentDrawer] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [dateFilter, setDateFilter] = useState<string>('last30');

  // Date filter options
  const dateFilterOptions = [
    { id: 'last7', label: 'Last 7 Days', days: 7 },
    { id: 'last30', label: 'Last 30 Days', days: 30 },
    { id: 'last90', label: 'Last 90 Days', days: 90 },
    { id: 'last6months', label: 'Last 6 Months', days: 180 },
    { id: 'lastYear', label: 'Last Year', days: 365 },
    { id: 'all', label: 'All Time', days: null },
  ];

  const getDateFilterLabel = () => {
    const option = dateFilterOptions.find(o => o.id === dateFilter);
    return option?.label || 'Last 30 Days';
  };

  const filterByDate = (invoices: Invoice[]): Invoice[] => {
    const option = dateFilterOptions.find(o => o.id === dateFilter);
    if (!option || option.days === null) return invoices;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - option.days);
    cutoffDate.setHours(0, 0, 0, 0);

    return invoices.filter(inv => {
      const invoiceDate = new Date(inv.invoice_date);
      return invoiceDate >= cutoffDate;
    });
  };

  // Default team members (fallback) - IDs must match those used in mock invoices (user-1, user-2, etc.)
  const defaultTeamMembers: TeamMember[] = [
    { id: 'user-1', name: 'Sarah Mitchell', initials: 'SM', role: 'Approver', color: 'bg-purple-600', current_workload: 5, capacity: 20, status: 'available' },
    { id: 'user-2', name: 'James Thompson', initials: 'JT', role: 'Approver', color: 'bg-blue-600', current_workload: 3, capacity: 20, status: 'available' },
    { id: 'user-3', name: 'Caroline Walsh', initials: 'CW', role: 'Approver', color: 'bg-green-600', current_workload: 4, capacity: 20, status: 'available' },
    { id: 'user-4', name: 'James Wilson', initials: 'JW', role: 'Senior Approver', color: 'bg-orange-600', current_workload: 6, capacity: 20, status: 'available' },
  ];

  // Fetch all invoices on mount and when user role changes
  useEffect(() => {
    fetchInvoices();
  }, [userRole]);
  
  // Filter invoices when view or date filter changes
  useEffect(() => {
    if (allInvoices.length > 0) {
      const dateFiltered = filterByDate(allInvoices);
      const filtered = filterInvoicesByView(dateFiltered, activeView);
      setFilteredInvoices(filtered);
    }
  }, [activeView, allInvoices, dateFilter]);

  const fetchInvoices = async () => {
    setIsLoading(true);
    try {
      // Always fetch all invoices regardless of view
      const response = await fetch(`/api/approvals/invoices?view=all&role=${userRole}&userId=current-user`);
      if (response.ok) {
        const data = await response.json();
        const invoicesArray = data.invoices || [];
        setAllInvoices(invoicesArray);
        setFilteredInvoices(filterInvoicesByView(invoicesArray, activeView));
        setTeamMembers(data.teamMembers?.length > 0 ? data.teamMembers : defaultTeamMembers);
      } else {
        // Fallback to general invoices API
        const fallbackResponse = await fetch('/api/invoices');
        if (fallbackResponse.ok) {
          const data = await fallbackResponse.json();
          // Extract invoices array from the response object
          const invoicesArray = data.invoices || data || [];
          setAllInvoices(invoicesArray);
          setFilteredInvoices(filterInvoicesByView(invoicesArray, activeView));
          setTeamMembers(defaultTeamMembers);
        }
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
      setTeamMembers(defaultTeamMembers);
    } finally {
      setIsLoading(false);
    }
  };

  const filterInvoicesByView = (invoices: Invoice[], view: ViewType): Invoice[] => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let filtered: Invoice[];

    switch (view) {
      case 'pending':
        // "Pending Review" tab - unassigned invoices waiting to be assigned
        filtered = invoices.filter(inv => {
          // Include standard pending statuses
          const isPendingStatus =
            inv.status === 'pending_approval' ||
            inv.status === 'requires_review' ||
            inv.status === 'processing' ||
            inv.status === 'validating' ||
            inv.status === 'verification' ||
            inv.status === 'draft';

          // Also include overdue invoices (not paid/approved/rejected)
          const dueDate = new Date(inv.due_date);
          const isOverdue =
            dueDate < today &&
            inv.status !== 'paid' &&
            inv.status !== 'approved' &&
            inv.status !== 'rejected' &&
            inv.status !== 'void';

          // Only show unassigned invoices in Pending Review
          const isUnassigned = !inv.assigned_to_user_id;

          return (isPendingStatus || isOverdue) && isUnassigned;
        });
        break;
      case 'on-hold':
        filtered = invoices.filter(inv => inv.status === 'on_hold');
        break;
      case 'approved':
        // "Pending Approval" tab - assigned invoices waiting for approver action
        filtered = invoices.filter(inv => {
          const hasAssignee = !!inv.assigned_to_user_id;
          const isPendingApprovalStatus =
            inv.status === 'pending_approval' ||
            inv.status === 'requires_review' ||
            inv.status === 'processing' ||
            inv.status === 'validating' ||
            inv.status === 'verification' ||
            inv.status === 'draft';
          return hasAssignee && isPendingApprovalStatus;
        });
        break;
      case 'rejected':
        // "Pending Rejected" - rejected invoices that still have an assignee (awaiting final processing)
        filtered = invoices.filter(inv => {
          const isRejectedStatus = inv.status === 'rejected' || inv.status === 'void';
          const hasAssignee = !!inv.assigned_to_user_id;
          return isRejectedStatus && hasAssignee;
        });
        break;
      case 'completed_rejected':
        // "Rejected" - fully processed rejected invoices (no assignee)
        filtered = invoices.filter(inv => {
          const isRejectedStatus = inv.status === 'rejected' || inv.status === 'void';
          const isUnassigned = !inv.assigned_to_user_id;
          return isRejectedStatus && isUnassigned;
        });
        break;
      case 'all':
        filtered = invoices;
        break;
      default:
        filtered = invoices;
    }

    // Sort by SLA status (most urgent first) - for pending and approved views
    if (view === 'pending' || view === 'approved') {
      return filtered.sort((a, b) => {
        // Prioritize invoices with SLA data
        const aHasSLA = a.assigned_at && a.sla_hours && a.sla_status;
        const bHasSLA = b.assigned_at && b.sla_hours && b.sla_status;

        if (aHasSLA && !bHasSLA) return -1;
        if (!aHasSLA && bHasSLA) return 1;
        if (!aHasSLA && !bHasSLA) return 0;

        // Both have SLA data - use SLA comparison function
        return compareBySLA(
          { slaStatus: a.sla_status!, amount: a.total },
          { slaStatus: b.sla_status!, amount: b.total }
        );
      });
    }

    return filtered;
  };

  const getViewStats = () => {
    // Calculate stats from date-filtered dataset for accurate counts
    // Must match the logic in filterInvoicesByView
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Apply date filter first
    const dateFilteredInvoices = filterByDate(allInvoices);

    return {
      pending: dateFilteredInvoices.filter(inv => {
        // Include standard pending statuses
        const isPendingStatus =
          inv.status === 'pending_approval' ||
          inv.status === 'requires_review' ||
          inv.status === 'processing' ||
          inv.status === 'validating' ||
          inv.status === 'verification' ||
          inv.status === 'draft';

        // Also include overdue invoices (not paid/approved/rejected)
        const dueDate = new Date(inv.due_date);
        const isOverdue =
          dueDate < today &&
          inv.status !== 'paid' &&
          inv.status !== 'approved' &&
          inv.status !== 'rejected' &&
          inv.status !== 'void';

        // Exclude invoices that are assigned (those go to Pending Approval)
        const isUnassigned = !inv.assigned_to_user_id;

        return (isPendingStatus || isOverdue) && isUnassigned;
      }).length,
      onHold: dateFilteredInvoices.filter(inv => inv.status === 'on_hold').length,
      approved: dateFilteredInvoices.filter(inv => {
        // Pending Approval tab shows invoices that have been assigned
        const hasAssignee = !!inv.assigned_to_user_id;
        const isPendingApprovalStatus =
          inv.status === 'pending_approval' ||
          inv.status === 'requires_review' ||
          inv.status === 'processing' ||
          inv.status === 'validating' ||
          inv.status === 'verification' ||
          inv.status === 'draft';
        return hasAssignee && isPendingApprovalStatus;
      }).length,
      rejected: dateFilteredInvoices.filter(inv => {
        // Pending Rejected - rejected with assignee
        const isRejectedStatus = inv.status === 'rejected' || inv.status === 'void';
        const hasAssignee = !!inv.assigned_to_user_id;
        return isRejectedStatus && hasAssignee;
      }).length,
      completedRejected: dateFilteredInvoices.filter(inv => {
        // Rejected - completed rejected (no assignee)
        const isRejectedStatus = inv.status === 'rejected' || inv.status === 'void';
        const isUnassigned = !inv.assigned_to_user_id;
        return isRejectedStatus && isUnassigned;
      }).length,
    };
  };

  const stats = getViewStats();

  const handleApprove = async (invoiceId: string) => {
    try {
      const response = await fetch(`/api/approvals/${invoiceId}/approve`, {
        method: 'POST',
      });
      if (response.ok) {
        await fetchInvoices();
      }
    } catch (error) {
      console.error('Error approving invoice:', error);
    }
  };

  const handleReject = async (invoiceId: string, reason: string) => {
    try {
      const response = await fetch(`/api/approvals/${invoiceId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (response.ok) {
        await fetchInvoices();
      }
    } catch (error) {
      console.error('Error rejecting invoice:', error);
    }
  };

  const handleDelegate = async (invoiceId: string, assigneeId: string, assigneeName: string, reason: string) => {
    try {
      // Update local state directly for demo purposes (mock data doesn't persist through API refetch)
      setAllInvoices(prevInvoices =>
        prevInvoices.map(inv =>
          inv.id === invoiceId
            ? {
                ...inv,
                assigned_to_user_id: assigneeId,
                assigned_to_name: assigneeName,
                status: 'approved_ready_for_payment', // Moves to "Pending Approval" tab
              }
            : inv
        )
      );

      // Show success toast
      showToast(`Invoice delegated to ${assigneeName} successfully`, 'success');

      setShowDelegationModal(null);
    } catch (error) {
      console.error('Error delegating invoice:', error);
      showToast('Failed to delegate invoice', 'error');
    }
  };

  const handleAssignInvoice = async (invoiceId: string) => {
    const invoice = allInvoices.find(inv => inv.id === invoiceId);
    if (!invoice) return;

    try {
      // Fetch AI routing suggestions
      const routingResponse = await getRoutingSuggestions({
        vendor: invoice.vendor_name_snapshot,
        amount: invoice.total,
        invoiceId: invoiceId,
      });

      // Open intelligent assignment modal with suggestions
      setShowIntelligentAssignmentModal({
        invoiceId,
        invoice,
        suggestions: routingResponse.suggestions,
        autoRouteEligible: routingResponse.auto_route_eligible,
      });
    } catch (error) {
      console.error('Error fetching routing suggestions:', error);
      showToast('Failed to fetch routing suggestions', 'error');
    }
  };

  const handleConfirmAssignment = async (
    approverId: string,
    approverName: string,
    confidence?: number,
    isAISuggested?: boolean
  ) => {
    if (!showIntelligentAssignmentModal) return;
    
    const invoiceId = showIntelligentAssignmentModal.invoiceId;

    try {
      // Generate SLA deadline (24 hours for demo)
      const assignedAt = new Date();
      const slaDeadline = new Date(assignedAt);
      slaDeadline.setHours(slaDeadline.getHours() + 24);

      // Update local state
      setAllInvoices(prevInvoices =>
        prevInvoices.map(inv =>
          inv.id === invoiceId
            ? {
                ...inv,
                assigned_to_user_id: approverId,
                assigned_to_name: approverName,
                status: 'pending_approval',
                assigned_at: assignedAt.toISOString(),
                sla_hours: 24,
                sla_status: 'on_time' as SLAStatus,
              }
            : inv
        )
      );

      // Show success toast with confidence indicator
      const confidenceText = confidence ? ` (${Math.round(confidence * 100)}% confidence)` : '';
      const suggestionText = isAISuggested ? ' via AI suggestion' : '';
      showToast(`Invoice assigned to ${approverName}${confidenceText}${suggestionText}`, 'success');

      setShowIntelligentAssignmentModal(null);
    } catch (error) {
      console.error('Error assigning invoice:', error);
      showToast('Failed to assign invoice', 'error');
    }
  };

  const handleNudge = (invoiceId: string, approverName: string) => {
    showToast(`Reminder sent to ${approverName}`, 'success');
  };

  const handleUnassign = (invoiceId: string, reason: string) => {
    try {
      // Update local state to unassign and move back to Pending Review
      setAllInvoices(prevInvoices =>
        prevInvoices.map(inv =>
          inv.id === invoiceId
            ? {
                ...inv,
                assigned_to_user_id: undefined,
                assigned_to_name: undefined,
                status: 'pending_approval', // Moves back to "Pending Review" tab
                assigned_at: undefined,
                sla_hours: undefined,
                sla_status: undefined,
              }
            : inv
        )
      );

      // Show success toast
      showToast('Invoice unassigned and returned to Pending Review', 'success');

      setShowUnassignModal(null);
    } catch (error) {
      console.error('Error unassigning invoice:', error);
      showToast('Failed to unassign invoice', 'error');
    }
  };

  const handleInvoiceClick = (invoiceId: string) => {
    setSelectedInvoiceId(invoiceId);
  };

  const handleBulkAssign = async (invoiceIds: string[], assigneeId: string, strategy: string) => {
    try {
      const response = await fetch('/api/approvals/bulk/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceIds: Array.from(invoiceIds), assigneeId, strategy, teamMembers }),
      });
      if (response.ok) {
        await fetchInvoices();
        setSelectedInvoices(new Set());
        setShowBulkAssignmentDrawer(false);
      }
    } catch (error) {
      console.error('Error bulk assigning invoices:', error);
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col px-4 pt-4 sm:px-6 lg:px-8 pb-20">
      {/* Title & Controls */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-950">
            Approvals
          </h1>
          <button
            onClick={() => router.push('/approvals/my-queue')}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-purple-900 text-white rounded-md hover:bg-purple-800 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
          >
            <User className="h-4 w-4" />
            My Queue
          </button>
        </div>

        {/* User/Admin Toggle - Hidden temporarily */}
        {false && (
          <div className="flex items-center gap-4">
            {userRole === 'admin' && (
              <button
                onClick={() => setShowTeamWorkloadDrawer(true)}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                <Users className="h-4 w-4" />
                Team Workload
              </button>
            )}

            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setUserRole('user')}
                className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                  userRole === 'user'
                    ? 'bg-white text-gray-950 shadow-sm'
                    : 'text-gray-600 hover:text-gray-950'
                }`}
              >
                <User className="h-4 w-4 inline mr-1" />
                User View
              </button>
              <button
                onClick={() => setUserRole('admin')}
                className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                  userRole === 'admin'
                    ? 'bg-white text-gray-950 shadow-sm'
                    : 'text-gray-600 hover:text-gray-950'
                }`}
              >
                <Users className="h-4 w-4 inline mr-1" />
                Admin View
              </button>
            </div>
          </div>
        )}
      </div>

      {/* STATS CARDS - Hidden but preserved for easy restoration
          To restore: change false to true below */}
      {false && (
        <div className="mb-4 grid grid-cols-4 gap-3">
          <div className="bg-white border border-gray-200 rounded-lg p-2.5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Pending</p>
                <p className="text-xl font-bold text-gray-950">{stats.pending}</p>
              </div>
              <Clock className="h-5 w-5 text-purple-600" />
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-2.5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Approved</p>
                <p className="text-xl font-bold text-gray-950">{stats.approved}</p>
              </div>
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-2.5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Rejected</p>
                <p className="text-xl font-bold text-gray-950">{stats.rejected}</p>
              </div>
              <XCircle className="h-5 w-5 text-gray-500" />
            </div>
          </div>
        </div>
      )}

      {/* View Tabs */}
      <div className="mb-4">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'pending', label: 'Pending Review', count: stats.pending },
              { id: 'approved', label: 'Pending Approval', count: stats.approved },
              { id: 'rejected', label: 'Pending Rejected', count: stats.rejected },
              { id: 'completed_rejected', label: 'Rejected', count: stats.completedRejected },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id as ViewType)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeView === tab.id
                    ? 'border-purple-900 text-purple-900'
                    : 'border-transparent text-gray-950 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                    activeView === tab.id
                      ? 'bg-purple-100 text-purple-900'
                      : 'bg-gray-100 text-gray-950'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Search & Filter Section */}
      <div className="mb-4">
        <div className="flex items-center gap-2">
          {/* Date Range Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400"
                style={{ minWidth: '130px' }}
              >
                <span className="truncate flex-1 text-left">{getDateFilterLabel()}</span>
                <ChevronDown className="h-3 w-3 ml-1 flex-shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              {dateFilterOptions.map((option) => (
                <DropdownMenuItem
                  key={option.id}
                  onClick={() => setDateFilter(option.id)}
                  className={`cursor-pointer ${dateFilter === option.id ? 'bg-purple-50 text-purple-900' : ''}`}
                >
                  <span className="text-sm">{option.label}</span>
                  {dateFilter === option.id && (
                    <Check className="h-3.5 w-3.5 ml-auto text-purple-600" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Search Input */}
          <div className="relative w-48">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-600" />
            <input
              type="search"
              placeholder="Search..."
              className="w-full pl-8 pr-2.5 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Columns & Filters Button */}
          <button className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-white border border-purple-600 text-purple-600 rounded-md hover:bg-purple-50 transition-colors">
            <Filter className="h-3 w-3" />
            Columns & Filters
          </button>
        </div>
      </div>

      {/* SLA Breach Banner */}
      {(() => {
        const breachedCount = filteredInvoices.filter(inv =>
          inv.sla_status === 'breached' || inv.sla_status === 'severe_breach'
        ).length;

        if (breachedCount === 0) return null;

        return (
          <div className="mb-4 bg-red-50 px-4 py-2 rounded-lg border border-red-200">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-600 mr-3 flex-shrink-0" />
              <p className="text-sm font-medium text-red-800">
                {breachedCount} {breachedCount === 1 ? 'invoice has' : 'invoices have'} breached SLA — Immediate action required to avoid late fees and vendor relationship damage
              </p>
            </div>
          </div>
        );
      })()}

      {/* Table Container */}
      <div className="flex-1 overflow-auto">
        <div className="overflow-hidden bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg relative">
          <div className="overflow-x-auto">
            <ApprovalsTable
              invoices={filteredInvoices}
              selectedInvoices={selectedInvoices}
              onSelectInvoice={(id, selected) => {
                const newSelection = new Set(selectedInvoices);
                if (selected) {
                  newSelection.add(id);
                } else {
                  newSelection.delete(id);
                }
                setSelectedInvoices(newSelection);
              }}
              onSelectAll={(selected) => {
                if (selected) {
                  setSelectedInvoices(new Set(filteredInvoices.map(inv => inv.id)));
                } else {
                  setSelectedInvoices(new Set());
                }
              }}
              onInvoiceClick={handleInvoiceClick}
              onApprove={handleApprove}
              onReject={handleReject}
              onDelegate={(invoiceId, assignee) => setShowDelegationModal({ invoiceId, assignee })}
              onAssign={handleAssignInvoice}
              onNudge={handleNudge}
              onUnassign={(invoiceId, currentAssigneeName) => setShowUnassignModal({ invoiceId, currentAssigneeName })}
              teamMembers={teamMembers}
              isLoading={isLoading}
              activeView={activeView}
              userRole={userRole}
            />
          </div>
        </div>
      </div>

      {/* Invoice Detail Drawer */}
      <InvoiceDrawer
        invoiceId={selectedInvoiceId || ''}
        invoice={allInvoices.find(inv => inv.id === selectedInvoiceId)}
        isOpen={!!selectedInvoiceId}
        onClose={() => setSelectedInvoiceId(null)}
        onApprove={handleApprove}
        onReject={handleReject}
        onNudge={handleNudge}
        onDelegate={(invoiceId, assignee) => setShowDelegationModal({ invoiceId, assignee })}
        onUnassign={(invoiceId, currentAssigneeName) => setShowUnassignModal({ invoiceId, currentAssigneeName })}
        teamMembers={teamMembers}
      />

      {/* Delegation Modal */}
      {showDelegationModal && (
        <DelegationModal
          invoiceId={showDelegationModal.invoiceId}
          assignee={showDelegationModal.assignee}
          onConfirm={(reason) => handleDelegate(showDelegationModal.invoiceId, showDelegationModal.assignee.id, showDelegationModal.assignee.name, reason)}
          onClose={() => setShowDelegationModal(null)}
        />
      )}

      {/* Intelligent Assignment Modal */}
      {showIntelligentAssignmentModal && (
        <IntelligentAssignmentModal
          invoiceId={showIntelligentAssignmentModal.invoiceId}
          invoiceNumber={showIntelligentAssignmentModal.invoice.invoice_number}
          vendor={showIntelligentAssignmentModal.invoice.vendor_name_snapshot}
          amount={showIntelligentAssignmentModal.invoice.total}
          currency={showIntelligentAssignmentModal.invoice.currency}
          suggestions={showIntelligentAssignmentModal.suggestions}
          autoRouteEligible={showIntelligentAssignmentModal.autoRouteEligible}
          teamMembers={teamMembers}
          onAssign={handleConfirmAssignment}
          onClose={() => setShowIntelligentAssignmentModal(null)}
        />
      )}

      {/* Unassign Modal */}
      {showUnassignModal && (
        <UnassignModal
          invoiceId={showUnassignModal.invoiceId}
          currentAssigneeName={showUnassignModal.currentAssigneeName}
          onConfirm={(reason) => handleUnassign(showUnassignModal.invoiceId, reason)}
          onClose={() => setShowUnassignModal(null)}
        />
      )}

      {/* Team Workload Drawer */}
      {showTeamWorkloadDrawer && (
        <TeamWorkloadDrawer
          teamMembers={teamMembers}
          onClose={() => setShowTeamWorkloadDrawer(false)}
        />
      )}

      {/* Bulk Assignment Drawer */}
      {showBulkAssignmentDrawer && (
        <BulkAssignmentDrawer
          selectedInvoices={selectedInvoices}
          teamMembers={teamMembers}
          onAssign={handleBulkAssign}
          onClose={() => setShowBulkAssignmentDrawer(false)}
        />
      )}

      {/* Fixed Bulk Actions Bar at bottom */}
      {selectedInvoices.size > 0 && (
        <div className="fixed bottom-0 left-16 right-0 z-40 bg-white border-t border-gray-200 shadow-lg px-6 py-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-purple-900 font-medium">
              {selectedInvoices.size} invoice{selectedInvoices.size > 1 ? 's' : ''} selected
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowBulkAssignmentDrawer(true)}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-white border border-purple-300 text-purple-900 rounded-md hover:bg-purple-50 transition-colors"
              >
                <Forward className="h-4 w-4" />
                Assign
              </button>
              <button
                onClick={() => {/* Handle bulk approve */}}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-purple-900 text-white rounded-md hover:bg-purple-800 transition-colors"
              >
                <Check className="h-4 w-4" />
                Approve All
              </button>
              <button
                onClick={() => setSelectedInvoices(new Set())}
                className="text-sm text-purple-700 hover:text-purple-900"
              >
                Clear Selection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}