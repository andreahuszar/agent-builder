# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**End-to-End Invoice Processing Application** - A comprehensive Next.js application for managing the complete invoice lifecycle, from document scanning to payment processing. Features AI-powered invoice extraction via computer vision, structured data storage, automated workflows, and intelligent document processing. Built with TypeScript, Tailwind CSS, PostgreSQL, and integrated with both OpenAI and Anthropic AI services.

## ⚠️ IMPORTANT: Already Implemented Services

**DO NOT recreate or duplicate these services - they are FULLY IMPLEMENTED and ready to use:**

### ✅ Database (PostgreSQL + Prisma)
- Complete database setup with models for Invoice, PurchaseOrder, User
- Local development with Docker
- Automatic migrations on Railway deployment
- Use existing Prisma client at `@/lib/db`

### ✅ OpenAI Integration (GPT-4 Turbo)
- Full service layer at `/lib/openai`
- API routes at `/api/openai/*`
- React hooks: `useOpenAI`, `useChat`
- Configured for GPT-4 Turbo model

### ✅ Anthropic Integration (Claude 4.0 Sonnet + Vision)
- Complete Vision support for invoice scanning
- Service layer at `/lib/anthropic`
- API routes at `/api/anthropic/*`
- React hooks: `useAnthropic`, `useAnthropicVision`
- Invoice extraction ready at `/api/anthropic/extract-invoice`

**When implementing new features, USE these existing services rather than creating new ones.**

## Development Setup

```bash
# Install dependencies
npm install

# Start local PostgreSQL database
npm run db:dev

# Run development server (uses port 3001 locally)
PORT=3001 npm run dev

# Open Prisma Studio to view/edit database
npm run db:studio

# Build for production
npm run build
```

## Database Migrations
- **System**: Manual SQL migrations with tracking (no auto-diffing)
- **Location**: `/migrations/*.sql` files executed in order
- **Add new**: Create SQL file, add to list in `scripts/migrate-sql-safe.js`
- **Run locally**: `npm run db:migrate:sql`
- **Deploy**: `npm run deploy` (runs automatically on Railway)
- **Convention**: `XXX_description.sql` (e.g., `091_add_invoice_field.sql`)
- **Full Guide**: See `MIGRATION_SAFETY_REPORT.md` for templates and detailed instructions

## Key Commands

### Application
- `PORT=3001 npm run dev` - Start development server on port 3001
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run test:visual` - Run Playwright visual regression tests
- `npm run test:visual:update` - Update visual test baseline screenshots
- `npm run test:visual:ui` - Open Playwright UI mode for interactive testing

### Database
- `npm run db:dev` - Start PostgreSQL in Docker
- `npm run db:down` - Stop PostgreSQL container
- `npm run db:studio` - Open Prisma Studio GUI (port 5555)
- `npm run db:migrate:dev` - Create and apply migrations (development)
- `npm run db:migrate:deploy` - Apply migrations (production)
- `npm run db:push` - Push schema changes without migration
- `npm run db:seed` - Seed database with sample data

## Technology Stack

### Core
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom Xelix purple theme
- **UI Components**: Radix UI primitives
- **Icons**: Lucide React

### Database
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Local Development**: Docker Compose
- **Connection Pooling**: Built-in with Prisma

### AI Services
- **OpenAI**: GPT-4 Turbo for text processing
- **Anthropic**: Claude 3.5 Sonnet with Vision for invoice extraction
- **Image Processing**: Support for JPEG, PNG, GIF, WebP

### Deployment
- **Platform**: Railway
- **CI/CD**: Automatic deployment on push to main
- **Database**: Railway PostgreSQL service

## Database Schema

```prisma
// Main models ready for use:

model Invoice {
  id            String   @id @default(cuid())
  invoiceNumber String   @unique
  vendorName    String
  amount        Decimal
  currency      String   @default("USD")
  status        String   @default("pending")
  
  dueDate       DateTime
  // ... full schema in prisma/schema.prisma
}

model PurchaseOrder {
  id          String   @id @default(cuid())
  poNumber    String   @unique
  vendorName  String
  totalAmount Decimal
  status      String   @default("draft")
  // ... full schema in prisma/schema.prisma
}
```

## Project Structure

```
/app
  /api               # API Routes
    /anthropic       # Anthropic AI endpoints
      /chat          # Claude chat endpoint
      /vision        # Image analysis endpoint
      /extract-invoice # Invoice extraction endpoint
    /openai          # OpenAI endpoints
      /chat          # GPT-4 chat endpoint
      /validate      # API key validation
    /test-db         # Database connection test
  /components        # Reusable components
    /ai              # AI-specific components
      ApiKeyInput.tsx # OpenAI key management
      AnthropicApiKeyInput.tsx # Anthropic key management
      InvoiceScanner.tsx # Vision-based invoice scanner
      ChatInterface.tsx # AI chat interface
    /ui              # UI primitives (tooltip, dropdown-menu, etc.)
    Navigation.tsx   # Left sidebar navigation
    UserMenu.tsx     # User profile dropdown
  /hooks             # Custom React hooks
    useOpenAI.ts     # OpenAI integration hook
    useAnthropic.ts  # Anthropic integration hook
    useAnthropicVision.ts # Vision processing hook
    useChat.ts       # Chat functionality hook
  /invoices          # Invoices page
  /purchase-orders   # Purchase orders page
  /settings          # Settings page with AI configuration
  
/lib
  /anthropic         # Anthropic service layer
    client.ts        # Anthropic client initialization
    service.ts       # Service methods including Vision
    types.ts         # TypeScript types
    config.ts        # Model configuration
  /openai            # OpenAI service layer
    client.ts        # OpenAI client initialization
    service.ts       # Service methods
    types.ts         # TypeScript types
    config.ts        # Model configuration
  /db                # Database layer
    prisma.ts        # Prisma client singleton
    index.ts         # Database exports
    
/prisma
  schema.prisma      # Database schema
  /migrations        # Database migrations
  seed.ts            # Database seeding script
  
/public              # Static assets
/tests               # Test suites
  visual.spec.ts     # Visual regression tests
```

## AI Services Integration

### OpenAI (GPT-4 Turbo)
```typescript
// Already implemented - just use it!
import { useOpenAI } from '@/app/hooks/useOpenAI';

const { sendMessage } = useOpenAI();
const response = await sendMessage(messages);
```

### Anthropic Vision (Invoice Extraction)
```typescript
// Already implemented - just use it!
import { useAnthropicVision } from '@/app/hooks/useAnthropicVision';

const { extractInvoice } = useAnthropicVision();
const invoiceData = await extractInvoice(file);
// Returns structured data with vendor, items, totals, etc.
```

### Available API Endpoints
- `POST /api/anthropic/extract-invoice` - Extract invoice data from image
- `POST /api/anthropic/vision` - General image analysis
- `POST /api/anthropic/chat` - Chat with Claude
- `POST /api/openai/chat` - Chat with GPT-4
- `GET /api/test-db` - Test database connection

## Railway Deployment

### Environment Variables (Set in Railway)
```env
# Database (automatically set by Railway)
DATABASE_URL=${{xelix-postgres.DATABASE_PRIVATE_URL}}

# AI Services (add your keys)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

### Deployment Process
1. Push to main branch on GitHub
2. Railway automatically:
   - Pulls latest code
   - Runs `npm install` and `prisma generate`
   - Builds with `next build`
   - Runs database migrations
   - Starts the application

### Database Migrations
Migrations run automatically on deployment via the start command:
```json
"start": "npx prisma migrate deploy && next start"
```

## Development Workflow & Testing Strategy

### Mandatory Testing Checkpoints
**ALWAYS run `npm run test:visual` before claiming any task is complete:**

1. **After ANY component changes** → Run tests BEFORE checking browser
2. **After CSS/Tailwind changes** → Tests catch framework breaks  
3. **Before saying "done"** → Tests are the final verification
4. **After dependency updates** → Especially CSS-related packages

### Working with Existing Services

When adding new features:
1. **Check if service exists** - Database, OpenAI, and Anthropic are ready
2. **Use existing hooks** - Don't create new API integrations
3. **Follow patterns** - Look at existing implementations
4. **Test locally** - Use `PORT=3001 npm run dev`
5. **Check database** - Use `npm run db:studio` to view data

## Design System

The project uses a centralized Xelix brand color system defined in `tailwind.config.ts`.

### Key Colors
- **Primary Brand Color**: Purple-900 (#5a1899) - Use for all primary action buttons
- **Secondary**: Purple-600 - Reserved for specific UI elements (e.g., UserMenu profile container)
- **Navigation Gradient**: `bg-brand-gradient`

### Brand Color Constants
A centralized color constants file exists at `/app/constants/colors.ts` with:
- `BRAND_COLORS` object containing primary button classes
- Helper function `getBrandButtonClass()` for consistent button styling

### Usage Guidelines
- **ALWAYS** use `bg-purple-900` (brand primary) for all primary action buttons
- **ALWAYS** use `hover:bg-purple-800` for primary button hover states (lighter/brighter on hover)
- **NEVER** use `bg-purple-600` for buttons (except UserMenu profile container)
- **ALWAYS** use colors from the centralized Xelix palette
- **NEVER** hardcode RGB/hex values directly in components
- Consider using the brand color constants from `/app/constants/colors.ts` for consistency
- Extend the color system in `tailwind.config.ts` when needed

### Default Button Styling
**Preferred default button classes:**
```
px-3 py-1.5 text-sm bg-purple-900 text-white rounded-md hover:bg-purple-800 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2
```
- **Padding**: `px-3 py-1.5` (compact size)
- **Text size**: `text-sm` 
- **Colors**: `bg-purple-900` with `hover:bg-purple-800`
- **Focus states**: Include ring for accessibility
- This compact size should be used as the default for all action buttons unless a specific context requires larger sizing

### Default Text Color
**Standard text color guidelines for maximum readability:**
- **Primary text**: `text-gray-950` - **ALWAYS** use for all main content, headings, labels, and table data
- **Muted text**: `text-gray-500` - Only for truly secondary information or disabled states
- **Placeholder text**: `text-gray-400` - For input placeholders only
- **Links**: Keep existing purple colors (`text-purple-600`) for interactive elements

**Important**: 
- **NEVER** use `text-gray-900`, `text-gray-800`, or lighter shades for primary content
- Default to `text-gray-950` unless explicitly needed otherwise
- This ensures maximum readability and contrast across the application
- When in doubt, use `text-gray-950`

- **ALWAYS** double check more **substantial UI changes** through Playwright quick visual testing, don't rely e.g. on extrapolation of CSS, always confirm visually. Make sure that visually it matches the user requirements, plus use your own judgement as you are a professional UI/UX Designer at this stage (think visual taste, visual consistency with the rest of the project, accessibility, etc.).

## Performance Standards

### Targets
- **Bundle Size**: First load JS < 200KB (currently ~150KB)
- **Web Vitals**: LCP < 2.5s, FID < 100ms, CLS < 0.1
- **Database Queries**: Use Prisma's query optimization
- **Image Processing**: Max 10MB, automatic format validation

### Optimizations
- React.memo for frequently re-rendering components
- Debounce/throttle for search and input handlers
- Lazy loading for heavy components
- Server-side API routes for security

## Accessibility Standards

### WCAG 2.1 AA Compliance
- Semantic HTML elements
- ARIA labels for all interactive elements
- Keyboard navigation (Tab, Enter, Escape, Arrow keys)
- Platform-specific modifiers (Cmd on Mac, Ctrl on Windows/Linux)
- Screen reader announcements for dynamic changes
- Color contrast ratio ≥ 4.5:1

## Current Status

### ✅ Implemented Features
- **Complete Database Layer** with PostgreSQL and Prisma ORM
- **AI Services Integration** with OpenAI and Anthropic
- **Invoice Vision Processing** for automatic data extraction
- **Two-tier Navigation System** with sidebar and top pills
- **Comprehensive Accessibility** (WCAG 2.1 AA compliant)
- **Performance Optimizations** with monitoring
- **Railway Deployment** with automatic CI/CD
- **Local Development Setup** with Docker

### 🚧 Current Limitations
- Mock user data hardcoded in UserMenu component
- No authentication system yet
- Some navigation items marked as disabled (placeholder)
- Invoice processing workflow not fully automated
- No email integration for invoice ingestion

### 📋 Database Models Ready for Use
- `Invoice` - Full invoice data structure
- `PurchaseOrder` - PO management
- `User` - User accounts (schema ready)
- `TestMigration` - Database testing

## Important Notes for Development

1. **Database is ready** - Use Prisma client at `@/lib/db`
2. **AI services are integrated** - Use existing hooks and services
3. **Vision extraction works** - Test with any invoice image
4. **Local dev uses port 3001** - Always use `PORT=3001 npm run dev`
5. **Railway handles deployment** - Just push to main branch
6. **Don't duplicate services** - Check `/lib` and `/app/api` first

## Quick Start for New Features

```bash
# 1. Start database
npm run db:dev

# 2. Start dev server
PORT=3001 npm run dev

# 3. View database
npm run db:studio

# 4. Test your changes
npm run test:visual

# 5. Deploy
git push origin main  # Railway auto-deploys
```

## Support Documentation

- `OPENAI_SETUP.md` - OpenAI configuration guide
- `ANTHROPIC_SETUP.md` - Anthropic and Vision setup
- `DATABASE_SETUP.md` - Database configuration
- `RAILWAY_ENV_SETUP.md` - Railway deployment guide