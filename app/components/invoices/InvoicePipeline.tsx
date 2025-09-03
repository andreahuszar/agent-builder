'use client';

import React, { useState, useEffect } from 'react';
import { ChevronDown, Zap, AlertCircle, Users } from 'lucide-react';
import PipelineVisualization from './PipelineVisualization';
import { 
  PipelineStage, 
  getCollapsedStats, 
  formatPipelineValue 
} from '@/app/utils/pipelineCalculations';

interface InvoicePipelineProps {
  stages: PipelineStage[];
  loading?: boolean;
  onStageClick?: (stageLabel: string) => void;
}

export default function InvoicePipeline({ 
  stages, 
  loading = false, 
  onStageClick 
}: InvoicePipelineProps) {
  const [expanded, setExpanded] = useState(() => {
    // Load saved state from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('invoicePipelineExpanded');
      return saved !== null ? JSON.parse(saved) : true;
    }
    return true;
  });

  // Save expanded state to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('invoicePipelineExpanded', JSON.stringify(expanded));
    }
  }, [expanded]);

  // Get collapsed statistics
  const stats = getCollapsedStats(stages);

  return (
    <div 
      className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4 overflow-hidden transition-all duration-500 ease-in-out"
      style={{
        maxHeight: expanded ? '280px' : '61px',
        transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
      }}
    >
      {/* Header Section */}
      <div 
        className="flex justify-between items-center cursor-pointer py-2 px-4 hover:bg-purple-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center space-x-2">
          {/* Icon */}
          <div className="p-1.5 bg-purple-100 rounded-lg">
            <Zap className="h-4 w-4 text-purple-600" />
          </div>
          
          {/* Title */}
          <div>
            <h3 className="text-base font-semibold text-gray-900">Invoice Pipeline</h3>
            <p className="text-xs text-gray-500">Real-time invoice automation</p>
          </div>
          
          {/* Agent Status Pills */}
          <div className="flex items-center gap-2 ml-4">
            {/* Agent Ready Status */}
            <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-50 rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs text-gray-700">AI Agents Ready</span>
            </div>
            
            {/* Separator - Only show if collapsed and there are exceptions or approvals */}
            {!expanded && (stats.exceptions > 0 || stats.approvals > 0) && (
              <div className="w-px h-4 bg-gray-200 opacity-60" />
            )}
            
            {/* Exception & Approval Indicators - Only when collapsed */}
            {!expanded && (
              <>
                {/* Exceptions Indicator */}
                {stats.exceptions > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-red-50 rounded-full">
                    <AlertCircle className="h-3.5 w-3.5 text-red-600" />
                    <span className="text-xs font-medium text-red-700">
                      {stats.exceptions} exception{stats.exceptions !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
                
                {/* Approvals Indicator */}
                {stats.approvals > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-orange-50 rounded-full">
                    <Users className="h-3.5 w-3.5 text-orange-600" />
                    <span className="text-xs font-medium text-orange-700">
                      {stats.approvals} approval{stats.approvals !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        
        {/* Right Section */}
        <div className="flex items-center gap-4">
          {/* Queue Count */}
          <div className="text-right">
            <div className="text-xl font-bold text-gray-900">{stats.totalCount}</div>
            <div className="text-xs text-gray-500">
              {stats.totalCount === 0 ? 'Queue empty' : 'In queue'}
            </div>
          </div>
          
          {/* Pipeline Value */}
          <div className="text-right">
            <div className="text-xl font-bold text-gray-900">
              {formatPipelineValue(stats.totalValue)}
            </div>
            <div className="text-xs text-gray-500">Pipeline value</div>
          </div>
          
          {/* Chevron Icon */}
          <ChevronDown 
            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
              expanded ? 'transform rotate-0' : 'transform -rotate-180'
            }`}
          />
        </div>
      </div>
      
      {/* Expanded Content */}
      <div 
        className="px-4 pb-2 transition-all duration-500 ease-in-out"
        style={{
          opacity: expanded ? 1 : 0,
          transform: expanded ? 'translateY(0)' : 'translateY(-10px)',
          pointerEvents: expanded ? 'auto' : 'none'
        }}
      >
        <PipelineVisualization 
          stages={stages} 
          loading={loading}
          onStageClick={onStageClick}
        />
      </div>
    </div>
  );
}