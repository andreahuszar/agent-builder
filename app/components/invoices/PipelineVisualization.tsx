'use client';

import React from 'react';
import { PipelineStage } from '@/app/utils/pipelineCalculations';

interface PipelineVisualizationProps {
  stages: PipelineStage[];
  loading?: boolean;
  onStageClick?: (stageLabel: string) => void;
}

export default function PipelineVisualization({ 
  stages, 
  loading, 
  onStageClick 
}: PipelineVisualizationProps) {
  // Calculate totals for percentages
  const totalCount = stages.reduce((sum, stage) => sum + stage.count, 0);
  const maxCount = Math.max(...stages.map(s => s.count));

  // Get hover ring color for each stage
  const getStageHoverRing = (label: string): string => {
    switch (label) {
      case 'PROCESSING':
        return 'hover:ring-purple-600/50';
      case 'EXCEPTIONS':
        return 'hover:ring-red-600/50';
      case 'APPROVAL':
        return 'hover:ring-amber-600/50';
      case 'PAYMENT READY':
        return 'hover:ring-emerald-600/50';
      default:
        return 'hover:ring-gray-600/50';
    }
  };

  // Get border color for each stage
  const getStageBorderColor = (label: string, count: number): string => {
    if (count === 0) {
      return 'border-gray-200';
    }
    
    switch (label) {
      case 'PROCESSING':
        return 'border-purple-500';
      case 'EXCEPTIONS':
        return 'border-red-500';
      case 'APPROVAL':
        return 'border-amber-500';
      case 'PAYMENT READY':
        return 'border-emerald-500';
      default:
        return 'border-gray-600';
    }
  };

  // Format the stage labels for display
  const formatStageLabel = (label: string): string => {
    const labelMap: Record<string, string> = {
      'PROCESSING': 'Processing',
      'EXCEPTIONS': 'Exceptions',
      'APPROVAL': 'Approval',
      'PAYMENT READY': 'Ready'
    };
    return labelMap[label] || label;
  };

  if (loading) {
    return (
      <div className="py-4">
        <div className="animate-pulse flex items-center justify-between">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-col items-center">
              <div className="w-10 h-10 bg-gray-200 rounded-full mb-1"></div>
              <div className="w-16 h-3 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="py-2">
      <div className="relative">
        {/* Connection line with animation */}
        <div 
          className="absolute top-5 h-0.5 overflow-hidden"
          style={{
            left: '20px',
            right: '20px',
            background: 'linear-gradient(90deg, #E5E7EB 0%, #D1D5DB 50%, #E5E7EB 100%)',
            borderRadius: '1px'
          }}
        >
          <div 
            className="absolute top-0 left-0 w-full h-full"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(139, 92, 246, 0.6) 50%, transparent 100%)',
              animation: 'pipelineFlowAnimation 3s linear infinite',
              left: '-100%'
            }}
          />
        </div>
        
        {/* Stages */}
        <div className="relative grid grid-cols-4 gap-0">
          {stages.map((stage, index) => {
            const isHighLoad = stage.count === maxCount && stage.count > 0;
            const percentage = totalCount > 0 ? (stage.count / totalCount * 100).toFixed(0) : 0;
            
            return (
              <div
                key={stage.label}
                className="flex flex-col items-center justify-start relative group"
              >
                {/* Stage dot */}
                <div className="relative">
                  <div 
                    className={`
                      w-10 h-10 rounded-full flex items-center justify-center
                      ${stage.count === 0 ? 'bg-gray-100 text-gray-500' : 'bg-white text-gray-900'}
                      font-medium text-sm border-2 ${getStageBorderColor(stage.label, stage.count)}
                      ${stage.count > 0 ? 'shadow-sm' : ''}
                      transition-all duration-200
                      ${stage.count > 0 ? 'group-hover:scale-105' : ''}
                      ${onStageClick && stage.count > 0 ? `cursor-pointer hover:shadow-md hover:ring-2 hover:ring-offset-2 hover:ring-offset-gray-50 ${getStageHoverRing(stage.label)}` : ''}
                    `}
                    onClick={() => {
                      if (onStageClick && stage.count > 0) {
                        onStageClick(stage.label);
                      }
                    }}
                  >
                    {stage.count}
                  </div>
                  
                  {/* Percentage - always visible */}
                  {stage.count > 0 && (
                    <div className="absolute -bottom-5 left-1/2 transform -translate-x-1/2">
                      <span className="text-[10px] text-gray-500">{percentage}%</span>
                    </div>
                  )}
                </div>
                
                {/* Stage label */}
                <span 
                  className={`text-xs font-medium ${stage.count === 0 ? 'text-gray-400' : 'text-gray-600'}`} 
                  style={{ marginTop: '20px' }}
                >
                  {formatStageLabel(stage.label)}
                </span>
                
                {/* Hover tooltip */}
                {stage.count > 0 && (
                  <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    <div className="bg-gray-900 text-white text-xs rounded-md py-1.5 px-2 whitespace-nowrap">
                      <div className="font-medium">{stage.count} invoice{stage.count !== 1 ? 's' : ''}</div>
                    </div>
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                      <div className="border-4 border-transparent border-t-gray-900"></div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
      </div>
      
      {/* Animation Keyframes */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes pipelineFlowAnimation {
            0% { left: -100%; }
            100% { left: 100%; }
          }
        `
      }} />
    </div>
  );
}