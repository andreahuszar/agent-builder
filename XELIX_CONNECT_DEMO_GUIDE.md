# Xelix Connect 2025 Demo - Project Guide

**Last Updated:** January 2025
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

**As of January 2025, we've refactored to a minimal baseline:**
- **3 baseline invoices** (down from 49 archived invoices)
- **1 primary generator function** (8 archived)
- **Focus:** Build demo-specific scenarios iteratively as needed

### The 3 Baseline Invoices

1. **`baseline-po-1`** - Clean PO invoice demonstrating AI candidate suggestions
   - Invoice Number: `TS-2025-000001`
   - Vendor: TechSupply Solutions Ltd
   - Scenario: Missing invoice number with AI suggestion "INV-2025-0123"
   - Use Case: Demonstrate AI-powered field completion

2. **`baseline-nonpo-1`** - Simple non-PO workflow
   - Invoice Number: `PIT-250103001`
   - Vendor: Professional IT Services
   - Scenario: Standard non-PO invoice processing
   - Use Case: Show non-PO workflow simplicity

3. **`baseline-matched-1`** - Successfully processed invoice
   - Invoice Number: `SUP-0000123`
   - Vendor: Global Supply Chain Partners
   - Scenario: Fully matched and processed
   - Use Case: Happy path demonstration

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
  ├── mockInvoiceService.ts       # 3 baseline invoice generators
  ├── mockPOService.ts            # 7 purchase orders (static)
  └── mockInvoiceService.archive.ts  # 49 archived invoices (reference only)

/MOCK_INVOICES_ARCHIVE.md        # Documentation of archived scenarios
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

### 2. Mock PDF Invoice Generation

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

### AI Candidate Suggestion System (Latest)

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
- `app/components/invoices/AISuggestionCard.tsx` - Suggestion card
- `app/components/invoices/EditableField.tsx` - Interactive field wrapper
- `app/components/invoices/CandidatePopover.tsx` - Quick popover

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
// Returns 3 invoices: baseline-po-1, baseline-nonpo-1, baseline-matched-1
```

**Find specific invoice:**
```typescript
import { getMockInvoiceById } from '@/app/services/mockInvoiceService';
const invoice = getMockInvoiceById('baseline-po-1');
console.log(invoice);
```

### Understanding the Demo Flow

**Typical Demo Scenario:**

1. **Open Invoice List** → Shows mix of invoices
2. **Click "Baseline PO Invoice"** → Opens detail page
3. **See Exception** → Invoice number missing (1 exception shown)
4. **Details Tab** → Shows "Not found" with "Fix Suggestion" button
5. **Click Fix Suggestion** → Card expands showing AI suggestion
6. **PDF Highlights** → Field pulses yellow in left panel
7. **Accept Suggestion** → Both panels update, exception resolves
8. **Result** → Clean invoice ready for processing

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

