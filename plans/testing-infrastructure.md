# Testing Infrastructure Plan

## Overview
Establish a comprehensive testing strategy covering unit, integration, and end-to-end tests to ensure application reliability and maintainability.

## 1. Testing Stack

### Core Tools
- **Vitest** or **Jest** - Unit testing framework
- **React Testing Library** - Component testing
- **Playwright** - E2E testing (already in use for visual tests)
- **MSW (Mock Service Worker)** - API mocking
- **Testing Library User Event** - User interaction simulation

### Supporting Tools
- **Coverage Reports** - Istanbul/nyc
- **Test Data Factories** - Faker.js
- **Snapshot Testing** - For component output
- **Accessibility Testing** - jest-axe

## 2. Unit Testing

### Component Tests
```typescript
// __tests__/Navigation.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import Navigation from '@/app/components/Navigation'

describe('Navigation', () => {
  it('expands on hover', async () => {
    render(<Navigation activeModule="invoice-processing" />)
    const nav = screen.getByRole('navigation')
    
    fireEvent.mouseEnter(nav)
    await waitFor(() => {
      expect(nav).toHaveAttribute('aria-expanded', 'true')
    })
  })
  
  it('shows tooltips for disabled items', () => {
    render(<Navigation />)
    const transactionsBtn = screen.getByLabelText(/transactions/i)
    
    fireEvent.click(transactionsBtn)
    expect(screen.getByText('Not implemented in prototype')).toBeInTheDocument()
  })
})
```

### Hook Tests
```typescript
// __tests__/useKeyboardNavigation.test.ts
import { renderHook } from '@testing-library/react'
import { useKeyboardNavigation } from '@/app/hooks/useKeyboardNavigation'

describe('useKeyboardNavigation', () => {
  it('navigates on Cmd+1', () => {
    const onModuleChange = jest.fn()
    renderHook(() => useKeyboardNavigation({ onModuleChange }))
    
    fireEvent.keyDown(window, { key: '1', metaKey: true })
    expect(onModuleChange).toHaveBeenCalledWith('invoice-processing')
  })
})
```

### Utility Function Tests
```typescript
// __tests__/accessibility.test.ts
describe('getNavItemAriaLabel', () => {
  it('includes current page indicator', () => {
    const label = getNavItemAriaLabel('Invoices', true, false)
    expect(label).toBe('Invoices (current page)')
  })
  
  it('includes disabled state', () => {
    const label = getNavItemAriaLabel('Vendors', false, true)
    expect(label).toBe('Vendors - Not available in prototype')
  })
})
```

## 3. Integration Testing

### Page Flow Tests
```typescript
// __tests__/invoice-flow.test.tsx
describe('Invoice Processing Flow', () => {
  it('navigates between invoice views', async () => {
    render(<App />)
    
    // Start at dashboard
    expect(screen.getByText('Invoice Processing Dashboard')).toBeInTheDocument()
    
    // Navigate to invoices
    fireEvent.click(screen.getByText('Invoices'))
    expect(screen.getByText('All Invoices')).toBeInTheDocument()
    
    // Navigate to purchase orders
    fireEvent.click(screen.getByText('Purchase Orders'))
    expect(screen.getByText('Purchase Orders')).toBeInTheDocument()
  })
})
```

### API Integration Tests
```typescript
// __tests__/api/invoices.test.ts
import { setupServer } from 'msw/node'
import { rest } from 'msw'

const server = setupServer(
  rest.get('/api/invoices', (req, res, ctx) => {
    return res(ctx.json({ invoices: mockInvoices }))
  })
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('Invoice API', () => {
  it('loads invoices', async () => {
    const { result } = renderHook(() => useInvoices())
    
    await waitFor(() => {
      expect(result.current.invoices).toHaveLength(3)
    })
  })
})
```

## 4. E2E Testing

### Expand Existing Playwright Tests
```typescript
// tests/user-workflows.spec.ts
test.describe('Complete User Workflows', () => {
  test('approve invoice workflow', async ({ page }) => {
    await page.goto('/')
    await page.click('text=Invoices')
    await page.click('text=Pending')
    await page.click('[data-testid="invoice-INV-001"]')
    await page.click('text=Approve')
    await expect(page.locator('.toast-success')).toContainText('approved')
  })
  
  test('keyboard navigation workflow', async ({ page }) => {
    await page.goto('/')
    await page.keyboard.press('Meta+2') // Navigate to Transactions
    await expect(page.locator('[aria-current="page"]')).toContainText('Transactions')
  })
})
```

### Visual Regression Tests (Already Implemented)
- Continue using current Playwright visual tests
- Add tests for new components
- Test responsive breakpoints
- Test interaction states

## 5. Test Data Management

### Factory Functions
```typescript
// tests/factories/invoice.factory.ts
import { faker } from '@faker-js/faker'

export const createInvoice = (overrides = {}) => ({
  id: faker.string.uuid(),
  invoiceNumber: `INV-${faker.number.int({ min: 1000, max: 9999 })}`,
  vendor: faker.company.name(),
  amount: faker.number.float({ min: 100, max: 10000, precision: 0.01 }),
  date: faker.date.recent(),
  status: faker.helpers.arrayElement(['pending', 'approved', 'rejected']),
  ...overrides
})

export const createInvoices = (count = 5) => 
  Array.from({ length: count }, createInvoice)
```

### Seed Data
```typescript
// tests/seeds/test-data.ts
export const testData = {
  invoices: createInvoices(10),
  purchaseOrders: createPurchaseOrders(5),
  vendors: createVendors(15)
}
```

## 6. Testing Best Practices

### Component Testing Guidelines
1. Test user interactions, not implementation
2. Use data-testid sparingly
3. Query by accessible roles first
4. Test the happy path and edge cases
5. Keep tests isolated and independent

### Test Structure
```typescript
describe('Component/Feature Name', () => {
  describe('when condition', () => {
    it('should expected behavior', () => {
      // Arrange
      const props = { ... }
      
      // Act
      render(<Component {...props} />)
      fireEvent.click(screen.getByText('Button'))
      
      // Assert
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
  })
})
```

## 7. Coverage Requirements

### Target Coverage
- **Overall**: 80%
- **Critical Paths**: 95%
- **Utilities**: 100%
- **New Code**: 90%

### Coverage Configuration
```javascript
// vitest.config.ts
export default {
  test: {
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '*.config.js',
        '.next/'
      ],
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80
      }
    }
  }
}
```

## 8. CI/CD Integration

### GitHub Actions Workflow
```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:unit
      - run: npm run test:integration
      - run: npx playwright install
      - run: npm run test:e2e
      - uses: codecov/codecov-action@v3
```

### Pre-commit Hooks
```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run test:related"
    }
  }
}
```

## 9. Testing Scripts

### Package.json Scripts
```json
{
  "scripts": {
    "test": "vitest",
    "test:unit": "vitest run --config vitest.unit.config.ts",
    "test:integration": "vitest run --config vitest.integration.config.ts",
    "test:e2e": "playwright test",
    "test:watch": "vitest watch",
    "test:coverage": "vitest run --coverage",
    "test:related": "vitest related",
    "test:ui": "vitest --ui"
  }
}
```

## 10. Performance Testing

### Load Testing
```typescript
// tests/performance/load.test.ts
describe('Performance', () => {
  it('renders 1000 invoices without lag', async () => {
    const invoices = createInvoices(1000)
    const start = performance.now()
    
    render(<InvoiceList invoices={invoices} />)
    
    const renderTime = performance.now() - start
    expect(renderTime).toBeLessThan(1000) // Under 1 second
  })
})
```

### Bundle Size Testing
```javascript
// tests/bundle-size.test.js
const { readFileSync } = require('fs')
const { join } = require('path')

test('bundle size is under limit', () => {
  const stats = JSON.parse(
    readFileSync(join(__dirname, '../.next/build-stats.json'))
  )
  
  const mainBundle = stats.bundles.find(b => b.name === 'main')
  expect(mainBundle.size).toBeLessThan(200000) // 200KB
})
```

## Implementation Timeline

### Week 1
- Set up Vitest/Jest
- Write unit tests for existing components
- Set up coverage reporting

### Week 2
- Add integration tests
- Set up MSW for API mocking
- Create test data factories

### Week 3
- Expand E2E tests
- Add performance tests
- Set up CI/CD pipeline

### Week 4
- Achieve 80% coverage
- Documentation
- Team training