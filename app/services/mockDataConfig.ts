/**
 * Mock Data Configuration
 * Single source of truth for all demo/synthetic data generation
 *
 * This file contains master data lists used across the application
 * for generating realistic demo invoice data.
 */

// ============================================================================
// VENDOR MASTER DATA
// ============================================================================

export interface DemoVendor {
  name: string;
  division: string;
  requiresPO: boolean;
  isVerified: boolean;
  country?: string;
  customerNo: string; // Human-readable vendor code for accounting/procurement
}

export const DEMO_VENDORS: DemoVendor[] = [
  // Technology Division
  { name: 'TechSupply Solutions Ltd', division: 'Technology', requiresPO: true, isVerified: true, country: 'UK', customerNo: 'TECH-001' },
  { name: 'Software Systems Inc', division: 'Technology', requiresPO: true, isVerified: true, country: 'US', customerNo: 'SOFT-002' },
  { name: 'DataCore Systems', division: 'Technology', requiresPO: true, isVerified: true, country: 'US', customerNo: 'DATA-003' },
  { name: 'CloudWave Technologies', division: 'Technology', requiresPO: true, isVerified: true, country: 'US', customerNo: 'CLOU-004' },

  // Supply Chain Division
  { name: 'Global Services Inc', division: 'Supply Chain', requiresPO: true, isVerified: true, country: 'Global', customerNo: 'GLOB-005' },
  { name: 'Industrial Parts Ltd', division: 'Supply Chain', requiresPO: true, isVerified: true, country: 'UK', customerNo: 'INDU-006' },
  { name: 'Global Industrial Parts', division: 'Supply Chain', requiresPO: true, isVerified: true, country: 'Global', customerNo: 'GLOB-007' },
  { name: 'Global Supply Chain Partners', division: 'Supply Chain', requiresPO: true, isVerified: true, country: 'Global', customerNo: 'GLOB-008' },
  { name: 'Manufacturing Supplies Inc', division: 'Supply Chain', requiresPO: true, isVerified: true, country: 'US', customerNo: 'MANU-009' },
  { name: 'SupplyChain Pro', division: 'Supply Chain', requiresPO: true, isVerified: true, country: 'US', customerNo: 'SUPP-010' },

  // IT Services Division
  { name: 'Professional IT Services', division: 'IT Services', requiresPO: false, isVerified: true, country: 'US', customerNo: 'PROF-011' },
  { name: 'CloudNet Services', division: 'IT Services', requiresPO: false, isVerified: true, country: 'US', customerNo: 'CLOU-012' },
  { name: 'NetSolutions', division: 'IT Services', requiresPO: false, isVerified: true, country: 'US', customerNo: 'NETS-013' },
  { name: 'Technical Components Ltd', division: 'IT Services', requiresPO: true, isVerified: true, country: 'UK', customerNo: 'TECH-014' },

  // Operations Division
  { name: 'Office Supplies Direct', division: 'Operations', requiresPO: true, isVerified: true, country: 'US', customerNo: 'OFFI-015' },
  { name: 'Maintenance Pro', division: 'Operations', requiresPO: false, isVerified: true, country: 'US', customerNo: 'MAIN-016' },
  { name: 'Maintenance Group', division: 'Operations', requiresPO: false, isVerified: true, country: 'US', customerNo: 'MAIN-017' },

  // Construction Division
  { name: 'BuildCo Solutions', division: 'Construction', requiresPO: true, isVerified: true, country: 'US', customerNo: 'BUIL-018' },
  { name: 'Industrial Equipment Co', division: 'Construction', requiresPO: false, isVerified: true, country: 'US', customerNo: 'INDU-019' },

  // Utilities Division (Non-PO typical)
  { name: 'City Electric & Power', division: 'Utilities', requiresPO: false, isVerified: true, country: 'US', customerNo: 'CITY-020' },
  { name: 'Commercial Property Management', division: 'Utilities', requiresPO: false, isVerified: true, country: 'US', customerNo: 'COMM-021' },
  { name: 'Energy Solutions', division: 'Utilities', requiresPO: false, isVerified: true, country: 'US', customerNo: 'ENER-022' },

  // Finance/Insurance (Non-PO typical)
  { name: 'Business Insurance Partners', division: 'Finance', requiresPO: false, isVerified: true, country: 'US', customerNo: 'BUSI-023' },
  { name: 'Finance Solutions Ltd', division: 'Finance', requiresPO: false, isVerified: true, country: 'UK', customerNo: 'FINA-024' },
  { name: 'Budget Systems Inc', division: 'Finance', requiresPO: false, isVerified: true, country: 'US', customerNo: 'BUDG-025' },

  // General/Mixed
  { name: 'Acme Corporation', division: 'General', requiresPO: true, isVerified: true, country: 'US', customerNo: 'ACME-026' },
  { name: 'TechCorp Ltd', division: 'General', requiresPO: true, isVerified: true, country: 'UK', customerNo: 'TECH-027' },
  { name: 'GlobalParts Inc', division: 'General', requiresPO: true, isVerified: true, country: 'US', customerNo: 'GLOB-028' },
  { name: 'MegaCorp Industries', division: 'General', requiresPO: true, isVerified: true, country: 'US', customerNo: 'MEGA-029' },
  { name: 'TechFlow Systems', division: 'General', requiresPO: true, isVerified: true, country: 'US', customerNo: 'TECH-030' },
  { name: 'LogiTech Solutions', division: 'General', requiresPO: true, isVerified: true, country: 'US', customerNo: 'LOGI-031' },
];

// ============================================================================
// ASSIGNEE/OWNER MASTER DATA
// ============================================================================

export interface DemoAssignee {
  name: string;
  email: string;
  initials: string;
  role: string;
  division?: string; // Optional specialization
}

export const DEMO_ASSIGNEES: DemoAssignee[] = [
  { name: 'Sarah Johnson', email: 'sarah.johnson@company.com', initials: 'SJ', role: 'AP Manager', division: 'Finance' },
  { name: 'Michael Chen', email: 'michael.chen@company.com', initials: 'MC', role: 'AP Specialist', division: 'Finance' },
  { name: 'Emily Davis', email: 'emily.davis@company.com', initials: 'ED', role: 'AP Specialist', division: 'Finance' },
  { name: 'John Smith', email: 'john.smith@company.com', initials: 'JS', role: 'Senior Accountant', division: 'Finance' },
  { name: 'Laura Bennett', email: 'laura.bennett@company.com', initials: 'LB', role: 'AP Coordinator', division: 'Finance' },
  { name: 'Peter Collins', email: 'peter.collins@company.com', initials: 'PC', role: 'AP Analyst', division: 'Finance' },
  { name: 'Nina Sanders', email: 'nina.sanders@company.com', initials: 'NS', role: 'Finance Manager', division: 'Finance' },
  { name: 'David Martinez', email: 'david.martinez@company.com', initials: 'DM', role: 'AP Supervisor', division: 'Finance' },
  { name: 'Jennifer Lee', email: 'jennifer.lee@company.com', initials: 'JL', role: 'Accounts Payable Lead', division: 'Finance' },
  { name: 'Robert Taylor', email: 'robert.taylor@company.com', initials: 'RT', role: 'AP Specialist', division: 'Finance' },
];

// ============================================================================
// APPROVER MASTER DATA
// ============================================================================

export const DEMO_APPROVERS: string[] = [
  'Michael Chen',
  'Jennifer Roberts',
  'Thomas Schmidt',
  'Elizabeth Taylor',
  'Richard Jones',
  'Patricia Williams'
];

// ============================================================================
// REQUISITIONER MASTER DATA (for PO invoices)
// ============================================================================

export const DEMO_REQUISITIONERS: string[] = [
  'Olivia Green',
  'Noah Patel',
  'Liam Walker',
  'Ava Thompson',
  'Mason Clark',
  'Isabella Lewis',
  'Sophia Hall',
  'Ethan Young'
];

// ============================================================================
// DIVISION/ENTITY MASTER DATA
// ============================================================================

export const DEMO_DIVISIONS = [
  'EMEA',
  'US Inc',
  'Carter UK Ltd',
  'APAC',
  'LATAM',
  'Canada Corp'
] as const;

export type DemoDivision = typeof DEMO_DIVISIONS[number];

// ============================================================================
// COST CENTER MASTER DATA
// ============================================================================

export interface DemoCostCenter {
  code: string;
  name: string;
  division?: DemoDivision;
}

export const DEMO_COST_CENTERS: Record<string, DemoCostCenter[]> = {
  'Technology': [
    { code: 'CC-1001', name: 'IT Infrastructure' },
    { code: 'CC-1002', name: 'Software Development' },
    { code: 'CC-1003', name: 'Technology Services' },
  ],
  'Supply Chain': [
    { code: 'CC-2001', name: 'Procurement' },
    { code: 'CC-2002', name: 'Logistics' },
    { code: 'CC-2003', name: 'Warehouse Operations' },
  ],
  'IT Services': [
    { code: 'CC-3001', name: 'IT Support' },
    { code: 'CC-3002', name: 'Cloud Services' },
    { code: 'CC-3003', name: 'Network Operations' },
  ],
  'Operations': [
    { code: 'CC-4001', name: 'Facilities Management' },
    { code: 'CC-4002', name: 'General Operations' },
    { code: 'CC-4003', name: 'Maintenance' },
  ],
  'Construction': [
    { code: 'CC-5001', name: 'Construction Projects' },
    { code: 'CC-5002', name: 'Building Services' },
  ],
  'Utilities': [
    { code: 'CC-6001', name: 'Utilities & Energy' },
    { code: 'CC-6002', name: 'Facility Services' },
  ],
  'Finance': [
    { code: 'CC-7001', name: 'Financial Services' },
    { code: 'CC-7002', name: 'Insurance & Risk' },
  ],
  'General': [
    { code: 'CC-9001', name: 'General & Administrative' },
    { code: 'CC-9002', name: 'IT Services Department' },
  ],
};

// ============================================================================
// DEPARTMENT MASTER DATA
// ============================================================================

export const DEMO_DEPARTMENTS = [
  'Engineering',
  'Marketing',
  'Sales',
  'Operations',
  'Finance',
  'Human Resources',
  'Legal',
  'Customer Success',
  'Product',
  'IT Infrastructure'
] as const;

export type DemoDepartment = typeof DEMO_DEPARTMENTS[number];

// ============================================================================
// PROJECT CODE MASTER DATA
// ============================================================================

export const DEMO_PROJECT_CODES = [
  'PROJ-2025-001',
  'PROJ-2025-002',
  'PROJ-2025-003',
  'PROJ-2024-089',
  'PROJ-2024-090',
] as const;

// ============================================================================
// ACCOUNT CODE MASTER DATA (GL Codes)
// ============================================================================

export const DEMO_ACCOUNT_CODES: string[] = [
  '5000-1100', // IT Hardware
  '5000-1200', // IT Software
  '5000-1300', // IT Services
  '5100-2000', // Office Supplies
  '5100-2100', // Professional Services
  '5200-3000', // Utilities
  '5200-3100', // Rent & Facilities
  '5300-4000', // Marketing
  '5300-4100', // Travel & Entertainment
  '5400-5000', // Manufacturing Costs
  '5400-5100', // Raw Materials
  '5500-6000', // Consulting Services
  '5500-6100', // Legal Services
];

// ============================================================================
// PRIORITY LEVELS
// ============================================================================

export const PRIORITY_LEVELS = ['urgent', 'high', 'normal', 'low'] as const;
export type PriorityLevel = typeof PRIORITY_LEVELS[number];

// ============================================================================
// INGESTION SOURCES
// ============================================================================

export const INGESTION_SOURCES = ['email', 'edi', 'manual_upload'] as const;
export type IngestionSource = typeof INGESTION_SOURCES[number];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get a random item from an array using a seed for determinism
 */
export function getSeededItem<T>(array: readonly T[], seed: number): T {
  return array[Math.abs(seed) % array.length];
}

/**
 * Generate a deterministic seed from a string
 */
export function generateSeed(str: string): number {
  return str.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
}

/**
 * Seeded random number generator using Linear Congruential Generator (LCG)
 * Returns a deterministic "random" number between 0 and 1 based on the seed
 *
 * @param seed - Integer seed value
 * @returns Pseudo-random number between 0 and 1
 */
export function seededRandom(seed: number): number {
  // LCG parameters (same as java.util.Random)
  const a = 1103515245;
  const c = 12345;
  const m = 2 ** 31;

  // Ensure seed is positive integer
  const normalizedSeed = Math.abs(Math.floor(seed));

  // Apply LCG formula
  const next = (a * normalizedSeed + c) % m;

  // Return value between 0 and 1
  return next / m;
}
