'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import InvoiceDetailLayout from '@/app/components/InvoiceDetailLayout';
import { ViewModeSwitcher, ViewMode } from '@/app/components/invoices/ViewModeSwitcher';
import { InvoiceDetailClient } from './InvoiceDetailClient';

interface InvoicePageWrapperProps {
  invoiceId: string;
  initialInvoice: any;
  invoiceNumber: string;
}

export function InvoicePageWrapper({ invoiceId, initialInvoice, invoiceNumber }: InvoicePageWrapperProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [viewMode, setViewMode] = useState<ViewMode>('review');
  const [hasGR, setHasGR] = useState(false);
  const [hasSES, setHasSES] = useState(false);
  const [hasPO, setHasPO] = useState(false);
  const [assignedUserName, setAssignedUserName] = useState<string | null>(
    initialInvoice.assigned_to_name || 'Sarah Johnson'
  );

  // Reactive invoice number state (updates when teaching accepts new value)
  const [reactiveInvoiceNumber, setReactiveInvoiceNumber] = useState<string>(
    initialInvoice.invoice_number || invoiceNumber
  );

  // Reactive status state (updates when validation completes)
  const [reactiveStatus, setReactiveStatus] = useState<string>(
    initialInvoice.status || 'draft'
  );

  // Navigation context from URL params
  const invoiceListParam = searchParams.get('list');
  const indexParam = searchParams.get('index');
  const invoiceList = invoiceListParam ? JSON.parse(decodeURIComponent(invoiceListParam)) : [];
  const currentIndex = indexParam ? parseInt(indexParam) : -1;
  const hasListContext = invoiceList.length > 0 && currentIndex >= 0;

  // Navigation state
  const hasPrevious = hasListContext && currentIndex > 0;
  const hasNext = hasListContext && currentIndex < invoiceList.length - 1;

  // Navigation functions
  const navigateToPrevious = () => {
    if (hasPrevious) {
      const prevId = invoiceList[currentIndex - 1];
      const listParam = encodeURIComponent(JSON.stringify(invoiceList));
      router.push(`/invoices/${prevId}?list=${listParam}&index=${currentIndex - 1}`);
    }
  };

  const navigateToNext = () => {
    if (hasNext) {
      const nextId = invoiceList[currentIndex + 1];
      const listParam = encodeURIComponent(JSON.stringify(invoiceList));
      router.push(`/invoices/${nextId}?list=${listParam}&index=${currentIndex + 1}`);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in input/textarea/select
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if ((e.key === 'ArrowLeft' || e.key === 'j' || e.key === 'J') && hasPrevious) {
        e.preventDefault();
        navigateToPrevious();
      } else if ((e.key === 'ArrowRight' || e.key === 'k' || e.key === 'K') && hasNext) {
        e.preventDefault();
        navigateToNext();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentIndex, invoiceList, hasPrevious, hasNext]);

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

  // Handle status updates (from successful validation)
  const handleStatusUpdate = (newStatus: string) => {
    setReactiveStatus(newStatus);
  };


  // ViewModeSwitcher hidden for unified layout - will be removed in future phase
  const viewModeSwitcher = undefined;

  // Build navigation context (only if we have list context from URL)
  const navigationContext = hasListContext
    ? {
        current: currentIndex + 1, // Display as 1-indexed
        total: invoiceList.length,
        onPrevious: navigateToPrevious,
        onNext: navigateToNext,
        hasPrevious,
        hasNext,
      }
    : undefined;

  return (
    <InvoiceDetailLayout
      invoiceNumber={reactiveInvoiceNumber}
      vendorName={initialInvoice.vendor_name_snapshot}
      viewModeSwitcher={viewModeSwitcher}
      workflowStatus={reactiveStatus}
      isNeedsInfo={isNeedsInfoMode}
      assignedUserName={assignedUserName}
      onAssignUser={handleAssignUser}
      navigationContext={navigationContext}
      invoiceStatus={reactiveStatus}
      poNumbersCached={initialInvoice.po_numbers_cached}
      vendorRequiresPo={initialInvoice.vendor_requires_po}
      invoiceType={initialInvoice.type}
    >
      <InvoiceDetailClientWithViewMode
        invoiceId={invoiceId}
        initialInvoice={initialInvoice}
        viewMode={viewMode}
        onInvoiceNumberUpdate={handleInvoiceNumberUpdate}
        onStatusUpdate={handleStatusUpdate}
        workflowStatus={reactiveStatus}
        assignedUserName={assignedUserName}
        onAssignUser={handleAssignUser}
      />
    </InvoiceDetailLayout>
  );
}

// Export a modified version that accepts viewMode as prop
export function InvoiceDetailClientWithViewMode({
  invoiceId,
  initialInvoice,
  viewMode,
  onInvoiceNumberUpdate,
  onStatusUpdate,
  workflowStatus,
  assignedUserName,
  onAssignUser,
}: {
  invoiceId: string;
  initialInvoice: any;
  viewMode: ViewMode;
  onInvoiceNumberUpdate?: (invoiceNumber: string) => void;
  onStatusUpdate?: (status: string) => void;
  workflowStatus?: string;
  assignedUserName?: string | null;
  onAssignUser?: (userName: string | null) => void;
}) {
  return (
    <InvoiceDetailClient
      invoiceId={invoiceId}
      initialInvoice={initialInvoice}
      viewMode={viewMode}
      onInvoiceNumberUpdate={onInvoiceNumberUpdate}
      onStatusUpdate={onStatusUpdate}
      workflowStatus={workflowStatus}
      assignedUserName={assignedUserName}
      onAssignUser={onAssignUser}
    />
  );
}