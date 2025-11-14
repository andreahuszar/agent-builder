/**
 * Invoice Display Configuration System
 *
 * This file defines the TypeScript interfaces for the Template Component System
 * that enables unlimited invoice layout variations while maintaining backward compatibility.
 */

/**
 * Theme configuration for colors and styling
 */
export interface ThemeConfig {
  /** Primary brand color (e.g., 'purple', 'blue', 'gray') */
  primaryColor?: 'purple' | 'blue' | 'gray' | 'green' | 'red' | 'indigo';

  /** Header background color */
  headerBgColor?: string;

  /** Header text color */
  headerTextColor?: string;

  /** Border color for sections */
  borderColor?: string;

  /** Accent color for highlights */
  accentColor?: string;
}

/**
 * Label customization configuration
 */
export interface LabelConfig {
  /** Invoice number label (e.g., "Invoice #", "Facture No.", "Bill No.") */
  invoiceNumber?: string;

  /** Invoice date label */
  invoiceDate?: string;

  /** Due date label */
  dueDate?: string;

  /** PO number label */
  poNumber?: string;

  /** Vendor label (e.g., "Vendor", "Supplier", "From") */
  vendor?: string;

  /** Bill To label (e.g., "Bill To", "Customer", "Billed To") */
  billTo?: string;

  /** Payment terms label */
  paymentTerms?: string;

  /** Subtotal label */
  subtotal?: string;

  /** Tax label (e.g., "Tax", "VAT", "GST") */
  tax?: string;

  /** Total label */
  total?: string;

  /** Line items table header labels */
  tableHeaders?: {
    lineNo?: string;
    description?: string;
    sku?: string;
    qty?: string;
    uom?: string;
    unitPrice?: string;
    discount?: string;
    netAmount?: string;
    tax?: string;
    lineTotal?: string;
  };

  /** Custom labels for vendor-specific fields */
  custom?: Record<string, string>;
}

/**
 * Table column configuration
 */
export interface TableColumnConfig {
  /** Column key matching line item property */
  key: 'lineNo' | 'description' | 'sku' | 'qty' | 'uom' | 'unitPrice' | 'discount' | 'netAmount' | 'tax' | 'lineTotal' | 'custom';

  /** Column header label */
  label: string;

  /** Column visibility */
  visible?: boolean;

  /** Column width (Tailwind class or percentage) */
  width?: string;

  /** Text alignment */
  align?: 'left' | 'center' | 'right';

  /** Custom render function key (for special formatting) */
  customRenderKey?: string;

  /** Order index for column positioning */
  order?: number;
}

/**
 * Table configuration
 */
export interface TableConfig {
  /** Column definitions */
  columns?: TableColumnConfig[];

  /** Show line numbers column */
  showLineNumbers?: boolean;

  /** Show border between rows */
  showRowBorders?: boolean;

  /** Header background color */
  headerBgColor?: string;

  /** Alternating row colors */
  alternatingRows?: boolean;

  /** Show subtotals per line */
  showLineSubtotals?: boolean;

  /** Show per-line tax breakdown */
  showPerLineTax?: boolean;
}

/**
 * Field visibility and customization
 */
export interface FieldConfig {
  /** Field key matching invoice property */
  key: string;

  /** Field visibility */
  visible?: boolean;

  /** Custom label for this field */
  label?: string;

  /** Field order in section */
  order?: number;

  /** Show field in specific sections only */
  sectionsOnly?: string[];
}

/**
 * Section configuration
 */
export interface SectionConfig {
  /** Section identifier */
  id: 'header' | 'metadata' | 'billTo' | 'lineItems' | 'totals' | 'paymentTerms' | 'bankDetails' | 'notes' | 'custom';

  /** Section visibility */
  visible?: boolean;

  /** Section order */
  order?: number;

  /** Section title */
  title?: string;

  /** Custom section content (for 'custom' type) */
  customContent?: any;

  /** Section layout variant */
  layout?: 'default' | 'twoColumn' | 'centered' | 'compact';
}

/**
 * Layout configuration
 */
export interface LayoutConfig {
  /** Overall layout style */
  style?: 'default' | 'compact' | 'modern' | 'enterprise' | 'minimal';

  /** Page size */
  pageSize?: 'A4' | 'Letter' | 'Legal';

  /** Margins */
  margins?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };

  /** Max content width */
  maxWidth?: string;

  /** Show page numbers */
  showPageNumbers?: boolean;

  /** Show watermark */
  watermark?: string;
}

/**
 * Template configuration
 */
export interface TemplateConfig {
  /** Template identifier (e.g., 'default', 'compact', 'modern-purple', 'enterprise-blue') */
  templateId?: string;

  /** Theme configuration */
  theme?: ThemeConfig;

  /** Label customization */
  labels?: LabelConfig;

  /** Table configuration */
  table?: TableConfig;

  /** Field configurations */
  fields?: FieldConfig[];

  /** Section configurations */
  sections?: SectionConfig[];

  /** Layout configuration */
  layout?: LayoutConfig;

  /** Logo URL or config */
  logo?: {
    url?: string;
    position?: 'left' | 'center' | 'right';
    width?: string;
    height?: string;
  };

  /** Footer content */
  footer?: {
    text?: string;
    showPageNumbers?: boolean;
  };

  /** Custom CSS classes */
  customClasses?: {
    container?: string;
    header?: string;
    section?: string;
    table?: string;
  };

  /** Template-level customizations */
  customizations?: {
    /** Fields to hide */
    hideFields?: string[];
    /** Fields to show (overrides hideFields) */
    showFields?: string[];
  };
}

/**
 * Display configuration - top level
 * This is stored in invoice.display_config
 */
export interface DisplayConfig {
  /** Template to use (defaults to 'default' if not specified) */
  template?: string;

  /** Template-specific configuration overrides */
  config?: TemplateConfig;

  /** Invoice-specific customizations */
  customizations?: {
    /** Hide specific fields */
    hideFields?: string[];

    /** Show specific fields that are normally hidden */
    showFields?: string[];

    /** Custom label overrides */
    labelOverrides?: Record<string, string>;

    /** Custom section content */
    customSections?: Array<{
      id: string;
      title: string;
      content: any;
      order: number;
    }>;
  };
}

/**
 * Template component props
 */
export interface TemplateProps {
  /** Invoice data */
  invoice: any;

  /** Display configuration */
  displayConfig: DisplayConfig;

  /** Merged template configuration */
  templateConfig: TemplateConfig;

  /** Shared components for reuse */
  components?: {
    InvoiceHeader?: React.ComponentType<any>;
    InvoiceMetadata?: React.ComponentType<any>;
    BillToSection?: React.ComponentType<any>;
    LineItemsTable?: React.ComponentType<any>;
    TotalsSection?: React.ComponentType<any>;
    PaymentTerms?: React.ComponentType<any>;
  };
}

/**
 * Template registry entry
 */
export interface TemplateRegistryEntry {
  /** Template ID */
  id: string;

  /** Template display name */
  name: string;

  /** Template description */
  description?: string;

  /** Default configuration for this template */
  defaultConfig: TemplateConfig;

  /** Template component */
  component: React.ComponentType<TemplateProps>;

  /** Preview thumbnail URL */
  thumbnail?: string;

  /** Template category */
  category?: 'default' | 'modern' | 'enterprise' | 'minimal' | 'custom';
}
