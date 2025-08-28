# Developer Experience Improvements

## Overview
Enhance the development workflow with better tooling, documentation, and automation to improve productivity and code quality.

## 1. Storybook Setup

### Installation and Configuration
```bash
npx storybook@latest init
```

### Component Stories
```typescript
// stories/Navigation.stories.tsx
import type { Meta, StoryObj } from '@storybook/react'
import Navigation from '@/app/components/Navigation'

const meta: Meta<typeof Navigation> = {
  title: 'Components/Navigation',
  component: Navigation,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    activeModule: {
      control: 'select',
      options: ['invoice-processing', 'transactions', 'helpdesk', 'settings'],
    },
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    activeModule: 'invoice-processing',
  },
}

export const Expanded: Story = {
  args: {
    activeModule: 'invoice-processing',
  },
  play: async ({ canvasElement }) => {
    const nav = canvasElement.querySelector('nav')
    await userEvent.hover(nav)
  },
}

export const WithTooltips: Story = {
  args: {
    activeModule: 'transactions',
  },
  play: async ({ canvasElement }) => {
    const button = canvasElement.querySelector('[aria-disabled="true"]')
    await userEvent.click(button)
  },
}
```

### Storybook Addons
```javascript
// .storybook/main.js
module.exports = {
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-a11y',
    '@storybook/addon-interactions',
    '@storybook/addon-coverage',
    'storybook-addon-designs',
    'storybook-dark-mode',
  ],
}
```

## 2. Git Hooks with Husky

### Setup
```bash
npm install --save-dev husky lint-staged
npx husky init
```

### Pre-commit Hook
```bash
# .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npx lint-staged
npm run typecheck
```

### Pre-push Hook
```bash
# .husky/pre-push
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npm run test
npm run build
```

### Lint-staged Configuration
```json
// .lintstagedrc.json
{
  "*.{js,jsx,ts,tsx}": [
    "eslint --fix",
    "prettier --write"
  ],
  "*.{css,md,json}": [
    "prettier --write"
  ]
}
```

## 3. Enhanced ESLint & Prettier

### ESLint Configuration
```javascript
// .eslintrc.js
module.exports = {
  extends: [
    'next/core-web-vitals',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
    'plugin:tailwindcss/recommended',
    'prettier',
  ],
  plugins: ['@typescript-eslint', 'react-hooks', 'jsx-a11y', 'tailwindcss'],
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
    }],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    'jsx-a11y/anchor-is-valid': 'off', // Next.js Link component
    'tailwindcss/classnames-order': 'warn',
    'tailwindcss/no-custom-classname': 'off',
  },
  overrides: [
    {
      files: ['*.test.ts', '*.test.tsx'],
      env: {
        jest: true,
      },
    },
  ],
}
```

### Prettier Configuration
```json
// .prettierrc
{
  "semi": false,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false,
  "bracketSpacing": true,
  "arrowParens": "always",
  "endOfLine": "lf",
  "plugins": ["prettier-plugin-tailwindcss"],
  "tailwindFunctions": ["clsx", "cn"]
}
```

## 4. VS Code Workspace Settings

### Workspace Configuration
```json
// .vscode/settings.json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "tailwindCSS.experimental.classRegex": [
    ["cn\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"],
    ["clsx\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"]
  ],
  "files.associations": {
    "*.css": "tailwindcss"
  },
  "editor.quickSuggestions": {
    "strings": true
  }
}
```

### Recommended Extensions
```json
// .vscode/extensions.json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "prisma.prisma",
    "formulahendry.auto-rename-tag",
    "christian-kohler.npm-intellisense",
    "visualstudioexptteam.vscodeintellicode",
    "ms-vscode.vscode-typescript-next",
    "csstools.postcss",
    "wix.vscode-import-cost"
  ]
}
```

### Debug Configuration
```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Next.js: debug server-side",
      "type": "node-terminal",
      "request": "launch",
      "command": "npm run dev"
    },
    {
      "name": "Next.js: debug client-side",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:3000"
    },
    {
      "name": "Next.js: debug full stack",
      "type": "node-terminal",
      "request": "launch",
      "command": "npm run dev",
      "serverReadyAction": {
        "pattern": "ready on",
        "uriFormat": "http://localhost:3000",
        "action": "debugWithChrome"
      }
    }
  ]
}
```

## 5. Development Environment Setup

### Environment Variables Management
```typescript
// lib/env.ts
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  DATABASE_URL: z.string().url(),
  NEXT_PUBLIC_API_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  // Add more as needed
})

export const env = envSchema.parse(process.env)
```

### Docker Development Environment
```yaml
# docker-compose.dev.yml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    volumes:
      - .:/app
      - /app/node_modules
      - /app/.next
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://user:pass@db:5432/invoices
    depends_on:
      - db
      - redis

  db:
    image: postgres:15
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
      POSTGRES_DB: invoices
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

## 6. Code Generation Tools

### Component Generator
```bash
# scripts/generate-component.js
const fs = require('fs')
const path = require('path')

const componentTemplate = `import React from 'react'

interface {{name}}Props {
  // Add props here
}

const {{name}}: React.FC<{{name}}Props> = (props) => {
  return (
    <div>
      {/* Component content */}
    </div>
  )
}

export default {{name}}`

const storyTemplate = `import type { Meta, StoryObj } from '@storybook/react'
import {{name}} from '@/app/components/{{name}}'

const meta: Meta<typeof {{name}}> = {
  title: 'Components/{{name}}',
  component: {{name}},
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}`

const testTemplate = `import { render, screen } from '@testing-library/react'
import {{name}} from '@/app/components/{{name}}'

describe('{{name}}', () => {
  it('renders without crashing', () => {
    render(<{{name}} />)
    // Add assertions
  })
})`

// Usage: node scripts/generate-component.js ComponentName
```

### API Route Generator
```bash
# scripts/generate-api.js
const apiTemplate = `import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const schema = z.object({
  // Define schema
})

export async function GET(request: NextRequest) {
  try {
    // Handle GET request
    return NextResponse.json({ data: [] })
  } catch (error) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = schema.parse(body)
    
    // Handle POST request
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}`
```

## 7. Documentation Tools

### JSDoc Comments
```typescript
/**
 * Navigation component that provides the main sidebar navigation
 * 
 * @component
 * @example
 * ```tsx
 * <Navigation 
 *   activeModule="invoice-processing" 
 *   onModuleChange={(module) => console.log(module)}
 * />
 * ```
 */
export interface NavigationProps {
  /** Currently active module */
  activeModule?: string
  /** Callback when module changes */
  onModuleChange?: (moduleId: string) => void
}
```

### API Documentation with Swagger
```typescript
// app/api/swagger/route.ts
import { createSwaggerSpec } from 'next-swagger-doc'

const spec = createSwaggerSpec({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Invoice Processing API',
      version: '1.0.0',
    },
  },
})

export async function GET() {
  return Response.json(spec)
}
```

## 8. Development Scripts

### Package.json Scripts
```json
{
  "scripts": {
    "dev": "next dev",
    "dev:turbo": "next dev --turbo",
    "build": "next build",
    "start": "next start",
    "lint": "eslint . --ext .ts,.tsx",
    "lint:fix": "eslint . --ext .ts,.tsx --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "typecheck": "tsc --noEmit",
    "test": "vitest",
    "test:watch": "vitest watch",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui",
    "test:e2e": "playwright test",
    "analyze": "ANALYZE=true npm run build",
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build",
    "generate:component": "node scripts/generate-component.js",
    "generate:api": "node scripts/generate-api.js",
    "db:migrate": "prisma migrate dev",
    "db:push": "prisma db push",
    "db:seed": "prisma db seed",
    "clean": "rm -rf .next node_modules",
    "reinstall": "npm run clean && npm install",
    "check-all": "npm run lint && npm run typecheck && npm run test"
  }
}
```

## 9. Performance Profiling

### React DevTools Profiler Setup
```typescript
// lib/profiler.ts
export const onRenderCallback = (
  id: string,
  phase: 'mount' | 'update',
  actualDuration: number,
  baseDuration: number,
  startTime: number,
  commitTime: number
) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`Component ${id} (${phase}):`, {
      actualDuration,
      baseDuration,
      startTime,
      commitTime,
    })
    
    // Send to monitoring in production
    if (actualDuration > 16) { // Longer than one frame
      console.warn(`Slow render detected in ${id}: ${actualDuration}ms`)
    }
  }
}

// Usage
<Profiler id="Navigation" onRender={onRenderCallback}>
  <Navigation />
</Profiler>
```

## 10. Team Onboarding

### README Template
```markdown
# Invoice Processing Application

## Quick Start
1. Clone the repository
2. Copy `.env.example` to `.env.local`
3. Run `npm install`
4. Run `npm run dev`
5. Open http://localhost:3000

## Development Workflow
- Create feature branch from `main`
- Make changes (components auto-reload)
- Run `npm run check-all` before committing
- Create PR with description

## Key Commands
- `npm run dev` - Start development server
- `npm run storybook` - Component development
- `npm run test:watch` - Run tests in watch mode
- `npm run generate:component Name` - Generate component

## Architecture
- `/app` - Next.js app directory
- `/components` - Reusable components
- `/lib` - Utilities and helpers
- `/tests` - Test files
```

## Success Metrics

- Setup time for new developer < 30 minutes
- Pre-commit checks catch 90% of issues
- Component development time reduced by 50%
- Code review time reduced by 30%
- Test coverage maintained above 80%