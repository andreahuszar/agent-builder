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

## Current Limitations

- Mock user data is hardcoded in UserMenu component
- Left navigation sidebar links to placeholder routes (#)