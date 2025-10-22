// ============================================================================
// ARCHIVED MOCK INVOICE SERVICE
// ============================================================================
//
// This file contains the ORIGINAL 8 generator functions that created 49 mock
// invoices before the refactoring to a baseline approach for Xelix Connect 2025.
//
// **DO NOT IMPORT OR USE THIS FILE** - It exists purely as a reference.
//
// For current invoice metadata, see: MOCK_INVOICES_ARCHIVE.md
// For active mock service, see: mockInvoiceService.ts
//
// Archived on: 2025-01-22
// Original total invoices: 49
// Original generators: 8
//
// ============================================================================

import { UnifiedInvoice } from '@/types/invoice';
import { getDivision, enrichInvoiceWithDemoData } from './invoiceDataService';
import { seededRandom } from './mockDataConfig';

// Type alias for backward compatibility
type Invoice = Partial<UnifiedInvoice>;

// ============================================================================
// VENDOR-SPECIFIC INVOICE NUMBER GENERATOR
// ============================================================================

/**
 * Generate realistic, vendor-specific invoice numbers
 * Each vendor has their own unique numbering pattern for authenticity
 *
 * @param vendorName - Vendor company name
 * @param index - Sequential number for this vendor
 * @param date - Optional date for date-based numbering
 * @returns Vendor-specific invoice number
 */
function generateVendorInvoiceNumber(vendorName: string | null | undefined, index: number, date?: Date): string {
  // Default for missing vendor
  if (!vendorName) {
    return `INV-UNKNOWN-${String(index).padStart(4, '0')}`;
  }

  const vendor = vendorName.toLowerCase();
  const year = date ? date.getFullYear() : 2025;
  const shortYear = String(year).slice(-2);
  const month = date ? String(date.getMonth() + 1).padStart(2, '0') : '01';
  const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const monthName = date ? monthNames[date.getMonth()] : 'JAN';

  // Tech/Software Companies - modern formats with prefixes
  if (vendor.includes('tech') || vendor.includes('software') || vendor.includes('digital') || vendor.includes('data')) {
    if (vendor.includes('supply')) {
      return `TS-${year}-${String(index).padStart(6, '0')}`; // TechSupply format
    }
    if (vendor.includes('solutions')) {
      return `TECH-INV-${shortYear}-${String(index).padStart(4, '0')}`; // Tech Solutions format
    }
    if (vendor.includes('components')) {
      return `TC${shortYear}${String(index).padStart(5, '0')}`; // Technical Components compact
    }
    if (vendor.includes('data')) {
      return `DC-${year}/Q${Math.ceil((date?.getMonth() || 0) / 3)}/${String(index).padStart(3, '0')}`; // DataCore quarterly
    }
    if (vendor.includes('cloud')) {
      return `CW-${year}-${String(index).padStart(5, '0')}`; // CloudWave format
    }
    return `TECH-${shortYear}${String(index).padStart(6, '0')}`; // Generic tech
  }

  // Industrial/Manufacturing - structured codes with categories
  if (vendor.includes('industrial') || vendor.includes('manufacturing') || vendor.includes('parts') || vendor.includes('equipment')) {
    if (vendor.includes('global')) {
      return `GIP-${year}-A-${String(index).padStart(4, '0')}`; // Global Industrial Parts with category
    }
    if (vendor.includes('equipment')) {
      return `IEQ/${year}/${String(index).padStart(5, '0')}`; // Industrial Equipment with slashes
    }
    return `MFG-INV-${year}-${String(index).padStart(4, '0')}`; // Generic manufacturing
  }

  // Services/Professional - varied formats
  if (vendor.includes('services') || vendor.includes('professional') || vendor.includes('solutions')) {
    if (vendor.includes('global')) {
      return `GSI-${year}-${String(index).padStart(5, '0')}`; // Global Services Inc
    }
    if (vendor.includes('professional') && vendor.includes('it')) {
      return `PIT-${shortYear}${month}${String(index).padStart(3, '0')}`; // Professional IT Services date-based
    }
    if (vendor.includes('finance')) {
      return `FIN-${year}/INV/${String(index).padStart(4, '0')}`; // Finance Solutions with slashes
    }
    if (vendor.includes('budget')) {
      return `BS-${year}-Q${Math.ceil((date?.getMonth() || 0) / 3)}-${String(index).padStart(4, '0')}`; // Budget Systems quarterly
    }
    return `SRV-${year}-${String(index).padStart(5, '0')}`; // Generic services
  }

  // Utilities/Rent/Insurance - month-based numbering
  if (vendor.includes('electric') || vendor.includes('power') || vendor.includes('utility')) {
    return `ELEC-${year}-${monthName}-${String(index).padStart(3, '0')}`; // City Electric month-based
  }
  if (vendor.includes('property') || vendor.includes('commercial') && vendor.includes('management')) {
    return `PROP-${year}-${String(index).padStart(3, '0')}-LOC`; // Property Management with location suffix
  }
  if (vendor.includes('insurance')) {
    return `INS-${year}-${String(index).padStart(4, '0')}`; // Business Insurance simple
  }

  // Supply/Office - traditional formats
  if (vendor.includes('supplies') || vendor.includes('office')) {
    return `SUP-${String(index).padStart(7, '0')}`; // Office Supplies Direct simple sequential
  }
  if (vendor.includes('maintenance')) {
    return `MNT-${year}-${String(index).padStart(5, '0')}`; // Maintenance Pro
  }

  // Corp/Large enterprises - formal structured
  if (vendor.includes('corp') || vendor.includes('inc')) {
    if (vendor.includes('mega')) {
      return `MC${year}${String(index).padStart(6, '0')}`; // MegaCorp compact
    }
    if (vendor.includes('acme')) {
      return `ACME/${year}/${String(index).padStart(5, '0')}`; // Acme with slashes
    }
    if (vendor.includes('approval')) {
      return `ATC-INV-${year}-${String(index).padStart(4, '0')}`; // ApprovalTech Corp
    }
    return `CORP-${year}-${String(index).padStart(5, '0')}`; // Generic corp
  }

  // GmbH/European - different style
  if (vendor.includes('gmbh') || vendor.includes('ag')) {
    return `DE-${year}-${String(index).padStart(6, '0')}`; // German company format
  }

  // Ltd/UK companies - GB prefix
  if (vendor.includes('ltd')) {
    if (vendor.includes('tech')) {
      return `GB-TECH-${year}/${String(index).padStart(5, '0')}`; // TechCorp Ltd
    }
    return `GB-${year}-${String(index).padStart(6, '0')}`; // Generic UK format
  }

  // Flow/Chain/Net - modern tech style
  if (vendor.includes('flow') || vendor.includes('chain') || vendor.includes('wave') || vendor.includes('net')) {
    return `${vendor.substring(0, 3).toUpperCase()}-${shortYear}${String(index).padStart(5, '0')}`; // Short prefix compact
  }

  // Build/Construction - project-based
  if (vendor.includes('build')) {
    return `BUILD-${year}-PRJ-${String(index).padStart(4, '0')}`; // BuildCo project-based
  }

  // Fallback - generic but varied
  const prefixes = ['INV', 'BILL', 'DOC', 'REF'];
  const separators = ['-', '/', '.'];
  const hashIndex = vendorName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const prefix = prefixes[hashIndex % prefixes.length];
  const separator = separators[hashIndex % separators.length];

  return `${prefix}${separator}${year}${separator}${String(index).padStart(5, '0')}`;
}

// ============================================================================
// ARCHIVED GENERATOR FUNCTIONS
// ============================================================================

// Generate mock needs-info invoices
export const generateMockNeedsInfoInvoices = (): Invoice[] => {
  const now = new Date();
  const mockInvoices: Invoice[] = [];

  // Generate 8 invoices with missing critical data - mix of PO and Non-PO types
  const missingDataScenarios = [
    // PO-type invoices (vendors that require purchase orders)
    {
      id: 'needs-info-1',
      vendor_name_snapshot: null, // Missing vendor
      vendor_id: null,
      invoice_date: null, // Also missing invoice date
      vendor_requires_po: true, // PO type invoice
      missing_field: 'vendor_and_date'
    },
    {
      id: 'needs-info-2',
      vendor_name_snapshot: 'TechSupply Solutions Ltd',
      vendor_id: null, // Missing vendor ID
      currency: null, // Also missing currency
      vendor_requires_po: true, // PO type invoice
      missing_field: 'vendor_id_and_currency'
    },
    {
      id: 'needs-info-3',
      vendor_name_snapshot: 'Industrial Equipment Co',
      vendor_id: 'VND-3249',
      currency: null, // Missing currency
      vendor_requires_po: false, // Changed to Non-PO type
      missing_field: 'currency'
    },
    {
      id: 'needs-info-4',
      vendor_name_snapshot: 'Professional IT Services',
      vendor_id: 'VND-3326',
      total: null, // Missing total amount
      vendor_requires_po: false, // Changed to Non-PO type
      missing_field: 'total'
    },
    // Non-PO type invoices (utilities, rent, insurance)
    {
      id: 'needs-info-5',
      vendor_name_snapshot: null, // Missing vendor
      vendor_id: null,
      vendor_requires_po: false, // Would be Non-PO type (utility/rent)
      missing_field: 'vendor'
    },
    {
      id: 'needs-info-6',
      vendor_name_snapshot: 'City Electric & Power',
      vendor_id: null, // Missing vendor ID
      invoice_date: null, // Missing invoice date
      vendor_requires_po: false, // Utility company, no PO required
      missing_field: 'vendor_id_and_date'
    },
    {
      id: 'needs-info-7',
      vendor_name_snapshot: 'Commercial Property Management',
      vendor_id: 'VND-4527',
      currency: null, // Missing currency
      vendor_requires_po: false, // Rent/property management, no PO
      missing_field: 'currency'
    },
    {
      id: 'needs-info-8',
      vendor_name_snapshot: 'Business Insurance Partners',
      vendor_id: null, // Missing vendor ID
      total: null, // Missing total amount
      vendor_requires_po: false, // Insurance, no PO required
      missing_field: 'vendor_id_and_total'
    },
    // Additional PO-type invoices to ensure we have 4 when PO filter is selected
    {
      id: 'needs-info-9',
      vendor_name_snapshot: 'Manufacturing Supplies Inc',
      vendor_id: 'VND-5234',
      invoice_date: null, // Missing invoice date
      vendor_requires_po: true, // PO type invoice
      missing_field: 'invoice_date'
    },
    {
      id: 'needs-info-10',
      vendor_name_snapshot: 'Technical Components Ltd',
      vendor_id: null, // Missing vendor ID
      vendor_requires_po: true, // PO type invoice
      missing_field: 'vendor_id'
    },
    // New: PO-backed invoice with missing PO, pending state (not auto rejected)
    {
      id: 'needs-info-11',
      vendor_name_snapshot: 'Global Industrial Parts',
      vendor_id: 'VND-6789',
      invoice_date: '2025-02-20',
      currency: 'USD',
      total: 8750.00,
      vendor_requires_po: true, // PO type invoice
      po_numbers_cached: [], // Missing PO
      processed_status: 'Pending', // Pending state, not auto rejected
      missing_field: 'po_number'
    }
  ];

  missingDataScenarios.forEach((scenario, index) => {
    const baseDate = new Date(now);
    baseDate.setDate(baseDate.getDate() - Math.floor(seededRandom(1000 + index) * 10)); // 0-10 days ago (deterministic)

    const dueDate = new Date(baseDate);
    dueDate.setDate(dueDate.getDate() + 30);

    // Generate mock line items
    let lines = [];
    let subtotal = 0;
    let taxAmount = 0;
    let total = 0;

    // Special handling for needs-info-1 and needs-info-2 to match the PDFs
    if (scenario.id === 'needs-info-1') {
      lines = [
        {
          id: `line-${scenario.id}-1`,
          line_no: 1,
          description: 'Professional Services - Consulting',
          qty: 1,
          uom: 'Hours',
          unit_price: 279.00,
          net_amount: 279.00,
          line_total: 279.00,
          po_line_id: null,
          gr_line_id: null,
          ses_line_id: null
        },
        {
          id: `line-${scenario.id}-2`,
          line_no: 2,
          description: 'Software License - Annual Subscription',
          qty: 5,
          uom: 'License',
          unit_price: 273.00,
          net_amount: 1365.00,
          line_total: 1365.00,
          po_line_id: null,
          gr_line_id: null,
          ses_line_id: null
        },
        {
          id: `line-${scenario.id}-3`,
          line_no: 3,
          description: 'Hardware Components - Server Equipment',
          qty: 4,
          uom: 'Units',
          unit_price: 798.00,
          net_amount: 3192.00,
          line_total: 3192.00,
          po_line_id: null,
          gr_line_id: null,
          ses_line_id: null
        }
      ];
      subtotal = 4836.00;
      const taxRate = 0.0; // No tax for this invoice
      taxAmount = 0;
      total = 4836.00;
    } else if (scenario.id === 'needs-info-2') {
      lines = [
        {
          id: `line-${scenario.id}-1`,
          line_no: 1,
          description: 'Professional Services - Consulting',
          qty: 2,
          uom: 'Hours',
          unit_price: 874.39,
          net_amount: 1748.78,
          line_total: 1748.78,
          po_line_id: null,
          gr_line_id: null,
          ses_line_id: null
        },
        {
          id: `line-${scenario.id}-2`,
          line_no: 2,
          description: 'Software License - Annual Subscription',
          qty: 9,
          uom: 'License',
          unit_price: 343.02,
          net_amount: 3087.22,
          line_total: 3087.22,
          po_line_id: null,
          gr_line_id: null,
          ses_line_id: null
        }
      ];
      subtotal = 4836.00;
      const taxRate = 0.2; // 20% tax
      taxAmount = 967.20;
      total = 5803.20;
    } else if (scenario.id === 'needs-info-11') {
      // Special handling for needs-info-11: PO-backed invoice with missing PO
      lines = [
        {
          id: `line-${scenario.id}-1`,
          line_no: 1,
          description: 'Industrial Machinery Parts - Gearbox Assembly',
          qty: 2,
          uom: 'Units',
          unit_price: 2500.00,
          net_amount: 5000.00,
          line_total: 5000.00,
          po_line_id: null,
          gr_line_id: null,
          ses_line_id: null
        },
        {
          id: `line-${scenario.id}-2`,
          line_no: 2,
          description: 'Replacement Hydraulic Cylinders',
          qty: 3,
          uom: 'Units',
          unit_price: 750.00,
          net_amount: 2250.00,
          line_total: 2250.00,
          po_line_id: null,
          gr_line_id: null,
          ses_line_id: null
        },
        {
          id: `line-${scenario.id}-3`,
          line_no: 3,
          description: 'Premium Industrial Lubricant - 55 Gallon Drum',
          qty: 1,
          uom: 'Drum',
          unit_price: 1500.00,
          net_amount: 1500.00,
          line_total: 1500.00,
          po_line_id: null,
          gr_line_id: null,
          ses_line_id: null
        }
      ];
      subtotal = 8750.00;
      const taxRate = 0.0; // No tax for this invoice
      taxAmount = 0;
      total = 8750.00;
    } else {
      // Generate random line items for other scenarios
      const numLines = 3;
      for (let j = 0; j < numLines; j++) {
        const qty = Math.floor(seededRandom(2000 + index * 10 + j) * 10 + 1);
        const unitPrice = Math.floor(seededRandom(3000 + index * 10 + j) * 2000 + 100);
        const lineTotal = qty * unitPrice;
        subtotal += lineTotal;

        lines.push({
          id: `line-${scenario.id}-${j + 1}`,
          line_no: j + 1,
          description: ['Professional Services - Consulting', 'Software License - Annual Subscription', 'Hardware Components - Server Equipment'][j],
          qty: qty,
          uom: ['Hours', 'License', 'Units'][j],
          unit_price: unitPrice,
          net_amount: lineTotal,
          line_total: lineTotal,
          po_line_id: null,
          gr_line_id: null,
          ses_line_id: null
        });
      }

      const taxRate = 0.2; // 20% tax
      taxAmount = subtotal * taxRate;
      total = subtotal + taxAmount;
    }

    // For PO-type scenarios, attach PO numbers to all except needs-info-10 and needs-info-11
    // needs-info-10 will have Missing PO status with Auto Rejected
    // needs-info-11 will have Missing PO status with Pending
    let poNumbersForNeedsInfo: string[] = [];
    if (scenario.vendor_requires_po) {
      if (scenario.id === 'needs-info-1') {
        poNumbersForNeedsInfo = [`PO-2025-${String(9001).padStart(4, '0')}`];
      } else if (scenario.id === 'needs-info-2') {
        poNumbersForNeedsInfo = [`PO-2025-${String(9002).padStart(4, '0')}`];
      } else if (scenario.id === 'needs-info-9') {
        poNumbersForNeedsInfo = [`PO-2025-${String(9009).padStart(4, '0')}`];
      }
      // needs-info-10 and needs-info-11 intentionally have NO PO number
    }

    // Set processed_status based on the scenario
    let processedStatus = 'Pending';
    if (scenario.id === 'needs-info-10' && scenario.vendor_requires_po) {
      processedStatus = 'Auto Rejected'; // Auto rejected for needs-info-10
    } else if (scenario.id === 'needs-info-11') {
      processedStatus = 'Pending'; // Pending for needs-info-11 (explicitly set from scenario)
    }

    // Generate vendor-specific invoice number
    const invoiceNumber = generateVendorInvoiceNumber(scenario.vendor_name_snapshot, index + 1, baseDate);

    // Generate data ingestion date (0-3 days after creation)
    const ingestionDate = new Date(baseDate);
    ingestionDate.setDate(ingestionDate.getDate() + Math.floor(seededRandom(4000 + index) * 4));

    mockInvoices.push({
      id: scenario.id,
      invoice_number: invoiceNumber,
      vendor_name_snapshot: scenario.vendor_name_snapshot || undefined,
      vendor_id: scenario.vendor_id || undefined,
      division: scenario.vendor_name_snapshot ? getDivision(scenario.vendor_name_snapshot) : 'Unknown',
      invoice_date: scenario.invoice_date === null ? undefined : baseDate.toISOString().split('T')[0],
      due_date: dueDate.toISOString().split('T')[0],
      currency: scenario.currency !== null ? (scenario.currency || 'GBP') : undefined,
      subtotal: subtotal,
      tax_total: taxAmount,
      tax_rate_percent: subtotal > 0 ? (taxAmount / subtotal) * 100 : 0,
      total: scenario.total !== null ? total : undefined,
      status: 'needs_info', // New status for missing data
      match_status: 'pending',
      type: scenario.vendor_requires_po ? 'PO' : 'Non-PO', // Add type field based on vendor_requires_po
      vendor_requires_po: scenario.vendor_requires_po,
      vendor_is_verified: false,
      approval_status: 'pending',
      processed_status: processedStatus, // Add processed status
      po_numbers_cached: poNumbersForNeedsInfo,
      gr_numbers: [],
      docType: 'Invoice',
      issues: ['Missing Fields'], // Add Missing Fields issue for needs-info invoices
      created_at: baseDate.toISOString(),
      updated_at: baseDate.toISOString(),
      data_ingestion_date: ingestionDate.toISOString().split('T')[0],
      lines: lines,
      invoice_lines: lines // Add both properties for compatibility
    } as Invoice);
  });

  // Enrich all invoices with demo data using centralized service
  return mockInvoices.map(enrichInvoiceWithDemoData);
};

// Generate mock blocked invoices
export const generateMockBlockedInvoices = (): Invoice[] => {
  const now = new Date();
  const vendors = [
    'TechSupply Co', 'Global Services Inc', 'Industrial Parts Ltd', 'Office Supplies Direct',
    'Maintenance Pro', 'Software Solutions GmbH', 'DataCore Systems', 'CloudWave Technologies'
  ];
  const mockInvoices: Invoice[] = [];

  // Generate 12 mismatched/on-hold invoices highlighting diverse issues (no Missing PO here)
  for (let i = 1; i <= 12; i++) {
    const invoiceDate = new Date(now);
    let dueDate;

    // Create varied aging brackets for visual demonstration
    // Make some blocked invoices also overdue (for PO invoices with both exceptions AND payment timing issues)
    if (i === 1 || i === 2) {
      // Invoice 1-2: Overdue PO invoices with exceptions (5 days overdue)
      invoiceDate.setDate(invoiceDate.getDate() - 35);
      dueDate = new Date(invoiceDate);
      dueDate.setDate(dueDate.getDate() + 30); // Due 5 days ago
    } else if (i === 3 || i === 4) {
      // Invoice 3-4: Due soon with exceptions (due in 2 days)
      invoiceDate.setDate(invoiceDate.getDate() - 28);
      dueDate = new Date(invoiceDate);
      dueDate.setDate(dueDate.getDate() + 30); // Due in 2 days
    } else if (i === 10) {
      // Invoice 10: 1-30 days overdue bracket (due ~15 days ago)
      invoiceDate.setDate(invoiceDate.getDate() - 60); // Invoice from 60 days ago
      dueDate = new Date(invoiceDate);
      dueDate.setDate(dueDate.getDate() + 45); // Due 15 days ago
    } else if (i === 11) {
      // Invoice 11: 1-30 days overdue bracket (due ~25 days ago)
      invoiceDate.setDate(invoiceDate.getDate() - 70); // Invoice from 70 days ago
      dueDate = new Date(invoiceDate);
      dueDate.setDate(dueDate.getDate() + 45); // Due 25 days ago
    } else if (i === 12) {
      // Invoice 12: 31-60 days overdue bracket (due ~45 days ago)
      invoiceDate.setDate(invoiceDate.getDate() - 90); // Invoice from 90 days ago
      dueDate = new Date(invoiceDate);
      dueDate.setDate(dueDate.getDate() + 45); // Due 45 days ago
    } else {
      // Invoices 5-9: Current or very recent (most exceptions are caught quickly)
      invoiceDate.setDate(invoiceDate.getDate() - Math.floor(seededRandom(5000 + i) * 25 + 5)); // 5-30 days ago (deterministic)
      dueDate = new Date(invoiceDate);
      dueDate.setDate(dueDate.getDate() + 30); // Due in future or very recent
    }

    const vendorName = vendors[(i - 1) % vendors.length];

    // Alternate PO and Non-PO invoices
    const isPO = i % 2 === 1 || i > 8; // ensure last 4 are PO-only

    // Choose a mismatch type for variety
    const mismatchTypes = ['mismatch', 'over_tolerance', 'quantity_mismatch', 'amount_mismatch', 'line_mismatch'];
    const match_status = mismatchTypes[i % mismatchTypes.length];

    // Build PO/GR presence (PO invoices should have a PO attached in this stage)
    const poNumbers = isPO ? [`PO-2025-${String(2000 + i).padStart(4, '0')}`] : [];
    const grNumbers = isPO && i % 3 !== 0 ? [`GR-2025-${String(3000 + i).padStart(4, '0')}`] : [];

    // Generate vendor-specific invoice number
    const invoiceNumber = generateVendorInvoiceNumber(vendorName, i, invoiceDate);

    // Generate data ingestion date (0-3 days after creation)
    const ingestionDate = new Date(invoiceDate);
    ingestionDate.setDate(ingestionDate.getDate() + Math.floor(seededRandom(6000 + i) * 4));

    const base: Invoice = {
      id: `blocked-${i}`,
      invoice_number: invoiceNumber,
      vendor_name_snapshot: vendorName,
      vendor_id: `VND-${String(1000 + i).padStart(4, '0')}`,
      division: getDivision(vendorName),
      invoice_date: invoiceDate.toISOString().split('T')[0],
      due_date: dueDate.toISOString().split('T')[0],
      currency: i % 4 === 0 ? 'EUR' : 'USD',
      total: Math.floor(seededRandom(7000 + i) * 80000 + 10000),
      status: isPO ? 'requires_review' : 'blocked',
      match_status,
      type: isPO ? 'PO' : 'Non-PO', // Explicitly set type field
      vendor_requires_po: isPO,
      vendor_is_verified: i % 5 !== 0, // some not verified
      approval_status: 'pending',
      po_numbers_cached: poNumbers,
      gr_numbers: grNumbers,
      docType: 'Invoice',
      created_at: invoiceDate.toISOString(),
      updated_at: invoiceDate.toISOString(),
      data_ingestion_date: ingestionDate.toISOString().split('T')[0],
      payment_method: isPO ? 'bank_transfer' : null,
      payment_bank_details: isPO ? { bank_name: 'First National Bank' } : null,
      tax_rate_percent: i % 6 === 0 ? null : 20
    };

    // Inject specific PO-only issues for the last 4 records to showcase new use cases
    if (i === 9) base.issues = ['Unit Price Mismatch'];
    if (i === 10) base.issues = ['UoM Mismatch'];
    if (i === 11) base.issues = ['Tax Rate Mismatch', 'Price Tolerance'];
    if (i === 12) base.issues = ['Unapproved Change Order'];

    mockInvoices.push(base);
  }

  // Add special invoice with 20 line items (18 matched, 2 mismatched)
  const invoiceDate20 = new Date(now);
  invoiceDate20.setDate(invoiceDate20.getDate() - 10);
  const dueDate20 = new Date(invoiceDate20);
  dueDate20.setDate(dueDate20.getDate() + 30);

  // Generate 20 line items
  const lines20 = [];
  let subtotal20 = 0;

  for (let i = 1; i <= 20; i++) {
    const qty = i % 5 === 0 ? 10 : 5;
    const unitPrice = 100 + (i * 50);
    const lineTotal = qty * unitPrice;
    subtotal20 += lineTotal;

    lines20.push({
      id: `line-blocked-20-${i}`,
      line_no: i,
      description: `Product Item ${i} - High Quality Component`,
      qty: qty,
      uom: 'EA',
      unit_price: unitPrice,
      net_amount: lineTotal,
      line_total: lineTotal,
      po_line_id: `po-line-large-${i}`
    });
  }

  const taxAmount20 = subtotal20 * 0.20;
  const total20 = subtotal20 + taxAmount20;

  // Generate vendor-specific invoice number for blocked-20
  const blockedInv20Number = generateVendorInvoiceNumber('Industrial Parts Ltd', 8888, invoiceDate20);

  // Generate data ingestion date for blocked-20
  const ingestionDate20 = new Date(invoiceDate20);
  ingestionDate20.setDate(ingestionDate20.getDate() + Math.floor(seededRandom(8000) * 4));

  mockInvoices.push({
    id: 'blocked-20',
    invoice_number: blockedInv20Number,
    vendor_name_snapshot: 'Industrial Parts Ltd',
    vendor_id: 'VND-2020',
    division: 'Supply Chain',
    invoice_date: invoiceDate20.toISOString().split('T')[0],
    due_date: dueDate20.toISOString().split('T')[0],
    currency: 'USD',
    subtotal: subtotal20,
    tax_total: taxAmount20,
    tax_rate_percent: 20,
    total: total20,
    status: 'requires_review',
    match_status: 'quantity_mismatch',
    type: 'PO', // Explicitly set type field for blocked-20
    vendor_requires_po: true,
    vendor_is_verified: true,
    approval_status: 'pending',
    po_numbers_cached: ['PO-2025-8888'],
    gr_numbers: ['GR-2025-8888'],
    docType: 'Invoice',
    created_at: invoiceDate20.toISOString(),
    updated_at: invoiceDate20.toISOString(),
    data_ingestion_date: ingestionDate20.toISOString().split('T')[0],
    payment_method: 'bank_transfer',
    payment_bank_details: { bank_name: 'First National Bank' },
    lines: lines20,
    invoice_lines: lines20
  });

  // Enrich all invoices with demo data using centralized service
  return mockInvoices.map(enrichInvoiceWithDemoData);
};

// Generate mock overdue invoices
export const generateMockOverdueInvoices = (): Invoice[] => {
  const now = new Date();
  const vendors = ['TechCorp Ltd', 'BuildCo Solutions', 'SupplyCo Global', 'GlobalParts Inc', 'Acme Corp', 'DataSoft Systems', 'CloudNet Services'];
  const mockInvoices: Invoice[] = [];

  // Generate invoices for different aging buckets - OVERDUE
  const agingBuckets = [
    { count: 2, daysOverdue: 1, label: '0-30' },    // 1 day overdue (within 30)
    { count: 2, daysOverdue: 35, label: '31-60' },  // 35 days overdue
    { count: 1, daysOverdue: 65, label: '61-90' },  // 65 days overdue
    { count: 1, daysOverdue: 95, label: '90+' }     // 95 days overdue
  ];

  let invoiceCounter = 1;
  agingBuckets.forEach(bucket => {
    for (let i = 0; i < bucket.count; i++) {
      const dueDate = new Date(now);
      dueDate.setDate(dueDate.getDate() - bucket.daysOverdue); // Set as overdue

      const invoiceDate = new Date(dueDate);
      invoiceDate.setDate(invoiceDate.getDate() - 30);

      const vendorName = vendors[Math.floor(seededRandom(10000 + invoiceCounter) * vendors.length)];
      const invoiceNumber = generateVendorInvoiceNumber(vendorName, 1000 + invoiceCounter, invoiceDate);

      // Generate data ingestion date
      const ingestionDate = new Date(invoiceDate);
      ingestionDate.setDate(ingestionDate.getDate() + Math.floor(seededRandom(11000 + invoiceCounter) * 4));

      const requiresPO = seededRandom(13000 + invoiceCounter) > 0.5;
      mockInvoices.push({
        id: `mock-${invoiceCounter}`,
        invoice_number: invoiceNumber,
        vendor_name_snapshot: vendorName,
        vendor_id: `VND-${String(100 + invoiceCounter).padStart(4, '0')}`,
        division: getDivision(vendorName),
        invoice_date: invoiceDate.toISOString().split('T')[0],
        due_date: dueDate.toISOString().split('T')[0],
        currency: 'USD',
        total: Math.floor(seededRandom(12000 + invoiceCounter) * 100000 + 10000),
        status: 'overdue',
        match_status: 'matched',
        type: requiresPO ? 'PO' : 'Non-PO', // Explicitly set type field
        vendor_requires_po: requiresPO,
        vendor_is_verified: true,
        approval_status: 'approved',
        po_numbers_cached: [`PO-2024-${String(1000 + invoiceCounter).padStart(4, '0')}`],
        gr_numbers: [`GR-2024-${String(1000 + invoiceCounter).padStart(4, '0')}`],
        docType: 'Invoice',
        created_at: invoiceDate.toISOString(),
        updated_at: invoiceDate.toISOString(),
        data_ingestion_date: ingestionDate.toISOString().split('T')[0]
      });
      invoiceCounter++;
    }
  });

  // Enrich all invoices with demo data using centralized service
  return mockInvoices.map(enrichInvoiceWithDemoData);
};

// Generate mock due soon invoices
export const generateMockDueSoonInvoices = (): Invoice[] => {
  const now = new Date();
  const vendors = ['MegaCorp Industries', 'TechFlow Systems', 'SupplyChain Pro', 'LogiTech Solutions', 'DataCore', 'CloudWave', 'NetSolutions'];
  const mockInvoices: Invoice[] = [];

  // Generate invoices for different due soon buckets
  const dueSoonBuckets = [
    { count: 3, daysUntilDue: 1, label: 'Today' },     // Due today
    { count: 2, daysUntilDue: 3, label: '2-3 days' },  // Due in 3 days
    { count: 2, daysUntilDue: 6, label: '4-7 days' }   // Due in 6 days
  ];

  let invoiceCounter = 1;
  dueSoonBuckets.forEach(bucket => {
    for (let i = 0; i < bucket.count; i++) {
      const dueDate = new Date(now);
      dueDate.setDate(dueDate.getDate() + bucket.daysUntilDue); // Set as due soon

      const invoiceDate = new Date(dueDate);
      invoiceDate.setDate(invoiceDate.getDate() - 30);

      const vendorName = vendors[Math.floor(seededRandom(14000 + invoiceCounter) * vendors.length)];
      const isWithinTol = (invoiceCounter === 1 || invoiceCounter === 2);
      const isPOForThis = isWithinTol ? true : seededRandom(15000 + invoiceCounter) > 0.5;
      const invoiceNumber = generateVendorInvoiceNumber(vendorName, invoiceCounter, invoiceDate);

      // Generate data ingestion date (0-3 days after creation)
      const ingestionDate = new Date(invoiceDate);
      ingestionDate.setDate(ingestionDate.getDate() + Math.floor(seededRandom(16000 + invoiceCounter) * 4));

      mockInvoices.push({
        id: `due-${invoiceCounter}`,
        invoice_number: invoiceNumber,
        vendor_name_snapshot: vendorName,
        vendor_id: `VND-${String(200 + invoiceCounter).padStart(4, '0')}`,
        division: getDivision(vendorName),
        invoice_date: invoiceDate.toISOString().split('T')[0],
        due_date: dueDate.toISOString().split('T')[0],
        currency: 'USD',
        total: Math.floor(seededRandom(17000 + invoiceCounter) * 80000 + 5000),
        status: 'pending_payment',
        match_status: isWithinTol ? 'within_tolerance' : 'matched',
        type: isPOForThis ? 'PO' : 'Non-PO', // Explicitly set type field
        vendor_requires_po: isPOForThis,
        vendor_is_verified: true,
        approval_status: 'approved',
        po_numbers_cached: [`PO-2025-${String(invoiceCounter).padStart(4, '0')}`],
        gr_numbers: [`GR-2025-${String(invoiceCounter).padStart(4, '0')}`],
        docType: 'Invoice',
        created_at: invoiceDate.toISOString(),
        updated_at: invoiceDate.toISOString(),
        data_ingestion_date: ingestionDate.toISOString().split('T')[0]
      });
      invoiceCounter++;
    }
  });

  // Enrich all invoices with demo data using centralized service
  return mockInvoices.map(enrichInvoiceWithDemoData);
};

// Generate mock Credit Notes
export const generateMockCreditNotes = (): Invoice[] => {
  const now = new Date();
  const vendors = ['TechCorp Ltd', 'SupplyChain Pro', 'GlobalParts Inc'];
  const mockInvoices: Invoice[] = [];

  for (let i = 1; i <= 2; i++) {
    const invoiceDate = new Date(now);
    invoiceDate.setDate(invoiceDate.getDate() - Math.floor(seededRandom(18000 + i) * 15));

    const dueDate = new Date(invoiceDate);
    dueDate.setDate(dueDate.getDate() + 30);

    const vendorName = vendors[i - 1];
    // Credit notes use CN prefix but rest is vendor-specific
    const baseInvNumber = generateVendorInvoiceNumber(vendorName, i, invoiceDate);
    const creditNoteNumber = `CN-${baseInvNumber}`;

    // Generate data ingestion date (0-3 days after creation)
    const ingestionDate = new Date(invoiceDate);
    ingestionDate.setDate(ingestionDate.getDate() + Math.floor(seededRandom(19000 + i) * 4));

    mockInvoices.push({
      id: `cn-${i}`,
      invoice_number: creditNoteNumber,
      vendor_name_snapshot: vendorName,
      vendor_id: `VND-${String(500 + i).padStart(4, '0')}`,
      division: getDivision(vendorName),
      invoice_date: invoiceDate.toISOString().split('T')[0],
      due_date: dueDate.toISOString().split('T')[0],
      currency: 'USD',
      total: -Math.floor(seededRandom(20000 + i) * 5000 + 1000), // Negative amount for credit notes
      status: 'pending',
      match_status: 'matched',
      vendor_requires_po: false,
      vendor_is_verified: true,
      approval_status: 'pending',
      po_numbers_cached: [],
      gr_numbers: [],
      docType: 'Credit Note',
      created_at: invoiceDate.toISOString(),
      updated_at: invoiceDate.toISOString(),
      data_ingestion_date: ingestionDate.toISOString().split('T')[0]
    });
  }

  // Enrich all invoices with demo data using centralized service
  return mockInvoices.map(enrichInvoiceWithDemoData);
};

// Generate mock Pro Forma invoices
export const generateMockProFormaInvoices = (): Invoice[] => {
  const now = new Date();
  const vendors = ['DataCore Systems', 'CloudWave Technologies'];
  const mockInvoices: Invoice[] = [];

  for (let i = 1; i <= 2; i++) {
    const invoiceDate = new Date(now);
    invoiceDate.setDate(invoiceDate.getDate() - Math.floor(seededRandom(21000 + i) * 10));

    const dueDate = new Date(invoiceDate);
    dueDate.setDate(dueDate.getDate() + 45); // Longer payment terms for pro forma

    const vendorName = vendors[i - 1];
    // Pro forma invoices use PF prefix but rest is vendor-specific
    const baseInvNumber = generateVendorInvoiceNumber(vendorName, 6000 + i, invoiceDate);
    const proFormaNumber = `PF-${baseInvNumber}`;

    // Generate data ingestion date (0-3 days after creation)
    const ingestionDate = new Date(invoiceDate);
    ingestionDate.setDate(ingestionDate.getDate() + Math.floor(seededRandom(22000 + i) * 4));

    mockInvoices.push({
      id: `pf-${i}`,
      invoice_number: proFormaNumber,
      vendor_name_snapshot: vendorName,
      vendor_id: `VND-${String(600 + i).padStart(4, '0')}`,
      division: getDivision(vendorName),
      invoice_date: invoiceDate.toISOString().split('T')[0],
      due_date: dueDate.toISOString().split('T')[0],
      currency: 'EUR',
      total: Math.floor(seededRandom(23000 + i) * 30000 + 10000),
      status: 'requires_review',
      match_status: i === 1 ? 'amount_mismatch' : 'line_mismatch',
      vendor_requires_po: true,
      vendor_is_verified: false,
      approval_status: 'pending',
      po_numbers_cached: [`PO-2025-PF-${String(6000 + i).padStart(4, '0')}`],
      gr_numbers: [],
      docType: 'Pro Forma',
      issues: i === 1 ? ['Amount Mismatch', 'Tax Rate Mismatch'] : ['Line Items Mismatch', 'UoM Mismatch'],
      created_at: invoiceDate.toISOString(),
      updated_at: invoiceDate.toISOString(),
      data_ingestion_date: ingestionDate.toISOString().split('T')[0]
    });
  }

  // Enrich all invoices with demo data using centralized service
  return mockInvoices.map(enrichInvoiceWithDemoData);
};

// Generate mock in-approval invoices
export const generateMockInApprovalInvoices = (): Invoice[] => {
  const now = new Date();
  const vendors = ['ApprovalTech Corp', 'Finance Solutions Ltd', 'Budget Systems Inc'];
  const approvers = ['John Smith', 'Sarah Johnson', 'Michael Chen', 'Emily Davis'];
  const mockInvoices: Invoice[] = [];

  for (let i = 1; i <= 4; i++) {
    const invoiceDate = new Date(now);
    invoiceDate.setDate(invoiceDate.getDate() - Math.floor(seededRandom(24000 + i) * 15 + 5));

    const dueDate = new Date(invoiceDate);
    dueDate.setDate(dueDate.getDate() + 30);

    const vendorName = vendors[i % vendors.length];
    const invoiceNumber = generateVendorInvoiceNumber(vendorName, 7000 + i, invoiceDate);

    // Generate data ingestion date (0-3 days after creation)
    const ingestionDate = new Date(invoiceDate);
    ingestionDate.setDate(ingestionDate.getDate() + Math.floor(seededRandom(25000 + i) * 4));

    mockInvoices.push({
      id: `approval-${i}`,
      invoice_number: invoiceNumber,
      vendor_name_snapshot: vendorName,
      vendor_id: `VND-${String(700 + i).padStart(4, '0')}`,
      division: getDivision(vendorName),
      invoice_date: invoiceDate.toISOString().split('T')[0],
      due_date: dueDate.toISOString().split('T')[0],
      currency: 'USD',
      total: Math.floor(seededRandom(26000 + i) * 75000 + 15000),
      status: 'in_approval',
      match_status: 'matched',
      type: 'PO', // Explicitly set type field - all approval invoices are PO type
      vendor_requires_po: true,
      vendor_is_verified: true,
      approval_status: 'pending',
      po_numbers_cached: [`PO-2025-${String(7000 + i).padStart(4, '0')}`],
      gr_numbers: [`GR-2025-${String(7000 + i).padStart(4, '0')}`],
      docType: 'Invoice',
      approver: approvers[i % approvers.length],
      created_at: invoiceDate.toISOString(),
      updated_at: invoiceDate.toISOString(),
      data_ingestion_date: ingestionDate.toISOString().split('T')[0]
    });
  }

  // Add Non-PO invoices that require approval (e.g., utilities, rent, insurance)
  const nonPOVendors = ['City Electric & Power', 'Commercial Property Management', 'Business Insurance Partners'];
  const nonPOApprovers = ['Laura Bennett', 'Peter Collins', 'Nina Sanders'];
  for (let i = 1; i <= nonPOVendors.length; i++) {
    const invoiceDate = new Date(now);
    invoiceDate.setDate(invoiceDate.getDate() - Math.floor(seededRandom(27000 + i) * 10 + 3));

    const dueDate = new Date(invoiceDate);
    dueDate.setDate(dueDate.getDate() + 30);

    const vendorName = nonPOVendors[i - 1];
    // Non-PO approval invoices get vendor-specific numbers
    const invoiceNumber = generateVendorInvoiceNumber(vendorName, 900 + i, invoiceDate);

    // Generate data ingestion date (0-3 days after creation)
    const ingestionDate = new Date(invoiceDate);
    ingestionDate.setDate(ingestionDate.getDate() + Math.floor(seededRandom(28000 + i) * 4));

    mockInvoices.push({
      id: `approval-nonpo-${i}`,
      invoice_number: invoiceNumber,
      vendor_name_snapshot: vendorName,
      vendor_id: `VND-NP-${String(900 + i).padStart(4, '0')}`,
      division: getDivision(vendorName),
      invoice_date: invoiceDate.toISOString().split('T')[0],
      due_date: dueDate.toISOString().split('T')[0],
      currency: i % 2 === 0 ? 'EUR' : 'USD',
      total: Math.floor(seededRandom(29000 + i) * 20000 + 3000),
      status: 'in_approval',
      match_status: 'matched', // Non-PO doesn't do PO/GR matching; treat as approved ready-for-approval
      type: 'Non-PO', // Explicitly set type field
      vendor_requires_po: false,
      vendor_is_verified: true,
      approval_status: 'pending',
      po_numbers_cached: [],
      gr_numbers: [],
      docType: 'Invoice',
      approver: nonPOApprovers[i - 1],
      created_at: invoiceDate.toISOString(),
      updated_at: invoiceDate.toISOString(),
      data_ingestion_date: ingestionDate.toISOString().split('T')[0]
    });
  }

  // Enrich all invoices with demo data using centralized service
  return mockInvoices.map(enrichInvoiceWithDemoData);
};

// Generate mock archived invoices
export const generateMockArchivedInvoices = (): Invoice[] => {
  const now = new Date();
  const mockInvoices: Invoice[] = [];

  // PO invoice with missing PO - archived
  const archivedDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const archivedInvoiceNumber = generateVendorInvoiceNumber('Global Manufacturing Co.', 8001, archivedDate);

  // Generate data ingestion date (0-3 days after creation)
  const ingestionDate = new Date(archivedDate);
  ingestionDate.setDate(ingestionDate.getDate() + Math.floor(seededRandom(30000) * 4));

  mockInvoices.push({
    id: 'archived-1',
    invoice_number: archivedInvoiceNumber,
    vendor_name_snapshot: 'Global Manufacturing Co.',
    vendor_id: 'VENDOR-001',
    division: getDivision('Global Manufacturing Co.'),
    invoice_date: '2024-11-15',
    due_date: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days ago
    currency: 'USD',
    total: 15750.00,
    subtotal: 15000.00,
    tax_total: 750.00,
    tax_rate_percent: 5,
    status: 'archived',
    match_status: 'archived',
    vendor_requires_po: true,
    vendor_is_verified: true,
    po_numbers_cached: [], // Missing PO
    gr_numbers_cached: [],
    created_at: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    data_ingestion_date: ingestionDate.toISOString().split('T')[0],
    payment_method: 'Bank Transfer',
    vendor_tax_id_snapshot: 'TAX-GM-001',
    vendor_address_snapshot: '123 Manufacturing Blvd, Industrial Park, CA 90210',
    type: 'PO',
    issues: ['Missing PO'],
    lines: [
      {
        line_no: 1,
        description: 'Industrial Components Set',
        quantity: 100,
        unit_price: 150.00,
        line_total: 15000.00,
        uom: 'EA'
      }
    ]
  });

  console.log('[MockService] Generated archived invoices:', mockInvoices.length, mockInvoices);
  // Enrich all invoices with demo data using centralized service
  return mockInvoices.map(enrichInvoiceWithDemoData);
};
