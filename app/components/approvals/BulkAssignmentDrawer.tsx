'use client';

import React, { useState, useEffect } from 'react';
import {
  X, Users, User, Shuffle, BarChart3,
  Sparkles, Search, Info
} from 'lucide-react';

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

interface BulkAssignmentDrawerProps {
  selectedInvoices: Set<string>;
  teamMembers: TeamMember[];
  onAssign: (invoiceIds: string[], assigneeId: string, strategy: string) => void;
  onClose: () => void;
}

type AssignmentStrategy = 'direct' | 'round-robin' | 'load-balance' | 'ai-smart';

export function BulkAssignmentDrawer({
  selectedInvoices,
  teamMembers,
  onAssign,
  onClose,
}: BulkAssignmentDrawerProps) {
  const [strategy, setStrategy] = useState<AssignmentStrategy>('direct');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [preview, setPreview] = useState<Map<string, string>>(new Map());

  const strategies = [
    {
      id: 'direct' as AssignmentStrategy,
      name: 'Direct Assignment',
      description: 'Assign all selected invoices to one person',
      icon: User,
    },
    {
      id: 'round-robin' as AssignmentStrategy,
      name: 'Round Robin',
      description: 'Distribute evenly across team members',
      icon: Shuffle,
    },
    {
      id: 'load-balance' as AssignmentStrategy,
      name: 'Load Balance',
      description: 'Assign based on current workload',
      icon: BarChart3,
    },
    {
      id: 'ai-smart' as AssignmentStrategy,
      name: 'Smart Assignment',
      description: 'AI-based optimal distribution',
      icon: Sparkles,
    },
  ];

  useEffect(() => {
    generatePreview();
  }, [strategy, selectedAssignee]);

  const generatePreview = () => {
    const newPreview = new Map<string, string>();
    const invoiceIds = Array.from(selectedInvoices);
    
    switch (strategy) {
      case 'direct':
        if (selectedAssignee) {
          invoiceIds.forEach(id => {
            newPreview.set(id, selectedAssignee);
          });
        }
        break;
      
      case 'round-robin':
        const availableMembers = teamMembers.filter(m => m.status === 'available');
        invoiceIds.forEach((id, index) => {
          const member = availableMembers[index % availableMembers.length];
          if (member) {
            newPreview.set(id, member.id);
          }
        });
        break;
      
      case 'load-balance':
        const sortedByWorkload = [...teamMembers]
          .filter(m => m.status === 'available')
          .sort((a, b) => {
            const aRatio = (a.current_workload || 0) / (a.capacity || 1);
            const bRatio = (b.current_workload || 0) / (b.capacity || 1);
            return aRatio - bRatio;
          });
        
        invoiceIds.forEach((id) => {
          if (sortedByWorkload[0]) {
            newPreview.set(id, sortedByWorkload[0].id);
            // Update workload for next iteration
            sortedByWorkload[0].current_workload = (sortedByWorkload[0].current_workload || 0) + 1;
            sortedByWorkload.sort((a, b) => {
              const aRatio = (a.current_workload || 0) / (a.capacity || 1);
              const bRatio = (b.current_workload || 0) / (b.capacity || 1);
              return aRatio - bRatio;
            });
          }
        });
        break;
      
      case 'ai-smart':
        // Simulate AI assignment
        invoiceIds.forEach((id, index) => {
          const optimalMember = teamMembers[index % teamMembers.length];
          newPreview.set(id, optimalMember.id);
        });
        break;
    }
    
    setPreview(newPreview);
  };

  const filteredMembers = teamMembers.filter((member) => {
    return searchQuery === '' ||
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.role?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleConfirm = () => {
    if (strategy === 'direct' && !selectedAssignee) {
      return;
    }
    
    onAssign(
      Array.from(selectedInvoices),
      selectedAssignee,
      strategy
    );
  };

  const getAssignmentSummary = () => {
    const summary = new Map<string, number>();
    preview.forEach((assigneeId) => {
      summary.set(assigneeId, (summary.get(assigneeId) || 0) + 1);
    });
    return summary;
  };

  const assignmentSummary = getAssignmentSummary();

  return (
    <div className="fixed inset-0 z-[60] overflow-hidden">
      <div className="absolute inset-0 bg-black bg-opacity-25" onClick={onClose} />
      
      <div className="absolute right-0 top-0 h-full w-full max-w-2xl bg-white shadow-xl">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="bg-purple-900 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="h-6 w-6 text-white" />
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    Bulk Assignment
                  </h2>
                  <p className="text-sm text-purple-200">
                    {selectedInvoices.size} invoices selected
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-1 text-white hover:bg-purple-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Strategy Selection */}
          <div className="border-b border-gray-200 px-6 py-4">
            <h3 className="text-sm font-bold text-gray-950 mb-3">
              Assignment Strategy
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {strategies.map((strat) => {
                const Icon = strat.icon;
                return (
                  <button
                    key={strat.id}
                    onClick={() => setStrategy(strat.id)}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      strategy === strat.id
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className={`h-5 w-5 ${
                        strategy === strat.id ? 'text-purple-600' : 'text-gray-400'
                      }`} />
                      <div>
                        <p className={`text-sm font-medium ${
                          strategy === strat.id ? 'text-purple-900' : 'text-gray-950'
                        }`}>
                          {strat.name}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {strat.description}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Direct Assignment Member Selection */}
          {strategy === 'direct' && (
            <div className="border-b border-gray-200 px-6 py-4">
              <h3 className="text-sm font-bold text-gray-950 mb-3">
                Select Team Member
              </h3>
              
              {/* Search */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search team members..."
                  className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Member List */}
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {filteredMembers.map((member) => (
                  <button
                    key={member.id}
                    onClick={() => setSelectedAssignee(member.id)}
                    className={`w-full p-2 rounded-lg border transition-all ${
                      selectedAssignee === member.id
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 ${member.color} rounded-full flex items-center justify-center`}>
                        <span className="text-xs font-medium text-white">
                          {member.initials}
                        </span>
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-sm font-medium text-gray-950">
                          {member.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {member.role} • {member.current_workload}/{member.capacity} invoices
                        </p>
                      </div>
                      {member.status === 'out-of-office' && (
                        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                          Out of Office
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Assignment Preview */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <h3 className="text-sm font-bold text-gray-950 mb-3">
              Assignment Preview
            </h3>
            
            {assignmentSummary.size > 0 ? (
              <div className="space-y-3">
                {Array.from(assignmentSummary.entries()).map(([assigneeId, count]) => {
                  const member = teamMembers.find(m => m.id === assigneeId);
                  if (!member) return null;
                  
                  const newWorkload = (member.current_workload || 0) + count;
                  const utilization = Math.round((newWorkload / (member.capacity || 1)) * 100);
                  
                  return (
                    <div key={assigneeId} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 ${member.color} rounded-full flex items-center justify-center`}>
                            <span className="text-xs font-medium text-white">
                              {member.initials}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-950">
                              {member.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              +{count} invoice{count > 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-950">
                            {newWorkload}/{member.capacity}
                          </p>
                          <p className="text-xs text-gray-500">
                            {utilization}% utilization
                          </p>
                        </div>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            utilization < 70 ? 'bg-green-500' :
                            utilization < 90 ? 'bg-amber-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(100, utilization)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-32 text-gray-500">
                <Info className="h-8 w-8 mb-2" />
                <p className="text-sm">
                  {strategy === 'direct' 
                    ? 'Select a team member to see preview'
                    : 'Configure strategy to see preview'}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={strategy === 'direct' && !selectedAssignee}
                className="px-4 py-2 text-sm font-medium text-white bg-purple-900 rounded-md hover:bg-purple-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Assign {selectedInvoices.size} Invoice{selectedInvoices.size > 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}