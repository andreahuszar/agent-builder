// Mock Invoice Service - Provides mock invoice data for UI demonstration
// This service generates and manages mock invoices for different workflow states

interface Invoice {
  id: string;
  invoice_number: string;
  vendor_name_snapshot?: string;
  vendor_id?: string;
  division?: string;
  invoice_date?: string;
  due_date: string;
  currency?: string;
  total?: number;
  subtotal?: number;
  tax_total?: number;
  tax_rate_percent?: number;
  shipping_total?: number;
  other_charges_total?: number;
  discount_total?: number;
  status?: string;
  match_status?: string;
  vendor_requires_po?: boolean | null;
  vendor_is_verified?: boolean;
  approval_status?: string;
  po_numbers_cached?: string[];
  gr_numbers?: string[];
  gr_numbers_cached?: string[];
  docType?: string;
  created_at?: string;
  updated_at?: string;
  payment_terms_id?: string;
  terms_text?: string;
  po_id?: string | null;
  assigned_to_name?: string | null;
  ledger?: string;
  cost_center?: string;
  cost_center_name?: string;
  gl_code?: string;
  department?: string;
  accounting_notes?: string;
  ai_classification_confidence?: number | null;
  ai_classification_reasoning?: string;
  extraction_field_confidences?: Record<string, number>;
  is_manually_edited?: Record<string, boolean>;
  payment_method?: string | null;
  payment_bank_details?: any;
  lines?: any[];
  invoice_lines?: any[]; // Both lines and invoice_lines for compatibility
  poTotal?: number | null;
  validation_warnings?: any;
  attachments?: any[];
  approver?: string;
  vendor_tax_id_snapshot?: string;
  vendor_address_snapshot?: string;
  issues?: string[];
  // Synthetic fields
  type?: string;
  assignedTo?: string;
  costCentre?: string;
  exception?: string;
}

// Helper function to determine division based on vendor name
const getDivision = (vendorName: string): string => {
  if (!vendorName) return 'Unknown';
  const name = vendorName.toLowerCase();
  if (name.includes('tech') || name.includes('soft') || name.includes('data')) {
    return 'Technology';
  }
  if (name.includes('supply') || name.includes('global') || name.includes('parts')) {
    return 'Supply Chain';
  }
  if (name.includes('build') || name.includes('construct')) {
    return 'Construction';
  }
  if (name.includes('cloud') || name.includes('net') || name.includes('sys')) {
    return 'IT Services';
  }
  if (name.includes('office') || name.includes('maint')) {
    return 'Operations';
  }
  if (name.includes('electric') || name.includes('power') || name.includes('energy')) {
    return 'Utilities';
  }
  return 'General';
};

// Generate mock needs-info invoices
export const generateMockNeedsInfoInvoices = (): Invoice[] => {
  const now = new Date();
  const mockInvoices: Invoice[] = [];

  // Generate 8 invoices with missing critical data - mix of PO and Non-PO types
  const missingDataScenarios = [
    // PO-type invoices (vendors that require purchase orders)
    {
      id: 'needs-info-1',
      invoice_number: 'INV-2025-9001',
      vendor_name_snapshot: null, // Missing vendor
      vendor_id: null,
      invoice_date: null, // Also missing invoice date
      vendor_requires_po: true, // PO type invoice
      missing_field: 'vendor_and_date'
    },
    {
      id: 'needs-info-2',
      invoice_number: 'INV-2025-9002',
      vendor_name_snapshot: 'TechSupply Solutions Ltd',
      vendor_id: null, // Missing vendor ID
      currency: null, // Also missing currency
      vendor_requires_po: true, // PO type invoice
      missing_field: 'vendor_id_and_currency'
    },
    {
      id: 'needs-info-3',
      invoice_number: 'INV-2025-9003',
      vendor_name_snapshot: 'Industrial Equipment Co',
      vendor_id: 'VND-3249',
      currency: null, // Missing currency
      vendor_requires_po: false, // Changed to Non-PO type
      missing_field: 'currency'
    },
    {
      id: 'needs-info-4',
      invoice_number: 'INV-2025-9004',
      vendor_name_snapshot: 'Professional IT Services',
      vendor_id: 'VND-3326',
      total: null, // Missing total amount
      vendor_requires_po: false, // Changed to Non-PO type
      missing_field: 'total'
    },
    // Non-PO type invoices (utilities, rent, insurance)
    {
      id: 'needs-info-5',
      invoice_number: 'INV-2025-9005',
      vendor_name_snapshot: null, // Missing vendor
      vendor_id: null,
      vendor_requires_po: false, // Would be Non-PO type (utility/rent)
      missing_field: 'vendor'
    },
    {
      id: 'needs-info-6',
      invoice_number: 'INV-2025-9006',
      vendor_name_snapshot: 'City Electric & Power',
      vendor_id: null, // Missing vendor ID
      invoice_date: null, // Missing invoice date
      vendor_requires_po: false, // Utility company, no PO required
      missing_field: 'vendor_id_and_date'
    },
    {
      id: 'needs-info-7',
      invoice_number: 'INV-2025-9007',
      vendor_name_snapshot: 'Commercial Property Management',
      vendor_id: 'VND-4527',
      currency: null, // Missing currency
      vendor_requires_po: false, // Rent/property management, no PO
      missing_field: 'currency'
    },
    {
      id: 'needs-info-8',
      invoice_number: 'INV-2025-9008',
      vendor_name_snapshot: 'Business Insurance Partners',
      vendor_id: null, // Missing vendor ID
      total: null, // Missing total amount
      vendor_requires_po: false, // Insurance, no PO required
      missing_field: 'vendor_id_and_total'
    },
    // Additional PO-type invoices to ensure we have 4 when PO filter is selected
    {
      id: 'needs-info-9',
      invoice_number: 'INV-2025-9009',
      vendor_name_snapshot: 'Manufacturing Supplies Inc',
      vendor_id: 'VND-5234',
      invoice_date: null, // Missing invoice date
      vendor_requires_po: true, // PO type invoice
      missing_field: 'invoice_date'
    },
    {
      id: 'needs-info-10',
      invoice_number: 'INV-2025-9010',
      vendor_name_snapshot: 'Technical Components Ltd',
      vendor_id: null, // Missing vendor ID
      vendor_requires_po: true, // PO type invoice
      missing_field: 'vendor_id'
    },
    // New: PO-backed invoice with missing PO, pending state (not auto rejected)
    {
      id: 'needs-info-11',
      invoice_number: 'INV-2025-9011',
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
    baseDate.setDate(baseDate.getDate() - Math.floor(Math.random() * 10)); // 0-10 days ago

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
        const qty = Math.floor(Math.random() * 10 + 1);
        const unitPrice = Math.floor(Math.random() * 2000 + 100);
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

    mockInvoices.push({
      id: scenario.id,
      invoice_number: scenario.invoice_number,
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
      lines: lines,
      invoice_lines: lines // Add both properties for compatibility
    } as Invoice);
  });

  return mockInvoices;
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
    invoiceDate.setDate(invoiceDate.getDate() - Math.floor(Math.random() * 25 + 5)); // 5-30 days ago

    const dueDate = new Date(invoiceDate);
    dueDate.setDate(dueDate.getDate() + 30);

    const vendorName = vendors[(i - 1) % vendors.length];

    // Alternate PO and Non-PO invoices
    const isPO = i % 2 === 1 || i > 8; // ensure last 4 are PO-only

    // Choose a mismatch type for variety
    const mismatchTypes = ['mismatch', 'over_tolerance', 'quantity_mismatch', 'amount_mismatch', 'line_mismatch'];
    const match_status = mismatchTypes[i % mismatchTypes.length];

    // Build PO/GR presence (PO invoices should have a PO attached in this stage)
    const poNumbers = isPO ? [`PO-2025-${String(2000 + i).padStart(4, '0')}`] : [];
    const grNumbers = isPO && i % 3 !== 0 ? [`GR-2025-${String(3000 + i).padStart(4, '0')}`] : [];

    const base: Invoice = {
      id: `blocked-${i}`,
      invoice_number: `INV-2025-${String(5000 + i).padStart(4, '0')}`,
      vendor_name_snapshot: vendorName,
      vendor_id: `VND-${String(1000 + i).padStart(4, '0')}`,
      division: getDivision(vendorName),
      invoice_date: invoiceDate.toISOString().split('T')[0],
      due_date: dueDate.toISOString().split('T')[0],
      currency: i % 4 === 0 ? 'EUR' : 'USD',
      total: Math.floor(Math.random() * 80000 + 10000),
      status: isPO ? 'requires_review' : 'blocked',
      match_status,
      vendor_requires_po: isPO,
      vendor_is_verified: i % 5 !== 0, // some not verified
      approval_status: 'pending',
      po_numbers_cached: poNumbers,
      gr_numbers: grNumbers,
      docType: 'Invoice',
      created_at: invoiceDate.toISOString(),
      updated_at: invoiceDate.toISOString(),
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

  mockInvoices.push({
    id: 'blocked-20',
    invoice_number: 'INV-2025-8888',
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
    vendor_requires_po: true,
    vendor_is_verified: true,
    approval_status: 'pending',
    po_numbers_cached: ['PO-2025-8888'],
    gr_numbers: ['GR-2025-8888'],
    docType: 'Invoice',
    created_at: invoiceDate20.toISOString(),
    updated_at: invoiceDate20.toISOString(),
    payment_method: 'bank_transfer',
    payment_bank_details: { bank_name: 'First National Bank' },
    lines: lines20,
    invoice_lines: lines20
  });

  return mockInvoices;
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

      const vendorName = vendors[Math.floor(Math.random() * vendors.length)];
      mockInvoices.push({
        id: `mock-${invoiceCounter}`,
        invoice_number: `INV-2024-${String(1000 + invoiceCounter).padStart(4, '0')}`,
        vendor_name_snapshot: vendorName,
        vendor_id: `VND-${String(100 + invoiceCounter).padStart(4, '0')}`,
        division: getDivision(vendorName),
        invoice_date: invoiceDate.toISOString().split('T')[0],
        due_date: dueDate.toISOString().split('T')[0],
        currency: 'USD',
        total: Math.floor(Math.random() * 100000 + 10000),
        status: 'overdue',
        match_status: 'matched',
        vendor_requires_po: Math.random() > 0.5,
        vendor_is_verified: true,
        approval_status: 'approved',
        po_numbers_cached: [`PO-2024-${String(1000 + invoiceCounter).padStart(4, '0')}`],
        gr_numbers: [`GR-2024-${String(1000 + invoiceCounter).padStart(4, '0')}`],
        docType: 'Invoice',
        created_at: invoiceDate.toISOString(),
        updated_at: invoiceDate.toISOString()
      });
      invoiceCounter++;
    }
  });

  return mockInvoices;
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

      const vendorName = vendors[Math.floor(Math.random() * vendors.length)];
      const isWithinTol = (invoiceCounter === 1 || invoiceCounter === 2);
      const isPOForThis = isWithinTol ? true : Math.random() > 0.5;
      mockInvoices.push({
        id: `due-${invoiceCounter}`,
        invoice_number: `INV-2025-${String(invoiceCounter).padStart(4, '0')}`,
        vendor_name_snapshot: vendorName,
        vendor_id: `VND-${String(200 + invoiceCounter).padStart(4, '0')}`,
        division: getDivision(vendorName),
        invoice_date: invoiceDate.toISOString().split('T')[0],
        due_date: dueDate.toISOString().split('T')[0],
        currency: 'USD',
        total: Math.floor(Math.random() * 80000 + 5000),
        status: 'pending_payment',
        match_status: isWithinTol ? 'within_tolerance' : 'matched',
        vendor_requires_po: isPOForThis,
        vendor_is_verified: true,
        approval_status: 'approved',
        po_numbers_cached: [`PO-2025-${String(invoiceCounter).padStart(4, '0')}`],
        gr_numbers: [`GR-2025-${String(invoiceCounter).padStart(4, '0')}`],
        docType: 'Invoice',
        created_at: invoiceDate.toISOString(),
        updated_at: invoiceDate.toISOString()
      });
      invoiceCounter++;
    }
  });

  return mockInvoices;
};

// Generate mock Credit Notes
export const generateMockCreditNotes = (): Invoice[] => {
  const now = new Date();
  const vendors = ['TechCorp Ltd', 'SupplyChain Pro', 'GlobalParts Inc'];
  const mockInvoices: Invoice[] = [];

  for (let i = 1; i <= 2; i++) {
    const invoiceDate = new Date(now);
    invoiceDate.setDate(invoiceDate.getDate() - Math.floor(Math.random() * 15));

    const dueDate = new Date(invoiceDate);
    dueDate.setDate(dueDate.getDate() + 30);

    const vendorName = vendors[i - 1];
    mockInvoices.push({
      id: `cn-${i}`,
      invoice_number: `CN-2025-${String(i).padStart(4, '0')}`,
      vendor_name_snapshot: vendorName,
      vendor_id: `VND-${String(500 + i).padStart(4, '0')}`,
      division: getDivision(vendorName),
      invoice_date: invoiceDate.toISOString().split('T')[0],
      due_date: dueDate.toISOString().split('T')[0],
      currency: 'USD',
      total: -Math.floor(Math.random() * 5000 + 1000), // Negative amount for credit notes
      status: 'pending',
      match_status: 'matched',
      vendor_requires_po: false,
      vendor_is_verified: true,
      approval_status: 'pending',
      po_numbers_cached: [],
      gr_numbers: [],
      docType: 'Credit Note',
      created_at: invoiceDate.toISOString(),
      updated_at: invoiceDate.toISOString()
    });
  }

  return mockInvoices;
};

// Generate mock Pro Forma invoices
export const generateMockProFormaInvoices = (): Invoice[] => {
  const now = new Date();
  const vendors = ['DataCore Systems', 'CloudWave Technologies'];
  const mockInvoices: Invoice[] = [];

  for (let i = 1; i <= 2; i++) {
    const invoiceDate = new Date(now);
    invoiceDate.setDate(invoiceDate.getDate() - Math.floor(Math.random() * 10));

    const dueDate = new Date(invoiceDate);
    dueDate.setDate(dueDate.getDate() + 45); // Longer payment terms for pro forma

    const vendorName = vendors[i - 1];
    mockInvoices.push({
      id: `pf-${i}`,
      invoice_number: `PF-2025-${String(i).padStart(4, '0')}`,
      vendor_name_snapshot: vendorName,
      vendor_id: `VND-${String(600 + i).padStart(4, '0')}`,
      division: getDivision(vendorName),
      invoice_date: invoiceDate.toISOString().split('T')[0],
      due_date: dueDate.toISOString().split('T')[0],
      currency: 'EUR',
      total: Math.floor(Math.random() * 30000 + 10000),
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
      updated_at: invoiceDate.toISOString()
    });
  }

  return mockInvoices;
};

// Generate mock in-approval invoices
export const generateMockInApprovalInvoices = (): Invoice[] => {
  const now = new Date();
  const vendors = ['ApprovalTech Corp', 'Finance Solutions Ltd', 'Budget Systems Inc'];
  const approvers = ['John Smith', 'Sarah Johnson', 'Michael Chen', 'Emily Davis'];
  const mockInvoices: Invoice[] = [];

  for (let i = 1; i <= 4; i++) {
    const invoiceDate = new Date(now);
    invoiceDate.setDate(invoiceDate.getDate() - Math.floor(Math.random() * 15 + 5));

    const dueDate = new Date(invoiceDate);
    dueDate.setDate(dueDate.getDate() + 30);

    const vendorName = vendors[i % vendors.length];
    mockInvoices.push({
      id: `approval-${i}`,
      invoice_number: `INV-2025-${String(7000 + i).padStart(4, '0')}`,
      vendor_name_snapshot: vendorName,
      vendor_id: `VND-${String(700 + i).padStart(4, '0')}`,
      division: getDivision(vendorName),
      invoice_date: invoiceDate.toISOString().split('T')[0],
      due_date: dueDate.toISOString().split('T')[0],
      currency: 'USD',
      total: Math.floor(Math.random() * 75000 + 15000),
      status: 'in_approval',
      match_status: 'matched',
      vendor_requires_po: true,
      vendor_is_verified: true,
      approval_status: 'pending',
      po_numbers_cached: [`PO-2025-${String(7000 + i).padStart(4, '0')}`],
      gr_numbers: [`GR-2025-${String(7000 + i).padStart(4, '0')}`],
      docType: 'Invoice',
      approver: approvers[i % approvers.length],
      created_at: invoiceDate.toISOString(),
      updated_at: invoiceDate.toISOString()
    });
  }

  // Add Non-PO invoices that require approval (e.g., utilities, rent, insurance)
  const nonPOVendors = ['City Electric & Power', 'Commercial Property Management', 'Business Insurance Partners'];
  const nonPOApprovers = ['Laura Bennett', 'Peter Collins', 'Nina Sanders'];
  for (let i = 1; i <= nonPOVendors.length; i++) {
    const invoiceDate = new Date(now);
    invoiceDate.setDate(invoiceDate.getDate() - Math.floor(Math.random() * 10 + 3));

    const dueDate = new Date(invoiceDate);
    dueDate.setDate(dueDate.getDate() + 30);

    const vendorName = nonPOVendors[i - 1];
    mockInvoices.push({
      id: `approval-nonpo-${i}`,
      invoice_number: `NP-APPROVAL-2025-${String(i).padStart(4, '0')}`,
      vendor_name_snapshot: vendorName,
      vendor_id: `VND-NP-${String(900 + i).padStart(4, '0')}`,
      division: getDivision(vendorName),
      invoice_date: invoiceDate.toISOString().split('T')[0],
      due_date: dueDate.toISOString().split('T')[0],
      currency: i % 2 === 0 ? 'EUR' : 'USD',
      total: Math.floor(Math.random() * 20000 + 3000),
      status: 'in_approval',
      match_status: 'matched', // Non-PO doesn’t do PO/GR matching; treat as approved ready-for-approval
      vendor_requires_po: false,
      vendor_is_verified: true,
      approval_status: 'pending',
      po_numbers_cached: [],
      gr_numbers: [],
      docType: 'Invoice',
      approver: nonPOApprovers[i - 1],
      created_at: invoiceDate.toISOString(),
      updated_at: invoiceDate.toISOString()
    });
  }

  return mockInvoices;
};

// Environment configuration for mock data
// Generate mock archived invoices
export const generateMockArchivedInvoices = (): Invoice[] => {
  const now = new Date();
  const mockInvoices: Invoice[] = [];

  // PO invoice with missing PO - archived
  mockInvoices.push({
    id: 'archived-1',
    invoice_number: 'INV-2024-8001',
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
  return mockInvoices;
};

const USE_MOCK_DATA = process.env.USE_MOCK_DATA !== 'false'; // Default to true, can be disabled by setting to 'false'
const DEBUG_MOCK = process.env.DEBUG_MOCK === 'true';

// Check if an invoice ID is a mock ID
export const isMockInvoice = (id: string): boolean => {
  if (DEBUG_MOCK) {
    console.log('[MockService] Checking if mock invoice:', id);
    console.log('[MockService] USE_MOCK_DATA:', USE_MOCK_DATA);
  }

  if (!USE_MOCK_DATA) {
    if (DEBUG_MOCK) console.log('[MockService] Mock data disabled');
    return false;
  }

  const mockPrefixes = ['needs-info-', 'blocked-', 'mock-', 'due-', 'cn-', 'pf-', 'approval-', 'archived-'];
  const isMock = mockPrefixes.some(prefix => id.startsWith(prefix));

  if (DEBUG_MOCK) {
    console.log('[MockService] Mock prefixes:', mockPrefixes);
    console.log('[MockService] Is mock result:', isMock);
  }

  return isMock;
};

// Get all mock invoices
export const getAllMockInvoices = (): Invoice[] => {
  const allMocks = [
    ...generateMockNeedsInfoInvoices(),
    ...generateMockBlockedInvoices(),
    ...generateMockOverdueInvoices(),
    ...generateMockDueSoonInvoices(),
    ...generateMockCreditNotes(),
    ...generateMockProFormaInvoices(),
    ...generateMockInApprovalInvoices(),
    ...generateMockArchivedInvoices()
  ];
  console.log('[MockService] Total mock invoices:', allMocks.length);
  console.log('[MockService] Archived invoices in total:', allMocks.filter(inv => inv.status === 'archived').length);
  return allMocks;
};

// Get a specific mock invoice by ID
// Generate mock PO comparison data for mock invoices with POs
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
    // Fallback: For some lines, create matching PO lines with slight variances
    // Skip some lines to simulate missing PO lines
    poLines = invoiceLines
      .filter((_, index) => index < 3) // Only first 3 invoice lines have corresponding PO lines
      .map((line: any, index: number) => ({
        id: `po-line-${index + 1}`,
        line_no: index + 1,
        description: line.description,
        item_name: line.description,
        qty_ordered: line.qty * 0.95, // Slightly different quantity for variance
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

    // Transform to full invoice structure with additional fields and sample line items
    return transformToFullInvoice(invoice);
  } catch (error) {
    console.error('[MockService] Error getting mock invoice:', error);
    return null;
  }
};

// Transform a minimal mock invoice to full detail structure
const transformToFullInvoice = (invoice: Invoice): Invoice => {
  const hasTotal = invoice.total !== undefined && invoice.total !== null;
  const total = hasTotal ? invoice.total : 0;
  const isNegative = total < 0; // For credit notes
  const absTotal = Math.abs(total);

  // Calculate financial breakdown
  const taxRate = 0.20; // 20% VAT
  const subtotal = invoice.subtotal || (hasTotal ? absTotal / (1 + taxRate) : 0);
  const taxTotal = invoice.tax_total || (hasTotal ? absTotal - subtotal : 0);

  // Use existing lines if available, otherwise generate sample line items
  const lines = invoice.lines || invoice.invoice_lines || (hasTotal ? generateSampleLines(subtotal) : []);

  return {
    ...invoice,
    // Ensure all required fields have values
    vendor_name_snapshot: invoice.vendor_name_snapshot || 'Unknown Vendor',
    vendor_tax_id_snapshot: invoice.vendor_id ? `TAX-${invoice.vendor_id}` :
      // For needs info scenarios, explicitly leave tax ID empty
      (invoice.id?.startsWith('needs-info-') ? '' : undefined),
    vendor_address_snapshot: invoice.vendor_name_snapshot
      ? `${Math.floor(Math.random() * 999) + 1} Business Street, Suite ${Math.floor(Math.random() * 99) + 1}, Business City, BC 12345`
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
    payment_terms_id: 'NET30',
    terms_text: 'Net 30 days',
    assigned_to_name: invoice.approver || null,
    ledger: 'Accounts Payable',
    cost_center: `CC-${Math.floor(Math.random() * 999) + 1}`,
    cost_center_name: 'Operations',
    gl_code: `GL-${Math.floor(Math.random() * 9999) + 1000}`,
    department: 'Finance',
    accounting_notes: null,
    ai_classification_confidence: hasTotal ? 0.95 : undefined,
    ai_classification_reasoning: hasTotal ? 'Classification based on vendor and amount patterns' : undefined,
    extraction_field_confidences: hasTotal ? {
      vendor_name: invoice.vendor_name_snapshot ? 0.98 : 0,
      invoice_number: 0.99,
      invoice_date: invoice.invoice_date ? 0.97 : 0,
      due_date: 0.96,
      total: 0.99,
      currency: invoice.currency ? 0.95 : 0
    } : {},
    is_manually_edited: {},
    payment_method: 'bank_transfer',
    payment_bank_details: invoice.vendor_name_snapshot ? {
      bank_name: 'First National Bank',
      account_name: invoice.vendor_name_snapshot,
      account_number: '****' + Math.floor(Math.random() * 9999),
      routing_number: '123456789'
    } : null,
    lines: lines,
    invoice_lines: lines, // Also set invoice_lines for compatibility
    poTotal: invoice.po_numbers_cached && invoice.po_numbers_cached.length > 0 && hasTotal
      ? subtotal * 1.05 // Slightly higher PO amount
      : null,
    validation_warnings: generateValidationWarnings(invoice),
    attachments: []
  };
};

// Generate sample line items based on subtotal
const generateSampleLines = (subtotal: number): any[] => {
  const lineCount = Math.min(5, Math.max(2, Math.floor(subtotal / 5000) + 1));
  const lines = [];
  let remainingAmount = subtotal;

  const sampleDescriptions = [
    'Professional Services - Consulting',
    'Software License - Annual Subscription',
    'Hardware Components - Server Equipment',
    'Maintenance and Support Services',
    'Cloud Infrastructure Services',
    'Training and Documentation',
    'Implementation Services',
    'Custom Development Work'
  ];

  for (let i = 0; i < lineCount; i++) {
    const isLastLine = i === lineCount - 1;
    const lineAmount = isLastLine
      ? remainingAmount
      : remainingAmount * (0.2 + Math.random() * 0.3); // 20-50% of remaining

    const qty = Math.max(1, Math.floor(Math.random() * 10) + 1);
    const unitPrice = lineAmount / qty;

    lines.push({
      id: `line-${i + 1}`,
      line_no: i + 1,
      description: sampleDescriptions[i % sampleDescriptions.length],
      qty: qty,
      uom: ['EA', 'HR', 'UNIT', 'LICENSE'][Math.floor(Math.random() * 4)],
      unit_price: Math.round(unitPrice * 100) / 100,
      net_amount: Math.round(lineAmount * 100) / 100,
      line_total: Math.round(lineAmount * 100) / 100
    });

    remainingAmount -= lineAmount;
  }

  return lines;
};

// Generate validation warnings based on invoice state
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
