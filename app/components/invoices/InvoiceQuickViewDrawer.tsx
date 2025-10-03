'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, FileText, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { InvoiceTabs } from './tabs/InvoiceTabs';

interface InvoiceQuickViewDrawerProps {
  invoiceId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function InvoiceQuickViewDrawer({ invoiceId, isOpen, onClose }: InvoiceQuickViewDrawerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [matchResults, setMatchResults] = useState<any[]>([]);
  const [poComparisonData, setPoComparisonData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Set mounted flag after hydration to avoid hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Load invoice data when drawer opens
  useEffect(() => {
    if (isOpen && invoiceId) {
      setIsLoading(true);
      fetchInvoiceData();
      // Trigger animation after brief delay
      setTimeout(() => setIsVisible(true), 10);
    }
  }, [isOpen, invoiceId]);

  // Handle ESC key to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const fetchInvoiceData = async () => {
    if (!invoiceId) return;

    try {
      // Fetch invoice details
      const invoiceResponse = await fetch(`/api/invoices/${invoiceId}`);
      if (invoiceResponse.ok) {
        const data = await invoiceResponse.json();
        setInvoiceData(data);
      }

      // Fetch match results (skip for needs info invoices)
      const matchResponse = await fetch(`/api/invoices/${invoiceId}/match-results`);
      if (matchResponse.ok) {
        const data = await matchResponse.json();
        setMatchResults(data);
      }

      // Fetch PO comparison data
      const poResponse = await fetch(`/api/invoices/${invoiceId}/po-comparison`);
      if (poResponse.ok) {
        const data = await poResponse.json();
        setPoComparisonData(data);
      }
    } catch (error) {
      console.error('Error fetching invoice data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
      // Clear data after animation completes
      setInvoiceData(null);
      setMatchResults([]);
      setPoComparisonData(null);
    }, 300);
  };

  const handleOpenFullDetails = () => {
    if (invoiceId) {
      handleClose();
      router.push(`/invoices/${invoiceId}`);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return formatter.format(amount);
  };

  const formatCompactCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}K`;
    }
    return `$${amount.toFixed(0)}`;
  };

  // Check if this is a needs-info invoice
  const isNeedsInfo = invoiceData?.status === 'needs_info' || invoiceData?.status === 'needs-info';

  const getPOStatus = () => {
    if (!invoiceData) return null;

    if (invoiceData.po_numbers_cached && invoiceData.po_numbers_cached.length > 0) {
      return { label: invoiceData.po_numbers_cached[0], type: 'success' };
    }

    if (invoiceData.vendor_requires_po === false) {
      return { label: 'Non-PO', type: 'neutral' };
    }

    return { label: 'PO Missing', type: 'error' };
  };

  const getReceiptStatus = () => {
    if (!invoiceData) return null;

    const hasGR = matchResults.some((mr: any) => mr.matched_gr_line_id);
    const hasSES = matchResults.some((mr: any) => mr.matched_ses_line_id);

    if (!hasGR && !hasSES) {
      return { label: 'No GR/SES', type: 'neutral' };
    }

    const hasPartialReceipt = matchResults.some((mr: any) =>
      mr.explanation_code === 'PARTIAL_RECEIPT' ||
      (mr.gr_qty_received && mr.po_qty_ordered && mr.gr_qty_received < mr.po_qty_ordered)
    );

    if (hasPartialReceipt) {
      const receiptType = hasGR ? 'GR' : 'SES';
      return { label: `Partial ${receiptType}`, type: 'warning' };
    }

    const receiptType = hasGR ? 'GR' : 'SES';
    return { label: `${receiptType} Complete`, type: 'success' };
  };

  const getVarianceInfo = () => {
    if (!invoiceData || !poComparisonData?.poData) return null;

    const poTotal = poComparisonData.poData.total ||
      poComparisonData.poData.po_lines?.reduce((sum: number, line: any) =>
        sum + (line.qty_ordered * line.unit_price), 0) || 0;

    const varianceAmount = invoiceData.total - poTotal;
    const percentage = Math.abs((varianceAmount / poTotal) * 100);

    return {
      percentage,
      isPerfectMatch: percentage === 0,
      isWithinTolerance: percentage <= 5,
    };
  };

  const calculateExceptionsCount = () => {
    if (!invoiceData) return 0;

    let count = 0;

    // Check match results for variances
    matchResults?.forEach((r: any) => {
      if (!r.within_tolerance && r.explanation_code !== 'PERFECT_MATCH') {
        count++;
      }
    });

    // Add validation warnings/errors
    if (invoiceData.validation_warnings && Array.isArray(invoiceData.validation_warnings)) {
      invoiceData.validation_warnings.forEach((warning: any) => {
        if (warning.severity === 'error') {
          count++;
        }
      });
    }

    // Check for vendor verification issues
    if (invoiceData.vendor_is_verified === false) {
      count++;
    }

    return count;
  };

  // Don't render until mounted to avoid hydration mismatch
  if (!isMounted) return null;

  // Don't render at all when closed to avoid blocking interactions
  if (!isOpen && !isVisible) return null;

  const poStatus = getPOStatus();
  const receiptStatus = getReceiptStatus();
  const varianceInfo = getVarianceInfo();
  const exceptionsCount = calculateExceptionsCount();

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-hidden pointer-events-none">
      {/* Drawer - no backdrop to allow clicking on table below */}
      <div
        className={`absolute right-0 top-0 h-full w-[550px] bg-white shadow-2xl transform transition-transform duration-300 ease-out pointer-events-auto ${
          isVisible ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="border-b border-gray-200 px-6 py-4 flex-shrink-0">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-purple-600" />
                <h2 className="text-lg font-semibold text-gray-950">Invoice Quick View</h2>
              </div>
              <button
                onClick={handleClose}
                className="rounded-lg p-1 hover:bg-gray-100 transition-colors"
                aria-label="Close drawer"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Diagnostic Pills */}
            {invoiceData && !isLoading && (
              <div className="flex items-center gap-2 flex-wrap">
                {/* Total Amount */}
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                  <span>Total</span>
                  <span className="font-bold">{formatCompactCurrency(invoiceData.total || 0)}</span>
                </div>

                {/* PO Status */}
                {poStatus && (
                  <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                    poStatus.type === 'success' ? 'bg-green-50 text-green-700' :
                    poStatus.type === 'error' ? 'bg-red-50 text-red-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    <span>{poStatus.label}</span>
                  </div>
                )}

                {/* Receipt Status */}
                {receiptStatus && (
                  <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                    receiptStatus.type === 'success' ? 'bg-green-50 text-green-700' :
                    receiptStatus.type === 'warning' ? 'bg-orange-50 text-orange-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    <span>{receiptStatus.label}</span>
                  </div>
                )}

                {/* Variance Indicator - Only for PO-based invoices */}
                {poStatus && poStatus.type === 'success' && varianceInfo && (
                  <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                    varianceInfo.isPerfectMatch || varianceInfo.isWithinTolerance
                      ? 'bg-green-50 text-green-700'
                      : 'bg-red-50 text-red-700'
                  }`}>
                    <span>
                      {varianceInfo.isPerfectMatch
                        ? 'Perfect Match'
                        : varianceInfo.isWithinTolerance
                          ? 'Within Tolerance'
                          : `${varianceInfo.percentage.toFixed(1)}% variance`}
                    </span>
                  </div>
                )}

                {/* Exceptions Count */}
                {exceptionsCount > 0 && (
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700">
                    <span>{exceptionsCount} Exception{exceptionsCount !== 1 ? 's' : ''}</span>
                  </div>
                )}

                {/* Helpdesk Ticket */}
                {invoiceData.helpdesk_ticket_ref && (
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                    <span>{invoiceData.helpdesk_ticket_ref}</span>
                  </div>
                )}

                {/* Open Full Details Button */}
                <button
                  onClick={handleOpenFullDetails}
                  className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-purple-900 text-white rounded-md hover:bg-purple-800 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Open Full Details</span>
                </button>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-3">
                  <div className="h-8 w-8 border-2 border-purple-900 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-gray-600">Loading invoice details...</p>
                </div>
              </div>
            ) : invoiceData ? (
              <InvoiceTabs
                invoiceId={invoiceId!}
                invoiceData={invoiceData}
                matchResults={matchResults}
                attachments={invoiceData.attachments || []}
                selectedLineId={null}
                onLineSelect={() => {}}
                storageKey={`invoice-quickview-${invoiceId}`}
                compactMode={true}
                poComparisonData={poComparisonData}
                forceReadOnly={true}
                hideComparison={true}
                hideAttachments={true}
                showCommunication={true}
                showFieldErrors={isNeedsInfo}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-gray-600">No invoice data available</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
