// Mock Invoice Service - Baseline Approach for Xelix Connect 2025 Demo
//
// This service provides 3 baseline mock invoices for testing and development.
// Demo-specific invoices will be added iteratively based on demo scenarios.
//
// REFACTORED: 2025-01-22 for Xelix Connect 2025 demo showcase
// Previous version with 49 invoices archived in mockInvoiceService.archive.ts
// Documentation: MOCK_INVOICES_ARCHIVE.md

import { UnifiedInvoice } from '@/types/invoice';
import { enrichInvoiceWithDemoData } from './invoiceDataService';

// Type alias for backward compatibility
type Invoice = Partial<UnifiedInvoice>;

// ============================================================================
// BASELINE INVOICE GENERATORS
// ============================================================================

/**
 * Generate 3 baseline mock invoices for testing and basic demonstration:
 * 1. baseline-po-1: Clean PO invoice with matching PO
 * 2. baseline-nonpo-1: Simple non-PO workflow
 * 3. baseline-matched-1: Successfully processed invoice (appears in "All" tab)
 */
export const generateBaselineInvoices = (): Invoice[] => {
  const now = new Date();
  const mockInvoices: Invoice[] = [];

  // ========================================================================
  // BASELINE PO INVOICE
  // ========================================================================
  const baselinePODate = new Date(now);
  baselinePODate.setDate(baselinePODate.getDate() - 5); // Created 5 days ago
  const baselinePODueDate = new Date(baselinePODate);
  baselinePODueDate.setDate(baselinePODueDate.getDate() + 30); // Due in 25 days

  const baselinePOLines = [
    {
      id: 'line-baseline-po-1',
      line_no: 1,
      description: 'Professional Services - IT Consulting',
      qty: 40,
      uom: 'Hours',
      unit_price: 125.00,
      net_amount: 5000.00,
      line_total: 5000.00,
      po_line_id: 'po-line-9001-1',
      gr_line_id: null,
      ses_line_id: null
    },
    {
      id: 'line-baseline-po-2',
      line_no: 2,
      description: 'Software License - Annual Subscription',
      qty: 10,
      uom: 'License',
      unit_price: 200.00,
      net_amount: 2000.00,
      line_total: 2000.00,
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
    invoice_number: '',
    vendor_name_snapshot: 'TechSupply Solutions Ltd',
    vendor_id: 'VND-1001',
    invoice_date: baselinePODate.toISOString().split('T')[0],
    due_date: baselinePODueDate.toISOString().split('T')[0],
    currency: 'GBP',
    subtotal: baselinePOSubtotal,
    tax_total: baselinePOTax,
    tax_rate_percent: 20,
    total: baselinePOTotal,
    status: 'needs_info', // Exception status to appear in PO tab
    match_status: 'matched', // Perfect 2-way PO match
    type: 'PO',
    vendor_requires_po: true,
    vendor_is_verified: true,
    approval_status: 'pending',
    po_numbers_cached: ['PO-2025-9001'],
    gr_numbers: [],
    docType: 'Invoice',
    issues: ['Missing Field'],
    created_at: baselinePODate.toISOString(),
    updated_at: baselinePODate.toISOString(),
    data_ingestion_date: baselinePODate.toISOString().split('T')[0],
    lines: baselinePOLines,
    invoice_lines: baselinePOLines,
    // OCR extraction results with AI candidate suggestion
    ocr_extractions: {
      invoice_number: {
        value: null, // System didn't capture it
        confidence: 0.0,
        candidates: [
          {
            value: 'INV-2025-0123',
            confidence: 0.78,
            source: 'Claude Vision',
            reason: 'Found a close match in document header area above company logo'
          }
        ]
      },
      job_number: {
        value: null, // Custom field - not detected automatically
        confidence: 0.0,
        candidates: [] // Empty - AI doesn't know where to look yet
      }
    },
    // Display configuration for compact layout
    display_config: {
      template: 'compact',
      interactiveFields: ['invoice_number', 'job_number'], // Enable AI suggestions for these fields
      layout: {
        invoiceNumberPlacement: 'above-logo',
        showInvoiceNumberLabel: false
      }
    }
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

  mockInvoices.push({
    id: 'baseline-nonpo-1',
    invoice_number: 'PIT-250103001',
    vendor_name_snapshot: 'Professional IT Services',
    vendor_id: 'VND-2001',
    invoice_date: baselineNonPODate.toISOString().split('T')[0],
    due_date: baselineNonPODueDate.toISOString().split('T')[0],
    currency: 'USD',
    subtotal: baselineNonPOSubtotal,
    tax_total: baselineNonPOTax,
    tax_rate_percent: 20,
    total: baselineNonPOTotal,
    status: 'needs_info', // Exception status to appear in Non-PO tab
    match_status: 'matched', // Non-PO doesn't require matching
    type: 'Non-PO',
    vendor_requires_po: false,
    vendor_is_verified: true,
    approval_status: 'pending',
    po_numbers_cached: [],
    gr_numbers: [],
    docType: 'Invoice',
    created_at: baselineNonPODate.toISOString(),
    updated_at: baselineNonPODate.toISOString(),
    data_ingestion_date: baselineNonPODate.toISOString().split('T')[0],
    lines: baselineNonPOLines,
    invoice_lines: baselineNonPOLines
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
    currency: 'USD',
    subtotal: baselineMatchedSubtotal,
    tax_total: baselineMatchedTax,
    tax_rate_percent: 20,
    total: baselineMatchedTotal,
    status: 'approved', // Successfully processed
    match_status: 'matched',
    type: 'PO',
    vendor_requires_po: true,
    vendor_is_verified: true,
    approval_status: 'approved',
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
  // BASELINE PO INVOICE #2 - WITH ONE LINE ITEM MISMATCH
  // ========================================================================
  const baselinePO2Date = new Date(now);
  baselinePO2Date.setDate(baselinePO2Date.getDate() - 7); // Created 7 days ago
  const baselinePO2DueDate = new Date(baselinePO2Date);
  baselinePO2DueDate.setDate(baselinePO2DueDate.getDate() + 30); // Due in 23 days

  const baselinePO2Lines = [
    {
      id: 'line-baseline-po2-1',
      line_no: 1,
      description: 'Hardware Equipment - Server Components',
      qty: 25,
      uom: 'Units',
      unit_price: 80.00,
      net_amount: 2000.00,
      line_total: 2000.00,
      po_line_id: 'po-line-9010-1',
      gr_line_id: null,
      ses_line_id: null
    },
    {
      id: 'line-baseline-po2-2',
      line_no: 2,
      description: 'Installation Services - On-site Setup',
      qty: 20,
      uom: 'Hours',
      unit_price: 95.00,
      net_amount: 1900.00,
      line_total: 1900.00,
      po_line_id: 'po-line-9010-2',
      gr_line_id: null,
      ses_line_id: null
    },
    {
      id: 'line-baseline-po2-3',
      line_no: 3,
      description: 'Training Materials - User Guides',
      qty: 20, // MISMATCH: PO has 15, invoice has 20 (variance = 5)
      uom: 'Units',
      unit_price: 45.00,
      net_amount: 900.00,
      line_total: 900.00,
      po_line_id: 'po-line-9010-3',
      gr_line_id: null,
      ses_line_id: null
    },
    {
      id: 'line-baseline-po2-4',
      line_no: 4,
      description: 'Annual Maintenance - 12 months cover',
      qty: 12,
      uom: 'Months',
      unit_price: 200.00,
      net_amount: 2400.00,
      line_total: 2400.00,
      po_line_id: 'po-line-9010-4',
      gr_line_id: null,
      ses_line_id: null
    },
    {
      id: 'line-baseline-po2-5',
      line_no: 5,
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
        po_line_id: 'po-line-9010-5',
        po_line_no: 5,
        po_description: 'Premium pleated air filters with MERV 9 rating',
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
      description: 'Project Coordination Services',
      qty: 10,
      uom: 'Days',
      unit_price: 800.00,
      net_amount: 8000.00,
      line_total: 8000.00,
      po_line_id: 'po-line-9010-6', // Matched by system despite UOM difference
      gr_line_id: null,
      ses_line_id: null,
      // UOM conversion metadata for smart match
      uom_conversion: {
        invoice_qty: 10,
        invoice_uom: 'Days',
        po_qty: 80,
        po_uom: 'Hours',
        conversion_factor: 8,
        explanation: '8 hours per day'
      }
    }
  ];

  const baselinePO2Subtotal = 17450.00; // Updated: 2000 + 1900 + 900 + 2400 + 2250 + 8000
  const baselinePO2Tax = 3490.00; // 20% VAT
  const baselinePO2Total = 20940.00; // Updated: 17450 + 3490

  mockInvoices.push({
    id: 'baseline-po-2',
    invoice_number: 'INV-2025-0124',
    vendor_name_snapshot: 'TechSupply Solutions Ltd',
    vendor_id: 'VND-1001',
    vendor_tax_id_snapshot: 'TAX-VND-1001',
    invoice_date: baselinePO2Date.toISOString().split('T')[0],
    due_date: baselinePO2DueDate.toISOString().split('T')[0],
    currency: 'GBP',
    subtotal: baselinePO2Subtotal,
    tax_total: baselinePO2Tax,
    tax_rate_percent: 20,
    total: baselinePO2Total,
    status: 'needs_info', // Exception status (quantity mismatch)
    match_status: 'variance', // Has variance on line 3
    type: 'PO',
    vendor_requires_po: true,
    vendor_is_verified: true,
    approval_status: 'pending',
    po_numbers_cached: ['PO-2025-9010'],
    gr_numbers: [],
    docType: 'Invoice',
    issues: ['Line Item Variance'],
    created_at: baselinePO2Date.toISOString(),
    updated_at: baselinePO2Date.toISOString(),
    data_ingestion_date: baselinePO2Date.toISOString().split('T')[0],
    lines: baselinePO2Lines,
    invoice_lines: baselinePO2Lines
  } as Invoice);

  // ========================================================================
  // BASELINE PO INVOICE #3 - PERFECT MATCH BUT BANK DETAILS EXCEPTION
  // ========================================================================
  const baselinePOBankDate = new Date(now);
  baselinePOBankDate.setDate(baselinePOBankDate.getDate() - 4); // Created 4 days ago
  const baselinePOBankDueDate = new Date(baselinePOBankDate);
  baselinePOBankDueDate.setDate(baselinePOBankDueDate.getDate() + 30); // Due in 26 days

  const baselinePOBankLines = [
    {
      id: 'line-baseline-po-bank-1',
      line_no: 1,
      description: 'Industrial Pump Model XL-500',
      qty: 5,
      uom: 'EA',
      unit_price: 2400.00,
      net_amount: 12000.00,
      line_total: 12000.00,
      po_line_id: 'po-line-7755-1',
      gr_line_id: null,
      ses_line_id: null
    },
    {
      id: 'line-baseline-po-bank-2',
      line_no: 2,
      description: 'Hydraulic Valve Set - Premium',
      qty: 10,
      uom: 'EA',
      unit_price: 350.00,
      net_amount: 3500.00,
      line_total: 3500.00,
      po_line_id: 'po-line-7755-2',
      gr_line_id: null,
      ses_line_id: null
    }
  ];

  const baselinePOBankSubtotal = 15500.00;
  const baselinePOBankTax = 3100.00; // 20% VAT
  const baselinePOBankTotal = 18600.00;

  mockInvoices.push({
    id: 'baseline-po-bank-1',
    invoice_number: 'IEC-2025-5678',
    job_number: 'JOB-2025-445',
    vendor_name_snapshot: 'Industrial Equipment Corp',
    vendor_id: 'VND-4001',
    vendor_tax_id_snapshot: 'TAX-VND-4001',
    invoice_date: baselinePOBankDate.toISOString().split('T')[0],
    due_date: baselinePOBankDueDate.toISOString().split('T')[0],
    currency: 'USD',
    subtotal: baselinePOBankSubtotal,
    tax_total: baselinePOBankTax,
    tax_rate_percent: 20,
    total: baselinePOBankTotal,
    status: 'needs_info', // Exception status (bank details change)
    match_status: 'exception', // Exception due to bank details only
    type: 'PO',
    vendor_requires_po: true,
    vendor_is_verified: true,
    approval_status: 'pending',
    po_numbers_cached: ['PO-2025-7755'],
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
      bank_name: 'First National Bank',
      account_name: 'Industrial Equipment Corp',
      account_number: '****1234',
      routing_number: '123456789',
    },
    // Bank details exception - account changed
    validation_warnings: [{
      type: 'bank_details_change',
      category: 'risk',
      field: 'payment_bank_details',
      message: 'Bank account changed since last invoice',
      severity: 'error',
      old_account: '****5678',
      new_account: '****1234'
    }],
    // Auto-corrections for fields that were mixed up on scanned document
    auto_corrections: [
      {
        field: 'invoice_number',
        original_value: 'PO-2025-7755',
        corrected_value: 'IEC-2025-5678',
        reason: 'Invoice and PO numbers were swapped on the scanned document. Auto-corrected based on detected numbering patterns.',
        vendor_name: 'Industrial Equipment Corp',
        document_type: 'invoice',
        recent_documents: [
          { number: 'IEC-2025-5676', date: 'Oct 15, 2025', amount: '$2,450.00' },
          { number: 'IEC-2025-5677', date: 'Oct 17, 2025', amount: '$1,890.00' },
          { number: 'IEC-2025-5678', date: 'Oct 19, 2025', amount: '$2,400.00', is_current: true }
        ]
      },
      {
        field: 'po_numbers_cached',
        original_value: 'IEC-2025-5678',
        corrected_value: 'PO-2025-7755',
        reason: 'Invoice and PO numbers were swapped on the scanned document. Auto-corrected based on detected numbering patterns.',
        vendor_name: 'Industrial Equipment Corp',
        document_type: 'po',
        recent_documents: [
          { number: 'PO-2025-7753', date: 'Oct 12, 2025', amount: '$3,200.00' },
          { number: 'PO-2025-7754', date: 'Oct 16, 2025', amount: '$1,950.00' },
          { number: 'PO-2025-7755', date: 'Oct 18, 2025', amount: '$2,520.00', is_current: true }
        ]
      }
    ]
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
      qty: 10,
      uom: 'RM',
      unit_price: 45.00,
      net_amount: 450.00,
      line_total: 450.00,
      po_line_id: null, // No PO match
      gr_line_id: null,
      ses_line_id: null
    },
    {
      id: 'line-missing-po-2',
      line_no: 2,
      description: 'Laser Printer Toner Cartridge, Black, High Yield',
      qty: 5,
      uom: 'EA',
      unit_price: 89.00,
      net_amount: 445.00,
      line_total: 445.00,
      po_line_id: null, // No PO match
      gr_line_id: null,
      ses_line_id: null
    },
    {
      id: 'line-missing-po-3',
      line_no: 3,
      description: 'Manila File Folders, Letter Size, Box of 100',
      qty: 3,
      uom: 'BX',
      unit_price: 18.50,
      net_amount: 55.50,
      line_total: 55.50,
      po_line_id: null, // No PO match
      gr_line_id: null,
      ses_line_id: null
    },
    {
      id: 'line-missing-po-4',
      line_no: 4,
      description: 'Ballpoint Pens, Black, Medium Point, Box of 12',
      qty: 8,
      uom: 'BX',
      unit_price: 6.25,
      net_amount: 50.00,
      line_total: 50.00,
      po_line_id: null, // No PO match
      gr_line_id: null,
      ses_line_id: null
    }
  ];

  const missingPOSubtotal = 1000.50;
  const missingPOTax = 80.04; // 8% sales tax
  const missingPOTotal = 1080.54;

  mockInvoices.push({
    id: 'missing-po-1',
    invoice_number: 'POS-2025-8842',
    job_number: 'JOB-2025-450',
    vendor_name_snapshot: 'Premier Office Supplies',
    vendor_id: 'VND-5002',
    vendor_tax_id_snapshot: 'TAX-VND-5002',
    invoice_date: missingPODate.toISOString().split('T')[0],
    due_date: missingPODueDate.toISOString().split('T')[0],
    currency: 'USD',
    subtotal: missingPOSubtotal,
    tax_total: missingPOTax,
    tax_rate_percent: 8,
    total: missingPOTotal,
    status: 'needs_info', // Missing required PO field
    match_status: 'pending', // Awaiting PO assignment
    type: 'PO',
    vendor_requires_po: true, // This vendor requires PO
    vendor_is_verified: true,
    approval_status: 'pending',
    po_numbers_cached: [], // MISSING - needs to be added
    po_id: null, // MISSING
    gr_numbers: [],
    docType: 'Invoice',
    issues: ['Missing PO'],
    created_at: missingPODate.toISOString(),
    updated_at: missingPODate.toISOString(),
    data_ingestion_date: missingPODate.toISOString().split('T')[0],
    lines: missingPOLines,
    invoice_lines: missingPOLines,
    payment_method: 'bank_transfer',
    payment_bank_details: {
      bank_name: 'Commerce Bank',
      account_name: 'Premier Office Supplies',
      account_number: '****9876',
      routing_number: '987654321',
    },
    // Validation warning for missing PO
    validation_warnings: [{
      type: 'missing_po',
      category: 'compliance',
      field: 'po_numbers_cached',
      message: 'PO number required - vendor requires PO for all invoices',
      severity: 'error'
    }],
    // Close match AI suggestion for PO
    close_match_po: {
      po_number: 'PO-2025-8901',
      confidence: 0.89,
      matching_factors: {
        vendor_match: true,
        date_proximity_days: 3,      // PO created Oct 18, invoice Oct 21
        line_items_overlap: 4,        // All 4 invoice items match PO
      },
      po_summary: {
        total: 1055.00,               // Slightly different from invoice $1080.54
        created_date: '2025-10-18',
        vendor_name: 'Premier Office Supplies',
        line_count: 6                 // PO has 2 extra items
      }
    }
  } as Invoice);

  // Enrich all invoices with demo data using centralized service
  return mockInvoices.map(enrichInvoiceWithDemoData);
};

// ============================================================================
// SERVICE FUNCTIONS
// ============================================================================

const USE_MOCK_DATA = process.env.USE_MOCK_DATA !== 'false'; // Default to true
const DEBUG_MOCK = process.env.DEBUG_MOCK === 'true';

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
  const mockPrefixes = ['baseline-', 'missing-po-'];
  const isMock = mockPrefixes.some(prefix => id.startsWith(prefix));

  if (DEBUG_MOCK) {
    console.log('[MockService] Mock prefixes:', mockPrefixes);
    console.log('[MockService] Is mock result:', isMock);
  }

  return isMock;
};

/**
 * Get all mock invoices (currently just 3 baseline invoices)
 * NOTE: All invoices are transformed through transformToFullInvoice to ensure
 * vendor snapshot fields, payment fields, and other enriched data are populated
 */
export const getAllMockInvoices = (): Invoice[] => {
  const allMocks = generateBaselineInvoices();
  console.log('[MockService] Total mock invoices:', allMocks.length);

  // Transform each invoice to ensure all fields are properly enriched
  const enrichedMocks = allMocks.map(invoice => transformToFullInvoice(invoice));

  return enrichedMocks;
};

/**
 * Get a specific mock invoice by ID
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
    return transformToFullInvoice(invoice);
  } catch (error) {
    console.error('[MockService] Error getting mock invoice:', error);
    return null;
  }
};

/**
 * Generate mock PO comparison data for mock invoices with POs
 */
export const getMockPoComparisonData = (invoiceId: string): any | null => {
  if (!isMockInvoice(invoiceId)) {
    return null;
  }

  const invoice = getMockInvoiceById(invoiceId);
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

  // Calculate PO total
  const poTotal = poLines.reduce((sum: number, line: any) =>
    sum + (line.qty_ordered * line.unit_price), 0);

  const poData = {
    po_id: `po-${invoiceId}`,
    po_number: poNumber,
    vendor_id: invoice.vendor_id,
    currency: invoice.currency || 'USD',
    po_status: 'approved',
    expected_match_rule: '3-way',
    subtotal: poTotal,
    tax_total: poTotal * 0.2,
    total: poTotal * 1.2,
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

    const qtyVariance = poLine ? invLine.qty - poLine.qty_ordered : 0;
    const priceVariance = poLine ? invLine.unit_price - poLine.unit_price : 0;

    return {
      id: `match-${index + 1}`,
      invoice_line_id: invLine.id || `line-${index + 1}`,
      matched_po_line_id: poLine?.id || null,
      matched_gr_line_id: null,
      qty_variance: qtyVariance,
      price_variance: priceVariance,
      amount_variance: poLine ? (invLine.line_total || 0) - (poLine.qty_ordered * poLine.unit_price) : 0,
      within_tolerance: poLine ? (Math.abs(qtyVariance) < 1 && Math.abs(priceVariance) < 10) : false,
      explanation_code: poLine ? (Math.abs(qtyVariance) > 1 ? 'QTY_MISMATCH' : Math.abs(priceVariance) > 10 ? 'PRICE_MISMATCH' : null) : 'NO_PO_LINE',
      po_line_no: poLine?.line_no || null,
      po_description: poLine?.description || null,
      po_qty: poLine?.qty_ordered || null,
      po_unit_price: poLine?.unit_price || null,
      po_uom: poLine?.uom || null,
      gr_qty_received: null
    };
  });

  return {
    invoice: {
      id: invoice.id,
      invoice_number: invoice.invoice_number,
      po_numbers_cached: invoice.po_numbers_cached,
      lines: invoiceLines
    },
    poData: poData,
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

      return {
        invoice: invLine,
        po: poLine || null,
        gr: null,
        matchResult: matchResult,
        hasVariance: matchResult && !matchResult.within_tolerance,
        status: poLine ? (matchResult.within_tolerance ? 'matched' : 'variance') : 'no_po_line'
      };
    }),
    unmatchedPoLines: []
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
  const taxRate = 0.20; // 20% VAT
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
    vendor_address_snapshot: invoice.vendor_name_snapshot
      ? `123 Business Street, Suite 100, Business City, BC 12345`
      : undefined,
    invoice_date: invoice.invoice_date || 'Date not provided',
    currency: invoice.currency || 'USD',
    subtotal: isNegative ? -subtotal : subtotal,
    tax_total: isNegative ? -taxTotal : taxTotal,
    tax_rate_percent: hasTotal ? taxRate * 100 : undefined,
    shipping_total: 0,
    other_charges_total: 0,
    discount_total: 0,
    total: hasTotal ? invoice.total : undefined,
    dueStatus: dueStatus,
    payment_terms_id: 'NET30',
    terms_text: 'Net 30 days',
    assigned_to_name: invoice.approver || null,
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
      po_numbers_cached: invoice.po_numbers_cached?.length > 0 ? 0.92 : 0,
      job_number: 0, // Custom field - not found initially

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
      ledger: invoice.ledger && invoice.ledger.trim() !== '' ? 0.85 : 0,
      cost_center: invoice.cost_center && invoice.cost_center.trim() !== '' ? 0.87 : 0,
      gl_code: invoice.gl_code && invoice.gl_code.trim() !== '' ? 0.86 : 0,
      department: invoice.department && invoice.department.trim() !== '' ? 0.84 : 0
    } : {},
    is_manually_edited: {},
    payment_method: 'bank_transfer',
    payment_bank_details: invoice.payment_bank_details || (invoice.vendor_name_snapshot ? {
      bank_name: 'First National Bank',
      account_name: invoice.vendor_name_snapshot,
      account_number: '****1234',
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
