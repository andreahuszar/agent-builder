'use client';

import React from 'react';
import { AlertTriangle, AlertCircle, Info, ChevronRight } from 'lucide-react';
import { Recommendation } from '@/app/types/recommendations';
import { formatRecommendationValue } from '@/app/services/recommendationEngine';
import { cn } from '@/lib/utils';

interface RecommendationCardProps {
  recommendation: Recommendation;
  onAction: (actionId: string, recommendation: Recommendation) => void;
  isExpanded?: boolean;
}

export function RecommendationCard({
  recommendation,
  onAction,
  isExpanded = false,
}: RecommendationCardProps) {
  const getSeverityIcon = () => {
    switch (recommendation.severity) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getSeverityColor = () => {
    switch (recommendation.severity) {
      case 'critical':
        return 'border-red-200 bg-red-50/50';
      case 'warning':
        return 'border-orange-200 bg-orange-50/50';
      case 'info':
        return 'border-blue-200 bg-blue-50/50';
    }
  };

  return (
    <div
      className={cn(
        'border rounded-lg transition-all',
        getSeverityColor(),
        isExpanded ? 'shadow-sm' : ''
      )}
    >
      <div className="p-3">
        {/* Header */}
        <div className="flex items-start gap-3 mb-2">
          <div className="mt-0.5">{getSeverityIcon()}</div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-gray-950 mb-1">
              {recommendation.title}
            </h4>
            <p className="text-xs text-gray-700 leading-relaxed">
              {recommendation.description}
            </p>
          </div>
        </div>

        {/* Impact metrics */}
        <div className="flex items-center gap-4 mb-3 pl-7">
          <div>
            <span className="text-xs text-gray-600">Invoices: </span>
            <span className="text-sm font-semibold text-gray-950">
              {recommendation.impact.count}
            </span>
          </div>
          <div>
            <span className="text-xs text-gray-600">Value: </span>
            <span className="text-sm font-semibold text-gray-950">
              {formatRecommendationValue(recommendation.impact.value)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pl-7">
          {recommendation.actions.map((action) => {
            const isPrimary = action.type === 'filter';
            return (
              <button
                key={action.id}
                onClick={() => onAction(action.id, recommendation)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2',
                  isPrimary
                    ? 'bg-purple-900 text-white hover:bg-purple-800'
                    : 'bg-white text-purple-900 border border-purple-600 hover:bg-purple-50'
                )}
                title={action.description}
              >
                {action.type === 'filter' && (
                  <ChevronRight className="h-3 w-3 inline mr-1" />
                )}
                {action.label}
                {action.requiresSelection && ' (select first)'}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}