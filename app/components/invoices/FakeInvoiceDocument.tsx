'use client';

import React from 'react';
import { Building2, Mail, Phone, Globe, Calendar, FileText, DollarSign } from 'lucide-react';
import { formatVendorAddress, formatBillToAddress, formatAddressLines } from '@/app/lib/addressFormatter';
import { EditableField } from './EditableField';
import { getConfidenceColors } from '@/app/utils/confidenceColors';
import { resolveDisplayConfig } from './templates/registry';
import type { DisplayConfig, TemplateConfig } from '@/types/invoice-display';

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
  // Format currency helper
  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Format date helper
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
            className={`absolute inset-0 pointer-events-none rounded-sm ring-4 ring-orange-500 ring-offset-2 animate-pulseRing`}
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

  // Get display configuration
  const displayConfig = invoice.display_config || {};
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

  // Resolve template and configuration using registry
  const { template, config } = resolveDisplayConfig(invoice);
  const TemplateComponent = template.component;

  // Prepare shared components for template
  const sharedComponents = {
    InvoiceHeader: undefined, // Templates will use default imports
    InvoiceMetadata: undefined,
    BillToSection: undefined,
    LineItemsTable: undefined,
    TotalsSection: undefined,
    PaymentTerms: undefined,
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

      {/* Render template with all required props */}
      <TemplateComponent
        invoice={invoice}
        displayConfig={displayConfig}
        templateConfig={config}
        components={sharedComponents}
        formatCurrency={formatCurrency}
        formatDate={formatDate}
        getDocumentDisplayValue={getDocumentDisplayValue}
        FieldWithOCR={FieldWithOCR}
        SelectableText={SelectableText}
        renderField={renderField}
        focusedFieldName={focusedFieldName}
      />
    </div>
  );
}
