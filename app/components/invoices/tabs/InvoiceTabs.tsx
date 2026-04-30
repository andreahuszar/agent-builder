'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FileText, Package, GitCompare, Paperclip, Clock, Check, AlertTriangle, CheckCircle, List, MessageSquare, Eye, FileType, Image } from 'lucide-react';
import * as Tooltip from '@radix-ui/react-tooltip';
import { DetailsTab } from './DetailsTab';
import { LineItemsTab } from './LineItemsTab';
import { LineItemsPreviewPanel } from '../preview/LineItemsPreviewPanel';
import { MatchingTab } from './MatchingTab';
import { AttachmentsTab } from './AttachmentsTab';
import { UnifiedActivityTab } from './UnifiedActivityTab';
// import { ActivityTab } from './ActivityTab'; // deprecated - merged into UnifiedActivityTab
// import { CommunicationTab } from './CommunicationTab'; // deprecated - merged into UnifiedActivityTab
import { PreviewTab } from './PreviewTab';
import { InvoiceValidator } from '@/app/utils/validationService';
import { calculateInvoiceExceptions } from '@/app/utils/exceptionCounter';

export type TabId = 'preview' | 'details' | 'line-items' | 'matching' | 'attachments' | 'comments';
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
  hideAttachments?: boolean;
  hidePreview?: boolean;
  hideExceptions?: boolean;
  showCommunication?: boolean;
  showFieldErrors?: boolean;
  initialTab?: TabId;
  // Controlled tab state (optional - for parent to manage tab state)
  activeTab?: TabId;
  onTabChange?: (tab: TabId) => void;
  // Edit mode callback
  onEditModeChange?: (isEditing: boolean) => void;
  // Field candidate handlers for AI suggestions
  onFieldAccept?: (fieldName: string, value: string) => void;
  onFieldReject?: (fieldName: string) => void;
  onFieldFocus?: (fieldName: string | null) => void;
  onStartTeaching?: (fieldName: string) => void;
  // Agent-pending fields (accepted but not yet saved)
  agentPendingFields?: {[key: string]: any};
  // Line items error count (for variance highlighting)
  lineItemsErrorCount?: number;
  // Auto-reprocess state for Customer ID field
  isReprocessingField?: string | null;
  onFieldAutoReprocess?: (field: string) => void;
  // Line item suggestion acceptance (persists across tab switches)
  acceptedLineSuggestions?: Set<string>;
  onAcceptLineSuggestion?: (lineId: string) => void;
  // Status update callback (for updating workflow stepper when all matched)
  onStatusUpdate?: (status: string) => void;
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
  hideAttachments = false,
  hidePreview = false,
  hideExceptions = false,
  showCommunication = false,
  showFieldErrors = false,
  initialTab,
  activeTab: controlledActiveTab,
  onTabChange,
  onEditModeChange,
  onFieldAccept,
  onFieldReject,
  onFieldFocus,
  onStartTeaching,
  agentPendingFields = {},
  lineItemsErrorCount = 0,
  isReprocessingField = null,
  onFieldAutoReprocess,
  acceptedLineSuggestions = new Set(),
  onAcceptLineSuggestion,
  onStatusUpdate,
}: InvoiceTabsProps) {
  // Determine initial tab based on invoice status
  const getInitialTab = (): TabId => {
    return initialTab || 'details';
  };

  // Use controlled state if provided, otherwise use internal state
  const [internalActiveTab, setInternalActiveTab] = useState<TabId>(getInitialTab());
  const activeTab = controlledActiveTab !== undefined ? controlledActiveTab : internalActiveTab;

  const setActiveTab = (tab: TabId) => {
    if (onTabChange) {
      // Controlled mode: notify parent
      onTabChange(tab);
    } else {
      // Uncontrolled mode: manage internal state
      setInternalActiveTab(tab);
    }
  };
  const [isClient, setIsClient] = useState(false);
  const [isDynamicallyCompact, setIsDynamicallyCompact] = useState(true); // Start minimized
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('compact'); // Start in compact mode
  const [commentsCount, setCommentsCount] = useState(2); // Initialize with expected mock count (2 real user comments)
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

  // Use shared exception counter (with accepted suggestions to filter resolved variances)
  const exceptionResult = React.useMemo(() =>
    calculateInvoiceExceptions(invoiceData, matchResults, poComparisonData, 2500, acceptedLineSuggestions),
    [matchResults, invoiceData, poComparisonData, acceptedLineSuggestions]
  );

  // Count ALL exceptions for badge; respects per-invoice override for demo data
  const totalIssuesCount = (invoiceData as any)?.exceptions_count_override ?? exceptionResult.counts.materialTotal;

  // Calculate missing/invalid fields count for Details tab
  // This MUST match the exact logic in InvoiceDetailClient calculateMissingFieldsCount
  const fieldErrorsCount = React.useMemo(() => {
    let count = 0;
    const requiredFields = [
      'invoice_number',
      'invoice_date',
      'vendor_name_snapshot',
      'vendor_tax_id_snapshot',
      'currency',
      'job_number'
    ];

    requiredFields.forEach(field => {
      // Skip job_number for Non-PO invoices
      if (field === 'job_number' && invoiceData?.type === 'Non-PO') {
        return;
      }

      const value = invoiceData?.[field];
      // Check for falsy values, empty strings, and special placeholder values
      if (!value || value === '' || value === 'Unknown Vendor' || value === 'Invalid Date') {
        count++;
      }
    });

    // Check PO number if vendor requires PO (but not for Non-PO invoices)
    if (invoiceData?.type !== 'Non-PO' && invoiceData?.vendor_requires_po && (!invoiceData?.po_numbers_cached || invoiceData.po_numbers_cached.length === 0)) {
      count++;
    }

    return count;
  }, [invoiceData]);

  const allTabs = [
    {
      id: 'preview' as TabId,
      label: 'Preview',
      icon: Image,
    },
    {
      id: 'details' as TabId,
      label: 'Details',
      icon: FileText,
      fieldErrorsCount: fieldErrorsCount,
      hasFieldErrors: fieldErrorsCount > 0,
    },
    {
      id: 'line-items' as TabId,
      label: 'Line Items',
      icon: Package,
      count: invoiceData?.lines?.length,
      hasLineItemsError: lineItemsErrorCount > 0,
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
      count: attachments?.length || 1, // Show 1 for mock invoice PDF when no attachments
    },
    {
      id: 'comments' as TabId,
      label: 'Activity',
      icon: MessageSquare,
      count: commentsCount,
    },
  ];

  // Filter tabs based on mode
  const tabs = allTabs.filter(tab => {
    // Hide preview tab if hidePreview prop is true (for full invoice page)
    if (tab.id === 'preview' && hidePreview) {
      return false;
    }
    // TEMPORARILY HIDDEN: Line Items tab (functionality moved to Details tab accordion)
    // TODO: Re-enable when needed by removing this condition
    if (tab.id === 'line-items') {
      return false;
    }
    // TEMPORARILY HIDDEN: Exceptions tab (functionality moved to Details tab accordion)
    // TODO: Re-enable when needed by removing this condition
    if (tab.id === 'matching') {
      return false;
    }
    // Hide exceptions tab if hideExceptions prop is true (for quick view)
    // if (tab.id === 'matching' && hideExceptions) {
    //   return false;
    // }
    // Hide attachments if hideAttachments prop is true
    if (tab.id === 'attachments' && hideAttachments) {
      return false;
    }
    // Comments tab is always shown (merged Activity + Communication)
    return true;
  });

  const renderTabButton = (tab: any) => {
    const tabContent = (
      <button
        key={tab.id}
        onClick={() => setActiveTab(tab.id)}
        className={`
          group relative flex-1 h-full px-3 text-center text-xs font-medium flex items-center justify-center
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

          {/* Special handling for Details tab with field errors */}
          {tab.id === 'details' && tab.hasFieldErrors && (
            <span className={`
              inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-medium rounded-full min-w-[20px] flex-shrink-0
              ${activeTab === tab.id
                ? 'bg-red-100 text-red-800'
                : 'bg-red-50 text-red-700'
              }
            `}>
              {tab.fieldErrorsCount}
            </span>
          )}

          {/* Regular count badges for other tabs */}
          {tab.id !== 'matching' && tab.id !== 'details' && tab.count !== undefined && tab.count > 0 && (
            <span className={`inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-medium rounded-full min-w-[20px] flex-shrink-0 ${
              tab.id === 'line-items' && tab.hasLineItemsError
                ? activeTab === tab.id
                  ? 'bg-red-100 text-red-800'
                  : 'bg-red-50 text-red-700'
                : 'bg-purple-100 text-purple-900'
            }`}>
              {tab.count}
            </span>
          )}
        </div>
        {activeTab === tab.id && (
          <span
            className={`absolute inset-x-0 bottom-0 h-0.5 z-10 ${
              tab.id === 'matching' && tab.hasIssues
                ? 'bg-red-700'
                : 'bg-purple-900'
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
        {activeTab === 'preview' && (
          <PreviewTab
            invoiceId={invoiceId}
            invoiceData={invoiceData}
            matchResults={matchResults || []}
            poComparisonData={poComparisonData}
            attachments={attachments || []}
          />
        )}
        {activeTab === 'details' && (
          <DetailsTab
            invoiceData={{
              ...invoiceData,
              po_lines: poComparisonData?.poDataList
                ? poComparisonData.poDataList.flatMap(po => po.lines || po.po_lines || [])
                : poComparisonData?.poData?.po_lines || [],
              match_results: matchResults || []
            }}
            onUpdate={onDataUpdate}
            layoutMode={layoutMode}
            forceEditMode={forceEditMode}
            forceReadOnly={forceReadOnly}
            hideFloatingSaveButton={forceEditMode}
            hideAccountingSection={forceEditMode}
            hidePaymentSection={forceEditMode}
            hideDocumentLinksSection={true}
            showFieldErrors={showFieldErrors}
            onEditModeChange={onEditModeChange}
            onFieldAccept={onFieldAccept}
            onFieldReject={onFieldReject}
            onFieldFocus={onFieldFocus}
            onStartTeaching={onStartTeaching}
            agentPendingFields={agentPendingFields}
            isReprocessingField={isReprocessingField}
            onFieldAutoReprocess={onFieldAutoReprocess}
            matchResults={matchResults}
            approvalLimit={2500}
            poComparisonData={poComparisonData}
            onStatusUpdate={onStatusUpdate}
          />
        )}
        {activeTab === 'line-items' && (
          <LineItemsPreviewPanel
            invoiceLines={invoiceData?.lines || invoiceData?.invoice_lines || []}
            poLines={poComparisonData?.poDataList
              ? poComparisonData.poDataList.flatMap(po => po.lines || po.po_lines || [])
              : poComparisonData?.poData?.po_lines || []}
            poDataList={poComparisonData?.poDataList}
            utilization={poComparisonData?.utilization}
            currency={invoiceData?.currency || 'USD'}
            matchResults={matchResults || poComparisonData?.matchResults || []}
            onLinesUpdate={(lines: any[]) => {
              onDataUpdate?.({
                ...invoiceData,
                lines,
                invoice_lines: lines
              });
            }}
            showComparison={!hideComparison && (poComparisonData?.poData?.po_lines?.length > 0 || poComparisonData?.poDataList?.length > 0)}
            startExpanded={true}
            useDetailedVarianceColumns={true}
            acceptedSuggestions={acceptedLineSuggestions}
            onAcceptSuggestion={onAcceptLineSuggestion}
          />
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
        {activeTab === 'comments' && (
          <UnifiedActivityTab
            invoiceId={invoiceId}
            invoiceNumber={invoiceData?.invoice_number}
            onCommentsCountChange={setCommentsCount}
            invoiceData={invoiceData}
          />
        )}
      </div>
    </div>
    </Tooltip.Provider>
  );
}