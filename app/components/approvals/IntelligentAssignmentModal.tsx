'use client';

import React, { useState, useMemo } from 'react';
import { X, User, Search, Sparkles, TrendingUp, CheckCircle } from 'lucide-react';
import { ApproverSuggestion } from '@/app/services/approvalRoutingService';

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

interface IntelligentAssignmentModalProps {
  invoiceId: string;
  invoiceNumber: string;
  vendor: string;
  amount: number;
  currency: string;
  suggestions: ApproverSuggestion[];
  autoRouteEligible: boolean;
  teamMembers: TeamMember[];
  onAssign: (approverId: string, approverName: string, confidence?: number, isAISuggested?: boolean) => void;
  onClose: () => void;
}

export function IntelligentAssignmentModal({
  invoiceId,
  invoiceNumber,
  vendor,
  amount,
  currency,
  suggestions,
  autoRouteEligible,
  teamMembers,
  onAssign,
  onClose,
}: IntelligentAssignmentModalProps) {
  const [selectedApproverId, setSelectedApproverId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [assignmentMode, setAssignmentMode] = useState<'ai' | 'manual'>('ai');

  // Get team member details by ID
  const getTeamMember = (id: string): TeamMember | undefined => {
    return teamMembers.find(m => m.id === id);
  };

  // Filter team members for manual search
  const filteredTeamMembers = useMemo(() => {
    if (!searchQuery) return teamMembers;
    const query = searchQuery.toLowerCase();
    return teamMembers.filter(member =>
      member.name.toLowerCase().includes(query) ||
      member.email?.toLowerCase().includes(query)
    );
  }, [teamMembers, searchQuery]);

  // Get selected approver details
  const selectedApprover = useMemo(() => {
    if (!selectedApproverId) return null;
    
    // Check if it's an AI suggestion
    const suggestion = suggestions.find(s => s.approver_id === selectedApproverId);
    if (suggestion) {
      return {
        ...getTeamMember(selectedApproverId),
        confidence: suggestion.confidence,
        reason: suggestion.reason,
        isAISuggested: true,
      };
    }
    
    // Manual selection
    return {
      ...getTeamMember(selectedApproverId),
      confidence: undefined,
      reason: undefined,
      isAISuggested: false,
    };
  }, [selectedApproverId, suggestions, teamMembers]);

  const handleAssign = () => {
    if (!selectedApproverId || !selectedApprover) return;
    
    onAssign(
      selectedApproverId,
      selectedApprover.name!,
      selectedApprover.confidence,
      selectedApprover.isAISuggested
    );
  };

  // Format confidence as percentage
  const formatConfidence = (confidence: number) => {
    return `${Math.round(confidence * 100)}%`;
  };

  // Get confidence color
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.90) return 'text-green-600 bg-green-50 border-green-200';
    if (confidence >= 0.75) return 'text-blue-600 bg-blue-50 border-blue-200';
    return 'text-amber-600 bg-amber-50 border-amber-200';
  };

  // Get confidence badge color
  const getConfidenceBadgeColor = (confidence: number) => {
    if (confidence >= 0.90) return 'bg-green-100 text-green-700';
    if (confidence >= 0.75) return 'bg-blue-100 text-blue-700';
    return 'bg-amber-100 text-amber-700';
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-25" onClick={onClose} />
        
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div>
              <h3 className="text-lg font-bold text-gray-950">
                Assign Invoice for Approval
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
            {/* Mode Toggle */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={() => setAssignmentMode('ai')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    assignmentMode === 'ai'
                      ? 'bg-purple-100 text-purple-900 border border-purple-300'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <Sparkles className="h-4 w-4" />
                  AI Suggestions
                  {suggestions.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 bg-purple-600 text-white text-xs rounded-full">
                      {suggestions.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setAssignmentMode('manual')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    assignmentMode === 'manual'
                      ? 'bg-purple-100 text-purple-900 border border-purple-300'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <Search className="h-4 w-4" />
                  Manual Search
                </button>
              </div>

              {/* Auto-route eligible badge */}
              {autoRouteEligible && assignmentMode === 'ai' && (
                <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-md">
                  <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <p className="text-sm text-green-800">
                    <strong>High confidence match found.</strong> System can auto-route this invoice to the top suggestion.
                  </p>
                </div>
              )}
            </div>

            {/* AI Suggestions View */}
            {assignmentMode === 'ai' && (
              <div className="space-y-3">
                {suggestions.length > 0 ? (
                  <>
                    <p className="text-sm text-gray-600 mb-3">
                      Based on historical patterns, here are the recommended approvers:
                    </p>
                    {suggestions.map((suggestion, index) => {
                      const member = getTeamMember(suggestion.approver_id);
                      if (!member) return null;
                      
                      const isSelected = selectedApproverId === suggestion.approver_id;
                      
                      return (
                        <button
                          key={suggestion.approver_id}
                          onClick={() => setSelectedApproverId(suggestion.approver_id)}
                          className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                            isSelected
                              ? 'border-purple-600 bg-purple-50'
                              : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            {/* Rank Badge */}
                            <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              index === 0 ? 'bg-purple-600 text-white' :
                              index === 1 ? 'bg-purple-200 text-purple-900' :
                              'bg-gray-200 text-gray-700'
                            }`}>
                              {index + 1}
                            </div>

                            {/* Avatar */}
                            <div className={`w-10 h-10 rounded-full ${member.color} flex items-center justify-center flex-shrink-0`}>
                              <span className="text-sm font-medium text-white">
                                {member.initials}
                              </span>
                            </div>

                            {/* Details */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-semibold text-gray-950">
                                  {member.name}
                                </span>
                                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getConfidenceBadgeColor(suggestion.confidence)}`}>
                                  {formatConfidence(suggestion.confidence)} confident
                                </span>
                              </div>
                              <p className="text-xs text-gray-600 mb-2">
                                {member.role}
                              </p>
                              <div className="flex items-start gap-2">
                                <TrendingUp className="h-3.5 w-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                                <p className="text-xs text-gray-600">
                                  {suggestion.reason}
                                </p>
                              </div>
                            </div>

                            {/* Selection Indicator */}
                            {isSelected && (
                              <div className="flex-shrink-0">
                                <CheckCircle className="h-5 w-5 text-purple-600" />
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Sparkles className="h-8 w-8 mx-auto mb-3 text-gray-400" />
                    <p className="text-sm">
                      No routing patterns found for this vendor.
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Switch to Manual Search to select an approver.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Manual Search View */}
            {assignmentMode === 'manual' && (
              <div>
                {/* Search Input */}
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by name or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Team Members List */}
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {filteredTeamMembers.length > 0 ? (
                    filteredTeamMembers.map((member) => {
                      const isSelected = selectedApproverId === member.id;
                      
                      return (
                        <button
                          key={member.id}
                          onClick={() => setSelectedApproverId(member.id)}
                          className={`w-full text-left p-3 rounded-lg border transition-all ${
                            isSelected
                              ? 'border-purple-600 bg-purple-50'
                              : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full ${member.color} flex items-center justify-center flex-shrink-0`}>
                              <span className="text-sm font-medium text-white">
                                {member.initials}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-950">
                                {member.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {member.role}
                              </p>
                            </div>
                            {isSelected && (
                              <CheckCircle className="h-5 w-5 text-purple-600 flex-shrink-0" />
                            )}
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <User className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm">No approvers found</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            
            <div className="flex items-center gap-3">
              {/* Selected Approver Preview */}
              {selectedApprover && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-md">
                  <div className={`w-6 h-6 rounded-full ${selectedApprover.color} flex items-center justify-center`}>
                    <span className="text-xs font-medium text-white">
                      {selectedApprover.initials}
                    </span>
                  </div>
                  <span className="text-sm text-gray-950">
                    {selectedApprover.name}
                  </span>
                  {selectedApprover.confidence && (
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getConfidenceBadgeColor(selectedApprover.confidence)}`}>
                      {formatConfidence(selectedApprover.confidence)}
                    </span>
                  )}
                </div>
              )}

              <button
                onClick={handleAssign}
                disabled={!selectedApproverId}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  selectedApproverId
                    ? 'bg-purple-900 text-white hover:bg-purple-800'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Assign Invoice
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
