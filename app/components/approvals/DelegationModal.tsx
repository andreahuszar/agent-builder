'use client';

import React, { useState } from 'react';
import { X, User, AlertCircle } from 'lucide-react';

interface TeamMember {
  id: string;
  name: string;
  initials: string;
  email?: string;
  role?: string;
  color: string;
}

interface DelegationModalProps {
  invoiceId: string;
  assignee: TeamMember;
  onConfirm: (reason: string, comment?: string) => void;
  onClose: () => void;
}

const delegationReasons = [
  'Vacation coverage',
  'Subject matter expertise needed',
  'Workload balancing',
  'Higher approval authority required',
  'Conflict of interest',
  'Other...',
];

export function DelegationModal({
  invoiceId,
  assignee,
  onConfirm,
  onClose,
}: DelegationModalProps) {
  const [selectedReason, setSelectedReason] = useState('');
  const [customComment, setCustomComment] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = () => {
    if (!selectedReason) {
      setError('Please select a reason for delegation');
      return;
    }
    
    if (selectedReason === 'Other...' && !customComment.trim()) {
      setError('Please provide details for the delegation');
      return;
    }

    onConfirm(selectedReason, customComment);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-25" onClick={onClose} />
        
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-950">
              Delegate Invoice
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4">
            {/* Assignee Info */}
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-3">
                You are delegating this invoice to:
              </p>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className={`w-10 h-10 rounded-full ${assignee.color} flex items-center justify-center`}>
                  <span className="text-sm font-medium text-white">
                    {assignee.initials}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-950">
                    {assignee.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {assignee.role}
                  </p>
                </div>
              </div>
            </div>

            {/* Reason Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for delegation <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedReason}
                onChange={(e) => {
                  setSelectedReason(e.target.value);
                  setError('');
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Select a reason...</option>
                {delegationReasons.map((reason) => (
                  <option key={reason} value={reason}>
                    {reason}
                  </option>
                ))}
              </select>
            </div>

            {/* Custom Comment */}
            {selectedReason === 'Other...' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Please provide details <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={customComment}
                  onChange={(e) => {
                    setCustomComment(e.target.value);
                    setError('');
                  }}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter delegation details..."
                />
              </div>
            )}

            {/* Optional Comment for other reasons */}
            {selectedReason && selectedReason !== 'Other...' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional comments (optional)
                </label>
                <textarea
                  value={customComment}
                  onChange={(e) => setCustomComment(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Add any additional context..."
                />
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Info Message */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800">
                The assignee will be notified and the invoice will be moved to their approval queue.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="px-4 py-2 text-sm font-medium text-white bg-purple-900 rounded-md hover:bg-purple-800 transition-colors"
            >
              Delegate Invoice
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}