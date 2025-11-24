'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Cookies from 'js-cookie';
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
  Sparkles,
  AlertCircle,
  Shield,
  Zap,
  Loader2,
  Maximize2,
  Minimize2,
  ClipboardList
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
import { TeachingCard } from '../TeachingCard';
import { PendingConfirmationIndicator } from '../PendingConfirmationIndicator';
import { useToast } from '@/app/components/ui/Toast';
import { FieldConfidencePill } from '../FieldConfidencePill';
import { AutoCorrectionIndicator } from '../AutoCorrectionIndicator';
import { CustomFieldIndicator } from '../CustomFieldIndicator';
import { CloseMatchPopover } from '../CloseMatchPopover';
import { BankDetailsVerificationPopover } from '../BankDetailsVerificationPopover';
import { VendorSwapPopover } from '../VendorSwapPopover';
import { AccountingAutoCodingPopover } from '../AccountingAutoCodingPopover';
import { FraudRiskBanner } from '../FraudRiskBanner';
import { AutoRejectBanner } from '../AutoRejectBanner';
import { PolicyDocumentDrawer } from '../PolicyDocumentDrawer';
import { LineItemsPreviewPanel } from '../preview/LineItemsPreviewPanel';
import {
  ValidationCard,
  ValidationCardContainer,
  ValidationSuccessCard,
  ValidationIssue,
  ValidationCategory
} from '../ValidationCard';

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
  onStartTeaching?: (fieldName: string) => void; // Trigger teaching mode for custom fields
  agentPendingFields?: {[key: string]: any}; // Agent-accepted fields pending confirmation
  isReprocessingField?: string | null; // Track which field is currently reprocessing
  onFieldAutoReprocess?: (field: string) => void; // Trigger auto-reprocess after field save
  matchResults?: any[]; // Match results for validation
  approvalLimit?: number; // Approval limit for validation
  poComparisonData?: any; // PO comparison data for validation
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
  onFieldFocus,
  onStartTeaching,
  agentPendingFields = {},
  isReprocessingField = null,
  onFieldAutoReprocess,
  matchResults = [],
  approvalLimit = 2500,
  poComparisonData
}: DetailsTabProps) {
  // Track which field's AI suggestion is expanded
  const [expandedSuggestion, setExpandedSuggestion] = useState<string | null>(null);
  // Track which field should be focused when entering edit mode
  const [fieldToFocus, setFieldToFocus] = useState<string | null>(null);
  // Track bottom bar visibility for staggered animation
  const [showBottomBar, setShowBottomBar] = useState(false);
  // Policy document drawer state
  const [isPolicyDrawerOpen, setIsPolicyDrawerOpen] = useState(false);
  const [policyLinkToView, setPolicyLinkToView] = useState<string | null>(null);
  // Toast notifications
  const { showToast } = useToast();
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
        return 'sm:col-span-2 lg:col-span-4';
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
  const [localFocusedField, setLocalFocusedField] = useState<string | null>(null);

  // Accordion collapse state
  const [isValidationExpanded, setIsValidationExpanded] = useState(false); // Start collapsed to avoid hydration mismatch
  const [isInvoiceInfoExpanded, setIsInvoiceInfoExpanded] = useState(true); // Start expanded
  const [isAdditionalDetailsExpanded, setIsAdditionalDetailsExpanded] = useState(false);
  const [isLineItemsExpanded, setIsLineItemsExpanded] = useState(true); // Start expanded
  const [isLineItemsFullscreen, setIsLineItemsFullscreen] = useState(false);
  const [isLineItemsEditMode, setIsLineItemsEditMode] = useState(false);
  const lineItemsContainerRef = useRef<HTMLDivElement>(null);

  // Toggle fullscreen for line items
  const toggleLineItemsFullscreen = () => {
    setIsLineItemsFullscreen(!isLineItemsFullscreen);
  };

  // Handle ESC key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isLineItemsFullscreen) {
        setIsLineItemsFullscreen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isLineItemsFullscreen]);

  // Read Validation Results expanded state from cookie after hydration
  useEffect(() => {
    const saved = Cookies.get('validationResultsExpanded');
    if (saved === 'true') {
      setIsValidationExpanded(true);
    }
  }, []);

  // Save Validation Results expanded state to cookie
  useEffect(() => {
    Cookies.set('validationResultsExpanded', String(isValidationExpanded), { expires: 365 });
  }, [isValidationExpanded]);

  // Notify parent when edit mode changes
  useEffect(() => {
    onEditModeChange?.(isEditing);
  }, [isEditing, onEditModeChange]);

  // Merge agent-pending fields into editedData when entering edit mode
  useEffect(() => {
    if (isEditing && Object.keys(agentPendingFields).length > 0) {
      setEditedData((prev: any) => ({
        ...prev,
        ...agentPendingFields
      }));
    }
  }, [isEditing, agentPendingFields]);

  // Clear fieldToFocus after entering edit mode (allow time for autofocus)
  useEffect(() => {
    if (isEditing && fieldToFocus) {
      const timer = setTimeout(() => {
        setFieldToFocus(null);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isEditing, fieldToFocus]);

  // Control bottom bar visibility with delay for staggered animation
  useEffect(() => {
    if (isEditing && !hideFloatingSaveButton) {
      // Delay showing the bar by 300ms to let layout settle
      const timer = setTimeout(() => {
        setShowBottomBar(true);
      }, 300);
      return () => clearTimeout(timer);
    } else if (showBottomBar) {
      // Delay hiding to allow exit animation to play (300ms)
      const timer = setTimeout(() => {
        setShowBottomBar(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isEditing, hideFloatingSaveButton, showBottomBar]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Document links state
  const [selectedPONumber, setSelectedPONumber] = useState<string | null>(null);
  const [isPODrawerOpen, setIsPODrawerOpen] = useState(false);
  const [isPOSearchModalOpen, setIsPOSearchModalOpen] = useState(false);
  const [isCloseMatchPopoverOpen, setIsCloseMatchPopoverOpen] = useState(false);
  const [isVendorSwapPopoverOpen, setIsVendorSwapPopoverOpen] = useState(false);
  const [isAutoCodingPopoverOpen, setIsAutoCodingPopoverOpen] = useState(false);

  // Bank details verification state
  const [isBankVerifyOpen, setIsBankVerifyOpen] = useState(false);

  // Field error tracking for needs info mode
  const { errors: fieldErrors, addError, removeError, clearErrors, validateRequired } = useFieldErrors();

  // Field refs for error navigation
  const fieldRefs = useRef<{ [key: string]: HTMLElement | null }>({});

  // Ref for Agent Suggestion card to detect clicks outside
  const suggestionCardRef = useRef<HTMLDivElement>(null);

  // Close Agent Suggestion card when clicking outside
  useEffect(() => {
    if (!expandedSuggestion) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Don't close if clicking the Agent Match button (let its onClick handle the toggle)
      if (target.closest('button')?.textContent?.includes('Match')) {
        return;
      }

      if (suggestionCardRef.current && !suggestionCardRef.current.contains(target)) {
        setExpandedSuggestion(null);
        if (onFieldFocus) {
          onFieldFocus(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [expandedSuggestion, onFieldFocus]);

  // Update edit state when props change
  useEffect(() => {
    const newEditState = getInitialEditState();
    setIsEditing(newEditState);
  }, [forceEditMode, forceReadOnly]);

  // Debug: Log fieldErrors whenever they change
  useEffect(() => {
    console.log('[DetailsTab] 📊 Final fieldErrors count:', fieldErrors.length);
    console.log('[DetailsTab] 📊 Field errors:', fieldErrors.map(e => `${e.field}: ${e.message}`));
  }, [fieldErrors]);

  // Validate required fields on mount for needs info mode or when showFieldErrors is true
  useEffect(() => {
    if ((forceEditMode && isEditing) || showFieldErrors) {
      // Use setTimeout to avoid state update issues
      const timer = setTimeout(() => {
        // Clear any existing errors first
        clearErrors();

        console.log('[DetailsTab] Starting validation for invoice:', invoiceData.id, invoiceData.invoice_number);
        console.log('[DetailsTab] Invoice type:', invoiceData.type);

        // Check all required fields (matching ValidatedEditableField required prop)
        const fieldsToCheck = [
          { field: 'invoice_number', label: 'Invoice Number', type: 'text' },
          { field: 'invoice_date', label: 'Invoice Date', type: 'date' },
          { field: 'vendor_name_snapshot', label: 'Vendor Name', type: 'text' },
          { field: 'vendor_tax_id_snapshot', label: 'Vendor Tax ID', type: 'text' },
          { field: 'po_numbers_cached', label: 'PO Number', type: 'array' },
          { field: 'job_number', label: 'Customer ID', type: 'text' },
          { field: 'vehicle_registration_no', label: 'Vehicle Registration No.', type: 'text' },
          { field: 'subtotal', label: 'Subtotal', type: 'currency' },
          { field: 'currency', label: 'Currency', type: 'text' },
          { field: 'total', label: 'Total', type: 'currency' },
        ];

        fieldsToCheck.forEach(({ field, label, type }) => {
          // Skip PO Number and Customer ID validation for Non-PO invoices
          if (invoiceData.type === 'Non-PO' && (field === 'po_numbers_cached' || field === 'job_number')) {
            console.log('[DetailsTab] Skipping field (Non-PO):', field);
            return;
          }

          // Skip Vehicle Registration No. for baseline and missing-po invoices (demo/testing scenarios)
          if (field === 'vehicle_registration_no' && (invoiceData.id?.startsWith('baseline-') || invoiceData.id?.startsWith('missing-po-'))) {
            console.log('[DetailsTab] Skipping field (baseline or missing-po invoice):', field);
            return;
          }

          // Check both editedData and agentPendingFields for value
          const value = agentPendingFields[field] || editedData[field];
          console.log('[DetailsTab] Checking field:', field, 'value:', value, 'type:', type);

          // Skip validation if field has an agent-pending value
          if (agentPendingFields[field]) {
            return; // Agent has provided a value, don't add error
          }

          // Special handling for vendor field - "Unknown Vendor" is considered invalid
          if (field === 'vendor_name_snapshot' && value === 'Unknown Vendor') {
            console.log('[DetailsTab] ❌ Adding error for:', field, '- Unknown Vendor');
            addError(field, `${label} is invalid (Unknown Vendor)`, fieldRefs.current[field]);
            return;
          }

          // Check based on field type
          if (type === 'array') {
            // For array fields like po_numbers_cached
            if (!value || (Array.isArray(value) && value.length === 0) || (Array.isArray(value) && !value[0])) {
              console.log('[DetailsTab] ❌ Adding error for:', field, '- array is empty');
              addError(field, `${label} is required`, fieldRefs.current[field]);
            }
          } else if (type === 'date') {
            // For date fields
            if (!value || value === '') {
              console.log('[DetailsTab] ❌ Adding error for:', field, '- date is missing');
              addError(field, `${label} is required`, fieldRefs.current[field]);
            } else {
              const date = new Date(value);
              if (isNaN(date.getTime())) {
                console.log('[DetailsTab] ❌ Adding error for:', field, '- date is invalid');
                addError(field, `${label} is invalid`, fieldRefs.current[field]);
              }
            }
          } else if (type === 'currency') {
            // For currency/number fields
            if (value === null || value === undefined || value === '' || isNaN(Number(value))) {
              console.log('[DetailsTab] ❌ Adding error for:', field, '- currency is invalid');
              addError(field, `${label} is required`, fieldRefs.current[field]);
            }
          } else {
            // For text fields
            if (!value || value.toString().trim().length === 0) {
              console.log('[DetailsTab] ❌ Adding error for:', field, '- text is empty');
              addError(field, `${label} is required`, fieldRefs.current[field]);
            }
          }
        });

        // Also add validation warnings with error severity to field errors
        if (invoiceData.validation_warnings && Array.isArray(invoiceData.validation_warnings)) {
          console.log('[DetailsTab] Checking validation_warnings:', invoiceData.validation_warnings.length, 'warnings');
          invoiceData.validation_warnings.forEach((warning: any) => {
            console.log('[DetailsTab] Warning:', warning.field, 'severity:', warning.severity);
            if (warning.severity === 'error') {
              console.log('[DetailsTab] ❌ Adding error from validation_warning:', warning.field);
              addError(
                warning.field,
                warning.message,
                fieldRefs.current[warning.field]
              );
            }
          });
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [forceEditMode, isEditing, showFieldErrors, invoiceData, agentPendingFields, editedData]); // Re-run when field values change

  // Run validations
  const validationResults = useMemo(() => {
    const validator = new InvoiceValidator(invoiceData);
    return validator.validate();
  }, [invoiceData]);

  const { errors, warnings, info } = validationResults;

  // Transform validation results into validation issues grouped by category (for accordion)
  const validationIssues = useMemo(() => {
    const issues: Record<ValidationCategory, ValidationIssue[]> = {
      financial: [],
      process: [],
      compliance: [],
      risk: [],
      data_quality: [],
      delivery: [],
    };

    // Add database validation warnings if they exist
    if (invoiceData?.validation_warnings && Array.isArray(invoiceData.validation_warnings)) {
      invoiceData.validation_warnings.forEach((warning: any, idx: number) => {
        const category = warning.category || 'risk';
        let detailsText = warning.details;

        // Format details if it's an object
        if (warning.details && typeof warning.details === 'object') {
          const parts = [];
          if (warning.details.expected_bank) {
            parts.push(`Expected: ${warning.details.expected_bank}`);
          }
          if (warning.details.received_bank) {
            parts.push(`Received: ${warning.details.received_bank}`);
          }
          if (warning.details.action) {
            parts.push(warning.details.action);
          }
          detailsText = parts.join('. ');
        }

        // Ensure severity is a valid value
        const validSeverities = ['error', 'warning', 'info', 'success'];
        const severity = validSeverities.includes(warning.severity) ? warning.severity : 'warning';

        issues[category as ValidationCategory].push({
          id: `db-warning-${idx}`,
          field: warning.field,
          message: warning.message,
          details: detailsText,
          severity,
          category: category as ValidationCategory,
        });
      });
    }

    // Add invoice validation errors/warnings
    if (validationResults) {
      [...validationResults.errors, ...validationResults.warnings].forEach((validation, idx) => {
        let category: ValidationCategory = 'data_quality';

        // Categorize based on field or message
        if (validation.field === 'due_date' || validation.field === 'invoice_date') {
          category = 'compliance';
        } else if (validation.field === 'total' || validation.field === 'subtotal' || validation.field === 'tax_total') {
          category = 'financial';
        } else if (validation.field === 'vendor_name_snapshot' || validation.field === 'po_numbers' || validation.field === 'po_numbers_cached') {
          category = 'process';
        } else if (validation.field === 'vendor_approval_status') {
          category = 'compliance';
        } else if ((validation as any).category) {
          // Use the category from the validation itself if provided
          category = (validation as any).category as ValidationCategory;
        }

        issues[category].push({
          id: `validation-${idx}`,
          field: validation.field,
          message: validation.message,
          details: (validation as any).details,
          expectedValue: (validation as any).expectedValue,
          actualValue: (validation as any).actualValue,
          severity: validation.severity,
          category,
        });
      });
    }

    return issues;
  }, [invoiceData, validationResults]);

  // Check if all validations passed (no errors or warnings)
  const allValidationsPassed = Object.values(validationIssues).every(
    categoryIssues => categoryIssues.length === 0
  );

  // Count total errors and warnings
  const validationCounts = useMemo(() => {
    let errorCount = 0;
    let warningCount = 0;
    Object.values(validationIssues).forEach(categoryIssues => {
      categoryIssues.forEach(issue => {
        if (issue.severity === 'error') errorCount++;
        else if (issue.severity === 'warning') warningCount++;
      });
    });
    return { errorCount, warningCount };
  }, [validationIssues]);

  // Count errors in Additional Details section (payment and coding fields)
  const additionalDetailsErrorCount = useMemo(() => {
    const additionalDetailsFields = [
      'payment_method',
      'terms_text',
      'due_date',
      'payment_bank_details',
      'ledger',
      'cost_center'
    ];

    let errorCount = 0;

    // Count field errors
    errorCount += fieldErrors.filter(err =>
      additionalDetailsFields.includes(err.field)
    ).length;

    // Count validation warnings for these fields (including risk warnings like bank details changes)
    if (invoiceData.validation_warnings && Array.isArray(invoiceData.validation_warnings)) {
      errorCount += invoiceData.validation_warnings.filter((w: any) =>
        additionalDetailsFields.includes(w.field)
      ).length;
    }

    return errorCount;
  }, [fieldErrors, invoiceData.validation_warnings]);

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
  // Excludes fields that are agent-pending (accepted but not yet saved)
  const hasFieldError = (fieldName: string) => {
    // If field has agent-pending value, don't treat it as an error
    if (agentPendingFields[fieldName]) {
      return false;
    }
    return fieldErrors.some(e => e.field === fieldName);
  };

  // Helper function to check if a field has AI candidates
  const hasFieldCandidate = (fieldName: string) => {
    const candidates = invoiceData?.ocr_extractions?.[fieldName]?.candidates || [];
    return candidates.length > 0 && onFieldAccept && onFieldReject;
  };

  // Helper function to get auto-correction info for a field
  const getAutoCorrection = (fieldName: string) => {
    if (!invoiceData?.auto_corrections || !Array.isArray(invoiceData.auto_corrections)) {
      return null;
    }
    return invoiceData.auto_corrections.find((correction: any) => correction.field === fieldName);
  };

  // Helper to get read-only field styling with error highlighting
  const getReadOnlyFieldClass = (fieldName: string, defaultValue?: string) => {
    const baseClass = 'text-sm font-medium';
    if (showFieldErrors && hasFieldError(fieldName)) {
      return `${baseClass} text-red-700 border border-red-500 px-2 bg-red-50 py-1 rounded cursor-pointer hover:bg-red-100 transition-colors`;
    }
    return `${baseClass} text-gray-950`;
  };

  // Render a field - either as editable or read-only with click-to-edit
  const renderField = (fieldName: string, fieldValue: any, fieldType: 'text' | 'date' | 'currency' | 'select', label: string, options?: any[]) => {
    const shouldAllowEdit = showFieldErrors && hasFieldError(fieldName) && !forceReadOnly;
    const autoCorrection = getAutoCorrection(fieldName);

    if (shouldAllowEdit) {
      return (
        <div className="flex items-center">
          <p
            className={getReadOnlyFieldClass(fieldName)}
            onClick={() => {
              setFieldToFocus(fieldName);
              setIsEditing(true);
            }}
            title="Click to edit all fields"
          >
            {fieldValue || '--'}
          </p>
          {autoCorrection && (
            <AutoCorrectionIndicator
              fieldLabel={label}
              originalValue={autoCorrection.original_value}
              correctedValue={autoCorrection.corrected_value}
              reason={autoCorrection.reason}
              vendorName={autoCorrection.vendor_name}
              recentDocuments={autoCorrection.recent_documents}
              documentType={autoCorrection.document_type}
              fieldName={fieldName}
              onFieldFocus={onFieldFocus}
            />
          )}
        </div>
      );
    }

    return (
      <div className="flex items-center">
        <p className={getReadOnlyFieldClass(fieldName)}>
          {fieldValue || '--'}
        </p>
        {autoCorrection && (
          <AutoCorrectionIndicator
            fieldLabel={label}
            originalValue={autoCorrection.original_value}
            correctedValue={autoCorrection.corrected_value}
            reason={autoCorrection.reason}
            vendorName={autoCorrection.vendor_name}
            recentDocuments={autoCorrection.recent_documents}
            documentType={autoCorrection.document_type}
            fieldName={fieldName}
            onFieldFocus={onFieldFocus}
          />
        )}
      </div>
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
        setEditedData(result);
        onUpdate?.(result);
        removeError(field);

        // Trigger auto-reprocess for Customer ID field
        if (field === 'job_number' && onFieldAutoReprocess) {
          onFieldAutoReprocess(field);
        }
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
      setEditedData((prev: any) => ({
        ...prev,
        [field]: invoiceData[field],
      }));
    }
  };

  // Handle field focus for document highlighting
  const handleFieldFocus = (fieldName: string) => {
    setLocalFocusedField(fieldName);
    onFieldFocus?.(fieldName);
  };

  // Handle field blur to clear document highlighting
  const handleFieldBlur = () => {
    setLocalFocusedField(null);
    onFieldFocus?.(null);
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
        const errorText = await response.text();
        console.error('Failed to save changes:', response.status, errorText);
        alert(`Failed to save: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('Error saving changes:', error);
      alert(`Error saving changes: ${error}`);
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

  // Helper function to accept a PO number and update state
  const acceptPONumber = (poNumber: string) => {
    // Extract PO ID from PO number (e.g., 'PO-2025-8901' -> '8901')
    const poId = poNumber.split('-').pop() || '';

    // Update line items to include po_line_id references
    const updatedLines = invoiceData.lines?.map((line: any, index: number) => ({
      ...line,
      po_line_id: `po-line-${poId}-${line.line_no || index + 1}`
    })) || [];

    // Update invoice data with the accepted PO
    const updatedData = {
      ...invoiceData,
      po_numbers_cached: [poNumber],
      po_id: `po-${poId}`,
      // Update match_status to 'matched' when PO is accepted
      match_status: 'matched',
      // Clear issues array since PO is now matched
      issues: [],
      // Update line items with PO references
      lines: updatedLines,
      invoice_lines: updatedLines,
      // Remove the close_match_po suggestion since it's been accepted
      close_match_po: undefined,
      // Remove validation warnings for this field
      validation_warnings: invoiceData.validation_warnings?.filter(
        w => w.field !== 'po_numbers_cached'
      ) || [],
      // Remove confidence indicator after acceptance
      extraction_field_confidences: {
        ...invoiceData.extraction_field_confidences,
        po_numbers_cached: undefined
      }
    };

    // Update edited data state
    setEditedData(updatedData);

    // Notify parent component with the update
    onUpdate?.(updatedData);

    // Notify field acceptance for purple dot and reprocessing banner (pass array value)
    onFieldAccept?.('po_numbers_cached', [poNumber]);

    console.log(`Accepted PO: ${poNumber}`);
  };

  const handleLinkPO = (poNumber: string) => {
    // Use the same logic as accepting from the close match popover
    acceptPONumber(poNumber);
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

  // Computed values for field display - prioritize editedData over invoiceData
  const displayPONumber = editedData.po_numbers_cached?.[0] || invoiceData.po_numbers_cached?.[0] || '';
  const hasPONumber = displayPONumber.length > 0;

  return (
    <Tooltip.Provider>
      <div className="h-full flex flex-col relative">
        {/* Scrollable Content Area - Now takes full height */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto relative">
          {/* Fraud Risk Banner - Show when fraud risk is triggered */}
          {invoiceData.fraud_risk?.triggered && (
            <FraudRiskBanner
              fraudRisk={invoiceData.fraud_risk}
              vendorName={invoiceData.vendor_name_snapshot}
              onViewPolicy={(policyLink) => {
                setPolicyLinkToView(policyLink);
                setIsPolicyDrawerOpen(true);
              }}
            />
          )}

          {/* Auto-Reject Banner - Show when invoice is auto-rejected */}
          {invoiceData.status === 'auto_rejected' && invoiceData.auto_reject_reason && (
            <AutoRejectBanner
              autoRejectReason={invoiceData.auto_reject_reason}
              autoRejectDate={invoiceData.auto_reject_date || ''}
              autoRejectRule={invoiceData.auto_reject_rule || ''}
              duplicateOfInvoice={invoiceData.duplicate_of_invoice}
              invoiceNumber={invoiceData.invoice_number || ''}
              vendorName={invoiceData.vendor_name_snapshot}
              helpdeskTicketRef={invoiceData.helpdesk_ticket_ref}
            />
          )}

          {/* Field Error Indicator - Show when editing OR when showFieldErrors is true */}
          {/* Show purple variant when agent changes pending, red variant when errors exist */}
          {((forceEditMode && isEditing) || showFieldErrors) && (fieldErrors.length > 0 || Object.keys(agentPendingFields).length > 0) && (
            <FieldErrorIndicator
              errors={fieldErrors}
              onDismiss={clearErrors}
              readOnly={forceReadOnly || showFieldErrors}
              hasPendingAgentChanges={Object.keys(agentPendingFields).length > 0}
              isEditing={isEditing}
              hasFraudRisk={invoiceData.fraud_risk?.triggered || false}
            />
          )}

        {/* Validation Results Accordion */}
        {!allValidationsPassed && (
          <div>
            <div
              className="relative px-4 py-2.5 border-b border-gray-200 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => setIsValidationExpanded(!isValidationExpanded)}
            >
              <div className="flex items-center gap-2">
                {isValidationExpanded ? (
                  <ChevronUp className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                )}
                <AlertTriangle className={`h-4 w-4 ${validationCounts.errorCount > 0 ? 'text-red-600' : 'text-purple-600'}`} />
                <h3 className="text-xs font-semibold text-gray-950 uppercase tracking-wide">Validation Results</h3>
                {validationCounts.errorCount > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                    {validationCounts.errorCount} exception{validationCounts.errorCount !== 1 ? 's' : ''}
                  </span>
                )}
                {validationCounts.warningCount > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                    {validationCounts.warningCount} warning{validationCounts.warningCount !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
            {isValidationExpanded && (
              <div className="px-4 py-3 bg-white border-b border-gray-200">
                <ValidationCardContainer>
                  {validationIssues.financial.length > 0 && (
                    <ValidationCard
                      category="financial"
                      issues={validationIssues.financial}
                      defaultExpanded={true}
                      compact={true}
                    />
                  )}
                  {validationIssues.process.length > 0 && (
                    <ValidationCard
                      category="process"
                      issues={validationIssues.process}
                      defaultExpanded={true}
                      compact={true}
                    />
                  )}
                  {validationIssues.compliance.length > 0 && (
                    <ValidationCard
                      category="compliance"
                      issues={validationIssues.compliance}
                      defaultExpanded={true}
                      compact={true}
                    />
                  )}
                  {validationIssues.risk.length > 0 && (
                    <ValidationCard
                      category="risk"
                      issues={validationIssues.risk}
                      defaultExpanded={true}
                      compact={true}
                    />
                  )}
                  {validationIssues.data_quality.length > 0 && (
                    <ValidationCard
                      category="data_quality"
                      issues={validationIssues.data_quality}
                      defaultExpanded={true}
                      compact={true}
                    />
                  )}
                  {validationIssues.delivery.length > 0 && (
                    <ValidationCard
                      category="delivery"
                      issues={validationIssues.delivery}
                      defaultExpanded={true}
                      compact={true}
                    />
                  )}
                </ValidationCardContainer>
              </div>
            )}
          </div>
        )}

        {/* Invoice Header Section */}
        <div>
          <div
            className="relative px-4 py-3 border-b border-gray-200 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
            onClick={() => setIsInvoiceInfoExpanded(!isInvoiceInfoExpanded)}
          >
            <div className="flex items-center gap-2">
              {isInvoiceInfoExpanded ? (
                <ChevronUp className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-500" />
              )}
              <File className="h-4 w-4 text-purple-600" />
              <h3 className="text-xs font-semibold text-gray-950 uppercase tracking-wide">Invoice Header</h3>
            </div>
            {!forceReadOnly && !isEditing && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(true);
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 px-2 py-1 text-xs font-medium rounded border transition-colors bg-white text-purple-900 border-purple-900 hover:bg-gray-50"
              >
                Edit
              </button>
            )}
          </div>
          {isInvoiceInfoExpanded && (
          <div className="px-10 py-3 bg-white border-b border-gray-200">
            <div className={`grid ${getGridCols()} gap-x-4 gap-y-3`}>
              <div ref={(el) => fieldRefs.current['invoice_number'] = el} className="relative">
                <label className="flex items-center justify-between text-xs font-medium text-gray-700 mb-0 min-h-[16px]">
                  <span className="flex items-center">
                    Invoice Number
                    <FieldConfidencePill confidence={invoiceData.extraction_field_confidences?.invoice_number} isEditMode={isEditing} hasValue={!!invoiceData.invoice_number} />
                  </span>
                  {hasFieldCandidate('invoice_number') && !invoiceData.invoice_number && !agentPendingFields['invoice_number'] && (
                    <button
                      onClick={() => {
                        const newExpanded = expandedSuggestion === 'invoice_number' ? null : 'invoice_number';
                        setExpandedSuggestion(newExpanded);
                        if (onFieldFocus) {
                          onFieldFocus(newExpanded);
                        }
                      }}
                      className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 transition-colors"
                    >
                      <Sparkles className="h-3 w-3" />
                      Match Found
                    </button>
                  )}
                </label>
                {isEditing ? (
                  <ValidatedEditableField
                    value={agentPendingFields['invoice_number'] || editedData.invoice_number}
                    onChange={(value) => handleFieldChange('invoice_number', value)}
                    type="text"
                    required={true}
                    fieldName="invoice_number"
                    autoFocus={fieldToFocus === 'invoice_number'}
                    onFocus={() => handleFieldFocus('invoice_number')}
                    onBlur={handleFieldBlur}
                  />
                ) : agentPendingFields['invoice_number'] ? (
                  <div className="flex items-center">
                    <p className="text-sm font-medium text-gray-950">
                      {agentPendingFields['invoice_number']}
                    </p>
                    <PendingConfirmationIndicator />
                  </div>
                ) : (
                  (() => {
                    const hasValue = invoiceData.invoice_number;
                    const shouldAllowEdit = showFieldErrors && hasFieldError('invoice_number') && !forceReadOnly && !hasValue;

                    if (shouldAllowEdit) {
                      // Show red clickable field for errors
                      return (
                        <p
                          className={getReadOnlyFieldClass('invoice_number')}
                          onClick={() => {
                            setFieldToFocus('invoice_number');
                            setIsEditing(true);
                          }}
                          title="Click to edit all fields"
                        >
                          {invoiceData.invoice_number || '--'}
                        </p>
                      );
                    }

                    // Show value without purple dot (purple dot only shown when in agentPendingFields)
                    if (hasValue) {
                      const autoCorrection = getAutoCorrection('invoice_number');
                      return (
                        <div className="flex items-center">
                          <p className="text-sm font-medium text-gray-950">
                            {invoiceData.invoice_number}
                          </p>
                          {autoCorrection && (
                            <AutoCorrectionIndicator
                              fieldLabel="Invoice Number"
                              originalValue={autoCorrection.original_value}
                              correctedValue={autoCorrection.corrected_value}
                              reason={autoCorrection.reason}
                              vendorName={autoCorrection.vendor_name}
                              recentDocuments={autoCorrection.recent_documents}
                              documentType={autoCorrection.document_type}
                              fieldName="invoice_number"
                              onFieldFocus={onFieldFocus}
                            />
                          )}
                        </div>
                      );
                    }

                    // Show placeholder
                    return <p className="text-sm font-medium text-gray-950">--</p>;
                  })()
                )}
                {!invoiceData.invoice_number && !agentPendingFields['invoice_number'] && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-red-600">
                    <AlertTriangle className="h-3 w-3" />
                    <span>Value not found</span>
                  </div>
                )}
                {expandedSuggestion === 'invoice_number' && hasFieldCandidate('invoice_number') && (
                  <div ref={suggestionCardRef} className="absolute top-full left-0 mt-2 z-50 w-full min-w-[320px] max-w-md">
                    <AISuggestionCard
                      candidate={invoiceData.ocr_extractions?.invoice_number?.candidates[0]}
                      fieldLabel="Invoice Number"
                      onAccept={() => {
                        onFieldAccept!('invoice_number', invoiceData.ocr_extractions?.invoice_number?.candidates[0].value);
                        setExpandedSuggestion(null);
                        showToast('Invoice number accepted and saved for future invoices.', 'success');
                      }}
                      onReject={() => {
                        onFieldReject!('invoice_number');
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
              <div ref={(el) => fieldRefs.current['invoice_date'] = el}>
                <label className="flex items-center text-xs font-medium text-gray-700 mb-0 min-h-[16px]">
                  <span className="flex items-center">
                    Invoice Date
                    <FieldConfidencePill confidence={invoiceData.extraction_field_confidences?.invoice_date} isEditMode={isEditing} />
                  </span>
                  <ValidationIndicator validations={[...errors, ...warnings]} field="invoice_date" isEditing={isEditing} />
                </label>
                {isEditing ? (
                  <ValidatedEditableField
                    value={editedData.invoice_date}
                    onChange={(value) => handleFieldChange('invoice_date', value)}
                    type="date"
                    required={true}
                    fieldName="invoice_date"
                    onFocus={() => handleFieldFocus('invoice_date')}
                    onBlur={handleFieldBlur}
                  />
                ) : (
                  renderField('invoice_date', formatDate(invoiceData.invoice_date), 'date', 'Invoice Date')
                )}
              </div>
              <div>
                <label className="flex items-center text-xs font-medium text-gray-700 mb-0 min-h-[16px]">
                  <span className="flex items-center">
                    Due Date
                    <FieldConfidencePill confidence={invoiceData.extraction_field_confidences?.due_date} isEditMode={isEditing} />
                  </span>
                  <ValidationIndicator validations={[...errors, ...warnings]} field="due_date" isEditing={isEditing} />
                </label>
                {isEditing ? (
                  <ValidatedEditableField
                    value={editedData.due_date}
                    onChange={(value) => handleFieldChange('due_date', value)}
                    type="date"
                    required={true}
                    fieldName="due_date"
                    onFocus={() => handleFieldFocus('due_date')}
                    onBlur={handleFieldBlur}
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
                <label className="text-xs font-medium text-gray-700 mb-px">
                  <div className="flex items-center gap-3 min-h-[20px]">
                    <span className="flex items-center">
                      Vendor
                      <FieldConfidencePill confidence={invoiceData.extraction_field_confidences?.vendor_name_snapshot} isEditMode={isEditing} />
                    </span>
                    {/* Vendor Swap Suggestion */}
                    {!isEditing && invoiceData.ocr_extractions?.vendor_name_snapshot?.candidates && invoiceData.ocr_extractions.vendor_name_snapshot.candidates.length > 0 && (
                      <VendorSwapPopover
                        currentVendor={invoiceData.vendor_name_snapshot}
                        vendorCandidates={invoiceData.ocr_extractions.vendor_name_snapshot.candidates}
                        explanation={invoiceData.ocr_extractions.vendor_name_snapshot.candidates[0].reason || 'AI suggests reassigning invoice based on analysis'}
                        open={isVendorSwapPopoverOpen}
                        onOpenChange={setIsVendorSwapPopoverOpen}
                        onAddVendor={(selectedVendor: string) => {
                          // Update the vendor field value with the selected vendor
                          const updatedData = { ...invoiceData };
                          updatedData.vendor_name_snapshot = selectedVendor;

                          // Remove the candidates after accepting
                          if (updatedData.ocr_extractions?.vendor_name_snapshot) {
                            updatedData.ocr_extractions.vendor_name_snapshot.candidates = [];
                          }

                          // Clear any validation errors for vendor field
                          if (updatedData.validation_errors) {
                            updatedData.validation_errors = updatedData.validation_errors.filter(
                              (error: any) => error.field !== 'vendor_name_snapshot'
                            );
                          }

                          // Remove field error for vendor
                          removeError('vendor_name_snapshot');

                          // Update the edited data to ensure consistency
                          setEditedData({...editedData, vendor_name_snapshot: selectedVendor});

                          // Apply the update
                          onUpdate?.(updatedData);
                          setIsVendorSwapPopoverOpen(false);
                        }}
                        onCancel={() => {
                          // Just close the popover
                          setIsVendorSwapPopoverOpen(false);
                        }}
                      >
                        <button
                          onClick={() => setIsVendorSwapPopoverOpen(true)}
                          className="inline-flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 transition-colors"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          Suggestion
                        </button>
                      </VendorSwapPopover>
                    )}
                  </div>
                </label>
                {isEditing ? (
                  <ValidatedEditableField
                    value={editedData.vendor_name_snapshot}
                    onChange={(value) => handleFieldChange('vendor_name_snapshot', value)}
                    type="text"
                    required={true}
                    fieldName="vendor_name_snapshot"
                    onFocus={() => handleFieldFocus('vendor_name_snapshot')}
                    onBlur={handleFieldBlur}
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
                <label className="flex items-center text-xs font-medium text-gray-700 mb-0 min-h-[16px]">
                  <span className="flex items-center">
                    Vendor Tax ID
                    <FieldConfidencePill confidence={invoiceData.extraction_field_confidences?.vendor_tax_id_snapshot} isEditMode={isEditing} />
                  </span>
                </label>
                {isEditing ? (
                  <ValidatedEditableField
                    value={editedData.vendor_tax_id_snapshot}
                    onChange={(value) => handleFieldChange('vendor_tax_id_snapshot', value)}
                    type="text"
                    required={true}
                    fieldName="vendor_tax_id_snapshot"
                    placeholder="e.g., TAX-12345"
                    onFocus={() => handleFieldFocus('vendor_tax_id_snapshot')}
                    onBlur={handleFieldBlur}
                  />
                ) : (
                  renderField('vendor_tax_id_snapshot', invoiceData.vendor_tax_id_snapshot, 'text', 'Vendor Tax ID')
                )}
              </div>
              <div ref={(el) => fieldRefs.current['vendor_id'] = el}>
                <label className="flex items-center text-xs font-medium text-gray-700 mb-0 min-h-[16px]">
                  <span className="flex items-center">
                    Vendor ID
                    <FieldConfidencePill confidence={invoiceData.extraction_field_confidences?.vendor_id} isEditMode={isEditing} />
                  </span>
                </label>
                {isEditing ? (
                  <ValidatedEditableField
                    value={editedData.vendor_id || ''}
                    onChange={(value) => handleFieldChange('vendor_id', value)}
                    type="text"
                    required={false}
                    fieldName="vendor_id"
                    placeholder="e.g., VND-2001"
                    onFocus={() => handleFieldFocus('vendor_id')}
                    onBlur={handleFieldBlur}
                  />
                ) : (
                  renderField('vendor_id', invoiceData.vendor_id, 'text', 'Vendor ID')
                )}
              </div>
              <div ref={(el) => fieldRefs.current['po_numbers_cached'] = el}>
                <label className="flex items-center justify-between text-xs font-medium text-gray-700 mb-0 min-h-[16px]">
                  <span className="flex items-center">
                    PO Number
                    {/* Hide confidence pill for Non-PO invoices */}
                    {!invoiceData.id?.startsWith('baseline-nonpo-') && (
                      <FieldConfidencePill
                        confidence={invoiceData.extraction_field_confidences?.po_numbers_cached}
                        isEditMode={isEditing}
                        hasValue={!!(invoiceData.po_numbers_cached && invoiceData.po_numbers_cached.length > 0)}
                      />
                    )}
                  </span>
                  {/* Close Match link on opposite side */}
                  {!isEditing && (!invoiceData.po_numbers_cached || invoiceData.po_numbers_cached.length === 0) && invoiceData.close_match_po && (
                    <CloseMatchPopover
                      suggestedPO={invoiceData.close_match_po.po_number}
                      confidence={invoiceData.close_match_po.confidence}
                      matchingFactors={invoiceData.close_match_po.matching_factors}
                      poSummary={invoiceData.close_match_po.po_summary}
                      invoiceTotal={invoiceData.subtotal}
                      invoiceId={invoiceData.id}
                      invoiceNumber={invoiceData.invoice_number}
                      open={isCloseMatchPopoverOpen}
                      onOpenChange={setIsCloseMatchPopoverOpen}
                      isPOSearchModalOpen={isPOSearchModalOpen}
                      onAccept={() => {
                        const poNumber = invoiceData.close_match_po.po_number;
                        acceptPONumber(poNumber);
                        setIsCloseMatchPopoverOpen(false);
                        showToast(`PO ${poNumber} accepted and matched to invoice.`, 'success');
                      }}
                      onSearchDifferent={() => {
                        setIsPOSearchModalOpen(true);
                        // Keep popover open when selecting other PO
                        // Don't close the popover
                      }}
                      onReject={() => {
                        // Remove close_match_po from invoice data
                        const updatedData = { ...invoiceData };
                        delete updatedData.close_match_po;
                        onUpdate?.(updatedData);
                        setIsCloseMatchPopoverOpen(false);
                      }}
                      onClose={() => {
                        setIsCloseMatchPopoverOpen(false);
                      }}
                    >
                      <button
                        onClick={() => setIsCloseMatchPopoverOpen(true)}
                        className="inline-flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 transition-colors"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        Match Found
                      </button>
                    </CloseMatchPopover>
                  )}
                </label>
                {isEditing ? (
                  <ValidatedEditableField
                    value={editedData.po_numbers_cached?.[0] || ''}
                    onChange={(value) => handleFieldChange('po_numbers_cached', value ? [value] : [])}
                    type="text"
                    required={true}
                    fieldName="po_numbers_cached"
                    placeholder="Enter PO Number"
                    onFocus={() => handleFieldFocus('po_numbers_cached')}
                    onBlur={handleFieldBlur}
                  />
                ) : agentPendingFields['po_numbers_cached'] ? (
                  <div className="flex items-center">
                    <p className="text-sm font-medium text-gray-950">
                      {agentPendingFields['po_numbers_cached'][0]}
                    </p>
                    <PendingConfirmationIndicator />
                  </div>
                ) : (
                  <>
                    {/* For Non-PO invoices, show N/A */}
                    {invoiceData.type === 'Non-PO' ? (
                      <p className="text-sm font-medium text-gray-500">N/A</p>
                    ) : !hasPONumber && invoiceData.close_match_po ? (
                      <div className="relative">
                        {/* Red-bordered empty input field */}
                        <input
                          type="text"
                          value=""
                          readOnly
                          className="w-full px-3 py-1.5 text-sm border-2 border-red-300 bg-red-50 rounded-md cursor-not-allowed"
                        />

                        {/* Validation message */}
                        <div className="flex items-center gap-1 mt-1 text-xs text-red-600">
                          <AlertTriangle className="h-3 w-3" />
                          <span>Missing PO</span>
                        </div>
                      </div>
                    ) : hasPONumber ? (
                      <div className="flex items-center">
                        <p className="text-sm font-medium text-gray-950">
                          {displayPONumber}
                        </p>
                        {/* Add auto-correction indicator if field was auto-corrected */}
                        {(() => {
                          const autoCorrection = getAutoCorrection('po_numbers_cached');
                          return autoCorrection && (
                            <AutoCorrectionIndicator
                              fieldLabel="PO Number"
                              originalValue={autoCorrection.original_value}
                              correctedValue={autoCorrection.corrected_value}
                              reason={autoCorrection.reason}
                              vendorName={autoCorrection.vendor_name}
                              recentDocuments={autoCorrection.recent_documents}
                              documentType={autoCorrection.document_type}
                              fieldName="po_numbers_cached"
                              onFieldFocus={onFieldFocus}
                            />
                          );
                        })()}
                        {isReprocessingField === 'po_numbers_cached' && (
                          <Loader2 className="h-3 w-3 ml-1.5 animate-spin text-purple-600" />
                        )}
                      </div>
                    ) : (
                      renderField(
                        'po_numbers_cached',
                        displayPONumber,
                        'text',
                        'PO Number'
                      )
                    )}
                  </>
                )}
              </div>
              {/* Customer ID - Hidden for Non-PO invoices and auto-reject invoices */}
              {!invoiceData.id?.startsWith('baseline-nonpo-') && !invoiceData.id?.startsWith('auto-reject-') && (
              <div ref={(el) => fieldRefs.current['job_number'] = el} className="relative">
                <label className="flex items-center justify-between text-xs font-medium text-gray-700 mb-0 min-h-[16px]">
                  <span className="flex items-center">
                    Customer ID
                    <FieldConfidencePill confidence={invoiceData.extraction_field_confidences?.job_number} isEditMode={isEditing} hasValue={!!invoiceData.job_number} />
                  </span>
                  {!invoiceData.job_number && !agentPendingFields['job_number'] && (
                    <button
                      onClick={() => {
                        const newExpanded = expandedSuggestion === 'job_number' ? null : 'job_number';
                        setExpandedSuggestion(newExpanded);
                        if (onFieldFocus) {
                          onFieldFocus(newExpanded);
                        }
                      }}
                      className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 transition-colors"
                    >
                      <Sparkles className="h-3 w-3" />
                      Find Match
                    </button>
                  )}
                </label>
                {isEditing ? (
                  <ValidatedEditableField
                    value={agentPendingFields['job_number'] || editedData.job_number || ''}
                    onChange={(value) => handleFieldChange('job_number', value)}
                    type="text"
                    required={false}
                    fieldName="job_number"
                    placeholder="Enter Customer ID"
                    onFocus={() => handleFieldFocus('job_number')}
                    onBlur={handleFieldBlur}
                  />
                ) : agentPendingFields['job_number'] ? (
                  <div className="flex items-center">
                    <p className="text-sm font-medium text-gray-950">
                      {agentPendingFields['job_number']}
                    </p>
                    {isReprocessingField === 'job_number' ? (
                      <Loader2 className="h-3 w-3 ml-1.5 animate-spin text-purple-600" />
                    ) : (
                      <PendingConfirmationIndicator />
                    )}
                  </div>
                ) : (
                  (() => {
                    const hasValue = invoiceData.job_number;
                    const shouldAllowEdit = showFieldErrors && hasFieldError('job_number') && !forceReadOnly && !hasValue;

                    if (shouldAllowEdit) {
                      // Show red clickable field for errors
                      return (
                        <p
                          className={getReadOnlyFieldClass('job_number')}
                          onClick={() => {
                            setFieldToFocus('job_number');
                            setIsEditing(true);
                          }}
                          title="Click to edit all fields"
                        >
                          {invoiceData.job_number || '--'}
                        </p>
                      );
                    }

                    // Show value with spinner if reprocessing
                    if (hasValue) {
                      return (
                        <div className="flex items-center">
                          <p className="text-sm font-medium text-gray-950">
                            {invoiceData.job_number}
                          </p>
                          {isReprocessingField === 'job_number' && (
                            <Loader2 className="h-3 w-3 ml-1.5 animate-spin text-purple-600" />
                          )}
                        </div>
                      );
                    }

                    // Show placeholder - treat as error when empty
                    return (
                      <p
                        className="text-sm font-medium text-red-700 border border-red-500 px-2 bg-red-50 py-1 rounded cursor-pointer hover:bg-red-100 transition-colors"
                        onClick={() => {
                          setFieldToFocus('job_number');
                          setIsEditing(true);
                        }}
                        title="Click to edit all fields"
                      >
                        —
                      </p>
                    );
                  })()
                )}
                {!invoiceData.job_number && !agentPendingFields['job_number'] && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-red-600">
                    <AlertTriangle className="h-3 w-3" />
                    <span>Value not found</span>
                  </div>
                )}
                {expandedSuggestion === 'job_number' && (
                  <div ref={suggestionCardRef} className="absolute top-full left-0 mt-2 z-50 w-full min-w-[320px] max-w-md">
                    <TeachingCard
                      fieldLabel="Customer ID"
                      onPointToValue={() => {
                        // Close the popover
                        setExpandedSuggestion(null);
                        if (onFieldFocus) {
                          onFieldFocus(null);
                        }
                        // Start teaching mode
                        if (onStartTeaching) {
                          onStartTeaching('job_number');
                        }
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
              )}
              {/* Approver - Only for Non-PO invoices */}
              {invoiceData.type === 'Non-PO' && (
                <div ref={(el) => fieldRefs.current['assigned_to_name'] = el} className="relative">
                  <label className="flex items-center justify-between text-xs font-medium text-gray-700 mb-0 min-h-[16px]">
                    <span className="flex items-center">
                      Approver
                      <FieldConfidencePill confidence={invoiceData.extraction_field_confidences?.assigned_to_name} isEditMode={isEditing} hasValue={!!invoiceData.assigned_to_name} />
                    </span>
                    {invoiceData.suggested_approver && !invoiceData.assigned_to_name && !agentPendingFields['assigned_to_name'] && (
                      <button
                        onClick={() => {
                          const newExpanded = expandedSuggestion === 'assigned_to_name' ? null : 'assigned_to_name';
                          setExpandedSuggestion(newExpanded);
                          if (onFieldFocus) {
                            onFieldFocus(newExpanded);
                          }
                        }}
                        className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 transition-colors"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        Match Found
                      </button>
                    )}
                  </label>
                  {isEditing ? (
                    <ValidatedEditableField
                      value={agentPendingFields['assigned_to_name'] || editedData.assigned_to_name || ''}
                      onChange={(value) => handleFieldChange('assigned_to_name', value)}
                      type="select"
                      required={false}
                      fieldName="assigned_to_name"
                      placeholder="Select Approver"
                      options={[
                        { value: '', label: 'None' },
                        { value: 'Sarah Mitchell', label: 'Sarah Mitchell' },
                        { value: 'John Davis', label: 'John Davis' },
                        { value: 'Emily Roberts', label: 'Emily Roberts' },
                        { value: 'Michael Chen', label: 'Michael Chen' },
                        { value: 'Laura Martinez', label: 'Laura Martinez' },
                      ]}
                      onFocus={() => handleFieldFocus('assigned_to_name')}
                      onBlur={handleFieldBlur}
                    />
                  ) : agentPendingFields['assigned_to_name'] ? (
                    <div className="flex items-center">
                      <p className="text-sm font-medium text-gray-950">
                        {agentPendingFields['assigned_to_name']}
                      </p>
                      <PendingConfirmationIndicator />
                    </div>
                  ) : !invoiceData.assigned_to_name ? (
                    <div className="relative">
                      {/* Red-bordered empty input field */}
                      <input
                        type="text"
                        value=""
                        readOnly
                        className="w-full px-3 py-1.5 text-sm border-2 border-red-300 bg-red-50 rounded-md cursor-not-allowed"
                      />

                      {/* Validation message */}
                      <div className="flex items-center gap-1 mt-1 text-xs text-red-600">
                        <AlertTriangle className="h-3 w-3" />
                        <span>Approver required</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm font-medium text-gray-950">
                      {invoiceData.assigned_to_name || '--'}
                    </p>
                  )}
                  {expandedSuggestion === 'assigned_to_name' && invoiceData.suggested_approver && (
                    <div ref={suggestionCardRef} className="absolute top-full left-0 mt-2 z-50 w-full min-w-[320px] max-w-md">
                      <AISuggestionCard
                        candidate={{
                          value: invoiceData.suggested_approver || '',
                          confidence: invoiceData.approver_routing_confidence || 0,
                          source: 'Smart Routing',
                          reason: invoiceData.approver_routing_reasoning
                        }}
                        fieldLabel="Suggested Approver"
                        onAccept={() => {
                          onFieldAccept!('assigned_to_name', invoiceData.suggested_approver);
                          setExpandedSuggestion(null);
                          showToast('Approver suggestion accepted and saved for future invoices.', 'success');
                        }}
                        onReject={() => {
                          onFieldReject!('assigned_to_name');
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
              )}
              {/* Currency - appears in second column after Customer ID */}
              <div ref={(el) => fieldRefs.current['currency'] = el}>
                <label className="flex items-center text-xs font-medium text-gray-700 mb-0 min-h-[16px]">
                  <span className="flex items-center">
                    Currency
                    <FieldConfidencePill confidence={invoiceData.extraction_field_confidences?.currency} isEditMode={isEditing} />
                  </span>
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
                    onFocus={() => handleFieldFocus('currency')}
                    onBlur={handleFieldBlur}
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

              {/* Financial Row 1: Subtotal, Tax Amount, Tax Rate (moved up from below) */}
              <div ref={(el) => fieldRefs.current['subtotal'] = el}>
                <label className="flex items-center text-xs font-medium text-gray-700 mb-0 min-h-[16px]">
                  <span className="flex items-center">
                    Subtotal
                    <FieldConfidencePill confidence={invoiceData.extraction_field_confidences?.subtotal} isEditMode={isEditing} />
                  </span>
                </label>
                {isEditing ? (
                  <ValidatedEditableField
                    value={editedData.subtotal || calculatedSubtotal}
                    onChange={(value) => handleFieldChange('subtotal', value)}
                    type="currency"
                    required={true}
                    fieldName="subtotal"
                    currency={editedData.currency}
                    onFocus={() => handleFieldFocus('subtotal')}
                    onBlur={handleFieldBlur}
                  />
                ) : (
                  <p className={getReadOnlyFieldClass('subtotal')}>
                    {formatCurrency(invoiceData.subtotal || calculatedSubtotal, invoiceData.currency)}
                  </p>
                )}
              </div>
              <div>
                <label className="flex items-center text-xs font-medium text-gray-700 mb-0 min-h-[16px]">
                  <span className="flex items-center">
                    Tax Amount
                    <FieldConfidencePill confidence={invoiceData.extraction_field_confidences?.tax_total} isEditMode={isEditing} />
                  </span>
                </label>
                {isEditing ? (
                  <ValidatedEditableField
                    value={editedData.tax_total || calculatedTaxTotal}
                    onChange={(value) => handleFieldChange('tax_total', value)}
                    type="currency"
                    required={false}
                    fieldName="tax_total"
                    currency={editedData.currency}
                    onFocus={() => handleFieldFocus('tax_total')}
                    onBlur={handleFieldBlur}
                  />
                ) : (
                  <p className="text-sm font-medium text-gray-950">
                    {formatCurrency(invoiceData.tax_total || calculatedTaxTotal, invoiceData.currency)}
                  </p>
                )}
              </div>
              <div>
                <label className="flex items-center text-xs font-medium text-gray-700 mb-0 min-h-[16px]">
                  <span className="flex items-center">
                    Tax Rate (%)
                    <FieldConfidencePill confidence={invoiceData.extraction_field_confidences?.tax_rate_percent} isEditMode={isEditing} />
                  </span>
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
                    onFocus={() => handleFieldFocus('tax_rate_percent')}
                    onBlur={handleFieldBlur}
                  />
                ) : (
                  <p className="text-sm font-medium text-gray-950">
                    {getTaxRate()}%
                  </p>
                )}
              </div>

              {/* Financial Row 2: Shipping, Discount, Miscellaneous */}
              <div>
                <label className="flex items-center text-xs font-medium text-gray-700 mb-0 min-h-[16px]">
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
                <label className="flex items-center text-xs font-medium text-gray-700 mb-0 min-h-[16px]">
                  Discount
                </label>
                <p className="text-sm font-medium text-gray-950">
                  {invoiceData.discount_total > 0
                    ? `-${formatCurrency(invoiceData.discount_total, invoiceData.currency)}`
                    : '-'
                  }
                </p>
              </div>
              <div>
                <label className="flex items-center text-xs font-medium text-gray-700 mb-0 min-h-[16px]">
                  Miscellaneous
                </label>
                {isEditing ? (
                  <ValidatedEditableField
                    value={editedData.miscellaneous || ''}
                    onChange={(value) => handleFieldChange('miscellaneous', value)}
                    type="text"
                    required={false}
                    fieldName="miscellaneous"
                    onFocus={() => handleFieldFocus('miscellaneous')}
                    onBlur={handleFieldBlur}
                  />
                ) : (
                  <p className="text-sm font-medium text-gray-950">
                    {invoiceData.miscellaneous || '-'}
                  </p>
                )}
              </div>

              {/* Financial Row 3: Total (full width on left) */}
              <div ref={(el) => fieldRefs.current['total'] = el} className="bg-purple-50 py-2 -ml-3 pl-3 pr-3">
                <label className="flex items-center text-xs font-bold text-gray-900 mb-0 min-h-[16px]">
                  <span className="flex items-center">
                    Total
                    <FieldConfidencePill confidence={invoiceData.extraction_field_confidences?.total} isEditMode={isEditing} />
                  </span>
                </label>
                {isEditing ? (
                  <ValidatedEditableField
                    value={editedData.total || calculatedTotal}
                    onChange={(value) => handleFieldChange('total', value)}
                    type="currency"
                    required={true}
                    fieldName="total"
                    currency={editedData.currency}
                    onFocus={() => handleFieldFocus('total')}
                    onBlur={handleFieldBlur}
                  />
                ) : (
                  <p className="text-sm font-bold text-gray-950">
                    {formatCurrency(invoiceData.total || calculatedTotal, invoiceData.currency)}
                  </p>
                )}
              </div>
              <div></div>
              <div></div>

              {/* Vehicle Registration No. - Only for baseline-po-bank-1 - appears after Discount */}
              {invoiceData.id === 'baseline-po-bank-1' ? (
                <div ref={(el) => fieldRefs.current['vehicle_registration_no'] = el} className="relative">
                  <label className="flex items-center justify-between text-xs font-medium text-gray-700 mb-0 min-h-[16px]">
                    <span className="flex items-center">
                      Vehicle Registration No.
                      <FieldConfidencePill confidence={invoiceData.extraction_field_confidences?.vehicle_registration_no} isEditMode={isEditing} hasValue={!!invoiceData.vehicle_registration_no} />
                    </span>
                  </label>
                  {isEditing ? (
                    <ValidatedEditableField
                      value={agentPendingFields['vehicle_registration_no'] || editedData.vehicle_registration_no || ''}
                      onChange={(value) => handleFieldChange('vehicle_registration_no', value)}
                      type="text"
                      required={false}
                      fieldName="vehicle_registration_no"
                      placeholder="Enter Vehicle Registration No."
                      onFocus={() => handleFieldFocus('vehicle_registration_no')}
                      onBlur={handleFieldBlur}
                    />
                  ) : agentPendingFields['vehicle_registration_no'] ? (
                    <div className="flex items-center">
                      <p className="text-sm font-medium text-gray-950">
                        {agentPendingFields['vehicle_registration_no']}
                      </p>
                      <PendingConfirmationIndicator />
                    </div>
                  ) : (
                    (() => {
                      const hasValue = invoiceData.vehicle_registration_no;

                      if (hasValue) {
                        return (
                          <div className="flex items-center">
                            <p className="text-sm font-medium text-gray-950">
                              {invoiceData.vehicle_registration_no}
                            </p>
                            <CustomFieldIndicator
                              fieldLabel="Vehicle Registration No."
                              fieldValue={invoiceData.vehicle_registration_no}
                              vendorName={invoiceData.vendor_name_snapshot}
                              fieldName="vehicle_registration_no"
                              onFieldFocus={onFieldFocus}
                            />
                          </div>
                        );
                      }

                      // Show placeholder
                      return (
                        <p className="text-sm font-medium text-gray-950">
                          {invoiceData.vehicle_registration_no || '--'}
                        </p>
                      );
                    })()
                  )}
                </div>
              ) : null}
            </div>
          </div>
          )}
        </div>
        {/* Payment Section */}
        {!hidePaymentSection && !hideAccountingSection && (
        <div>
          <div
            className="relative px-4 py-3 border-b border-gray-200 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
            onClick={() => setIsAdditionalDetailsExpanded(!isAdditionalDetailsExpanded)}
          >
            <div className="flex items-center gap-2">
              {isAdditionalDetailsExpanded ? (
                <ChevronUp className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-500" />
              )}
              <ClipboardList className="h-4 w-4 text-purple-600" />
              <h3 className="text-xs font-semibold text-gray-950 uppercase tracking-wide">Additional Invoice Details</h3>
              {additionalDetailsErrorCount > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                  {additionalDetailsErrorCount} error field{additionalDetailsErrorCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            {!forceReadOnly && !isEditing && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(true);
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 px-2 py-1 text-xs font-medium rounded border transition-colors bg-white text-purple-900 border-purple-900 hover:bg-gray-50"
              >
                Edit
              </button>
            )}
          </div>
          {isAdditionalDetailsExpanded && (
          <div className="px-10 py-4 bg-white border-b border-gray-200">
            {/* Payment Subsection */}
            <div className="mb-6">
              <h4 className="flex items-center gap-2 text-xs font-semibold text-gray-950 uppercase tracking-wide mb-4 pb-2 border-b border-gray-200">
                <CreditCard className="h-4 w-4 text-gray-950" />
                Payment
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 gap-4">
              <div>
                <label className="flex items-center text-xs font-medium text-gray-700 mb-0 min-h-[16px]">
                  <span className="flex items-center">
                    Payment Method
                    <FieldConfidencePill confidence={invoiceData.extraction_field_confidences?.payment_method} isEditMode={isEditing} />
                  </span>
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
                    onFocus={() => handleFieldFocus('payment_method')}
                    onBlur={handleFieldBlur}
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
                <label className="flex items-center text-xs font-medium text-gray-700 mb-0 min-h-[16px]">
                  <span className="flex items-center">
                    Payment Terms
                    <FieldConfidencePill confidence={invoiceData.extraction_field_confidences?.terms_text} isEditMode={isEditing} />
                  </span>
                  <ValidationIndicator validations={[...errors, ...warnings]} field="payment_terms" isEditing={isEditing} />
                </label>
                {isEditing ? (
                  <EditableField
                    value={editedData.terms_text}
                    onChange={(value) => handleFieldChange('terms_text', value)}
                    type="text"
                    onFocus={() => handleFieldFocus('terms_text')}
                    onBlur={handleFieldBlur}
                  />
                ) : (
                  <p className="text-sm font-medium text-gray-950">{invoiceData.terms_text || 'Net 30'}</p>
                )}
              </div>
              <div>
                <label className="flex items-center text-xs font-medium text-gray-700 mb-0 min-h-[16px]">
                  <span className="flex items-center">
                    Due Date
                    <FieldConfidencePill confidence={invoiceData.extraction_field_confidences?.due_date} isEditMode={isEditing} />
                  </span>
                  <ValidationIndicator validations={[...errors, ...warnings]} field="due_date" isEditing={isEditing} />
                </label>
                {isEditing ? (
                  <ValidatedEditableField
                    value={editedData.due_date}
                    onChange={(value) => handleFieldChange('due_date', value)}
                    type="date"
                    required={true}
                    fieldName="due_date"
                    onFocus={() => handleFieldFocus('due_date')}
                    onBlur={handleFieldBlur}
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
                  <label className="flex items-center text-xs font-medium text-gray-700 mb-0 min-h-[16px]">Billing Address</label>
                  <p className="text-sm font-medium text-gray-950 whitespace-pre-line">
                    {formatVendorAddress(invoiceData.vendor_address_snapshot)}
                  </p>
                </div>
              )}
              {invoiceData.payment_bank_details && Object.keys(invoiceData.payment_bank_details).some(key => invoiceData.payment_bank_details[key]) && (
                <div className={`${getFullSpan()} mt-3`}>
                  <label className="flex items-center text-xs font-medium text-gray-700 mb-2 min-h-[20px]">Bank Details</label>
                  <div className={`rounded-md p-3 space-y-2 ${
                    invoiceData.validation_warnings?.some((w: any) =>
                      w.field === 'payment_bank_details' && (w.category === 'risk' || w.type === 'bank_details_change')
                    ) ? 'bg-red-50 border-2 border-red-200' : 'bg-gray-50'
                  }`}>
                    {/* Check if bank details are unverified */}
                    {invoiceData.validation_warnings?.some((w: any) =>
                      w.field === 'payment_bank_details' && (w.category === 'risk' || w.type === 'bank_details_change')
                    ) && (() => {
                      const bankWarning = invoiceData.validation_warnings?.find((w: any) =>
                        w.field === 'payment_bank_details' && (w.category === 'risk' || w.type === 'bank_details_change')
                      );
                      return (
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
                          <BankDetailsVerificationPopover
                            invoiceNumber={invoiceData.invoice_number}
                            vendorName={invoiceData.vendor_name_snapshot}
                            invoiceAmount={invoiceData.total}
                            currency={invoiceData.currency}
                            dueDate={invoiceData.due_date}
                            oldBankDetails={bankWarning?.old_bank_details || invoiceData.payment_bank_details}
                            newBankDetails={bankWarning?.new_bank_details || invoiceData.payment_bank_details}
                            requisitionerName={invoiceData.requisitioner?.name}
                            requisitionerEmail={invoiceData.requisitioner?.email}
                            poNumber={invoiceData.po_numbers_cached?.[0]}
                            open={isBankVerifyOpen}
                            onOpenChange={setIsBankVerifyOpen}
                            fieldName="payment_bank_details.account_number"
                            onFieldFocus={onFieldFocus}
                          >
                            <button
                              onClick={() => setIsBankVerifyOpen(true)}
                              className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 transition-colors font-medium"
                            >
                              <Shield className="h-3 w-3" />
                              Mismatch Detected
                            </button>
                          </BankDetailsVerificationPopover>
                        </div>
                      );
                    })()}
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

            {/* Coding Subsection */}
            <div>
              <h4 className="flex items-center gap-2 text-xs font-semibold text-gray-950 uppercase tracking-wide mb-4 pb-2 border-b border-gray-200">
                <BookOpen className="h-4 w-4 text-gray-950" />
                Coding
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 gap-4">
              <div>
                <label className="flex items-center text-xs font-medium text-gray-700 mb-0 min-h-[16px]">
                  <span className="flex items-center">
                    Ledger Account
                    <FieldConfidencePill confidence={invoiceData.extraction_field_confidences?.ledger} isEditMode={isEditing} />
                  </span>
                  <ValidationIndicator validations={[...errors, ...warnings]} field="ledger" isEditing={isEditing} />
                </label>
                {isEditing ? (
                  <EditableField
                    value={editedData.ledger || 'Accounts Payable'}
                    onChange={(value) => handleFieldChange('ledger', value)}
                    type="select"
                    options={LEDGER_OPTIONS.map(opt => ({ value: opt.value, label: opt.label }))}
                    onFocus={() => handleFieldFocus('ledger')}
                    onBlur={handleFieldBlur}
                  />
                ) : (
                  <p className="text-sm font-medium text-gray-950">
                    {invoiceData.ledger || 'Accounts Payable'}
                  </p>
                )}
              </div>
              <div>
                <label className="flex items-center text-xs font-medium text-gray-700 mb-0 min-h-[16px]">
                  <span className="flex items-center">
                    Cost Center
                    <FieldConfidencePill confidence={invoiceData.extraction_field_confidences?.cost_center} isEditMode={isEditing} />
                  </span>
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
                    onFocus={() => handleFieldFocus('cost_center')}
                    onBlur={handleFieldBlur}
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
                <label className="flex items-center text-xs font-medium text-gray-700 mb-0 min-h-[16px]">
                  <span className="flex items-center">
                    GL Account
                    <FieldConfidencePill confidence={invoiceData.extraction_field_confidences?.gl_code} isEditMode={isEditing} />
                  </span>
                </label>
                {isEditing ? (
                  <ValidatedEditableField
                    value={editedData.gl_code || ''}
                    onChange={(value) => handleFieldChange('gl_code', value)}
                    type="text"
                    required={false}
                    fieldName="gl_code"
                    placeholder="e.g., 6210"
                    onFocus={() => handleFieldFocus('gl_code')}
                    onBlur={handleFieldBlur}
                  />
                ) : (
                  <p className="text-sm font-medium text-gray-950">
                    {invoiceData.gl_code || 'Not assigned'}
                  </p>
                )}
              </div>
              <div>
                <label className="flex items-center text-xs font-medium text-gray-700 mb-0 min-h-[16px]">
                  <span className="flex items-center">
                    Department
                    <FieldConfidencePill confidence={invoiceData.extraction_field_confidences?.department} isEditMode={isEditing} />
                  </span>
                </label>
                {isEditing ? (
                  <ValidatedEditableField
                    value={editedData.department || ''}
                    onChange={(value) => handleFieldChange('department', value)}
                    type="text"
                    required={false}
                    fieldName="department"
                    placeholder="e.g., Finance, Engineering"
                    onFocus={() => handleFieldFocus('department')}
                    onBlur={handleFieldBlur}
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
                  <label className="flex items-center text-xs font-medium text-gray-700 mb-0 min-h-[16px]">Accounting Notes</label>
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
                  {/* Show thunderbolt link for auto-coded invoices */}
                  {invoiceData.auto_coding_applied ? (
                    <div className="flex items-center gap-2">
                      <AccountingAutoCodingPopover
                        ledger={invoiceData.ledger}
                        costCenter={invoiceData.cost_center}
                        costCenterName={invoiceData.cost_center_name}
                        glCode={invoiceData.gl_code}
                        department={invoiceData.department}
                        confidence={invoiceData.ai_classification_confidence}
                        reasoning={invoiceData.ai_classification_reasoning}
                        similarInvoices={invoiceData.auto_coding_details?.similar_invoices}
                        patternMatched={invoiceData.auto_coding_details?.pattern_matched}
                        confidenceFactors={invoiceData.auto_coding_details?.confidence_factors}
                        open={isAutoCodingPopoverOpen}
                        onOpenChange={setIsAutoCodingPopoverOpen}
                      >
                        <button
                          onClick={() => setIsAutoCodingPopoverOpen(true)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-purple-600 hover:text-purple-700 transition-colors"
                        >
                          <Zap className="h-3.5 w-3.5" fill="currentColor" />
                          Auto-Coded
                        </button>
                      </AccountingAutoCodingPopover>
                    </div>
                  ) : (
                    /* Show collapsible reasoning for non-auto-coded invoices */
                    <>
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
                    </>
                  )}
                </div>
              )}
              </div>
            </div>
          </div>
          )}
        </div>
        )}

        {/* Line Items Section */}
        <div>
          {/* Header - shown only when NOT in fullscreen */}
          {!isLineItemsFullscreen && (
            <div
              className="relative px-4 py-2.5 border-b border-gray-200 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => setIsLineItemsExpanded(!isLineItemsExpanded)}
            >
              <div className="flex items-center gap-2">
                {isLineItemsExpanded ? (
                  <ChevronUp className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                )}
                <Package className="h-4 w-4 text-purple-600" />
                <h3 className="text-xs font-semibold text-gray-950 uppercase tracking-wide">Line Items</h3>

                {/* Validation status pill */}
                {(() => {
                  const errorCount = (invoiceData.match_results || []).filter((mr: any) => !mr.within_tolerance).length;
                  return errorCount > 0 ? (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                      <AlertCircle className="h-3 w-3" />
                      {errorCount} {errorCount === 1 ? 'variance' : 'variances'}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                      <CheckCircle className="h-3 w-3" />
                      Fully Matched
                    </span>
                  );
                })()}
              </div>

              {/* Edit button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsLineItemsEditMode(!isLineItemsEditMode);
                }}
                className={`absolute right-[100px] top-1/2 -translate-y-1/2 px-2 py-1 text-xs font-medium rounded border transition-colors ${
                  isLineItemsEditMode
                    ? 'bg-purple-900 text-white border-purple-900 hover:bg-purple-800 hover:border-purple-800'
                    : 'bg-white text-purple-900 border-purple-900 hover:bg-gray-50'
                }`}
              >
                {isLineItemsEditMode ? 'Done' : 'Edit'}
              </button>

              {/* Expand button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleLineItemsFullscreen();
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 px-2 py-1 text-xs font-medium rounded border transition-colors flex items-center gap-1 bg-white text-purple-900 border-purple-900 hover:bg-gray-50"
              >
                <Maximize2 className="h-3.5 w-3.5 text-purple-900" />
                <span>Expand</span>
              </button>
            </div>
          )}

          {isLineItemsExpanded && (
          <div
            ref={lineItemsContainerRef}
            className={`bg-white ${isLineItemsFullscreen ? 'fixed inset-0 z-50 overflow-auto' : 'border-b border-gray-200'}`}
          >
            {/* Header - shown only when IN fullscreen */}
            {isLineItemsFullscreen && (
              <div className="relative px-4 py-2.5 border-b border-gray-200 bg-gray-50 sticky top-0 z-10">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-purple-600" />
                  <h3 className="text-xs font-semibold text-gray-950 uppercase tracking-wide">Line Items</h3>

                  {/* Validation status pill */}
                  {(() => {
                    const errorCount = (invoiceData.match_results || []).filter((mr: any) => !mr.within_tolerance).length;
                    return errorCount > 0 ? (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                        <AlertCircle className="h-3 w-3" />
                        {errorCount} {errorCount === 1 ? 'variance' : 'variances'}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                        <CheckCircle className="h-3 w-3" />
                        Fully Matched
                      </span>
                    );
                  })()}
                </div>

                {/* Edit button */}
                <button
                  onClick={() => setIsLineItemsEditMode(!isLineItemsEditMode)}
                  className={`absolute right-[110px] top-1/2 -translate-y-1/2 px-2 py-1 text-xs font-medium rounded border transition-colors ${
                    isLineItemsEditMode
                      ? 'bg-purple-900 text-white border-purple-900 hover:bg-purple-800 hover:border-purple-800'
                      : 'bg-white text-purple-900 border-purple-900 hover:bg-gray-50'
                  }`}
                >
                  {isLineItemsEditMode ? 'Done' : 'Edit'}
                </button>

                {/* Collapse button */}
                <button
                  onClick={toggleLineItemsFullscreen}
                  className="absolute right-4 top-1/2 -translate-y-1/2 px-2 py-1 text-xs font-medium rounded border transition-colors flex items-center gap-1 bg-purple-900 text-white border-purple-900 hover:bg-purple-800 hover:border-purple-800"
                >
                  <Minimize2 className="h-3.5 w-3.5" />
                  <span>Collapse</span>
                </button>
              </div>
            )}

            <LineItemsPreviewPanel
              invoiceLines={invoiceData.lines || []}
              poLines={invoiceData.po_lines}
              matchResults={invoiceData.match_results}
              currency={invoiceData.currency || 'USD'}
              invoiceId={invoiceData.id}
              externallyControlled={true}
              externalCollapsed={!isLineItemsExpanded}
              onToggleCollapsed={() => setIsLineItemsExpanded(!isLineItemsExpanded)}
              showComparison={!!(invoiceData.po_lines && invoiceData.po_lines.length > 0)}
              useDetailedVarianceColumns={true}
              hideInternalHeader={true}
              hideEditButton={true}
              externalEditMode={isLineItemsEditMode}
              onEditModeChange={setIsLineItemsEditMode}
            />
          </div>
          )}
        </div>

        {/* Document Links Section */}
        {!hideDocumentLinksSection && (
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
        )}
      </div>

      {/* Bottom Action Bar - Only shown in edit mode */}
      {showBottomBar && (
        <div className={`sticky bottom-0 w-full bg-white border-t border-gray-200 px-4 py-3 flex items-center justify-end gap-3 z-40 shadow-[0_-2px_8px_rgba(0,0,0,0.08)] ${
          isEditing ? 'animate-in slide-in-from-bottom duration-300' : 'animate-out slide-out-to-bottom duration-300'
        }`}>
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
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-purple-900 text-white rounded-md hover:bg-purple-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check className="h-4 w-4" />
            <span className="font-medium">{isSaving ? 'Saving...' : 'Save'}</span>
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
        onClose={() => {
          setIsPOSearchModalOpen(false);
          // Keep the close match popover open when closing PO search
          if (invoiceData.close_match_po && !invoiceData.po_numbers_cached?.length) {
            setIsCloseMatchPopoverOpen(true);
          }
        }}
        onLinkPO={handleLinkPO}
        vendorId={null}
        vendorName={editedData.vendor_name_snapshot}
      />

      {/* Policy Document Drawer */}
      <PolicyDocumentDrawer
        isOpen={isPolicyDrawerOpen}
        onClose={() => setIsPolicyDrawerOpen(false)}
        policyLink={policyLinkToView || undefined}
      />
      </div>
    </Tooltip.Provider>
  );
}