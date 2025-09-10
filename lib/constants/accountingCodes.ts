/**
 * Accounting Classification Constants
 * Defines standard cost centers, ledger accounts, and GL codes
 */

export interface CostCenter {
  code: string;
  name: string;
  department: string;
  description?: string;
}

export interface LedgerAccount {
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'expense' | 'revenue';
  glCode?: string;
  description?: string;
}

export interface Department {
  code: string;
  name: string;
  costCenterPrefix: string;
}

// Standard Cost Centers
export const COST_CENTERS: CostCenter[] = [
  {
    code: 'IT-100',
    name: 'Information Technology',
    department: 'Technology',
    description: 'IT operations, software, hardware, and technology services'
  },
  {
    code: 'MKT-200',
    name: 'Marketing',
    department: 'Marketing',
    description: 'Marketing campaigns, advertising, brand management'
  },
  {
    code: 'OPS-300',
    name: 'Operations',
    department: 'Operations',
    description: 'Core business operations and operational expenses'
  },
  {
    code: 'HR-400',
    name: 'Human Resources',
    department: 'Human Resources',
    description: 'HR operations, recruitment, training, employee benefits'
  },
  {
    code: 'FIN-500',
    name: 'Finance',
    department: 'Finance',
    description: 'Finance operations, accounting, audit, compliance'
  },
  {
    code: 'R&D-600',
    name: 'Research & Development',
    department: 'R&D',
    description: 'Product development, research, innovation'
  },
  {
    code: 'FAC-700',
    name: 'Facilities',
    department: 'Facilities',
    description: 'Facilities management, utilities, maintenance, rent'
  },
  {
    code: 'EXEC-800',
    name: 'Executive',
    department: 'Executive',
    description: 'Executive office, strategic initiatives, board expenses'
  },
  {
    code: 'SALES-900',
    name: 'Sales',
    department: 'Sales',
    description: 'Sales operations, commissions, sales support'
  },
  {
    code: 'LEGAL-1000',
    name: 'Legal',
    department: 'Legal',
    description: 'Legal services, compliance, contracts'
  }
];

// Standard Ledger Accounts
export const LEDGER_ACCOUNTS: LedgerAccount[] = [
  {
    code: '2000',
    name: 'Accounts Payable',
    type: 'liability',
    glCode: '2000',
    description: 'Standard vendor invoices for goods/services received'
  },
  {
    code: '2100',
    name: 'Accruals',
    type: 'liability',
    glCode: '2100',
    description: 'Services spanning multiple periods, utilities, recurring services'
  },
  {
    code: '1500',
    name: 'Prepaid Expenses',
    type: 'asset',
    glCode: '1500',
    description: 'Insurance, annual licenses, subscriptions paid in advance'
  },
  {
    code: '1600',
    name: 'Fixed Assets',
    type: 'asset',
    glCode: '1600',
    description: 'Equipment, furniture, and capital purchases over $5,000'
  },
  {
    code: '1400',
    name: 'Inventory',
    type: 'asset',
    glCode: '1400',
    description: 'Raw materials, finished goods, resale items'
  }
];

// Departments
export const DEPARTMENTS: Department[] = [
  { code: 'TECH', name: 'Technology', costCenterPrefix: 'IT' },
  { code: 'MKT', name: 'Marketing', costCenterPrefix: 'MKT' },
  { code: 'OPS', name: 'Operations', costCenterPrefix: 'OPS' },
  { code: 'HR', name: 'Human Resources', costCenterPrefix: 'HR' },
  { code: 'FIN', name: 'Finance', costCenterPrefix: 'FIN' },
  { code: 'R&D', name: 'Research & Development', costCenterPrefix: 'R&D' },
  { code: 'FAC', name: 'Facilities', costCenterPrefix: 'FAC' },
  { code: 'EXEC', name: 'Executive', costCenterPrefix: 'EXEC' },
  { code: 'SALES', name: 'Sales', costCenterPrefix: 'SALES' },
  { code: 'LEGAL', name: 'Legal', costCenterPrefix: 'LEGAL' }
];

// GL Code Mapping based on expense types
export const GL_CODE_MAPPINGS: Record<string, { pattern: RegExp; glCode: string; description: string }[]> = {
  'IT-100': [
    { pattern: /software|license|subscription/i, glCode: '6210', description: 'Software & Licenses' },
    { pattern: /hardware|computer|laptop|server/i, glCode: '1620', description: 'Computer Hardware' },
    { pattern: /consulting|professional/i, glCode: '6220', description: 'IT Consulting' },
    { pattern: /cloud|hosting|aws|azure/i, glCode: '6230', description: 'Cloud Services' }
  ],
  'MKT-200': [
    { pattern: /advertising|ads|campaign/i, glCode: '7110', description: 'Advertising' },
    { pattern: /event|conference|trade show/i, glCode: '7120', description: 'Events & Conferences' },
    { pattern: /design|creative|branding/i, glCode: '7130', description: 'Creative Services' },
    { pattern: /research|survey|analysis/i, glCode: '7140', description: 'Market Research' }
  ],
  'OPS-300': [
    { pattern: /supplies|materials/i, glCode: '5100', description: 'Operating Supplies' },
    { pattern: /shipping|freight|delivery/i, glCode: '5200', description: 'Shipping & Freight' },
    { pattern: /equipment|tools/i, glCode: '5300', description: 'Operating Equipment' }
  ],
  'FAC-700': [
    { pattern: /rent|lease/i, glCode: '5410', description: 'Rent & Lease' },
    { pattern: /utilities|electricity|water|gas/i, glCode: '5420', description: 'Utilities' },
    { pattern: /maintenance|repair|cleaning/i, glCode: '5430', description: 'Maintenance & Repairs' },
    { pattern: /security/i, glCode: '5440', description: 'Security Services' }
  ]
};

// Helper functions
export function getCostCenterByCode(code: string): CostCenter | undefined {
  return COST_CENTERS.find(cc => cc.code === code);
}

export function getLedgerAccountByName(name: string): LedgerAccount | undefined {
  return LEDGER_ACCOUNTS.find(la => la.name.toLowerCase() === name.toLowerCase());
}

export function getDepartmentByCostCenter(costCenterCode: string): Department | undefined {
  const prefix = costCenterCode.split('-')[0];
  return DEPARTMENTS.find(d => d.costCenterPrefix === prefix);
}

export function suggestGLCode(costCenter: string, description: string): string | null {
  const mappings = GL_CODE_MAPPINGS[costCenter];
  if (!mappings) return null;
  
  for (const mapping of mappings) {
    if (mapping.pattern.test(description)) {
      return mapping.glCode;
    }
  }
  
  // Default GL codes by cost center
  const defaults: Record<string, string> = {
    'IT-100': '6210',
    'MKT-200': '7110',
    'OPS-300': '5100',
    'HR-400': '6310',
    'FIN-500': '6410',
    'R&D-600': '6510',
    'FAC-700': '5410',
    'EXEC-800': '6810',
    'SALES-900': '7210',
    'LEGAL-1000': '6910'
  };
  
  return defaults[costCenter] || null;
}

// Classification rules for automatic ledger assignment
export const LEDGER_CLASSIFICATION_RULES = {
  'Fixed Assets': {
    conditions: [
      { field: 'amount', operator: '>', value: 5000, itemKeywords: ['equipment', 'furniture', 'machinery', 'vehicle'] },
      { keywords: ['capital', 'asset', 'depreciate'] }
    ]
  },
  'Prepaid Expenses': {
    conditions: [
      { keywords: ['prepaid', 'advance', 'deposit'] },
      { keywords: ['insurance', 'policy', 'premium'], period: 'annual' },
      { keywords: ['license', 'subscription'], period: 'annual' }
    ]
  },
  'Accruals': {
    conditions: [
      { keywords: ['utility', 'utilities', 'electricity', 'water', 'gas'] },
      { servicePeriod: 'cross-month' },
      { keywords: ['accrual', 'accrue'] }
    ]
  },
  'Inventory': {
    conditions: [
      { keywords: ['inventory', 'stock', 'raw material', 'finished goods'] },
      { vendorType: 'supplier', keywords: ['material', 'component', 'part'] }
    ]
  },
  'Accounts Payable': {
    conditions: [
      { default: true } // Default if no other rules match
    ]
  }
};

// Export default ledger options for UI dropdowns
export const LEDGER_OPTIONS = LEDGER_ACCOUNTS.map(account => ({
  value: account.name,
  label: account.name,
  glCode: account.glCode,
  type: account.type
}));

export const COST_CENTER_OPTIONS = COST_CENTERS.map(cc => ({
  value: cc.code,
  label: `${cc.code} - ${cc.name}`,
  department: cc.department
}));

export const DEPARTMENT_OPTIONS = DEPARTMENTS.map(dept => ({
  value: dept.code,
  label: dept.name
}));