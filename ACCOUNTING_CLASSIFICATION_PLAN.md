# AI-Powered Accounting Classification with Budget Tracking Implementation Plan

## Overview
This document outlines the implementation plan for adding intelligent accounting classification and budget tracking to the invoice processing system. The implementation is divided into two phases: AI-powered classification (Phase 1) and budget impact tracking (Phase 2).

## Phase 1: AI-Powered Classification System

### 1A: Database Schema Updates
```sql
-- Add accounting fields to invoice_headers
ALTER TABLE invoice_headers ADD COLUMN cost_center VARCHAR(100);
ALTER TABLE invoice_headers ADD COLUMN cost_center_name VARCHAR(255);
ALTER TABLE invoice_headers ADD COLUMN gl_code VARCHAR(50);
ALTER TABLE invoice_headers ADD COLUMN department VARCHAR(100);
ALTER TABLE invoice_headers ADD COLUMN accounting_notes TEXT;
ALTER TABLE invoice_headers ADD COLUMN ai_classification_confidence DECIMAL(3,2);
ALTER TABLE invoice_headers ADD COLUMN ai_classification_reasoning TEXT;
```

### 1B: Enhance AI Extraction
Update `/lib/anthropic/service.ts` extraction prompt to:
- Add classification request to identify ledger, cost center, and reasoning
- Extract department/project mentions from invoice content
- Analyze vendor type and invoice items for classification

Classification rules for AI:
- **Fixed Assets**: Equipment/furniture > $5,000
- **Prepaid Expenses**: Insurance, annual licenses, subscriptions
- **Accruals**: Services crossing month boundaries
- **Inventory**: Raw materials, resale items
- **Accounts Payable**: Everything else (default)

### 1C: Create Classification Service
New file `/lib/services/accountingClassification.ts`:
- Use Anthropic API with specialized classification prompt
- Return ledger, cost_center, confidence score, and reasoning
- Apply simple rules based on invoice characteristics

### 1D: Add Predefined Constants
New file `/lib/constants/accountingCodes.ts`:

**Cost Centers:**
- IT-100: Information Technology
- MKT-200: Marketing
- OPS-300: Operations
- HR-400: Human Resources
- FIN-500: Finance
- R&D-600: Research & Development
- FAC-700: Facilities
- EXEC-800: Executive

**Ledger Accounts:**
- 2000: Accounts Payable (liability)
- 2100: Accruals (liability)
- 1500: Prepaid Expenses (asset)
- 1600: Fixed Assets (asset)
- 1400: Inventory (asset)

### 1E: New UI Section - "Accounting Classification"
Add new section in DetailsTab.tsx (same level as Invoice Information):
```
📊 ACCOUNTING CLASSIFICATION
├── Ledger Account: [Dropdown with AI suggestion highlighted]
├── Cost Center: [Searchable dropdown with code + name]
├── GL Code: [Auto-populated based on ledger]
├── Department: [Optional dropdown]
├── AI Confidence: [Visual bar showing 85%]
└── Classification Notes: [Editable text field]
```

### 1F: Update Invoice Processing
Modify `/app/api/invoices/process/route.ts`:
- After extraction, call classification service
- Store classification results with invoice
- Save AI confidence and reasoning for audit trail

## Phase 2: Collapsible Budget Impact Widget

### 2A: Database Schema for Budgets
```sql
-- Create budget tracking tables
CREATE TABLE budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cost_center VARCHAR(100),
  fiscal_year INTEGER,
  fiscal_quarter INTEGER,
  budget_amount DECIMAL(18,2),
  budget_type VARCHAR(50), -- 'quarterly', 'annual', 'monthly'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE budget_consumption (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID REFERENCES budgets(id),
  invoice_id UUID REFERENCES invoice_headers(id),
  amount DECIMAL(18,2),
  consumption_date DATE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 2B: Budget Impact Widget (Collapsible)
Add to DetailsTab.tsx after Document Links section:

**Collapsed State (Default):**
```
💰 BUDGET IMPACT  ▶  Q1 Professional Services: 85% used ($3,463 of remaining $6,537)
```

**Expanded State (On Click):**
- Shows full budget overview with visual progress bars
- Displays invoice impact on remaining budget
- Provides warnings for high-impact approvals

### 2C: Widget Display Logic
- **Only show if**: Cost center is assigned AND budget exists for that cost center
- **Hide for**: Credit memos, invoices without cost centers, or no budget data
- **Color coding**: 
  - Green (0-75% used)
  - Yellow (75-90% used) 
  - Red (>90% used)

### 2D: Budget Calculation Service
New file `/lib/services/budgetTracking.ts`:
```typescript
interface BudgetStatus {
  costCenter: string;
  budgetName: string;
  totalBudget: number;
  usedAmount: number;
  remainingAmount: number;
  percentUsed: number;
  daysLeft: number;
  invoiceImpact: {
    amount: number;
    percentOfRemaining: number;
    remainingAfter: number;
  };
}

async function calculateBudgetImpact(invoiceId: string): Promise<BudgetStatus>
```

### 2E: Real-time Updates
- Recalculate on cost center change
- Update when invoice amount changes
- Refresh on fiscal period rollover

## Implementation Timeline

### Week 1: Phase 1A-1C
- Database updates
- AI classification service
- Basic extraction enhancement

### Week 2: Phase 1D-1F
- UI for Accounting Classification section
- Integration with invoice processing
- Testing AI accuracy

### Week 3: Phase 2A-2B
- Budget tables and seed data
- Collapsible widget UI
- Basic budget calculations

### Week 4: Phase 2C-2E
- Display logic and smart hiding
- Real-time updates
- Testing and refinement

## Benefits

1. **Progressive Enhancement**: Phase 1 works standalone, Phase 2 adds value on top
2. **Non-intrusive**: Collapsed by default, users can ignore if not needed
3. **AI-First**: Leverages existing AI infrastructure for immediate intelligence
4. **Professional Grade**: Matches enterprise AP system capabilities
5. **Audit Ready**: Stores AI reasoning and confidence for compliance

## Success Metrics

### Phase 1:
- 80% accuracy in ledger classification
- 70% accuracy in cost center assignment
- <2 seconds additional processing time

### Phase 2:
- Budget alerts prevent 90% of over-budget approvals
- Users expand widget on 40% of high-value invoices
- Reduces budget review meetings by 50%

## Notes
- Start with header-level classification only
- Line-item level coding reserved for future Phase 3
- Uses existing Anthropic/OpenAI API infrastructure
- No learning system in initial implementation - pure rule-based with AI assistance