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

## Development Workflow & Testing Strategy

### Mandatory Testing Checkpoints
**ALWAYS run `npm run test:visual` before claiming any task is complete:**

1. **After ANY component changes** → Run tests BEFORE checking browser
2. **After CSS/Tailwind changes** → Tests catch framework breaks  
3. **Before saying "done"** → Tests are the final verification
4. **After dependency updates** → Especially CSS-related packages

### The Golden Rule: Test → Fix → Update
```
1. Run tests first: npm run test:visual
2. If tests fail:
   - Expected change? → Update baselines: npm run test:visual:update
   - Unexpected? → Fix the issue, then re-test
3. Never skip tests thinking "it looks fine in browser"
```

### When to Update Baselines
**ONLY update snapshots (`npm run test:visual:update`) when:**
- ✅ The visual change was intentional (new design)
- ✅ You've verified the change looks correct in browser
- ✅ The change is part of the requested task

**NEVER update snapshots when:**
- ❌ Tests fail unexpectedly
- ❌ You haven't checked the actual UI
- ❌ You're "just trying to make tests pass"

### Workflow Integration
Consider the task incomplete until:
1. Code changes done
2. Visual tests pass OR baselines intentionally updated
3. Browser verification matches test results

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
    /ui            # UI primitives (tooltip, dropdown-menu, etc.)
    Navigation.tsx # Left sidebar navigation with tooltips
    NavigationPills.tsx # Reusable navigation pills component
    TopNavigation.tsx # Top navigation pills (deprecated)
    UserMenu.tsx   # User profile dropdown
    WebVitals.tsx  # Performance monitoring component
    AppLayout.tsx  # Module layout wrapper
  /hooks           # Custom React hooks
    useKeyboardNavigation.ts # Cross-platform keyboard shortcuts
  /utils           # Utility functions
    accessibility.ts # ARIA helpers and screen reader utils
    performance.ts # Performance monitoring utilities
  /constants       # Application constants
    navigation.ts  # Navigation configuration
  /invoices        # Invoices page
  /purchase-orders # Purchase orders page
  /helpdesk        # Helpdesk module page
  /settings        # Settings page
  layout.tsx       # Root layout with navigation
  page.tsx         # Home/Workspace page
  globals.css      # Global styles and CSS variables
/lib
  utils.ts         # Utility functions (cn for className merging)
/plans            # Future improvement documentation
  *.md            # Detailed improvement plans
/public            # Static assets
/tests
  /utils          # Testing utilities
    testing-helpers.ts # Reusable test patterns
```

### Key Design Patterns

1. **Navigation Structure** (Two-tier hierarchy):
   - **Left sidebar (64px)**: Primary module icons (Invoice Processing, Transactions, Statements, etc.)
   - **Top bar pills**: Secondary navigation - changes based on active sidebar module
   - **Parent→Child flow**: Sidebar icon selection → reveals module-specific pill tabs
   - **Example**: Invoice Processing (sidebar) → Workspace/Invoices/Purchase Orders (pills)
   - Active states: purple-900 (sidebar), purple-600 (pills)

2. **Styling Approach**:
   - Purple gradient theme for navigation
   - Tailwind CSS with custom configuration
   - CSS variables for theming support
   - Radix UI for accessible components
   - Barlow font from Google Fonts

3. **Component Organization**:
   - Client components marked with 'use client' (navigation for interactivity)
   - Server components by default
   - UI primitives in separate /ui directory

4. **DRY Principle (Don't Repeat Yourself)**:
   
   **Extract reusable components and utilities to avoid duplication:**
   
   ```tsx
   // ❌ BAD - Repeated code
   // File: invoices/page.tsx
   <nav className="flex gap-2">
     <button className="px-4 py-2 bg-purple-600">Tab 1</button>
     <button className="px-4 py-2 bg-gray-200">Tab 2</button>
   </nav>
   
   // File: purchase-orders/page.tsx  
   <nav className="flex gap-2">
     <button className="px-4 py-2 bg-purple-600">Tab A</button>
     <button className="px-4 py-2 bg-gray-200">Tab B</button>
   </nav>
   
   // ✅ GOOD - Reusable component
   // File: components/NavigationPills.tsx
   export const NavigationPills = ({ items, activeView, onViewChange }) => (
     <nav className="flex gap-2">
       {items.map(item => (
         <button 
           className={activeView === item.id ? 'bg-purple-600' : 'bg-gray-200'}
           onClick={() => onViewChange(item.id)}
         >
           {item.label}
         </button>
       ))}
     </nav>
   );
   ```
   
   **Key DRY practices in this codebase:**
   - **Shared constants**: Navigation items, colors, dimensions in `/app/constants/`
   - **Utility functions**: `cn()` for className merging, accessibility helpers
   - **Reusable hooks**: `useKeyboardNavigation` for consistent keyboard shortcuts
   - **Component composition**: `AppLayout` wrapper for module pages
   - **Style utilities**: Tailwind classes and CSS variables instead of inline styles
   - **Type definitions**: Shared interfaces to ensure consistency

## Design System

The project uses a centralized Xelix brand color system defined in `tailwind.config.ts`.

### Usage Guidelines:
- **ALWAYS** use colors from the centralized Xelix palette
- Use semantic color aliases (brand.primary, brand.secondary) for brand-specific usage
- **NEVER** hardcode RGB/hex values directly in components
- Extend the color system in `tailwind.config.ts` when new colors are needed
- Prefer existing color shades over creating new ones

### Color Architecture:
- **Brand Colors**: Complete Xelix color palettes (purple, gray, blue, green, orange, red, pink)
- **Semantic Aliases**: `brand.primary` (purple-900), `brand.secondary` (purple-600), `brand.accent` (pink-500)
- **CSS Variables**: Maps to Xelix colors for theming support
- **Gradient Utilities**: Pre-defined brand gradients (`bg-brand-gradient`)

### Available Color Tokens:
- **Primary Brand**: Purple scale (50-950) with purple-900 (#5a1899) as main
- **Neutral**: Gray scale (50-950) from Xelix palette
- **Semantic**: 
  - Success: Green scale
  - Error: Red scale
  - Warning: Orange scale
  - Info: Blue scale
  - Accent: Pink scale
- **Navigation Gradient**: `bg-brand-gradient` for sidebar

### Example Usage:
```tsx
// ✅ GOOD - Using centralized colors
<button className="bg-purple-900 text-white">
<div className="bg-brand-gradient">
<p className="text-gray-600">

// ❌ BAD - Hardcoding colors
<button className="bg-[#5a1899]">
<div className="bg-[linear-gradient(...)]">
```

## Performance Standards

### Component Performance Requirements

**ALL new components MUST implement performance optimizations:**

1. **Memoization**: Use `React.memo()` for components that re-render frequently
   ```tsx
   // ✅ GOOD - Memoized component
   export default memo(MyComponent);
   
   // For custom comparison
   export default memo(MyComponent, (prev, next) => {
     return prev.id === next.id; // Only re-render on id change
   });
   ```

2. **Event Handler Optimization**: Debounce/throttle expensive operations
   ```tsx
   import { debounce, throttle } from '@/app/utils/performance';
   
   const handleSearch = debounce((term: string) => {
     // Search logic
   }, 300);
   ```

3. **Lazy Loading**: Use dynamic imports for heavy components
   ```tsx
   const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
     loading: () => <Skeleton />,
   });
   ```

### Performance Targets
- **Bundle Size**: First load JS < 200KB
- **Web Vitals**: 
  - LCP < 2.5s
  - FID < 100ms
  - CLS < 0.1
- **Component Render**: < 16ms (60fps)

### Performance Monitoring
- Web Vitals are automatically tracked via `WebVitals` component
- Use `measureRenderTime()` for debugging slow components
- Monitor with: `npm run build && npx next-bundle-analyzer`

## Accessibility Standards

### WCAG 2.1 AA Compliance

**ALL components MUST meet accessibility requirements:**

1. **ARIA Attributes** (Required)
   ```tsx
   // Navigation example
   <nav role="navigation" aria-label="Main navigation">
     <button aria-current={isActive ? 'page' : undefined}>
   ```

2. **Keyboard Navigation**
   - All interactive elements keyboard accessible
   - Implement focus management
   - Support standard shortcuts (Tab, Enter, Escape, Arrow keys)
   - Platform-specific modifiers (Cmd on Mac, Ctrl on Windows/Linux)

3. **Screen Reader Support**
   ```tsx
   import { announceToScreenReader } from '@/app/utils/accessibility';
   
   // Announce dynamic changes
   announceToScreenReader('Navigation menu expanded');
   ```

4. **Skip Links** (Required for navigation-heavy pages)
   ```tsx
   <a href="#main-content" className="sr-only focus:not-sr-only">
     Skip to main content
   </a>
   ```

### Accessibility Checklist
- [ ] Semantic HTML elements used
- [ ] ARIA labels for all interactive elements
- [ ] Keyboard navigation fully functional
- [ ] Focus indicators visible
- [ ] Screen reader announcements for state changes
- [ ] Color contrast ratio ≥ 4.5:1 for text
- [ ] Alt text for all images
- [ ] Error messages associated with form fields

### Testing Accessibility
```bash
# Manual testing
- Navigate with keyboard only
- Test with screen reader (VoiceOver/NVDA)
- Check color contrast with browser DevTools

# Automated testing
- Playwright accessibility tests
- axe-core integration
```

## Visual Testing with Playwright

**Key Principle**: Visual tests catch CSS framework failures that code inspection misses. Always verify actual rendering, not just HTML classes.

### Commands
```bash
npm run test:visual         # Compare against baseline
npm run test:visual:update  # Update baseline screenshots  
npm run test:visual:ui      # Interactive debugging
```

### When to Run Visual Tests First
- User reports "UI looks broken" despite correct code
- After updating Tailwind config or CSS frameworks
- When styles don't apply despite correct classes

### Test Coverage
- `tests/visual.spec.ts` - Main suite with component snapshots
- `tests/css-framework.spec.ts` - Validates Tailwind/CSS working
- Tests: components, responsive views, interactive states
   - GitHub Actions workflow
   - Automated testing and deployment
   - Version management

## Current Status

### Implemented Features ✅
- **Two-tier navigation system** with sidebar modules and top pills
- **Modular navigation components** (NavigationPills reusable component)
- **Comprehensive accessibility** (WCAG 2.1 AA compliant)
  - ARIA attributes and semantic HTML
  - Cross-platform keyboard navigation (Cmd/Ctrl+1-7)
  - Screen reader announcements
  - Skip links for navigation
- **Performance optimizations**
  - React.memo for major components
  - Web Vitals monitoring
  - Bundle size < 150KB (target: < 200KB)
  - Debounce/throttle utilities
- **Visual feedback**
  - Tooltips with keyboard shortcuts for all nav items
  - Red flash animation for disabled items
  - Smooth hover transitions
- **Module pages**
  - Invoice Processing (Workspace, Invoices, Purchase Orders)
  - Helpdesk (Inbox, Kanban)
  - Settings (Automation)

### Current Limitations
- Mock user data is hardcoded in UserMenu component
- Some navigation items marked as disabled (placeholder functionality)
- No backend API integration (static data only)
- No real authentication system