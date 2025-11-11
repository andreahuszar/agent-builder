'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Clock, CheckCircle, XCircle, AlertTriangle,
  Calendar, Users, Filter, ChevronDown,
  Check, X, Forward, MoreVertical, Plus,
  User, DollarSign, Building2, Hash, FileText, Search
} from 'lucide-react';
import { ApprovalsTable } from '@/app/components/approvals/ApprovalsTable';
import { InvoiceDrawer } from '@/app/components/approvals/InvoiceDrawer';
import { DelegationModal } from '@/app/components/approvals/DelegationModal';
import { TeamWorkloadDrawer } from '@/app/components/approvals/TeamWorkloadDrawer';
import { BulkAssignmentDrawer } from '@/app/components/approvals/BulkAssignmentDrawer';
import { compareBySLA, type SLAStatus } from '@/app/services/slaService';

export type ViewType = 'pending' | 'on-hold' | 'approved' | 'rejected' | 'all';
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
  const [activeView, setActiveView] = useState<ViewType>('pending');
  const [userRole, setUserRole] = useState<UserRole>('user');
  const [allInvoices, setAllInvoices] = useState<Invoice[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [showDelegationModal, setShowDelegationModal] = useState<{ invoiceId: string; assignee: TeamMember } | null>(null);
  const [showTeamWorkloadDrawer, setShowTeamWorkloadDrawer] = useState(false);
  const [showBulkAssignmentDrawer, setShowBulkAssignmentDrawer] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  // Default team members (fallback)
  const defaultTeamMembers: TeamMember[] = [
    { id: '1', name: 'Sarah Chen', initials: 'SC', role: 'AP Manager', color: 'bg-violet-500', current_workload: 8, capacity: 12, status: 'available' },
    { id: '2', name: 'Michael Johnson', initials: 'MJ', role: 'AP Specialist', color: 'bg-blue-500', current_workload: 5, capacity: 10, status: 'busy' },
    { id: '3', name: 'Anna Rodriguez', initials: 'AR', role: 'Finance Director', color: 'bg-green-500', current_workload: 3, capacity: 8, status: 'available' },
    { id: '4', name: 'David Kim', initials: 'DK', role: 'CFO', color: 'bg-amber-500', current_workload: 2, capacity: 6, status: 'available' },
    { id: '5', name: 'Lisa Park', initials: 'LP', role: 'Senior Accountant', color: 'bg-purple-500', current_workload: 6, capacity: 10, status: 'out-of-office' },
  ];
  
  // Initialize with default team members if empty
  useEffect(() => {
    if (teamMembers.length === 0) {
      setTeamMembers(defaultTeamMembers);
    }
  }, []);

  // Fetch all invoices on mount and when user role changes
  useEffect(() => {
    fetchInvoices();
  }, [userRole]);
  
  // Filter invoices when view changes
  useEffect(() => {
    if (allInvoices.length > 0) {
      const filtered = filterInvoicesByView(allInvoices, activeView);
      setFilteredInvoices(filtered);
    }
  }, [activeView, allInvoices]);

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
        filtered = invoices.filter(inv => {
          // Include standard pending statuses
          const isPendingStatus =
            inv.status === 'pending_approval' ||
            inv.status === 'requires_review' ||
            inv.status === 'processing' ||
            inv.status === 'validating' ||
            inv.status === 'draft';

          // Also include overdue invoices (not paid/approved/rejected)
          const dueDate = new Date(inv.due_date);
          const isOverdue =
            dueDate < today &&
            inv.status !== 'paid' &&
            inv.status !== 'approved' &&
            inv.status !== 'rejected' &&
            inv.status !== 'void';

          return isPendingStatus || isOverdue;
        });
        break;
      case 'on-hold':
        filtered = invoices.filter(inv => inv.status === 'on_hold');
        break;
      case 'approved':
        filtered = invoices.filter(inv =>
          inv.status === 'approved' ||
          inv.status === 'approved_ready_for_payment' ||
          inv.status === 'paid'
        );
        break;
      case 'rejected':
        filtered = invoices.filter(inv => inv.status === 'rejected' || inv.status === 'void');
        break;
      case 'all':
        filtered = invoices;
        break;
      default:
        filtered = invoices;
    }

    // Sort by SLA status (most urgent first) - only for pending view
    if (view === 'pending') {
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
    // Calculate stats from complete dataset for stability
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return {
      pending: allInvoices.filter(inv =>
        inv.status === 'pending_approval' ||
        inv.status === 'requires_review' ||
        inv.status === 'processing' ||
        inv.status === 'validating' ||
        inv.status === 'draft'
      ).length,
      onHold: allInvoices.filter(inv => inv.status === 'on_hold').length,
      approved: allInvoices.filter(inv =>
        inv.status === 'approved' ||
        inv.status === 'approved_ready_for_payment' ||
        inv.status === 'paid'
      ).length,
      rejected: allInvoices.filter(inv => inv.status === 'rejected' || inv.status === 'void').length,
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

  const handleDelegate = async (invoiceId: string, assigneeId: string, reason: string) => {
    try {
      const response = await fetch(`/api/approvals/${invoiceId}/delegate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigneeId, reason }),
      });
      if (response.ok) {
        await fetchInvoices();
        setShowDelegationModal(null);
      }
    } catch (error) {
      console.error('Error delegating invoice:', error);
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
        <h1 className="text-2xl font-bold text-gray-950">
          Approvals
        </h1>

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
              { id: 'rejected', label: 'Rejected', count: stats.rejected },
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
      />

      {/* Delegation Modal */}
      {showDelegationModal && (
        <DelegationModal
          invoiceId={showDelegationModal.invoiceId}
          assignee={showDelegationModal.assignee}
          onConfirm={(reason) => handleDelegate(showDelegationModal.invoiceId, showDelegationModal.assignee.id, reason)}
          onClose={() => setShowDelegationModal(null)}
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