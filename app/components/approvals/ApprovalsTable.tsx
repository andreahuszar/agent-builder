'use client';

import React from 'react';
import {
  UserPlus, UserMinus, FileText, CheckSquare, Square, Bell, MoreVertical, Mail
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { ViewType, UserRole } from '@/app/components/approvals/ApprovalsClient';
import { SLAStatusBadge } from './SLAStatusBadge';
import { StatusBadge } from '@/app/components/invoices/StatusBadge';
import { formatTimePending, calculatePriority, getPriorityLabel, getPriorityColors, type SLAStatus } from '@/app/services/slaService';

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

interface ApprovalsTableProps {
  invoices: Invoice[];
  selectedInvoices: Set<string>;
  onSelectInvoice: (id: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  onInvoiceClick: (id: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
  onDelegate: (id: string, assignee: TeamMember) => void;
  onNudge: (id: string, approverName: string) => void;
  onUnassign: (id: string, currentAssigneeName: string) => void;
  teamMembers: TeamMember[];
  isLoading: boolean;
  activeView: ViewType;
  userRole: UserRole;
}

export function ApprovalsTable({
  invoices,
  selectedInvoices,
  onSelectInvoice,
  onSelectAll,
  onInvoiceClick,
  onApprove,
  onReject,
  onDelegate,
  onNudge,
  onUnassign,
  teamMembers,
  isLoading,
  activeView,
  userRole,
}: ApprovalsTableProps) {
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

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
      submitted: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Submitted' },
      approved: { bg: 'bg-green-100', text: 'text-green-800', label: 'Approved' },
      rejected: { bg: 'bg-red-100', text: 'text-red-800', label: 'Rejected' },
      on_hold: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'On Hold' },
      paid: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Paid' },
    };

    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const getMatchStatusBadge = (matchStatus: string) => {
    const matchStatusColors = {
      'not_matched': 'bg-gray-100 text-gray-800',
      'matched': 'bg-green-100 text-green-800',
      'within_tolerance': 'bg-yellow-100 text-yellow-800',
      'exception': 'bg-red-100 text-red-800',
    };
    
    const colorClass = matchStatusColors[matchStatus as keyof typeof matchStatusColors] || 'bg-gray-100 text-gray-800';
    const displayText = matchStatus.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}>
        {displayText}
      </span>
    );
  };

  const getDaysOverdue = (dueDate: string) => {
    const due = new Date(dueDate);
    const today = new Date();
    const diffTime = today.getTime() - due.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const allSelected = invoices.length > 0 && invoices.every(inv => selectedInvoices.has(inv.id));
  const someSelected = invoices.some(inv => selectedInvoices.has(inv.id)) && !allSelected;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-900"></div>
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <FileText className="h-12 w-12 mb-3" />
        <p className="text-lg font-medium">No invoices found</p>
        <p className="text-sm">Try adjusting your filters or view</p>
      </div>
    );
  }

  return (
    <table className="w-full divide-y divide-gray-200">
      <thead className="bg-white border-b border-gray-200">
          <tr>
            <th className="px-6 py-2 text-left">
              <button
                onClick={() => onSelectAll(!allSelected)}
                className="p-0"
              >
                {allSelected ? (
                  <CheckSquare className="h-4 w-4 text-purple-600" />
                ) : someSelected ? (
                  <CheckSquare className="h-4 w-4 text-purple-600" />
                ) : (
                  <Square className="h-4 w-4 text-gray-400" />
                )}
              </button>
            </th>
            <th scope="col" className="px-3 py-2.5 text-left text-sm font-semibold text-gray-800 truncate">
              SLA Status
            </th>
            <th scope="col" className="px-3 py-2.5 text-left text-sm font-semibold text-gray-800 truncate">
              Time Pending
            </th>
            <th scope="col" className="px-3 py-2.5 text-left text-sm font-semibold text-gray-800 truncate">
              Priority
            </th>
            <th scope="col" className="px-3 py-2.5 text-left text-sm font-semibold text-gray-800 truncate">
              Invoice No.
            </th>
            <th scope="col" className="px-3 py-2.5 text-left text-sm font-semibold text-gray-800 truncate">
              Vendor
            </th>
            <th scope="col" className="px-3 py-2.5 text-left text-sm font-semibold text-gray-800 truncate">
              Invoice Date
            </th>
            <th scope="col" className="px-3 py-2.5 text-right text-sm font-semibold text-gray-800 truncate">
              Total
            </th>
            <th scope="col" className="px-3 py-2.5 text-left text-sm font-semibold text-gray-800 truncate">
              Due Date
            </th>
            <th scope="col" className="px-3 py-2.5 text-left text-sm font-semibold text-gray-800 truncate">
              Workflow Status
            </th>
            <th scope="col" className="px-3 py-2.5 text-left text-sm font-semibold text-gray-800 truncate">
              Approver
            </th>
            {(activeView === 'pending' || activeView === 'approved') && (
              <th scope="col" className="px-3 py-2.5 text-left text-sm font-semibold text-gray-800 truncate">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {invoices.map((invoice) => {
            const overdueDays = getDaysOverdue(invoice.due_date);
            const assignedMember = teamMembers.find(m => m.id === invoice.assigned_to_user_id);

            // Calculate SLA-related data
            const hasSLA = invoice.assigned_at && invoice.sla_hours;
            const priority = hasSLA && invoice.sla_status ? calculatePriority(invoice.sla_status, invoice.total) : 'low';
            const priorityColors = getPriorityColors(priority);

            return (
              <tr
                key={invoice.id}
                onClick={() => onInvoiceClick(invoice.id)}
                className="hover:bg-purple-50 cursor-pointer"
                data-invoice-row
              >
                <td className="whitespace-nowrap px-6 py-2.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectInvoice(invoice.id, !selectedInvoices.has(invoice.id));
                    }}
                    className="p-0"
                  >
                    {selectedInvoices.has(invoice.id) ? (
                      <CheckSquare className="h-4 w-4 text-purple-600" />
                    ) : (
                      <Square className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-sm">
                  {hasSLA ? (
                    <SLAStatusBadge
                      assignedAt={invoice.assigned_at!}
                      slaHours={invoice.sla_hours!}
                      slaStatus={invoice.sla_status}
                      compact
                    />
                  ) : (
                    <span className="text-gray-400 text-xs">N/A</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-sm font-medium text-gray-950">
                  {hasSLA ? formatTimePending(invoice.assigned_at!) : '-'}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-sm">
                  <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${priorityColors.badge} ${priorityColors.text} ring-1 ${priorityColors.ring}`}>
                    {getPriorityLabel(priority)}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-sm">
                  <span className="font-medium text-purple-600">
                    {invoice.invoice_number}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-sm font-medium text-gray-950">
                  {invoice.vendor_name_snapshot}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-sm font-medium text-gray-950">
                  {formatDate(invoice.invoice_date)}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-sm text-right font-medium text-gray-950">
                  {formatCurrency(invoice.total, invoice.currency)}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-sm font-medium text-gray-950">
                  <div className="flex items-center gap-2">
                    {formatDate(invoice.due_date)}
                    {overdueDays > 0 && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                        {overdueDays} days
                      </span>
                    )}
                  </div>
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-sm">
                  <StatusBadge status="approval" size="sm" />
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-sm">
                  {assignedMember ? (
                    <div className="flex items-center">
                      <div className="h-7 w-7 rounded-full bg-purple-100 flex items-center justify-center mr-2">
                        <span className="text-xs font-medium text-purple-700">
                          {assignedMember.initials}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-gray-950">{assignedMember.name}</span>
                    </div>
                  ) : (
                    <span className="text-gray-500 text-sm">Unassigned</span>
                  )}
                </td>
                {activeView === 'pending' && (
                  <td
                    onClick={(e) => e.stopPropagation()}
                    className="px-3 py-2.5 whitespace-nowrap"
                  >
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:border-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1"
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                          Assign
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        {teamMembers.map((member) => (
                          <DropdownMenuItem
                            key={member.id}
                            onClick={() => onDelegate(invoice.id, member)}
                            className="cursor-pointer"
                          >
                            <div className="flex items-center gap-3 w-full">
                              <div className={`h-7 w-7 rounded-full ${member.color} flex items-center justify-center flex-shrink-0`}>
                                <span className="text-xs font-medium text-white">
                                  {member.initials}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-gray-900 group-hover:text-white group-focus:text-white truncate">
                                  {member.name}
                                </div>
                                {member.role && (
                                  <div className="text-xs text-gray-500 group-hover:text-white/80 group-focus:text-white/80 truncate">
                                    {member.role}
                                  </div>
                                )}
                              </div>
                            </div>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                )}
                {activeView === 'approved' && (
                  <td
                    onClick={(e) => e.stopPropagation()}
                    className="px-3 py-2.5 whitespace-nowrap"
                  >
                    <div className="flex items-center gap-2">
                      {/* Nudge Button */}
                      <button
                        onClick={() => onNudge(invoice.id, invoice.assigned_to_name || 'Approver')}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:border-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1"
                      >
                        <Bell className="h-3.5 w-3.5" />
                        Nudge
                      </button>
                      {/* Reassign Icon Button with Dropdown */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className="inline-flex items-center justify-center p-1.5 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:border-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1"
                            title="Reassign"
                          >
                            <UserPlus className="h-3.5 w-3.5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          {teamMembers.map((member) => (
                            <DropdownMenuItem
                              key={member.id}
                              onClick={() => onDelegate(invoice.id, member)}
                              className="cursor-pointer"
                            >
                              <div className="flex items-center gap-3 w-full">
                                <div className={`h-7 w-7 rounded-full ${member.color} flex items-center justify-center flex-shrink-0`}>
                                  <span className="text-xs font-medium text-white">
                                    {member.initials}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-gray-900 group-hover:text-white group-focus:text-white truncate">
                                    {member.name}
                                  </div>
                                  {member.role && (
                                    <div className="text-xs text-gray-500 group-hover:text-white/80 group-focus:text-white/80 truncate">
                                      {member.role}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </DropdownMenuItem>
                          ))}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => onUnassign(invoice.id, invoice.assigned_to_name || 'Approver')}
                            className="cursor-pointer text-red-600 hover:!bg-red-600 hover:!text-white focus:!bg-red-600 focus:!text-white"
                          >
                            <div className="flex items-center gap-3 w-full">
                              <div className="h-7 w-7 rounded-full bg-red-100 group-hover:bg-red-200 flex items-center justify-center flex-shrink-0">
                                <UserMinus className="h-4 w-4 text-red-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-red-600 group-hover:text-white group-focus:text-white truncate">
                                  Unassign
                                </div>
                                <div className="text-xs text-red-500 group-hover:text-white/80 group-focus:text-white/80 truncate">
                                  Return to Pending Review
                                </div>
                              </div>
                            </div>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      {/* More Actions (3 dots) */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className="inline-flex items-center justify-center p-1.5 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:border-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1"
                            title="More actions"
                          >
                            <MoreVertical className="h-3.5 w-3.5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            onClick={() => {
                              // TODO: Implement send email functionality
                              console.log('Send email for invoice:', invoice.id);
                            }}
                            className="cursor-pointer"
                          >
                            <div className="flex items-center gap-2 w-full">
                              <Mail className="h-4 w-4 text-gray-500" />
                              <span className="text-sm text-gray-900 group-hover:text-white group-focus:text-white">Send Email</span>
                            </div>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
    </table>
  );
}