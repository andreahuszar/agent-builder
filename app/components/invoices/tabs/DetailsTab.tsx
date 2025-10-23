'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { formatVendorAddress } from '@/app/lib/addressFormatter';
import {
  Save,
  Edit2,
  X,
  File,
  Coins,
  CreditCard,
  Calendar,
  Building2,
  User,
  Hash,
  Link2,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  BookOpen,
  Check,
  Brain,
  ChevronDown,
  ChevronUp,
  FileText,
  Package,
  Sparkles
} from 'lucide-react';
import { EditableField } from '../editing/EditableField';
import { ValidatedEditableField } from '../editing/ValidatedEditableField';
import { ValidationIndicator, ValidationSummaryBadge } from '../ValidationIndicator';
import { InvoiceValidator, ValidationResult } from '@/app/utils/validationService';
import { COST_CENTER_OPTIONS, LEDGER_OPTIONS } from '@/lib/constants/accountingCodes';
import * as Tooltip from '@radix-ui/react-tooltip';
import { Badge } from '@/app/components/ui/badge';
import { FieldErrorIndicator, useFieldErrors, FieldError } from '../FieldErrorIndicator';
import type { LayoutMode } from './InvoiceTabs';
import { LinkedDocumentPill } from '../LinkedDocumentPill';
import { PODetailsDrawer } from '../PODetailsDrawer';
import { POSearchModal } from '../POSearchModal';
import { AISuggestionCard } from '../AISuggestionCard';

interface DetailsTabProps {
  invoiceData: any;
  onUpdate?: (data: any) => void;
  layoutMode?: LayoutMode;
  forceEditMode?: boolean;
  forceReadOnly?: boolean;
  hideFloatingSaveButton?: boolean;
  hideAccountingSection?: boolean;
  hidePaymentSection?: boolean;
  hideDocumentLinksSection?: boolean;
  showFieldErrors?: boolean;
  onEditModeChange?: (isEditing: boolean) => void;
  onFieldAccept?: (fieldName: string, value: string) => void;
  onFieldReject?: (fieldName: string) => void;
  onFieldFocus?: (fieldName: string | null) => void; // Highlight field in PDF when focused
}

export function DetailsTab({
  invoiceData,
  onUpdate,
  layoutMode = 'large',
  forceEditMode = false,
  forceReadOnly = false,
  hideFloatingSaveButton = false,
  hideAccountingSection = false,
  hidePaymentSection = false,
  hideDocumentLinksSection = false,
  showFieldErrors = false,
  onEditModeChange,
  onFieldAccept,
  onFieldReject,
  onFieldFocus
}: DetailsTabProps) {
  // Individual field edit states for click-to-edit functionality
  const [editingField, setEditingField] = useState<string | null>(null);
  // Track which field's AI suggestion is expanded
  const [expandedSuggestion, setExpandedSuggestion] = useState<string | null>(null);
  // Calculate totals from line items for accuracy
  const calculatedSubtotal = invoiceData?.lines?.reduce((sum: number, line: any) => sum + (line.net_amount || 0), 0) || 0;
  const calculatedTaxTotal = invoiceData?.lines?.reduce((sum: number, line: any) => sum + ((line.line_total || 0) - (line.net_amount || 0)), 0) || 0;
  const calculatedTotal = invoiceData?.lines?.reduce((sum: number, line: any) => sum + (line.line_total || 0), 0) || 0;
  
  // Get grid classes based on layout mode
  const getGridCols = () => {
    switch (layoutMode) {
      case 'compact':
        return 'grid-cols-1';
      case 'medium':
        return 'grid-cols-1 sm:grid-cols-2';
      case 'large':
      default:
        return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
    }
  };
  
  // Get column span classes for full-width items
  const getFullSpan = () => {
    switch (layoutMode) {
      case 'compact':
        return '';
      case 'medium':
        return 'sm:col-span-2';
      case 'large':
      default:
        return 'sm:col-span-2 lg:col-span-3';
    }
  };

  // Determine initial edit state based on props
  const getInitialEditState = () => {
    if (forceReadOnly) return false;
    if (forceEditMode) return true;
    return false; // Default to read-only mode
  };

  const [isEditing, setIsEditing] = useState(getInitialEditState());
  const [editedData, setEditedData] = useState(invoiceData);
  const [isSaving, setIsSaving] = useState(false);
  const [showFab, setShowFab] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [showAIReasoning, setShowAIReasoning] = useState(false);

  // Notify parent when edit mode changes
  useEffect(() => {
    onEditModeChange?.(isEditing);
  }, [isEditing, onEditModeChange]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Document links state
  const [selectedPONumber, setSelectedPONumber] = useState<string | null>(null);
  const [isPODrawerOpen, setIsPODrawerOpen] = useState(false);
  const [isPOSearchModalOpen, setIsPOSearchModalOpen] = useState(false);

  // Field error tracking for needs info mode
  const { errors: fieldErrors, addError, removeError, clearErrors, validateRequired } = useFieldErrors();

  // Field refs for error navigation
  const fieldRefs = useRef<{ [key: string]: HTMLElement | null }>({});

  // Update edit state when props change
  useEffect(() => {
    const newEditState = getInitialEditState();
    setIsEditing(newEditState);
  }, [forceEditMode, forceReadOnly]);

  // Validate required fields on mount for needs info mode or when showFieldErrors is true
  useEffect(() => {
    if ((forceEditMode && isEditing) || showFieldErrors) {
      // Use setTimeout to avoid state update issues
      const timer = setTimeout(() => {
        // Clear any existing errors first
        clearErrors();

        // Check all required fields (matching ValidatedEditableField required prop)
        const fieldsToCheck = [
          { field: 'invoice_number', label: 'Invoice Number', type: 'text' },
          { field: 'invoice_date', label: 'Invoice Date', type: 'date' },
          { field: 'due_date', label: 'Due Date', type: 'date' },
          { field: 'vendor_name_snapshot', label: 'Vendor Name', type: 'text' },
          { field: 'vendor_tax_id_snapshot', label: 'Vendor Tax ID', type: 'text' },
          { field: 'po_numbers_cached', label: 'PO Number', type: 'array' },
          { field: 'subtotal', label: 'Subtotal', type: 'currency' },
          { field: 'currency', label: 'Currency', type: 'text' },
          { field: 'total', label: 'Total', type: 'currency' },
        ];

        fieldsToCheck.forEach(({ field, label, type }) => {
          const value = editedData[field];

          // Special handling for vendor field - "Unknown Vendor" is considered invalid
          if (field === 'vendor_name_snapshot' && value === 'Unknown Vendor') {
            addError(field, `${label} is invalid (Unknown Vendor)`, fieldRefs.current[field]);
            return;
          }

          // Check based on field type
          if (type === 'array') {
            // For array fields like po_numbers_cached
            if (!value || (Array.isArray(value) && value.length === 0) || (Array.isArray(value) && !value[0])) {
              addError(field, `${label} is required`, fieldRefs.current[field]);
            }
          } else if (type === 'date') {
            // For date fields
            if (!value || value === '') {
              addError(field, `${label} is required`, fieldRefs.current[field]);
            } else {
              const date = new Date(value);
              if (isNaN(date.getTime())) {
                addError(field, `${label} is invalid`, fieldRefs.current[field]);
              }
            }
          } else if (type === 'currency') {
            // For currency/number fields
            if (value === null || value === undefined || value === '' || isNaN(Number(value))) {
              addError(field, `${label} is required`, fieldRefs.current[field]);
            }
          } else {
            // For text fields
            if (!value || value.toString().trim().length === 0) {
              addError(field, `${label} is required`, fieldRefs.current[field]);
            }
          }
        });
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [forceEditMode, isEditing, showFieldErrors, invoiceData.id]); // Only re-run when invoice changes or edit/show mode changes

  // Run validations
  const validationResults = useMemo(() => {
    const validator = new InvoiceValidator(invoiceData);
    return validator.validate();
  }, [invoiceData]);

  const { errors, warnings, info } = validationResults;

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Calculate aging for due date
  const getAgingInfo = (dueDate: string) => {
    if (!dueDate) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);

    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 30) {
      return { text: `${diffDays}d left`, color: 'bg-green-50 text-green-700 border-green-200' };
    } else if (diffDays > 7) {
      return { text: `${diffDays}d left`, color: 'bg-yellow-50 text-yellow-700 border-yellow-200' };
    } else if (diffDays > 0) {
      return { text: `${diffDays}d left`, color: 'bg-orange-50 text-orange-700 border-orange-200' };
    } else if (diffDays === 0) {
      return { text: 'Due today', color: 'bg-orange-50 text-orange-700 border-orange-200' };
    } else {
      return { text: `${Math.abs(diffDays)}d overdue`, color: 'bg-red-50 text-red-700 border-red-200' };
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return formatter.format(amount);
  };

  const getTaxRate = () => {
    // Use stored tax rate if available, otherwise calculate
    if (invoiceData?.tax_rate_percent) {
      return Number(invoiceData.tax_rate_percent).toFixed(1);
    }
    if (!calculatedSubtotal || calculatedSubtotal === 0) return '0.0';
    return ((calculatedTaxTotal / calculatedSubtotal) * 100).toFixed(1);
  };

  // Helper function to check if a field has errors
  const hasFieldError = (fieldName: string) => {
    return fieldErrors.some(e => e.field === fieldName);
  };

  // Helper to get read-only field styling with error highlighting
  const getReadOnlyFieldClass = (fieldName: string, defaultValue?: string) => {
    const baseClass = 'text-sm font-medium';
    if (showFieldErrors && hasFieldError(fieldName)) {
      return `${baseClass} text-red-700 border-l-2 border-red-500 pl-2 bg-red-50 py-1 rounded cursor-pointer hover:bg-red-100 transition-colors`;
    }
    return `${baseClass} text-gray-950`;
  };

  // Render a field - either as editable or read-only with click-to-edit
  const renderField = (fieldName: string, fieldValue: any, fieldType: 'text' | 'date' | 'currency' | 'select', label: string, options?: any[]) => {
    const isFieldEditing = editingField === fieldName;
    const shouldAllowEdit = showFieldErrors && hasFieldError(fieldName) && !forceReadOnly;

    // Check for AI candidate suggestions
    const candidates = invoiceData?.ocr_extractions?.[fieldName]?.candidates || [];
    const hasCandidate = candidates.length > 0 && onFieldAccept && onFieldReject;

    if (isFieldEditing && shouldAllowEdit) {
      return (
        <ValidatedEditableField
          value={editedData[fieldName]}
          onChange={(value) => {
            handleFieldChange(fieldName, value);
          }}
          type={fieldType}
          required={true}
          fieldName={fieldName}
          options={options}
          onKeyDown={(e: any) => handleKeyDown(e, fieldName, editedData[fieldName])}
          autoFocus
        />
      );
    }

    if (shouldAllowEdit) {
      // If field is missing/invalid AND we have an AI candidate, show fix suggestion button
      if (!fieldValue && hasCandidate) {
        return (
          <div>
            <p
              className={getReadOnlyFieldClass(fieldName)}
              onClick={() => setEditingField(fieldName)}
              title="Click to edit"
            >
              Not found
            </p>
            <button
              onClick={() => {
                const newExpanded = expandedSuggestion === fieldName ? null : fieldName;
                setExpandedSuggestion(newExpanded);
                // Highlight field in PDF when suggestion card opens
                if (onFieldFocus) {
                  onFieldFocus(newExpanded);
                }
              }}
              className="mt-1 flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700 transition-colors"
            >
              <Sparkles className="h-3 w-3" />
              {expandedSuggestion === fieldName ? 'Hide Suggestion' : 'Fix Suggestion'}
            </button>
            {expandedSuggestion === fieldName && (
              <div className="mt-2">
                <AISuggestionCard
                  candidate={candidates[0]}
                  onAccept={() => {
                    onFieldAccept!(fieldName, candidates[0].value);
                    setExpandedSuggestion(null);
                    setEditingField(null);
                  }}
                  onReject={() => {
                    onFieldReject!(fieldName);
                    setExpandedSuggestion(null);
                  }}
                  onClose={() => {
                    setExpandedSuggestion(null);
                    if (onFieldFocus) {
                      onFieldFocus(null);
                    }
                  }}
                />
              </div>
            )}
          </div>
        );
      }

      return (
        <p
          className={getReadOnlyFieldClass(fieldName)}
          onClick={() => setEditingField(fieldName)}
          title="Click to edit"
        >
          {fieldValue || 'Not found'}
        </p>
      );
    }

    return (
      <p className={getReadOnlyFieldClass(fieldName)}>
        {fieldValue || 'Not found'}
      </p>
    );
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: any = {
      'draft': { icon: Clock, color: 'bg-gray-100 text-gray-700', label: 'Draft' },
      'pending': { icon: Clock, color: 'bg-yellow-100 text-yellow-700', label: 'Pending' },
      'approved': { icon: CheckCircle, color: 'bg-green-100 text-green-700', label: 'Approved' },
      'rejected': { icon: XCircle, color: 'bg-red-100 text-red-700', label: 'Rejected' },
      'exception': { icon: AlertTriangle, color: 'bg-orange-100 text-orange-700', label: 'Exception' },
    };

    const config = statusConfig[status?.toLowerCase()] || statusConfig['pending'];
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
        <Icon className="h-3.5 w-3.5" />
        {config.label}
      </span>
    );
  };

  const handleFieldChange = (field: string, value: any) => {
    setEditedData((prev: any) => ({
      ...prev,
      [field]: value,
    }));

    // Validate required fields for needs info mode
    if (forceEditMode && isEditing) {
      // Check if field is required and validate
      const requiredFields = ['vendor_name_snapshot', 'vendor_tax_id_snapshot', 'invoice_date', 'currency'];
      if (requiredFields.includes(field)) {
        const label = field === 'vendor_name_snapshot' ? 'Vendor Name' :
                       field === 'vendor_tax_id_snapshot' ? 'Vendor Tax ID' :
                       field === 'invoice_date' ? 'Invoice Date' :
                       field === 'currency' ? 'Currency' : field;

        validateRequired(field, value, fieldRefs.current[field]);
      }
    }
  };

  // Handle Enter key save for individual field editing
  const handleFieldSave = async (field: string, value: any) => {
    try {
      const updatedData = { ...editedData, [field]: value };

      const response = await fetch(`/api/invoices/${invoiceData.id}/update`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });

      if (response.ok) {
        const result = await response.json();
        setEditedData(updatedData);
        onUpdate?.(updatedData);
        setEditingField(null);
        removeError(field);
      }
    } catch (error) {
      console.error('Error saving field:', error);
    }
  };

  // Handle Enter key press
  const handleKeyDown = (e: React.KeyboardEvent, field: string, value: any) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleFieldSave(field, value);
    } else if (e.key === 'Escape') {
      setEditingField(null);
      setEditedData((prev: any) => ({
        ...prev,
        [field]: invoiceData[field],
      }));
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/invoices/${invoiceData.id}/update`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editedData),
      });

      if (response.ok) {
        const updatedInvoice = await response.json();
        // Update the invoice data with the server response including is_manually_edited flags
        const updatedData = {
          ...editedData,
          is_manually_edited: updatedInvoice.is_manually_edited || {},
          extraction_field_confidences: updatedInvoice.extraction_field_confidences || {}
        };
        onUpdate?.(updatedData);
        setIsEditing(false);
      } else {
        console.error('Failed to save changes');
      }
    } catch (error) {
      console.error('Error saving changes:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedData(invoiceData);
    setIsEditing(false);
  };

  // Section-specific save handlers (frontend-only, no backend API calls)
  const handleSaveInvoiceInfo = () => {
    // Just notify parent component with current state
    onUpdate?.(editedData);
    // Keep edit mode active
  };

  const handleSaveFinancialDetails = () => {
    // Just notify parent component with current state
    onUpdate?.(editedData);
    // Keep edit mode active
  };

  const handleSavePaymentInfo = () => {
    // Just notify parent component with current state
    onUpdate?.(editedData);
    // Keep edit mode active
  };

  const handleSaveAccountingInfo = () => {
    // Just notify parent component with current state
    onUpdate?.(editedData);
    // Keep edit mode active
  };

  // Document links handlers
  const handlePOPillClick = (poNumber: string) => {
    setSelectedPONumber(poNumber);
    setIsPODrawerOpen(true);
  };

  const handleLinkPO = async (poNumber: string) => {
    try {
      const response = await fetch(`/api/invoices/${invoiceData.id}/link-po`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ poNumber }),
      });

      if (response.ok) {
        const data = await response.json();
        // Update local state with new PO
        const updatedPONumbers = [...(editedData.po_numbers_cached || []), poNumber];
        const updatedData = {
          ...editedData,
          po_numbers_cached: updatedPONumbers
        };
        setEditedData(updatedData);

        // Notify parent if callback exists
        if (onUpdate) {
          onUpdate(updatedData);
        }

        console.log(`Successfully linked PO ${poNumber}`);
      } else {
        const error = await response.json();
        console.error('Failed to link PO:', error);
        alert(`Failed to link PO: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error linking PO:', error);
      alert('Failed to link PO. Please try again.');
    }
  };

  const handleUnlinkPO = async (poNumber: string) => {
    try {
      const response = await fetch(`/api/invoices/${invoiceData.id}/unlink-po/${poNumber}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Update local state - remove the PO
        const updatedPONumbers = (editedData.po_numbers_cached || []).filter(
          (po: string) => po !== poNumber
        );
        const updatedData = {
          ...editedData,
          po_numbers_cached: updatedPONumbers.length > 0 ? updatedPONumbers : null
        };
        setEditedData(updatedData);

        // Notify parent if callback exists
        if (onUpdate) {
          onUpdate(updatedData);
        }

        console.log(`Successfully unlinked PO ${poNumber}`);
      } else {
        const error = await response.json();
        console.error('Failed to unlink PO:', error);
        alert(`Failed to unlink PO: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error unlinking PO:', error);
      alert('Failed to unlink PO. Please try again.');
    }
  };

  // Handle scroll to show/hide FAB
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      const currentScrollY = scrollContainer.scrollTop;
      
      if (currentScrollY > lastScrollY && currentScrollY > 50) {
        // Scrolling down - hide FAB
        setShowFab(false);
      } else {
        // Scrolling up or at top - show FAB
        setShowFab(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  return (
    <Tooltip.Provider>
      <div className="h-full flex flex-col relative">
        {/* Scrollable Content Area - Now takes full height */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto relative">
          {/* Field Error Indicator - Show when editing OR when showFieldErrors is true */}
          {((forceEditMode && isEditing) || showFieldErrors) && fieldErrors.length > 0 && (
            <FieldErrorIndicator
              errors={fieldErrors}
              onDismiss={clearErrors}
              readOnly={forceReadOnly || showFieldErrors}
            />
          )}

        {/* Invoice Information Section */}
        <div>
          <div className="relative px-4 py-3 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2">
              <File className="h-4 w-4 text-purple-600" />
              <h3 className="text-xs font-semibold text-gray-950 uppercase tracking-wide">Invoice Information</h3>
            </div>
            {!forceReadOnly && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="absolute right-4 top-1/2 -translate-y-1/2 px-2 py-1 text-xs font-medium rounded border transition-colors bg-white text-purple-900 border-purple-900 hover:bg-gray-50"
              >
                Edit
              </button>
            )}
          </div>
          <div className="px-10 py-4 bg-white">
            <div className={`grid ${getGridCols()} gap-4`}>
              <div ref={(el) => fieldRefs.current['invoice_number'] = el}>
                <label className="flex items-center text-xs font-medium text-gray-700 mb-1 min-h-[20px]">
                  Invoice Number
                </label>
                {isEditing ? (
                  <ValidatedEditableField
                    value={editedData.invoice_number}
                    onChange={(value) => handleFieldChange('invoice_number', value)}
                    type="text"
                    required={true}
                    fieldName="invoice_number"
                  />
                ) : (
                  renderField('invoice_number', invoiceData.invoice_number, 'text', 'Invoice Number')
                )}
              </div>
              <div ref={(el) => fieldRefs.current['invoice_date'] = el}>
                <label className="flex items-center text-xs font-medium text-gray-700 mb-1 min-h-[20px]">
                  Invoice Date
                  <ValidationIndicator validations={[...errors, ...warnings]} field="invoice_date" />
                </label>
                {isEditing ? (
                  <ValidatedEditableField
                    value={editedData.invoice_date}
                    onChange={(value) => handleFieldChange('invoice_date', value)}
                    type="date"
                    required={true}
                    fieldName="invoice_date"
                  />
                ) : (
                  renderField('invoice_date', formatDate(invoiceData.invoice_date), 'date', 'Invoice Date')
                )}
              </div>
              <div>
                <label className="flex items-center text-xs font-medium text-gray-700 mb-1 min-h-[20px]">
                  Due Date
                  <ValidationIndicator validations={[...errors, ...warnings]} field="due_date" />
                </label>
                {isEditing ? (
                  <ValidatedEditableField
                    value={editedData.due_date}
                    onChange={(value) => handleFieldChange('due_date', value)}
                    type="date"
                    required={true}
                    fieldName="due_date"
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <p className={getReadOnlyFieldClass('due_date')}>{formatDate(invoiceData.due_date) || 'Not found'}</p>
                    {(() => {
                      const aging = getAgingInfo(invoiceData.due_date);
                      return aging ? (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${aging.color}`}>
                          {aging.text}
                        </span>
                      ) : null;
                    })()}
                  </div>
                )}
              </div>
              <div ref={(el) => fieldRefs.current['vendor_name_snapshot'] = el}>
                <label className="flex items-center text-xs font-medium text-gray-700 mb-1 min-h-[20px]">
                  Vendor
                </label>
                {isEditing ? (
                  <ValidatedEditableField
                    value={editedData.vendor_name_snapshot}
                    onChange={(value) => handleFieldChange('vendor_name_snapshot', value)}
                    type="text"
                    required={true}
                    fieldName="vendor_name_snapshot"
                  />
                ) : (
                  <div className="flex items-start gap-2">
                    {renderField('vendor_name_snapshot', invoiceData.vendor_name_snapshot, 'text', 'Vendor')}
                    {invoiceData.vendor_is_verified === false && (
                      <Tooltip.Provider>
                        <Tooltip.Root>
                          <Tooltip.Trigger asChild>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 cursor-help">
                              <AlertTriangle className="h-3 w-3" />
                              Unverified
                            </span>
                          </Tooltip.Trigger>
                          <Tooltip.Portal>
                            <Tooltip.Content
                              className="z-50 overflow-hidden rounded-md bg-gray-900 text-white px-3 py-2 text-xs shadow-md animate-in fade-in-0 zoom-in-95 max-w-xs"
                              sideOffset={5}
                            >
                              This vendor is not verified in the system. Contact the procurement team to complete vendor verification before processing payment.
                              <Tooltip.Arrow className="fill-gray-900" />
                            </Tooltip.Content>
                          </Tooltip.Portal>
                        </Tooltip.Root>
                      </Tooltip.Provider>
                    )}
                  </div>
                )}
              </div>
              <div ref={(el) => fieldRefs.current['vendor_tax_id_snapshot'] = el}>
                <label className="flex items-center text-xs font-medium text-gray-700 mb-1 min-h-[20px]">
                  Vendor ID
                </label>
                {isEditing ? (
                  <ValidatedEditableField
                    value={editedData.vendor_tax_id_snapshot}
                    onChange={(value) => handleFieldChange('vendor_tax_id_snapshot', value)}
                    type="text"
                    required={true}
                    fieldName="vendor_tax_id_snapshot"
                    placeholder="e.g., TAX-12345"
                  />
                ) : (
                  renderField('vendor_tax_id_snapshot', invoiceData.vendor_tax_id_snapshot, 'text', 'Vendor ID')
                )}
              </div>
              <div ref={(el) => fieldRefs.current['po_numbers_cached'] = el}>
                <label className="flex items-center text-xs font-medium text-gray-700 mb-1 min-h-[20px]">
                  PO Number
                </label>
                {isEditing ? (
                  <ValidatedEditableField
                    value={editedData.po_numbers_cached?.[0] || ''}
                    onChange={(value) => handleFieldChange('po_numbers_cached', value ? [value] : [])}
                    type="text"
                    required={true}
                    fieldName="po_numbers_cached"
                    placeholder="Enter PO Number"
                  />
                ) : (
                  renderField(
                    'po_numbers_cached',
                    invoiceData.po_numbers_cached?.length > 0 ? invoiceData.po_numbers_cached[0] : '',
                    'text',
                    'PO Number'
                  )
                )}
              </div>
              <div>
                <label className="flex items-center text-xs font-medium text-gray-700 mb-1 min-h-[20px]">Assigned To</label>
                <div className="inline-flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-purple-100 flex items-center justify-center">
                    <User className="h-3.5 w-3.5 text-purple-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-950">
                    {invoiceData.assigned_to_name || 'Unassigned'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Financial Details Section */}
        <div>
          <div className="relative px-4 py-3 border-t border-b border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2">
              <Coins className="h-4 w-4 text-purple-600" />
              <h3 className="text-xs font-semibold text-gray-950 uppercase tracking-wide">Financial Details</h3>
            </div>
            {!forceReadOnly && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="absolute right-4 top-1/2 -translate-y-1/2 px-2 py-1 text-xs font-medium rounded border transition-colors bg-white text-purple-900 border-purple-900 hover:bg-gray-50"
              >
                Edit
              </button>
            )}
          </div>
          <div className="px-10 py-4 bg-white">
            {/* First Row: Subtotal, Currency, Tax Rate */}
            <div className={`grid ${getGridCols()} gap-4`}>
              <div ref={(el) => fieldRefs.current['subtotal'] = el}>
                <label className="flex items-center text-xs font-medium text-gray-700 mb-1 min-h-[20px]">
                  Subtotal
                </label>
                {isEditing ? (
                  <ValidatedEditableField
                    value={editedData.subtotal || calculatedSubtotal}
                    onChange={(value) => handleFieldChange('subtotal', value)}
                    type="currency"
                    required={true}
                    fieldName="subtotal"
                    currency={editedData.currency}
                  />
                ) : (
                  <p className={getReadOnlyFieldClass('subtotal')}>
                    {formatCurrency(invoiceData.subtotal || calculatedSubtotal, invoiceData.currency)}
                  </p>
                )}
              </div>
              <div ref={(el) => fieldRefs.current['currency'] = el}>
                <label className="flex items-center text-xs font-medium text-gray-700 mb-1 min-h-[20px]">
                  Currency
                </label>
                {isEditing ? (
                  <ValidatedEditableField
                    value={editedData.currency}
                    onChange={(value) => handleFieldChange('currency', value)}
                    type="select"
                    required={true}
                    fieldName="currency"
                    options={[
                      { value: 'USD', label: 'USD' },
                      { value: 'EUR', label: 'EUR' },
                      { value: 'GBP', label: 'GBP' },
                      { value: 'JPY', label: 'JPY' },
                    ]}
                  />
                ) : (
                  renderField('currency', invoiceData.currency, 'select', 'Currency', [
                    { value: 'USD', label: 'USD' },
                    { value: 'EUR', label: 'EUR' },
                    { value: 'GBP', label: 'GBP' },
                    { value: 'JPY', label: 'JPY' },
                  ])
                )}
              </div>
              <div>
                <label className="flex items-center text-xs font-medium text-gray-700 mb-1 min-h-[20px]">
                  Tax Rate (%)
                </label>
                {isEditing ? (
                  <ValidatedEditableField
                    value={editedData.tax_rate_percent || parseFloat(getTaxRate())}
                    onChange={(value) => handleFieldChange('tax_rate_percent', value)}
                    type="number"
                    required={false}
                    fieldName="tax_rate_percent"
                    min={0}
                    max={100}
                    step={0.1}
                  />
                ) : (
                  <p className="text-sm font-medium text-gray-950">
                    {getTaxRate()}%
                  </p>
                )}
              </div>
            </div>
            
            {/* Second Row: Tax Amount, Shipping/Freight, Discount */}
            <div className={`grid ${getGridCols()} gap-4 mt-4`}>
              <div>
                <label className="flex items-center text-xs font-medium text-gray-700 mb-1 min-h-[20px]">
                  Tax Amount
                </label>
                {isEditing ? (
                  <ValidatedEditableField
                    value={editedData.tax_total || calculatedTaxTotal}
                    onChange={(value) => handleFieldChange('tax_total', value)}
                    type="currency"
                    required={false}
                    fieldName="tax_total"
                    currency={editedData.currency}
                  />
                ) : (
                  <p className="text-sm font-medium text-gray-950">
                    {formatCurrency(invoiceData.tax_total || calculatedTaxTotal, invoiceData.currency)}
                  </p>
                )}
              </div>
              <div>
                <label className="flex items-center text-xs font-medium text-gray-700 mb-1 min-h-[20px]">
                  Shipping/Freight
                </label>
                <p className="text-sm font-medium text-gray-950">
                  {invoiceData.shipping_total > 0 
                    ? formatCurrency(invoiceData.shipping_total, invoiceData.currency)
                    : '-'
                  }
                </p>
              </div>
              <div>
                <label className="flex items-center text-xs font-medium text-gray-700 mb-1 min-h-[20px]">
                  Discount
                </label>
                <p className={`text-sm font-medium ${invoiceData.discount_total > 0 ? 'text-green-600' : 'text-gray-950'}`}>
                  {invoiceData.discount_total > 0 
                    ? `-${formatCurrency(invoiceData.discount_total, invoiceData.currency)}`
                    : '-'
                  }
                </p>
              </div>
            </div>
            
            {/* Third Row: Other charges if present */}
            {invoiceData.other_charges_total > 0 && (
              <div className={`grid ${getGridCols()} gap-4 mt-4`}>
                <div>
                  <label className="flex items-center text-xs font-medium text-gray-700 mb-1 min-h-[20px]">
                    Other Charges
                  </label>
                  <p className="text-sm font-medium text-gray-950">
                    {formatCurrency(invoiceData.other_charges_total, invoiceData.currency)}
                  </p>
                </div>
                <div></div>
                <div></div>
              </div>
            )}
            {/* Invoice Total Row */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className={`grid ${getGridCols()} gap-4`}>
                <div ref={(el) => fieldRefs.current['total'] = el}>
                  <label className="flex items-center text-xs font-medium text-gray-700 mb-1 min-h-[20px]">
                    Invoice Total
                  </label>
                  {isEditing ? (
                    <ValidatedEditableField
                      value={editedData.total || calculatedTotal}
                      onChange={(value) => handleFieldChange('total', value)}
                      type="currency"
                      required={true}
                      fieldName="total"
                      currency={editedData.currency}
                    />
                  ) : (
                    <p className={`${getReadOnlyFieldClass('total')} font-bold`}>
                      {formatCurrency(invoiceData.total || calculatedTotal, invoiceData.currency)}
                    </p>
                  )}
                  {/* Show discrepancy warning if extracted total differs from current total */}
                  {invoiceData.total_discrepancy && Number(invoiceData.total_discrepancy) > 1 && (
                    <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-md">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                        <div className="text-xs">
                          <p className="font-medium text-amber-800">
                            Total Discrepancy Detected
                          </p>
                          <p className="text-amber-700 mt-1">
                            The AI extracted total ({formatCurrency(invoiceData.extracted_total || 0, invoiceData.currency)}) 
                            differs from the calculated total. This may indicate missing charges (freight, fees) in the extraction.
                          </p>
                          <p className="text-amber-700 mt-1">
                            Components: Subtotal ({formatCurrency(invoiceData.subtotal || 0, invoiceData.currency)})
                            {invoiceData.tax_total > 0 && ` + Tax (${formatCurrency(invoiceData.tax_total, invoiceData.currency)})`}
                            {invoiceData.shipping_total > 0 && ` + Shipping (${formatCurrency(invoiceData.shipping_total, invoiceData.currency)})`}
                            {invoiceData.other_charges_total > 0 && ` + Other (${formatCurrency(invoiceData.other_charges_total, invoiceData.currency)})`}
                            {invoiceData.discount_total > 0 && ` - Discount (${formatCurrency(invoiceData.discount_total, invoiceData.currency)})`}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div></div>
                <div></div>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Information Section */}
        {!hidePaymentSection && (
        <div>
          <div className="relative px-4 py-3 border-t border-b border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-purple-600" />
              <h3 className="text-xs font-semibold text-gray-950 uppercase tracking-wide">Payment Information</h3>
            </div>
            {!forceReadOnly && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="absolute right-4 top-1/2 -translate-y-1/2 px-2 py-1 text-xs font-medium rounded border transition-colors bg-white text-purple-900 border-purple-900 hover:bg-gray-50"
              >
                Edit
              </button>
            )}
          </div>
          <div className="px-10 py-4 bg-white">
            <div className={`grid ${getGridCols()} gap-4`}>
              <div>
                <label className="flex items-center text-xs font-medium text-gray-700 mb-1 min-h-[20px]">
                  Payment Method
                </label>
                {isEditing ? (
                  <ValidatedEditableField
                    value={editedData.payment_method}
                    onChange={(value) => handleFieldChange('payment_method', value)}
                    type="select"
                    required={false}
                    fieldName="payment_method"
                    options={[
                      { value: 'bank_transfer', label: 'Bank Transfer' },
                      { value: 'check', label: 'Check' },
                      { value: 'credit_card', label: 'Credit Card' },
                      { value: 'ach', label: 'ACH' },
                      { value: 'wire', label: 'Wire Transfer' },
                      { value: 'cash', label: 'Cash' }
                    ]}
                  />
                ) : (
                  <p className="text-sm font-medium text-gray-950">
                    {invoiceData.payment_method
                      ? invoiceData.payment_method.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
                      : 'Not specified'
                    }
                  </p>
                )}
              </div>
              <div>
                <label className="flex items-center text-xs font-medium text-gray-700 mb-1 min-h-[20px]">
                  Payment Terms
                  <ValidationIndicator validations={[...errors, ...warnings]} field="payment_terms" />
                </label>
                {isEditing ? (
                  <EditableField
                    value={editedData.terms_text}
                    onChange={(value) => handleFieldChange('terms_text', value)}
                    type="text"
                  />
                ) : (
                  <p className="text-sm font-medium text-gray-950">{invoiceData.terms_text || 'Net 30'}</p>
                )}
              </div>
              <div>
                <label className="flex items-center text-xs font-medium text-gray-700 mb-1 min-h-[20px]">
                  Due Date
                  <ValidationIndicator validations={[...errors, ...warnings]} field="due_date" />
                </label>
                {isEditing ? (
                  <ValidatedEditableField
                    value={editedData.due_date}
                    onChange={(value) => handleFieldChange('due_date', value)}
                    type="date"
                    required={true}
                    fieldName="due_date"
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-950">{formatDate(invoiceData.due_date)}</p>
                    {(() => {
                      const aging = getAgingInfo(invoiceData.due_date);
                      return aging ? (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${aging.color}`}>
                          {aging.text}
                        </span>
                      ) : null;
                    })()}
                  </div>
                )}
              </div>
              {invoiceData.vendor_address_snapshot && (
                <div className={getFullSpan()}>
                  <label className="flex items-center text-xs font-medium text-gray-700 mb-1 min-h-[20px]">Billing Address</label>
                  <p className="text-sm font-medium text-gray-950 whitespace-pre-line">
                    {formatVendorAddress(invoiceData.vendor_address_snapshot)}
                  </p>
                </div>
              )}
              {invoiceData.payment_bank_details && Object.keys(invoiceData.payment_bank_details).some(key => invoiceData.payment_bank_details[key]) && (
                <div className={`${getFullSpan()} mt-3`}>
                  <label className="flex items-center text-xs font-medium text-gray-700 mb-2 min-h-[20px]">Bank Details</label>
                  <div className="bg-gray-50 rounded-md p-3 space-y-2">
                    {/* Check if bank details are unverified */}
                    {invoiceData.validation_warnings?.some((w: any) =>
                      w.field === 'payment_bank_details' && w.category === 'risk'
                    ) && (
                      <div className="flex items-center gap-2 mb-2">
                        <Tooltip.Provider>
                          <Tooltip.Root>
                            <Tooltip.Trigger asChild>
                              <Badge variant="destructive" className="bg-red-50 text-red-700 border-red-200 hover:bg-red-100 cursor-help">
                                Unverified
                              </Badge>
                            </Tooltip.Trigger>
                            <Tooltip.Portal>
                              <Tooltip.Content
                                className="bg-gray-900 text-white px-2 py-1 rounded text-xs max-w-xs z-50"
                                sideOffset={5}
                              >
                                Bank details differ from vendor&apos;s registered account
                                <Tooltip.Arrow className="fill-gray-900" />
                              </Tooltip.Content>
                            </Tooltip.Portal>
                          </Tooltip.Root>
                        </Tooltip.Provider>
                      </div>
                    )}
                    {invoiceData.payment_bank_details.bank_name && (
                      <div className="flex gap-2">
                        <span className="text-xs font-medium text-gray-600 min-w-[100px]">Bank Name:</span>
                        <span className="text-xs font-medium text-gray-950">{invoiceData.payment_bank_details.bank_name}</span>
                      </div>
                    )}
                    {invoiceData.payment_bank_details.account_name && (
                      <div className="flex gap-2">
                        <span className="text-xs font-medium text-gray-600 min-w-[100px]">Account Name:</span>
                        <span className="text-xs font-medium text-gray-950">{invoiceData.payment_bank_details.account_name}</span>
                      </div>
                    )}
                    {invoiceData.payment_bank_details.account_number && (
                      <div className="flex gap-2">
                        <span className="text-xs font-medium text-gray-600 min-w-[100px]">Account No:</span>
                        <span className="text-xs font-medium text-gray-950">{invoiceData.payment_bank_details.account_number}</span>
                      </div>
                    )}
                    {invoiceData.payment_bank_details.sort_code && (
                      <div className="flex gap-2">
                        <span className="text-xs font-medium text-gray-600 min-w-[100px]">Sort Code:</span>
                        <span className="text-xs font-medium text-gray-950">{invoiceData.payment_bank_details.sort_code}</span>
                      </div>
                    )}
                    {invoiceData.payment_bank_details.iban && (
                      <div className="flex gap-2">
                        <span className="text-xs font-medium text-gray-600 min-w-[100px]">IBAN:</span>
                        <span className="text-xs font-medium text-gray-950">{invoiceData.payment_bank_details.iban}</span>
                      </div>
                    )}
                    {invoiceData.payment_bank_details.swift_bic && (
                      <div className="flex gap-2">
                        <span className="text-xs font-medium text-gray-600 min-w-[100px]">SWIFT/BIC:</span>
                        <span className="text-xs font-medium text-gray-950">{invoiceData.payment_bank_details.swift_bic}</span>
                      </div>
                    )}
                    {invoiceData.payment_bank_details.routing_number && (
                      <div className="flex gap-2">
                        <span className="text-xs font-medium text-gray-600 min-w-[100px]">Routing No:</span>
                        <span className="text-xs font-medium text-gray-950">{invoiceData.payment_bank_details.routing_number}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        )}

        {/* Accounting Classification Section */}
        {!hideAccountingSection && (
        <div>
          <div className="px-4 py-3 border-t border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-purple-600" />
                <h3 className="text-xs font-semibold text-gray-950 uppercase tracking-wide">Accounting Classification</h3>
              </div>
              <div className="flex items-center gap-3">
                {invoiceData.ai_classification_confidence && (
                  <div className="flex items-center gap-1.5">
                    <Brain className="h-3.5 w-3.5 text-purple-600" />
                    <span className="text-xs font-medium text-purple-700">
                      AI Confidence: {(invoiceData.ai_classification_confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                )}
                {!forceReadOnly && !isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-2 py-1 text-xs font-medium rounded border transition-colors bg-white text-purple-900 border-purple-900 hover:bg-gray-50"
                  >
                    Edit
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="px-10 py-4 bg-white">
            <div className={`grid ${getGridCols()} gap-4`}>
              <div>
                <label className="flex items-center text-xs font-medium text-gray-700 mb-1 min-h-[20px]">
                  Ledger Account
                  <ValidationIndicator validations={[...errors, ...warnings]} field="ledger" />
                </label>
                {isEditing ? (
                  <EditableField
                    value={editedData.ledger || 'Accounts Payable'}
                    onChange={(value) => handleFieldChange('ledger', value)}
                    type="select"
                    options={LEDGER_OPTIONS.map(opt => ({ value: opt.value, label: opt.label }))}
                  />
                ) : (
                  <p className="text-sm font-medium text-gray-950">
                    {invoiceData.ledger || 'Accounts Payable'}
                  </p>
                )}
              </div>
              <div>
                <label className="flex items-center text-xs font-medium text-gray-700 mb-1 min-h-[20px]">
                  Cost Center
                </label>
                {isEditing ? (
                  <EditableField
                    value={editedData.cost_center || ''}
                    onChange={(value) => handleFieldChange('cost_center', value)}
                    type="select"
                    options={[
                      { value: '', label: 'None' },
                      ...COST_CENTER_OPTIONS.map(opt => ({ value: opt.value, label: opt.label }))
                    ]}
                  />
                ) : (
                  <p className="text-sm font-medium text-gray-950">
                    {invoiceData.cost_center ? 
                      `${invoiceData.cost_center}${invoiceData.cost_center_name ? ` - ${invoiceData.cost_center_name}` : ''}` 
                      : 'Not assigned'}
                  </p>
                )}
              </div>
              <div>
                <label className="flex items-center text-xs font-medium text-gray-700 mb-1 min-h-[20px]">
                  GL Code
                </label>
                {isEditing ? (
                  <ValidatedEditableField
                    value={editedData.gl_code || ''}
                    onChange={(value) => handleFieldChange('gl_code', value)}
                    type="text"
                    required={false}
                    fieldName="gl_code"
                    placeholder="e.g., 6210"
                  />
                ) : (
                  <p className="text-sm font-medium text-gray-950">
                    {invoiceData.gl_code || 'Not assigned'}
                  </p>
                )}
              </div>
              <div>
                <label className="flex items-center text-xs font-medium text-gray-700 mb-1 min-h-[20px]">Department</label>
                {isEditing ? (
                  <ValidatedEditableField
                    value={editedData.department || ''}
                    onChange={(value) => handleFieldChange('department', value)}
                    type="text"
                    required={false}
                    fieldName="department"
                    placeholder="e.g., Finance, Engineering"
                  />
                ) : (
                  invoiceData.department ? (
                    <p className="text-sm font-medium text-gray-950">{invoiceData.department}</p>
                  ) : (
                    <p className="text-sm text-gray-500">Not assigned</p>
                  )
                )}
              </div>
              {invoiceData.accounting_notes && (
                <div className={getFullSpan()}>
                  <label className="flex items-center text-xs font-medium text-gray-700 mb-1 min-h-[20px]">Accounting Notes</label>
                  {isEditing ? (
                    <EditableField
                      value={editedData.accounting_notes || ''}
                      onChange={(value) => handleFieldChange('accounting_notes', value)}
                      type="textarea"
                      placeholder="Add accounting notes..."
                    />
                  ) : (
                    <p className="text-sm font-medium text-gray-950">{invoiceData.accounting_notes}</p>
                  )}
                </div>
              )}
              {invoiceData.ai_classification_reasoning && !isEditing && (
                <div className={getFullSpan()}>
                  <button
                    onClick={() => setShowAIReasoning(!showAIReasoning)}
                    className="flex items-center gap-2 text-xs font-medium text-gray-600 hover:text-gray-800 transition-colors mb-2"
                  >
                    {showAIReasoning ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    AI Classification Reasoning
                  </button>
                  {showAIReasoning && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 transition-all">
                      <p className="text-sm text-gray-950 leading-relaxed">
                        {invoiceData.ai_classification_reasoning}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        )}

        {/* Document Links Section */}
        <div>
          <div className="relative px-4 py-3 border-t border-b border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-purple-600" />
              <h3 className="text-xs font-semibold text-gray-950 uppercase tracking-wide">Document Links</h3>
            </div>
            {/* Action buttons - positioned absolutely */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
              {!forceReadOnly && !isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-2 py-1 text-xs font-medium rounded border transition-colors bg-white text-purple-900 border-purple-900 hover:bg-gray-50"
                >
                  Edit
                </button>
              )}
              <button
                className="inline-flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 transition-colors"
                onClick={() => setIsPOSearchModalOpen(true)}
              >
                <Link2 className="h-3.5 w-3.5" />
                <span>Link Document</span>
              </button>
            </div>
          </div>
          <div className="px-10 py-4 bg-white">
            {/* Check if any documents are linked */}
            {(editedData.po_numbers_cached?.length > 0 || editedData.gr_numbers_cached?.length > 0) ? (
              <div className="space-y-4">
                {/* Purchase Orders Section */}
                {editedData.po_numbers_cached?.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">Purchase Orders</label>
                    <div className="flex flex-wrap gap-2">
                      {editedData.po_numbers_cached.map((poNumber: string) => (
                        <LinkedDocumentPill
                          key={poNumber}
                          type="PO"
                          number={poNumber}
                          onClick={() => handlePOPillClick(poNumber)}
                          onRemove={() => handleUnlinkPO(poNumber)}
                          isEditable={isEditing}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Goods Receipts Section */}
                {editedData.gr_numbers_cached?.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">Goods Receipts</label>
                    <div className="flex flex-wrap gap-2">
                      {editedData.gr_numbers_cached.map((grNumber: string) => (
                        <LinkedDocumentPill
                          key={grNumber}
                          type="GR"
                          number={grNumber}
                          onClick={() => {/* GR drawer not implemented yet */}}
                          onRemove={() => {/* GR unlink not implemented yet */}}
                          isEditable={false}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Empty State */
              <div className="flex flex-col items-center justify-center py-8">
                <FileText className="h-10 w-10 text-gray-400 mb-3" />
                <p className="text-sm font-medium text-gray-950 mb-1">No Linked Documents</p>
                <p className="text-xs text-gray-500 text-center max-w-sm">
                  No purchase orders or goods receipts have been linked to this invoice yet.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Action Bar - Only shown in edit mode */}
      {isEditing && !hideFloatingSaveButton && (
        <div className="sticky bottom-0 w-full bg-white border-t border-gray-200 px-4 py-3 flex items-center justify-end gap-3 z-40">
          {!forceEditMode && (
            <button
              onClick={handleCancel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-all"
            >
              <X className="h-4 w-4" />
              <span className="font-medium">Cancel</span>
            </button>
          )}
          <button
            onClick={() => setIsEditing(false)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-purple-900 text-white rounded-md hover:bg-purple-800 transition-all"
          >
            <Check className="h-4 w-4" />
            <span className="font-medium">Save</span>
          </button>
        </div>
      )}

      {/* PO Details Drawer */}
      <PODetailsDrawer
        poNumber={selectedPONumber}
        isOpen={isPODrawerOpen}
        onClose={() => setIsPODrawerOpen(false)}
      />

      {/* PO Search Modal */}
      <POSearchModal
        isOpen={isPOSearchModalOpen}
        onClose={() => setIsPOSearchModalOpen(false)}
        onLinkPO={handleLinkPO}
        vendorId={editedData.vendor_id}
        vendorName={editedData.vendor_name_snapshot}
      />
      </div>
    </Tooltip.Provider>
  );
}