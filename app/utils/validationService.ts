// Validation service for invoice field validation

export type ValidationSeverity = 'error' | 'warning' | 'info';
export type ValidationCategory = 'financial' | 'process' | 'compliance' | 'risk' | 'data_quality';

export interface ValidationResult {
  field: string;
  message: string;
  severity: ValidationSeverity;
  category?: ValidationCategory;
  value?: any;
  expectedValue?: any;
}

export interface InvoiceValidationData {
  invoice_number?: string;
  invoice_date?: string;
  due_date?: string;
  total?: number;
  subtotal?: number;
  tax_total?: number;
  vendor_id?: string;
  vendor_name_snapshot?: string;
  vendor_tax_id_snapshot?: string;
  vendor_approval_status?: string;
  payment_terms_id?: string;
  po_numbers_cached?: string[];
  status?: string;
  match_status?: string;
}

// Validation rules
export class InvoiceValidator {
  private errors: ValidationResult[] = [];
  private warnings: ValidationResult[] = [];
  private info: ValidationResult[] = [];

  constructor(private invoice: InvoiceValidationData) {}

  // Run all validations
  validate(): {
    errors: ValidationResult[];
    warnings: ValidationResult[];
    info: ValidationResult[];
    confidenceScore: number;
    fraudRiskScore: number;
  } {
    this.errors = [];
    this.warnings = [];
    this.info = [];

    // Data quality validations
    this.validateDates();
    this.validateRequiredFields();
    
    // Financial validations
    this.validateAmounts();
    this.validateTaxCalculation();
    
    // Process validations
    this.validatePORequirement();
    this.validateMatchStatus();
    
    // Risk validations
    this.validateVendorInfo();
    this.detectPotentialFraud();

    // Calculate scores
    const confidenceScore = this.calculateConfidenceScore();
    const fraudRiskScore = this.calculateFraudRiskScore();

    return {
      errors: this.errors,
      warnings: this.warnings,
      info: this.info,
      confidenceScore,
      fraudRiskScore,
    };
  }

  // Date validations
  private validateDates() {
    if (this.invoice.invoice_date && this.invoice.due_date) {
      const invoiceDate = new Date(this.invoice.invoice_date);
      const dueDate = new Date(this.invoice.due_date);
      
      if (dueDate < invoiceDate) {
        this.errors.push({
          field: 'due_date',
          message: 'Due date is before invoice date',
          severity: 'error',
          category: 'data_quality',
          value: this.invoice.due_date,
          expectedValue: `Should be after ${this.invoice.invoice_date}`,
        });
      }
      
      // Check if due date is too far in the future (suspicious)
      const daysDiff = Math.floor((dueDate.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff > 120) {
        this.warnings.push({
          field: 'due_date',
          message: 'Unusually long payment terms (>120 days)',
          severity: 'warning',
          category: 'risk',
          value: daysDiff,
        });
      }
    }
  }

  // Required field validations
  private validateRequiredFields() {
    const requiredFields = [
      'invoice_number',
      'vendor_name_snapshot',
      'total',
      'due_date',
    ];

    requiredFields.forEach(field => {
      if (!this.invoice[field as keyof InvoiceValidationData]) {
        this.errors.push({
          field,
          message: `${field.replace('_', ' ')} is required`,
          severity: 'error',
          category: 'data_quality',
        });
      }
    });
  }

  // Amount validations
  private validateAmounts() {
    const { total, subtotal, tax_total } = this.invoice;
    
    if (total !== undefined && subtotal !== undefined && tax_total !== undefined) {
      const expectedTotal = subtotal + tax_total;
      const variance = Math.abs(total - expectedTotal);
      
      if (variance > 0.01) { // Allow for small rounding differences
        this.errors.push({
          field: 'total',
          message: 'Total amount does not match subtotal + tax',
          severity: 'error',
          category: 'financial',
          value: total,
          expectedValue: expectedTotal,
        });
      }
    }

    // Check for suspiciously round numbers
    if (total && total > 1000 && total % 1000 === 0) {
      this.warnings.push({
        field: 'total',
        message: 'Suspiciously round number detected',
        severity: 'warning',
        category: 'risk',
        value: total,
      });
    }

    // Check for unusually high amounts
    if (total && total > 50000) {
      this.warnings.push({
        field: 'total',
        message: 'Amount exceeds typical range - requires manager approval',
        severity: 'warning',
        category: 'compliance',
        value: total,
      });
    }
  }

  // Tax calculation validation
  private validateTaxCalculation() {
    const { subtotal, tax_total } = this.invoice;
    
    if (subtotal && tax_total) {
      const taxRate = (tax_total / subtotal) * 100;
      
      // Check for common tax rates (adjust based on your jurisdiction)
      const commonRates = [0, 5, 6, 7, 7.25, 8, 8.25, 8.5, 9, 10, 15, 20];
      const isCommonRate = commonRates.some(rate => Math.abs(taxRate - rate) < 0.1);
      
      if (!isCommonRate && taxRate > 0) {
        this.warnings.push({
          field: 'tax_total',
          message: `Unusual tax rate: ${taxRate.toFixed(2)}%`,
          severity: 'warning',
          category: 'financial',
          value: taxRate.toFixed(2),
        });
      }
    }
  }

  // PO requirement validation
  private validatePORequirement() {
    const { total, po_numbers_cached } = this.invoice;
    
    // Check if PO is required based on amount
    if (total && total > 1000 && (!po_numbers_cached || po_numbers_cached.length === 0)) {
      this.errors.push({
        field: 'po_numbers_cached',
        message: 'Purchase Order required for amounts over $1,000',
        severity: 'error',
        category: 'process',
        value: po_numbers_cached,
      });
    }
  }

  // Match status validation
  private validateMatchStatus() {
    const { match_status } = this.invoice;
    
    if (match_status === 'exception' || match_status === 'not_matched') {
      this.warnings.push({
        field: 'match_status',
        message: 'Invoice has matching exceptions that need review',
        severity: 'warning',
        category: 'process',
        value: match_status,
      });
    }
  }

  // Vendor information validation
  private validateVendorInfo() {
    const { vendor_tax_id_snapshot, vendor_approval_status } = this.invoice;
    
    if (!vendor_tax_id_snapshot) {
      this.warnings.push({
        field: 'vendor_tax_id_snapshot',
        message: 'Missing vendor tax ID',
        severity: 'warning',
        category: 'compliance',
      });
    }

    // Check vendor approval status
    if (vendor_approval_status === 'pending') {
      this.warnings.push({
        field: 'vendor_approval_status',
        message: 'Vendor not approved in master data',
        severity: 'warning',
        category: 'compliance',
        value: vendor_approval_status,
      });
    }
  }

  // Fraud detection
  private detectPotentialFraud() {
    const { invoice_number } = this.invoice;
    
    // Check for sequential gaps (simplified - would need historical data)
    if (invoice_number) {
      const numberMatch = invoice_number.match(/\d+$/);
      if (numberMatch) {
        const num = parseInt(numberMatch[0]);
        // This is simplified - in reality, you'd check against historical invoices
        if (num % 111 === 0) { // Pattern detection
          this.warnings.push({
            field: 'invoice_number',
            message: 'Invoice number follows suspicious pattern',
            severity: 'warning',
            category: 'risk',
            value: invoice_number,
          });
        }
      }
    }
  }

  // Calculate confidence score based on validation results
  private calculateConfidenceScore(): number {
    let score = 100;
    
    // Deduct points for issues
    score -= this.errors.length * 20;
    score -= this.warnings.length * 10;
    score -= this.info.length * 2;
    
    // Ensure score is between 0 and 100
    return Math.max(0, Math.min(100, score));
  }

  // Calculate fraud risk score
  private calculateFraudRiskScore(): number {
    let score = 0;
    
    // Increase score for risk-related issues
    const riskIssues = [...this.errors, ...this.warnings].filter(
      issue => issue.category === 'risk'
    );
    
    score += riskIssues.length * 25;
    
    // Check for specific fraud indicators
    if (this.warnings.some(w => w.message.includes('round number'))) {
      score += 15;
    }
    
    if (this.warnings.some(w => w.message.includes('suspicious pattern'))) {
      score += 20;
    }
    
    // Ensure score is between 0 and 100
    return Math.min(100, score);
  }
}

// Helper function to get validation summary
export function getValidationSummary(validationResults: {
  errors: ValidationResult[];
  warnings: ValidationResult[];
  info: ValidationResult[];
}): string {
  const { errors, warnings, info } = validationResults;
  
  if (errors.length === 0 && warnings.length === 0) {
    return 'All validations passed';
  }
  
  const parts = [];
  if (errors.length > 0) {
    parts.push(`${errors.length} error${errors.length !== 1 ? 's' : ''}`);
  }
  if (warnings.length > 0) {
    parts.push(`${warnings.length} warning${warnings.length !== 1 ? 's' : ''}`);
  }
  if (info.length > 0) {
    parts.push(`${info.length} info${info.length !== 1 ? 's' : ''}`);
  }
  
  return parts.join(', ');
}

// Group validations by category
export function groupValidationsByCategory(
  validations: ValidationResult[]
): Record<ValidationCategory, ValidationResult[]> {
  const grouped: Record<ValidationCategory, ValidationResult[]> = {
    financial: [],
    process: [],
    compliance: [],
    risk: [],
    data_quality: [],
  };
  
  validations.forEach(validation => {
    const category = validation.category || 'data_quality';
    grouped[category].push(validation);
  });
  
  return grouped;
}