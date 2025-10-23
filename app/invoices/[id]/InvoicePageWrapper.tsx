'use client';

import React, { useState, useEffect } from 'react';
import InvoiceDetailLayout from '@/app/components/InvoiceDetailLayout';
import { ViewModeSwitcher, ViewMode } from '@/app/components/invoices/ViewModeSwitcher';
import { InvoiceDetailClient } from './InvoiceDetailClient';

interface InvoicePageWrapperProps {
  invoiceId: string;
  initialInvoice: any;
  invoiceNumber: string;
}

export function InvoicePageWrapper({ invoiceId, initialInvoice, invoiceNumber }: InvoicePageWrapperProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('review');
  const [hasGR, setHasGR] = useState(false);
  const [hasSES, setHasSES] = useState(false);
  const [hasPO, setHasPO] = useState(false);
  const [assignedUserName, setAssignedUserName] = useState<string | null>(
    initialInvoice.assigned_to_name || null
  );

  // Reactive invoice number state (updates when teaching accepts new value)
  const [reactiveInvoiceNumber, setReactiveInvoiceNumber] = useState<string>(
    initialInvoice.invoice_number || invoiceNumber
  );

  // Check for PO attachment
  useEffect(() => {
    // Check if there's a PO attached (either through po_id or po_numbers_cached)
    const poAttached = !!(initialInvoice?.po_id || (initialInvoice?.po_numbers_cached && initialInvoice.po_numbers_cached.length > 0));
    setHasPO(poAttached);
  }, [initialInvoice]);

  // Check for GR/SES data from match results
  useEffect(() => {
    const fetchMatchInfo = async () => {
      try {
        const response = await fetch(`/api/invoices/${invoiceId}/match-results`);
        if (response.ok) {
          const data = await response.json();
          setHasGR(data.some((mr: any) => mr.matched_gr_line_id));
          setHasSES(data.some((mr: any) => mr.matched_ses_line_id));
        }
      } catch (error) {
        console.error('Error fetching match info:', error);
      }
    };
    fetchMatchInfo();
  }, [invoiceId]);

  // Check if this is a needs info status invoice
  const isNeedsInfoMode = initialInvoice.status === 'needs_info' || initialInvoice.status === 'needs-info';

  // Handle user assignment changes
  const handleAssignUser = async (userName: string | null) => {
    setAssignedUserName(userName);

    // TODO: In a real implementation, you would make an API call here to update the assignment
    // For now, we just update the local state for demo purposes
    console.log(`Invoice ${invoiceId} assigned to: ${userName || 'Unassigned'}`);
  };

  // Handle invoice number updates (from teaching or manual edits)
  const handleInvoiceNumberUpdate = (newInvoiceNumber: string) => {
    setReactiveInvoiceNumber(newInvoiceNumber);
  };

  // ViewModeSwitcher hidden for unified layout - will be removed in future phase
  const viewModeSwitcher = undefined;

  return (
    <InvoiceDetailLayout
      invoiceNumber={reactiveInvoiceNumber}
      vendorName={initialInvoice.vendor_name_snapshot}
      viewModeSwitcher={viewModeSwitcher}
      workflowStatus={initialInvoice.status || 'draft'}
      isNeedsInfo={isNeedsInfoMode}
      assignedUserName={assignedUserName}
      onAssignUser={handleAssignUser}
    >
      <InvoiceDetailClientWithViewMode
        invoiceId={invoiceId}
        initialInvoice={initialInvoice}
        viewMode={viewMode}
        onInvoiceNumberUpdate={handleInvoiceNumberUpdate}
      />
    </InvoiceDetailLayout>
  );
}

// Export a modified version that accepts viewMode as prop
export function InvoiceDetailClientWithViewMode({
  invoiceId,
  initialInvoice,
  viewMode,
  onInvoiceNumberUpdate
}: {
  invoiceId: string;
  initialInvoice: any;
  viewMode: ViewMode;
  onInvoiceNumberUpdate?: (invoiceNumber: string) => void;
}) {
  return (
    <InvoiceDetailClient
      invoiceId={invoiceId}
      initialInvoice={initialInvoice}
      viewMode={viewMode}
      onInvoiceNumberUpdate={onInvoiceNumberUpdate}
    />
  );
}