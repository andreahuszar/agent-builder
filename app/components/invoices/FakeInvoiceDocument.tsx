'use client';

import React from 'react';
import { Building2, Mail, Phone, Globe, Calendar, FileText, DollarSign } from 'lucide-react';
import { formatVendorAddress, formatBillToAddress, formatAddressLines } from '@/app/lib/addressFormatter';
import { EditableField } from './EditableField';
import { getConfidenceColors } from '@/app/utils/confidenceColors';

interface FakeInvoiceDocumentProps {
  invoice: any;
  scale?: number;
  showOCRHighlights?: boolean;
  onFieldAccept?: (fieldName: string, value: string) => void;
  onFieldReject?: (fieldName: string) => void;
  focusedFieldName?: string | null;
  isSelectionMode?: boolean;
  onValueSelected?: (value: string, context: string) => void;
  onCancelSelection?: () => void;
}

export function FakeInvoiceDocument({
  invoice,
  scale = 1,
  showOCRHighlights = false,
  onFieldAccept,
  onFieldReject,
  focusedFieldName = null,
  isSelectionMode = false,
  onValueSelected,
  onCancelSelection
}: FakeInvoiceDocumentProps) {
  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Helper function to get the value that should be displayed in the document preview
  // For auto-corrected fields, show the original (incorrect) value from the scanned document
  const getDocumentDisplayValue = (fieldName: string, currentValue: any) => {
    const autoCorrection = invoice.auto_corrections?.find((ac: any) => ac.field === fieldName);
    return autoCorrection ? autoCorrection.original_value : currentValue;
  };

  // OCR highlight wrapper component
  const FieldWithOCR = ({ children, fieldName, className = '' }: { children: React.ReactNode; fieldName: string; className?: string }) => {
    if (!showOCRHighlights) {
      return <>{children}</>;
    }

    // Get confidence from invoice extraction data
    const confidence = invoice.extraction_field_confidences?.[fieldName] ?? 0.92; // Default high confidence
    const confidencePercent = Math.round(confidence * 100);

    // Get confidence-based colors
    const colors = getConfidenceColors(confidence);

    // Check if this field is currently focused
    const isFocused = focusedFieldName === fieldName;

    return (
      <span className={`relative inline-block ${className}`}>
        <span className="relative z-10">{children}</span>
        {/* Confidence-based highlight background */}
        <span
          className={`absolute inset-0 ${colors.highlight} opacity-30 pointer-events-none rounded-sm`}
          style={{ margin: '-2px -4px' }}
        />
        {/* Animated ring outline when focused */}
        {isFocused && (
          <span
            className={`absolute inset-0 pointer-events-none rounded-sm ring-4 ${colors.outline} ring-offset-2 animate-pulseRing`}
            style={{ margin: '-2px -4px' }}
          />
        )}
        {/* Confidence percentage badge */}
        <span
          className={`absolute top-0 left-full ml-1 text-[10px] font-medium ${colors.pill.text} bg-white px-1 rounded whitespace-nowrap`}
        >
          {confidencePercent}%
        </span>
      </span>
    );
  };

  // SelectableText wrapper - makes text clickable in selection mode
  const SelectableText = ({ children, label }: { children: React.ReactNode; label: string }) => {
    if (!isSelectionMode) {
      return <>{children}</>;
    }

    const handleClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onValueSelected && typeof children === 'string') {
        // Extract the value and create context description
        const value = children.trim();
        const context = `Found near label "${label}"`;
        onValueSelected(value, context);
      }
    };

    return (
      <span
        onClick={handleClick}
        className="cursor-crosshair hover:bg-purple-100 hover:ring-2 hover:ring-purple-900 rounded px-1 transition-all"
        title={`Click to select this as the custom field value`}
      >
        {children}
      </span>
    );
  };

  // Calculate totals
  const subtotal = invoice.subtotal || invoice.lines?.reduce((sum: number, line: any) => 
    sum + (line.net_amount || 0), 0) || 0;
  const taxTotal = invoice.tax_total || invoice.lines?.reduce((sum: number, line: any) => 
    sum + (line.tax_amount || 0), 0) || 0;
  const shippingTotal = invoice.shipping_total || 0;
  const otherChargesTotal = invoice.other_charges_total || 0;
  const discountTotal = invoice.discount_total || 0;
  const total = invoice.total || (subtotal + taxTotal + shippingTotal + otherChargesTotal - discountTotal);
  
  // Get tax rate - either from stored value or calculate
  const taxRate = invoice.tax_rate_percent || 
    (subtotal > 0 && taxTotal > 0 ? ((taxTotal / subtotal) * 100) : 0);

  // Get display configuration
  const displayConfig = invoice.display_config || {};
  const isCompactLayout = displayConfig.template === 'compact';
  const invoiceNumberPlacement = displayConfig.layout?.invoiceNumberPlacement || 'top-right';
  const showInvoiceNumberLabel = displayConfig.layout?.showInvoiceNumberLabel !== false;

  // Check if a field is interactive (supports AI candidates)
  const interactiveFields = displayConfig.interactiveFields || [];
  const isInteractiveField = (fieldName: string) => interactiveFields.includes(fieldName);

  // Render a field with EditableField wrapper if interactive, otherwise normal
  const renderField = (fieldName: string, content: React.ReactNode, className?: string) => {
    if (isInteractiveField(fieldName) && onFieldAccept && onFieldReject) {
      // Check if there's an AI candidate for this field
      const candidates = invoice.ocr_extractions?.[fieldName]?.candidates || [];
      const hasCandidate = candidates.length > 0;

      // Use candidate value if available (show unconfirmed AI suggestion)
      const displayValue = hasCandidate ? candidates[0].value : content;

      return (
        <EditableField
          fieldName={fieldName}
          value={displayValue}
          invoice={invoice}
          onAccept={onFieldAccept}
          onReject={onFieldReject}
          className={className}
          showAsUnconfirmed={hasCandidate}
          isFocused={focusedFieldName === fieldName}
        />
      );
    }
    return <span className={className}>{content}</span>;
  };

  return (
    <div
      className="bg-white shadow-lg mx-auto relative"
      style={{
        width: `${794 * scale}px`,
        minHeight: `${1123 * scale}px`,
        transform: `scale(${scale})`,
        transformOrigin: 'top center',
        fontSize: `${16 * scale}px`,
      }}
    >
      {/* Selection Mode Overlay */}
      {isSelectionMode && (
        <>
          <style jsx>{`
            @keyframes ripple {
              0% {
                transform: scale(1);
                opacity: 0.6;
              }
              50% {
                transform: scale(1.03);
                opacity: 0.3;
              }
              100% {
                transform: scale(1.03);
                opacity: 0;
              }
            }
            .animate-ripple {
              animation: ripple 600ms ease-out forwards;
            }
            @keyframes bannerFade {
              0% {
                opacity: 0;
              }
              100% {
                opacity: 1;
              }
            }
            .animate-banner-fade {
              animation: bannerFade 300ms ease-out forwards;
              opacity: 0;
            }
          `}</style>
          <div className="absolute inset-0 z-50 bg-purple-50 bg-opacity-20 ring-4 ring-purple-900 ring-inset pointer-events-none animate-in fade-in duration-300">
            {/* Ripple effect layer */}
            <div className="absolute inset-0 ring-4 ring-purple-500 ring-inset pointer-events-none animate-ripple" />

            {/* Banner with fade-in animation */}
            <div className="absolute -top-11 left-1/2 -translate-x-1/2 bg-purple-900 text-white px-4 pt-2.5 pb-2 rounded-t-md shadow-lg text-sm font-medium flex items-center gap-3 pointer-events-auto animate-banner-fade">
              <span className="text-lg">👆</span>
              <span>Click on the value in the document</span>
              {onCancelSelection && (
                <button
                  onClick={onCancelSelection}
                  className="ml-2 px-3 py-1 text-xs font-medium bg-white bg-opacity-20 hover:bg-opacity-30 rounded transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </>
      )}

      <div className="p-12">
        {/* Header - Conditional Layout */}
        {isCompactLayout && invoiceNumberPlacement === 'above-logo' ? (
          // Compact Layout: Centered with Invoice Number Above Logo
          <div className="mb-8">
            {/* Invoice Number Above Logo (no label) - Show placeholder if missing */}
            <div className="text-center mb-3">
              {renderField(
                'invoice_number',
                <FieldWithOCR fieldName="invoice_number">
                  {getDocumentDisplayValue('invoice_number', invoice.invoice_number) || '[Invoice Number]'}
                </FieldWithOCR>,
                `text-sm font-semibold ${invoice.invoice_number ? 'text-black' : 'text-gray-400 italic'}`
              )}
            </div>

            {/* Centered Company Logo/Name */}
            <div className="text-center">
              <div className="inline-flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-purple-800 rounded-lg flex items-center justify-center">
                  <FileText className="h-6 w-6 text-white" />
                </div>
                <div className="text-left">
                  <h1 className="text-2xl font-bold text-gray-900">
                    <FieldWithOCR fieldName="vendor_name_snapshot">
                      {invoice.vendor_name_snapshot || 'Vendor Name'}
                    </FieldWithOCR>
                  </h1>
                  <p className="text-sm text-gray-600">Professional Services</p>
                </div>
              </div>
            </div>

            {/* Vendor Address - Centered */}
            <div className="text-sm text-gray-800 space-y-1 text-center mb-6">
              {invoice.vendor_address_snapshot ? (
                formatAddressLines(invoice.vendor_address_snapshot).map((line, index) => (
                  <p key={index}>{line}</p>
                ))
              ) : (
                <>
                  <p>{invoice.vendor_name_snapshot || 'Vendor Name'}</p>
                  <p>Address not available</p>
                </>
              )}
              <div className="flex items-center gap-4 justify-center mt-2">
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {invoice.vendor_email || 'billing@company.com'}
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {invoice.vendor_phone || '(555) 123-4567'}
                </span>
              </div>
            </div>

            {/* Invoice Details - Centered */}
            <div className="text-center">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">INVOICE</h2>
              <div className="inline-block text-left space-y-1 text-sm">
                {/* Only show invoice number if not already shown above */}
                {!invoice.invoice_number && (
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-800">Invoice #:</span>
                    <span className="font-semibold text-gray-400">Not provided</span>
                  </div>
                )}
                <div className="flex justify-between gap-4">
                  <span className="text-gray-800">Date:</span>
                  <span className="font-semibold">
                    <FieldWithOCR fieldName="invoice_date">
                      {formatDate(invoice.invoice_date)}
                    </FieldWithOCR>
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-gray-800">Due Date:</span>
                  <span className="font-semibold">
                    <FieldWithOCR fieldName="due_date">
                      {formatDate(invoice.due_date)}
                    </FieldWithOCR>
                  </span>
                </div>
                {invoice.po_numbers_cached?.[0] && (
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-800">PO #:</span>
                    <span className="font-semibold">
                      <FieldWithOCR fieldName="po_numbers_cached">
                        {getDocumentDisplayValue('po_numbers_cached', invoice.po_numbers_cached[0])}
                      </FieldWithOCR>
                    </span>
                  </div>
                )}
                <div className="flex justify-between gap-4">
                  <span className="text-gray-800">Reference:</span>
                  <span className="font-semibold">
                    <FieldWithOCR fieldName="job_number">
                      <SelectableText label="Reference">
                        WO-2025-445
                      </SelectableText>
                    </FieldWithOCR>
                  </span>
                </div>
                {invoice.id === 'baseline-po-bank-1' && invoice.vehicle_registration_no && (
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-800">Vehicle Reg:</span>
                    <span className="font-semibold">
                      <FieldWithOCR fieldName="vehicle_registration_no">
                        <SelectableText label="Vehicle Registration">
                          {invoice.vehicle_registration_no}
                        </SelectableText>
                      </FieldWithOCR>
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          // Standard Layout: Two-column with Invoice Details on Right
          <div className="flex justify-between items-start mb-8">
            <div>
              {/* Company Logo/Name */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-purple-800 rounded-lg flex items-center justify-center">
                  <FileText className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    <FieldWithOCR fieldName="vendor_name_snapshot">
                      {invoice.vendor_name_snapshot || 'Vendor Name'}
                    </FieldWithOCR>
                  </h1>
                  <p className="text-sm text-gray-600">Professional Services</p>
                </div>
              </div>
            
            {/* Vendor Address */}
            <div className="text-sm text-gray-800 space-y-1">
              {invoice.vendor_address_snapshot ? (
                formatAddressLines(
                  // Handle both nested (bill_to style) and direct (vendor_address style) structures
                  invoice.vendor_address_snapshot
                ).map((line, index) => (
                  <p key={index}>{line}</p>
                ))
              ) : (
                // Generic fallback if no address
                <>
                  <p>{invoice.vendor_name_snapshot || 'Vendor Name'}</p>
                  <p>Address not available</p>
                </>
              )}
              <div className="flex items-center gap-4 mt-2">
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {invoice.vendor_email || 'billing@company.com'}
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {invoice.vendor_phone || '(555) 123-4567'}
                </span>
              </div>
            </div>
          </div>

          <div className="text-right">
            <h2 className="text-4xl font-bold text-gray-900 mb-2">INVOICE</h2>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-gray-800">Invoice #:</span>
                <span className="font-semibold text-black">
                  <FieldWithOCR fieldName="invoice_number">
                    {getDocumentDisplayValue('invoice_number', invoice.invoice_number)}
                  </FieldWithOCR>
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-800">Date:</span>
                <span className="font-semibold">
                  <FieldWithOCR fieldName="invoice_date">
                    {formatDate(invoice.invoice_date)}
                  </FieldWithOCR>
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-800">Due Date:</span>
                <span className="font-semibold">
                  <FieldWithOCR fieldName="due_date">
                    {formatDate(invoice.due_date)}
                  </FieldWithOCR>
                </span>
              </div>
              {invoice.po_numbers_cached?.[0] && (
                <div className="flex justify-between gap-4">
                  <span className="text-gray-800">PO #:</span>
                  <span className="font-semibold">
                    <FieldWithOCR fieldName="po_numbers_cached">
                      {getDocumentDisplayValue('po_numbers_cached', invoice.po_numbers_cached[0])}
                    </FieldWithOCR>
                  </span>
                </div>
              )}
              <div className="flex justify-between gap-4">
                <span className="text-gray-800">Reference:</span>
                <span className="font-semibold">
                  <FieldWithOCR fieldName="job_number">
                    <SelectableText label="Reference">
                      WO-2025-445
                    </SelectableText>
                  </FieldWithOCR>
                </span>
              </div>
              {invoice.id === 'baseline-po-bank-1' && invoice.vehicle_registration_no && (
                <div className="flex justify-between gap-4">
                  <span className="text-gray-800">Vehicle Reg:</span>
                  <span className="font-semibold">
                    <FieldWithOCR fieldName="vehicle_registration_no">
                      <SelectableText label="Vehicle Registration">
                        {invoice.vehicle_registration_no}
                      </SelectableText>
                    </FieldWithOCR>
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
        )}

        {/* Bill To Section */}
        <div className="mb-8 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Bill To:</h3>
          <div className="text-sm">
            {invoice.bill_to_snapshot ? (() => {
              const billTo = formatBillToAddress(invoice.bill_to_snapshot);
              return (
                <>
                  <p className="font-semibold text-gray-900">{billTo.companyName}</p>
                  <p className="text-gray-600">Accounts Payable Department</p>
                  {billTo.addressLines.map((line, index) => (
                    <p key={index} className="text-gray-600">{line}</p>
                  ))}
                  {billTo.taxId && (
                    <p className="text-gray-600 mt-2">Tax ID: {billTo.taxId}</p>
                  )}
                </>
              );
            })() : (
              <>
                <p className="font-semibold text-gray-900">Meridian Solutions Group</p>
                <p className="text-gray-600">Accounts Payable Department</p>
                <p className="text-gray-600">750 Market Street, Suite 400</p>
                <p className="text-gray-600">San Francisco, CA 94102</p>
              </>
            )}
          </div>
        </div>

        {/* Line Items Table */}
        <div className="mb-8">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-300">
                <th className="text-left py-2 text-sm font-semibold text-gray-700">Description</th>
                <th className="text-right py-2 text-sm font-semibold text-gray-700 w-20">Qty</th>
                <th className="text-right py-2 text-sm font-semibold text-gray-700 w-24">Unit Price</th>
                <th className="text-right py-2 text-sm font-semibold text-gray-700 w-24">Tax</th>
                <th className="text-right py-2 text-sm font-semibold text-gray-700 w-28">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.lines && invoice.lines.length > 0 ? (
                invoice.lines.map((line: any, index: number) => (
                  <tr key={index} className="border-b border-gray-200">
                    <td className="py-3 text-sm text-gray-700">
                      {line.description || `Line item ${index + 1}`}
                    </td>
                    <td className="py-3 text-sm text-gray-700 text-right">
                      {line.qty || 1}
                    </td>
                    <td className="py-3 text-sm text-gray-700 text-right">
                      {formatCurrency(line.unit_price || 0, invoice.currency)}
                    </td>
                    <td className="py-3 text-sm text-gray-700 text-right">
                      {formatCurrency(line.tax_amount || 0, invoice.currency)}
                    </td>
                    <td className="py-3 text-sm text-gray-900 text-right font-medium">
                      {formatCurrency(line.line_total || line.net_amount || 0, invoice.currency)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr className="border-b border-gray-200">
                  <td className="py-3 text-sm text-gray-700">Professional Services</td>
                  <td className="py-3 text-sm text-gray-700 text-right">1</td>
                  <td className="py-3 text-sm text-gray-700 text-right">
                    {formatCurrency(subtotal, invoice.currency)}
                  </td>
                  <td className="py-3 text-sm text-gray-700 text-right">
                    {formatCurrency(taxTotal, invoice.currency)}
                  </td>
                  <td className="py-3 text-sm text-gray-900 text-right font-medium">
                    {formatCurrency(total, invoice.currency)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Totals Section */}
        <div className="flex justify-end">
          <div className="w-80">
            <div className="space-y-2">
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-sm text-gray-600">Subtotal:</span>
                <span className="text-sm font-medium text-gray-900">
                  <FieldWithOCR fieldName="subtotal">
                    {formatCurrency(subtotal, invoice.currency)}
                  </FieldWithOCR>
                </span>
              </div>
              {taxTotal > 0 && (
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-sm text-gray-600">
                    Tax{taxRate > 0 ? ` (${taxRate.toFixed(1)}%)` : ''}:
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    <FieldWithOCR fieldName="tax_total">
                      {formatCurrency(taxTotal, invoice.currency)}
                    </FieldWithOCR>
                  </span>
                </div>
              )}
              {shippingTotal > 0 && (
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-sm text-gray-600">Shipping/Freight:</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatCurrency(shippingTotal, invoice.currency)}
                  </span>
                </div>
              )}
              {otherChargesTotal > 0 && (
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-sm text-gray-600">Other Charges:</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatCurrency(otherChargesTotal, invoice.currency)}
                  </span>
                </div>
              )}
              {discountTotal > 0 && (
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-sm text-gray-600">Discount:</span>
                  <span className="text-sm font-medium text-green-600">
                    -{formatCurrency(discountTotal, invoice.currency)}
                  </span>
                </div>
              )}
              <div className="flex justify-between py-3 border-b-2 border-gray-900">
                <span className="text-base font-semibold text-gray-900">Total Due:</span>
                <span className="text-xl font-bold text-gray-900">
                  <FieldWithOCR fieldName="total">
                    {formatCurrency(total, invoice.currency)}
                  </FieldWithOCR>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Terms */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Payment Terms</h3>
          <p className="text-sm text-gray-700">
            {invoice.terms_text || 'Net 30 - Payment due within 30 days of invoice date'}
          </p>
          <p className="text-sm text-gray-700 mt-2">
            Please reference invoice number <span className="font-semibold text-black">{getDocumentDisplayValue('invoice_number', invoice.invoice_number)}</span> with your payment.
          </p>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <p className="text-xs text-center text-gray-500">
            Thank you for your business! If you have any questions about this invoice, 
            please contact us at billing@company.com
          </p>
        </div>
      </div>
    </div>
  );
}