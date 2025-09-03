'use client';

import React, { useState } from 'react';
import {
  X, Users, Search, Filter, TrendingUp,
  Clock, CheckCircle, AlertTriangle, User
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
  sla_compliance?: number;
  avg_approval_time?: number;
  completed_today?: number;
}

interface TeamWorkloadDrawerProps {
  teamMembers: TeamMember[];
  onClose: () => void;
}

export function TeamWorkloadDrawer({
  teamMembers,
  onClose,
}: TeamWorkloadDrawerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'available' | 'busy' | 'out-of-office'>('all');

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-500';
      case 'busy':
        return 'bg-amber-500';
      case 'out-of-office':
        return 'bg-gray-400';
      default:
        return 'bg-gray-400';
    }
  };

  const getWorkloadColor = (workload: number, capacity: number) => {
    const percentage = (workload / capacity) * 100;
    if (percentage < 70) return 'bg-green-500';
    if (percentage < 90) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const getWorkloadPercentage = (workload: number, capacity: number) => {
    return Math.min(100, Math.round((workload / capacity) * 100));
  };

  const filteredMembers = teamMembers.filter((member) => {
    const matchesSearch = 
      searchQuery === '' ||
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.role?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = 
      filterStatus === 'all' || member.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const totalCapacity = teamMembers.reduce((sum, m) => sum + (m.capacity || 0), 0);
  const totalWorkload = teamMembers.reduce((sum, m) => sum + (m.current_workload || 0), 0);
  const avgUtilization = totalCapacity > 0 ? Math.round((totalWorkload / totalCapacity) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black bg-opacity-25" onClick={onClose} />
      
      <div className="absolute right-0 top-0 h-full w-full max-w-lg bg-white shadow-xl">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="bg-purple-900 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="h-6 w-6 text-white" />
                <h2 className="text-lg font-semibold text-white">
                  Team Workload
                </h2>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-1 text-white hover:bg-purple-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-gray-500">Team Size</p>
                <p className="text-2xl font-bold text-gray-950">{teamMembers.length}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Workload</p>
                <p className="text-2xl font-bold text-gray-950">{totalWorkload}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Avg Utilization</p>
                <p className="text-2xl font-bold text-gray-950">{avgUtilization}%</p>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="border-b border-gray-200 px-6 py-3">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search team members..."
                  className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All Status</option>
                <option value="available">Available</option>
                <option value="busy">Busy</option>
                <option value="out-of-office">Out of Office</option>
              </select>
            </div>
          </div>

          {/* Team Members List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {filteredMembers.map((member) => {
              const workloadPercentage = getWorkloadPercentage(
                member.current_workload || 0,
                member.capacity || 1
              );
              
              return (
                <div
                  key={member.id}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 hover:shadow-sm transition-all"
                >
                  {/* Member Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className={`w-10 h-10 ${member.color} rounded-full flex items-center justify-center text-white text-sm font-semibold`}>
                          {member.initials}
                        </div>
                        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(member.status)}`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-950">
                          {member.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {member.role}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-950">
                        {member.current_workload || 0}/{member.capacity || 0}
                      </p>
                      <p className="text-xs text-gray-500">
                        invoices
                      </p>
                    </div>
                  </div>

                  {/* Workload Bar */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-500">Workload</span>
                      <span className="text-xs font-medium text-gray-950">
                        {workloadPercentage}%
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${getWorkloadColor(
                          member.current_workload || 0,
                          member.capacity || 1
                        )}`}
                        style={{ width: `${workloadPercentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3 text-gray-400" />
                      <span className="text-gray-500">SLA:</span>
                      <span className="font-medium text-gray-950">
                        {member.sla_compliance || 95}%
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-gray-400" />
                      <span className="text-gray-500">Avg:</span>
                      <span className="font-medium text-gray-950">
                        {member.avg_approval_time || 1.5}h
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-gray-400" />
                      <span className="text-gray-500">Today:</span>
                      <span className="font-medium text-gray-950">
                        {member.completed_today || 0}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
                    <button className="flex-1 px-3 py-1.5 text-xs bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors">
                      View Details
                    </button>
                    <button className="flex-1 px-3 py-1.5 text-xs bg-purple-900 text-white rounded hover:bg-purple-800 transition-colors">
                      Reassign Work
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
            <button
              onClick={onClose}
              className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}