# PO/Non-PO Filter Synchronized Metrics Implementation Plan

## Overview
When users select PO/Non-PO filters in the header toggle, the banner metrics (due soon, overdue, blocked) and their associated charts should update to reflect only the filtered invoices. This ensures a consistent and intuitive user experience where all displayed data corresponds to the current filter selection.

## Current State Analysis

### Existing Components
1. **Filter Toggle** (`EnhancedInvoicesClient.tsx:558-583`)
   - Located in header, controls `invoiceTypeFilter` state
   - Options: 'all', 'po', 'non-po'

2. **Metrics Banner** (`EnhancedInvoicesClient.tsx:604-703`)
   - Shows three key metrics: due soon, overdue, blocked
   - Each metric displays count and value
   - Expandable to show charts inline or opens side drawer

3. **Metrics Calculation** (`EnhancedInvoicesClient.tsx:278-300`)
   - Currently calculates from unfiltered `invoices` array
   - Returns counts and values for each metric category

4. **Chart Components**
   - `InvoiceDueSoonChart`: Receives `invoices` prop
   - `InvoiceAgingChart`: Receives `invoices` prop (for overdue)
   - `BlockedInvoiceAnalysis`: Receives `invoices` prop
   - All charts currently receive full unfiltered invoice list

### Problem
The metrics and charts always show data for ALL invoices, regardless of the PO/Non-PO filter selection. This creates a disconnect between what the user expects to see (filtered data) and what is actually displayed.

## Implementation Strategy

### Phase 1: Create Filtered Metrics Calculation
1. **New useMemo Hook for Filtered Metrics**
   - Calculate metrics based on `filteredInvoices` instead of `invoices`
   - Consider active filter state (`invoiceTypeFilter`)
   - Update when filter changes

2. **Code Location**: `EnhancedInvoicesClient.tsx`
   - Add new `filteredMetrics` calculation after line 300
   - Use same logic as existing `metrics` but with `filteredInvoices`

### Phase 2: Update Banner Display
1. **Replace Metrics Reference**
   - Change all `metrics.*` references to `filteredMetrics.*` in banner
   - Update lines: 618, 619, 627, 628, 636, 637 (and similar in drawer mode)

### Phase 3: Update Chart Data Props
1. **Pass Filtered Invoices to Charts**
   - Change `invoices={invoices}` to `invoices={filteredInvoices}`
   - Update all chart component instances:
     - InvoiceDueSoonChart (lines 696, 986)
     - InvoiceAgingChart (lines 708, 936)
     - BlockedInvoiceAnalysis (lines 720, 1036)

### Phase 4: Handle Edge Cases
1. **Quick Filters Interaction**
   - Ensure quick filters work correctly with PO/Non-PO filter
   - Quick filters should apply on top of PO/Non-PO filtering
   - Current implementation already handles this correctly (lines 350-414)

2. **Search and Vendor Filters**
   - These already work with filtered data
   - No changes needed

## Detailed Implementation Steps

### Step 1: Add Filtered Metrics Calculation
```typescript
// After line 300, add:
const filteredMetrics = useMemo(() => {
  const now = new Date();

  // Use filteredInvoices instead of invoices
  const openBlocked = filteredInvoices.filter(inv =>
    inv.status === 'requires_review' || inv.status === 'needs_review'
  );

  const overdue = filteredInvoices.filter(inv => {
    const dueDate = new Date(inv.due_date);
    return dueDate < now && inv.status !== 'paid';
  });

  const dueSoon = filteredInvoices.filter(inv => {
    const dueDate = new Date(inv.due_date);
    const daysUntilDue = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilDue >= 0 && daysUntilDue <= 7 && inv.status !== 'paid';
  });

  return {
    openBlocked: { count: openBlocked.length, value: openBlocked.reduce((sum, inv) => sum + inv.total, 0) },
    overdue: { count: overdue.length, value: overdue.reduce((sum, inv) => sum + inv.total, 0) },
    dueSoon: { count: dueSoon.length, value: dueSoon.reduce((sum, inv) => sum + inv.total, 0) }
  };
}, [filteredInvoices]);
```

### Step 2: Update Banner Metrics References
Replace all occurrences of `metrics.` with `filteredMetrics.` in the banner section (lines 604-703).

### Step 3: Update Chart Components Props
Replace all `invoices={invoices}` with `invoices={filteredInvoices}` for the three chart components.

## Benefits
1. **Consistency**: All displayed data reflects current filter selection
2. **Clarity**: Users see exactly what they expect based on their filter choice
3. **Performance**: Metrics only recalculate when filtered data changes
4. **Maintainability**: Clear separation between full and filtered datasets

## Testing Scenarios
1. **Filter Toggle**
   - Switch between All/PO/Non-PO
   - Verify metrics update immediately
   - Verify charts show filtered data

2. **Combined Filters**
   - Apply PO filter + quick filters
   - Apply Non-PO filter + search
   - Verify correct data aggregation

3. **Edge Cases**
   - No PO invoices available
   - No Non-PO invoices available
   - Empty results after filtering

## Performance Considerations
- Using `useMemo` ensures metrics only recalculate when dependencies change
- Filtered invoices are already being calculated for the table
- No additional API calls or heavy computations required

## Future Enhancements
1. **Visual Indicators**
   - Add badge or label showing active filter on metrics
   - Consider different colors for filtered vs unfiltered view

2. **Animation**
   - Smooth transitions when metrics update
   - Loading state during recalculation (if needed)

3. **Persistence**
   - Remember user's filter preference in cookies/localStorage
   - Apply last used filter on page load

## Risks and Mitigation
- **Risk**: Users may not realize data is filtered
  - **Mitigation**: Add clear visual indicator of active filter

- **Risk**: Performance impact with large datasets
  - **Mitigation**: Already using memoization, monitor performance

## Timeline
- Implementation: 30-45 minutes
- Testing: 15-20 minutes
- Total: ~1 hour

## Success Criteria
✅ Metrics update when PO/Non-PO filter changes
✅ Charts display filtered invoice data
✅ All filters work together correctly
✅ No performance degradation
✅ Clear user experience