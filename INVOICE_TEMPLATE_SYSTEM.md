# Invoice Template System Documentation

## Overview

The Invoice Template System is a flexible, component-based architecture for rendering invoices in multiple visual styles while maintaining consistent data access, field selection, and auto-correction highlighting.

## Architecture

### Core Concept

The system separates **data** from **presentation** using:
- **Templates**: React components that define how invoices look
- **Registry**: Central configuration mapping template IDs to components
- **Props Interface**: Standardized props passed to all templates
- **Shared Components**: Common functionality (FieldWithOCR, SelectableText, etc.)

### Directory Structure

```
/app/components/invoices/
├── templates/
│   ├── registry.ts                    # Central template registry
│   ├── DefaultTemplate.tsx            # Standard layout (backward compatible)
│   ├── PurpleModernTemplate.tsx       # Modern two-column with purple theme
│   ├── BlueEnterpriseTemplate.tsx     # Professional 9-column enterprise layout
│   ├── GreenMinimalTemplate.tsx       # Clean minimalist design
│   └── GrayCompactTemplate.tsx        # Space-efficient for long invoices
├── FakeInvoiceDocument.tsx            # Template renderer + shared components
└── DocumentPreview.tsx                # Preview wrapper with zoom controls
```

---

## Template Registry System

### Location
**File:** `/app/components/invoices/templates/registry.ts`

### Structure

```typescript
export const TEMPLATE_REGISTRY: Record<string, TemplateRegistryEntry> = {
  'template-id': {
    id: 'template-id',
    name: 'Display Name',
    description: 'Template description',
    category: 'default' | 'modern' | 'enterprise' | 'minimal',
    component: TemplateComponent,
    defaultConfig: {
      layout: { /* layout settings */ },
      theme: { /* color scheme */ },
      labels: { /* field labels */ },
      sections: [ /* section config */ ]
    }
  }
}
```

### Available Templates

| Template ID | Name | Description | Use Case |
|-------------|------|-------------|----------|
| `default` | Default Template | Standard layout with all sections | General purpose, backward compatible |
| `compact` | Compact Template | Centered layout, compact spacing | Simple invoices |
| `purple-modern` | Purple Modern | Two-column with purple theme & VAT | Modern businesses, VAT invoices |
| `blue-enterprise` | Blue Enterprise | 9-column table with SKU codes | Enterprise, detailed inventory |
| `green-minimal` | Green Minimal | Clean minimalist design | Service-based businesses |
| `gray-compact` | Gray Compact | Space-efficient layout | Long invoices with many line items |

### Registry Functions

```typescript
// Get template by ID with fallback to default
const template = getTemplate('purple-modern');

// Get all available templates
const allTemplates = getAllTemplates();

// Get templates by category
const modernTemplates = getTemplatesByCategory('modern');

// Merge configs (base + overrides)
const config = mergeTemplateConfig(baseConfig, overrides);

// Resolve display config for invoice
const { template, config, displayConfig } = resolveDisplayConfig(invoice);

// Validate template configuration
const errors = validateTemplateConfig(config);
```

---

## Creating a New Template

### Step 1: Create Template Component

**File:** `/app/components/invoices/templates/MyNewTemplate.tsx`

```typescript
'use client';

import React from 'react';
import { TemplateProps } from '@/types/invoice-display';
import { formatAddressLines } from '@/app/lib/addressFormatter';

interface ExtendedTemplateProps extends TemplateProps {
  formatCurrency: (amount: number, currency?: string) => string;
  formatDate: (dateString: string) => string;
  getDocumentDisplayValue: (fieldName: string, currentValue: any) => any;
  FieldWithOCR: React.ComponentType<{
    children: React.ReactNode;
    fieldName: string;
    className?: string
  }>;
  SelectableText: React.ComponentType<{
    children: React.ReactNode;
    label: string
  }>;
  renderField: (fieldName: string, content: React.ReactNode, className?: string) => React.ReactNode;
  focusedFieldName?: string | null;
}

export function MyNewTemplate({
  invoice,
  displayConfig,
  templateConfig,
  components,
  formatCurrency,
  formatDate,
  getDocumentDisplayValue,
  FieldWithOCR,
  SelectableText,
  renderField,
  focusedFieldName,
}: ExtendedTemplateProps) {
  // Get labels from config
  const labels = templateConfig.labels || {};
  const labelText = {
    invoiceNumber: labels.invoiceNumber || 'Invoice #',
    invoiceDate: labels.invoiceDate || 'Date',
    // ... other labels
  };

  return (
    <div className="max-w-4xl mx-auto bg-white p-8">
      {/* Your custom layout here */}

      {/* Example: Display invoice number with OCR highlighting */}
      <FieldWithOCR fieldName="invoice_number">
        <span>{getDocumentDisplayValue('invoice_number', invoice.invoice_number)}</span>
      </FieldWithOCR>

      {/* Example: Make text selectable for teaching AI */}
      <SelectableText label="Vendor Name">
        {invoice.vendor_name_snapshot}
      </SelectableText>

      {/* Example: Line items */}
      {invoice.lines?.map((item: any, index: number) => (
        <tr key={index}>
          <td>
            <SelectableText label="Item Description">
              {item.description}
            </SelectableText>
          </td>
          <td>
            <SelectableText label="Quantity">
              {item.qty}
            </SelectableText>
          </td>
          <td>{formatCurrency(item.unit_price, invoice.currency)}</td>
        </tr>
      ))}
    </div>
  );
}
```

### Step 2: Register Template

**File:** `/app/components/invoices/templates/registry.ts`

```typescript
import { MyNewTemplate } from './MyNewTemplate';

export const TEMPLATE_REGISTRY: Record<string, TemplateRegistryEntry> = {
  // ... existing templates

  'my-new-template': {
    id: 'my-new-template',
    name: 'My New Template',
    description: 'Custom template for specific use case',
    category: 'modern',
    component: MyNewTemplate,
    defaultConfig: {
      layout: {
        style: 'modern',
        pageSize: 'A4',
        maxWidth: '900px',
        showPageNumbers: false,
      },
      theme: {
        primaryColor: 'blue',
        headerBgColor: 'bg-blue-900',
        headerTextColor: 'text-white',
        borderColor: 'border-blue-200',
        accentColor: 'text-blue-900',
      },
      labels: {
        invoiceNumber: 'Invoice #',
        invoiceDate: 'Date',
        dueDate: 'Due',
        vendor: 'From',
        billTo: 'To',
        subtotal: 'Subtotal',
        tax: 'Tax',
        total: 'Total',
        tableHeaders: {
          description: 'Description',
          qty: 'Qty',
          unitPrice: 'Price',
          lineTotal: 'Amount',
        },
      },
    },
  },
};
```

### Step 3: Assign Template to Invoice

```typescript
// In mock data or database
const invoice = {
  // ... invoice data
  display_config: {
    template: 'my-new-template',
    config: {
      // Optional overrides
      labels: {
        invoiceNumber: 'Custom Label'
      }
    }
  }
};
```

---

## Shared Components

### FieldWithOCR

Wraps fields that may have OCR confidence highlighting or auto-correction indicators.

```typescript
<FieldWithOCR fieldName="invoice_number">
  <span>{invoice.invoice_number}</span>
</FieldWithOCR>
```

**Features:**
- Shows confidence pills for AI-extracted fields
- Highlights when field is focused (auto-correction popover open)
- Applies orange ring + pulse animation when `focusedFieldName` matches

### SelectableText

Makes text clickable in selection mode for teaching AI custom field locations.

```typescript
<SelectableText label="Customer Name">
  {invoice.bill_to_snapshot?.legal_name}
</SelectableText>
```

**Features:**
- Wraps text with hover effects (`cursor-crosshair hover:bg-purple-100`)
- Calls `onValueSelected(value, context)` when clicked
- Context includes the label: `"Found near label 'Customer Name'"`
- Only active when `isSelectionMode === true`

### Helper Functions

```typescript
// Format currency with proper symbol
formatCurrency(1234.56, 'GBP') // "£1,234.56"

// Format date string
formatDate('2025-11-08') // "Nov 8, 2025"

// Get display value (handles auto-corrections)
getDocumentDisplayValue('invoice_number', invoice.invoice_number)
// Returns corrected value if auto-correction exists

// Format address lines
formatAddressLines(invoice.vendor_address_snapshot)
// Returns array of formatted address lines
```

---

## Template Features

### Auto-Correction Support

Templates can detect and respond to auto-corrected fields:

```typescript
// Check if field is auto-corrected
const isAutoCorrected = invoice.auto_corrections?.find(
  (c: any) => c.field === 'invoice_number'
);

// Hide field in header if auto-corrected from footer
{!isAutoCorrected && (
  <div>
    <FieldWithOCR fieldName="invoice_number">
      {invoice.invoice_number}
    </FieldWithOCR>
  </div>
)}

// Highlight field when popover is open
<span className={
  focusedFieldName === 'invoice_number'
    ? 'bg-amber-200 px-1.5 py-0.5 rounded ring-2 ring-orange-400 ring-offset-2 animate-pulse'
    : ''
}>
  {invoice.invoice_number}
</span>
```

### Responsive Layout

Templates should handle different zoom levels and container sizes:

```typescript
<div className="max-w-4xl mx-auto bg-white p-8">
  {/* Content scales with zoom */}
</div>
```

### Conditional Rendering

Hide/show sections based on data availability:

```typescript
{invoice.po_numbers_cached?.[0] && (
  <div>
    <span>PO #:</span>
    <FieldWithOCR fieldName="po_numbers_cached">
      {invoice.po_numbers_cached[0]}
    </FieldWithOCR>
  </div>
)}
```

---

## Key Data Structures

### Invoice Object

```typescript
interface Invoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  vendor_name_snapshot: string;
  vendor_address_snapshot: any;
  vendor_tax_id_snapshot?: string;
  vendor_email?: string;
  vendor_phone?: string;
  bill_to_snapshot?: {
    legal_name: string;
    address: any;
    tax_id?: string;
    email?: string;
    phone?: string;
  };
  currency: string;
  subtotal: number;
  tax_total: number;
  total: number;
  lines?: LineItem[];
  customer_no?: string; // REF No
  po_numbers_cached?: string[];
  display_config?: {
    template: string;
    config?: Partial<TemplateConfig>;
  };
  auto_corrections?: AutoCorrection[];
}
```

### Auto-Correction Object

```typescript
interface AutoCorrection {
  field: string;
  original_value: string;
  corrected_value: string;
  reason: string;
  vendor_name: string;
  document_type: 'invoice' | 'po';
  recent_documents?: RecentDocument[];
}

interface RecentDocument {
  number: string;
  date: string;
  amount: string;
  is_current?: boolean;
}
```

### Line Item Object

```typescript
interface LineItem {
  line_no?: number;
  description: string;
  sku?: string;
  qty: number;
  uom?: string;
  unit_price: number;
  discount_amount?: number;
  net_amount: number;
  tax_rate?: number;
  tax_amount: number;
  line_total: number;
  notes?: string;
}
```

---

## Configuration Options

### Layout Config

```typescript
layout: {
  style: 'default' | 'compact' | 'modern' | 'enterprise' | 'minimal',
  pageSize: 'A4' | 'Letter',
  maxWidth: string, // CSS width value
  showPageNumbers: boolean,
  invoiceNumberPlacement?: 'above-logo' | 'header',
}
```

### Theme Config

```typescript
theme: {
  primaryColor: 'purple' | 'blue' | 'gray' | 'green' | 'red' | 'indigo',
  headerBgColor: string, // Tailwind class
  headerTextColor: string, // Tailwind class
  borderColor: string, // Tailwind class
  accentColor: string, // Tailwind class
}
```

### Labels Config

```typescript
labels: {
  invoiceNumber?: string,
  invoiceDate?: string,
  dueDate?: string,
  poNumber?: string,
  refNo?: string,
  vendor?: string,
  billTo?: string,
  paymentTerms?: string,
  subtotal?: string,
  tax?: string,
  total?: string,
  tableHeaders?: {
    lineNo?: string,
    sku?: string,
    description?: string,
    qty?: string,
    uom?: string,
    unitPrice?: string,
    discount?: string,
    netAmount?: string,
    tax?: string,
    lineTotal?: string,
  }
}
```

---

## Data Flow

### 1. Invoice Loading

```
Server → InvoiceDetailClient → DocumentPreview → FakeInvoiceDocument
```

- Server component fetches invoice data
- `InvoiceDetailClient` maintains state (including `originalInvoice` for static preview)
- `DocumentPreview` handles zoom and controls
- `FakeInvoiceDocument` renders the template

### 2. Template Selection

```typescript
// In FakeInvoiceDocument.tsx
const { template, config, displayConfig } = resolveDisplayConfig(invoice);
const TemplateComponent = template.component;
```

### 3. Props Passing

```typescript
<TemplateComponent
  invoice={invoice}
  displayConfig={displayConfig}
  templateConfig={config}
  components={sharedComponents}
  formatCurrency={formatCurrency}
  formatDate={formatDate}
  getDocumentDisplayValue={getDocumentDisplayValue}
  FieldWithOCR={FieldWithOCR}
  SelectableText={SelectableText}
  renderField={renderField}
  focusedFieldName={focusedFieldName} // For auto-correction highlighting
/>
```

### 4. Field Interaction Flow

**Selection Mode (Teaching AI):**
```
User clicks "Point to Value"
  → setIsSelectionMode(true)
  → User hovers over text (cursor changes to crosshair)
  → User clicks SelectableText
  → handleValueSelected(value, context)
  → Shows TeachingConfirmationModal
```

**Auto-Correction Indicator:**
```
User hovers over field with AutoCorrectionIndicator
  → Popover opens
  → onFieldFocus('invoice_number') called
  → focusedFieldName state updated
  → Template highlights matching field in footer
```

---

## Common Patterns

### Hide Header Field if Auto-Corrected

```typescript
{/* Hide invoice number in header if it's auto-corrected (from footer) */}
{!invoice.auto_corrections?.find((c: any) => c.field === 'invoice_number') && (
  <div>
    <FieldWithOCR fieldName="invoice_number">
      <span>{getDocumentDisplayValue('invoice_number', invoice.invoice_number)}</span>
    </FieldWithOCR>
  </div>
)}
```

### Highlight Footer Field When Popover Open

```typescript
<SelectableText label="Invoice Number">
  <span className={
    focusedFieldName === 'invoice_number'
      ? 'bg-amber-200 px-1.5 py-0.5 rounded ring-2 ring-orange-400 ring-offset-2 animate-pulse'
      : ''
  }>
    {getDocumentDisplayValue('invoice_number', invoice.invoice_number)}
  </span>
</SelectableText>
```

### Make All Text Selectable

```typescript
{/* Vendor Information */}
<SelectableText label="Vendor Name">
  {invoice.vendor_name_snapshot}
</SelectableText>

{/* Line Items */}
{invoice.lines?.map((item, index) => (
  <tr key={index}>
    <td>
      <SelectableText label="Item Description">
        {item.description}
      </SelectableText>
    </td>
    <td>
      <SelectableText label="Quantity">
        {item.qty}
      </SelectableText>
    </td>
  </tr>
))}
```

### Line Item Calculations

```typescript
{invoice.lines?.map((item: any, index: number) => {
  const netAmount = item.net_amount || (item.qty * item.unit_price);
  const taxRate = item.tax_rate || 20; // Default VAT rate
  const taxAmount = item.tax_amount || (netAmount * taxRate / 100);
  const lineTotal = netAmount + taxAmount;

  return (
    <tr key={index}>
      {/* Render line item */}
    </tr>
  );
})}
```

---

## Best Practices

### 1. Always Wrap Field Values

```typescript
// ✅ Good - Uses FieldWithOCR for OCR confidence
<FieldWithOCR fieldName="invoice_number">
  <span>{invoice.invoice_number}</span>
</FieldWithOCR>

// ❌ Bad - Direct rendering, no highlighting
<span>{invoice.invoice_number}</span>
```

### 2. Make Important Text Selectable

```typescript
// ✅ Good - User can teach AI where to find this
<SelectableText label="Vendor Address">
  {addressLine}
</SelectableText>

// ❌ Bad - User can't interact with this text
<p>{addressLine}</p>
```

### 3. Use Consistent Styling

```typescript
// ✅ Good - Uses Tailwind classes
<span className="font-bold text-gray-950">
  {invoice.total}
</span>

// ❌ Bad - Inline styles
<span style={{ fontWeight: 'bold', color: '#000' }}>
  {invoice.total}
</span>
```

### 4. Handle Missing Data Gracefully

```typescript
// ✅ Good - Provides fallback
{invoice.vendor_email || 'No email provided'}

// ✅ Good - Conditional rendering
{invoice.po_numbers_cached?.[0] && (
  <div>PO: {invoice.po_numbers_cached[0]}</div>
)}

// ❌ Bad - Could crash with undefined
{invoice.po_numbers_cached[0]}
```

### 5. Use Helper Functions

```typescript
// ✅ Good - Consistent formatting
{formatCurrency(invoice.total, invoice.currency)}

// ❌ Bad - Manual formatting
{invoice.currency === 'GBP' ? '£' : '$'}{invoice.total.toFixed(2)}
```

### 6. Preserve Original Invoice Data

Templates receive the **original** (frozen) invoice data for preview:

```typescript
// In InvoiceDetailClient.tsx
const [originalInvoice] = useState(initialInvoice); // Frozen reference
const [invoice, setInvoice] = useState(initialInvoice); // Editable copy

// Preview uses originalInvoice
<DocumentPreview invoiceData={originalInvoice} />

// Right panel uses editable invoice
<InvoiceTabs invoiceData={invoice} />
```

This ensures the preview doesn't update when users edit line items in the right panel.

---

## Troubleshooting

### Issue: Template Not Rendering

**Check:**
1. Is template registered in `TEMPLATE_REGISTRY`?
2. Does component export match registry import?
3. Are all required props in `ExtendedTemplateProps` interface?

### Issue: Fields Not Highlighting

**Check:**
1. Is field wrapped with `FieldWithOCR`?
2. Is `focusedFieldName` prop being passed to template?
3. Is field name matching exactly (e.g., `'invoice_number'`)?

### Issue: Text Not Selectable

**Check:**
1. Is text wrapped with `SelectableText`?
2. Is `isSelectionMode` true?
3. Is `onValueSelected` callback provided?

### Issue: Auto-Correction Not Working

**Check:**
1. Does invoice have `auto_corrections` array?
2. Does auto-correction object have correct `field` name?
3. Is `getDocumentDisplayValue` being used for display?

### Issue: Dates/Currency Wrong Format

**Check:**
1. Are you using `formatDate()` helper?
2. Are you using `formatCurrency()` helper?
3. Is correct currency code passed as second argument?

---

## Future Enhancements

### Planned Features

1. **Template Builder UI**: Visual editor for creating templates
2. **Per-Vendor Templates**: Assign templates based on vendor
3. **Conditional Sections**: Show/hide sections based on data
4. **Multi-Page Support**: Handle long invoices across multiple pages
5. **PDF Export**: Export templates directly to PDF
6. **Template Versioning**: Track template changes over time

### Extension Points

```typescript
// Add custom formatters
const customFormatters = {
  formatPhoneNumber: (phone: string) => { /* ... */ },
  formatTaxId: (taxId: string) => { /* ... */ },
};

// Add custom validators
const customValidators = {
  validateInvoiceNumber: (invoiceNumber: string) => { /* ... */ },
};

// Add custom sections
const customSections = [
  { id: 'shipping', component: ShippingSection },
  { id: 'payment-instructions', component: PaymentInstructionsSection },
];
```

---

## Quick Reference

### File Locations

| Purpose | File Path |
|---------|-----------|
| Template Registry | `/app/components/invoices/templates/registry.ts` |
| Template Renderer | `/app/components/invoices/FakeInvoiceDocument.tsx` |
| Preview Wrapper | `/app/components/invoices/DocumentPreview.tsx` |
| Client Controller | `/app/invoices/[id]/InvoiceDetailClient.tsx` |
| Mock Data | `/app/services/mockInvoiceService.ts` |
| Type Definitions | `/types/invoice-display.ts` |

### Key Functions

```typescript
// Get template
getTemplate(templateId: string): TemplateRegistryEntry

// Resolve config
resolveDisplayConfig(invoice: any): { template, config, displayConfig }

// Merge configs
mergeTemplateConfig(baseConfig, overrides): TemplateConfig

// Validate config
validateTemplateConfig(config): string[]

// Format helpers
formatCurrency(amount: number, currency?: string): string
formatDate(dateString: string): string
formatAddressLines(address: any): string[]
```

### Common Props

```typescript
invoice          // Invoice data object
displayConfig    // Display configuration
templateConfig   // Template configuration (merged)
formatCurrency   // Currency formatter
formatDate       // Date formatter
getDocumentDisplayValue // Gets display value (handles auto-corrections)
FieldWithOCR     // Field wrapper with highlighting
SelectableText   // Text wrapper for AI training
renderField      // Generic field renderer
focusedFieldName // Currently focused field (for auto-correction highlighting)
```

---

## Example: Complete Minimal Template

```typescript
'use client';

import React from 'react';
import { TemplateProps } from '@/types/invoice-display';

interface ExtendedTemplateProps extends TemplateProps {
  formatCurrency: (amount: number, currency?: string) => string;
  formatDate: (dateString: string) => string;
  getDocumentDisplayValue: (fieldName: string, currentValue: any) => any;
  FieldWithOCR: React.ComponentType<{ children: React.ReactNode; fieldName: string; className?: string }>;
  SelectableText: React.ComponentType<{ children: React.ReactNode; label: string }>;
  renderField: (fieldName: string, content: React.ReactNode, className?: string) => React.ReactNode;
  focusedFieldName?: string | null;
}

export function MinimalTemplate({
  invoice,
  formatCurrency,
  formatDate,
  getDocumentDisplayValue,
  FieldWithOCR,
  SelectableText,
}: ExtendedTemplateProps) {
  return (
    <div className="max-w-2xl mx-auto bg-white p-8">
      {/* Header */}
      <h1 className="text-2xl font-bold mb-4">Invoice</h1>

      {/* Invoice Number */}
      <div className="mb-4">
        <FieldWithOCR fieldName="invoice_number">
          <SelectableText label="Invoice Number">
            {getDocumentDisplayValue('invoice_number', invoice.invoice_number)}
          </SelectableText>
        </FieldWithOCR>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <span className="font-semibold">Date:</span>
          <FieldWithOCR fieldName="invoice_date">
            {formatDate(invoice.invoice_date)}
          </FieldWithOCR>
        </div>
        <div>
          <span className="font-semibold">Due:</span>
          <FieldWithOCR fieldName="due_date">
            {formatDate(invoice.due_date)}
          </FieldWithOCR>
        </div>
      </div>

      {/* Vendor & Customer */}
      <div className="grid grid-cols-2 gap-8 mb-6">
        <div>
          <h3 className="font-semibold mb-2">From</h3>
          <SelectableText label="Vendor Name">
            {invoice.vendor_name_snapshot}
          </SelectableText>
        </div>
        <div>
          <h3 className="font-semibold mb-2">To</h3>
          <SelectableText label="Customer Name">
            {invoice.bill_to_snapshot?.legal_name || 'N/A'}
          </SelectableText>
        </div>
      </div>

      {/* Line Items */}
      <table className="w-full mb-6">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2">Description</th>
            <th className="text-right py-2">Qty</th>
            <th className="text-right py-2">Price</th>
            <th className="text-right py-2">Total</th>
          </tr>
        </thead>
        <tbody>
          {invoice.lines?.map((item: any, index: number) => (
            <tr key={index} className="border-b">
              <td className="py-2">
                <SelectableText label="Item Description">
                  {item.description}
                </SelectableText>
              </td>
              <td className="text-right">
                <SelectableText label="Quantity">
                  {item.qty}
                </SelectableText>
              </td>
              <td className="text-right">
                {formatCurrency(item.unit_price, invoice.currency)}
              </td>
              <td className="text-right font-semibold">
                {formatCurrency(item.line_total, invoice.currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-end">
        <div className="w-64">
          <div className="flex justify-between mb-2">
            <span>Subtotal:</span>
            <FieldWithOCR fieldName="subtotal">
              {formatCurrency(invoice.subtotal, invoice.currency)}
            </FieldWithOCR>
          </div>
          <div className="flex justify-between mb-2">
            <span>Tax:</span>
            <FieldWithOCR fieldName="tax_total">
              {formatCurrency(invoice.tax_total, invoice.currency)}
            </FieldWithOCR>
          </div>
          <div className="flex justify-between font-bold text-lg pt-2 border-t">
            <span>Total:</span>
            <FieldWithOCR fieldName="total">
              {formatCurrency(invoice.total, invoice.currency)}
            </FieldWithOCR>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## Support

For questions or issues with the template system:
1. Check this documentation
2. Review existing templates for examples
3. Check type definitions in `/types/invoice-display.ts`
4. Test with mock invoices in `/app/services/mockInvoiceService.ts`
