# Xelix Connect 2025 Demo - Project Guide

**Last Updated:** Nov 5, 2025
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

**Stack:** Next.js 15 + TypeScript + Tailwind CSS + Radix UI components. Anthropic Claude Vision for invoice extraction. PostgreSQL database available but not primary.

**Architecture:** Frontend-first with three layers:
1. **Frontend Layer** - React components, invoice pages, AI features
2. **Mock Data Layer (PRIMARY)** - Frontend-only services (`mockInvoiceService.ts`, `mockPOService.ts`, `mockDataConfig.ts`) for rapid development
3. **Database Layer** - PostgreSQL + Prisma available but currently unused for demo

**Data Flow:** User Action → Frontend Component → Mock Service → Display (with local React state). Database integration available for production but demo runs entirely frontend.

**Deployment:** Railway auto-deploys on git push to main.

*See CLAUDE.md for complete technical specifications and setup instructions.*

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

1. **Mock Data** - Define complete invoice objects in `mockInvoiceService.ts`
2. **Component Integration** - Components import and use mock data directly via `getMockInvoiceById()`
3. **Local State** - All updates managed in React component state with `useState()`, no API calls needed

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
- **9 demo invoices** (5 baseline + 4 specialized scenarios)
- **Focus:** Build demo-specific scenarios iteratively as needed
- **Each invoice demonstrates specific capabilities** - No redundant scenarios

### The 9 Demo Invoices

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
   - Vendor: CloudTech Solutions Inc
   - Approver: Sarah Mitchell
   - Scenario: Standard non-PO invoice processing with assigned approver
   - Use Case: Show non-PO workflow simplicity
   - Features: Non-PO approval workflow

5. **`baseline-matched-1`** - Successfully processed invoice (Happy Path)
   - Invoice Number: `SUP-0000123`
   - Vendor: Office Supplies Direct
   - Scenario: Fully matched and processed
   - Use Case: Happy path demonstration, appears in "All" tab
   - PO: PO-2025-8001, GR: GR-2025-8001

6. **`baseline-nonpo-2`** - Smart Approver Routing
   - Invoice Number: `INV-MU-2025-0089`
   - Vendor: Metro Utilities & Services
   - Scenario: AI-suggested approver based on service type and historical patterns
   - Use Case: Demonstrate intelligent approver assignment for non-PO invoices
   - Features: ApproverRoutingPopover with confidence scoring

7. **`fraud-risk-1`** - Fraud Risk Compliance Hold
   - Invoice Number: `INV-RU-2025-0001`
   - Vendor: Volga Industrial Supplies LLC (Russia)
   - Amount: $240,000 (exceeds $100K high-risk threshold)
   - Processed Status: `'Exception'`
   - Scenario: High-risk jurisdiction with amount threshold exceeded
   - Use Case: Demonstrate fraud risk detection and compliance workflow
   - Features: Compliance hold, manual review required, FraudRiskBanner

8. **`auto-reject-1`** - Auto-Rejection: Missing PO Threshold
   - Invoice Number: `INV-2025-5501`
   - Vendor: Office Equipment Plus
   - Amount: $7,500 (exceeds $5K no-PO threshold)
   - Scenario: Vendor requires PO but none provided, amount over threshold
   - Use Case: Demonstrate automatic rejection with policy enforcement
   - Features: AutoRejectBanner, AutoRejectPopover, automated vendor email

9. **`auto-reject-2`** - Auto-Rejection: PO Contract Violation
   - Invoice Number: `LOG-2025-1103`
   - Vendor: National Logistics Partners
   - Scenario: Freight charges billed separately when PO contract specifies "freight included"
   - Use Case: Demonstrate contract term enforcement
   - Features: AutoRejectBanner showing contract violation, P2P team flagging

### Mock Data Philosophy

**"Start Small, Build as Needed"**

Instead of maintaining 49 invoices with complex scenarios:
1. Keep 3 clean baseline invoices
2. Add new scenarios only when demo requires them
3. Each new invoice should demonstrate a specific capability
4. Archive old scenarios that aren't actively used

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

**Processed Status (Exception Handling):**
```typescript
processed_status: 'Exception'  // For fraud risk, compliance holds, critical exceptions
```

*See `mockInvoiceService.ts` for complete examples and additional data structures.*

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

### 6. Auto-Rejection Workflow

**Purpose:** Automatically reject invoices violating business rules with policy enforcement

**Demo Invoices:** `auto-reject-1` (Missing PO), `auto-reject-2` (Contract violation)

**Implementation:**
- **AutoRejectBanner.tsx** - Red banner at top of invoice detail page
- **AutoRejectPopover.tsx** - Detailed rejection info with collapsible rule section

**Rejection Scenarios:**
1. **Missing PO Threshold** - Vendor requires PO, none provided, amount > $5K threshold
2. **Contract Violation** - Invoice terms violate PO contract (e.g., freight billed separately when contract says "freight included")
3. **Duplicate Detection** - Prevents duplicate payments

**User Experience:**
- Red "Auto-Rejected" banner shows policy violation summary
- Click "View Details" → Popover with compact 3-column metadata, collapsible "Rule Triggered" accordion
- Actions: Automated vendor email sent, helpdesk ticket created, P2P team flagged

### 7. Smart Approver Routing

**Purpose:** AI suggests appropriate approver for Non-PO invoices based on service type, vendor, amount, historical patterns

**Demo Invoice:** `baseline-nonpo-2` (Metro Utilities)

**Implementation:**
- **ApproverRoutingPopover.tsx** - Inline in Details tab approver field
- Shows confidence %, matching criteria, similar invoices

**User Experience:**
1. Non-PO invoice opens
2. Approver field shows AI suggestion with confidence score
3. Click field → Popover explains reasoning (service type match, historical patterns)
4. Accept suggestion or manually override

### 8. Fraud Risk Compliance

**Purpose:** Detect high-risk jurisdictions and enforce amount thresholds for compliance review

**Demo Invoice:** `fraud-risk-1` (Volga Industrial, Russia, $240K)

**Implementation:**
- `processed_status: 'Exception'` for compliance holds
- **FraudRiskBanner.tsx** - Red banner with jurisdiction and amount warnings
- Manual compliance review required before processing

**Detection Rules:**
- High-risk jurisdiction list (Russia, etc.)
- Amount threshold (>$100K to high-risk countries)
- Automatic "Compliance Hold" status

### 9. Accounting Auto-Coding

**Purpose:** Automatically classify invoices with GL codes, cost centers, departments based on vendor history and content

**Implementation:**
- **AccountingAutoCodingPopover.tsx** - Purple lightning bolt indicator
- Shows confidence score, reasoning, collapsible "Similar invoices" history

**User Experience:**
- Invoice shows pre-filled accounting codes with lightning bolt icon
- Click icon → Popover explains classification logic
- Historical pattern recognition: "Last 15 invoices from this vendor coded to GL-4200"

### 10. Vendor Swap Detection

**Purpose:** Detect parent/child company mismatches and suggest correct entity based on tax ID, remit-to address, patterns

**Implementation:**
- **VendorSwapPopover.tsx** - Orange "Vendor Reassignment" badge
- Shows suggested swap with confidence %, reasoning

**Detection Triggers:**
- Tax ID mismatch between invoice and vendor record
- Remit-to address indicates different subsidiary
- Historical payment patterns show different entity

**User Experience:**
- Orange badge alerts to potential vendor mismatch
- Click → Popover shows parent vs child company comparison
- Accept to swap vendor or confirm original

### 11. Line Items Comparison Drawer

**Purpose:** Side-by-side comparison of invoice vs PO line items grouped by status

**Implementation:**
- **LineItemsComparisonDrawer.tsx** - Slides in from right
- Collapsible sections: Matched, Variance, Unmatched
- Shows detailed variance analysis per line

**User Experience:**
- Click "Compare Lines" button in line items section
- Drawer opens with grouped comparison
- Expand/collapse sections to focus on exceptions
- Clear visual distinction between matched and problem lines

### 12. Line Items Interface & Actions

**Purpose:** Comprehensive line item management with inline editing, smart matching, UOM conversions, and custom rules

**Demo Invoice:** All features in `baseline-po-2`

#### Panel Header Controls (First Row)

| Button | Icon | Location | Action |
|--------|------|----------|--------|
| **Group by Status** | ArrowDownWideNarrow/List | Top right, before Maximize | Toggles between default view (all items) and grouped view (variance lines + collapsible matched section) |
| **Maximize** | Maximize2/X | Top right corner | Expands panel to fullscreen, click again to exit |

#### Table Header Controls (Second Row)

| Button | Location | States | Action |
|--------|----------|--------|--------|
| **Edit/Done** | Right of "Invoice" label | Edit (white bg, purple text) / Done (purple bg, white text) | Toggles inline editing mode: enables qty/price/UOM editing, shows drag handles, reveals Actions column, shows "Add Line" button |
| **Status Sort** | Status column header icon | Variance-first (default) / Matched-first | Toggles sort order, icon rotates 180° when switched |

#### Per-Line Actions (Edit Mode Only)

**Actions Column** (rightmost, visible only when Edit Mode active):

| Button | Icon | Color | Action |
|--------|------|-------|--------|
| **Delete** | Trash2 | Gray → Red on hover | Removes line immediately (no confirmation) |
| **More Actions** | MoreVertical (3 dots) | Gray | Opens dropdown menu |

**More Actions Dropdown:**
- **Mark as Matched** - Manually marks line as matched, removes red highlighting, useful for accepting known discrepancies

#### Smart Indicators (Icon Column)

Lines show interactive icons based on match state (priority order):

1. **AI Substitution** (gradient Sparkles) - Highest priority
   - AI suggests product substitution (e.g., MERV 8 vs MERV 9)
   - Click → SubstitutionSuggestionPopover with confidence %, differences, Accept/Reject buttons
   - Example: baseline-po-2, Line 5

2. **Smart Match** (purple Zap ⚡)
   - UOM conversion applied, description difference, or custom rule
   - Click → Opens UomMatchPopover, SmartMatchPopover, or CustomRulePopover
   - Example: baseline-po-2, Lines 6 & 7

3. **Teach Rule Button** (Sparkles in description cell)
   - For UOM mismatches without auto-conversion
   - Gradient purple-pink on hover
   - Click → Opens TeachRuleDrawer for creating conversion rules

4. **Purple Plus Icon** (hover state)
   - Appears on hover when no other indicators present
   - Opens TeachRuleDrawer to create custom rule

#### TeachRuleDrawer (Conversational UI)

**Opens when:** Clicking Sparkle button, Plus icon, or Edit in CustomRulePopover

**Layout:** 500px side drawer from right

**Contents:**
- Read-only line context (invoice qty/UOM, PO qty/UOM, description, prices)
- **RuleChatInterface** with 3-step conversational flow:
  1. Welcome message explaining rule creation
  2. Natural language input (e.g., "1 box = 12 units")
  3. Preview of parsed rule with validation (green check or red X)
- **Apply Rule** button (purple) - Validates and applies rule, line turns purple
- **Cancel** button (gray) - Closes without saving

**Rule Parsing:** Supports patterns like "X [unit] = Y [unit]", case insensitive, extracts quantities and units

#### Additional Features

**Drag-and-Drop Reordering:**
- Hover → grab cursor → drag line → purple drop target → reorder
- Uses `@dnd-kit` library, disabled in grouped view

**Variance Detection:**
- Qty Var, Price Var, Delta columns
- Green badges (within tolerance) / Red badges (needs approval)

**Add Line Button:**
- Bottom of table (Edit Mode only)
- Purple Plus icon + "Add Line" label
- Creates new blank editable row

**Grouped View:**
- Toggle separates variance lines from matched items
- "Matched Items (N)" collapsible section
- Improves focus on exceptions

### 13. Confidence Indicators

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

### 14. Visual Indicator Reference

**Quick reference for all visual indicators in the system:**

| Icon | Meaning | Color | Where Used |
|------|---------|-------|------------|
| ✨ Sparkles | AI Suggestion Available | Purple | Fields with candidates, Substitution suggestions |
| ⚡ Lightning Bolt (filled) | Auto-Correction / Auto-Coding | Purple | Fields auto-corrected or auto-coded |
| ⚡ Lightning Bolt (outline) | Smart Match | Purple/Red | Line items with smart matches |
| 🛡️ Shield | Security Verification | Purple | Bank details verification |
| 🔴 Red Banner | Auto-Rejected / Fraud Risk | Red | Policy violations, high-risk invoices |
| 🟠 Orange Badge | Vendor Reassignment | Orange | Parent/child vendor mismatch |
| 🟣 Purple Dot | High Confidence | Purple | OCR confidence indicators |
| 🟠 Orange Dot | Medium Confidence | Orange | OCR confidence indicators |
| 🔴 Red Dot | Low Confidence | Red | OCR confidence indicators |
| 📍 Location Pin | Teaching Context | N/A | Shows where value was found |
| ✓ Checkmark | Within Tolerance | Green | Variance badges |
| ✗ X Mark | Outside Tolerance | Red | Variance badges |
| 🎯 Target | Pending Confirmation | Purple | Taught values awaiting confirmation |
| Exception | Compliance Hold | Red badge | Fraud risk, manual review required |

**Button Text Standards:**
- "Accept & Remember" (Teaching workflow)
- "Fix Suggestion" (AI candidates)
- "Verify Change" (Bank details)
- "Teach Agent" (Custom fields)
- "Apply Rule" (UOM conversions)
- "Cancel" (Reject AI suggestions - changed from "Reject")

### 15. Mock PDF Invoice Generation

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

**Typical Flow:** Update mock data in `mockInvoiceService.ts` → Refresh browser → Test features → Iterate based on feedback.

**Testing:** Ensure visual polish, mock data works standalone, responsive design, accessibility, no console errors.

**Git:** Work on feature branches, commit frequently, push to trigger Railway auto-deployment.

*See CLAUDE.md for complete development setup, commands, and workflows.*

---

## Recent Major Work

### Demo Expansion & Feature Refinements (Jan 28 - Feb 5, 2025)

**Commits:** cdc706e, 93a4118, db221a3, and others
**Goal:** Expand demo scenarios and refine existing workflows

**What We Built:**
1. **Smart Approver Routing** - AI-suggested approvers for Non-PO invoices (baseline-nonpo-2)
2. **Fraud Risk Compliance** - High-risk jurisdiction detection with Exception status (fraud-risk-1)
3. **Auto-Rejection Workflow** - Policy enforcement with auto-reject banners (auto-reject-1, auto-reject-2)
4. **Grouped Line Items View** - Toggle for variance/matched separation
5. **UI Refinements** - Approver field simplification, button text updates (Reject→Cancel), icon removal

**Files Created:**
- `ApproverRoutingPopover.tsx` - Smart approver suggestions
- `AutoRejectBanner.tsx` & `AutoRejectPopover.tsx` - Rejection workflow
- `FraudRiskBanner.tsx` - Compliance holds

**Files Modified:**
- `mockInvoiceService.ts` - Added 4 new invoices, processed_status field, approver data
- `EnhancedInvoiceTable.tsx` - Exception status rendering
- `AISuggestionCard.tsx` - Removed icons, renamed button to "Cancel"
- `DetailsTab.tsx` - Inline approver field with error states
- `LineItemsPreviewPanel.tsx` - Grouped view toggle

**Key Innovation:**
- Expanded from 5 to 9 demo invoices covering diverse scenarios
- Simplified approver routing from separate section to inline field
- Comprehensive exception handling (fraud risk, auto-rejection, compliance)

### Bank Details Verification Workflow (Jan 27, 2025)

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

*For earlier development history (Jan 17-20, 2025), see git log or previous versions of this guide.*

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
- `app/components/invoices/AutoRejectBanner.tsx` - Auto-rejection banner
- `app/components/invoices/AutoRejectPopover.tsx` - Rejection details and rules

**Workflow Automation:**
- `app/components/invoices/ApproverRoutingPopover.tsx` - Smart approver suggestions
- `app/components/invoices/AccountingAutoCodingPopover.tsx` - GL code auto-classification
- `app/components/invoices/VendorSwapPopover.tsx` - Parent/child vendor detection

**Line Items Intelligence:**
- `app/components/invoices/preview/LineItemsPreviewPanel.tsx` - Main line items display with drag-drop
- `app/components/invoices/SmartMatchPopover.tsx` - Description-based matching
- `app/components/invoices/SubstitutionSuggestionPopover.tsx` - Product substitution suggestions
- `app/components/invoices/UomMatchPopover.tsx` - UOM conversion display
- `app/components/invoices/CustomRulePopover.tsx` - Custom conversion rules interface
- `app/components/invoices/TeachRuleDrawer.tsx` - Conversational rule teaching
- `app/components/invoices/RuleChatInterface.tsx` - 3-step conversational UI
- `app/components/invoices/LineItemsComparisonDrawer.tsx` - Side-by-side comparison

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

**View all demo invoices:**
```typescript
// In browser console or Node
import { getAllMockInvoices } from '@/app/services/mockInvoiceService';
console.log(getAllMockInvoices());
// Returns 9 invoices: 5 baseline + baseline-nonpo-2, fraud-risk-1, auto-reject-1, auto-reject-2
```

**Find specific invoice:**
```typescript
import { getMockInvoiceById } from '@/app/services/mockInvoiceService';
const invoice = getMockInvoiceById('baseline-po-1');
console.log(invoice);
```

### Understanding the Demo Flow

**Demo Scenarios:**

- **`baseline-po-1`** - AI candidates for missing invoice number, teaching workflow for job_number field
- **`baseline-po-2`** - Line item intelligence: variances, UOM conversions, substitution suggestions, smart matches
- **`baseline-po-bank-1`** - Auto-correction indicators (swapped fields), bank details verification with email drafting

*Open each invoice to explore interactive features. See feature sections above for detailed workflows.*

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

