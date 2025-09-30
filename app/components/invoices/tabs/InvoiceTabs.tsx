'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FileText, Package, GitCompare, Paperclip, Clock, Check, AlertTriangle, CheckCircle, List } from 'lucide-react';
import * as Tooltip from '@radix-ui/react-tooltip';
import { DetailsTab } from './DetailsTab';
import { LineItemsTab } from './LineItemsTab';
import { EnhancedLineItemsTabV2 } from './EnhancedLineItemsTabV2';
import { LineItemsPreviewPanel } from '../preview/LineItemsPreviewPanel';
import { MatchingTab } from './MatchingTab';
import { AttachmentsTab } from './AttachmentsTab';
import { ActivityTab } from './ActivityTab';
import { InvoiceValidator } from '@/app/utils/validationService';

export type TabId = 'details' | 'line-items' | 'matching' | 'attachments' | 'activity';
export type LayoutMode = 'compact' | 'medium' | 'large';

interface InvoiceTabsProps {
  invoiceId: string;
  invoiceData: any;
  matchResults?: any[];
  attachments?: any[];
  selectedLineId?: string | null;
  onLineSelect?: (lineId: string | null) => void;
  onDataUpdate?: (updatedData: any) => void;
  storageKey?: string;
  compactMode?: boolean;
  poComparisonData?: any;
  forceEditMode?: boolean;
  forceReadOnly?: boolean;
  hideComparison?: boolean;
}

export function InvoiceTabs({
  invoiceId,
  invoiceData,
  matchResults,
  attachments,
  selectedLineId,
  onLineSelect,
  onDataUpdate,
  storageKey,
  compactMode = false,
  poComparisonData,
  forceEditMode = false,
  forceReadOnly = false,
  hideComparison = false,
}: InvoiceTabsProps) {
  // Determine initial tab based on invoice status
  const getInitialTab = (): TabId => {
    return 'details';
  };

  const [activeTab, setActiveTab] = useState<TabId>(getInitialTab());
  const [isClient, setIsClient] = useState(false);
  const [isDynamicallyCompact, setIsDynamicallyCompact] = useState(true); // Start minimized
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('compact'); // Start in compact mode
  const tabContainerRef = useRef<HTMLDivElement>(null);
  
  // Combine prop-based and dynamic compact modes
  const shouldBeCompact = compactMode || isDynamicallyCompact;

  // Set isClient flag after mount to avoid hydration mismatch
  useEffect(() => {
    setIsClient(true);
    // Always default to 'details' tab - don't load from localStorage
  }, []);

  // Set up ResizeObserver for dynamic compact mode
  useEffect(() => {
    if (!tabContainerRef.current || typeof window === 'undefined') return;

    const COMPACT_THRESHOLD = 550; // Switch to compact mode below 550px
    const MEDIUM_THRESHOLD = 700; // Switch to medium mode below 700px
    
    const checkWidth = () => {
      if (tabContainerRef.current) {
        const width = tabContainerRef.current.offsetWidth;
        setIsDynamicallyCompact(width < COMPACT_THRESHOLD);
        
        // Set layout mode for content
        if (width < COMPACT_THRESHOLD) {
          setLayoutMode('compact');
        } else if (width < MEDIUM_THRESHOLD) {
          setLayoutMode('medium');
        } else {
          setLayoutMode('large');
        }
      }
    };

    // Initial check
    checkWidth();

    // Set up ResizeObserver
    const resizeObserver = new ResizeObserver(() => {
      checkWidth();
    });

    resizeObserver.observe(tabContainerRef.current);

    // Also listen to window resize for viewport changes
    window.addEventListener('resize', checkWidth);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', checkWidth);
    };
  }, []);

  // Build validation issues same way as MatchingTab does
  const validationIssues = React.useMemo(() => {
    const issues: any[] = [];
    const approvalLimit = 2500; // Default approval limit
    
    // Check vendor verification status (must match MatchingTab logic)
    if (invoiceData?.vendor_is_verified === false) {
      issues.push({ severity: 'error', type: 'vendor_verification' });
    }
    
    // Add approval limit check - but only for invoices that aren't already approved/paid
    const approvedStatuses = ['approved', 'paid', 'completed', 'closed', 'ready_for_payment', 'approved_ready_for_payment'];
    const isAlreadyApproved = invoiceData?.status && approvedStatuses.includes(invoiceData.status.toLowerCase());
    
    if (invoiceData?.total && invoiceData.total > approvalLimit && !isAlreadyApproved) {
      issues.push({ severity: 'error', type: 'approval' });
    }
    
    // Check for uninvoiced PO lines
    if (poComparisonData?.unmatchedPoLines && poComparisonData.unmatchedPoLines.length > 0) {
      // Count once for all uninvoiced lines (not per line)
      issues.push({ severity: 'error', type: 'uninvoiced' });
    }
    
    // Count match results that are actual issues (avoid duplicates)
    const processedLines = new Set<string>(); // Track processed lines
    let hasHeaderVariance = false;
    let lineVarianceCount = 0;
    
    matchResults?.forEach((r: any) => {
      // Skip header-level TOTAL_VARIANCE_EXCEEDED if we have line-level issues
      if (r.explanation_code === 'TOTAL_VARIANCE_EXCEEDED' && !r.invoice_line_id) {
        hasHeaderVariance = true;
        return; // We'll add this later only if no line issues
      }
      
      // Count line variances only once per line
      if (r.invoice_line_id && !r.within_tolerance && !processedLines.has(r.invoice_line_id)) {
        processedLines.add(r.invoice_line_id);
        lineVarianceCount++;
        issues.push({ severity: 'error', type: 'variance' });
      }
      
      // Count specific error codes (but avoid duplicates)
      if (r.explanation_code === 'NO_PO') {
        issues.push({ severity: 'error', type: 'no_po' });
      }
    });
    
    // Only add header variance if there are no line-level variances
    if (hasHeaderVariance && lineVarianceCount === 0) {
      issues.push({ severity: 'error', type: 'header_variance' });
    }
    
    // Get validation errors from invoice data
    if (invoiceData) {
      const validator = new InvoiceValidator(invoiceData);
      const validationResults = validator.validate();

      // Add validation errors with their actual severity
      validationResults.errors.forEach(err => {
        issues.push({ severity: err.severity || 'error' });
      });
      validationResults.warnings.forEach(warn => {
        issues.push({ severity: warn.severity || 'warning' });
      });
    }

    // Add database validation warnings/errors (like bank details changes)
    if (invoiceData?.validation_warnings && Array.isArray(invoiceData.validation_warnings)) {
      invoiceData.validation_warnings.forEach((warning: any) => {
        issues.push({ severity: warning.severity || 'warning', type: 'database_validation' });
      });
    }

    return issues;
  }, [matchResults, invoiceData, poComparisonData]);
  
  // Count only error-severity issues (matching what MatchingTab shows)
  const totalIssuesCount = validationIssues.filter(i => i.severity === 'error').length;

  // Check if in needs info mode
  const isNeedsInfo = invoiceData?.status === 'needs_info' || invoiceData?.status === 'needs-info';

  const allTabs = [
    {
      id: 'details' as TabId,
      label: 'Details',
      icon: FileText,
    },
    {
      id: 'line-items' as TabId,
      label: 'Items',
      icon: Package,
      count: invoiceData?.lines?.length,
    },
    {
      id: 'matching' as TabId,
      label: 'Exceptions',
      icon: totalIssuesCount > 0 ? AlertTriangle : CheckCircle,
      matchingCount: totalIssuesCount,
      hasIssues: totalIssuesCount > 0,
    },
    {
      id: 'attachments' as TabId,
      label: 'Attachments',
      icon: Paperclip,
      count: attachments?.length,
    },
    {
      id: 'activity' as TabId,
      label: 'Activity',
      icon: Clock,
    },
  ];

  // Filter tabs based on mode
  const tabs = isNeedsInfo
    ? allTabs.filter(tab => tab.id !== 'matching' && tab.id !== 'line-items') // Hide Exceptions and Line Items tabs in needs info mode
    : allTabs;

  const renderTabButton = (tab: any) => {
    const tabContent = (
      <button
        key={tab.id}
        onClick={() => setActiveTab(tab.id)}
        className={`
          group relative flex-1 h-full px-3 text-center text-sm font-medium flex items-center justify-center
          transition-colors focus:z-10
          ${tab.id === 'matching' && tab.hasIssues
            ? 'text-red-700 hover:text-red-700'
            : activeTab === tab.id
            ? 'text-purple-900 bg-white'
            : 'text-gray-700 hover:text-gray-900'
          }
        `}
      >
        <div className={`relative flex items-center justify-center ${shouldBeCompact ? 'gap-1.5' : 'gap-2'}`}>
          <tab.icon className={`h-4 w-4 flex-shrink-0 ${
            tab.id === 'matching' && tab.hasIssues 
              ? 'text-red-700' 
              : activeTab === tab.id 
              ? 'text-purple-900' 
              : 'text-gray-700'
          }`} />
          {!shouldBeCompact && <span className="whitespace-nowrap">{tab.label}</span>}
          
          {/* Special handling for Matching tab */}
          {tab.id === 'matching' && (
            tab.hasIssues ? (
              <span className={`
                inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-medium rounded-full min-w-[20px] flex-shrink-0
                ${activeTab === tab.id
                  ? 'bg-red-100 text-red-800'
                  : 'bg-red-50 text-red-700'
                }
              `}>
                {tab.matchingCount}
              </span>
            ) : (
              <span className={`
                inline-flex items-center justify-center p-0.5 rounded-full flex-shrink-0
                ${activeTab === tab.id
                  ? 'bg-green-100 text-green-800'
                  : 'bg-green-50 text-green-700'
                }
              `}>
                <Check className="h-3 w-3" />
              </span>
            )
          )}
          
          {/* Regular count badges for other tabs */}
          {tab.id !== 'matching' && tab.count !== undefined && tab.count > 0 && (
            <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-medium rounded-full min-w-[20px] bg-purple-100 text-purple-900 flex-shrink-0">
              {tab.count}
            </span>
          )}
        </div>
        {activeTab === tab.id && (
          <span
            className={`absolute inset-x-0 bottom-0 h-0.5 z-10 ${
              tab.id === 'matching' && tab.hasIssues ? 'bg-red-700' : 'bg-purple-900'
            }`}
            aria-hidden="true"
          />
        )}
      </button>
    );

    if (shouldBeCompact) {
      return (
        <Tooltip.Root key={tab.id}>
          <Tooltip.Trigger asChild>
            {tabContent}
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content
              className="z-50 overflow-hidden rounded-md bg-gray-900 px-3 py-1.5 text-xs text-white shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
              sideOffset={5}
            >
              {tab.label}
              <Tooltip.Arrow className="fill-gray-900" />
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      );
    }

    return tabContent;
  };

  return (
    <Tooltip.Provider>
      <div className="flex flex-col h-full w-full bg-white overflow-hidden">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 flex-shrink-0 h-[45px]" ref={tabContainerRef}>
          <nav className="flex items-center h-full relative" aria-label="Tabs">
            {tabs.map((tab) => renderTabButton(tab))}
          </nav>
        </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'details' && (
          <DetailsTab
            invoiceData={invoiceData}
            onUpdate={onDataUpdate}
            layoutMode={layoutMode}
            forceEditMode={forceEditMode}
            forceReadOnly={forceReadOnly}
            hideFloatingSaveButton={forceEditMode}
            hideAccountingSection={forceEditMode}
            hidePaymentSection={forceEditMode}
          />
        )}
        {activeTab === 'line-items' && (
          <div className="p-4">
            <LineItemsPreviewPanel
              invoiceLines={invoiceData?.lines || invoiceData?.invoice_lines || []}
              poLines={poComparisonData?.poData?.po_lines || []}
              currency={invoiceData?.currency || 'USD'}
              matchResults={matchResults || []}
              onLinesUpdate={(lines: any[]) => {
                onDataUpdate?.({
                  ...invoiceData,
                  lines,
                  invoice_lines: lines
                });
              }}
              showComparison={!hideComparison && poComparisonData?.poData?.po_lines?.length > 0}
              startExpanded={true}
            />
          </div>
        )}
        {activeTab === 'matching' && (
          <MatchingTab
            invoiceId={invoiceId}
            matchResults={matchResults || []}
            lines={invoiceData?.lines || []}
            invoiceData={invoiceData}
            approvalLimit={2500}
            poComparisonData={poComparisonData}
          />
        )}
        {activeTab === 'attachments' && (
          <AttachmentsTab
            invoiceId={invoiceId}
            attachments={attachments || []}
            layoutMode={layoutMode}
          />
        )}
        {activeTab === 'activity' && (
          <ActivityTab
            invoiceId={invoiceId}
          />
        )}
      </div>
    </div>
    </Tooltip.Provider>
  );
}