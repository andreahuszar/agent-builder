# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Invoice Processing Workspace - A Next.js application with a clean navigation structure for invoice and purchase order management. Built with TypeScript, Tailwind CSS, and Radix UI components.

## Development Setup

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run production build
npm run preview
```

## Key Commands

- `npm run dev` - Start development server (default port 3000)
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run test:visual` - Run Playwright visual regression tests
- `npm run test:visual:update` - Update visual test baseline screenshots
- `npm run test:visual:ui` - Open Playwright UI mode for interactive testing

## Architecture

### Technology Stack
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom purple theme
- **UI Components**: Radix UI primitives
- **Icons**: Lucide React

### Project Structure
```
/app
  /components       # Reusable components
    /ui            # UI primitives (dropdown-menu, etc.)
    Navigation.tsx # Left sidebar navigation
    TopNavigation.tsx # Top navigation pills
    UserMenu.tsx   # User profile dropdown
  /invoices        # Invoices page
  /purchase-orders # Purchase orders page
  layout.tsx       # Root layout with navigation
  page.tsx         # Home/Workspace page
  globals.css      # Global styles and CSS variables
/lib
  utils.ts         # Utility functions (cn for className merging)
/public            # Static assets
```

### Key Design Patterns

1. **Navigation Structure**:
   - Fixed left sidebar (16px wide) with icon navigation
   - Top navigation bar with pill-style tabs for main views
   - User profile menu in top-right corner

2. **Styling Approach**:
   - Purple gradient theme for navigation
   - Tailwind CSS with custom configuration
   - CSS variables for theming support
   - Radix UI for accessible components

3. **Component Organization**:
   - Client components marked with 'use client'
   - Server components by default
   - UI primitives in separate /ui directory

## Visual Testing with Playwright

The project uses Playwright for visual regression testing to ensure UI consistency. **Visual testing is critical** - code can look correct but styling frameworks might not be working, leading to broken UIs.

### Critical Learning: Visual Reality vs Code Correctness

**Key Insight**: HTML classes can exist in the DOM but if CSS frameworks aren't working, the UI will appear broken. Always validate visually, not just through code inspection.

**Example**: During development, we encountered an issue where:
- ✅ HTML contained correct Tailwind classes (`bg-purple-600`, `rounded-full`, etc.)
- ✅ Components were properly structured and exported
- ❌ **But Tailwind CSS v4 wasn't compatible with our setup**, so no styles applied
- ❌ UI appeared completely broken despite "correct" code

**Solution**: Downgraded to Tailwind v3 with proper PostCSS configuration.

### When to Use Visual Tests Immediately

**Run visual tests FIRST when:**
- User reports "styling looks wrong" or "UI doesn't match design"
- After CSS framework updates (Tailwind, etc.)
- When classes exist in HTML but visual output is unexpected
- Suspecting CSS framework configuration issues

**Regular testing (`npm run test:visual`) when:**
- After making any CSS/styling changes
- Before committing UI changes
- After dependency updates that might affect styling
- When debugging visual issues across browsers

**Update baselines (`npm run test:visual:update`) when:**
- Intentionally changing UI design (document why)
- After fixing confirmed styling framework issues
- Adding new visual test cases
- After major refactoring affecting layout

### CSS Framework Validation

**Common Issues to Test For:**
- Tailwind CSS version compatibility (v3 vs v4 configuration differences)
- PostCSS configuration correctness
- CSS imports and build pipeline functioning
- Custom color classes and gradients working

**Quick CSS Framework Check:**
```bash
# 1. First check if basic Tailwind classes work
# Look for simple classes like bg-red-500, text-white in browser dev tools
# 2. If classes aren't applying styles, check:
npm ls tailwindcss  # Version check
# 3. Verify PostCSS config matches Tailwind version
# 4. Run visual tests to see actual output vs expected
npm run test:visual:update
```

### Component-Level Testing Strategy

**Test Organization:**
- **Individual Components**: Navigation, MainApp, UserMenu in isolation
- **Component States**: Active/inactive buttons, open/closed dropdowns
- **Integration**: How components work together in layouts  
- **Responsive**: Multiple viewport sizes
- **Framework Validation**: Ensure CSS frameworks function correctly

### Troubleshooting Visual Issues

**When user reports visual problems:**

1. **Visual First**: Run `npm run test:visual:update` to see current state
2. **Framework Check**: Verify CSS framework (Tailwind) is working
3. **Browser Reality**: Check what browser actually renders, not just HTML
4. **Dependency Audit**: Check if recent updates broke CSS pipeline
5. **Incremental Testing**: Test components individually to isolate issues

### Running Tests
```bash
# Run visual tests (compares against baseline)
npm run test:visual

# Update baseline screenshots after intentional changes
npm run test:visual:update

# Interactive UI mode for debugging failures
npm run test:visual:ui

# Quick screenshot capture for manual review
node capture-screenshot.js

# Test specific components (when implemented)
npm run test:visual -- --grep "Navigation"
```

### Test Files and Structure
- `tests/visual.spec.ts` - Main visual regression test suite
- `tests/visual.spec.ts-snapshots/` - Baseline screenshots (version controlled)  
- `tests/components/` - Component-specific visual tests (planned)
- `playwright.config.ts` - Playwright configuration with multiple viewports
- `capture-screenshot.js` - Quick utility for manual screenshots

### Visual Testing Best Practices

1. **Trust Visual Feedback**: If users say UI looks wrong, investigate visually first
2. **Test Foundations**: Validate CSS frameworks before testing components
3. **Component Isolation**: Test individual components to isolate issues quickly
4. **Document Changes**: When updating snapshots, document what changed and why
5. **Multiple Viewports**: Test responsive behavior across screen sizes
6. **State Coverage**: Test interactive states (hover, active, open dropdowns)

## Important Notes

- The application uses Next.js App Router for routing
- Navigation components are client-side for interactivity
- Mock user data is currently hardcoded in UserMenu component
- The left navigation currently links to placeholder routes (#)
- Visual tests ensure UI consistency across changes
- Barlow font is loaded from Google Fonts for consistent typography