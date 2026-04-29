// Mock Invoice Service - Baseline Approach for Xelix Connect 2025 Demo
//
// This service provides 3 baseline mock invoices for testing and development.
// Demo-specific invoices will be added iteratively based on demo scenarios.
//
// REFACTORED: 2025-01-22 for Xelix Connect 2025 demo showcase
// Previous version with 49 invoices archived in mockInvoiceService.archive.ts
// Documentation: MOCK_INVOICES_ARCHIVE.md

import { UnifiedInvoice } from '@/types/invoice';
import { POLineUsage, ResolvedPOLine } from '@/types/api';
import { enrichInvoiceWithDemoData } from './invoiceDataService';
import { getMockPOByNumber } from './mockPOService';
import { generateAgentProcessedInvoices, getAgentProcessedInvoiceById } from './agentInvoiceService';

// Type alias for backward compatibility
type Invoice = Partial<UnifiedInvoice>;

const OVERDUE_SUBSET_PERCENT = 15;

const getStartOfTodayUtc = (): Date => {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return today;
};

const addUtcDays = (date: Date, days: number): Date => {
  const shifted = new Date(date);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted;
};

const toDateOnly = (date: Date): string => date.toISOString().split('T')[0];

const stableHash = (value: string): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
};

const normalizeMockInvoiceDates = (invoices: Invoice[]): Invoice[] => {
  const today = getStartOfTodayUtc();

  return invoices.map((invoice, index) => {
    const invoiceId = typeof invoice.id === 'string' && invoice.id.length > 0 ? invoice.id : `mock-${index}`;
    const hash = stableHash(invoiceId);

    // Deterministic "random" invoice date within last 7 days.
    const daysAgo = hash % 7;
    const invoiceDate = addUtcDays(today, -daysAgo);
    const minDueDate = addUtcDays(invoiceDate, 3);
    const standardDueDate = addUtcDays(invoiceDate, 30);

    // Keep a small, stable overdue subset so red aging still signals meaningfully.
    const isOverdueSubset = hash % 100 < OVERDUE_SUBSET_PERCENT;
    const overdueDays = (hash % 7) + 1; // 1-7 days overdue
    const overdueDueDate = addUtcDays(today, -overdueDays);
    const tentativeDueDate = isOverdueSubset ? overdueDueDate : standardDueDate;
    const dueDate = tentativeDueDate < minDueDate ? minDueDate : tentativeDueDate;

    const operationalDate = dueDate < today ? dueDate : today;

    return {
      ...invoice,
      invoice_date: toDateOnly(invoiceDate),
      due_date: toDateOnly(dueDate),
      email_received_date: toDateOnly(operationalDate),
      data_ingestion_date: toDateOnly(operationalDate)
    };
  });
};

// ============================================================================
// BASELINE INVOICE GENERATORS
// ============================================================================

/**
 * Generate 3 baseline mock invoices for testing and basic demonstration:
 * 1. baseline-po-1: Non-PO classification (INV3745-02); line history may reference PO for demo
 * 2. baseline-nonpo-1: Simple non-PO workflow
 * 3. baseline-matched-1: Successfully processed invoice (appears in "All" tab)
 */
export const generateBaselineInvoices = (): Invoice[] => {
  const now = new Date();
  const mockInvoices: Invoice[] = [];

  // ========================================================================
  // BASELINE INVOICE (Non-PO badge — INV3745-02)
  // ========================================================================
  const baselinePODate = new Date(now);
  baselinePODate.setDate(baselinePODate.getDate() - 5); // Created 5 days ago
  const baselinePODueDate = new Date(baselinePODate);
  baselinePODueDate.setDate(baselinePODueDate.getDate() + 30); // Due in 25 days

  const baselinePOLines = [
    {
      id: 'line-baseline-po-1',
      line_no: 1,
      sku: 'DK-0001',
      product_code: 'DK-0001',
      description: 'Software License - Annual Subscription',
      qty: 10,
      uom: 'EA',
      unit_price: 200.00,
      net_amount: 2000.00,
      line_total: 2000.00,
      po_line_id: 'po-line-9001-1',
      gr_line_id: null,
      ses_line_id: null
    },
    {
      id: 'line-baseline-po-2',
      line_no: 2,
      sku: 'TV-0002',
      product_code: 'TV-0002',
      description: 'Professional Services - Account Onboarding Sessions',
      qty: 4,
      uom: 'EA',
      unit_price: 1250.00,
      net_amount: 5000.00,
      line_total: 5000.00,
      po_line_id: 'po-line-9001-2',
      gr_line_id: null,
      ses_line_id: null
    }
  ];

  const baselinePOSubtotal = 7000.00;
  const baselinePOTax = 1400.00; // 20% VAT
  const baselinePOTotal = 8400.00;

  mockInvoices.push({
    id: 'baseline-po-1',
    invoice_number: 'INV3745-02', // Found in unusual location (footer)
    vendor_name_snapshot: 'TechSupply Solutions Ltd',
    vendor_id: 'VND0001412',
    vendor_tax_id_snapshot: '637 214 5',
    vendor_address_snapshot: 'Office 12, 123 Fairview, Claremont Street, Stratford-upon-Avon, CV37 0AE',
    vendor_email: 'accountsreceiveable@techsupplysls.com',
    vendor_phone: '+44 (0) 1789 557 849',
    customer_no: 'CS948929',
    job_number: null, // Will be filled by user or AI suggestion
    // Customer/Bill To information
    bill_to_snapshot: {
      legal_name: 'GSPV Ltd',
      tax_id: '927 8131 1',
      email: 'phil@xelix.com',
      phone: '+44 20 8648 4267',
      address: 'Senna Building, Gorsuch Pl, London, E2 8JF'
    },
    invoice_date: '2025-11-08',
    due_date: '2025-12-08',
    email_received_date: '2025-11-07', // Received day before invoice date
    currency: 'GBP',
    subtotal: baselinePOSubtotal,
    tax_total: baselinePOTax,
    tax_rate_percent: 20,
    total: baselinePOTotal,
      status: 'verification', // Verification stage (AI suggestions need review)
      match_status: 'matched', // Line items match PO perfectly, no financial variances
      company_code: 'GSPV Ltd',
      type: 'Non-PO',
    vendor_requires_po: false,
    vendor_is_verified: true,
    approval_status: 'pending',
    assigned_to_name: 'Sarah Chen',
    assigned_to_email: 'sarah.chen@gspv.com',
    assigned_to_user_id: 'user-4',
    po_numbers_cached: [],
    gr_numbers: [],
    docType: 'Invoice',
    issues: ['Missing Field'],
    created_at: baselinePODate.toISOString(),
    updated_at: baselinePODate.toISOString(),
    data_ingestion_date: baselinePODate.toISOString().split('T')[0],
    // Accounting codes from spreadsheet
    ledger: 'Accounts Payable',
    cost_center: 'CC-9002',
    cost_center_name: 'IT Services Department',
    gl_code: 'GL-5000',
    department: 'Product',
    payment_terms: '30', // Net 30
    lines: baselinePOLines,
    invoice_lines: baselinePOLines,
    // Banking information from spreadsheet
    payment_bank_details: {
      bank_name: 'HSBC UK',
      account_number: '12345674',
      iban: 'GB63 HBUK 4005 1512 3456 74',
      swift_bic: 'HBUKGB4B',
      sort_code: '40-05-15'
    },
    // OCR extraction results with AI candidate suggestion
    ocr_extractions: {
      invoice_number: {
        value: null, // System didn't capture it
        confidence: 0.0,
        candidates: [
          {
            value: 'INV3745-02',
            confidence: 0.85,
            source: 'Claude Vision',
            reason: 'Found invoice reference "INV3745-02" in document header area - identified as invoice number based on format pattern and positioning near vendor details'
          }
        ]
      },
      job_number: {
        value: null, // Custom field - not detected automatically
        confidence: 0.0,
        candidates: [] // Empty - AI doesn't know where to look yet
      }
    },
    // Display configuration for purple modern template
    display_config: {
      template: 'purple-modern',
      interactiveFields: ['invoice_number', 'job_number'], // Enable AI suggestions for these fields
      layout: {
        invoiceNumberPlacement: 'above-logo',
        showInvoiceNumberLabel: false
      }
    },
    // Auto-correction: Invoice number found in unusual location
    auto_corrections: [
      {
        field: 'invoice_number',
        original_value: 'INV3745-02',
        corrected_value: 'INV3745-02',
        reason: 'Invoice number found in unusual location (document footer) instead of standard header position. Value confirmed correct despite non-standard placement.',
        vendor_name: 'TechSupply Solutions Ltd',
        document_type: 'invoice',
        recent_documents: [
          { number: 'INV3745-02', date: 'Nov 8, 2025', amount: '$8,400.00', is_current: true },
          { number: 'INV3745-03', date: 'Nov 15, 2025', amount: '$6,800.00' },
          { number: 'INV3745-04', date: 'Nov 22, 2025', amount: '$7,200.00' }
        ]
      }
    ],
    // Agent actions taken during processing
    agent_actions: [
      {
        agent_name: 'TechSupply Customer ID',
        action: 'Could not find Customer Reference ID',
        status: 'failed',
        detail: '- Any invoice from TechSupply must contain a Customer ID\n- If a Customer ID is not extracted from the invoice, raise it as an exception',
        agent_id: '9',
        mode: 'auto-apply'
      }
    ],
    // Suppress specific validation categories (agent action cards replace these)
    suppress_validation_categories: ['data_quality'],
    // Invoice-specific: non-PO flow — hide InvoiceValidator process issue for missing PO (DetailsTab filtered cards)
    suppress_validation_fields: ['po_numbers_cached'],
    // Invoice-specific: non-PO flow work — skip auto-generated "PO required" risk (see generateValidationWarnings)
    validation_warnings: [],
  } as Invoice);

  // ========================================================================
  // BASELINE PO INVOICE #2 - PERFECT MATCH BUT BANK DETAILS EXCEPTION
  // ========================================================================
  const baselinePOBankDate = new Date(now);
  baselinePOBankDate.setDate(baselinePOBankDate.getDate() - 4); // Created 4 days ago
  const baselinePOBankDueDate = new Date(baselinePOBankDate);
  baselinePOBankDueDate.setDate(baselinePOBankDueDate.getDate() + 30); // Due in 26 days

  const baselinePOBankLines = [
    {
      id: 'line-baseline-po-bank-1',
      line_no: 1,
      sku: '-',
      description: 'Toyota Prius 2022 (7 days) for PO-2025-9010',
      qty: 7,
      uom: 'DAYS',
      unit_price: 120.00,
      net_amount: 840.00,
      tax_rate: 15,
      tax_amount: 126.00,
      line_total: 966.00,
      po_line_id: 'po-line-9010-bundle',
      gr_line_id: null,
      ses_line_id: null,
      notes: 'Class 2 Vehicle rental. Pick-up and drop-off from same location. Fleet Booking (rentalcars.com). Full-to-full return policy.'
    },
    {
      id: 'line-baseline-po-bank-2',
      line_no: 2,
      sku: '-',
      description: 'Motor Insurance - Comprehensive (Class 2 Vehicle) for PO-2025-9010',
      qty: 7,
      uom: 'DAYS',
      unit_price: 30.00,
      net_amount: 210.00,
      tax_rate: 15,
      tax_amount: 31.50,
      line_total: 241.50,
      po_line_id: 'po-line-9010-bundle',
      gr_line_id: null,
      ses_line_id: null,
      notes: 'Full protection incl. 3rd-Party Liability'
    }
  ];

  const baselinePOBankSubtotal = 1050.00;
  const baselinePOBankTax = 157.50; // 15% tax
  const baselinePOBankTotal = 1207.50;

  mockInvoices.push({
    id: 'baseline-po-bank-1',
    invoice_number: 'IV472-884',
    vehicle_registration_no: 'BIL5954',
    customer_no: 'C1118382',
    job_number: 'C1118382',
    vendor_name_snapshot: 'Fleet Inc.',
    vendor_id: 'VND0001544',
    vendor_tax_id_snapshot: 'WB474PR',
    vendor_email: 'receiveables@fleetinc.com',
    vendor_phone: '+1 (253) 212-1077',
    vendor_address_snapshot: '2608 84th Street Ct S, Lakewood, Washington (WA), 98499',
    invoice_date: '2025-11-09',
    due_date: '2025-12-09',
    email_received_date: '2025-11-08',
    payment_terms: 'NET 30',
    currency: 'USD',
    subtotal: baselinePOBankSubtotal,
    tax_total: baselinePOBankTax,
    tax_rate_percent: 15,
    total: baselinePOBankTotal,
      status: 'verification', // Verification stage (bank details need verification)
      match_status: 'exception', // Exception due to bank details only
      company_code: 'GSPV Ltd',
      type: 'PO',
    vendor_requires_po: true,
    vendor_is_verified: true,
    approval_status: 'pending',
    assigned_to_name: 'James Wilson',
    assigned_to_user_id: 'user-4',
    po_numbers_cached: ['PO-2025-9010'],
    bill_to_snapshot: {
      legal_name: 'GSPV Ltd',
      address: 'Senna Building, Gorsuch Pl, London, E2 8JF',
      tax_id: '927 8131 1',
      email: 'phil@xelix.com',
      phone: '+44 20 8648 4267'
    },
    gr_numbers: [],
    docType: 'Invoice',
    issues: ['Bank Details Change'],
    created_at: baselinePOBankDate.toISOString(),
    updated_at: baselinePOBankDate.toISOString(),
    data_ingestion_date: baselinePOBankDate.toISOString().split('T')[0],
    lines: baselinePOBankLines,
    invoice_lines: baselinePOBankLines,
    // Payment bank details (new account that differs from MVD)
    payment_bank_details: {
      bank_name: 'EASTERN BANK',
      account_name: 'Fleet Inc.',
      account_number: '13719713158835300',
      routing_number: '011002550',
      iban: 'GB82 WEST 2014 5370 0123 87',
      swift_bic: 'EASTUSX1',
      sort_code: '20-14-53',
      bank_currency: 'USD',
      bank_address: '195 MARKET STREET, LYNN, MASSACHUSETTS MA, 01901'
    },
    // Bank details exception - account changed
    validation_warnings: [{
      type: 'bank_details_change',
      category: 'risk',
      field: 'payment_bank_details',
      message: 'Bank account changed since last invoice',
      severity: 'error',
      old_bank_details: {
        bank_name: 'WESTERN BANK',
        account_name: 'Fleet Inc.',
        account_number: '98765432101',
        routing_number: '011002551',
        iban: 'GB29 NWBK 6016 1331 9268 19',
        swift_bic: 'NWBKGB2L',
        sort_code: '60-16-13',
        bank_currency: 'USD',
        bank_address: '195 MARKET STREET, LYNN, MASSACHUSETTS MA, 01901'
      },
      new_bank_details: {
        bank_name: 'EASTERN BANK',
        account_name: 'Fleet Inc.',
        account_number: '13719713158835300',
        routing_number: '011002550',
        iban: 'GB82 WEST 2014 5370 0123 87',
        swift_bic: 'EASTUSX1',
        sort_code: '20-14-53',
        bank_currency: 'USD',
        bank_address: '195 MARKET STREET, LYNN, MASSACHUSETTS MA, 01901'
      },
      // Legacy fields for backward compatibility
      old_account: '****2101',
      new_account: '****5300'
    }],
    // Requisitioner information for verification email
    requisitioner: {
      name: 'Sarah Johnson',
      email: 'sarah.johnson@company.com',
      department: 'Sales'
    },
    // OCR extractions with confidence scores
    ocr_extractions: {
      invoice_number: {
        value: 'IV472-884',
        confidence: 0.96,
        candidates: []
      },
      customer_no: {
        value: 'C1118382',
        confidence: 0.94,
        candidates: []
      },
      job_number: {
        value: 'C1118382',
        confidence: 0.94,
        candidates: []
      },
      vehicle_registration_no: {
        value: 'BIL5954',
        confidence: 0.92,
        candidates: []
      },
      po_numbers_cached: {
        value: 'PO-2025-9010',
        confidence: 0.95,
        candidates: []
      }
    },
    // Auto-corrections for fields that were mixed up on scanned document
    auto_corrections: [
      {
        field: 'invoice_number',
        original_value: 'PO-2025-9010',
        corrected_value: 'IV472-884',
        reason: 'Invoice and PO numbers were swapped on the scanned document. Auto-corrected based on detected numbering patterns.',
        vendor_name: 'Fleet Inc.',
        document_type: 'invoice',
        recent_documents: [
          { number: 'IV472-882', date: 'Oct 20, 2025', amount: '$1,150.00' },
          { number: 'IV472-883', date: 'Nov 1, 2025', amount: '$890.50' },
          { number: 'IV472-884', date: 'Nov 9, 2025', amount: '$1,207.50', is_current: true }
        ]
      },
      {
        field: 'po_numbers_cached',
        original_value: 'IV472-884',
        corrected_value: 'PO-2025-9010',
        reason: 'Invoice and PO numbers were swapped on the scanned document. Auto-corrected based on detected numbering patterns.',
        vendor_name: 'Fleet Inc.',
        document_type: 'po',
        recent_documents: [
          { number: 'PO-2025-9008', date: 'Oct 15, 2025', amount: '$2,100.00' },
          { number: 'PO-2025-9009', date: 'Oct 28, 2025', amount: '$950.00' },
          { number: 'PO-2025-9010', date: 'Nov 5, 2025', amount: '$1,207.50', is_current: true }
        ]
      }
    ],
    // Display configuration for simple table invoice template
    display_config: {
      template: 'simple-table-invoice'
    },
    // Agent actions taken during processing
    agent_actions: [
      {
        agent_name: 'Bank details checker',
        action: 'Bank detail discrepancy detected',
        status: 'failed',
        detail: '- If the bank details on the invoice are not present in the Master Vendor data for the given supplier, raise an exception',
        agent_id: '10',
        mode: 'auto-apply'
      }
    ],
    suppress_validation_categories: ['risk']
  } as Invoice);

  // ============================================================================
  // MISSING PO INVOICE - Premier Office Supplies
  // ============================================================================
  // Complete invoice but missing PO field - needs PO assignment

  const missingPODate = new Date('2025-10-21');
  const missingPODueDate = new Date('2025-11-20');

  const missingPOLines = [
    {
      id: 'line-missing-po-1',
      line_no: 1,
      description: 'Premium Copy Paper, 8.5×11, 20lb, White',
      sku: 'PA1144',
      notes: 'Reem of 100gsm premium paper',
      qty: 10,
      uom: 'RM',
      unit_price: 45.00,
      net_amount: 450.00,
      tax_rate: 20,
      tax_amount: 90.00,
      line_total: 540.00,
      po_line_id: null, // No PO match
      gr_line_id: null,
      ses_line_id: null
    },
    {
      id: 'line-missing-po-2',
      line_no: 2,
      description: 'Laser Printer Toner Cartridge, Black, High Yield',
      sku: 'PR4882',
      qty: 5,
      uom: 'EA',
      unit_price: 89.00,
      net_amount: 445.00,
      tax_rate: 20,
      tax_amount: 89.00,
      line_total: 534.00,
      po_line_id: null, // No PO match
      gr_line_id: null,
      ses_line_id: null
    },
    {
      id: 'line-missing-po-3',
      line_no: 3,
      description: 'Manila File Folders, Letter Size, Box of 100',
      sku: 'FO1134',
      qty: 3,
      uom: 'BX',
      unit_price: 18.50,
      net_amount: 55.50,
      tax_rate: 20,
      tax_amount: 11.10,
      line_total: 66.60,
      po_line_id: null, // No PO match
      gr_line_id: null,
      ses_line_id: null
    },
    {
      id: 'line-missing-po-4',
      line_no: 4,
      description: 'Ballpoint Pens, Black, Medium Point, Box of 12',
      sku: 'PE8447',
      qty: 8,
      uom: 'BX',
      unit_price: 6.25,
      net_amount: 50.00,
      tax_rate: 20,
      tax_amount: 10.00,
      line_total: 60.00,
      po_line_id: null, // No PO match
      gr_line_id: null,
      ses_line_id: null
    }
  ];

  const missingPOSubtotal = 1000.50;
  const missingPOTax = 200.10; // 20% sales tax
  const missingPOTotal = 1200.60;

  mockInvoices.push({
    id: 'missing-po-1',
    invoice_number: 'POS-2025-8842',
    job_number: 'JOB-2025-450',
    vendor_name_snapshot: 'Premier Office Supplies',
    vendor_id: 'VND-5002',
    vendor_tax_id_snapshot: 'WB994610',
    vendor_address_snapshot: '19200 SW 116th Ave Miami FL 33157',
    vendor_country_snapshot: 'United States of America (USA)',
    invoice_date: missingPODate.toISOString().split('T')[0],
    due_date: missingPODueDate.toISOString().split('T')[0],
    email_received_date: (() => { const d = new Date(missingPODate); d.setDate(d.getDate() - 1); return d.toISOString().split('T')[0]; })(),
    currency: 'USD',
    customer_no: 'CUST661000',
    subtotal: missingPOSubtotal,
    tax_total: missingPOTax,
    tax_rate_percent: 20,
    total: missingPOTotal,
      status: 'verification', // Verification stage (close match PO needs user confirmation)
      match_status: 'exception', // Missing PO - no PO assigned yet
      company_code: 'GSPV Ltd',
      type: 'PO',
    vendor_requires_po: true, // This vendor requires PO
    vendor_is_verified: true,
    approval_status: 'pending',
    // No assigned approver yet - this invoice needs review before assignment
    assigned_to_name: undefined,
    assigned_to_user_id: undefined,
    po_numbers_cached: [], // Empty - no PO assigned yet (user must accept AI suggestion)
    po_id: null, // No PO ID until user accepts the close_match_po suggestion
    gr_numbers: [],
    docType: 'Invoice',
    issues: ['Missing PO'],
    created_at: missingPODate.toISOString(),
    updated_at: missingPODate.toISOString(),
    data_ingestion_date: missingPODate.toISOString().split('T')[0],
    lines: missingPOLines,
    invoice_lines: missingPOLines,
    bill_to_snapshot: {
      legal_name: 'GSPV Ltd',
      address: 'Senna Building, Gorsuch Pl, London, Greater London, United Kingdom (UK) - E2 8JF',
      tax_id: '927 8131 1',
      email: 'us_accountspayable@xelix.com'
    },
    payment_method: 'bank_transfer',
    payment_bank_details: {
      bank_name: 'Commerce Bank',
      account_name: 'Premier Office Supplies',
      account_number: '55667789876',
      routing_number: '987654321',
      bank_address: 'Commerce Bank, 1000 Walnut Street, Kansas City, MO 64106',
    },
    // Validation warnings (empty - missing PO is handled by InvoiceValidator)
    validation_warnings: [],
    // Close match AI suggestion for PO
    close_match_po: {
      po_number: 'PO-2025-8901',
      confidence: 0.98,
      matching_factors: {
        vendor_match: true,
        date_proximity_days: 3,      // PO created Oct 18, invoice Oct 21
        line_items_overlap: 4,        // All 4 invoice items match PO
        total_line_items: 4,          // Total number of invoice line items
        variance_count: 0,            // No variance
      },
      po_summary: {
        total: 1000.50,               // Matches invoice subtotal (before tax)
        created_date: '2025-10-18',
        vendor_name: 'Premier Office Supplies',
        line_count: 4                 // Perfect match - 4 items
      }
    },
    // Extraction field confidences
    extraction_field_confidences: {
      po_numbers_cached: 0,  // 0% confidence - PO not found on document
    },
    // Display configuration for green Premier Office Supplies template
    display_config: {
      template: 'green-premier'
    },
    agent_actions: [
      {
        agent_name: 'Company Code (Global) Agent',
        action: 'Bill-to entity matched: GSPV GmbH (ap@gspv.de) → GSPV Ltd',
        status: 'success',
        detail: '- Check all emails coming into AP mailboxes\n- If email is sent to us_accountspayable@xelix then assign company code GSPV Inc\n- If email is sent to uk_accountspayable@xelix.com then assign company code GSPV Ltd\n- If the "bill to" value differs, then override the mailbox settings and assign the "bill to" value to the Company code field',
        agent_id: 'company-code-global-agent',
        mode: 'auto-apply',
      }
    ],
    suppress_validation_categories: ['process']
  } as Invoice);

  // ========================================================================
  // BASELINE PO INVOICE #4 - WITH ONE LINE ITEM MISMATCH (JanServ Plc)
  // ========================================================================
  const baselinePO2Date = new Date(now);
  baselinePO2Date.setDate(baselinePO2Date.getDate() - 7); // Created 7 days ago
  const baselinePO2DueDate = new Date(baselinePO2Date);
  baselinePO2DueDate.setDate(baselinePO2DueDate.getDate() + 30); // Due in 23 days

  const baselinePO2Lines = [
    {
      id: 'line-baseline-po2-1',
      line_no: 1,
      sku: 'EQ-012001',
      description: 'Equipment - Mower Extension',
      qty: 25,
      uom: 'Units',
      unit_price: 80.00,
      net_amount: 2000.00,
      line_total: 2000.00,
      po_line_id: 'po-line-9011-1',
      gr_line_id: null,
      ses_line_id: null
    },
    {
      id: 'line-baseline-po2-2',
      line_no: 2,
      sku: 'SE-002377',
      description: 'Installation Services - On-site Setup',
      qty: 20,
      uom: 'Hours',
      unit_price: 95.00,
      net_amount: 1900.00,
      line_total: 1900.00,
      po_line_id: 'po-line-9011-2',
      gr_line_id: null,
      ses_line_id: null
    },
    {
      id: 'line-baseline-po2-3',
      line_no: 3,
      sku: 'GU-00101',
      description: 'Training Materials - User Guides',
      qty: 20, // MISMATCH: PO has 15, invoice has 20 (variance = 5)
      uom: 'Units',
      unit_price: 45.00,
      net_amount: 900.00,
      line_total: 900.00,
      po_line_id: 'po-line-9011-3',
      gr_line_id: null,
      ses_line_id: null
    },
    {
      id: 'line-baseline-po2-4',
      line_no: 4,
      sku: 'SE-101789',
      description: 'Grounds Maintenance Services',
      qty: 12,
      uom: 'Months',
      unit_price: 200.00,
      net_amount: 2400.00,
      line_total: 2400.00,
      po_line_id: 'po-line-9011-4',
      gr_line_id: null,
      ses_line_id: null,
      // AI Smart Match applied with high confidence
      smart_match_applied: true,
      smart_match_confidence: 0.92,
      smart_match_reason: 'Smart matching applied: Grounds maintenance service matched by vendor, description pattern, and billing cycle'
    },
    {
      id: 'line-baseline-po2-5',
      line_no: 5,
      sku: 'EQ-800111',
      description: 'Pleated air filters, 20×20×2, MERV 8',
      qty: 50,
      uom: 'EA',
      unit_price: 45.00,
      net_amount: 2250.00,
      line_total: 2250.00,
      po_line_id: null, // Not matched yet - has substitution suggestion
      gr_line_id: null,
      ses_line_id: null,
      // AI Substitution Suggestion
      suggested_po_match: {
        po_line_id: 'po-line-9011-5',
        po_line_no: 5,
        po_description: 'Air Filters MERV 9 - EQ-800111',
        po_qty: 50,
        po_unit_price: 45.00,
        po_uom: 'EA',
        confidence: 0.78,
        reason: 'System detected similar items with specification differences',
        differences: [
          {
            field: 'specification',
            invoice_value: 'MERV 8',
            po_value: 'MERV 9'
          }
        ]
      }
    },
    {
      id: 'line-baseline-po2-6',
      line_no: 6,
      sku: 'MA-145784',
      description: 'Landscaping Sand',
      qty: 54,
      uom: 'EACH',
      unit_price: 50.00,
      net_amount: 2700.00,
      line_total: 2700.00,
      po_line_id: 'po-line-9011-6',
      gr_line_id: null,
      ses_line_id: null,
      // Suppress price variance (different UOM scaling) but keep qty variance visible
      suppress_price_variance: true
    }
  ];

  const baselinePO2Subtotal = 12150.00; // Updated: 2000 + 1900 + 900 + 2400 + 2250 + 2700
  const baselinePO2Tax = 2430.00; // 20% VAT
  const baselinePO2Total = 14580.00; // Updated: 12150 + 2430

  mockInvoices.push({
    id: 'baseline-po-2',
    invoice_number: 'INV-2025-0124',
    vendor_name_snapshot: 'JanServ Plc',
    vendor_id: 'VND0001489',
    vendor_tax_id_snapshot: '28N0929',
    vendor_address_snapshot: 'Danefield House, Selby Rd, Leeds, West Yorkshire (WY), United Kingdom (UK), LS25 1NG',
    vendor_email: 'accountspayable@janserv.com',
    vendor_phone: '+44 113 264 5295',
    invoice_date: '2025-11-07',
    due_date: '2025-12-08',
    email_received_date: '2025-11-06',
    customer_no: 'W4828999',
    job_number: 'WO-2025-445',
    plant_id: 'UK-4432',
    original_plant_id: '4432', // Original value from scanned document
    currency: 'GBP',
    subtotal: baselinePO2Subtotal,
    tax_total: baselinePO2Tax,
    tax_rate_percent: 20,
    total: baselinePO2Total,
      status: 'verification', // Verification stage (line item variances being checked)
      match_status: 'variance', // Has variance on line 3
      company_code: 'GSPV Ltd',
      type: 'PO',
    vendor_requires_po: true,
    vendor_is_verified: true,
    approval_status: 'pending',
    assigned_to_name: 'James Wilson',
    assigned_to_user_id: 'user-4',
    po_numbers_cached: ['PO-2025-9011'],
    /** Upper case PO agent: extracted vs stored normalized value (Details tab zap popover). */
    po_agent_normalization: {
      original: 'po-2025-9011',
      normalized: 'PO-2025-9011',
    },
    gr_numbers: [],
    docType: 'Invoice',
    issues: ['Line Item Variance'],
    created_at: baselinePO2Date.toISOString(),
    updated_at: baselinePO2Date.toISOString(),
    data_ingestion_date: baselinePO2Date.toISOString().split('T')[0],
    lines: baselinePO2Lines,
    invoice_lines: baselinePO2Lines,
    // Payment bank details
    payment_bank_details: {
      bank_name: 'SANTANDER',
      account_name: 'JanServ Plc',
      account_number: '60891848',
      sort_code: '09-01-29',
      iban: 'GB44ABBY09012960891848',
      swift: 'ABBYGB2LXXX',
      bank_currency: 'GBP',
      bank_address: 'Bridle Road, Bootle, Merseyside, United Kingdom (UK), GIR 0AA'
    },
    // Display configuration for blue header template (JanServ-inspired design)
    display_config: {
      template: 'blue-header'
    },
    // Agent extracted fields
    extraction_field_confidences: {
      plant_id: 0.95 // High confidence extraction by agent
    },
    // Agent actions taken during processing
    agent_actions: [
      {
        agent_name: 'Upper case PO',
        action: 'Normalise PO prefix to uppercase when suppliers use lowercase "po"',
        status: 'success',
        detail:
          'Some suppliers put a lowercase "po" prefix for our PO number\nPlease always change any lowercase "po" to an uppercase "PO" if you ever see this. e.g. "po-2026-9221" -> "PO-2026-9221"',
        agent_id: 'uppercase-po-1',
        mode: 'auto-apply',
      },
      {
        agent_name: 'Plant ID Prefix Agent',
        action: 'Plant ID normalised to include country prefix',
        status: 'success',
        detail: '- The Plant ID field needs a prefix of one of "UK-", "US-", "EU-".\n- If a Plant ID is missing the prefix (e.g., it\'s just 4 digits), add the correct prefix based on the receiving mailbox:\n  accounts.payable.us@xelix.com → prefix Plant ID with US-\n  accounts.payable.uk@xelix.com → prefix Plant ID with UK-\n  accounts.payable.eu@xelix.com → prefix Plant ID with EU-\n- Do not change Plant IDs that already match the required pattern.',
        agent_id: '11',
        mode: 'auto-apply'
      },
      {
        agent_name: 'Smart Match (Semantic)',
        action: 'Semantic differences detected on lines 4 & 5',
        status: 'warning',
        detail: 'Auto-apply changes to item descriptions where a semantic match is found at or above 90% confidence. Flag semantic matches below 90% confidence for manual review.',
        agent_id: '13',
        mode: 'auto-apply'
      }
    ],
    suppress_validation_fields: ['line_5'],
    exceptions_count_override: 3
  } as Invoice);

  // ========================================================================
  // BASELINE NON-PO INVOICE
  // ========================================================================
  const baselineNonPODate = new Date(now);
  baselineNonPODate.setDate(baselineNonPODate.getDate() - 3); // Created 3 days ago
  const baselineNonPODueDate = new Date(baselineNonPODate);
  baselineNonPODueDate.setDate(baselineNonPODueDate.getDate() + 30); // Due in 27 days

  const baselineNonPOLines = [
    {
      id: 'line-baseline-nonpo-1',
      line_no: 1,
      description: 'Monthly Cloud Infrastructure Services',
      qty: 1,
      uom: 'Month',
      unit_price: 3500.00,
      net_amount: 3500.00,
      line_total: 3500.00,
      po_line_id: null,
      gr_line_id: null,
      ses_line_id: null
    }
  ];

  const baselineNonPOSubtotal = 3500.00;
  const baselineNonPOTax = 700.00; // 20% VAT
  const baselineNonPOTotal = 4200.00;

  // SLA tracking for baseline-nonpo-1
  const baselineNonPOAssignedAt = new Date(now);
  baselineNonPOAssignedAt.setDate(baselineNonPOAssignedAt.getDate() - 2); // Assigned 2 days ago
  const baselineNonPODeadline = new Date(baselineNonPOAssignedAt);
  baselineNonPODeadline.setHours(baselineNonPODeadline.getHours() + 48); // 48-hour SLA

  mockInvoices.push({
    id: 'baseline-nonpo-1',
    invoice_number: 'PIT-250103001',
    vendor_name_snapshot: 'Unknown Vendor',
    vendor_id: 'VND-2001',
    invoice_date: baselineNonPODate.toISOString().split('T')[0],
    due_date: baselineNonPODueDate.toISOString().split('T')[0],
    email_received_date: (() => { const d = new Date(baselineNonPODate); d.setDate(d.getDate() - 1); return d.toISOString().split('T')[0]; })(),
    currency: 'USD',
    subtotal: baselineNonPOSubtotal,
    tax_total: baselineNonPOTax,
    tax_rate_percent: 20,
    total: baselineNonPOTotal,
    status: 'approval', // Approval stage (awaiting approver action)
    match_status: 'exception', // Exception due to vendor reassignment required
    type: 'Non-PO',
    vendor_requires_po: false,
    vendor_is_verified: true,
    approval_status: 'pending',
    assigned_to_name: 'James Wilson', // Approver assigned
    assigned_to_user_id: 'user-4',
    skip_approver_validation: true, // Don't show approver as error - only vendor exception for this demo
    job_number: 'CUST-2025-001', // Customer ID to avoid missing field exception
    // SLA tracking
    assigned_at: baselineNonPOAssignedAt.toISOString(),
    sla_hours: 48,
    sla_deadline: baselineNonPODeadline.toISOString(),
    sla_status: 'at_risk',
    po_numbers_cached: [],
    gr_numbers: [],
    docType: 'Invoice',
    issues: ['Vendor Reassignment Required'],
    created_at: baselineNonPODate.toISOString(),
    updated_at: baselineNonPODate.toISOString(),
    data_ingestion_date: baselineNonPODate.toISOString().split('T')[0],
    lines: baselineNonPOLines,
    invoice_lines: baselineNonPOLines,
    // Accounting classification with auto-coding
    ledger: 'Accounts Payable',
    cost_center: 'CC-9001',
    cost_center_name: 'General & Administrative',
    gl_code: 'GL-5000',
    department: 'US Inc',
    auto_coding_applied: true,
    auto_coding_details: {
      similar_invoices: [
        {
          invoice_number: 'INV-2024-5337',
          date: 'Sep 15, 2024',
          cost_center: 'CC-9001',
          gl_code: 'GL-5000',
          department: 'US Inc'
        },
        {
          invoice_number: 'INV-2024-4201',
          date: 'Aug 12, 2024',
          cost_center: 'CC-9001',
          gl_code: 'GL-5000',
          department: 'US Inc'
        },
        {
          invoice_number: 'INV-2024-3089',
          date: 'Jul 18, 2024',
          cost_center: 'CC-9001',
          gl_code: 'GL-5000',
          department: 'US Inc'
        }
      ],
      pattern_matched: 'IT Services - Monthly Subscription',
      confidence_factors: [
        'Vendor pattern: IT services provider',
        'Amount range: $3,000-$5,000 (matches 5 previous invoices)',
        'Previous invoices used G&A cost center 87% of the time',
        'Consistent monthly billing pattern detected'
      ]
    },
    ai_classification_confidence: 0.96,
    ai_classification_reasoning: 'This Non-PO invoice was automatically classified based on historical patterns. The system analyzed 5 similar invoices from CloudTech Solutions Inc over the past 6 months and applied the most common accounting codes used for this vendor\'s IT services.',
    // OCR extractions for vendor swap suggestion
    ocr_extractions: {
      vendor_name_snapshot: {
        value: 'CloudTech Solutions Inc',
        confidence: 0.92,
        candidates: [
          {
            value: 'CloudTech Solutions Ltd',
            confidence: 0.88,
            source: 'ERP Vendor Matching',
            reason: 'System matched invoice to parent company "CloudTech Solutions Inc" based on tax ID. However, remit-to address analysis indicates this invoice should be assigned to child company "CloudTech Solutions Ltd" for accurate accounting and payment processing.'
          },
          {
            value: 'CloudTech Europe GmbH',
            confidence: 0.82,
            source: 'Address Analysis',
            reason: 'Invoice remit-to address matches European subsidiary. This entity handles EU-based transactions for the CloudTech group.'
          },
          {
            value: 'CloudTech Solutions Corp',
            confidence: 0.75,
            source: 'Historical Patterns',
            reason: 'Similar invoice patterns from this vendor in past transactions. Corporate entity used for North American operations.'
          },
          {
            value: 'CloudTech UK Ltd',
            confidence: 0.68,
            source: 'Tax ID Partial Match',
            reason: 'UK-registered entity within CloudTech group. Tax identification shows partial match with invoice details.'
          }
        ]
      }
    },
    validation_warnings: [{
      type: 'vendor_reassignment',
      category: 'compliance',
      field: 'vendor_name_snapshot',
      message: 'AI suggests reassigning invoice to child company based on remit-to address',
      severity: 'warning',
      suggested_vendor: 'CloudTech Solutions Ltd',
      current_vendor: 'CloudTech Solutions Inc',
      confidence: 0.88
    }],
    // Display configuration for green minimal template
    display_config: {
      template: 'green-minimal'
    }
  } as Invoice);

  // ========================================================================
  // BASELINE NON-PO INVOICE #2 - Premier Facility Services
  // ========================================================================
  const baselineNonPO2Date = new Date(now);
  baselineNonPO2Date.setDate(baselineNonPO2Date.getDate() - 2); // Created 2 days ago
  const baselineNonPO2DueDate = new Date(baselineNonPO2Date);
  baselineNonPO2DueDate.setDate(baselineNonPO2DueDate.getDate() + 30); // Due in 28 days

  const baselineNonPO2Lines = [
    {
      id: 'line-baseline-nonpo-2-1',
      line_no: 1,
      description: 'Office Cleaning Services - January 2025',
      qty: 1,
      uom: 'Month',
      unit_price: 850.00,
      net_amount: 850.00,
      line_total: 850.00,
      po_line_id: null,
      gr_line_id: null,
      ses_line_id: null
    },
    {
      id: 'line-baseline-nonpo-2-2',
      line_no: 2,
      description: 'Security Services - January 2025',
      qty: 1,
      uom: 'Month',
      unit_price: 320.00,
      net_amount: 320.00,
      line_total: 320.00,
      po_line_id: null,
      gr_line_id: null,
      ses_line_id: null
    },
    {
      id: 'line-baseline-nonpo-2-3',
      line_no: 3,
      description: 'Maintenance Services - January 2025',
      qty: 1,
      uom: 'Month',
      unit_price: 180.00,
      net_amount: 180.00,
      line_total: 180.00,
      po_line_id: null,
      gr_line_id: null,
      ses_line_id: null
    }
  ];

  const baselineNonPO2Subtotal = 1350.00;
  const baselineNonPO2Tax = 270.00; // 20% VAT
  const baselineNonPO2Total = 1620.00;

  mockInvoices.push({
    id: 'baseline-nonpo-2',
    invoice_number: 'PFS-2025-1842',
    vendor_name_snapshot: 'Premier Facility Services Ltd',
    vendor_id: 'VND-2002',
    vendor_tax_id_snapshot: 'TAX-VND-2002',
    invoice_date: baselineNonPO2Date.toISOString().split('T')[0],
    due_date: baselineNonPO2DueDate.toISOString().split('T')[0],
    email_received_date: (() => { const d = new Date(baselineNonPO2Date); d.setDate(d.getDate() - 1); return d.toISOString().split('T')[0]; })(),
    currency: 'GBP',
    subtotal: baselineNonPO2Subtotal,
    tax_total: baselineNonPO2Tax,
    tax_rate_percent: 20,
    total: baselineNonPO2Total,
    status: 'approval', // Approval stage (awaiting smart-routed approver)
    match_status: 'exception', // Exception due to approver confirmation required
    type: 'Non-PO',
    vendor_requires_po: false,
    vendor_is_verified: true,
    approval_status: 'pending',
    po_numbers_cached: [],
    gr_numbers: [],
    docType: 'Invoice',
    issues: ['Approver Confirmation Required'],
    created_at: baselineNonPO2Date.toISOString(),
    updated_at: baselineNonPO2Date.toISOString(),
    data_ingestion_date: baselineNonPO2Date.toISOString().split('T')[0],
    lines: baselineNonPO2Lines,
    invoice_lines: baselineNonPO2Lines,
    // Accounting classification
    ledger: 'Accounts Payable',
    cost_center: 'CC-9002',
    cost_center_name: 'Facilities & Operations',
    gl_code: 'GL-6100',
    department: 'UK Ltd',
    // Approver routing (smart suggestion - pending confirmation)
    assigned_to_name: 'James Wilson',
    assigned_to_user_id: 'user-4',
    suggested_approver: 'Sarah Mitchell',
    suggested_approver_user_id: 'user-sarah-mitchell',
    approver_suggestion_pending: true,
    approver_routing_confidence: 0.91,
    approver_routing_reasoning: 'Based on service type (facility services), invoice amount (£1,620), and location (UK Office), the system recommends Sarah Mitchell (Facilities Manager) for approval.',
    approver_routing_details: {
      approver_info: {
        name: 'Sarah Mitchell',
        role: 'Facilities Manager - UK Operations',
        authority_limit: 5000,
        currency: 'GBP',
        department: 'Facilities & Operations'
      },
      matching_criteria: [
        'Service category: Facility Services (Office Cleaning, Security, Maintenance)',
        'Amount: £1,620 within Sarah\'s approval threshold (£5,000)',
        'Location match: UK Office → Sarah manages UK facilities',
        'Cost center: Facilities & Operations'
      ],
      similar_invoices: [
        {
          invoice_number: 'INV-2024-8823',
          date: 'Dec 15, 2024',
          vendor: 'Premier Facility Services',
          amount: 1450,
          currency: 'GBP',
          service: 'Office Cleaning',
          approver: 'Sarah Mitchell'
        },
        {
          invoice_number: 'INV-2024-7612',
          date: 'Nov 20, 2024',
          vendor: 'SecureGuard Ltd',
          amount: 2100,
          currency: 'GBP',
          service: 'Security Services',
          approver: 'Sarah Mitchell'
        },
        {
          invoice_number: 'INV-2024-6405',
          date: 'Oct 10, 2024',
          vendor: 'CleanPro Services',
          amount: 980,
          currency: 'GBP',
          service: 'Office Cleaning',
          approver: 'Sarah Mitchell'
        }
      ],
      routing_rules_applied: [
        {
          rule: 'Facility Services → Facilities Manager',
          matched: true,
          weight: 0.40
        },
        {
          rule: 'UK Office Location → UK Facilities Manager',
          matched: true,
          weight: 0.30
        },
        {
          rule: 'Amount < £5,000 → Department Manager Level',
          matched: true,
          weight: 0.30
        }
      ]
    },
    validation_warnings: [{
      type: 'approver_suggestion',
      category: 'workflow',
      field: 'assigned_to_name',
      message: 'AI-suggested approver requires user confirmation',
      severity: 'warning',
      suggested_approver: 'Sarah Mitchell',
      confidence: 0.91,
      reasoning: 'Based on service type (facility services), invoice amount (£1,620), and location (UK Office)'
    }]
  } as Invoice);

  // ========================================================================
  // BASELINE MATCHED INVOICE (Successfully Processed)
  // ========================================================================
  const baselineMatchedDate = new Date(now);
  baselineMatchedDate.setDate(baselineMatchedDate.getDate() - 15); // Created 15 days ago
  const baselineMatchedDueDate = new Date(baselineMatchedDate);
  baselineMatchedDueDate.setDate(baselineMatchedDueDate.getDate() + 30); // Due in 15 days

  const baselineMatchedLines = [
    {
      id: 'line-baseline-matched-1',
      line_no: 1,
      description: 'Office Supplies - Stationery Bundle',
      qty: 50,
      uom: 'EA',
      unit_price: 25.00,
      net_amount: 1250.00,
      line_total: 1250.00,
      po_line_id: 'po-line-8001-1',
      gr_line_id: 'gr-line-8001-1',
      ses_line_id: null
    },
    {
      id: 'line-baseline-matched-2',
      line_no: 2,
      description: 'Printer Supplies - Toner Cartridges',
      qty: 20,
      uom: 'EA',
      unit_price: 75.00,
      net_amount: 1500.00,
      line_total: 1500.00,
      po_line_id: 'po-line-8001-2',
      gr_line_id: 'gr-line-8001-2',
      ses_line_id: null
    }
  ];

  const baselineMatchedSubtotal = 2750.00;
  const baselineMatchedTax = 550.00; // 20% VAT
  const baselineMatchedTotal = 3300.00;

  mockInvoices.push({
    id: 'baseline-matched-1',
    invoice_number: 'SUP-0000123',
    vendor_name_snapshot: 'Office Supplies Direct',
    vendor_id: 'VND-3001',
    invoice_date: baselineMatchedDate.toISOString().split('T')[0],
    due_date: baselineMatchedDueDate.toISOString().split('T')[0],
    email_received_date: (() => { const d = new Date(baselineMatchedDate); d.setDate(d.getDate() - 1); return d.toISOString().split('T')[0]; })(),
    currency: 'USD',
    subtotal: baselineMatchedSubtotal,
    tax_total: baselineMatchedTax,
    tax_rate_percent: 20,
    total: baselineMatchedTotal,
    status: 'posted', // Posted to accounting system
    match_status: 'matched',
    type: 'PO',
    vendor_requires_po: true,
    vendor_is_verified: true,
    approval_status: 'approved',
    assigned_to_name: 'Caroline Walsh',
    assigned_to_user_id: 'user-3',
    po_numbers_cached: ['PO-2025-8001'],
    gr_numbers: ['GR-2025-8001'],
    docType: 'Invoice',
    created_at: baselineMatchedDate.toISOString(),
    updated_at: baselineMatchedDate.toISOString(),
    data_ingestion_date: baselineMatchedDate.toISOString().split('T')[0],
    lines: baselineMatchedLines,
    invoice_lines: baselineMatchedLines
  } as Invoice);

  // ========================================================================
  // BASELINE PO INVOICE - LEGAL BILLING WITH UOM CONVERSION
  // ========================================================================
  const baselinePOLegal1Date = new Date(now);
  baselinePOLegal1Date.setDate(baselinePOLegal1Date.getDate() - 14); // Created 14 days ago
  const baselinePOLegal1DueDate = new Date(baselinePOLegal1Date);
  baselinePOLegal1DueDate.setDate(baselinePOLegal1DueDate.getDate() + 31); // Due in 17 days

  const baselinePOLegal1Lines = [
    {
      id: 'line-baseline-po-legal-1-1',
      line_no: 1,
      sku: '-',
      description: 'M&A Contract Preparation',
      qty: 2400.00,
      uom: 'UNIT',
      unit_price: 10.00,
      net_amount: 24000.00,
      tax_rate: 20,
      tax_amount: 4800.00,
      line_total: 28800.00,
      po_line_id: 'po-line-9012-1',
      gr_line_id: null,
      ses_line_id: null
    },
    {
      id: 'line-baseline-po-legal-1-2',
      line_no: 2,
      sku: '-',
      description: 'Advisory - M&A, Financial Services',
      qty: 14.00,
      uom: 'HOUR',
      unit_price: 1800.00,
      net_amount: 25200.00,
      tax_rate: 20,
      tax_amount: 5040.00,
      line_total: 30240.00,
      po_line_id: 'po-line-9012-2',
      gr_line_id: null,
      ses_line_id: null,
    },
    {
      id: 'line-baseline-po-legal-1-3',
      line_no: 3,
      sku: '-',
      description: 'Board Transition Strategy',
      qty: 1.00,
      uom: 'UNIT',
      unit_price: 36000.00,
      net_amount: 36000.00,
      tax_rate: 20,
      tax_amount: 7200.00,
      line_total: 43200.00,
      po_line_id: 'po-line-9012-3',
      gr_line_id: null,
      ses_line_id: null
    }
  ];

  mockInvoices.push({
    id: 'baseline-po-legal-1',
    invoice_number: 'INV1881222',
    vendor_name_snapshot: 'Spectre Associates LLC',
    vendor_id: 'VND0047782',
    vendor_tax_id_snapshot: '145 631 10',
    vendor_address_snapshot: 'Office 7, Radance Plaze, Orpinton Avenue, London EC1 7AH',
    vendor_email: 'receiveables@spectrellc.com',
    vendor_phone: '+44 208 768 1256',
    customer_no: 'Y9222-12',
    job_number: 'BG8891_470',
    invoice_date: '2025-11-11',
    due_date: '2025-11-12',
    email_received_date: '2025-11-10',
    payment_terms: '30',
    currency: 'GBP',
    subtotal: 85200.00,
    tax_total: 17040.00,
    tax_rate_percent: 20,
    total: 102240.00,
    status: 'verification',
    match_status: 'variance',
    type: 'PO',
    vendor_requires_po: true,
    vendor_is_verified: true,
    approval_status: 'pending',
    issues: ['Line Item Variance'],
    // No assigned approver yet - this invoice needs review before assignment
    assigned_to_name: undefined,
    assigned_to_user_id: undefined,
    cost_center: 'CC-6606',
    cost_center_name: 'Legal',
    gl_code: 'GL-1002',
    department: 'Manufacturing',
    company_code: 'GSPV Ltd',
    po_numbers_cached: ['BG8891_470'],
    gr_numbers: [],
    docType: 'Invoice',
    created_at: baselinePOLegal1Date.toISOString(),
    updated_at: baselinePOLegal1Date.toISOString(),
    data_ingestion_date: baselinePOLegal1Date.toISOString().split('T')[0],
    lines: baselinePOLegal1Lines,
    invoice_lines: baselinePOLegal1Lines,
    // Bill-to customer information
    bill_to_snapshot: {
      legal_name: 'GSPV GmbH',
      tax_id: '927 8131 1',
      address: 'Senna Building, Gorsuch Pl, London, E2 8JF',
      email: null,
      phone: null
    },
    // Payment bank details
    payment_bank_details: {
      bank_name: 'BARCLAYS',
      account_name: 'Spectre Associates LLC',
      account_number: '31926819',
      sort_code: '60-16-13',
      iban: 'GB 13 BUKB 601613 31926819',
      swift: 'BARCGB22',
      bank_currency: 'GBP',
      bank_address: 'BARCLAYS BANK PLC WHOLESALE, 1 CHURCHILL PLACE, LONDON'
    },
    // Display configuration for Spectre professional template
    display_config: {
      template: 'spectre-professional',
      config: {
        logo: {
          url: '/spectre-logo.png',
          width: 150,
          height: 75
        }
      }
    },
    agent_actions: [
      {
        agent_name: 'Smart Match (Substitution) Agent',
        action: 'Bill-to entity matched: GSPV GmbH (ap@gspv.de) → GSPV Ltd',
        status: 'success',
        detail: '- Only auto-apply the substitution if confidence is 90% or above — flag anything below 90% for manual review',
        agent_id: 'smart-match-substitution',
        mode: 'auto-apply',
      }
    ],
    suppress_validation_fields: ['total'],
  } as Invoice);

  // ========================================================================
  // FRAUD RISK INVOICE - HIGH-RISK JURISDICTION & THRESHOLD EXCEEDED
  // Russian vendor with Bulgarian bank account + inflated invoice total
  // ========================================================================
  const fraudRiskLines = [
    {
      id: 'line-fraud-risk-1',
      line_no: 1,
      sku: 'DIS_37199/44',
      product_code: 'DIS_37199/44',
      description: 'Industrial Manufacturing Equipment - Distillation Column (17 stages)',
      description_detail: 'Mono-acetate polymer aluminium distillation column ( 20m x 5 )',
      qty: 2,
      uom: 'UNIT',
      unit_price: 85000.00,
      net_amount: 170000.00,
      tax_rate: 5,
      tax_amount: 8500.00,
      landed_cost: 0,
      line_total: 170000.00,
      line_gross_amount: 178500.00,
      po_line_id: 'po-line-7001-1',
      gr_line_id: null,
      ses_line_id: null
    },
    {
      id: 'line-fraud-risk-2',
      line_no: 2,
      sku: 'SER_474789',
      product_code: 'SER_474789',
      description: 'Installation & Commissioning Services',
      description_detail: 'Installation of columns at facility',
      qty: 160,
      uom: 'HOUR',
      unit_price: 250.00,
      net_amount: 40000.00,
      tax_rate: 5,
      tax_amount: 2000.00,
      landed_cost: 0,
      line_total: 40000.00,
      line_gross_amount: 42000.00,
      po_line_id: 'po-line-7001-2',
      gr_line_id: null,
      ses_line_id: null
    },
    {
      id: 'line-fraud-risk-3',
      line_no: 3,
      sku: 'TR_0004888',
      product_code: 'TR_0004888',
      description: 'Technical Documentation & Training',
      description_detail: 'Training software and 3 on-site sessions',
      qty: 1,
      uom: 'PACKAGE',
      unit_price: 10000.00,
      net_amount: 10000.00,
      tax_rate: 5,
      tax_amount: 500.00,
      landed_cost: 0,
      line_total: 10000.00,
      line_gross_amount: 10500.00,
      po_line_id: 'po-line-7001-3',
      gr_line_id: null,
      ses_line_id: null
    }
  ];

  const fraudRiskSubtotal = 220000.00;
  const fraudRiskTax = 11000.00; // 5% tax per line (8500 + 2000 + 500)
  const fraudRiskTotal = 240000.00; // FRAUD INDICATOR: Should be €231,000 (€9,000 overcharge!)

  mockInvoices.push({
    id: 'fraud-risk-1',
    invoice_number: 'SCHET0074-2025', // Russian invoice format (SCHET = invoice)
    vendor_name_snapshot: 'Volga Industrial Supplies OOO',
    vendor_id: 'VND0099905',
    vendor_tax_id_snapshot: 'XHP1993-443',
    vendor_address_snapshot: 'Head Office, Ulitsa Krasnaya 125, Moscow, 101000, Russian Federation',
    vendor_city_snapshot: 'Moscow',
    vendor_country_snapshot: 'Russia',
    vendor_postal_code_snapshot: '101000',
    vendor_phone: '+7 (35130) 21846',
    vendor_email: 'receiveables@vis.ru',
    // Customer/Bill To
    customer_id: 'T92190-00',
    bill_to_snapshot: {
      legal_name: 'GSPV Ltd',
      tax_id: '927 8131 1',
      address: 'Senna Building, Gorsuch Pl,\nLondon,\nGreater London, United Kingdom (UK) - E2 8JF',
      email: 'accountspayable@xelix.com'
    },
    // Dates (FRAUD INDICATOR: 1 day payment term despite stating 30 days!)
    invoice_date: '2025-11-11',
    due_date: '2025-11-12', // Only 1 day! (suspicious)
    email_received_date: '2025-11-10',
    job_number: 'WC-2025-445',
    // Payment Terms
    payment_terms: '30',
    payment_terms_days: 30,
    // Accounting / ERP Fields
    gl_account_code: 'GL-2211',
    cost_center_code: 'CC-6606 - Manufacturing',
    account_category: 'Accounts Payable',
    department: 'Manufacturing',
    // Amounts (EUR not GBP!)
    currency: 'EUR',
    subtotal: fraudRiskSubtotal,
    tax_total: fraudRiskTax,
    tax_rate_percent: 5,
    total: fraudRiskTotal, // Inflated by €9,000!
    // Bank Details - FRAUD INDICATOR: Bulgarian bank for Russian vendor!
    payment_bank_details: {
      account_name: 'Volga Engineering EOOD',
      bank_name: 'FIRST INVESTMENT BANK',
      account_number: '1020345678',
      swift_code: 'FINVBGSF',
      iban: 'BG 80 BNBG 9661 1020345678',
      bank_currency: 'EUR',
      bank_address: 'FIRST INVESTMENT BANK AD, DRAGAN TZANKOV BLVD 37, SOFIA',
      bank_country: 'Bulgaria',
      bank_city: 'Sofia'
    },
    payment_terms_text: '1. Please pay within 30 days from the date of invoice, overdue interest @ 14% will be charged on delayed payments.\n2. Please quote invoice number when remitting funds.\n3. Delivery commences after payment is received',
    // Status
    status: 'on_hold', // On hold due to fraud risk compliance hold
    match_status: 'matched',
    type: 'PO',
    vendor_requires_po: true,
    vendor_is_verified: false, // Not verified due to high-risk jurisdiction
    approval_status: 'pending',
    processed_status: 'Exception', // Exception status for fraud risk
    approver: undefined, // No approver - blocked for fraud risk review
    assigned_to_name: 'Caroline Walsh',
    assigned_to_user_id: 'user-3',
    po_numbers_cached: ['PO-2025-7001'],
    gr_numbers: [],
    docType: 'Invoice',
    issues: [
      'Fraud Risk - High-Risk Jurisdiction',
      'Fraud Risk - Threshold Exceeded',
      'Invoice Total Discrepancy - Overcharged by €9,000',
      'Payment Terms Inconsistency - 1 day vs stated 30 days',
      'Bank Jurisdiction Mismatch - Bulgarian bank for Russian vendor'
    ],
    created_at: '2025-11-11T00:00:00.000Z',
    updated_at: '2025-11-11T00:00:00.000Z',
    data_ingestion_date: '2025-11-11',
    lines: fraudRiskLines,
    invoice_lines: fraudRiskLines,
    // Fraud Risk Detection
    fraud_risk: {
      triggered: true,
      risk_factors: [
        {
          type: 'high_risk_jurisdiction',
          details: 'Vendor operates in Russia, classified as high-risk jurisdiction due to current geopolitical sanctions and enhanced compliance requirements',
          jurisdiction: 'Russia',
          jurisdiction_code: 'RU',
          severity: 'critical' as const
        },
        {
          type: 'threshold_exceeded',
          details: 'Invoice value exceeds compliance threshold for high-risk jurisdictions',
          threshold: 100000,
          actual_value: 240000,
          currency: 'EUR',
          severity: 'high' as const
        }
      ],
      required_approvals: [
        'Finance Director',
        'Compliance Officer'
      ],
      policy_reference: 'Global Procurement & Vendor Payment Policy',
      policy_link: '/policies/global-procurement',
      short_message: 'Invoice paused - High-risk jurisdiction & threshold exceeded',
      full_message: 'This invoice has been automatically paused because the vendor Volga Industrial Supplies LLC operates in a high-risk jurisdiction (Russia) and the invoice value (€240,000) exceeds the threshold defined in your company\'s Global Procurement & Vendor Payment Policy. Per compliance guidelines, additional due diligence and approval from the Finance Director and Compliance Officer are required before payment can be processed.'
    },
    // Display Configuration - Black Enterprise Template
    display_config: {
      template: 'black-enterprise',
      config: {
        logo: {
          url: '/volga-group-logo.png',
          width: 180,
          height: 90
        }
      }
    }
  } as Invoice);

  // ========================================================================
  // ADDITIONAL PO EXCEPTION INVOICES (x17)
  // ========================================================================

  const poExceptions = [
    { id: 'po-exc-1',  invoice_number: 'HES-Q4-2025-8814', vendor: 'Hartley Electrical Supplies', vendor_id: 'VND0081234', tax_id: '772 441 09', invoiceDate: '2025-10-03', total: 14820.00, subtotal: 12350.00, tax: 2470.00, currency: 'GBP', issues: ['Price Variance'],    po: 'PO-4401-UK', dept: 'Facilities',     cc: 'CC-1102', desc: [['Cable Management Trays', 50, 'EA', 45.00], ['Electrical Conduit 20mm', 200, 'M', 8.25], ['Junction Boxes (IP65)', 30, 'EA', 22.50]] },
    { id: 'po-exc-2',  invoice_number: 'NCL/INV/25-10-0092', vendor: 'Nordic Cold Chain Ltd', vendor_id: 'VND0091827', tax_id: 'SE881203440101', invoiceDate: '2025-10-07', total: 38220.00, subtotal: 31850.00, tax: 6370.00, currency: 'SEK', issues: ['Quantity Mismatch'], po: 'PO-5512-SE', dept: 'Operations',    cc: 'CC-2204', desc: [['Refrigerated Transport (per km)', 1200, 'KM', 18.50], ['Cold Storage Handling Fee', 8, 'DAY', 325.00], ['Temperature Logging Device Rental', 3, 'EA', 210.00]] },
    { id: 'po-exc-3',  invoice_number: 'MERID-2025-10441', vendor: 'Meridian Cleaning Services', vendor_id: 'VND0073345', tax_id: '334 892 17', invoiceDate: '2025-10-10', total: 8640.00, subtotal: 7200.00, tax: 1440.00, currency: 'GBP', issues: ['Price Variance'],    po: 'PO-3308-UK', dept: 'Facilities',     cc: 'CC-1102', desc: [['Deep Clean - Office Floors 1-3', 3, 'EA', 1400.00], ['Window Cleaning External', 1, 'EA', 850.00], ['Consumables Restocking', 1, 'EA', 750.00]] },
    { id: 'po-exc-4',  invoice_number: 'APEX-IT-25-7731', vendor: 'Apex IT Solutions Ltd', vendor_id: 'VND0054489', tax_id: 'GB556127830', invoiceDate: '2025-10-14', total: 47400.00, subtotal: 39500.00, tax: 7900.00, currency: 'GBP', issues: ['Line Item Variance'], po: 'PO-6620-IT', dept: 'IT',           cc: 'CC-3301', desc: [['Dell Latitude 5540 Laptops', 10, 'EA', 1450.00], ['Docking Stations USB-C', 10, 'EA', 285.00], ['Extended Warranty 3yr', 10, 'EA', 215.00], ['Setup & Imaging Fee', 10, 'EA', 75.00]] },
    { id: 'po-exc-5',  invoice_number: 'SLG-FR-OCT-2025-0044', vendor: 'Seabourne Logistics Group', vendor_id: 'VND0062213', tax_id: 'FR44376022B', invoiceDate: '2025-10-17', total: 26580.00, subtotal: 22150.00, tax: 4430.00, currency: 'EUR', issues: ['Price Variance'],    po: 'PO-7714-FR', dept: 'Supply Chain', cc: 'CC-4405', desc: [['Ocean Freight - FCL 40ft', 2, 'CONT', 6800.00], ['Port Handling Charges', 2, 'EA', 875.00], ['Customs Documentation', 1, 'EA', 450.00], ['Insurance Premium', 1, 'EA', 1650.00]] },
    { id: 'po-exc-6',  invoice_number: 'PPM/25/3309', vendor: 'Premier Print & Media', vendor_id: 'VND0038871', tax_id: '227 534 91', invoiceDate: '2025-10-21', total: 5916.00, subtotal: 4930.00, tax: 986.00, currency: 'GBP', issues: ['Quantity Mismatch'], po: 'PO-2205-MK', dept: 'Marketing',    cc: 'CC-5506', desc: [['A4 Brochures Full Colour (250gsm)', 5000, 'EA', 0.62], ['Roll-up Banner Stands', 4, 'EA', 185.00], ['Exhibition Display Panels', 2, 'EA', 440.00]] },
    { id: 'po-exc-7',  invoice_number: 'CES-MFG-2025-1187', vendor: 'Castleford Engineering Svcs', vendor_id: 'VND0019923', tax_id: '119 348 65', invoiceDate: '2025-10-24', total: 68400.00, subtotal: 57000.00, tax: 11400.00, currency: 'GBP', issues: ['Line Item Variance'], po: 'PO-8831-MF', dept: 'Manufacturing', cc: 'CC-6607', desc: [['Conveyor Belt Refurbishment', 1, 'EA', 28500.00], ['Pneumatic Actuator Replacements', 6, 'EA', 2750.00], ['Planned Maintenance Labour', 80, 'HR', 95.00]] },
    { id: 'po-exc-8',  invoice_number: 'TOI-2025-OCT-556', vendor: 'Thornton Office Interiors', vendor_id: 'VND0027756', tax_id: '662 019 38', invoiceDate: '2025-10-28', total: 19080.00, subtotal: 15900.00, tax: 3180.00, currency: 'GBP', issues: ['Price Variance'],    po: 'PO-1109-FK', dept: 'Facilities',     cc: 'CC-1102', desc: [['Executive Desk 1800mm', 6, 'EA', 1250.00], ['Ergonomic Task Chair', 6, 'EA', 485.00], ['Mobile Pedestal Unit', 6, 'EA', 215.00], ['Delivery & Installation', 1, 'EA', 750.00]] },
    { id: 'po-exc-9',  invoice_number: 'BSCS-US-2025-4421', vendor: 'BlueSky Cloud Services', vendor_id: 'VND0045678', tax_id: 'US774821560', invoiceDate: '2025-11-03', total: 44640.00, subtotal: 37200.00, tax: 7440.00, currency: 'USD', issues: ['Price Variance'],    po: 'PO-9940-US', dept: 'IT',           cc: 'CC-3301', desc: [['Azure Reserved Instance 1yr (8-core)', 3, 'EA', 7400.00], ['Managed Backup Service (monthly)', 12, 'MTH', 425.00], ['Disaster Recovery Setup', 1, 'EA', 1500.00]] },
    { id: 'po-exc-10', invoice_number: 'KSS/NOV25/0078', vendor: 'Kestrel Security Systems', vendor_id: 'VND0033391', tax_id: '338 504 72', invoiceDate: '2025-11-05', total: 11160.00, subtotal: 9300.00, tax: 1860.00, currency: 'GBP', issues: ['Quantity Mismatch'], po: 'PO-3317-FK', dept: 'Facilities',     cc: 'CC-1103', desc: [['IP CCTV Cameras (4K)', 8, 'EA', 480.00], ['Network Video Recorder 16ch', 1, 'EA', 1250.00], ['Cable & Installation Labour', 40, 'HR', 65.00], ['Annual Monitoring Contract', 1, 'EA', 850.00]] },
    { id: 'po-exc-11', invoice_number: 'RCC-HR-2025-Q4-019', vendor: 'Redwood Catering Co.', vendor_id: 'VND0088124', tax_id: '501 677 34', invoiceDate: '2025-11-07', total: 7320.00, subtotal: 6100.00, tax: 1220.00, currency: 'GBP', issues: ['Price Variance'],    po: 'PO-4428-HR', dept: 'HR',           cc: 'CC-7701', desc: [['Board Meeting Catering (12 pax)', 3, 'EA', 850.00], ['Working Lunch Packages (20 pax)', 8, 'EA', 325.00], ['Staff Celebration Buffet', 1, 'EA', 1150.00]] },
    { id: 'po-exc-12', invoice_number: 'VFM-DE-25-9933', vendor: 'Vanguard Fleet Management', vendor_id: 'VND0071245', tax_id: 'DE889312070', invoiceDate: '2025-11-10', total: 33840.00, subtotal: 28200.00, tax: 5640.00, currency: 'EUR', issues: ['Line Item Variance'], po: 'PO-6635-DE', dept: 'Operations',    cc: 'CC-4406', desc: [['Vehicle Service & MOT (x5)', 5, 'EA', 420.00], ['Tyre Replacements (x12)', 12, 'EA', 185.00], ['Fleet GPS Tracking Annual Fee', 8, 'EA', 320.00], ['Fuel Card Management Fee', 12, 'MTH', 195.00]] },
    { id: 'po-exc-13', invoice_number: 'HL-RD-INV-25-0441', vendor: 'Halcyon Labs Ltd', vendor_id: 'VND0012367', tax_id: 'CHE-223.845.910', invoiceDate: '2025-11-12', total: 60840.00, subtotal: 50700.00, tax: 10140.00, currency: 'CHF', issues: ['Price Variance'],    po: 'PO-7752-CH', dept: 'R&D',          cc: 'CC-8801', desc: [['Laboratory Reagents - Batch Q4', 1, 'LOT', 18500.00], ['Pipette Calibration Service', 12, 'EA', 225.00], ['Chemical Storage Cabinets', 4, 'EA', 1875.00], ['Fume Hood Annual Certification', 2, 'EA', 650.00]] },
    { id: 'po-exc-14', invoice_number: 'CTA-2025-1144-TRN', vendor: 'Compass Training Academy', vendor_id: 'VND0059012', tax_id: '667 190 45', invoiceDate: '2025-11-14', total: 16800.00, subtotal: 14000.00, tax: 2800.00, currency: 'GBP', issues: ['Quantity Mismatch'], po: 'PO-2241-HR', dept: 'HR',           cc: 'CC-7702', desc: [['PRINCE2 Practitioner - 5 delegates', 5, 'EA', 1450.00], ['Excel Advanced Workshop', 15, 'EA', 295.00], ['Leadership Coaching Sessions', 6, 'HR', 275.00]] },
    { id: 'po-exc-15', invoice_number: 'IBF-MFG-25-7812', vendor: 'Ironbridge Steel Fabricators', vendor_id: 'VND0006678', tax_id: '114 023 88', invoiceDate: '2025-11-17', total: 93600.00, subtotal: 78000.00, tax: 15600.00, currency: 'GBP', issues: ['Line Item Variance'], po: 'PO-9968-MF', dept: 'Manufacturing', cc: 'CC-6608', desc: [['Structural Steel Beams IPE300 (12m)', 40, 'EA', 1250.00], ['Steel Plate 10mm (2400x1200)', 25, 'EA', 680.00], ['Cutting & Fabrication Labour', 120, 'HR', 85.00], ['Delivery & Offloading', 2, 'EA', 450.00]] },
    { id: 'po-exc-16', invoice_number: 'ADM-NOV-2025-0622', vendor: 'Aurora Digital Marketing', vendor_id: 'VND0048390', tax_id: '556 733 12', invoiceDate: '2025-11-19', total: 24000.00, subtotal: 20000.00, tax: 4000.00, currency: 'GBP', issues: ['Price Variance'],    po: 'PO-1124-MK', dept: 'Marketing',    cc: 'CC-5507', desc: [['PPC Campaign Management (Q4)', 3, 'MTH', 3500.00], ['SEO Technical Audit', 1, 'EA', 4800.00], ['Social Media Content Pack', 3, 'MTH', 1900.00]] },
    { id: 'po-exc-17', invoice_number: 'AMS/25/NOV/3387', vendor: 'Ashford Medical Supplies', vendor_id: 'VND0094561', tax_id: '332 918 76', invoiceDate: '2025-11-21', total: 9960.00, subtotal: 8300.00, tax: 1660.00, currency: 'GBP', issues: ['Quantity Mismatch'], po: 'PO-5539-FK', dept: 'Facilities',     cc: 'CC-1104', desc: [['First Aid Kits (BSI Compliant)', 20, 'EA', 85.00], ['Defibrillator AED Unit', 2, 'EA', 1450.00], ['First Aid Refresher Training', 10, 'EA', 120.00], ['PPE Restocking Bundle', 5, 'EA', 195.00]] },
  ];

  poExceptions.forEach((exc, i) => {
    const excDate = new Date(exc.invoiceDate);
    const excDueDate = new Date(excDate);
    excDueDate.setDate(excDueDate.getDate() + 30);

    const lines = exc.desc.map((d, idx) => ({
      id: `line-${exc.id}-${idx + 1}`,
      line_no: idx + 1,
      description: d[0] as string,
      qty: d[1] as number,
      uom: d[2] as string,
      unit_price: d[3] as number,
      net_amount: (d[1] as number) * (d[3] as number),
      line_total: (d[1] as number) * (d[3] as number),
      po_line_id: `PO-LINE-${exc.id}-${idx + 1}`,
      gr_line_id: null,
      ses_line_id: null,
    }));

    mockInvoices.push({
      id: exc.id,
      invoice_number: exc.invoice_number,
      vendor_name_snapshot: exc.vendor,
      vendor_id: exc.vendor_id,
      vendor_tax_id_snapshot: exc.tax_id,
      vendor_address_snapshot: '1 Business Park, London, EC2A 4NE',
      vendor_email: `ap@${exc.vendor.toLowerCase().replace(/[^a-z]/g, '')}.com`,
      vendor_phone: '+44 20 7946 0000',
      customer_no: `CUST-${1000 + i}`,
      job_number: `JN-${3000 + i}`,
      invoice_date: excDate.toISOString().split('T')[0],
      due_date: excDueDate.toISOString().split('T')[0],
      email_received_date: excDate.toISOString().split('T')[0],
      payment_terms: '30',
      currency: exc.currency,
      subtotal: exc.subtotal,
      tax_total: exc.tax,
      tax_rate_percent: 20,
      total: exc.total,
      status: 'verification',
      match_status: exc.match_status,
      type: 'PO',
      vendor_requires_po: true,
      vendor_is_verified: true,
      approval_status: 'pending',
      issues: exc.issues,
      assigned_to_name: 'James Wilson',
      assigned_to_user_id: 'user-4',
      cost_center: exc.cc,
      company_code: 'GSPV Ltd',
      department: exc.dept,
      po_numbers_cached: [exc.po],
      gr_numbers: [],
      docType: 'Invoice',
      created_at: excDate.toISOString(),
      updated_at: excDate.toISOString(),
      data_ingestion_date: excDate.toISOString().split('T')[0],
      lines,
      invoice_lines: lines,
    } as Invoice);
  });

  // ========================================================================
  // AUTO-REJECT INVOICE #1 - MISSING PO FOR 30+ DAYS
  // ========================================================================
  const autoReject1Date = new Date(now);
  autoReject1Date.setDate(autoReject1Date.getDate() - 35); // Created 35 days ago
  const autoReject1DueDate = new Date(autoReject1Date);
  autoReject1DueDate.setDate(autoReject1DueDate.getDate() + 30); // Due date already passed

  const autoReject1Lines = [
    {
      id: 'line-auto-reject-1-1',
      line_no: 1,
      description: 'Office Furniture - Ergonomic Chairs',
      qty: 20,
      uom: 'EA',
      unit_price: 350.00,
      net_amount: 7000.00,
      line_total: 7000.00,
      po_line_id: null,
      gr_line_id: null,
      ses_line_id: null
    },
    {
      id: 'line-auto-reject-1-2',
      line_no: 2,
      description: 'Standing Desks - Adjustable',
      qty: 10,
      uom: 'EA',
      unit_price: 650.00,
      net_amount: 6500.00,
      line_total: 6500.00,
      po_line_id: null,
      gr_line_id: null,
      ses_line_id: null
    }
  ];

  const autoReject1Subtotal = 13500.00;
  const autoReject1Tax = 1080.00; // 8% sales tax
  const autoReject1Total = 14580.00;

  mockInvoices.push({
    id: 'auto-reject-1',
    invoice_number: 'AR-2025-0001',
    vendor_name_snapshot: 'Acme Office Supplies Ltd',
    vendor_id: 'VND-6001',
    vendor_tax_id_snapshot: 'TAX-VND-6001',
    invoice_date: autoReject1Date.toISOString().split('T')[0],
    due_date: autoReject1DueDate.toISOString().split('T')[0],
    email_received_date: (() => { const d = new Date(autoReject1Date); d.setDate(d.getDate() - 1); return d.toISOString().split('T')[0]; })(),
    currency: 'USD',
    subtotal: autoReject1Subtotal,
    tax_total: autoReject1Tax,
    tax_rate_percent: 8,
    total: autoReject1Total,
    status: 'auto_rejected', // Auto-rejected
    match_status: 'auto_rejected',
    type: 'PO',
    vendor_requires_po: true,
    vendor_is_verified: true,
    approval_status: 'auto_rejected',
    assigned_to_name: 'Caroline Walsh',
    assigned_to_user_id: 'user-3',
    po_numbers_cached: [],
    gr_numbers: [],
    docType: 'Invoice',
    issues: ['Auto-Rejected - No PO Found in ERP, Vendor Notified'],
    created_at: autoReject1Date.toISOString(),
    updated_at: autoReject1Date.toISOString(),
    data_ingestion_date: autoReject1Date.toISOString().split('T')[0],
    lines: autoReject1Lines,
    invoice_lines: autoReject1Lines,
    // Validation errors to show red border on PO Number field
    validation_errors: [
      {
        field: 'po_numbers_cached',
        message: 'PO number is required for this vendor',
        severity: 'error'
      }
    ],
    // Auto-reject metadata
    auto_reject_reason: 'System could not find a matching Purchase Order in the ERP system. An automated email has been sent to the vendor requesting the correct PO number. Invoice processing has been paused pending vendor response.',
    auto_reject_date: new Date(now).toISOString().split('T')[0],
    auto_reject_rule: 'missing_po_threshold',
    helpdesk_ticket_ref: 'TKT-2025-001'
  } as Invoice);

  // ========================================================================
  // AUTO-REJECT INVOICE #2 - PO CONTRACT VIOLATION (FREIGHT CHARGES)
  // ========================================================================
  const autoReject2Date = new Date(now);
  autoReject2Date.setDate(autoReject2Date.getDate() - 8); // Created 8 days ago
  const autoReject2DueDate = new Date(autoReject2Date);
  autoReject2DueDate.setDate(autoReject2DueDate.getDate() + 30); // Due in 22 days

  const autoReject2Lines = [
    {
      id: 'line-auto-reject-2-1',
      line_no: 1,
      description: 'Office Equipment Delivery',
      qty: 1,
      uom: 'Shipment',
      unit_price: 3200.00,
      net_amount: 3200.00,
      line_total: 3200.00,
      po_line_id: 'po-line-8901-1',
      gr_line_id: null,
      ses_line_id: null
    },
    {
      id: 'line-auto-reject-2-2',
      line_no: 2,
      description: 'Freight Charges',
      qty: 1,
      uom: 'Service',
      unit_price: 450.00,
      net_amount: 450.00,
      line_total: 450.00,
      po_line_id: null,
      gr_line_id: null,
      ses_line_id: null
    }
  ];

  const autoReject2Subtotal = 3650.00;
  const autoReject2Tax = 730.00; // 20% VAT
  const autoReject2Total = 4380.00;

  mockInvoices.push({
    id: 'auto-reject-2',
    invoice_number: 'AR-2025-0002',
    vendor_name_snapshot: 'Global Logistics Services Inc',
    vendor_id: 'VND-6002',
    vendor_tax_id_snapshot: 'TAX-VND-6002',
    invoice_date: autoReject2Date.toISOString().split('T')[0],
    due_date: autoReject2DueDate.toISOString().split('T')[0],
    email_received_date: (() => { const d = new Date(autoReject2Date); d.setDate(d.getDate() - 1); return d.toISOString().split('T')[0]; })(),
    currency: 'USD',
    subtotal: autoReject2Subtotal,
    tax_total: autoReject2Tax,
    tax_rate_percent: 20,
    total: autoReject2Total,
    status: 'auto_rejected', // Auto-rejected (contract violation)
    match_status: 'auto_rejected',
    type: 'PO',
    vendor_requires_po: true,
    vendor_is_verified: true,
    approval_status: 'auto_rejected',
    assigned_to_name: 'Caroline Walsh',
    assigned_to_user_id: 'user-3',
    po_numbers_cached: ['PO-2025-8901'],
    gr_numbers: [],
    docType: 'Invoice',
    issues: ['Auto-Rejected - PO Contract Violation', 'Freight Charges Billed Separately'],
    created_at: autoReject2Date.toISOString(),
    updated_at: autoReject2Date.toISOString(),
    data_ingestion_date: autoReject2Date.toISOString().split('T')[0],
    lines: autoReject2Lines,
    invoice_lines: autoReject2Lines,
    // Auto-reject metadata
    auto_reject_reason: 'Invoice includes freight charges ($450.00) that are explicitly included in Purchase Order PO-2025-8901. Contract terms state "freight charges included". Vendor has been notified to issue credit note or revised invoice.',
    auto_reject_date: new Date(now).toISOString().split('T')[0],
    auto_reject_rule: 'po_contract_violation',
    helpdesk_ticket_ref: 'TKT-2025-002',
    p2p_review_required: true,
    contract_violation_details: {
      po_number: 'PO-2025-8901',
      clause: 'Freight charges included',
      violated_by: 'Line 2: Freight Charges ($450.00)'
    }
  } as Invoice);

  // ========================================================================
  // SLA SCENARIO #1 - APPROACHING BREACH (AT-RISK, 6 HOURS REMAINING)
  // ========================================================================
  const slaApproaching1Date = new Date(now);
  slaApproaching1Date.setDate(slaApproaching1Date.getDate() - 3); // Created 3 days ago
  const slaApproaching1DueDate = new Date(slaApproaching1Date);
  slaApproaching1DueDate.setDate(slaApproaching1DueDate.getDate() + 30); // Due in 27 days

  const slaApproaching1AssignedAt = new Date(now);
  slaApproaching1AssignedAt.setHours(slaApproaching1AssignedAt.getHours() - 42); // Assigned 42 hours ago
  const slaApproaching1Deadline = new Date(slaApproaching1AssignedAt);
  slaApproaching1Deadline.setHours(slaApproaching1Deadline.getHours() + 48); // 48-hour SLA

  const slaApproaching1Lines = [
    {
      id: 'line-sla-approaching-1-1',
      line_no: 1,
      description: 'Office Supplies - Monthly Restocking',
      qty: 50,
      uom: 'EA',
      unit_price: 64.00,
      net_amount: 3200.00,
      line_total: 3200.00,
      po_line_id: 'po-line-9505-1',
      gr_line_id: null,
      ses_line_id: null
    }
  ];

  const slaApproaching1Subtotal = 3200.00;
  const slaApproaching1Tax = 256.00; // 8% sales tax
  const slaApproaching1Total = 3456.00;

  mockInvoices.push({
    id: 'sla-approaching-1',
    invoice_number: 'SLA-2025-0001',
    vendor_name_snapshot: 'Office Equipment Plus',
    vendor_id: 'VND-7001',
    vendor_tax_id_snapshot: 'TAX-VND-7001',
    invoice_date: slaApproaching1Date.toISOString().split('T')[0],
    due_date: slaApproaching1DueDate.toISOString().split('T')[0],
    email_received_date: (() => { const d = new Date(slaApproaching1Date); d.setDate(d.getDate() - 1); return d.toISOString().split('T')[0]; })(),
    currency: 'USD',
    subtotal: slaApproaching1Subtotal,
    tax_total: slaApproaching1Tax,
    tax_rate_percent: 8,
    total: slaApproaching1Total,
    status: 'pending_approval',
    workflow_status: 'approval',
    match_status: 'matched',
    type: 'PO',
    vendor_requires_po: true,
    vendor_is_verified: true,
    approval_status: 'pending',
    po_numbers_cached: ['PO-2025-9505'],
    gr_numbers: [],
    docType: 'Invoice',
    issues: [],
    created_at: slaApproaching1Date.toISOString(),
    updated_at: slaApproaching1Date.toISOString(),
    data_ingestion_date: slaApproaching1Date.toISOString().split('T')[0],
    lines: slaApproaching1Lines,
    invoice_lines: slaApproaching1Lines,
    assigned_to_name: 'Sarah Mitchell',
    assigned_to_user_id: 'user-1',
    // SLA tracking
    assigned_at: slaApproaching1AssignedAt.toISOString(),
    sla_hours: 48,
    sla_deadline: slaApproaching1Deadline.toISOString(),
    sla_status: 'at_risk',
    payment_terms: 'Net 30',
    // Vendor communications (1 polite email)
    vendor_communications: [
      {
        id: 'comm-1',
        type: 'email',
        timestamp: new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago
        from: 'ap@officeequipmentplus.com',
        subject: 'Payment Inquiry - Invoice SLA-2025-0001',
        preview: 'We hope this email finds you well. We wanted to follow up on invoice SLA-2025-0001 dated ' + slaApproaching1Date.toISOString().split('T')[0] + ' for $3,456.00. Could you please provide an update on the payment status?',
        tone: 'polite'
      }
    ],
    approver_history: {
      average_approval_time_hours: 18,
      total_approvals: 67,
      sla_breach_count: 1,
      last_breach_date: '2024-10-15'
    }
  } as Invoice);

  // ========================================================================
  // SLA SCENARIO #2 - JUST BREACHED (4 HOURS OVERDUE)
  // ========================================================================
  const slaBreached1Date = new Date(now);
  slaBreached1Date.setDate(slaBreached1Date.getDate() - 4); // Created 4 days ago
  const slaBreached1DueDate = new Date(slaBreached1Date);
  slaBreached1DueDate.setDate(slaBreached1DueDate.getDate() + 30); // Due in 26 days

  const slaBreached1AssignedAt = new Date(now);
  slaBreached1AssignedAt.setHours(slaBreached1AssignedAt.getHours() - 52); // Assigned 52 hours ago
  const slaBreached1Deadline = new Date(slaBreached1AssignedAt);
  slaBreached1Deadline.setHours(slaBreached1Deadline.getHours() + 48); // 48-hour SLA

  const slaBreached1Lines = [
    {
      id: 'line-sla-breached-1-1',
      line_no: 1,
      description: 'IT Consulting Services - Q1 2025',
      qty: 60,
      uom: 'Hours',
      unit_price: 125.00,
      net_amount: 7500.00,
      line_total: 7500.00,
      po_line_id: 'po-line-9506-1',
      gr_line_id: null,
      ses_line_id: null
    },
    {
      id: 'line-sla-breached-1-2',
      line_no: 2,
      description: 'Software Licenses - Annual Renewal',
      qty: 5,
      uom: 'License',
      unit_price: 200.00,
      net_amount: 1000.00,
      line_total: 1000.00,
      po_line_id: 'po-line-9506-2',
      gr_line_id: null,
      ses_line_id: null
    }
  ];

  const slaBreached1Subtotal = 8500.00;
  const slaBreached1Tax = 1700.00; // 20% VAT
  const slaBreached1Total = 10200.00;

  mockInvoices.push({
    id: 'sla-breached-1',
    invoice_number: 'SLA-2025-0002',
    vendor_name_snapshot: 'TechSupply Solutions Ltd',
    vendor_id: 'VND-1001',
    vendor_tax_id_snapshot: 'TAX-VND-1001',
    invoice_date: slaBreached1Date.toISOString().split('T')[0],
    due_date: slaBreached1DueDate.toISOString().split('T')[0],
    email_received_date: (() => { const d = new Date(slaBreached1Date); d.setDate(d.getDate() - 1); return d.toISOString().split('T')[0]; })(),
    currency: 'USD',
    subtotal: slaBreached1Subtotal,
    tax_total: slaBreached1Tax,
    tax_rate_percent: 20,
    total: slaBreached1Total,
    status: 'pending_approval',
    workflow_status: 'approval',
    match_status: 'matched',
    type: 'PO',
    vendor_requires_po: true,
    vendor_is_verified: true,
    approval_status: 'pending',
    po_numbers_cached: ['PO-2025-9506'],
    gr_numbers: [],
    docType: 'Invoice',
    issues: ['SLA Breached'],
    created_at: slaBreached1Date.toISOString(),
    updated_at: slaBreached1Date.toISOString(),
    data_ingestion_date: slaBreached1Date.toISOString().split('T')[0],
    lines: slaBreached1Lines,
    invoice_lines: slaBreached1Lines,
    assigned_to_name: 'James Thompson',
    assigned_to_user_id: 'user-2',
    // SLA tracking
    assigned_at: slaBreached1AssignedAt.toISOString(),
    sla_hours: 48,
    sla_deadline: slaBreached1Deadline.toISOString(),
    sla_status: 'breached',
    hours_overdue: 4,
    payment_terms: 'Net 30',
    // Vendor communications (2 emails: polite → urgent)
    vendor_communications: [
      {
        id: 'comm-2-1',
        type: 'email',
        timestamp: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(), // 24 hours ago
        from: 'finance@techsupply.com',
        subject: 'Payment Status Inquiry - Invoice SLA-2025-0002',
        preview: 'Dear Accounts Payable Team, We are writing to inquire about the payment status for invoice SLA-2025-0002 dated ' + slaBreached1Date.toISOString().split('T')[0] + ' for $10,200.00. Please let us know when we can expect payment.',
        tone: 'polite'
      },
      {
        id: 'comm-2-2',
        type: 'email',
        timestamp: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
        from: 'finance@techsupply.com',
        subject: 'URGENT: Payment Overdue - Invoice SLA-2025-0002',
        preview: 'This is a follow-up to our previous email. Invoice SLA-2025-0002 for $10,200.00 is now overdue per our payment terms. We kindly request immediate attention to this matter. Please provide an update on the payment timeline.',
        tone: 'urgent'
      }
    ],
    approver_history: {
      average_approval_time_hours: 12,
      total_approvals: 45,
      sla_breach_count: 2,
      last_breach_date: '2024-11-15'
    }
  } as Invoice);

  // ========================================================================
  // SLA SCENARIO #3 - SEVERELY BREACHED (48 HOURS OVERDUE, 2 DAYS)
  // ========================================================================
  const slaSevere1Date = new Date(now);
  slaSevere1Date.setDate(slaSevere1Date.getDate() - 8); // Created 8 days ago
  const slaSevere1DueDate = new Date(slaSevere1Date);
  slaSevere1DueDate.setDate(slaSevere1DueDate.getDate() + 30); // Due in 22 days

  const slaSevere1AssignedAt = new Date(now);
  slaSevere1AssignedAt.setDate(slaSevere1AssignedAt.getDate() - 5); // Assigned 5 days ago (120 hours)
  const slaSevere1Deadline = new Date(slaSevere1AssignedAt);
  slaSevere1Deadline.setHours(slaSevere1Deadline.getHours() + 48); // 48-hour SLA

  const slaSevere1Lines = [
    {
      id: 'line-sla-severe-1-1',
      line_no: 1,
      description: 'Industrial Equipment - Heavy Machinery Parts',
      qty: 12,
      uom: 'EA',
      unit_price: 1850.00,
      net_amount: 22200.00,
      line_total: 22200.00,
      po_line_id: 'po-line-9507-1',
      gr_line_id: null,
      ses_line_id: null
    },
    {
      id: 'line-sla-severe-1-2',
      line_no: 2,
      description: 'Installation and Configuration Services',
      qty: 15,
      uom: 'Hours',
      unit_price: 170.00,
      net_amount: 2550.00,
      line_total: 2550.00,
      po_line_id: 'po-line-9507-2',
      gr_line_id: null,
      ses_line_id: null
    }
  ];

  const slaSevere1Subtotal = 24750.00;
  const slaSevere1Tax = 4950.00; // 20% VAT
  const slaSevere1Total = 29700.00;

  mockInvoices.push({
    id: 'sla-severe-1',
    invoice_number: 'SLA-2025-0003',
    vendor_name_snapshot: 'Industrial Equipment Corp',
    vendor_id: 'VND-2001',
    vendor_tax_id_snapshot: 'TAX-VND-2001',
    invoice_date: slaSevere1Date.toISOString().split('T')[0],
    due_date: slaSevere1DueDate.toISOString().split('T')[0],
    email_received_date: (() => { const d = new Date(slaSevere1Date); d.setDate(d.getDate() - 1); return d.toISOString().split('T')[0]; })(),
    currency: 'USD',
    subtotal: slaSevere1Subtotal,
    tax_total: slaSevere1Tax,
    tax_rate_percent: 20,
    total: slaSevere1Total,
    status: 'pending_approval',
    workflow_status: 'approval',
    match_status: 'matched',
    type: 'PO',
    vendor_requires_po: true,
    vendor_is_verified: true,
    approval_status: 'pending',
    po_numbers_cached: ['PO-2025-9507'],
    gr_numbers: [],
    docType: 'Invoice',
    issues: ['SLA Severely Breached - Escalation Required'],
    created_at: slaSevere1Date.toISOString(),
    updated_at: slaSevere1Date.toISOString(),
    data_ingestion_date: slaSevere1Date.toISOString().split('T')[0],
    lines: slaSevere1Lines,
    invoice_lines: slaSevere1Lines,
    assigned_to_name: 'James Wilson',
    assigned_to_user_id: 'user-4',
    // SLA tracking
    assigned_at: slaSevere1AssignedAt.toISOString(),
    sla_hours: 48,
    sla_deadline: slaSevere1Deadline.toISOString(),
    sla_status: 'severe_breach',
    hours_overdue: 72, // 3 days overdue (72 hours)
    payment_terms: 'Net 30',
    late_payment_penalty: {
      applicable: true,
      rate: '1.5% per month',
      estimated_amount: 371.25 // 1.5% of $24,750
    },
    vendor_relationship_risk: 'medium',
    // Escalation tracking
    escalation_level: 1, // First escalation due
    escalation_to: {
      name: 'James Wilson',
      role: 'Finance Manager',
      email: 'james.wilson@company.com'
    },
    previous_escalations: 0,
    // Vendor communications (4 emails + 2 phone calls, escalating)
    vendor_communications: [
      {
        id: 'comm-3-1',
        type: 'email',
        timestamp: new Date(now.getTime() - 96 * 60 * 60 * 1000).toISOString(), // 4 days ago
        from: 'accounts@industrialeq.com',
        subject: 'Payment Inquiry - Invoice SLA-2025-0003',
        preview: 'Dear AP Team, We wanted to follow up on invoice SLA-2025-0003 dated ' + slaSevere1Date.toISOString().split('T')[0] + ' for $29,700.00. Could you please confirm receipt and provide an expected payment date?',
        tone: 'polite'
      },
      {
        id: 'comm-3-2',
        type: 'email',
        timestamp: new Date(now.getTime() - 72 * 60 * 60 * 1000).toISOString(), // 3 days ago
        from: 'accounts@industrialeq.com',
        subject: 'Follow-up: Payment Status - Invoice SLA-2025-0003',
        preview: 'We have not yet received a response to our previous inquiry. Please advise on the payment timeline for invoice SLA-2025-0003 ($29,700.00). This invoice is approaching the payment due date.',
        tone: 'urgent'
      },
      {
        id: 'comm-3-3',
        type: 'phone',
        timestamp: new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString(), // 2 days ago
        from: 'Jennifer Adams, AP Manager',
        notes: 'Calling to inquire about payment delay for invoice SLA-2025-0003. Mentioned vendor relationship and preferred supplier status. Requested callback.',
        tone: 'urgent',
        duration: 5
      },
      {
        id: 'comm-3-4',
        type: 'email',
        timestamp: new Date(now.getTime() - 36 * 60 * 60 * 1000).toISOString(), // 1.5 days ago
        from: 'accounts@industrialeq.com',
        subject: 'URGENT: Overdue Payment - Invoice SLA-2025-0003',
        preview: 'This is our third attempt to contact you regarding invoice SLA-2025-0003 for $29,700.00. The payment is now significantly overdue. Please note that late payment penalties may apply per our contract terms (1.5% per month). We require immediate attention to this matter.',
        tone: 'escalated'
      },
      {
        id: 'comm-3-5',
        type: 'phone',
        timestamp: new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago
        from: 'Jennifer Adams, AP Manager',
        notes: 'Second phone call. Expressed concern about payment delay affecting future business relationship. Mentioned that delayed payment could impact preferred supplier status and early payment discount eligibility on future orders.',
        tone: 'escalated',
        duration: 8
      },
      {
        id: 'comm-3-6',
        type: 'email',
        timestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
        from: 'robert.chen@industrialeq.com',
        subject: 'FINAL NOTICE: Escalation to Management - Invoice SLA-2025-0003',
        preview: 'Dear Sir/Madam, Due to continued non-response regarding invoice SLA-2025-0003 ($29,700.00), this matter is being escalated to our senior management and your procurement team. Late payment penalties totaling $371.25 are now applicable. We expect immediate resolution within 24 hours to avoid further escalation. Our CFO will be contacting your Finance Manager directly.',
        tone: 'escalated'
      }
    ],
    approver_history: {
      average_approval_time_hours: 36,
      total_approvals: 28,
      sla_breach_count: 5,
      last_breach_date: '2025-01-02'
    }
  } as Invoice);

  // Additional approval queue invoices for Sarah Mitchell (user-1)
  const additionalQueueDate1 = new Date(now);
  additionalQueueDate1.setDate(additionalQueueDate1.getDate() + 15);
  const additionalQueueAssigned1 = new Date(now.getTime() - 8 * 60 * 60 * 1000); // 8 hours ago

  mockInvoices.push({
    id: 'approval-queue-1',
    invoice_number: 'INV-2025-4501',
    vendor_name_snapshot: 'Microsoft Corporation',
    vendor_id: 'VND-MS-001',
    vendor_tax_id_snapshot: 'TAX-MS-001',
    invoice_date: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    due_date: additionalQueueDate1.toISOString().split('T')[0],
    currency: 'USD',
    subtotal: 12500.00,
    tax_total: 1000.00,
    total: 13500.00,
    status: 'pending_approval',
    match_status: 'matched',
    po_numbers_cached: ['PO-2025-1234'],
    assigned_to_user_id: 'user-1',
    assigned_to_name: 'Sarah Mitchell',
    assigned_at: additionalQueueAssigned1.toISOString(),
    sla_hours: 24,
    sla_status: 'on_time',
    lines: []
  } as Invoice);

  const additionalQueueDate2 = new Date(now);
  additionalQueueDate2.setDate(additionalQueueDate2.getDate() + 20);
  const additionalQueueAssigned2 = new Date(now.getTime() - 16 * 60 * 60 * 1000); // 16 hours ago

  mockInvoices.push({
    id: 'approval-queue-2',
    invoice_number: 'INV-2025-4502',
    vendor_name_snapshot: 'Adobe Systems',
    vendor_id: 'VND-ADOBE-001',
    vendor_tax_id_snapshot: 'TAX-ADOBE-001',
    invoice_date: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    due_date: additionalQueueDate2.toISOString().split('T')[0],
    currency: 'USD',
    subtotal: 8900.00,
    tax_total: 712.00,
    total: 9612.00,
    status: 'pending_approval',
    match_status: 'matched',
    po_numbers_cached: ['PO-2025-1235'],
    assigned_to_user_id: 'user-1',
    assigned_to_name: 'Sarah Mitchell',
    assigned_at: additionalQueueAssigned2.toISOString(),
    sla_hours: 24,
    sla_status: 'at_risk',
    lines: []
  } as Invoice);

  const additionalQueueDate3 = new Date(now);
  additionalQueueDate3.setDate(additionalQueueDate3.getDate() + 10);
  const additionalQueueAssigned3 = new Date(now.getTime() - 28 * 60 * 60 * 1000); // 28 hours ago (breached)

  mockInvoices.push({
    id: 'approval-queue-3',
    invoice_number: 'INV-2025-4503',
    vendor_name_snapshot: 'AWS',
    vendor_id: 'VND-AWS-001',
    vendor_tax_id_snapshot: 'TAX-AWS-001',
    invoice_date: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    due_date: additionalQueueDate3.toISOString().split('T')[0],
    currency: 'USD',
    subtotal: 45000.00,
    tax_total: 3600.00,
    total: 48600.00,
    status: 'pending_approval',
    match_status: 'matched',
    po_numbers_cached: ['PO-2025-1236'],
    assigned_to_user_id: 'user-1',
    assigned_to_name: 'Sarah Mitchell',
    assigned_at: additionalQueueAssigned3.toISOString(),
    sla_hours: 24,
    sla_status: 'breached',
    hours_overdue: 4,
    lines: []
  } as Invoice);

  const additionalQueueDate4 = new Date(now);
  additionalQueueDate4.setDate(additionalQueueDate4.getDate() + 18);
  const additionalQueueAssigned4 = new Date(now.getTime() - 5 * 60 * 60 * 1000); // 5 hours ago

  mockInvoices.push({
    id: 'approval-queue-4',
    invoice_number: 'INV-2025-4504',
    vendor_name_snapshot: 'Salesforce',
    vendor_id: 'VND-SF-001',
    vendor_tax_id_snapshot: 'TAX-SF-001',
    invoice_date: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    due_date: additionalQueueDate4.toISOString().split('T')[0],
    currency: 'USD',
    subtotal: 22000.00,
    tax_total: 1760.00,
    total: 23760.00,
    status: 'pending_approval',
    match_status: 'matched',
    po_numbers_cached: ['PO-2025-1237'],
    assigned_to_user_id: 'user-1',
    assigned_to_name: 'Sarah Mitchell',
    assigned_at: additionalQueueAssigned4.toISOString(),
    sla_hours: 24,
    sla_status: 'on_time',
    lines: []
  } as Invoice);

  const additionalQueueDate5 = new Date(now);
  additionalQueueDate5.setDate(additionalQueueDate5.getDate() + 12);
  const additionalQueueAssigned5 = new Date(now.getTime() - 20 * 60 * 60 * 1000); // 20 hours ago

  mockInvoices.push({
    id: 'approval-queue-5',
    invoice_number: 'INV-2025-4505',
    vendor_name_snapshot: 'Google Cloud',
    vendor_id: 'VND-GCP-001',
    vendor_tax_id_snapshot: 'TAX-GCP-001',
    invoice_date: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    due_date: additionalQueueDate5.toISOString().split('T')[0],
    currency: 'USD',
    subtotal: 15800.00,
    tax_total: 1264.00,
    total: 17064.00,
    status: 'pending_approval',
    match_status: 'matched',
    po_numbers_cached: ['PO-2025-1238'],
    assigned_to_user_id: 'user-1',
    assigned_to_name: 'Sarah Mitchell',
    assigned_at: additionalQueueAssigned5.toISOString(),
    sla_hours: 24,
    sla_status: 'at_risk',
    lines: []
  } as Invoice);

  const additionalQueueDate6 = new Date(now);
  additionalQueueDate6.setDate(additionalQueueDate6.getDate() + 25);
  const additionalQueueAssigned6 = new Date(now.getTime() - 3 * 60 * 60 * 1000); // 3 hours ago

  mockInvoices.push({
    id: 'approval-queue-6',
    invoice_number: 'INV-2025-4506',
    vendor_name_snapshot: 'Microsoft Corporation',
    vendor_id: 'VND-MS-001',
    vendor_tax_id_snapshot: 'TAX-MS-001',
    invoice_date: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    due_date: additionalQueueDate6.toISOString().split('T')[0],
    currency: 'USD',
    subtotal: 8200.00,
    tax_total: 656.00,
    total: 8856.00,
    status: 'pending_approval',
    match_status: 'matched',
    po_numbers_cached: ['PO-2025-1239'],
    assigned_to_user_id: 'user-1',
    assigned_to_name: 'Sarah Mitchell',
    assigned_at: additionalQueueAssigned6.toISOString(),
    sla_hours: 24,
    sla_status: 'on_time',
    lines: []
  } as Invoice);

  // Unassigned invoices for Pending Review (to demo intelligent assignment with OOO status)
  const pendingReviewDate1 = new Date(now);
  pendingReviewDate1.setDate(pendingReviewDate1.getDate() + 30);

  mockInvoices.push({
    id: 'pending-microsoft-1',
    invoice_number: 'INV-2025-5001',
    vendor_name_snapshot: 'Microsoft Corporation',
    vendor_id: 'VND-MS-001',
    vendor_tax_id_snapshot: 'TAX-MS-001',
    invoice_date: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    due_date: pendingReviewDate1.toISOString().split('T')[0],
    currency: 'USD',
    subtotal: 15200.00,
    tax_total: 1216.00,
    total: 16416.00,
    status: 'requires_review',
    match_status: 'matched',
    po_numbers_cached: ['PO-2025-1300'],
    assigned_to_user_id: null,
    assigned_to_name: null,
    lines: []
  } as Invoice);

  const pendingReviewDate2 = new Date(now);
  pendingReviewDate2.setDate(pendingReviewDate2.getDate() + 28);

  mockInvoices.push({
    id: 'pending-adobe-1',
    invoice_number: 'INV-2025-5002',
    vendor_name_snapshot: 'Adobe Systems',
    vendor_id: 'VND-ADOBE-001',
    vendor_tax_id_snapshot: 'TAX-ADOBE-001',
    invoice_date: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    due_date: pendingReviewDate2.toISOString().split('T')[0],
    currency: 'USD',
    subtotal: 7800.00,
    tax_total: 624.00,
    total: 8424.00,
    status: 'requires_review',
    match_status: 'matched',
    po_numbers_cached: ['PO-2025-1301'],
    assigned_to_user_id: null,
    assigned_to_name: null,
    lines: []
  } as Invoice);

  const pendingReviewDate3 = new Date(now);
  pendingReviewDate3.setDate(pendingReviewDate3.getDate() + 25);

  mockInvoices.push({
    id: 'pending-microsoft-2',
    invoice_number: 'INV-2025-5003',
    vendor_name_snapshot: 'Microsoft Corporation',
    vendor_id: 'VND-MS-001',
    vendor_tax_id_snapshot: 'TAX-MS-001',
    invoice_date: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    due_date: pendingReviewDate3.toISOString().split('T')[0],
    currency: 'USD',
    subtotal: 11000.00,
    tax_total: 880.00,
    total: 11880.00,
    status: 'requires_review',
    match_status: 'matched',
    po_numbers_cached: ['PO-2025-1302'],
    assigned_to_user_id: null,
    assigned_to_name: null,
    lines: []
  } as Invoice);

  const pendingReviewDate4 = new Date(now);
  pendingReviewDate4.setDate(pendingReviewDate4.getDate() + 22);

  mockInvoices.push({
    id: 'pending-adobe-2',
    invoice_number: 'INV-2025-5004',
    vendor_name_snapshot: 'Adobe Systems',
    vendor_id: 'VND-ADOBE-001',
    vendor_tax_id_snapshot: 'TAX-ADOBE-001',
    invoice_date: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    due_date: pendingReviewDate4.toISOString().split('T')[0],
    currency: 'USD',
    subtotal: 12500.00,
    tax_total: 1000.00,
    total: 13500.00,
    status: 'requires_review',
    match_status: 'matched',
    po_numbers_cached: ['PO-2025-1303'],
    assigned_to_user_id: null,
    assigned_to_name: null,
    lines: []
  } as Invoice);

  // Enrich all invoices with demo data using centralized service
  return mockInvoices.map(enrichInvoiceWithDemoData);
};

// ============================================================================
// EXCEPTION NAV — PO / NON-PO TABS (shared with EnhancedInvoicesClient)
// ============================================================================

/** PO work queue: PO-classified (includes auto-rejected POs so tab counts partition the full list) */
export function matchesPoInvoicesExceptionNavTab(inv: Invoice): boolean {
  if (!(inv.type === 'PO' || inv.vendor_requires_po === true)) return false;
  if (inv.status === 'rejected') return false;
  return true;
}

/**
 * Non-PO work queue: mutually exclusive with matchesPoInvoicesExceptionNavTab (PO classification wins).
 */
export function matchesNonPoInvoicesExceptionNavTab(inv: Invoice): boolean {
  if (inv.status === 'rejected') return false;
  if (inv.type === 'PO' || inv.vendor_requires_po === true) return false;
  return inv.type === 'Non-PO' || inv.vendor_requires_po === false;
}

// ============================================================================
// SERVICE FUNCTIONS
// ============================================================================

const USE_MOCK_DATA = process.env.USE_MOCK_DATA !== 'false'; // Default to true
const DEBUG_MOCK = process.env.DEBUG_MOCK === 'true';

// ============================================================================
// MOCK INVOICE CACHE (In-Memory Persistence)
// ============================================================================
// Cache for storing updated mock invoices to simulate database persistence
// Survives page refreshes but clears on server restart
let mockInvoiceCache = new Map<string, Invoice>();

/**
 * Update a mock invoice in the cache
 * This simulates database persistence for mock invoices within the current session
 */
export const updateMockInvoice = (id: string, updates: Partial<Invoice>): Invoice | null => {
  if (DEBUG_MOCK) {
    console.log('[MockService] Updating mock invoice:', id, updates);
  }

  // Get current invoice (either from cache or fresh generation)
  const currentInvoice = getMockInvoiceById(id);

  if (!currentInvoice) {
    console.error('[MockService] Cannot update - invoice not found:', id);
    return null;
  }

  // Merge updates with current invoice data
  const updatedInvoice = {
    ...currentInvoice,
    ...updates,
    updated_at: new Date().toISOString()
  };

  // Store in cache
  mockInvoiceCache.set(id, updatedInvoice);

  if (DEBUG_MOCK) {
    console.log('[MockService] Invoice updated in cache:', id);
    console.log('[MockService] Updated fields:', Object.keys(updates));
  }

  return updatedInvoice;
};

/**
 * Clear the mock invoice cache
 * Useful for testing and resetting mock data to original state
 */
export const clearMockInvoiceCache = () => {
  mockInvoiceCache.clear();
  console.log('[MockService] Cache cleared - all mock invoices reset to original state');
};

/**
 * Check if an invoice ID is a mock ID
 */
export const isMockInvoice = (id: string): boolean => {
  if (DEBUG_MOCK) {
    console.log('[MockService] Checking if mock invoice:', id);
    console.log('[MockService] USE_MOCK_DATA:', USE_MOCK_DATA);
  }

  if (!USE_MOCK_DATA) {
    if (DEBUG_MOCK) console.log('[MockService] Mock data disabled');
    return false;
  }

  // Updated prefixes for baseline approach and other mock scenarios
  const mockPrefixes = [
    'baseline-',
    'missing-po-',
    'fraud-risk-',
    'auto-reject-',
    'sla-',
    'agent-processed-',
    'po-exc-',
  ];
  const isMock = mockPrefixes.some(prefix => id.startsWith(prefix));

  if (DEBUG_MOCK) {
    console.log('[MockService] Mock prefixes:', mockPrefixes);
    console.log('[MockService] Is mock result:', isMock);
  }

  return isMock;
};

/**
 * Get all mock invoices (baseline + agent-processed)
 * NOTE: All invoices are transformed through transformToFullInvoice to ensure
 * vendor snapshot fields, payment fields, and other enriched data are populated
 */
export const getAllMockInvoices = (): Invoice[] => {
  const baselineMocks = generateBaselineInvoices();
  
  // Load agents and generate agent-processed invoices
  let agentProcessedMocks: Invoice[] = [];
  
  // Server-side: load from cache file
  if (typeof window === 'undefined') {
    try {
      console.log('[MockService] Attempting to load server agents...');
      // Dynamically import server-only module
      const { loadActiveAgentsServer } = require('./agentInvoiceService.server');
      console.log('[MockService] loadActiveAgentsServer function loaded:', typeof loadActiveAgentsServer);
      const serverAgents = loadActiveAgentsServer();
      console.log('[MockService] Server agents loaded:', serverAgents.length);
      agentProcessedMocks = generateAgentProcessedInvoices(serverAgents);
      console.log('[MockService] Agent-processed invoices generated:', agentProcessedMocks.length);
    } catch (e) {
      console.error('[MockService] Failed to load server agents:', e);
    }
  } else {
    // Client-side: load from localStorage
    agentProcessedMocks = generateAgentProcessedInvoices();
  }
  
  const allMocks = [...baselineMocks, ...agentProcessedMocks];
  console.log('[MockService] Total mock invoices:', allMocks.length, '(baseline:', baselineMocks.length, ', agent-processed:', agentProcessedMocks.length, ')');

  // Transform each invoice to ensure all fields are properly enriched
  const enrichedMocks = allMocks.map(invoice => transformToFullInvoice(invoice));

  return normalizeMockInvoiceDates(enrichedMocks);
};

/**
 * Get a specific mock invoice by ID
 * Checks cache first for updated invoices, then generates fresh if not cached
 */
export const getMockInvoiceById = (id: string): Invoice | null => {
  if (DEBUG_MOCK) {
    console.log('[MockService] Getting mock invoice by ID:', id);
  }

  try {
    if (!isMockInvoice(id)) {
      if (DEBUG_MOCK) console.log('[MockService] ID is not a mock invoice');
      return null;
    }

    // For demo invoices with teaching workflows, clear cache on page load
    // This allows refreshing to restart the teaching workflow
    const demoInvoicesWithTeaching = ['missing-po-1', 'baseline-po-1'];
    if (demoInvoicesWithTeaching.includes(id)) {
      mockInvoiceCache.delete(id);
      if (DEBUG_MOCK) {
        console.log('[MockService] Cleared cache for demo invoice:', id);
      }
    }
    
    // Note: Agent-processed invoices use module-level cache in agentInvoiceService.ts
    // so we don't need to clear cache here - they're managed separately

    // Check cache first - return cached version if it exists
    if (mockInvoiceCache.has(id)) {
      if (DEBUG_MOCK) {
        console.log('[MockService] Returning cached invoice:', id);
      }
      return mockInvoiceCache.get(id)!;
    }

    // Not in cache - generate fresh invoice
    const allMockInvoices = getAllMockInvoices();
    if (DEBUG_MOCK) {
      console.log('[MockService] Total mock invoices available:', allMockInvoices.length);
    }

    const invoice = allMockInvoices.find(inv => inv.id === id);

    if (!invoice) {
      if (DEBUG_MOCK) console.log('[MockService] Invoice not found in mock data');
      return null;
    }

    if (DEBUG_MOCK) {
      console.log('[MockService] Found mock invoice:', invoice.invoice_number);
    }

    // Transform to full invoice structure with additional fields
    const transformedInvoice = transformToFullInvoice(invoice);

    // Store in cache for future requests
    mockInvoiceCache.set(id, transformedInvoice);

    return transformedInvoice;
  } catch (error) {
    console.error('[MockService] Error getting mock invoice:', error);
    return null;
  }
};

/**
 * Generate mock PO comparison data for mock invoices with POs
 *
 * @param invoiceId - Invoice ID
 * @param invoiceData - Optional invoice data to use instead of fetching from static mock data
 *                      This allows calculating match results for edited/updated invoice data
 */
export const getMockPoComparisonData = (invoiceId: string, invoiceData?: any): any | null => {
  if (!isMockInvoice(invoiceId)) {
    return null;
  }

  // Use provided invoice data if available, otherwise fetch from static mock data
  const invoice = invoiceData || getMockInvoiceById(invoiceId);
  if (!invoice || !invoice.po_numbers_cached || invoice.po_numbers_cached.length === 0) {
    return null;
  }

  const poNumber = invoice.po_numbers_cached[0];

  // Generate mock PO lines based on invoice lines
  const invoiceLines = invoice.lines || invoice.invoice_lines || [];

  // Try to get PO data from mock PO service first
  const { getMockPOByNumber } = require('./mockPOService');
  const mockPO = getMockPOByNumber(poNumber);

  let poLines: any[];

  if (mockPO && mockPO.lines) {
    // Use actual PO lines from mock PO service
    poLines = mockPO.lines;
  } else {
    // Fallback: Create matching PO lines with slight variances
    poLines = invoiceLines
      .filter((_, index) => index < 3) // Only first 3 invoice lines have corresponding PO lines
      .map((line: any, index: number) => ({
        id: `po-line-${index + 1}`,
        line_no: index + 1,
        description: line.description,
        item_description: line.description,
        sku: line.sku || line.product_code || '-', // Copy SKU from invoice line
        qty_ordered: line.qty * 0.95, // Slightly different quantity for variance
        qty_received_to_date: 0,
        qty_invoiced_to_date: 0,
        qty_remaining_to_receive: line.qty * 0.95,
        qty_remaining_to_invoice: line.qty * 0.95,
        uom: line.uom || 'EA',
        unit_price: line.unit_price * 1.02, // Slightly different price for variance
        status: 'open'
      }));
  }

  const poGoodsSubtotal = poLines
    .filter((line: any) => !line.is_tax_line)
    .reduce((sum: number, line: any) => sum + line.qty_ordered * line.unit_price, 0);
  const poTaxFromLines = poLines
    .filter((line: any) => line.is_tax_line)
    .reduce((sum: number, line: any) => sum + line.qty_ordered * line.unit_price, 0);

  // Default: goods subtotal + explicit tax lines, else legacy 20% on goods only.
  let poSubtotal = poGoodsSubtotal;
  let poTaxTotal = poTaxFromLines > 0 ? poTaxFromLines : poGoodsSubtotal * 0.2;
  let poGrandTotal =
    poTaxFromLines > 0 ? poGoodsSubtotal + poTaxFromLines : poGoodsSubtotal * 1.2;

  // Use mock PO header totals when present so tax rate matches the scenario (e.g. 15% not 20%).
  if (mockPO && mockPO.lines) {
    if (typeof mockPO.subtotal === 'number') {
      poSubtotal = mockPO.subtotal;
    }
    if (typeof mockPO.total === 'number') {
      poGrandTotal = mockPO.total;
    }
    poTaxTotal = Math.max(0, poGrandTotal - poSubtotal);
  }

  const poData = {
    po_id: `po-${invoiceId}`,
    po_number: poNumber,
    vendor_id: invoice.vendor_id,
    currency: invoice.currency || 'USD',
    po_status: 'approved',
    expected_match_rule: '3-way',
    subtotal: poSubtotal,
    tax_total: poTaxTotal,
    total: poGrandTotal,
    po_lines: poLines
  };

  // Generate match results
  const matchResults = invoiceLines.map((invLine: any, index: number) => {
    // Try to match by po_line_id first, then by line_no
    let poLine = null;
    if (invLine.po_line_id) {
      poLine = poLines.find(pl => pl.id === invLine.po_line_id);
    }
    if (!poLine) {
      poLine = poLines.find(pl => pl.line_no === invLine.line_no);
    }

    // Handle UOM conversions: if line has uom_conversion, use converted quantity for comparison
    let invoiceQtyForComparison = invLine.qty;
    let invoicePriceForComparison = invLine.unit_price;
    if (invLine.uom_conversion && poLine) {
      // Convert invoice quantity to PO UOM for comparison
      invoiceQtyForComparison = invLine.uom_conversion.po_qty;
      // Adjust unit price to match converted quantity (total should remain same)
      invoicePriceForComparison = (invLine.qty * invLine.unit_price) / invLine.uom_conversion.po_qty;
    }

    const qtyVariance = poLine ? invoiceQtyForComparison - poLine.qty_ordered : 0;
    const priceVariance = poLine ? invoicePriceForComparison - poLine.unit_price : 0;
    // Use net_amount (before tax) for comparison with PO, not line_total (includes tax)
    const invoiceNetAmount = invLine.net_amount || (invLine.qty * invLine.unit_price);
    const poNetAmount = poLine ? (poLine.qty_ordered * poLine.unit_price) : 0;

    return {
      id: `match-${index + 1}`,
      invoice_line_id: invLine.id || `line-${index + 1}`,
      matched_po_line_id: poLine?.id || null,
      matched_gr_line_id: null,
      qty_variance: qtyVariance,
      price_variance: priceVariance,
      amount_variance: poLine ? invoiceNetAmount - poNetAmount : 0,
      within_tolerance: poLine ? (Math.abs(qtyVariance) < 1 && Math.abs(priceVariance) < 10) : false,
      explanation_code: poLine ? (Math.abs(qtyVariance) > 1 ? 'QTY_MISMATCH' : Math.abs(priceVariance) > 10 ? 'PRICE_MISMATCH' : 'PERFECT_MATCH') : 'NO_PO_LINE',
      po_line_no: poLine?.line_no || null,
      po_description: poLine?.description || null,
      po_qty: poLine?.qty_ordered || null,
      po_unit_price: poLine?.unit_price || null,
      po_uom: poLine?.uom || null,
      gr_qty_received: null
    };
  });

  // Merged PO bundle: several invoice lines → one PO line; reconcile on sum of invoice nets.
  const bundlePoLineIds = new Set(
    poLines.filter((pl: any) => pl.is_merged_bundle).map((pl: any) => pl.id)
  );
  bundlePoLineIds.forEach((bundlePoId) => {
    const indices = invoiceLines
      .map((l: any, i: number) => ({ l, i }))
      .filter(({ l }) => l.po_line_id === bundlePoId)
      .map(({ i }) => i);
    const poLine = poLines.find((pl: any) => pl.id === bundlePoId);
    if (!poLine || indices.length < 2) return;
    const sumInvoiceNet = indices.reduce(
      (s, i) =>
        s +
        (invoiceLines[i].net_amount ||
          (invoiceLines[i].qty || 0) * (invoiceLines[i].unit_price || 0)),
      0
    );
    const poNet = (poLine.qty_ordered || 0) * (poLine.unit_price || 0);
    if (Math.abs(sumInvoiceNet - poNet) > 0.02) return;
    indices.forEach((i) => {
      matchResults[i].within_tolerance = true;
      matchResults[i].explanation_code = 'BUNDLE_MATCH';
      matchResults[i].qty_variance = 0;
      matchResults[i].price_variance = 0;
      matchResults[i].amount_variance = 0;
    });
  });

  // Convert poData to PODataWithLines format for poDataList
  const poDataWithLines = {
    id: poData.po_id,
    po_number: poData.po_number,
    vendor_id: poData.vendor_id,
    currency: poData.currency,
    po_status: poData.po_status,
    subtotal: poData.subtotal,
    total: poData.total,
    lines: poData.po_lines
  };

  return {
    invoice: {
      id: invoice.id,
      invoice_number: invoice.invoice_number,
      po_numbers_cached: invoice.po_numbers_cached,
      lines: invoiceLines
    },
    poData: poData,
    poDataList: [poDataWithLines], // Also provide as array for consistent component handling
    matchResults: matchResults,
    grData: {
      gr_lines: []
    },
    lineComparison: invoiceLines.map((invLine: any, index: number) => {
      const matchResult = matchResults[index];
      // Use the same matching logic as above
      let poLine = null;
      if (invLine.po_line_id) {
        poLine = poLines.find(pl => pl.id === invLine.po_line_id);
      }
      if (!poLine) {
        poLine = poLines.find(pl => pl.line_no === invLine.line_no);
      }

      const siblingsWithSamePo = invoiceLines.filter(
        (l: any) => l.po_line_id && l.po_line_id === invLine.po_line_id
      );
      const bundleGroup =
        poLine?.is_merged_bundle && siblingsWithSamePo.length > 1
          ? {
              poLineId: poLine.id,
              size: siblingsWithSamePo.length,
              index: siblingsWithSamePo.findIndex((l: any) => l.id === invLine.id)
            }
          : null;

      return {
        invoice: invLine,
        po: poLine || null,
        gr: null,
        matchResult: matchResult,
        hasVariance: matchResult && !matchResult.within_tolerance,
        status: poLine ? (matchResult.within_tolerance ? 'matched' : 'variance') : 'no_po_line',
        bundleGroup
      };
    }),
    unmatchedPoLines: []
  };
};

/**
 * Generate mock PO comparison data for invoices with MULTIPLE POs
 * Supports multi-PO scenarios with utilization tracking
 *
 * @param invoiceId - Invoice ID
 * @param invoiceData - Optional invoice data to use
 */
export const getMockPoComparisonDataMulti = (invoiceId: string, invoiceData?: any): any | null => {
  if (!isMockInvoice(invoiceId)) {
    return null;
  }

  // Use provided invoice data if available, otherwise fetch from static mock data
  const invoice = invoiceData || getMockInvoiceById(invoiceId);
  if (!invoice || !invoice.po_numbers_cached || invoice.po_numbers_cached.length === 0) {
    return null;
  }

  const poNumbers = invoice.po_numbers_cached;
  const invoiceLines = invoice.lines || invoice.invoice_lines || [];

  // Fetch all POs
  const poDataList: any[] = [];
  const allMatchResults: any[] = [];
  const utilization: {[poNumber: string]: any} = {};

  poNumbers.forEach((poNumber: string) => {
    const mockPO = getMockPOByNumber(poNumber);

    let poLines: any[];
    if (mockPO && mockPO.lines) {
      poLines = mockPO.lines;
    } else {
      // Fallback: create mock PO lines
      poLines = invoiceLines
        .slice(0, 3)
        .map((line: any, index: number) => ({
          id: `po-line-${poNumber}-${index + 1}`,
          line_no: index + 1,
          description: line.description,
          item_description: line.description,
          sku: line.sku || line.product_code || '-',
          qty_ordered: line.qty * 0.95,
          qty_received_to_date: 0,
          qty_invoiced_to_date: 0,
          qty_remaining_to_receive: line.qty * 0.95,
          qty_remaining_to_invoice: line.qty * 0.95,
          uom: line.uom || 'EA',
          unit_price: line.unit_price * 1.02,
          status: 'open'
        }));
    }

    const poGoodsSubtotalMulti = poLines
      .filter((line: any) => !line.is_tax_line)
      .reduce((sum: number, line: any) => sum + line.qty_ordered * line.unit_price, 0);
    const poTaxFromLinesMulti = poLines
      .filter((line: any) => line.is_tax_line)
      .reduce((sum: number, line: any) => sum + line.qty_ordered * line.unit_price, 0);

    let poSubtotal = poGoodsSubtotalMulti;
    let poGrandTotal =
      poTaxFromLinesMulti > 0
        ? poGoodsSubtotalMulti + poTaxFromLinesMulti
        : poGoodsSubtotalMulti * 1.2;
    if (mockPO && mockPO.lines) {
      if (typeof mockPO.subtotal === 'number') {
        poSubtotal = mockPO.subtotal;
      }
      if (typeof mockPO.total === 'number') {
        poGrandTotal = mockPO.total;
      }
    }

    poDataList.push({
      id: `po-${poNumber}`,
      po_number: poNumber,
      vendor_id: invoice.vendor_id,
      currency: invoice.currency || 'USD',
      po_status: 'approved',
      subtotal: poSubtotal,
      total: poGrandTotal,
      lines: poLines
    });
  });

  // Generate match results for all invoice lines
  invoiceLines.forEach((invLine: any, index: number) => {
    // Try to find matching PO line across all POs
    let poLine = null;
    let matchedPoNumber = null;

    // First try to match by po_line_id
    if (invLine.po_line_id) {
      for (const poData of poDataList) {
        poLine = poData.lines.find((pl: any) => pl.id === invLine.po_line_id);
        if (poLine) {
          matchedPoNumber = poData.po_number;
          break;
        }
      }
    }

    // Fallback: match by line_no to first PO
    if (!poLine && poDataList[0]) {
      poLine = poDataList[0].lines.find((pl: any) => pl.line_no === invLine.line_no);
      if (poLine) {
        matchedPoNumber = poDataList[0].po_number;
      }
    }

    const invoiceQtyForComparison = invLine.qty;
    const invoicePriceForComparison = invLine.unit_price;
    const qtyVariance = poLine ? invoiceQtyForComparison - poLine.qty_ordered : 0;
    const priceVariance = poLine ? invoicePriceForComparison - poLine.unit_price : 0;
    const invoiceNetAmount = invLine.net_amount || (invLine.qty * invLine.unit_price);
    const poNetAmount = poLine ? (poLine.qty_ordered * poLine.unit_price) : 0;

    allMatchResults.push({
      id: `match-${index + 1}`,
      invoice_line_id: invLine.id || `line-${index + 1}`,
      matched_po_line_id: poLine?.id || null,
      matched_po_number: matchedPoNumber,
      matched_gr_line_id: null,
      qty_variance: qtyVariance,
      price_variance: priceVariance,
      amount_variance: poLine ? invoiceNetAmount - poNetAmount : 0,
      within_tolerance: poLine ? (Math.abs(qtyVariance) < 1 && Math.abs(priceVariance) < 10) : false,
      explanation_code: poLine ? (Math.abs(qtyVariance) > 1 ? 'QTY_MISMATCH' : Math.abs(priceVariance) > 10 ? 'PRICE_MISMATCH' : 'PERFECT_MATCH') : 'NO_PO_LINE',
      po_line_no: poLine?.line_no || null,
      po_description: poLine?.description || null,
      po_qty: poLine?.qty_ordered || null,
      po_unit_price: poLine?.unit_price || null,
      po_uom: poLine?.uom || null,
      gr_qty_received: null
    });
  });

  // Add usage metadata to each PO line
  poDataList.forEach((poData) => {
    poData.lines = poData.lines.map((poLine: any) => {
      // Check if this PO line is matched to any invoice line on THIS invoice
      const matchedToThisInvoice = allMatchResults.find(
        (mr: any) => mr.matched_po_line_id === poLine.id
      );

      if (matchedToThisInvoice) {
        // Used by this invoice
        return {
          ...poLine,
          usage: {
            state: 'usedByThisInvoice',
            invoiceId: invoice.id,
            invoiceLineId: matchedToThisInvoice.invoice_line_id
          } as POLineUsage
        };
      }

      // Check if mock data indicates this line is used by another invoice
      if (poLine.usedByInvoiceId && poLine.usedByInvoiceId !== invoice.id) {
        return {
          ...poLine,
          usage: {
            state: 'usedByOtherInvoice',
            invoiceId: poLine.usedByInvoiceId,
            invoiceNumber: poLine.usedByInvoiceNumber
          } as POLineUsage
        };
      }

      // Otherwise unused
      return {
        ...poLine,
        usage: { state: 'unused' } as POLineUsage
      };
    });
  });

  // Calculate utilization for each PO (exclude header-level tax lines from line counts)
  poDataList.forEach((poData) => {
    const poNumber = poData.po_number;
    const poLines = poData.lines;
    const utilizationLines = poLines.filter((line: any) => !line.is_tax_line);

    // Count matched lines for this PO
    const matchedLineIds = allMatchResults
      .filter(mr => mr.matched_po_number === poNumber)
      .map(mr => mr.matched_po_line_id);

    const matchedGoodsIds = matchedLineIds.filter((id: string | null) =>
      id && utilizationLines.some((l: any) => l.id === id)
    );
    const usedLines = new Set(matchedGoodsIds).size;
    const totalLines = utilizationLines.length;

    // Calculate amounts (goods lines only; tax is header-level on PO)
    const totalAmount = utilizationLines.reduce((sum: number, line: any) =>
      sum + (line.qty_ordered * line.unit_price), 0);

    const usedAmount = utilizationLines
      .filter((line: any) => matchedLineIds.includes(line.id))
      .reduce((sum: number, line: any) =>
        sum + (line.qty_ordered * line.unit_price), 0);

    // Identify unused and fully used lines
    const unusedLines = utilizationLines.filter((line: any) =>
      !matchedLineIds.includes(line.id)
    );

    const fullyUsedLines = utilizationLines.filter((line: any) =>
      matchedLineIds.includes(line.id)
    );

    utilization[poNumber] = {
      totalLines,
      usedLines,
      totalAmount,
      usedAmount,
      unusedLines,
      fullyUsedLines
    };
  });

  // Build line comparison with PO number
  const lineComparison = invoiceLines.map((invLine: any, index: number) => {
    const matchResult = allMatchResults[index];

    let poLine = null;
    let poNumber = null;

    if (matchResult.matched_po_line_id) {
      for (const poData of poDataList) {
        poLine = poData.lines.find((pl: any) => pl.id === matchResult.matched_po_line_id);
        if (poLine) {
          poNumber = poData.po_number;
          break;
        }
      }
    }

    return {
      invoice: invLine,
      po: poLine || null,
      po_number: poNumber,
      gr: null,
      matchResult: matchResult,
      hasVariance: matchResult && !matchResult.within_tolerance,
      status: poLine ? (matchResult.within_tolerance ? 'matched' : 'variance') : 'unmatched'
    };
  });

  return {
    invoice: {
      id: invoice.id,
      invoice_number: invoice.invoice_number,
      po_numbers_cached: invoice.po_numbers_cached,
      lines: invoiceLines
    },
    poDataList: poDataList,
    matchResults: allMatchResults,
    utilization: utilization,
    lineComparison: lineComparison
  };
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate due status based on due date
 */
const calculateDueStatus = (dueDate: string): 'Due Soon' | 'Overdue' | undefined => {
  if (!dueDate) return undefined;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  // Overdue if past due date
  if (diffDays < 0) {
    return 'Overdue';
  }

  // Due Soon if within 7 days
  if (diffDays >= 0 && diffDays <= 7) {
    return 'Due Soon';
  }

  // Otherwise undefined (not due soon, not overdue)
  return undefined;
};

/**
 * Transform a minimal mock invoice to full detail structure
 */
const transformToFullInvoice = (invoice: Invoice): Invoice => {
  const hasTotal = invoice.total !== undefined && invoice.total !== null;
  const total = hasTotal ? invoice.total : 0;
  const isNegative = total < 0; // For credit notes
  const absTotal = Math.abs(total);

  // Calculate financial breakdown
  // Use invoice's tax rate if available, otherwise default to 20% VAT
  const taxRate = invoice.tax_rate_percent ? invoice.tax_rate_percent / 100 : 0.20;
  const subtotal = invoice.subtotal || (hasTotal ? absTotal / (1 + taxRate) : 0);
  const taxTotal = invoice.tax_total || (hasTotal ? absTotal - subtotal : 0);

  // Calculate due status
  const dueStatus = invoice.due_date ? calculateDueStatus(invoice.due_date) : undefined;

  // Use existing lines if available
  const lines = invoice.lines || invoice.invoice_lines || [];

  return {
    ...invoice,
    // Ensure all required fields have values
    vendor_name_snapshot: invoice.vendor_name_snapshot || 'Unknown Vendor',
    vendor_tax_id_snapshot: invoice.vendor_id ? `TAX-${invoice.vendor_id}` : undefined,
    vendor_address_snapshot: invoice.vendor_address_snapshot || (invoice.vendor_name_snapshot
      ? `123 Business Street, Suite 100, Business City, BC 12345`
      : undefined),
    invoice_date: invoice.invoice_date || 'Date not provided',
    currency: invoice.currency || 'USD',
    subtotal: isNegative ? -subtotal : subtotal,
    tax_total: isNegative ? -taxTotal : taxTotal,
    tax_rate_percent: invoice.tax_rate_percent ?? (hasTotal ? taxRate * 100 : undefined),
    shipping_total: 0,
    other_charges_total: 0,
    discount_total: 0,
    total: hasTotal ? invoice.total : undefined,
    dueStatus: dueStatus,
    payment_terms_id: 'NET30',
    terms_text: 'Net 30 days',
    assigned_to_name: invoice.assigned_to_name || invoice.approver || null,
    assigned_to_email: invoice.assigned_to_email || undefined,
    ledger: 'Accounts Payable',
    cost_center: invoice.cost_center || 'CC-1001',
    cost_center_name: invoice.cost_center_name || 'Operations',
    gl_code: 'GL-5000',
    department: invoice.department || 'Finance',
    accounting_notes: null,
    ai_classification_confidence: hasTotal ? 0.95 : undefined,
    ai_classification_reasoning: hasTotal ? 'Classification based on vendor and amount patterns' : undefined,
    extraction_field_confidences: hasTotal ? {
      // Invoice Information
      invoice_number: invoice.invoice_number && invoice.invoice_number.trim() !== '' ? 0.99 : 0,
      invoice_date: invoice.invoice_date ? 0.97 : 0,
      due_date: invoice.due_date ? 0.96 : 0,
      vendor_name_snapshot: invoice.vendor_name_snapshot ? 0.92 : 0,
      vendor_tax_id_snapshot: invoice.vendor_tax_id_snapshot && invoice.vendor_tax_id_snapshot.trim() !== '' ? 0.94 : 0,
      po_numbers_cached:
        invoice.po_numbers_cached?.length > 0
          ? 0.92
          : (invoice as { suppress_validation_fields?: string[] }).suppress_validation_fields?.includes(
                'po_numbers_cached'
              )
            ? undefined
            : 0,
      job_number: 0, // Custom field - not found initially
      vehicle_registration_no: invoice.id === 'baseline-po-bank-1' ? 0.92 : 0, // Custom field specific to Industrial Equipment Corp

      // Financial Details
      subtotal: invoice.subtotal > 0 ? 0.92 : 0,
      currency: invoice.currency ? 0.95 : 0,
      tax_rate_percent: (invoice.tax_rate_percent !== undefined && invoice.tax_rate_percent !== null) ? 0.91 : 0,
      tax_total: invoice.tax_total > 0 ? 0.93 : 0,
      total: invoice.total > 0 ? 0.99 : 0,

      // Payment Information
      payment_method: invoice.payment_method && invoice.payment_method.trim() !== '' ? 0.88 : 0,
      terms_text: invoice.terms_text && invoice.terms_text.trim() !== '' ? 0.90 : 0,

      // Accounting Classification
      // Use higher confidence (94-98%) for auto-coded invoices
      ledger: invoice.ledger && invoice.ledger.trim() !== '' ? (invoice.auto_coding_applied ? 0.96 : 0.85) : 0,
      cost_center: invoice.cost_center && invoice.cost_center.trim() !== '' ? (invoice.auto_coding_applied ? 0.94 : 0.87) : 0,
      gl_code: invoice.gl_code && invoice.gl_code.trim() !== '' ? (invoice.auto_coding_applied ? 0.98 : 0.86) : 0,
      department: invoice.department && invoice.department.trim() !== '' ? (invoice.auto_coding_applied ? 0.95 : 0.84) : 0
    } : {},
    is_manually_edited: {},
    payment_method: 'bank_transfer',
    payment_bank_details: invoice.payment_bank_details || (invoice.vendor_name_snapshot ? {
      bank_name: 'First National Bank',
      account_name: invoice.vendor_name_snapshot,
      account_number: '12345671234',
      routing_number: '123456789'
    } : null),
    lines: lines,
    invoice_lines: lines, // Also set invoice_lines for compatibility
    poTotal: invoice.po_numbers_cached && invoice.po_numbers_cached.length > 0 && hasTotal
      ? subtotal * 1.05 // Slightly higher PO amount
      : null,
    validation_warnings: invoice.validation_warnings || generateValidationWarnings(invoice),
    attachments: []
  };
};

/**
 * Generate validation warnings based on invoice state
 */
const generateValidationWarnings = (invoice: Invoice): any => {
  const warnings = [];

  if (!invoice.vendor_name_snapshot) {
    warnings.push({
      field: 'vendor',
      message: 'Vendor information is missing',
      severity: 'critical'
    });
  }

  if (!invoice.vendor_id && invoice.vendor_name_snapshot) {
    warnings.push({
      field: 'vendor_id',
      message: 'Vendor exists but is not linked to master data',
      severity: 'warning'
    });
  }

  if (!invoice.invoice_date) {
    warnings.push({
      field: 'invoice_date',
      message: 'Invoice date is missing',
      severity: 'critical'
    });
  }

  if (!invoice.currency) {
    warnings.push({
      field: 'currency',
      message: 'Currency is not specified',
      severity: 'critical'
    });
  }

  if (invoice.total === undefined || invoice.total === null) {
    warnings.push({
      field: 'total',
      message: 'Invoice total amount is missing',
      severity: 'critical'
    });
  }

  if (invoice.vendor_requires_po && (!invoice.po_numbers_cached || invoice.po_numbers_cached.length === 0)) {
    warnings.push({
      field: 'purchase_order',
      message: 'Purchase order is required but not attached',
      severity: 'error'
    });
  }

  return warnings.length > 0 ? warnings : null;
};
