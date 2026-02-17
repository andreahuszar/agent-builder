'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Clock, CheckCircle, XCircle, AlertTriangle,
  User, DollarSign, Calendar, FileText, Forward,
  ArrowLeft, Sparkles, TrendingUp
} from 'lucide-react';
import { InvoiceDrawer } from '@/app/components/approvals/InvoiceDrawer';
import { DelegationModal } from '@/app/components/approvals/DelegationModal';
import { SLAStatusBadge } from '@/app/components/approvals/SLAStatusBadge';
import { StatusBadge } from '@/app/components/invoices/StatusBadge';
import { compareBySLA, formatTimePending, calculatePriority, type SLAStatus } from '@/app/services/slaService';
import { useToast } from '@/app/components/ui/Toast';

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

// Mock current user ID (in real app, this would come from auth)
const CURRENT_USER_ID = 'user-1';
const CURRENT_USER_NAME = 'Sarah Mitchell';

export function ApproverQueueClient() {
  const router = useRouter();
  const { showToast } = useToast();
  const [allInvoices, setAllInvoices] = useState<Invoice[]>([]);
  const [myInvoices, setMyInvoices] = useState<Invoice[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [showDelegationModal, setShowDelegationModal] = useState<{ invoiceId: string; assignee: TeamMember } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  // Fetch invoices and team members
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        // Fetch all invoices
        const invoicesResponse = await fetch('/api/approvals/invoices?view=all&role=user&userId=current-user');
        const invoicesData = await invoicesResponse.json();

        // Filter to only invoices assigned to current user
        const myAssignedInvoices = invoicesData.invoices.filter(
          (inv: Invoice) => inv.assigned_to_user_id === CURRENT_USER_ID && inv.status === 'pending_approval'
        );

        // Sort by SLA urgency
        const sortedInvoices = myAssignedInvoices.sort(compareBySLA);

        setAllInvoices(invoicesData.invoices);
        setMyInvoices(sortedInvoices);

        // Fetch team members
        const teamResponse = await fetch('/api/approvals/team');
        const teamData = await teamResponse.json();
        setTeamMembers(teamData.members || []);
      } catch (error) {
        console.error('Error fetching data:', error);
        showToast('Failed to load approval queue', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [showToast]);

  // Calculate queue statistics
  const queueStats = useMemo(() => {
    const total = myInvoices.length;
    const breached = myInvoices.filter(inv => 
      inv.sla_status === 'breached' || inv.sla_status === 'severe_breach'
    ).length;
    const atRisk = myInvoices.filter(inv => inv.sla_status === 'at_risk').length;
    const onTime = myInvoices.filter(inv => inv.sla_status === 'on_time').length;

    return { total, breached, atRisk, onTime };
  }, [myInvoices]);

  // Handle actions
  const handleApprove = async (invoiceId: string) => {
    try {
      const invoice = myInvoices.find(inv => inv.id === invoiceId);
      if (!invoice) return;

      // Update local state
      setMyInvoices(prevInvoices =>
        prevInvoices.filter(inv => inv.id !== invoiceId)
      );

      showToast(`Invoice ${invoice.invoice_number} approved successfully`, 'success');
      
      if (selectedInvoiceId === invoiceId) {
        setSelectedInvoiceId(null);
      }
    } catch (error) {
      console.error('Error approving invoice:', error);
      showToast('Failed to approve invoice', 'error');
    }
  };

  const handleReject = async (invoiceId: string, reason: string) => {
    try {
      const invoice = myInvoices.find(inv => inv.id === invoiceId);
      if (!invoice) return;

      // Update local state
      setMyInvoices(prevInvoices =>
        prevInvoices.filter(inv => inv.id !== invoiceId)
      );

      showToast(`Invoice ${invoice.invoice_number} rejected`, 'success');
      
      if (selectedInvoiceId === invoiceId) {
        setSelectedInvoiceId(null);
      }
    } catch (error) {
      console.error('Error rejecting invoice:', error);
      showToast('Failed to reject invoice', 'error');
    }
  };

  const handleDelegate = async (invoiceId: string, assigneeId: string, assigneeName: string, reason: string) => {
    try {
      const invoice = myInvoices.find(inv => inv.id === invoiceId);
      if (!invoice) return;

      // Update local state - remove from my queue
      setMyInvoices(prevInvoices =>
        prevInvoices.filter(inv => inv.id !== invoiceId)
      );

      showToast(`Invoice delegated to ${assigneeName} successfully`, 'success');
      setShowDelegationModal(null);
      
      if (selectedInvoiceId === invoiceId) {
        setSelectedInvoiceId(null);
      }
    } catch (error) {
      console.error('Error delegating invoice:', error);
      showToast('Failed to delegate invoice', 'error');
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your approval queue...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/approvals')}
                className="text-gray-600 hover:text-gray-950 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-950">My Approval Queue</h1>
                <p className="text-sm text-gray-600 mt-1">
                  Invoices assigned to {CURRENT_USER_NAME}
                </p>
              </div>
            </div>
          </div>

          {/* Queue Statistics */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Queue</p>
                  <p className="text-2xl font-bold text-gray-950 mt-1">{queueStats.total}</p>
                </div>
                <FileText className="h-8 w-8 text-gray-400" />
              </div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-700">SLA Breached</p>
                  <p className="text-2xl font-bold text-red-900 mt-1">{queueStats.breached}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-amber-700">At Risk</p>
                  <p className="text-2xl font-bold text-amber-900 mt-1">{queueStats.atRisk}</p>
                </div>
                <Clock className="h-8 w-8 text-amber-600" />
              </div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-700">On Time</p>
                  <p className="text-2xl font-bold text-green-900 mt-1">{queueStats.onTime}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {myInvoices.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-950 mb-2">
              All caught up!
            </h3>
            <p className="text-gray-600">
              You have no pending invoices in your approval queue.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {myInvoices.map((invoice) => (
              <div
                key={invoice.id}
                className="bg-white rounded-lg border border-gray-200 hover:border-purple-300 transition-all cursor-pointer"
                onClick={() => setSelectedInvoiceId(invoice.id)}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-950">
                          {invoice.invoice_number}
                        </h3>
                        <SLAStatusBadge
                          status={invoice.sla_status || 'on_time'}
                          hoursOverdue={invoice.hours_overdue}
                        />
                        <StatusBadge status={invoice.match_status} />
                      </div>
                      <div className="flex items-center gap-6 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span>{invoice.vendor_name_snapshot}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          <span className="font-medium text-gray-950">
                            {formatCurrency(invoice.total, invoice.currency)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>Due: {formatDate(invoice.due_date)}</span>
                        </div>
                      </div>
                    </div>

                    {/* SLA Timer */}
                    {invoice.assigned_at && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-md">
                        <Clock className="h-4 w-4 text-gray-600" />
                        <span className="text-sm font-medium text-gray-950">
                          {formatTimePending(invoice.assigned_at)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleApprove(invoice.id);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm font-medium"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Approve
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReject(invoice.id, 'Rejected by approver');
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm font-medium"
                    >
                      <XCircle className="h-4 w-4" />
                      Reject
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // For now, just show first available team member
                        const otherMembers = teamMembers.filter(m => m.id !== CURRENT_USER_ID);
                        if (otherMembers.length > 0) {
                          setShowDelegationModal({
                            invoiceId: invoice.id,
                            assignee: otherMembers[0],
                          });
                        }
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-sm font-medium"
                    >
                      <Forward className="h-4 w-4" />
                      Reassign
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedInvoiceId(invoice.id);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-sm font-medium ml-auto"
                    >
                      <FileText className="h-4 w-4" />
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invoice Detail Drawer */}
      <InvoiceDrawer
        invoiceId={selectedInvoiceId || ''}
        invoice={myInvoices.find(inv => inv.id === selectedInvoiceId)}
        isOpen={!!selectedInvoiceId}
        onClose={() => setSelectedInvoiceId(null)}
        onApprove={handleApprove}
        onReject={handleReject}
        onNudge={() => {}}
        onDelegate={(invoiceId, assignee) => setShowDelegationModal({ invoiceId, assignee })}
        onUnassign={() => {}}
        teamMembers={teamMembers}
      />

      {/* Delegation Modal */}
      {showDelegationModal && (
        <DelegationModal
          invoiceId={showDelegationModal.invoiceId}
          assignee={showDelegationModal.assignee}
          onConfirm={(reason) => handleDelegate(
            showDelegationModal.invoiceId,
            showDelegationModal.assignee.id,
            showDelegationModal.assignee.name,
            reason
          )}
          onClose={() => setShowDelegationModal(null)}
        />
      )}
    </div>
  );
}
