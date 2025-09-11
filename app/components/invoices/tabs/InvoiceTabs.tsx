'use client';

import React, { useState, useEffect } from 'react';
import { FileText, Package, GitCompare, Paperclip, Clock, Check, AlertTriangle, CheckCircle, List } from 'lucide-react';
import * as Tooltip from '@radix-ui/react-tooltip';
import { DetailsTab } from './DetailsTab';
import { LineItemsTab } from './LineItemsTab';
import { EnhancedLineItemsTabV2 } from './EnhancedLineItemsTabV2';
import { MatchingTab } from './MatchingTab';
import { AttachmentsTab } from './AttachmentsTab';
import { ActivityTab } from './ActivityTab';
import { InvoiceValidator } from '@/app/utils/validationService';

export type TabId = 'details' | 'line-items' | 'matching' | 'attachments' | 'activity';

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
}: InvoiceTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('details');
  const [isClient, setIsClient] = useState(false);

  // Load from localStorage after mount to avoid hydration mismatch
  useEffect(() => {
    setIsClient(true);
    if (storageKey && typeof window !== 'undefined') {
      const stored = localStorage.getItem(`active-tab-${storageKey}`);
      if (stored && ['details', 'line-items', 'matching', 'attachments', 'activity'].includes(stored)) {
        setActiveTab(stored as TabId);
      }
    }
  }, [storageKey]);

  // Save to localStorage when tab changes
  useEffect(() => {
    if (isClient && storageKey && typeof window !== 'undefined') {
      localStorage.setItem(`active-tab-${storageKey}`, activeTab);
    }
  }, [activeTab, storageKey, isClient]);

  // Build validation issues same way as MatchingTab does
  const validationIssues = React.useMemo(() => {
    const issues: any[] = [];
    const approvalLimit = 2500; // Default approval limit
    
    // Check vendor verification status (must match MatchingTab logic)
    if (invoiceData?.vendor_is_verified === false) {
      issues.push({ severity: 'error', type: 'vendor_verification' });
    }
    
    // Add approval limit check - but only for invoices that aren't already approved/paid
    const approvedStatuses = ['approved', 'paid', 'completed', 'closed', 'ready_for_payment'];
    const isAlreadyApproved = invoiceData?.status && approvedStatuses.includes(invoiceData.status.toLowerCase());
    
    if (invoiceData?.total && invoiceData.total > approvalLimit && !isAlreadyApproved) {
      issues.push({ severity: 'error', type: 'approval' });
    }
    
    // Check for uninvoiced PO lines
    if (poComparisonData?.unmatchedPoLines && poComparisonData.unmatchedPoLines.length > 0) {
      poComparisonData.unmatchedPoLines.forEach((item: any) => {
        issues.push({ severity: 'error', type: 'uninvoiced' });
      });
    }
    
    // Count match results that are actual issues
    matchResults?.forEach((r: any) => {
      // Count variances that are not within tolerance
      if (!r.within_tolerance) {
        issues.push({ severity: 'error' });
      }
      // Count specific error codes
      if (r.explanation_code === 'NO_PO') {
        issues.push({ severity: 'error' });
      }
      if (r.explanation_code === 'OVER_TOLERANCE' && !r.within_tolerance) {
        issues.push({ severity: 'error' });
      }
    });
    
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
    
    return issues;
  }, [matchResults, invoiceData, poComparisonData]);
  
  // Count only error-severity issues (matching what MatchingTab shows)
  const totalIssuesCount = validationIssues.filter(i => i.severity === 'error').length;
  
  const tabs = [
    {
      id: 'details' as TabId,
      label: 'Details',
      icon: FileText,
    },
    {
      id: 'line-items' as TabId,
      label: 'Line Items',
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

  const renderTabButton = (tab: any) => {
    const tabContent = (
      <button
        key={tab.id}
        onClick={() => setActiveTab(tab.id)}
        className={`
          group relative min-w-0 flex-1 py-3 px-4 text-center text-sm font-medium 
          transition-colors focus:z-10
          ${tab.id === 'matching' && tab.hasIssues
            ? 'text-red-700 hover:text-red-700'
            : activeTab === tab.id
            ? 'text-purple-900 bg-white'
            : 'text-gray-700 hover:text-gray-900'
          }
        `}
      >
        {/* Hover background - positioned behind content but above base */}
        <span className={`absolute inset-0 transition-colors ${
          tab.id === 'matching' && tab.hasIssues
            ? 'hover:bg-red-50'
            : 'hover:bg-gray-50'
        }`} />
        <div className={`relative flex items-center justify-center ${compactMode ? 'gap-1.5' : 'gap-2'}`}>
          <tab.icon className={`h-4 w-4 ${
            tab.id === 'matching' && tab.hasIssues 
              ? 'text-red-700' 
              : activeTab === tab.id 
              ? 'text-purple-900' 
              : 'text-gray-700'
          }`} />
          {!compactMode && <span>{tab.label}</span>}
          
          {/* Special handling for Matching tab */}
          {tab.id === 'matching' && (
            tab.hasIssues ? (
              <span className={`
                inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-medium rounded-full min-w-[20px]
                ${activeTab === tab.id
                  ? 'bg-red-100 text-red-800'
                  : 'bg-red-50 text-red-700'
                }
              `}>
                {tab.matchingCount}
              </span>
            ) : (
              <span className={`
                inline-flex items-center justify-center p-0.5 rounded-full
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
            <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-medium rounded-full min-w-[20px] bg-purple-100 text-purple-900">
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

    if (compactMode) {
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
        <div className="border-b border-gray-200 flex-shrink-0">
          <nav className="flex -mb-px" aria-label="Tabs">
            {tabs.map((tab) => renderTabButton(tab))}
          </nav>
        </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'details' && (
          <DetailsTab
            invoiceData={invoiceData}
            onUpdate={onDataUpdate}
          />
        )}
        {activeTab === 'line-items' && (
          <EnhancedLineItemsTabV2
            invoiceId={invoiceId}
            lines={invoiceData?.lines || []}
            currency={invoiceData?.currency || 'USD'}
            matchResults={matchResults}
            selectedLineId={selectedLineId}
            onLineSelect={onLineSelect}
            onLinesUpdate={(lines) => onDataUpdate?.({ ...invoiceData, lines })}
            poComparisonData={poComparisonData}
            invoiceSubtotal={invoiceData?.subtotal}
            invoiceTaxTotal={invoiceData?.tax_total}
            invoiceTaxRate={invoiceData?.tax_rate_percent}
            invoiceShippingTotal={invoiceData?.shipping_total}
            invoiceDiscountTotal={invoiceData?.discount_total}
            invoiceTotal={invoiceData?.total}
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