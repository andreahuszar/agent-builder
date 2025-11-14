import { TemplateRegistryEntry, DisplayConfig, TemplateConfig } from '@/types/invoice-display';
import { DefaultTemplate } from './DefaultTemplate';
import { PurpleModernTemplate } from './PurpleModernTemplate';
import { BlueEnterpriseTemplate } from './BlueEnterpriseTemplate';
import { BlueHeaderTemplate } from './BlueHeaderTemplate';
import { GreenMinimalTemplate } from './GreenMinimalTemplate';
import { GreenPremierTemplate } from './GreenPremierTemplate';
import { SimpleTableInvoiceTemplate } from './SimpleTableInvoiceTemplate';
import { BlackEnterpriseTemplate } from './BlackEnterpriseTemplate';

/**
 * Template Registry
 *
 * Central registry for all invoice templates. This system enables:
 * - Template discovery and selection
 * - Configuration merging (defaults + overrides)
 * - Validation and fallback logic
 * - Future template additions without modifying core code
 */

/**
 * Template Registry - Maps template IDs to template definitions
 */
export const TEMPLATE_REGISTRY: Record<string, TemplateRegistryEntry> = {
  default: {
    id: 'default',
    name: 'Default Template',
    description: 'Standard invoice layout with all sections (backward compatible)',
    category: 'default',
    component: DefaultTemplate,
    defaultConfig: {
      layout: {
        style: 'default',
        pageSize: 'A4',
        maxWidth: '794px',
        showPageNumbers: false,
      },
      theme: {
        primaryColor: 'purple',
        headerBgColor: 'bg-white',
        headerTextColor: 'text-gray-900',
        borderColor: 'border-gray-200',
        accentColor: 'text-purple-600',
      },
      labels: {
        invoiceNumber: 'Invoice #',
        invoiceDate: 'Date',
        dueDate: 'Due Date',
        poNumber: 'PO #',
        vendor: 'Vendor',
        billTo: 'Bill To',
        paymentTerms: 'Payment Terms',
        subtotal: 'Subtotal',
        tax: 'Tax',
        total: 'Total Due',
        tableHeaders: {
          description: 'Description',
          qty: 'Qty',
          unitPrice: 'Unit Price',
          tax: 'Tax',
          lineTotal: 'Amount',
        },
      },
      sections: [
        { id: 'header', visible: true, order: 1, layout: 'default' },
        { id: 'billTo', visible: true, order: 2, layout: 'default' },
        { id: 'lineItems', visible: true, order: 3, layout: 'default' },
        { id: 'totals', visible: true, order: 4, layout: 'default' },
        { id: 'paymentTerms', visible: true, order: 5, layout: 'default' },
      ],
    },
  },

  compact: {
    id: 'compact',
    name: 'Compact Template',
    description: 'Centered layout with compact spacing (for simple invoices)',
    category: 'default',
    component: DefaultTemplate, // Same component, different config
    defaultConfig: {
      layout: {
        style: 'compact',
        pageSize: 'A4',
        maxWidth: '794px',
        showPageNumbers: false,
        invoiceNumberPlacement: 'above-logo',
      },
      theme: {
        primaryColor: 'purple',
        headerBgColor: 'bg-white',
        headerTextColor: 'text-gray-900',
        borderColor: 'border-gray-200',
        accentColor: 'text-purple-600',
      },
      labels: {
        invoiceNumber: 'Invoice #',
        invoiceDate: 'Date',
        dueDate: 'Due Date',
        poNumber: 'PO #',
        vendor: 'Vendor',
        billTo: 'Bill To',
        paymentTerms: 'Payment Terms',
        subtotal: 'Subtotal',
        tax: 'Tax',
        total: 'Total Due',
        tableHeaders: {
          description: 'Description',
          qty: 'Qty',
          unitPrice: 'Unit Price',
          tax: 'Tax',
          lineTotal: 'Amount',
        },
      },
      sections: [
        { id: 'header', visible: true, order: 1, layout: 'centered' },
        { id: 'billTo', visible: true, order: 2, layout: 'compact' },
        { id: 'lineItems', visible: true, order: 3, layout: 'default' },
        { id: 'totals', visible: true, order: 4, layout: 'default' },
        { id: 'paymentTerms', visible: true, order: 5, layout: 'compact' },
      ],
    },
  },

  'purple-modern': {
    id: 'purple-modern',
    name: 'Purple Modern',
    description: 'Modern two-column layout with purple gradient and VAT breakdown',
    category: 'modern',
    component: PurpleModernTemplate,
    defaultConfig: {
      layout: {
        style: 'modern',
        pageSize: 'A4',
        maxWidth: '1200px',
        showPageNumbers: false,
      },
      theme: {
        primaryColor: 'purple',
        headerBgColor: 'bg-purple-900',
        headerTextColor: 'text-white',
        borderColor: 'border-purple-200',
        accentColor: 'text-purple-900',
      },
      labels: {
        invoiceNumber: 'Invoice No #',
        invoiceDate: 'Invoice Date',
        dueDate: 'Due Date',
        refNo: 'REF No:',
        poNumber: 'PO Number',
        vendor: 'Billed By',
        billTo: 'Billed To',
        paymentTerms: 'Payment Terms',
        subtotal: 'Amount',
        tax: 'VAT',
        total: 'Total',
        tableHeaders: {
          lineNo: '#',
          description: 'Description',
          qty: 'Qty',
          uom: 'UOM',
          unitPrice: 'Unit Price',
          netAmount: 'Net Amount',
          tax: 'VAT',
          lineTotal: 'Line Total',
        },
      },
    },
  },

  'blue-enterprise': {
    id: 'blue-enterprise',
    name: 'Blue Enterprise',
    description: 'Professional enterprise template with detailed 9-column table and SKU codes',
    category: 'enterprise',
    component: BlueEnterpriseTemplate,
    defaultConfig: {
      layout: {
        style: 'enterprise',
        pageSize: 'A4',
        maxWidth: '1200px',
        showPageNumbers: true,
      },
      theme: {
        primaryColor: 'blue',
        headerBgColor: 'bg-blue-900',
        headerTextColor: 'text-white',
        borderColor: 'border-blue-200',
        accentColor: 'text-blue-900',
      },
      labels: {
        invoiceNumber: 'Invoice No.',
        invoiceDate: 'Invoice Date',
        dueDate: 'Payment Due',
        poNumber: 'Purchase Order',
        vendor: 'Vendor',
        billTo: 'Bill To',
        paymentTerms: 'Payment Terms',
        subtotal: 'Subtotal',
        tax: 'Tax',
        total: 'Total Amount Due',
        tableHeaders: {
          lineNo: 'Line',
          sku: 'SKU / Product Code',
          description: 'Description',
          qty: 'Qty',
          uom: 'UOM',
          unitPrice: 'Unit Price',
          discount: 'Disc %',
          netAmount: 'Net Amount',
          tax: 'Tax',
          lineTotal: 'Line Total',
        },
      },
    },
  },

  'blue-header': {
    id: 'blue-header',
    name: 'Blue Header Template',
    description: 'JanServ-inspired professional layout with solid blue header bar and clean table design',
    category: 'enterprise',
    component: BlueHeaderTemplate,
    defaultConfig: {
      layout: {
        style: 'enterprise',
        pageSize: 'A4',
        maxWidth: '900px',
        showPageNumbers: true,
      },
      theme: {
        primaryColor: 'blue',
        headerBgColor: 'bg-blue-600',
        headerTextColor: 'text-white',
        borderColor: 'border-gray-300',
        accentColor: 'text-blue-600',
      },
      labels: {
        invoiceNumber: 'Invoice No #',
        invoiceDate: 'Invoice Date',
        dueDate: 'Due Date',
        refNo: 'Cust. Ref',
        poNumber: 'Purchase Order',
        vendor: 'Vendor',
        billTo: 'BILLED TO',
        paymentTerms: 'Payment Terms',
        subtotal: 'Subtotal',
        tax: 'Tax',
        total: 'Total',
        tableHeaders: {
          description: 'Item',
          sku: 'SKU',
          qty: 'Quantity',
          uom: 'UoM',
          unitPrice: 'Rate',
          netAmount: 'Amount',
          lineTotal: 'Total',
        },
      },
    },
  },

  'green-minimal': {
    id: 'green-minimal',
    name: 'Green Minimal',
    description: 'Clean minimalist design with green accents and focus on readability',
    category: 'minimal',
    component: GreenMinimalTemplate,
    defaultConfig: {
      layout: {
        style: 'minimal',
        pageSize: 'A4',
        maxWidth: '900px',
        showPageNumbers: false,
      },
      theme: {
        primaryColor: 'green',
        headerBgColor: 'bg-white',
        headerTextColor: 'text-gray-900',
        borderColor: 'border-gray-200',
        accentColor: 'text-green-600',
      },
      labels: {
        invoiceNumber: 'Invoice',
        invoiceDate: 'Date',
        dueDate: 'Due',
        poNumber: 'PO',
        vendor: 'From',
        billTo: 'To',
        paymentTerms: 'Notes',
        subtotal: 'Subtotal',
        tax: 'Tax',
        total: 'Total',
        tableHeaders: {
          description: 'Description',
          qty: 'Qty',
          unitPrice: 'Rate',
          tax: 'Tax',
          lineTotal: 'Amount',
        },
      },
    },
  },

  'green-premier': {
    id: 'green-premier',
    name: 'Green Premier',
    description: 'Premier Office Supplies green template with 9-column detailed table and three-section layout',
    category: 'enterprise',
    component: GreenPremierTemplate,
    defaultConfig: {
      layout: {
        style: 'enterprise',
        pageSize: 'A4',
        maxWidth: '900px',
        showPageNumbers: true,
      },
      theme: {
        primaryColor: 'green',
        headerBgColor: 'bg-green-50',
        headerTextColor: 'text-gray-950',
        borderColor: 'border-gray-300',
        accentColor: 'text-green-600',
      },
      labels: {
        invoiceNumber: 'Invoice No #',
        invoiceDate: 'Invoice Date',
        dueDate: 'Due Date',
        poNumber: 'PO #',
        vendor: 'Vendor',
        billTo: 'For',
        paymentTerms: 'Payment Terms',
        subtotal: 'Subtotal',
        tax: 'Tax',
        total: 'Total',
        tableHeaders: {
          description: 'Item',
          sku: 'SKU',
          qty: 'Quantity',
          uom: 'Unit of Measure',
          unitPrice: 'Rate',
          netAmount: 'Amount',
          taxRate: 'TAX Rate',
          tax: 'TAX',
          lineTotal: 'Total',
        },
      },
    },
  },

  'simple-table-invoice': {
    id: 'simple-table-invoice',
    name: 'Simple Table Invoice',
    description: 'Clean table layout with boxed header sections and detailed 8-column table',
    category: 'default',
    component: SimpleTableInvoiceTemplate,
    defaultConfig: {
      layout: {
        style: 'default',
        pageSize: 'A4',
        maxWidth: '1000px',
        showPageNumbers: true,
      },
      theme: {
        primaryColor: 'gray',
        headerBgColor: 'bg-white',
        headerTextColor: 'text-gray-950',
        borderColor: 'border-gray-950',
        accentColor: 'text-gray-950',
      },
      labels: {
        invoiceNumber: 'Invoice No #',
        invoiceDate: 'Invoice Date',
        dueDate: 'Due Date',
        poNumber: 'PO #',
        vendor: 'From',
        billTo: 'For',
        paymentTerms: 'Payment Terms',
        subtotal: 'Amount',
        tax: 'TAX',
        total: 'Total',
        tableHeaders: {
          description: 'Item',
          qty: 'Quantity',
          uom: 'Unit of M',
          unitPrice: 'Rate',
          netAmount: 'Amount',
          taxRate: 'TAX Rate',
          tax: 'TAX',
          lineTotal: 'Total',
        },
      },
    },
  },

  'black-enterprise': {
    id: 'black-enterprise',
    name: 'Black Enterprise',
    description: 'Professional template with black table header, 9-column layout, and prominent bank details',
    category: 'enterprise',
    component: BlackEnterpriseTemplate,
    defaultConfig: {
      layout: {
        style: 'enterprise',
        pageSize: 'A4',
        maxWidth: '900px',
        showPageNumbers: false,
      },
      theme: {
        primaryColor: 'gray',
        headerBgColor: 'bg-black',
        headerTextColor: 'text-white',
        borderColor: 'border-gray-300',
        accentColor: 'text-gray-950',
      },
      labels: {
        invoiceNumber: 'Invoice No #',
        invoiceDate: 'Invoice Date',
        dueDate: 'Due Date',
        poNumber: 'Purchase Order',
        vendor: 'Billed By',
        billTo: 'Billed To',
        paymentTerms: 'Terms and Conditions',
        subtotal: 'Amount',
        tax: 'TAX',
        total: 'Total',
        tableHeaders: {
          description: 'Item',
          sku: 'SKU',
          qty: 'Quantity',
          uom: 'UOM',
          unitPrice: 'Rate',
          netAmount: 'Amount',
          taxRate: 'TAX Rate',
          tax: 'TAX',
          lineTotal: 'Total',
        },
      },
    },
  },
};

/**
 * Get template by ID with fallback to default
 */
export function getTemplate(templateId?: string): TemplateRegistryEntry {
  if (!templateId || !TEMPLATE_REGISTRY[templateId]) {
    return TEMPLATE_REGISTRY.default;
  }
  return TEMPLATE_REGISTRY[templateId];
}

/**
 * Merge template default config with invoice-specific overrides
 */
export function mergeTemplateConfig(
  baseConfig: TemplateConfig,
  overrides?: TemplateConfig
): TemplateConfig {
  if (!overrides) return baseConfig;

  return {
    templateId: overrides.templateId || baseConfig.templateId,
    theme: { ...baseConfig.theme, ...overrides.theme },
    labels: {
      ...baseConfig.labels,
      ...overrides.labels,
      tableHeaders: {
        ...baseConfig.labels?.tableHeaders,
        ...overrides.labels?.tableHeaders,
      },
    },
    table: { ...baseConfig.table, ...overrides.table },
    fields: overrides.fields || baseConfig.fields,
    sections: overrides.sections || baseConfig.sections,
    layout: { ...baseConfig.layout, ...overrides.layout },
    logo: { ...baseConfig.logo, ...overrides.logo },
    footer: { ...baseConfig.footer, ...overrides.footer },
    customClasses: { ...baseConfig.customClasses, ...overrides.customClasses },
  };
}

/**
 * Resolve display configuration for an invoice
 * This is the main entry point for template selection and configuration
 */
export function resolveDisplayConfig(invoice: any): {
  template: TemplateRegistryEntry;
  config: TemplateConfig;
  displayConfig: DisplayConfig;
} {
  // Get display config from invoice (or empty object if not set)
  const displayConfig: DisplayConfig = invoice.display_config || {};

  // Get template (with fallback to default)
  const template = getTemplate(displayConfig.template);

  // Merge default template config with invoice-specific overrides
  const config = mergeTemplateConfig(
    template.defaultConfig,
    displayConfig.config
  );

  return {
    template,
    config,
    displayConfig,
  };
}

/**
 * Validate template configuration
 * Returns array of validation errors, or empty array if valid
 */
export function validateTemplateConfig(config: TemplateConfig): string[] {
  const errors: string[] = [];

  // Validate required sections
  if (!config.sections || config.sections.length === 0) {
    errors.push('Template must have at least one section');
  }

  // Validate theme colors
  if (config.theme?.primaryColor) {
    const validColors = ['purple', 'blue', 'gray', 'green', 'red', 'indigo'];
    if (!validColors.includes(config.theme.primaryColor)) {
      errors.push(`Invalid primary color: ${config.theme.primaryColor}`);
    }
  }

  // Validate layout style
  if (config.layout?.style) {
    const validStyles = ['default', 'compact', 'modern', 'enterprise', 'minimal'];
    if (!validStyles.includes(config.layout.style)) {
      errors.push(`Invalid layout style: ${config.layout.style}`);
    }
  }

  return errors;
}

/**
 * Get all available templates
 */
export function getAllTemplates(): TemplateRegistryEntry[] {
  return Object.values(TEMPLATE_REGISTRY);
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: string): TemplateRegistryEntry[] {
  return Object.values(TEMPLATE_REGISTRY).filter(t => t.category === category);
}
