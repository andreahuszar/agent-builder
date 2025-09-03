'use client';

import React, { useEffect, useState } from 'react';
import { DocumentPreview } from '@/app/components/invoices/DocumentPreview';
import { ResizablePanel, MultiResizablePanel } from '@/app/components/invoices/ResizablePanel';
import { ViewModeSwitcher, ViewMode } from '@/app/components/invoices/ViewModeSwitcher';
import { DiagnosticBanner } from '@/app/components/invoices/DiagnosticBanner';
import { InvoiceTabs } from '@/app/components/invoices/tabs/InvoiceTabs';
import { PODocumentTable } from '@/app/components/invoices/comparison/PODocumentTable';
import { GRDocumentTable } from '@/app/components/invoices/comparison/GRDocumentTable';
import { useSelection } from '@/app/context/SelectionContext';

interface InvoiceDetailClientProps {
  invoiceId: string;
  initialInvoice: any;
  viewMode?: ViewMode;
}

export function InvoiceDetailClient({ invoiceId, initialInvoice, viewMode = 'review' }: InvoiceDetailClientProps) {
  const [invoice, setInvoice] = useState(initialInvoice);
  const [matchResults, setMatchResults] = useState<any[]>([]);
  const [poComparisonData, setPoComparisonData] = useState<any>(null);
  const { selectedLineId, selectInvoiceLine } = useSelection();

  useEffect(() => {
    // Fetch match results and PO comparison data
    fetchMatchResults();
    fetchPoComparisonData();
  }, [invoiceId]);

  const fetchMatchResults = async () => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/match-results`);
      if (response.ok) {
        const data = await response.json();
        setMatchResults(data);
      }
    } catch (error) {
      console.error('Error fetching match results:', error);
    }
  };

  const fetchPoComparisonData = async () => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/po-comparison`);
      if (response.ok) {
        const data = await response.json();
        setPoComparisonData(data);
      }
    } catch (error) {
      console.error('Error fetching PO comparison data:', error);
    }
  };

  const handleRerunMatching = async () => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/rerun-matching`, {
        method: 'POST',
      });
      if (response.ok) {
        const data = await response.json();
        setMatchResults(data.matchResults || []);
        setInvoice({ ...invoice, match_status: data.matchStatus });
      }
    } catch (error) {
      console.error('Error rerunning matching:', error);
    }
  };

  const handleInvoiceUpdate = (updatedData: any) => {
    setInvoice(updatedData);
  };

  const hasPO = invoice.po_numbers_cached && invoice.po_numbers_cached.length > 0;
  const hasGR = matchResults.some((mr: any) => mr.matched_gr_line_id);
  const hasSES = matchResults.some((mr: any) => mr.matched_ses_line_id);
  
  // Calculate invoice total from line items for accuracy
  const invoiceTotal = invoice.lines?.reduce((sum: number, line: any) => 
    sum + (line.line_total || 0), 0) || 0;
  
  // Calculate variance for diagnostic banner using line-calculated total
  const poTotal = poComparisonData?.poData?.po_lines?.reduce((sum: number, line: any) => 
    sum + (line.qty_ordered * line.unit_price), 0) || 0;
  const varianceAmount = poComparisonData?.poData ? invoiceTotal - poTotal : null;

  const renderContent = () => {
    if (viewMode === 'review') {
      return (
        <ResizablePanel
          defaultSizes={[40, 60]}
          minSizes={[30, 30]}
          storageKey={`invoice-${invoiceId}`}
          className="h-full"
        >
          {/* Document Preview */}
          <DocumentPreview 
            invoiceId={invoiceId} 
            hasAttachment={!!invoice.attachment}
          />
          
          {/* Tabs */}
          <InvoiceTabs
            invoiceId={invoiceId}
            invoiceData={invoice}
            matchResults={matchResults}
            attachments={invoice.attachment ? [invoice.attachment] : []}
            selectedLineId={selectedLineId}
            onLineSelect={selectInvoiceLine}
            onDataUpdate={handleInvoiceUpdate}
            storageKey={`invoice-${invoiceId}`}
            poComparisonData={poComparisonData}
          />
        </ResizablePanel>
      );
    } else if (viewMode === '2-up') {
      return (
        <ResizablePanel
          defaultSizes={[35, 65]}
          minSizes={[25, 35]}
          storageKey={`invoice-2up-${invoiceId}`}
          className="h-full"
        >
          {/* Document Preview */}
          <DocumentPreview 
            invoiceId={invoiceId} 
            hasAttachment={!!invoice.attachment}
          />
          
          {/* PO and Invoice Side by Side */}
          <ResizablePanel
            defaultSizes={[40, 60]}
            minSizes={[30, 35]}
            storageKey={`invoice-2up-inner-${invoiceId}`}
            className="h-full"
          >
            <PODocumentTable
              poNumber={invoice.po_numbers_cached?.[0]}
              selectedLineId={selectedLineId}
              onLineSelect={selectInvoiceLine}
            />
            
            <InvoiceTabs
              invoiceId={invoiceId}
              invoiceData={invoice}
              matchResults={matchResults}
              attachments={invoice.attachment ? [invoice.attachment] : []}
              selectedLineId={selectedLineId}
              onLineSelect={selectInvoiceLine}
              onDataUpdate={handleInvoiceUpdate}
              storageKey={`invoice-${invoiceId}`}
              compactMode={true}
            />
          </ResizablePanel>
        </ResizablePanel>
      );
    } else {
      // 3-up mode with vertical stacking for comparison docs
      return (
        <MultiResizablePanel
          defaultSizes={[30, 35, 35]}
          minSizes={[25, 30, 35]}
          storageKey={`invoice-3up-${invoiceId}`}
          className="h-full"
        >
          {/* Document Preview */}
          <div className="h-full w-full flex flex-col">
            <DocumentPreview 
              invoiceId={invoiceId} 
              hasAttachment={!!invoice.attachment}
            />
          </div>
          
          {/* Middle Panel: PO and GR/SES Stacked Vertically */}
          <div className="h-full w-full flex flex-col">
            <ResizablePanel
              defaultSizes={[50, 50]}
              minSizes={[40, 40]}
              direction="vertical"
              storageKey={`invoice-3up-vertical-${invoiceId}`}
              className="h-full w-full"
            >
              {/* PO Table */}
              <PODocumentTable
                poNumber={invoice.po_numbers_cached?.[0]}
                selectedLineId={selectedLineId}
                onLineSelect={selectInvoiceLine}
              />
              
              {/* GR/SES Table */}
              <GRDocumentTable
                poId={invoice.po_id}
                documentType={hasGR ? 'GR' : 'SES'}
                selectedLineId={selectedLineId}
                onLineSelect={selectInvoiceLine}
              />
            </ResizablePanel>
          </div>
          
          {/* Invoice Tabs */}
          <div className="h-full w-full flex flex-col">
            <InvoiceTabs
              invoiceId={invoiceId}
              invoiceData={invoice}
              matchResults={matchResults}
              attachments={invoice.attachment ? [invoice.attachment] : []}
              selectedLineId={selectedLineId}
              onLineSelect={selectInvoiceLine}
              onDataUpdate={handleInvoiceUpdate}
              storageKey={`invoice-${invoiceId}`}
              compactMode={true}
            />
          </div>
        </MultiResizablePanel>
      );
    }
  };

  // Get the first PO number if available
  const poNumber = invoice.po_numbers_cached && invoice.po_numbers_cached.length > 0 
    ? invoice.po_numbers_cached[0] 
    : null;

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Diagnostic Banner */}
      <DiagnosticBanner
        total={invoiceTotal}
        currency={invoice.currency}
        poNumber={poNumber}
        matchStatus={invoice.match_status}
        matchResults={matchResults}
        hasGR={hasGR}
        hasSES={hasSES}
        varianceAmount={varianceAmount}
        poTotal={poTotal || null}
        helpdeskTicketRef={invoice.helpdesk_ticket_ref}
      />
      
      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        {renderContent()}
      </div>
    </div>
  );
}