'use client';

import React, { useState } from 'react';
import { X, AlertTriangle, DollarSign, FileText, User, Building2, Calendar, UserX } from 'lucide-react';

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

interface RejectionReasonModalProps {
  invoiceId: string;
  invoiceNumber: string;
  vendor: string;
  amount: number;
  currency: string;
  currentApproverId?: string;
  currentApproverName?: string;
  teamMembers: TeamMember[];
  onConfirm: (reason: string, category: string, suggestedApproverId?: string, suggestedApproverName?: string) => void;
  onClose: () => void;
}

// Rejection categories with icons and descriptions
const REJECTION_CATEGORIES = [
  {
    id: 'wrong_approver',
    label: 'Wrong Approver',
    icon: User,
    description: 'I should not be approving this invoice',
    requiresSuggestion: true,
  },
  {
    id: 'amount_authority',
    label: 'Amount Exceeds Authority',
    icon: DollarSign,
    description: 'This amount is above my approval limit',
    requiresSuggestion: true,
  },
  {
    id: 'missing_documentation',
    label: 'Missing Documentation',
    icon: FileText,
    description: 'Required documents or PO are missing',
    requiresSuggestion: false,
  },
  {
    id: 'vendor_issue',
    label: 'Vendor Issue',
    icon: Building2,
    description: 'Problem with vendor information or relationship',
    requiresSuggestion: false,
  },
  {
    id: 'data_mismatch',
    label: 'Data Mismatch',
    icon: AlertTriangle,
    description: 'Invoice data does not match PO or expectations',
    requiresSuggestion: false,
  },
];

export function RejectionReasonModal({
  invoiceId,
  invoiceNumber,
  vendor,
  amount,
  currency,
  currentApproverId,
  currentApproverName,
  teamMembers,
  onConfirm,
  onClose,
}: RejectionReasonModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [suggestedApproverId, setSuggestedApproverId] = useState<string>('');

  const selectedCategoryData = REJECTION_CATEGORIES.find(c => c.id === selectedCategory);
  const requiresSuggestion = selectedCategoryData?.requiresSuggestion || false;
  const suggestedApprover = teamMembers.find(m => m.id === suggestedApproverId);

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
          <AlertTriangle className="h-3 w-3" />
          <span>Busy</span>
        </div>
      );
    }
    return null;
  };

  // Check if approver is available for selection
  const isApproverAvailable = (member: TeamMember): boolean => {
    return member.status !== 'out-of-office' && member.status !== 'left-company';
  };

  const handleConfirm = () => {
    if (!selectedCategory) return;
    if (requiresSuggestion && !suggestedApproverId) return;

    const reason = selectedCategoryData?.label || '';
    const fullReason = additionalNotes ? `${reason}: ${additionalNotes}` : reason;

    onConfirm(
      fullReason,
      selectedCategory,
      suggestedApproverId || undefined,
      suggestedApprover?.name
    );
  };

  const canConfirm = selectedCategory && (!requiresSuggestion || suggestedApproverId);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-25" onClick={onClose} />
        
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div>
              <h3 className="text-lg font-bold text-gray-950">
                Reject Invoice
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {invoiceNumber} • {vendor} • {currency} {amount.toLocaleString()}
              </p>
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
            {/* Info Banner */}
            <div className="mb-6 flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-md">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-900">
                  Help us improve routing accuracy
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  Your feedback will help the system learn and route similar invoices correctly in the future.
                </p>
              </div>
            </div>

            {/* Rejection Categories */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-950 mb-3">
                Why are you rejecting this invoice?
              </label>
              <div className="grid grid-cols-1 gap-3">
                {REJECTION_CATEGORIES.map((category) => {
                  const Icon = category.icon;
                  const isSelected = selectedCategory === category.id;
                  
                  return (
                    <button
                      key={category.id}
                      onClick={() => {
                        setSelectedCategory(category.id);
                        if (!category.requiresSuggestion) {
                          setSuggestedApproverId('');
                        }
                      }}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                        isSelected
                          ? 'border-purple-600 bg-purple-50'
                          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${
                          isSelected ? 'bg-purple-600' : 'bg-gray-100'
                        }`}>
                          <Icon className={`h-5 w-5 ${
                            isSelected ? 'text-white' : 'text-gray-600'
                          }`} />
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-gray-950">
                            {category.label}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {category.description}
                          </p>
                        </div>
                        {isSelected && (
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

            {/* Suggested Approver (conditional) */}
            {requiresSuggestion && selectedCategory && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <label className="block text-sm font-medium text-gray-950 mb-3">
                  Who should approve this invoice instead?
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {teamMembers
                    .filter(m => m.id !== currentApproverId)
                    .map((member) => {
                      const isSelected = suggestedApproverId === member.id;
                      const isAvailable = isApproverAvailable(member);
                      const statusBadge = renderStatusBadge(member);
                      
                      return (
                        <button
                          key={member.id}
                          onClick={() => {
                            if (isAvailable) {
                              setSuggestedApproverId(member.id);
                            }
                          }}
                          disabled={!isAvailable}
                          className={`w-full text-left p-3 rounded-lg border transition-all ${
                            !isAvailable
                              ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                              : isSelected
                                ? 'border-blue-600 bg-blue-100'
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
                                <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
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
            )}

            {/* Additional Notes */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-950 mb-2">
                Additional notes (optional)
              </label>
              <textarea
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                placeholder="Add any additional context about this rejection..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                rows={3}
              />
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
              disabled={!canConfirm}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                canConfirm
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Reject Invoice
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
