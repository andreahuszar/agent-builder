'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { RecommendationCard } from './RecommendationCard';
import {
  Recommendation,
  RecommendationGroup,
  AnalysisContext,
  FilterPreset,
} from '@/app/types/recommendations';
import { analyzeInvoices, formatRecommendationValue } from '@/app/services/recommendationEngine';
import { cn } from '@/lib/utils';

interface RecommendationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  invoices: any[];
  context: AnalysisContext;
  onApplyFilter: (preset: FilterPreset) => void;
  onQuickAction?: (actionId: string, recommendation: Recommendation) => void;
}

export function RecommendationsDrawer({
  isOpen,
  onClose,
  invoices,
  context,
  onApplyFilter,
  onQuickAction,
}: RecommendationsDrawerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['critical', 'warning']));

  // Set mounted flag after hydration
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Analyze invoices and generate recommendations
  const recommendationGroups = useMemo(() => {
    if (!isOpen || invoices.length === 0) return [];
    return analyzeInvoices(invoices, context);
  }, [invoices, context, isOpen]);

  // Calculate total recommendations
  const totalRecommendations = useMemo(() => {
    return recommendationGroups.reduce(
      (sum, group) => sum + group.recommendations.length,
      0
    );
  }, [recommendationGroups]);

  // Trigger animation
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setIsVisible(true), 10);
    }
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const toggleGroup = (severity: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(severity)) {
        next.delete(severity);
      } else {
        next.add(severity);
      }
      return next;
    });
  };

  const handleAction = (actionId: string, recommendation: Recommendation) => {
    // Handle filter actions
    if (actionId.startsWith('filter-') && recommendation.filterPreset) {
      onApplyFilter(recommendation.filterPreset);
      // Optionally close drawer after filtering
      handleClose();
      return;
    }

    // Handle other actions (contact, request, quick-fix, batch)
    if (onQuickAction) {
      onQuickAction(actionId, recommendation);
    }
  };

  // Don't render until mounted
  if (!isMounted) return null;

  // Don't render at all when closed
  if (!isOpen && !isVisible) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-hidden pointer-events-none">
      {/* Backdrop */}
      <div
        className={cn(
          'absolute inset-0 bg-black transition-opacity duration-300 pointer-events-auto',
          isVisible ? 'bg-opacity-30' : 'bg-opacity-0'
        )}
        onClick={handleClose}
      />

      {/* Drawer */}
      <div
        className={cn(
          'absolute right-0 top-0 h-full w-[600px] bg-white shadow-2xl transform transition-transform duration-300 ease-out pointer-events-auto',
          isVisible ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="border-b border-gray-200 px-6 py-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-purple-600" />
                <div>
                  <h2 className="text-lg font-semibold text-gray-950">
                    Recommended Actions
                  </h2>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Smart suggestions to resolve issues faster
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="rounded-lg p-1 hover:bg-gray-100 transition-colors"
                aria-label="Close drawer"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {recommendationGroups.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Sparkles className="h-12 w-12 text-gray-300 mb-3" />
                <p className="text-sm text-gray-600 mb-1">
                  No recommendations at this time
                </p>
                <p className="text-xs text-gray-500">
                  All invoices in this view look good!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Summary card */}
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-950">
                        {totalRecommendations} recommendation
                        {totalRecommendations !== 1 ? 's' : ''} found
                      </p>
                      <p className="text-xs text-gray-600 mt-0.5">
                        Click "Show me invoices" to filter the table
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-600">Total impact</p>
                      <p className="text-lg font-bold text-purple-900">
                        {formatRecommendationValue(
                          recommendationGroups.reduce(
                            (sum, group) => sum + group.totalValue,
                            0
                          )
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Recommendation groups */}
                {recommendationGroups.map((group) => {
                  const isExpanded = expandedGroups.has(group.severity);
                  return (
                    <div key={group.severity} className="space-y-2">
                      {/* Group header */}
                      <button
                        onClick={() => toggleGroup(group.severity)}
                        className="w-full flex items-center justify-between py-2 px-3 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-gray-600" />
                          ) : (
                            <ChevronUp className="h-4 w-4 text-gray-600" />
                          )}
                          <span className="text-sm font-semibold text-gray-950">
                            {group.label}
                          </span>
                          <span className="text-xs text-gray-600">
                            ({group.recommendations.length})
                          </span>
                        </div>
                        <div className="text-xs text-gray-600">
                          {formatRecommendationValue(group.totalValue)}
                        </div>
                      </button>

                      {/* Group recommendations */}
                      {isExpanded && (
                        <div className="space-y-3 pl-2">
                          {group.recommendations.map((recommendation) => (
                            <RecommendationCard
                              key={recommendation.id}
                              recommendation={recommendation}
                              onAction={handleAction}
                              isExpanded={isExpanded}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 px-6 py-3 flex-shrink-0 bg-gray-50">
            <p className="text-xs text-gray-600">
              💡 <strong>Tip:</strong> Recommendations update automatically based
              on your current tab and filters
            </p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}