'use client';

import React, { useState } from 'react';
import { X, User, AlertCircle, Calendar, UserX } from 'lucide-react';

interface StatusDetails {
  reason?: string;
  return_date?: string;
  backup_approver_id?: string;
  backup_approver_name?: string;
  left_date?: string;
  replacement_approver_id?: string;
  replacement_approver_name?: string;
}

interface TeamMember {
  id: string;
  name: string;
  initials: string;
  email?: string;
  role?: string;
  color: string;
  status?: 'available' | 'busy' | 'out-of-office' | 'left-company';
  status_details?: StatusDetails | null;
}

interface DelegationModalProps {
  invoiceId: string;
  invoiceNumber?: string;
  vendor?: string;
  amount?: number;
  currency?: string;
  currentApproverId?: string;
  teamMembers: TeamMember[];
  onConfirm: (assigneeId: string, assigneeName: string) => void;
  onClose: () => void;
}

export function DelegationModal({
  invoiceId,
  invoiceNumber,
  vendor,
  amount,
  currency,
  currentApproverId,
  teamMembers,
  onConfirm,
  onClose,
}: DelegationModalProps) {
  const [selectedApproverId, setSelectedApproverId] = useState<string>('');

  const selectedApprover = teamMembers.find(m => m.id === selectedApproverId);

  // Check if approver is available for selection
  const isApproverAvailable = (member: TeamMember): boolean => {
    return member.status !== 'out-of-office' && member.status !== 'left-company';
  };

  // Helper function to render status badge
  const renderStatusBadge = (member: TeamMember) => {
    if (member.status === 'out-of-office') {
      return (
        <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs">
          <Calendar className="h-3 w-3" />
          <span>Out until {member.status_details?.return_date}</span>
        </div>
      );
    }
    if (member.status === 'left-company') {
      return (
        <div className="flex items-center gap-1 px-2 py-0.5 bg-gray-200 text-gray-700 rounded text-xs">
          <UserX className="h-3 w-3" />
          <span>Left company</span>
        </div>
      );
    }
    if (member.status === 'busy') {
      return (
        <div className="flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs">
          <AlertCircle className="h-3 w-3" />
          <span>Busy</span>
        </div>
      );
    }
    return null;
  };

  const handleConfirm = () => {
    if (!selectedApproverId || !selectedApprover) return;
    onConfirm(selectedApproverId, selectedApprover.name);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-25" onClick={onClose} />
        
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div>
              <h3 className="text-lg font-bold text-gray-950">
                Reassign Invoice
              </h3>
              {invoiceNumber && (
                <p className="text-sm text-gray-600 mt-1">
                  {invoiceNumber}
                  {vendor && ` • ${vendor}`}
                  {amount && currency && ` • ${currency} ${amount.toLocaleString()}`}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4">
            {/* Approver Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-950 mb-3">
                Select approver to reassign to:
              </label>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {teamMembers
                  .filter(m => m.id !== currentApproverId)
                  .map((member) => {
                    const isSelected = selectedApproverId === member.id;
                    const isAvailable = isApproverAvailable(member);
                    const statusBadge = renderStatusBadge(member);
                    
                    return (
                      <button
                        key={member.id}
                        onClick={() => {
                          if (isAvailable) {
                            setSelectedApproverId(member.id);
                          }
                        }}
                        disabled={!isAvailable}
                        className={`w-full text-left p-3 rounded-lg border transition-all ${
                          !isAvailable
                            ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                            : isSelected
                              ? 'border-purple-600 bg-purple-100'
                              : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full ${member.color} flex items-center justify-center flex-shrink-0 ${!isAvailable ? 'opacity-50' : ''}`}>
                            <span className="text-sm font-medium text-white">
                              {member.initials}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-sm font-medium text-gray-950">
                                {member.name}
                              </p>
                              {statusBadge}
                            </div>
                            <p className="text-xs text-gray-500">
                              {member.role}
                            </p>
                            {!isAvailable && member.status_details?.backup_approver_name && (
                              <p className="text-xs text-blue-700 mt-1">
                                Backup: {member.status_details.backup_approver_name}
                              </p>
                            )}
                            {!isAvailable && member.status_details?.replacement_approver_name && (
                              <p className="text-xs text-blue-700 mt-1">
                                Replacement: {member.status_details.replacement_approver_name}
                              </p>
                            )}
                          </div>
                          {isSelected && isAvailable && (
                            <div className="flex-shrink-0">
                              <div className="w-5 h-5 rounded-full bg-purple-600 flex items-center justify-center">
                                <div className="w-2 h-2 rounded-full bg-white" />
                              </div>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selectedApproverId}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                selectedApproverId
                  ? 'bg-purple-900 text-white hover:bg-purple-800'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Reassign Invoice
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}