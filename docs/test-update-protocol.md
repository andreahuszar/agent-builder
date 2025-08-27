# Visual Test Update Protocol

This document outlines the process for updating visual regression tests when UI changes are made intentionally.

## When to Update Tests

### Immediate Update Required
- **Intentional UI design changes** - When you've deliberately modified the visual appearance
- **Component styling updates** - Changes to colors, spacing, fonts, or layout
- **New feature additions** - When adding new UI components or pages
- **CSS framework updates** - After fixing framework issues (like the Tailwind v4→v3 migration)

### Do NOT Update For
- **Failing tests due to bugs** - Fix the bug first, then update if the fix changes appearance
- **Unintentional visual changes** - These indicate problems that should be investigated
- **Random test failures** - May indicate flaky tests or real issues

## Pre-Update Checklist

Before updating visual test baselines, verify:

1. **✅ CSS Framework Working**
   ```bash
   # Check Tailwind classes are applying correctly
   npm run test:visual -- css-framework.spec.ts
   ```

2. **✅ Changes are Intentional**
   - Review what changed and why
   - Confirm changes match design intent
   - Verify changes work across all viewports

3. **✅ Component Functionality**
   - Test interactive elements work correctly
   - Verify navigation, dropdowns, buttons function properly
   - Check hover states and transitions

## Update Process

### 1. Run Specific Test Categories

Update tests incrementally by category:

```bash
# Update main visual tests
npm run test:visual:update -- visual.spec.ts

# Update component-specific tests
npm run test:visual:update -- components.spec.ts

# Update CSS framework validation
npm run test:visual:update -- css-framework.spec.ts

# Update responsive tests (takes longer)
npm run test:visual:update -- responsive.spec.ts
```

### 2. Review Generated Screenshots

After updating baselines:
1. Check generated screenshots in `tests/*/snapshots/` folders
2. Compare with expectations - do they match your intended changes?
3. Look for unexpected side effects in unchanged components

### 3. Validate Across Viewports

For responsive changes:
```bash
# Run responsive tests to ensure all viewports look correct
npm run test:visual -- responsive.spec.ts
```

### 4. Document Changes

When updating tests, document:

**In Git Commit:**
```
Update visual tests: [Brief description of UI change]

- Changed [specific component/feature]
- Reason: [why the change was made]
- Affects: [which test files were updated]
- Verified: [responsive behavior/interactions still work]

🤖 Generated with [Claude Code](https://claude.ai/code)
```

**In PR/Issue:**
- Screenshot comparison (before/after) if significant
- Verification that functionality still works
- Confirmation that changes match design requirements

## Troubleshooting Test Updates

### Tests Still Failing After Update

1. **Check CSS Framework Health:**
   ```bash
   npm run test:visual -- css-framework.spec.ts
   ```

2. **Verify Component Isolation:**
   ```bash 
   npm run test:visual -- components.spec.ts --grep "Component Name"
   ```

3. **Test Specific Viewport:**
   ```bash
   npm run test:visual -- responsive.spec.ts --project=mobile-chrome
   ```

### Unexpected Visual Differences

If tests show unexpected differences:

1. **Visual First Approach** - Look at the actual screenshots
2. **Framework Check** - Ensure CSS is working correctly
3. **Component Check** - Test individual components
4. **Incremental Testing** - Update one test file at a time

### Large Number of Failing Tests

If many tests fail after a change:

1. **Stop** - Don't update all baselines immediately
2. **Investigate** - This likely indicates a framework issue
3. **Check Dependencies** - Verify CSS framework, fonts, etc.
4. **Fix Root Cause** - Address the underlying issue first

## Test Organization Strategy

### Component-Level Updates
When updating specific components:
```bash
# Update only Navigation component tests
npm run test:visual:update -- components.spec.ts --grep "Navigation"

# Update only User Menu tests  
npm run test:visual:update -- components.spec.ts --grep "User Menu"
```

### Page-Level Updates
When updating full page layouts:
```bash
# Update main page layouts
npm run test:visual:update -- visual.spec.ts

# Update responsive layouts
npm run test:visual:update -- responsive.spec.ts
```

### Targeted Viewport Updates
When changes affect specific screen sizes:
```bash
# Update only mobile tests
npm run test:visual:update -- responsive.spec.ts --project=mobile-chrome

# Update only tablet tests
npm run test:visual:update -- responsive.spec.ts --project=tablet-chrome
```

## Quality Assurance

### Post-Update Validation

After updating visual tests:

1. **Run Full Test Suite:**
   ```bash
   npm run test:visual
   ```

2. **Check Multiple Browsers** (if configured):
   ```bash
   npm run test:visual -- --project=chromium
   npm run test:visual -- --project=firefox
   ```

3. **Verify Interactive Elements:**
   ```bash
   # Test user interactions still work
   npm run test:visual -- visual.spec.ts --grep "user menu dropdown"
   npm run test:visual -- visual.spec.ts --grep "navigation between pages"
   ```

### Red Flags

**Stop and investigate if you see:**
- ❌ Many unrelated components changed
- ❌ CSS styles completely missing
- ❌ Layout completely broken
- ❌ Components overlapping incorrectly
- ❌ Text/fonts not rendering

**These indicate framework issues, not intentional changes.**

## Best Practices

### Do:
- ✅ Update tests incrementally by component/feature
- ✅ Review screenshots before committing
- ✅ Document what changed and why
- ✅ Test functionality after visual updates
- ✅ Verify responsive behavior across viewports

### Don't:
- ❌ Update all tests blindly with `--update-snapshots`
- ❌ Skip reviewing the generated screenshots
- ❌ Update tests when functionality is broken
- ❌ Ignore CSS framework validation failures
- ❌ Update without understanding why tests failed

## Emergency Procedures

### If CSS Framework Breaks
1. **Stop all test updates**
2. **Check framework configuration** (tailwind.config.ts, postcss.config.mjs)
3. **Verify package.json dependencies**
4. **Test basic framework functionality** with css-framework.spec.ts
5. **Fix framework first, then update tests**

### If Tests Become Unreliable
1. **Investigate flaky tests** - may indicate timing issues
2. **Check test selectors** - ensure they target stable elements
3. **Review recent changes** - identify what might have broken tests
4. **Update selectors/helpers** before updating baselines

---

## Quick Reference

```bash
# Common update commands
npm run test:visual:update              # Update all visual tests
npm run test:visual:update -- visual.spec.ts    # Update main tests only
npm run test:visual                     # Run all tests to verify
npm run test:visual:ui                  # Interactive debugging mode

# Targeted updates
npm run test:visual:update -- --grep "Navigation"    # Update Navigation tests
npm run test:visual:update -- --project=mobile-chrome # Update mobile only
```

Remember: **Visual reality is the source of truth**. If users report visual issues, investigate visually first using Playwright screenshots, not just code inspection.