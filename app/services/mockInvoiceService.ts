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
      vendor_requires_po: true, // Would be PO-type if vendor was identified
      missing_field: 'vendor'
    },
    {
      id: 'needs-info-2',
      invoice_number: 'INV-2025-9002',
      vendor_name_snapshot: 'TechSupply Solutions Ltd',
      vendor_id: null, // Missing vendor ID
      vendor_requires_po: true, // Equipment supplier requires PO
      missing_field: 'vendor_id'
    },
    {
      id: 'needs-info-3',
      invoice_number: 'INV-2025-9003',
      vendor_name_snapshot: 'Industrial Equipment Co',
      vendor_id: 'VND-4523',
      currency: null, // Missing currency
      vendor_requires_po: true, // Industrial supplier requires PO
      missing_field: 'currency'
    },
    {
      id: 'needs-info-4',
      invoice_number: 'INV-2025-9004',
      vendor_name_snapshot: 'Professional IT Services',
      vendor_id: null, // Missing vendor ID
      total: null, // Missing total amount
      vendor_requires_po: true, // IT services require PO
      missing_field: 'vendor_id_and_total'
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
    }
  ];

  missingDataScenarios.forEach((scenario, index) => {
    const baseDate = new Date(now);
    baseDate.setDate(baseDate.getDate() - Math.floor(Math.random() * 10)); // 0-10 days ago

    const dueDate = new Date(baseDate);
    dueDate.setDate(dueDate.getDate() + 30);

    // Generate mock line items
    const numLines = 3;
    const lines = [];
    let subtotal = 0;

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
    const taxAmount = subtotal * taxRate;
    const total = subtotal + taxAmount;

    // For PO-type scenarios, attach a PO number to two of the four
    const poNumbersForNeedsInfo = (scenario.vendor_requires_po && (scenario.id === 'needs-info-2' || scenario.id === 'needs-info-3'))
      ? [`PO-2025-NI-${String(9000 + index).padStart(4, '0')}`]
      : [];

    mockInvoices.push({
      id: scenario.id,
      invoice_number: scenario.invoice_number,
      vendor_name_snapshot: scenario.vendor_name_snapshot || undefined,
      vendor_id: scenario.vendor_id || undefined,
      division: scenario.vendor_name_snapshot ? getDivision(scenario.vendor_name_snapshot) : 'Unknown',
      invoice_date: scenario.invoice_date !== null ? baseDate.toISOString().split('T')[0] : undefined,
      due_date: dueDate.toISOString().split('T')[0],
      currency: scenario.currency !== null ? (scenario.currency || 'GBP') : undefined,
      subtotal: subtotal,
      tax_total: taxAmount,
      tax_rate_percent: taxRate * 100,
      total: scenario.total !== null ? total : undefined,
      status: 'needs_info', // New status for missing data
      match_status: 'pending',
      vendor_requires_po: scenario.vendor_requires_po,
      vendor_is_verified: false,
      approval_status: 'pending',
      po_numbers_cached: poNumbersForNeedsInfo,
      gr_numbers: [],
      docType: 'Invoice',
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

// Check if an invoice ID is a mock ID
export const isMockInvoice = (id: string): boolean => {
  const mockPrefixes = ['needs-info-', 'blocked-', 'mock-', 'due-', 'cn-', 'pf-', 'approval-'];
  return mockPrefixes.some(prefix => id.startsWith(prefix));
};

// Get all mock invoices
export const getAllMockInvoices = (): Invoice[] => {
  return [
    ...generateMockNeedsInfoInvoices(),
    ...generateMockBlockedInvoices(),
    ...generateMockOverdueInvoices(),
    ...generateMockDueSoonInvoices(),
    ...generateMockCreditNotes(),
    ...generateMockProFormaInvoices(),
    ...generateMockInApprovalInvoices()
  ];
};

// Get a specific mock invoice by ID
export const getMockInvoiceById = (id: string): Invoice | null => {
  if (!isMockInvoice(id)) {
    return null;
  }

  const allMockInvoices = getAllMockInvoices();
  const invoice = allMockInvoices.find(inv => inv.id === id);

  if (!invoice) {
    return null;
  }

  // Transform to full invoice structure with additional fields and sample line items
  return transformToFullInvoice(invoice);
};

// Transform a minimal mock invoice to full detail structure
const transformToFullInvoice = (invoice: Invoice): Invoice => {
  const hasTotal = invoice.total !== undefined && invoice.total !== null;
  const total = hasTotal ? invoice.total : 0;
  const isNegative = total < 0; // For credit notes
  const absTotal = Math.abs(total);

  // Calculate financial breakdown
  const taxRate = 0.20; // 20% VAT
  const subtotal = hasTotal ? absTotal / (1 + taxRate) : 0;
  const taxTotal = hasTotal ? absTotal - subtotal : 0;

  // Generate sample line items if we have a total
  const lines = hasTotal ? generateSampleLines(subtotal) : [];

  return {
    ...invoice,
    // Ensure all required fields have values
    vendor_name_snapshot: invoice.vendor_name_snapshot || 'Unknown Vendor',
    vendor_tax_id_snapshot: invoice.vendor_id ? `TAX-${invoice.vendor_id}` : undefined,
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
