# Xelix Connect 2025 Demo - Project Guide

**Last Updated:** January 27, 2025 (Commit: 2ca676f)
**Purpose:** Complete context for building and maintaining the Xelix Connect 2025 demo application
**Target Audience:** Development teams, AI assistants, future maintainers

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Demo Goals & Philosophy](#demo-goals--philosophy)
3. [Technical Architecture](#technical-architecture)
4. [Frontend-First Approach](#frontend-first-approach)
5. [Mock Data System](#mock-data-system)
6. [Key Features & Workflows](#key-features--workflows)
   - [AI Candidate Suggestions](#1-ai-candidate-suggestions-primary-focus)
   - [Teaching Workflow](#2-teaching-workflow-custom-field-learning)
   - [Auto-Correction System](#3-auto-correction-system-field-swap-detection)
   - [Bank Details Verification](#4-bank-details-verification-workflow)
   - [Close Match Workflow](#5-close-match-workflow)
   - [Advanced Line Items Features](#6-advanced-line-items-features)
   - [Confidence Indicators](#7-confidence-indicators)
   - [Visual Indicator Reference](#8-visual-indicator-reference)
7. [Development Workflow](#development-workflow)
8. [Recent Major Work](#recent-major-work)
9. [Critical Guidelines](#critical-guidelines)
10. [Quick Start for New Sessions](#quick-start-for-new-sessions)

---

## Project Overview

### What This Is

**Xelix Connect 2025 Demo Application** - A sophisticated Next.js showcase for demonstrating invoice processing capabilities, AI-powered data extraction, and intelligent workflow automation. Built to demonstrate the Xelix platform's value proposition through realistic scenarios and polished UX.

### Strategic Context

This is **NOT** a production application. This is a **demo platform** designed to:
- Showcase invoice processing capabilities to potential clients
- Demonstrate AI-powered OCR and data extraction
- Illustrate exception handling and workflow automation
- Provide interactive, hands-on demonstrations at Xelix Connect 2025

### Key Distinction

```
Production System          Demo Application
─────────────────          ────────────────
Full database             → Mock data preferred
Complete workflows        → Key scenarios only
All edge cases           → Happy paths + targeted exceptions
Production deployment     → Rapid iteration & polish
```

---

## Demo Goals & Philosophy

### Primary Goal

**Make invoice processing tangible and impressive** through:
1. **Visual polish** - Clean, professional UI that feels production-ready
2. **Realistic data** - Believable invoices, vendors, amounts, scenarios
3. **Interactive demos** - Users can click, explore, and see the system respond
4. **AI showcase** - Highlight Claude Vision's invoice extraction capabilities
5. **Exception handling** - Show how the system handles missing data, mismatches, and suggestions

### Design Philosophy

**"Demo-First, Database-Later"**

We build features **frontend-first with mock data**, then connect to database when needed for production. This approach:
- ✅ Enables rapid iteration and experimentation
- ✅ Allows UI/UX work without database constraints
- ✅ Makes demos portable and reliable
- ✅ Reduces dependencies on backend services
- ❌ Is NOT suitable for production (by design)

### Core Principles

1. **Frontend Completeness** - Build full, polished frontend experiences first
2. **Mock Data Realism** - Data should be indistinguishable from real data
3. **Visual Excellence** - Every pixel matters for demo credibility
4. **Workflow Clarity** - Users should understand the flow immediately
5. **No Database Required** - Features work standalone with mock data

---

## Technical Architecture

### Technology Stack

**Core Framework:**
- **Next.js 15** with App Router - Modern React framework
- **TypeScript** - Type safety throughout
- **Tailwind CSS** - Utility-first styling with custom Xelix purple theme
- **Radix UI** - Accessible component primitives

**Backend (Available but Not Primary):**
- **PostgreSQL** - Fully functional database (for future production use)
- **Prisma ORM** - Type-safe database access
- **Docker** - Local development database

**AI Integration:**
- **Anthropic Claude** (Vision + Text) - Primary AI for invoice extraction
- **OpenAI GPT-4 Turbo** - Alternative AI integration

**Deployment:**
- **Railway** - Auto-deployment on git push
- **GitHub** - Version control

### Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend Layer                           │
│  Next.js App Router, React Components, Tailwind CSS         │
│  - Invoice detail pages                                     │
│  - Exception handling UI                                    │
│  - AI candidate suggestions                                 │
│  - Mock PDF invoice generation                              │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│                  Mock Data Layer (PRIMARY)                   │
│  Frontend-only data services for rapid development          │
│  - mockInvoiceService.ts (3 baseline invoices)             │
│  - mockPOService.ts (7 purchase orders)                     │
│  - mockDataConfig.ts (master data: vendors, users)          │
│  - invoiceDataService.ts (enrichment logic)                 │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│              Database Layer (AVAILABLE)                      │
│  PostgreSQL + Prisma (preserved for future production)      │
│  - Full schema ready                                        │
│  - Migrations working                                       │
│  - Currently NOT used in demo                               │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow Philosophy

**Current Demo Approach:**
```
User Action → Frontend Component → Mock Service → Display
             ↑                                        ↓
             └────────── State Update ───────────────┘
```

**NOT Using (But Available):**
```
User Action → API Route → Database → Response → Display
```

---

## Frontend-First Approach

### Why Frontend-First?

For demo applications, frontend-first development provides:

1. **Rapid Iteration** - No database migrations, just edit mock data
2. **Zero Dependencies** - Works without database, API keys (for basic features)
3. **Consistent Demos** - Data doesn't change between presentations
4. **Offline Capable** - Demo works without network connection
5. **Easy Customization** - Tailor data for specific demo scenarios

### How It Works

**Step 1: Build UI with Mock Data**
```typescript
// mockInvoiceService.ts - Frontend data service
export const generateBaselineInvoices = () => {
  return [
    {
      id: 'baseline-po-1',
      invoice_number: 'TS-2025-000001',
      vendor_name_snapshot: 'TechSupply Solutions Ltd',
      total: 5000,
      // ... complete invoice object
    }
  ];
};
```

**Step 2: Components Use Mock Data**
```typescript
// InvoiceDetailClient.tsx
import { getMockInvoiceById } from '@/app/services/mockInvoiceService';

const invoice = getMockInvoiceById('baseline-po-1');
// Renders immediately with realistic data
```

**Step 3: State Management in Frontend**
```typescript
// All state lives in React components
const [invoice, setInvoice] = useState(initialData);

// Updates happen locally, no API calls
const handleFieldAccept = (field, value) => {
  setInvoice(prev => ({ ...prev, [field]: value }));
};
```

### When to Use Database

Database is available and should be used when:
- ✅ Testing database schema and migrations
- ✅ Building production-ready features
- ✅ Need persistent data across sessions
- ✅ Multi-user scenarios

But for demo features:
- ❌ Avoid database complexity
- ✅ Use mock data for rapid iteration

---

## Mock Data System

### Current Status (Baseline Approach)

**As of January 2025, we've refactored to a focused baseline:**
- **5 baseline invoices** (down from 49 archived invoices)
- **1 primary generator function** (8 archived)
- **Focus:** Build demo-specific scenarios iteratively as needed
- **Each invoice demonstrates specific capabilities** - No redundant scenarios

### The 5 Baseline Invoices

1. **`baseline-po-1`** - AI Candidate Suggestions + Teaching Workflow
   - Invoice Number: `#0123-10` (abbreviated format - less obvious)
   - Vendor: TechSupply Solutions Ltd
   - Scenario: Missing invoice number with AI suggestion, custom field teaching for job_number
   - Use Case: Demonstrate AI-powered field completion and teaching workflow
   - Features: AISuggestionCard, TeachingCard, FieldConfidencePill
   - PO: PO-2025-9001

2. **`baseline-po-2`** - Advanced Line Items Showcase
   - Invoice Number: `INV-2025-0124`
   - Vendor: TechSupply Solutions Ltd
   - Scenario: Line item variance, UOM conversion, substitution suggestions, smart match
   - Use Case: Comprehensive line item intelligence demonstration
   - Features:
     - Line 3: Quantity variance (20 vs 15)
     - Line 5: Substitution suggestion (MERV 8 vs MERV 9 filters)
     - Line 6: UOM conversion (10 Days = 80 Hours)
     - Line 7: Smart match despite description difference
   - PO: PO-2025-9010

3. **`baseline-po-bank-1`** - Bank Details Verification + Auto-Correction
   - Invoice Number: `IEC-2025-5678` (system-corrected from swapped PO number)
   - Vendor: Industrial Equipment Corp
   - Scenario: Bank account change detection + swapped invoice/PO numbers
   - Use Case: Security verification workflow and auto-correction indicators
   - Features: BankDetailsVerificationPopover, AutoCorrectionIndicator
   - PO: PO-2025-7755
   - Auto-Correction: Document shows PO number where invoice # should be

4. **`baseline-nonpo-1`** - Simple non-PO workflow
   - Invoice Number: `PIT-250103001`
   - Vendor: Professional IT Services
   - Scenario: Standard non-PO invoice processing
   - Use Case: Show non-PO workflow simplicity
   - Features: Non-PO approval workflow

5. **`baseline-matched-1`** - Successfully processed invoice (Happy Path)
   - Invoice Number: `SUP-0000123`
   - Vendor: Office Supplies Direct
   - Scenario: Fully matched and processed
   - Use Case: Happy path demonstration, appears in "All" tab
   - PO: PO-2025-8001, GR: GR-2025-8001

### Mock Data Philosophy

**"Start Small, Build as Needed"**

Instead of maintaining 49 invoices with complex scenarios:
1. Keep 3 clean baseline invoices
2. Add new scenarios only when demo requires them
3. Each new invoice should demonstrate a specific capability
4. Archive old scenarios that aren't actively used

### File Structure

```
/app/services/
  ├── mockDataConfig.ts           # Master data (vendors, users, cost centers)
  ├── invoiceDataService.ts       # Pure enrichment functions
  ├── mockInvoiceService.ts       # 5 baseline invoice generators
  ├── mockPOService.ts            # 7 purchase orders (static)
  └── mockInvoiceService.archive.ts  # 49 archived invoices (reference only)

/MOCK_INVOICES_ARCHIVE.md        # Documentation of archived scenarios
```

### Key Data Structures in Mock Invoices

**OCR Extractions (AI Candidate Suggestions):**
```typescript
ocr_extractions: {
  invoice_number: {
    value: null,           // Current value (null = not found)
    confidence: 0.0,        // Confidence score (0-1)
    candidates: [           // AI-suggested alternatives
      {
        value: '#0123-10',
        confidence: 0.78,
        source: 'Claude Vision',
        reason: 'Found abbreviated reference "#0123-10" in document header...'
      }
    ]
  }
}
```

**Auto-Corrections (Field Swap Detection):**
```typescript
auto_corrections: [
  {
    field: 'invoice_number',
    original_value: 'PO-2025-7755',     // What OCR detected on document
    corrected_value: 'IEC-2025-5678',   // What system corrected it to
    reason: 'System detected swapped invoice/PO numbers based on sequential numbering pattern'
  }
]
```

**Suggested PO Match (Substitution Suggestions):**
```typescript
// In line item object:
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
```

**UOM Conversion (Unit of Measure Matching):**
```typescript
// In line item object:
uom_conversion: {
  invoice_qty: 10,
  invoice_uom: 'Days',
  po_qty: 80,
  po_uom: 'Hours',
  conversion_factor: 8,
  explanation: '8 hours per day'
}
```

**Requisitioner Information (Bank Verification):**
```typescript
requisitioner: {
  name: 'Sarah Johnson',
  email: 'sarah.johnson@company.com',
  department: 'Operations'
}
```

**Validation Warnings (Security Checks):**
```typescript
validation_warnings: [
  {
    field: 'payment_bank_details',
    category: 'risk',
    type: 'bank_details_change',
    severity: 'high',
    message: 'Bank account has changed since last invoice',
    old_account: '****5678',
    new_account: '****1234'
  }
]
```

### Adding Demo Scenarios

When you need to demonstrate a new capability:

```typescript
// 1. Add scenario to mockInvoiceService.ts
const newInvoice = {
  id: 'baseline-exception-1',
  invoice_number: 'EX-2025-0001',
  vendor_name_snapshot: 'New Demo Vendor',
  total: 12500,
  status: 'needs_info',
  // Scenario-specific fields
  missing_field: 'po_number',
  exception_reason: 'Missing PO reference'
};

// 2. Add to baseline generator
export const generateBaselineInvoices = () => {
  return [
    // existing invoices...
    newInvoice
  ].map(enrichInvoiceWithDemoData);
};
```

### Environment Control

```bash
# Enable mock data (DEFAULT for demo)
USE_MOCK_DATA=true

# Disable to use database instead
USE_MOCK_DATA=false
```

**Important:** Mock data is the DEFAULT. Database is opt-in.

---

## Key Features & Workflows

### 1. AI Candidate Suggestions (PRIMARY FOCUS)

**Purpose:** Show how AI can find and suggest values for missing fields

**Implementation:**
- **Mock Data:** `baseline-po-1` has missing `invoice_number` with AI candidate
- **Frontend Components:**
  - `EditableField.tsx` - Sparkle icon in PDF, click-to-reveal popover
  - `AISuggestionCard.tsx` - Detailed suggestion card for Details tab
  - `CandidatePopover.tsx` - Quick accept/reject in PDF
  - `DetailsTab.tsx` - "Fix Suggestion" button with inline expansion

**User Experience Flow:**
1. Open invoice `baseline-po-1`
2. See "Not found" for Invoice Number in Details tab (right)
3. Click "✨ Fix Suggestion" → Card expands with suggestion
4. In PDF (left), see "INV-2025-0123" with dashed border (unconfirmed)
5. Click sparkle in PDF → Quick popover appears
6. Accept from either location → Both panels update synchronously

**Technical Approach:**
- State managed in `InvoiceDetailClient.tsx` (top level)
- Handlers passed down to both `DocumentPreview` and `InvoiceTabs`
- `focusedFieldName` state creates yellow highlight synchronization
- All updates local (no API calls, no database)

### 2. Teaching Workflow (Custom Field Learning)

**Purpose:** Allow users to teach the AI system where to find custom fields on vendor-specific invoices

**Implementation:**
- **Mock Data:** `baseline-po-1` has custom field `job_number` with no candidates (AI doesn't know where to look)
- **Frontend Components:**
  - `TeachingCard.tsx` - Card that appears when teaching mode is needed
  - `TeachingConfirmationModal.tsx` - Modal for confirming taught value and location
  - `PendingConfirmationIndicator.tsx` - Purple dot indicator for unconfirmed taught values

**User Experience Flow:**
1. Open invoice `baseline-po-1`
2. Scroll to "Job Number" field in Details tab
3. See "Not found" with "Teach Agent" button
4. Click "Teach Agent" → Teaching card appears
5. User selects value from document (e.g., clicks in PDF)
6. System captures location context: "📍 Found in document header, right side"
7. Confirmation modal appears with "Accept & Remember" button
8. Once accepted, value is saved and AI remembers location for future invoices

**Technical Approach:**
- Location context captured from click coordinates or OCR bounding boxes
- Teaching data stored with vendor + field + location mapping
- PendingConfirmationIndicator shows purple dot until user confirms
- Future invoices from same vendor automatically check learned locations

**Key Copy:**
- Button text: "Accept & Remember" (not "Accept & Teach")
- Learning message: "🧠 I'll learn this! Once you confirm, I'll remember to look for [field] in similar locations..."

### 3. Auto-Correction System (Field Swap Detection)

**Purpose:** Detect and automatically correct common OCR errors like swapped invoice/PO numbers

**Implementation:**
- **Mock Data:** `baseline-po-bank-1` has swapped invoice and PO numbers in OCR
- **Frontend Components:**
  - `AutoCorrectionIndicator.tsx` - Lightning bolt icon (⚡) showing auto-corrections
  - `FakeInvoiceDocument.tsx` - Shows ORIGINAL values from document
  - `DetailsTab.tsx` - Shows CORRECTED values in system fields

**User Experience Flow:**
1. Open invoice `baseline-po-bank-1`
2. In Details tab (right), see correct values with lightning bolt ⚡ icons
3. In PDF (left), see SWAPPED values (what's actually on the document)
4. Click lightning bolt → Popover explains the correction
5. Popover shows:
   - "On Document": PO-2025-7755 (crossed out)
   - "Corrected To": IEC-2025-5678 (green highlight)
   - Reason: "System detected swapped invoice/PO numbers based on sequential numbering pattern"
   - Recent documents section (collapsible) showing numbering history

**Technical Approach:**
- `auto_corrections` array in mock data stores original vs corrected values
- `getDocumentDisplayValue()` helper in FakeInvoiceDocument shows original values
- System fields display corrected values
- Pattern detection based on recent vendor invoice history
- Supports invoice_number ↔ po_number swaps

**Why It Matters:**
- Common OCR error when fields are adjacent on document
- System prevents payment to wrong invoice number
- Maintains audit trail of what was actually on document vs what system used

### 4. Bank Details Verification Workflow

**Purpose:** Security check for changed bank account details before processing payment

**Implementation:**
- **Mock Data:** `baseline-po-bank-1` has `validation_warnings` with `bank_details_change` type
- **Frontend Components:**
  - `BankDetailsVerificationPopover.tsx` - Full verification workflow with email drafting
  - Shield icon (🛡️) for security-related actions

**User Experience Flow:**
1. Open invoice `baseline-po-bank-1`
2. Scroll to "Payment Bank Details" section in Details tab
3. See red "Unverified" badge
4. Click "Verify Change" link with shield icon
5. Popover opens showing:
   - Security alert (red background): "Bank account changes are a common fraud vector"
   - Compact comparison: `Previous: ****5678 → New Account: ****1234`
   - Full bank details (bank name, account name, routing number)
   - Collapsible "Draft Verification Email" section
6. Click to expand email draft → Pre-filled template appears
7. Two email actions: "Copy Email" and "Open in Helpdesk"
8. Two main actions: "Flag for Review" (red) or "Approve Change" (purple)

**Email Template Features:**
- Pre-filled with invoice details, vendor, amount, due date
- Includes PO number if available
- Security warning emphasized
- Requisitioner information (name, email) from PO
- Instructs to verify change via trusted contact method
- Professional AP team signature

**Technical Approach:**
- `requisitioner` object in mock data provides email recipient info
- Email subject: "Urgent: Bank Account Verification Required - Invoice [number]"
- Mailto link for "Open in Helpdesk" button
- Clipboard API for "Copy Email" button
- Purple theme matching other popovers
- Scrollable content (450px max-height) for viewport compatibility

**Security Design:**
- Red color scheme for alert sections
- Shield icon emphasizes security
- Email template emphasizes verification via trusted channels
- "Flag for Review" option for suspicious changes

### 5. Close Match Workflow

**Purpose:** Handle invoice numbers that closely match but don't exactly match PO references

**Implementation:**
- **Frontend Components:**
  - `CloseMatchPopover.tsx` - Shows near-match with confidence score
  - Purple-themed popover matching design system

**User Experience Flow:**
1. Invoice has slightly different invoice number format than PO
2. System detects close match (e.g., "INV-2025-0123" vs "2025-0123")
3. "Close Match" link appears in Details tab
4. Click link → Popover shows suggested match with confidence percentage
5. User can accept or reject the close match
6. If accepted, invoice number is updated to exact PO format

**Technical Approach:**
- String similarity algorithms (Levenshtein distance)
- Confidence scoring based on match quality
- Configurable threshold for what constitutes "close"
- Integration with field update system

### 6. Advanced Line Items Features

**Purpose:** Demonstrate sophisticated line item matching, conversion, and intelligence

**Implementation:** All features demonstrated in `baseline-po-2` invoice

#### 6.1 Smart Match System

**What It Is:** Auto-matching invoice lines to PO lines based on financial data despite different descriptions

**Visual Indicators:**
- 🟣 **Purple Zap Icon** - Successfully matched line
- 🔴 **Red Zap Icon** - Match has issues or was unmatched

**Components:**
- `SmartMatchPopover.tsx` - Shows match details and unmatch option
- `LineItemsPreviewPanel.tsx` - Displays zap icons on matched lines

**User Experience:**
1. Open `baseline-po-2` invoice
2. Go to line items section
3. Line 7 shows purple zap icon (⚡)
4. Click zap → Popover explains:
   - "System matched this line based on financial data despite different descriptions"
   - Shows invoice description vs PO description
   - Shows qty/price comparison
   - Option to "Unmatch" if incorrect
5. If descriptions actually match semantic intent, purple zap = good match
6. If match seems wrong, user can unmatch and system learns

**Technical Approach:**
- Matches on qty × unit_price = line_total
- Tolerates description variations
- `po_line_id` field indicates match
- Smart match flag distinguishes from exact description matches

#### 6.2 Substitution Suggestions

**What It Is:** AI suggests matching invoice lines to PO lines when products are similar but specs differ

**Visual Indicators:**
- ✨ **Sparkles Icon (Orange)** - Substitution suggestion available
- Confidence percentage badge

**Components:**
- `SubstitutionSuggestionPopover.tsx` - Detailed comparison with differences highlighted

**Example Scenario (baseline-po-2, Line 5):**
- **Invoice:** "Pleated air filters, 20×20×2, MERV 8" (50 EA @ $45)
- **PO:** "Premium pleated air filters with MERV 9 rating" (50 EA @ $45)
- **Difference:** MERV 8 vs MERV 9 specification
- **Confidence:** 78%
- **Reason:** "System detected similar items with specification differences"

**User Experience:**
1. Line shows sparkles icon with orange "Needs Review" badge
2. Click sparkles → Popover shows:
   - Suggested match with confidence %
   - Invoice description with **bold MERV 8**
   - PO description with **bold MERV 9**
   - Collapsible "Specification Differences" section
   - Qty/price comparison
3. User can "Accept Match" or "Reject"
4. If accepted, line links to PO line and badge changes to "Matched"

**Technical Approach:**
- `suggested_po_match` object in line item data
- Differences array highlights specific mismatches
- Bold text highlights in descriptions
- Confidence scoring based on similarity
- Integration with match results system

#### 6.3 UOM Conversion & Teaching

**What It Is:** Handle unit of measure differences between invoice and PO with conversion rules

**Visual Indicators:**
- ⚡ **Purple Zap with Info Badge** - UOM conversion applied

**Components:**
- `UomMatchPopover.tsx` - Shows conversion details
- `CustomRulePopover.tsx` - Interface for teaching new conversion rules
- `TeachRuleDrawer.tsx` - Conversational drawer for rule creation

**Example Scenario (baseline-po-2, Line 6):**
- **Invoice:** 10 Days @ $800 = $8,000
- **PO:** 80 Hours @ $100 = $8,000
- **Conversion:** 8 hours per day
- **Match:** Successful (financial equivalence)

**User Experience:**
1. Line shows purple zap icon
2. Click zap → Popover explains conversion:
   - "UOM Conversion Applied"
   - Invoice: 10 Days
   - PO: 80 Hours
   - Conversion: 8:1 ratio (8 hours = 1 day)
   - Financial match confirmed
3. For new conversions, "Teach Rule" button appears
4. Click "Teach Rule" → Conversational drawer opens
5. System asks questions to learn conversion:
   - "What unit are you converting FROM?"
   - "What unit are you converting TO?"
   - "What's the conversion factor?"
6. User provides answers, system saves rule for future invoices

**Technical Approach:**
- `uom_conversion` metadata in line item
- Conversion rules stored by vendor or globally
- Financial equivalence validation (qty × price must match)
- TeachRuleDrawer uses conversational UI pattern
- Rules apply automatically to future invoices

#### 6.4 Drag-and-Drop Line Reordering

**What It Is:** Allow users to reorder invoice lines via drag-and-drop

**Implementation:**
- `@dnd-kit` library for drag-and-drop functionality
- Visual feedback with purple highlight on drop target

**User Experience:**
1. Hover over line item → Cursor changes to grab
2. Click and drag line
3. Target position highlights in purple
4. Drop line → Order updates
5. Line numbers remain stable (only display position changes)

**Technical Approach:**
- `display_position` field independent of `line_no`
- DndContext wraps line items table
- Purple hover state on drop zones
- Smooth animations for reordering

#### 6.5 Variance Detection

**What It Is:** Detailed variance columns showing qty and price differences

**Visual Indicators:**
- 🟢 **Green badge with checkmark** - Within tolerance
- 🔴 **Red badge with X** - Outside tolerance

**Columns:**
- **Qty Var:** Quantity variance (invoice qty - PO qty)
- **Price Var:** Price variance (invoice price - PO price)
- **Delta:** Overall financial impact

**User Experience:**
1. Line items table shows variance columns
2. Green badges for acceptable variances
3. Red badges for variances needing approval
4. Click badge → Explanation tooltip

### 7. Confidence Indicators

**Purpose:** Show OCR confidence levels for extracted fields

**Implementation:**
- **Frontend Components:**
  - `FieldConfidencePill.tsx` - Colored pill with Radix UI tooltip
  - Tooltip shows confidence percentage and source

**Visual Design:**
- **Purple dot** - High confidence (>90%)
- **Orange dot** - Medium confidence (70-90%)
- **Red dot** - Low confidence (<70%)
- Hidden when field is manually confirmed or resolved

**User Experience:**
1. Field shows small colored dot next to label
2. Hover over dot → Tooltip appears
3. Tooltip shows: "89% confident (Claude Vision)"
4. Once user confirms field, dot disappears
5. Dots help user prioritize which fields to review first

**Technical Approach:**
- `ocr_extractions` object stores confidence per field
- Pill component takes confidence value and source
- Radix UI Tooltip for accessibility
- Conditional rendering based on field state

### 8. Visual Indicator Reference

**Quick reference for all visual indicators in the system:**

| Icon | Meaning | Color | Where Used |
|------|---------|-------|------------|
| ✨ Sparkles | AI Suggestion Available | Purple | Fields with candidates, Substitution suggestions |
| ⚡ Lightning Bolt (filled) | Auto-Correction Applied | Purple | Fields that were auto-corrected |
| ⚡ Lightning Bolt (outline) | Smart Match | Purple/Red | Line items with smart matches |
| 🛡️ Shield | Security Verification | Purple | Bank details verification |
| 🟣 Purple Dot | High Confidence | Purple | OCR confidence indicators |
| 🟠 Orange Dot | Medium Confidence | Orange | OCR confidence indicators |
| 🔴 Red Dot | Low Confidence | Red | OCR confidence indicators |
| 📍 Location Pin | Teaching Context | N/A | Shows where value was found |
| ✓ Checkmark | Within Tolerance | Green | Variance badges |
| ✗ X Mark | Outside Tolerance | Red | Variance badges |
| 🎯 Target | Pending Confirmation | Purple | Taught values awaiting confirmation |

**Button Text Standards:**
- "Accept & Remember" (Teaching workflow)
- "Fix Suggestion" (AI candidates)
- "Verify Change" (Bank details)
- "Teach Agent" (Custom fields)
- "Apply Rule" (UOM conversions)

### 9. Mock PDF Invoice Generation

**Purpose:** Display realistic invoice documents in the interface

**Implementation:**
- `FakeInvoiceDocument.tsx` - React component that renders invoice as PDF-like document
- Template system with `display_config`:
  - `template: 'compact'` - Invoice number above logo
  - `template: 'standard'` - Traditional layout
- Supports vendor-specific customizations per invoice

**Features:**
- Realistic invoice layouts (header, line items, totals)
- OCR field highlighting (when in edit mode)
- Interactive fields with AI candidate support
- Scales properly for different zoom levels

### 3. Invoice Exception Handling

**Purpose:** Show how system identifies and resolves invoice issues

**Components:**
- Exception counter in Matching tab
- Field error highlighting in Details tab
- Missing/invalid field indicators
- AI-powered resolution suggestions

**Exception Types:**
- Missing required fields (invoice number, vendor, date)
- PO mismatches (quantity, price, amount variances)
- Validation errors (date formats, amounts)

### 4. Table UX Improvements (Recent Work)

**Enhancements Made:**
- Responsive column visibility based on screen width
- Sticky headers with proper z-index layering
- Compact input fields (qty, price) in edit mode
- Visual polish and consistency

### 5. Invoice Detail Page Layout

**Two-Panel Design:**
- **Left Panel:** PDF preview with AI candidate interactions
- **Right Panel:** Tabbed interface (Details, Items, Exceptions, etc.)
- **Resizable:** Users can adjust panel sizes
- **Collapsible:** PDF can collapse for more data space

---

## Development Workflow

### Typical Feature Development

**Scenario:** Add new AI suggestion for vendor field

**Step 1: Update Mock Data**
```typescript
// mockInvoiceService.ts
{
  id: 'baseline-vendor-suggestion-1',
  vendor_name_snapshot: null,  // Missing vendor
  ocr_extractions: {
    vendor_name_snapshot: {
      value: null,
      confidence: 0.0,
      candidates: [{
        value: 'TechSupply Solutions Ltd',
        confidence: 0.85,
        source: 'Claude Vision',
        reason: 'Extracted from invoice header'
      }]
    }
  }
}
```

**Step 2: Update Display Config**
```typescript
display_config: {
  template: 'compact',
  interactiveFields: ['invoice_number', 'vendor_name_snapshot']  // Add vendor
}
```

**Step 3: Test in UI**
- No database changes needed
- No API modifications required
- Just refresh browser to see changes

**Step 4: Polish & Iterate**
- Adjust UX based on feedback
- Tweak styling and interactions
- Refine copy and messaging

### Testing Checklist

Before marking any feature complete:

1. ✅ Visual appearance matches requirements
2. ✅ Works with mock data (no database needed)
3. ✅ State updates correctly (React state management)
4. ✅ Responsive at different screen sizes
5. ✅ Accessible (keyboard navigation, screen readers)
6. ✅ No console errors or warnings
7. ✅ Code follows existing patterns

### Git Workflow

```bash
# Always work on feature branches
git checkout -b feature/ai-vendor-suggestions

# Commit frequently with clear messages
git commit -m "Add AI vendor suggestion to baseline-po-1"

# Push to trigger Railway deployment
git push origin feature/ai-vendor-suggestions

# Merge to demo-event branch for Xelix Connect
git checkout demo-event
git merge feature/ai-vendor-suggestions
git push origin demo-event
```

---

## Recent Major Work

### Bank Details Verification Workflow (Latest - Jan 27, 2025)

**Commit:** 2ca676f
**Goal:** Security workflow for verifying bank account changes before payment processing

**What We Built:**
1. **Security Alert System** - Red-themed warnings for bank account changes
2. **Email Drafting** - Pre-filled verification email with requisitioner details
3. **Compact Account Comparison** - Single-line Previous → New display
4. **Dual Action Modes** - "Copy Email" and "Open in Helpdesk" options
5. **Verification Actions** - "Flag for Review" or "Approve Change"

**Files Created:**
- `BankDetailsVerificationPopover.tsx` - Complete verification popover with email drafting

**Files Modified:**
- `DetailsTab.tsx` - Integrated bank verification with Shield icon button
- `mockInvoiceService.ts` - Added requisitioner data and validation warnings

**Key Innovation:**
- Scrollable popover (450px max-height) stays within viewport
- Purple theme matching design system
- Email template emphasizes security best practices

### Custom UOM Conversion Teaching (Jan 24, 2025)

**Commit:** d8da2dd
**Goal:** Conversational interface for teaching unit conversion rules

**What We Built:**
1. **Conversational Drawer** - Step-by-step Q&A for rule creation
2. **Custom Rule Popover** - Interface for applying/editing rules
3. **Rule Persistence** - Save rules for vendor or global application
4. **Visual Refinements** - Purple theme, smooth animations

**Files Created:**
- `CustomRulePopover.tsx` - Interface for custom conversion rules
- `TeachRuleDrawer.tsx` - Conversational drawer for rule teaching

**Files Modified:**
- `LineItemsPreviewPanel.tsx` - Integrated rule teaching workflow
- `mockInvoiceService.ts` - Added UOM conversion metadata

**Key Innovation:**
- Conversational UI makes complex configuration simple
- Rules apply automatically to future invoices
- Financial equivalence validation ensures accuracy

### Auto-Correction Indicators & Substitution Suggestions (Jan 20, 2025)

**Commit:** 4c64bab
**Goal:** Show when system auto-corrects field swaps and suggest product substitutions

**What We Built:**
1. **Auto-Correction System** - Lightning bolt indicators for corrected fields
2. **Substitution Suggestions** - Sparkles icon for similar product matches
3. **Document vs System Display** - PDF shows original, Details shows corrected
4. **Missing PO Scenario** - New invoice demonstrating missing PO workflow

**Files Created:**
- `AutoCorrectionIndicator.tsx` - Popover explaining field corrections
- `SubstitutionSuggestionPopover.tsx` - Product substitution comparison

**Files Modified:**
- `FakeInvoiceDocument.tsx` - Added `getDocumentDisplayValue()` helper
- `DetailsTab.tsx` - Integrated auto-correction indicators
- `mockInvoiceService.ts` - Added auto_corrections and suggested_po_match data
- Created `baseline-po-bank-1` and `missing-po-1` invoices

**Key Innovation:**
- Audit trail of original vs corrected values
- Pattern detection based on vendor history
- Helps users understand why system made corrections

### Smart Match Visual States (Jan 19-20, 2025)

**Commits:** 269c1ad, 61ddce4
**Goal:** Improve visual distinction between successful and problematic smart matches

**What We Built:**
1. **Color-Coded Indicators** - Purple for success, red for issues
2. **Description Scenario** - Different descriptions but same financial data
3. **UOM Scenario** - Unit conversions with visual feedback

**Files Modified:**
- `SmartMatchPopover.tsx` - Updated styling and visual states
- `LineItemsPreviewPanel.tsx` - Added zap icon color logic
- `mockInvoiceService.ts` - Enhanced line item scenarios

**Key Innovation:**
- Clear visual distinction helps users understand match quality
- Purple/red color scheme aligns with success/error patterns

### UOM Auto-Match Scenario (Jan 19, 2025)

**Commit:** 9309b79
**Goal:** Demonstrate UOM conversion capabilities

**What We Built:**
1. **UOM Conversion Popover** - Shows conversion math and ratios
2. **Financial Equivalence Display** - Confirms qty × price match
3. **Baseline-PO-2 Invoice** - Comprehensive line items showcase

**Files Created:**
- `UomMatchPopover.tsx` - Conversion details and explanation

**Files Modified:**
- `LineItemsPreviewPanel.tsx` - UOM conversion integration
- `mockInvoiceService.ts` - Added uom_conversion metadata
- Created/enhanced `baseline-po-2` with multiple line item scenarios

**Key Innovation:**
- Shows both unit conversion AND financial validation
- Helps users understand why different UOMs are acceptable

### Teaching Workflow & Confidence Indicators (Jan 18, 2025)

**Commit:** e149e3b
**Goal:** Let users teach AI where to find custom fields

**What We Built:**
1. **Teaching Cards** - Interface for teaching custom field locations
2. **Confirmation Modal** - "Accept & Remember" workflow
3. **Confidence Pills** - Visual indicators for OCR confidence levels
4. **Pending Indicators** - Show unconfirmed taught values

**Files Created:**
- `TeachingCard.tsx` - Teaching interface card
- `TeachingConfirmationModal.tsx` - Location confirmation modal
- `FieldConfidencePill.tsx` - Colored confidence indicators
- `PendingConfirmationIndicator.tsx` - Purple dot for pending confirms

**Files Modified:**
- `DetailsTab.tsx` - Integrated teaching workflow
- `mockInvoiceService.ts` - Added job_number field teaching scenario

**Key Innovation:**
- Location context: "📍 Found in document header, right side"
- AI learns from user corrections for future invoices
- Confidence pills help users prioritize review

### AI Candidate Suggestion System (Jan 17, 2025)

**Commit:** cdf8c26
**Goal:** Allow users to accept/reject AI-suggested values for missing fields

**What We Built:**
1. **Non-disruptive Details Tab UX** - "Fix Suggestion" button instead of immediate card
2. **PDF Candidate Display** - Show suggested value with dashed border (unconfirmed)
3. **Dual Interaction Points** - Accept from PDF or Details tab
4. **Synchronized Highlighting** - Opening Details card highlights field in PDF
5. **State Management** - Top-level state in InvoiceDetailClient for synchronization

**Files Created:**
- `AISuggestionCard.tsx` - Full suggestion card for Details tab
- `CandidatePopover.tsx` - Quick popover for PDF sparkle clicks
- `EditableField.tsx` - Wrapper for interactive fields with sparkle icon

**Files Modified:**
- `DetailsTab.tsx` - Added Fix Suggestion button and inline expansion
- `FakeInvoiceDocument.tsx` - Show candidate values, unconfirmed styling
- `InvoiceDetailClient.tsx` - State management and handler passing
- `mockInvoiceService.ts` - Added `ocr_extractions` to baseline-po-1

**Technical Approach:**
- Pure frontend implementation (no database, no API)
- React state management for temporary updates
- Callback props for synchronization between components
- Visual indicators (sparkles, dashed borders, yellow highlights)

### Mock PDF Invoice System

**Goal:** Scalable template system for generating realistic invoice documents

**What We Built:**
1. **Template System** - Config-driven layouts (compact, standard)
2. **Vendor Customization** - Per-invoice display preferences
3. **Interactive Fields** - Wrap any field with AI candidate support
4. **OCR Highlights** - Show field boundaries when in edit mode

**Key Innovation:**
- `display_config` object allows per-invoice customization
- `interactiveFields` array defines which fields can have AI suggestions
- `renderField` helper wraps fields conditionally based on config

### Table UX Improvements

**Goal:** Professional, responsive table experience

**What We Improved:**
1. Column visibility based on screen width
2. Sticky headers staying above content
3. Compact input fields for editing
4. Consistent styling throughout

---

## Critical Guidelines

### 1. NEVER Touch the Database for Demo Features

```typescript
// ❌ WRONG - Creating database migrations for demo features
await prisma.invoice_headers.create({ ... });

// ✅ CORRECT - Using frontend mock data
const invoice = getMockInvoiceById('baseline-po-1');
setInvoice({ ...invoice, invoice_number: 'NEW-001' });
```

**Why:** Demo features should work standalone. Database adds complexity and deployment dependencies.

### 2. ALWAYS Use Mock Data by Default

```typescript
// ❌ WRONG - Assuming database is available
const invoice = await fetchInvoiceFromDB(id);

// ✅ CORRECT - Check mock first, DB second
const invoice = isMockInvoice(id)
  ? getMockInvoiceById(id)
  : await fetchInvoiceFromDB(id);
```

### 3. State Management in Components, Not Global

```typescript
// ✅ CORRECT - Component-level state
const [invoice, setInvoice] = useState(initialInvoice);

// Updates stay local
const handleUpdate = (field, value) => {
  setInvoice(prev => ({ ...prev, [field]: value }));
};
```

**Why:** Simpler, faster, no need for Redux/global state for demo features.

### 4. Visual Polish is Critical

**Every demo feature should:**
- Look production-ready (no "TODO" or placeholder text visible)
- Have smooth transitions and animations
- Follow the Xelix purple color scheme (`bg-purple-900`, `text-purple-600`)
- Be responsive across screen sizes
- Include proper accessibility (ARIA labels, keyboard nav)

### 5. Mock Data Must Be Realistic

```typescript
// ❌ WRONG - Obvious test data
{
  vendor_name_snapshot: 'Test Vendor',
  invoice_number: 'INV-001',
  total: 100
}

// ✅ CORRECT - Realistic data
{
  vendor_name_snapshot: 'TechSupply Solutions Ltd',
  invoice_number: 'TS-2025-000001',
  total: 5247.50
}
```

### 6. Build Incrementally, Not Comprehensively

**Baseline Approach:**
- Start with 3 clean invoices
- Add scenarios only when needed for demos
- Don't build features "just in case"
- Keep the codebase lean and focused

---

## Quick Start for New Sessions

### Getting Context

When starting a new development session:

1. **Read this file** (you're doing it now!)
2. **Check recent git commits** to understand latest work
3. **Review `claude.md`** for technical architecture details
4. **Read `MOCK_DATA_SERVICES_GUIDE.md`** if working with data

### Key Files to Know

**Core Configuration:**
- `tailwind.config.ts` - Xelix purple theme, design tokens
- `.env.local` - Environment variables (USE_MOCK_DATA=true)

**Mock Data:**
- `app/services/mockInvoiceService.ts` - Invoice generators
- `app/services/mockDataConfig.ts` - Master data (vendors, users)
- `app/services/invoiceDataService.ts` - Enrichment logic

**Main UI:**
- `app/invoices/[id]/InvoiceDetailClient.tsx` - Full invoice detail page
- `app/components/invoices/FakeInvoiceDocument.tsx` - PDF generation
- `app/components/invoices/tabs/DetailsTab.tsx` - Invoice details form

**AI Features:**
- `app/components/invoices/AISuggestionCard.tsx` - AI suggestion card for missing fields
- `app/components/invoices/EditableField.tsx` - Interactive field wrapper with sparkle icon
- `app/components/invoices/CandidatePopover.tsx` - Quick accept/reject popover
- `app/components/invoices/TeachingCard.tsx` - Teaching workflow interface
- `app/components/invoices/TeachingConfirmationModal.tsx` - Location confirmation modal
- `app/components/invoices/FieldConfidencePill.tsx` - OCR confidence indicators
- `app/components/invoices/PendingConfirmationIndicator.tsx` - Unconfirmed value indicator

**Auto-Correction & Security:**
- `app/components/invoices/AutoCorrectionIndicator.tsx` - Field swap detection popover
- `app/components/invoices/BankDetailsVerificationPopover.tsx` - Bank verification workflow
- `app/components/invoices/CloseMatchPopover.tsx` - Near-match suggestions
- `app/components/invoices/FraudRiskBanner.tsx` - High-risk jurisdiction alerts

**Line Items Intelligence:**
- `app/components/invoices/preview/LineItemsPreviewPanel.tsx` - Main line items display with drag-drop
- `app/components/invoices/SmartMatchPopover.tsx` - Description-based matching
- `app/components/invoices/SubstitutionSuggestionPopover.tsx` - Product substitution suggestions
- `app/components/invoices/UomMatchPopover.tsx` - UOM conversion display
- `app/components/invoices/CustomRulePopover.tsx` - Custom conversion rules interface
- `app/components/invoices/TeachRuleDrawer.tsx` - Conversational rule teaching

### Common Commands

```bash
# Start development server (ALWAYS use port 3001)
PORT=3001 npm run dev

# View mock invoice
# Navigate to: http://localhost:3001/invoices/baseline-po-1

# Check database (if needed)
npm run db:studio

# Run visual tests (important for UX changes)
npm run test:visual

# Commit and deploy
git add .
git commit -m "Clear description of changes"
git push origin demo-event  # Auto-deploys to Railway
```

### Finding Invoice Data

**View baseline invoices:**
```typescript
// In browser console or Node
import { getAllMockInvoices } from '@/app/services/mockInvoiceService';
console.log(getAllMockInvoices());
// Returns 5 invoices: baseline-po-1, baseline-po-2, baseline-po-bank-1, baseline-nonpo-1, baseline-matched-1
```

**Find specific invoice:**
```typescript
import { getMockInvoiceById } from '@/app/services/mockInvoiceService';
const invoice = getMockInvoiceById('baseline-po-1');
console.log(invoice);
```

### Understanding the Demo Flow

**Comprehensive Demo Scenario (baseline-po-1):**

1. **Open Invoice List** → Shows mix of invoices with status indicators
2. **Click "Baseline PO Invoice"** → Opens `baseline-po-1` detail page
3. **See Exception Badge** → "Needs Info" status (2 missing fields)
4. **Details Tab** → Shows "Not found" for Invoice Number and Job Number

**AI Candidate Suggestion Flow:**
5. **Invoice Number Field** → See "Fix Suggestion" button with sparkle icon
6. **Click "Fix Suggestion"** → Card expands showing AI suggestion "#0123-10"
7. **PDF Synchronization** → Field pulses yellow highlight in left panel
8. **Review Confidence** → 78% confident, Claude Vision source shown
9. **Accept Suggestion** → Both panels update, exception counter decreases

**Teaching Workflow Flow:**
10. **Job Number Field** → See "Teach Agent" button (AI has no candidates)
11. **Click "Teach Agent"** → Teaching card appears
12. **Select Value from PDF** → Click "JOB-2025-042" in document header
13. **Confirmation Modal** → Shows value with location context "📍 Found in document header, right side"
14. **Click "Accept & Remember"** → System learns location for future invoices
15. **Result** → Both exceptions resolved, invoice ready for processing

**Line Items Demo Scenario (baseline-po-2):**

1. **Open `baseline-po-2` Invoice** → Shows line items with various match states
2. **Line 3** → Red variance badge (qty mismatch: 20 vs 15)
3. **Line 5** → Orange sparkles icon for substitution suggestion (MERV 8 vs MERV 9)
4. **Click Sparkles** → Popover shows product comparison with confidence 78%
5. **Line 6** → Purple zap icon for UOM conversion (10 Days = 80 Hours)
6. **Click Zap** → Shows conversion ratio and financial equivalence
7. **Line 7** → Purple zap for smart match (different descriptions, same financial data)
8. **Click Zap** → Explains match despite description difference

**Bank Details Verification Flow (baseline-po-bank-1):**

1. **Open `baseline-po-bank-1` Invoice** → Shows bank details change alert
2. **Details Tab** → See lightning bolt ⚡ on Invoice Number (auto-corrected)
3. **Click Lightning Bolt** → Popover shows original vs corrected values
4. **PDF Preview** → Document shows SWAPPED values (what's actually printed)
5. **Bank Details Section** → Red "Unverified" badge appears
6. **Click "Verify Change"** → Bank verification popover opens
7. **Security Alert** → Red warning about fraud risk
8. **Account Comparison** → Previous: ****5678 → New: ****1234
9. **Expand Email Draft** → Pre-filled verification email appears
10. **Click "Copy Email"** → Email copied to clipboard for helpdesk ticket
11. **Click "Approve Change"** → Bank details verified, invoice proceeds to approval

**Result:** Comprehensive demonstration of all AI and workflow features

### What to Build Next

**Focus Areas for Xelix Connect 2025:**

1. **More AI Suggestions** - Vendor, dates, amounts
2. **Exception Scenarios** - PO mismatches, validation errors
3. **Visual Polish** - Animations, transitions, micro-interactions
4. **Mobile Responsive** - Demo on tablets if needed
5. **Demo Scripts** - Documented talking points for each feature

**What NOT to Build:**

- ❌ Complex database features
- ❌ Full authentication system
- ❌ Multi-tenant architecture
- ❌ Email integration
- ❌ Payment processing

**Remember:** This is a demo, not a production system. Focus on polish, not completeness.

---

## Summary for AI Assistants

When asked to work on this project, remember:

### Core Understanding

1. **This is a demo** - Optimize for visual impact and rapid iteration
2. **Frontend-first** - Build with mock data, avoid database complexity
3. **3 baseline invoices** - Start minimal, add scenarios as needed
4. **AI candidates** - Primary demo feature showing Claude Vision value
5. **No database** - Features work standalone with React state

### Decision Framework

**Should I use the database?**
- For demo features: **No** (use mock data)
- For production testing: **Yes** (database is available)

**Should I create a new invoice scenario?**
- Does it demonstrate a unique capability? **Yes**
- Is it for "just in case"? **No**

**Should I add a new component?**
- Does it improve the demo experience? **Yes**
- Is it for future functionality? **No**

### Code Patterns to Follow

```typescript
// ✅ Mock data first
const invoice = getMockInvoiceById('baseline-po-1');

// ✅ Component state
const [invoice, setInvoice] = useState(initialInvoice);

// ✅ Frontend updates
const handleFieldAccept = (field, value) => {
  setInvoice(prev => ({ ...prev, [field]: value }));
};

// ✅ Visual polish
className="border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
```

### Files to Reference

1. **Project overview:** `XELIX_CONNECT_DEMO_GUIDE.md` (this file)
2. **Technical details:** `claude.md`
3. **Mock data system:** `MOCK_DATA_SERVICES_GUIDE.md`
4. **Design system:** `tailwind.config.ts`

---

## Conclusion

This demo application showcases Xelix's invoice processing platform through **polished, interactive experiences built frontend-first**. By focusing on realistic mock data, visual excellence, and key workflows, we create compelling demonstrations without the complexity of full production systems.

**Remember:** Every feature should answer "How does this make the demo more impressive?" If it doesn't, it's probably not needed.

**Happy coding! 🎨**

