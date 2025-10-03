'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { RecommendationCard } from './RecommendationCard';
import { InvoiceRecommendationCard } from './InvoiceRecommendationCard';
import { ComplexityGroupCard } from './ComplexityGroupCard';
import {
  Recommendation,
  RecommendationGroup,
  AnalysisContext,
  FilterPreset,
  RecommendationTab,
} from '@/app/types/recommendations';
import { analyzeInvoicesByTab, formatRecommendationValue } from '@/app/services/recommendationEngine';
import { cn } from '@/lib/utils';

interface RecommendationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  invoices: any[];
  context: AnalysisContext;
  onApplyFilter: (preset: FilterPreset) => void;
  onQuickAction?: (actionId: string, recommendation: Recommendation) => void;
  onFilterByInvoiceIds?: (invoiceIds: string[]) => void;
}

export function RecommendationsDrawer({
  isOpen,
  onClose,
  invoices,
  context,
  onApplyFilter,
  onQuickAction,
  onFilterByInvoiceIds,
}: RecommendationsDrawerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<RecommendationTab>('high-impact');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['critical', 'warning']));

  // Set mounted flag after hydration
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Analyze invoices and generate recommendations
  const analysisData = useMemo(() => {
    if (!isOpen || invoices.length === 0) return null;
    return analyzeInvoicesByTab(invoices, context);
  }, [invoices, context, isOpen]);

  // Calculate recommendations count for active tab
  const tabCounts = useMemo(() => {
    if (!analysisData) return { highImpact: 0, quickFixes: 0, byException: 0 };
    return {
      highImpact: analysisData.highImpact.length,
      quickFixes: analysisData.quickFixes.reduce((sum, g) => sum + g.count, 0),
      byException: analysisData.byException.reduce((sum, g) => sum + g.recommendations.length, 0),
    };
  }, [analysisData]);

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

  const handleSelectInvoice = (invoiceId: string) => {
    // TODO: Implement invoice selection/navigation
    console.log('Select invoice:', invoiceId);
  };

  const handleShowInTable = (invoiceIds: string[]) => {
    if (onFilterByInvoiceIds) {
      onFilterByInvoiceIds(invoiceIds);
      handleClose();
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
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-purple-600" />
                <div>
                  <h2 className="text-lg font-semibold text-gray-950">
                    Recommended Actions
                  </h2>
                  <p className="text-xs text-gray-700 mt-0.5">
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

            {/* Tab Navigation */}
            <div className="flex gap-2 border-b border-gray-200 -mb-4">
              <button
                onClick={() => setActiveTab('high-impact')}
                className={cn(
                  'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                  activeTab === 'high-impact'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                )}
              >
                High Impact
                {tabCounts.highImpact > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full">
                    {tabCounts.highImpact}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('quick-fixes')}
                className={cn(
                  'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                  activeTab === 'quick-fixes'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                )}
              >
                Quick Fixes
                {tabCounts.quickFixes > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full">
                    {tabCounts.quickFixes}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('by-exception')}
                className={cn(
                  'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                  activeTab === 'by-exception'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                )}
              >
                Resolve by Exception
                {tabCounts.byException > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full">
                    {tabCounts.byException}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {!analysisData || tabCounts[activeTab === 'high-impact' ? 'highImpact' : activeTab === 'quick-fixes' ? 'quickFixes' : 'byException'] === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Sparkles className="h-12 w-12 text-gray-300 mb-3" />
                <p className="text-sm text-gray-700 mb-1">
                  No recommendations at this time
                </p>
                <p className="text-xs text-gray-600">
                  All invoices in this view look good!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* High Impact Tab */}
                {activeTab === 'high-impact' && analysisData.highImpact.length > 0 && (
                  <>
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-950">
                            Top {analysisData.highImpact.length} highest value invoices
                          </p>
                          <p className="text-xs text-gray-700 mt-0.5">
                            Prioritized by invoice amount
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {analysisData.highImpact.map((recommendation) => (
                        <InvoiceRecommendationCard
                          key={recommendation.invoice.id}
                          recommendation={recommendation}
                          onSelect={handleSelectInvoice}
                        />
                      ))}
                    </div>
                  </>
                )}

                {/* Quick Fixes Tab */}
                {activeTab === 'quick-fixes' && analysisData.quickFixes.length > 0 && (
                  <>
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-950">
                            Grouped by complexity
                          </p>
                          <p className="text-xs text-gray-700 mt-0.5">
                            Start with the easiest invoices to resolve
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {analysisData.quickFixes.map((group) => (
                        <ComplexityGroupCard
                          key={group.level}
                          group={group}
                          onSelectInvoice={handleSelectInvoice}
                          onShowInTable={handleShowInTable}
                        />
                      ))}
                    </div>
                  </>
                )}

                {/* Resolve by Exception Tab */}
                {activeTab === 'by-exception' && analysisData.byException.length > 0 && (
                  <>
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-950">
                            {tabCounts.byException} recommendation
                            {tabCounts.byException !== 1 ? 's' : ''} found
                          </p>
                          <p className="text-xs text-gray-700 mt-0.5">
                            Click "Show me invoices" to filter the table
                          </p>
                        </div>
                      </div>
                    </div>
                    {/* Recommendation groups */}
                    {analysisData.byException.map((group) => {
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
                                <ChevronDown className="h-4 w-4 text-gray-700" />
                              ) : (
                                <ChevronUp className="h-4 w-4 text-gray-700" />
                              )}
                              <span className="text-sm font-semibold text-gray-950">
                                {group.label}
                              </span>
                              <span className="text-xs text-gray-700">
                                ({group.recommendations.length})
                              </span>
                            </div>
                            <div className="text-xs text-gray-700">
                              {group.totalCount} invoices
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
                  </>
                )}
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