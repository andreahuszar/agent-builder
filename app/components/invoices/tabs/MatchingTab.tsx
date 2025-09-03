'use client';

import React, { useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import { 
  ValidationCard, 
  ValidationCardContainer, 
  ValidationSuccessCard,
  ValidationIssue,
  ValidationCategory
} from '../ValidationCard';
import { InvoiceValidator } from '@/app/utils/validationService';

interface MatchResult {
  id: string;
  invoice_id: string;
  invoice_line_id?: string;
  level: string;
  rule_applied: string;
  matched_po_line_id?: string;
  matched_gr_line_id?: string;
  matched_ses_line_id?: string;
  qty_variance?: number;
  price_variance?: number;
  amount_variance?: number;
  within_tolerance: boolean;
  explanation_code: string;
  at: string;
}

interface MatchingTabProps {
  invoiceId: string;
  matchResults: MatchResult[];
  lines: any[];
  invoiceData?: any;
  approvalLimit?: number;
  poComparisonData?: any;
}

export function MatchingTab({ invoiceId, matchResults, lines, invoiceData, approvalLimit = 2500, poComparisonData }: MatchingTabProps) {
  // Check if this is a Non-PO vendor
  const isNonPOVendor = invoiceData?.vendor_requires_po === false;
  
  // Run invoice validations if data is provided
  const invoiceValidations = useMemo(() => {
    if (!invoiceData) return { errors: [], warnings: [], info: [] };
    const validator = new InvoiceValidator(invoiceData);
    return validator.validate();
  }, [invoiceData]);

  // Transform match results and invoice validations into validation issues grouped by category
  const validationIssues = useMemo(() => {
    const issues: Record<ValidationCategory, ValidationIssue[]> = {
      financial: [],
      process: [],
      compliance: [],
      risk: [],
      data_quality: [],
    };
    
    // If this is a Non-PO vendor, skip PO-related checks
    if (isNonPOVendor) {
      // Only add non-PO related validations
      if (invoiceValidations) {
        [...invoiceValidations.errors, ...invoiceValidations.warnings].forEach((validation, idx) => {
          let category: ValidationCategory = 'data_quality';
          
          // Categorize based on field or message
          if (validation.field === 'due_date' || validation.field === 'invoice_date') {
            category = 'compliance';
          } else if (validation.field === 'total' || validation.field === 'subtotal' || validation.field === 'tax_total') {
            category = 'financial';
          }
          
          issues[category].push({
            id: `validation-${idx}`,
            field: validation.field,
            message: validation.message,
            details: validation.details,
            expectedValue: validation.expectedValue,
            actualValue: validation.actualValue,
            severity: validation.severity,
            category,
          });
        });
      }
      
      return issues;
    }

    // Add approval limit check
    if (invoiceData?.total && invoiceData.total > approvalLimit) {
      issues.compliance.push({
        id: 'approval-limit',
        field: 'total',
        message: 'Amount exceeds approval limit',
        details: `Invoice total of ${new Intl.NumberFormat('en-US', { style: 'currency', currency: invoiceData.currency || 'USD' }).format(invoiceData.total)} exceeds your approval limit of ${new Intl.NumberFormat('en-US', { style: 'currency', currency: invoiceData.currency || 'USD' }).format(approvalLimit)}. Manager approval required.`,
        actualValue: invoiceData.total,
        expectedValue: `≤ ${approvalLimit}`,
        severity: 'error',
        category: 'compliance',
      });
    }

    // Check for uninvoiced PO lines
    if (poComparisonData?.unmatchedPoLines && poComparisonData.unmatchedPoLines.length > 0) {
      const uninvoicedTotal = poComparisonData.unmatchedPoLines.reduce((sum: number, item: any) => 
        sum + (item.po.qty_ordered * item.po.unit_price), 0);
      
      poComparisonData.unmatchedPoLines.forEach((item: any) => {
        const po = item.po;
        issues.financial.push({
          id: `uninvoiced-po-line-${po.id}`,
          field: 'po_coverage',
          message: `PO Line #${po.line_no} not invoiced`,
          details: `${po.description} - ${po.qty_ordered} ${po.uom} @ ${new Intl.NumberFormat('en-US', { style: 'currency', currency: invoiceData?.currency || 'USD' }).format(po.unit_price)} = ${new Intl.NumberFormat('en-US', { style: 'currency', currency: invoiceData?.currency || 'USD' }).format(po.qty_ordered * po.unit_price)} is not covered by this invoice`,
          actualValue: 0,
          expectedValue: po.qty_ordered * po.unit_price,
          severity: 'error',
          category: 'financial',
        });
      });
      
      // Add summary issue for total uninvoiced amount
      if (uninvoicedTotal > 0) {
        issues.financial.push({
          id: 'uninvoiced-total',
          field: 'po_coverage',
          message: 'Uninvoiced PO amount',
          details: `Total uninvoiced PO amount: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: invoiceData?.currency || 'USD' }).format(uninvoicedTotal)}. This contributes to the variance between invoice and PO totals.`,
          actualValue: 0,
          expectedValue: uninvoicedTotal,
          severity: 'warning',
          category: 'financial',
        });
      }
    }

    // Add invoice validation errors/warnings
    if (invoiceValidations) {
      [...invoiceValidations.errors, ...invoiceValidations.warnings].forEach((validation, idx) => {
        let category: ValidationCategory = 'data_quality';
        
        // Categorize based on field or message
        if (validation.field === 'due_date' || validation.field === 'invoice_date') {
          category = 'compliance';
        } else if (validation.field === 'total' || validation.field === 'subtotal' || validation.field === 'tax_total') {
          category = 'financial';
        } else if (validation.field === 'vendor_name_snapshot' || validation.field === 'po_numbers') {
          category = 'process';
        }
        
        issues[category].push({
          id: `validation-${idx}`,
          field: validation.field,
          message: validation.message,
          details: validation.details,
          expectedValue: validation.expectedValue,
          actualValue: validation.actualValue,
          severity: validation.severity,
          category,
        });
      });
    }

    // Track if we've already added certain issues to avoid duplicates
    let hasAddedMissingReceipt = false;
    let hasAddedNoPO = false;

    matchResults.forEach((result, index) => {
      const lineDesc = result.invoice_line_id 
        ? lines.find(l => l.id === result.invoice_line_id)?.description 
        : 'Header Level';

      // Amount variances
      if (result.amount_variance && Math.abs(result.amount_variance) > 0.01) {
        issues.financial.push({
          id: `${result.id}-amount`,
          field: 'amount',
          lineNumber: result.invoice_line_id ? lines.findIndex(l => l.id === result.invoice_line_id) + 1 : undefined,
          message: `Amount variance detected${result.invoice_line_id ? ` on line item` : ''}`,
          details: lineDesc,
          actualValue: 'Invoice amount',
          expectedValue: 'PO amount',
          variance: result.amount_variance,
          severity: result.within_tolerance ? 'warning' : 'error',
          category: 'financial',
          action: result.matched_po_line_id ? {
            label: 'View PO',
            onClick: () => console.log('View PO', result.matched_po_line_id),
          } : undefined,
        });
      }

      // Price variances
      if (result.price_variance && Math.abs(result.price_variance) > 0.01) {
        issues.financial.push({
          id: `${result.id}-price`,
          field: 'unit_price',
          lineNumber: result.invoice_line_id ? lines.findIndex(l => l.id === result.invoice_line_id) + 1 : undefined,
          message: `Unit price mismatch${result.invoice_line_id ? ` on line item` : ''}`,
          details: lineDesc,
          variance: result.price_variance,
          severity: result.within_tolerance ? 'warning' : 'error',
          category: 'financial',
        });
      }

      // Quantity variances
      if (result.qty_variance && Math.abs(result.qty_variance) > 0.01) {
        issues.financial.push({
          id: `${result.id}-qty`,
          field: 'quantity',
          lineNumber: result.invoice_line_id ? lines.findIndex(l => l.id === result.invoice_line_id) + 1 : undefined,
          message: `Quantity variance detected${result.invoice_line_id ? ` on line item` : ''}`,
          details: lineDesc,
          variance: result.qty_variance,
          severity: result.within_tolerance ? 'warning' : 'error',
          category: 'financial',
        });
      }

      // Missing PO
      if (result.explanation_code === 'NO_PO' && !hasAddedNoPO) {
        issues.process.push({
          id: `no-po`,
          message: 'No Purchase Order found',
          details: 'This invoice requires a valid PO for processing',
          severity: 'error',
          category: 'process',
          action: {
            label: 'Create PO',
            onClick: () => console.log('Create PO'),
          },
        });
        hasAddedNoPO = true;
      }

      // Missing receipt
      if ((result.explanation_code === 'NO_RECEIPT' || (!result.matched_gr_line_id && !result.matched_ses_line_id && result.rule_applied === '3-way')) && !hasAddedMissingReceipt) {
        issues.process.push({
          id: `no-receipt`,
          message: 'Goods receipt missing',
          details: '3-way match requires goods receipt or service entry',
          severity: 'warning',
          category: 'process',
          action: {
            label: 'View Details',
            onClick: () => console.log('View receipt details'),
          },
        });
        hasAddedMissingReceipt = true;
      }

      // Over tolerance
      if (result.explanation_code === 'OVER_TOLERANCE' && !result.within_tolerance) {
        issues.compliance.push({
          id: `${result.id}-tolerance`,
          message: 'Exceeds configured tolerance',
          details: `Variance exceeds acceptable limits${result.invoice_line_id ? ` for line item` : ''}`,
          severity: 'error',
          category: 'compliance',
          action: {
            label: 'Request Approval',
            onClick: () => console.log('Request approval'),
          },
        });
      }
    });

    // Add some example risk validations (these would come from the validation service)
    if (matchResults.length > 0 && !matchResults.some(r => r.within_tolerance)) {
      issues.risk.push({
        id: 'risk-1',
        message: 'Multiple matching failures detected',
        details: 'This invoice has multiple validation issues that require review',
        severity: 'warning',
        category: 'risk',
      });
    }

    return issues;
  }, [matchResults, lines]);

  const handleRerunMatching = async () => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/rerun-matching`, {
        method: 'POST',
      });
      if (response.ok) {
        // Refresh the page or update state
        window.location.reload();
      }
    } catch (error) {
      console.error('Error rerunning matching:', error);
    }
  };

  // Check if all validations passed
  const allPassed = Object.values(validationIssues).every(
    categoryIssues => categoryIssues.filter(i => i.severity === 'error').length === 0
  );

  // Special display for Non-PO vendors
  if (isNonPOVendor) {
    return (
      <div className="space-y-4 p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-950">Non-PO Invoice</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              This vendor does not require Purchase Order matching
            </p>
          </div>
        </div>
        
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
                <RefreshCw className="h-4 w-4 text-purple-600" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-950 mb-1">Non-PO Vendor</h3>
              <p className="text-sm text-gray-600">
                This invoice is from a vendor that doesn't require Purchase Order or Goods Receipt matching. 
                The invoice will be processed based on configured approval workflows only.
              </p>
            </div>
          </div>
        </div>

        {/* Show any validation issues that aren't PO-related */}
        {Object.values(validationIssues).some(issues => issues.length > 0) && (
          <ValidationCardContainer>
            {validationIssues.financial.length > 0 && (
              <ValidationCard
                category="financial"
                issues={validationIssues.financial}
                defaultExpanded={validationIssues.financial.length === 1}
              />
            )}
            {validationIssues.compliance.length > 0 && (
              <ValidationCard
                category="compliance"
                issues={validationIssues.compliance}
                defaultExpanded={validationIssues.compliance.length === 1}
              />
            )}
            {validationIssues.data_quality.length > 0 && (
              <ValidationCard
                category="data_quality"
                issues={validationIssues.data_quality}
                defaultExpanded={validationIssues.data_quality.length === 1}
              />
            )}
          </ValidationCardContainer>
        )}
      </div>
    );
  }

  if (matchResults.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-center max-w-md">
          <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
            <RefreshCw className="h-full w-full" />
          </div>
          <h3 className="text-lg font-medium text-gray-950 mb-2">No Matching Results</h3>
          <p className="text-sm text-gray-500 mb-4">
            This invoice has not been matched yet. Click the button below to run the matching process.
          </p>
          <button
            onClick={handleRerunMatching}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-900 text-white rounded-md hover:bg-purple-800 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Run Matching
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {/* Header with rerun button */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-950">Matching Validation Results</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Review validation issues grouped by category
          </p>
        </div>
        <button
          onClick={handleRerunMatching}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-purple-900 text-white rounded-md hover:bg-purple-800 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Re-run Matching
        </button>
      </div>

      {/* Validation cards */}
      <ValidationCardContainer>
        {allPassed ? (
          <ValidationSuccessCard />
        ) : (
          <>
            {validationIssues.financial.length > 0 && (
              <ValidationCard
                category="financial"
                issues={validationIssues.financial}
                defaultExpanded={validationIssues.financial.length === 1}
              />
            )}
            {validationIssues.process.length > 0 && (
              <ValidationCard
                category="process"
                issues={validationIssues.process}
                defaultExpanded={validationIssues.process.length === 1}
              />
            )}
            {validationIssues.compliance.length > 0 && (
              <ValidationCard
                category="compliance"
                issues={validationIssues.compliance}
                defaultExpanded={validationIssues.compliance.length === 1}
              />
            )}
            {validationIssues.risk.length > 0 && (
              <ValidationCard
                category="risk"
                issues={validationIssues.risk}
                defaultExpanded={validationIssues.risk.length === 1}
              />
            )}
            {validationIssues.data_quality.length > 0 && (
              <ValidationCard
                category="data_quality"
                issues={validationIssues.data_quality}
                defaultExpanded={validationIssues.data_quality.length === 1}
              />
            )}
          </>
        )}
      </ValidationCardContainer>
    </div>
  );
}