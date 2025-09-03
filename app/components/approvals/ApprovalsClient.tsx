'use client';

import React, { useState, useEffect } from 'react';
import { 
  Clock, CheckCircle, XCircle, AlertTriangle, 
  Calendar, Users, Filter, ChevronDown,
  Check, X, Forward, MoreVertical, Plus,
  User, DollarSign, Building2, Hash, FileText
} from 'lucide-react';
import { ApprovalsTable } from '@/app/components/approvals/ApprovalsTable';
import { InvoiceDrawer } from '@/app/components/approvals/InvoiceDrawer';
import { DelegationModal } from '@/app/components/approvals/DelegationModal';
import { TeamWorkloadDrawer } from '@/app/components/approvals/TeamWorkloadDrawer';
import { BulkAssignmentDrawer } from '@/app/components/approvals/BulkAssignmentDrawer';

export type ViewType = 'pending' | 'on-hold' | 'overdue' | 'approved' | 'rejected' | 'delegated' | 'all';
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
  const [activeView, setActiveView] = useState<ViewType>('pending');
  const [userRole, setUserRole] = useState<UserRole>('user');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
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

  // Fetch invoices
  useEffect(() => {
    fetchInvoices();
  }, [activeView, userRole]);

  const fetchInvoices = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/approvals/invoices?view=${activeView}&role=${userRole}&userId=current-user`);
      if (response.ok) {
        const data = await response.json();
        setInvoices(data.invoices || []);
        setTeamMembers(data.teamMembers?.length > 0 ? data.teamMembers : defaultTeamMembers);
      } else {
        // Fallback to general invoices API
        const fallbackResponse = await fetch('/api/invoices');
        if (fallbackResponse.ok) {
          const data = await fallbackResponse.json();
          const filtered = filterInvoicesByView(data, activeView);
          setInvoices(filtered);
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
    
    switch (view) {
      case 'pending':
        return invoices.filter(inv => inv.status === 'draft' || inv.status === 'pending' || inv.status === 'submitted');
      case 'on-hold':
        return invoices.filter(inv => inv.status === 'on_hold');
      case 'overdue':
        return invoices.filter(inv => {
          const dueDate = new Date(inv.due_date);
          return dueDate < today && inv.status !== 'paid' && inv.status !== 'approved';
        });
      case 'approved':
        return invoices.filter(inv => inv.status === 'approved' || inv.status === 'posted');
      case 'rejected':
        return invoices.filter(inv => inv.status === 'rejected' || inv.status === 'void');
      case 'delegated':
        // Would need to track delegations separately
        return [];
      case 'all':
        return invoices;
      default:
        return invoices;
    }
  };

  const getViewStats = () => {
    return {
      pending: invoices.filter(inv => inv.status === 'draft' || inv.status === 'pending' || inv.status === 'submitted').length,
      onHold: invoices.filter(inv => inv.status === 'on_hold').length,
      overdue: invoices.filter(inv => {
        const dueDate = new Date(inv.due_date);
        const today = new Date();
        return dueDate < today && inv.status !== 'paid' && inv.status !== 'approved';
      }).length,
      approved: invoices.filter(inv => inv.status === 'approved' || inv.status === 'posted').length,
      rejected: invoices.filter(inv => inv.status === 'rejected' || inv.status === 'void').length,
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
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-950">
            {userRole === 'user' ? 'My Approvals' : 'Team Approvals'}
          </h1>
          
          {/* User/Admin Toggle */}
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
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-5 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending</p>
                <p className="text-2xl font-bold text-gray-950">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">On Hold</p>
                <p className="text-2xl font-bold text-gray-950">{stats.onHold}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Overdue</p>
                <p className="text-2xl font-bold text-gray-950">{stats.overdue}</p>
              </div>
              <Calendar className="h-8 w-8 text-red-500" />
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Approved</p>
                <p className="text-2xl font-bold text-gray-950">{stats.approved}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Rejected</p>
                <p className="text-2xl font-bold text-gray-950">{stats.rejected}</p>
              </div>
              <XCircle className="h-8 w-8 text-gray-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Unified Table with Tabs */}
      <div className="flex-1 overflow-hidden px-6 pt-6 pb-20">
        <div className="overflow-hidden bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg">
          {/* View Tabs */}
          <div className="border-b border-gray-200">
            <div className="flex space-x-1 px-6">
              {[
                { id: 'pending', label: 'Pending', count: stats.pending },
                { id: 'on-hold', label: 'On Hold', count: stats.onHold },
                { id: 'overdue', label: 'Overdue', count: stats.overdue },
                { id: 'approved', label: 'Approved', count: stats.approved },
                { id: 'rejected', label: 'Rejected', count: stats.rejected },
                { id: 'delegated', label: 'Delegated', count: 0 },
                { id: 'all', label: 'All', count: invoices.length },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveView(tab.id as ViewType)}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeView === tab.id
                      ? 'text-purple-900 border-purple-900'
                      : 'text-gray-600 border-transparent hover:text-gray-950'
                  }`}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                      activeView === tab.id
                        ? 'bg-purple-100 text-purple-900'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <ApprovalsTable
              invoices={invoices}
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
                  setSelectedInvoices(new Set(invoices.map(inv => inv.id)));
                } else {
                  setSelectedInvoices(new Set());
                }
              }}
              onInvoiceClick={setSelectedInvoiceId}
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
      {selectedInvoiceId && (
        <InvoiceDrawer
          invoiceId={selectedInvoiceId}
          invoice={invoices.find(inv => inv.id === selectedInvoiceId)}
          onClose={() => setSelectedInvoiceId(null)}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}

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
        <div className="fixed bottom-0 left-64 right-0 z-50 bg-white border-t border-gray-200 shadow-lg px-6 py-3">
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