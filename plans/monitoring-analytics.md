# Monitoring & Analytics Plan

## Overview
Implement comprehensive monitoring, error tracking, and analytics to ensure application health and gain insights into user behavior.

## 1. Error Tracking with Sentry

### Setup
```typescript
// lib/monitoring/sentry.ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  beforeSend(event, hint) {
    // Filter out sensitive data
    if (event.request?.cookies) {
      delete event.request.cookies
    }
    return event
  },
})
```

### Error Boundary Integration
```tsx
// app/components/ErrorBoundary.tsx
import * as Sentry from '@sentry/nextjs'

class ErrorBoundary extends React.Component {
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    Sentry.withScope((scope) => {
      scope.setExtras(errorInfo)
      Sentry.captureException(error)
    })
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorFallback />
    }
    return this.props.children
  }
}
```

### Custom Error Context
```typescript
// lib/monitoring/error-context.ts
export const captureError = (error: Error, context: ErrorContext) => {
  Sentry.withScope((scope) => {
    scope.setTag('component', context.component)
    scope.setContext('invoice', {
      id: context.invoiceId,
      status: context.invoiceStatus,
    })
    scope.setUser({
      id: context.userId,
      email: context.userEmail,
    })
    Sentry.captureException(error)
  })
}
```

## 2. Performance Monitoring

### Web Vitals Tracking
```typescript
// app/components/WebVitals.tsx
import { useReportWebVitals } from 'next/web-vitals'

export function WebVitals() {
  useReportWebVitals((metric) => {
    const body = {
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      id: metric.id,
    }
    
    // Send to analytics
    sendToAnalytics(body)
    
    // Log poor performance
    if (metric.rating === 'poor') {
      console.warn(`Poor ${metric.name} performance:`, metric.value)
      Sentry.captureMessage(`Poor ${metric.name}: ${metric.value}`, 'warning')
    }
  })
}
```

### Custom Performance Metrics
```typescript
// lib/monitoring/performance.ts
export const measurePerformance = (name: string, fn: () => void) => {
  const startMark = `${name}-start`
  const endMark = `${name}-end`
  const measureName = `${name}-duration`
  
  performance.mark(startMark)
  fn()
  performance.mark(endMark)
  performance.measure(measureName, startMark, endMark)
  
  const measure = performance.getEntriesByName(measureName)[0]
  
  // Send to monitoring
  sendMetric({
    name: measureName,
    value: measure.duration,
    unit: 'milliseconds',
    tags: { component: name }
  })
  
  // Clean up
  performance.clearMarks(startMark)
  performance.clearMarks(endMark)
  performance.clearMeasures(measureName)
  
  return measure.duration
}
```

### Resource Timing
```typescript
// lib/monitoring/resource-timing.ts
export const monitorResources = () => {
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.entryType === 'resource') {
        const resource = entry as PerformanceResourceTiming
        
        // Log slow resources
        if (resource.duration > 1000) {
          console.warn('Slow resource:', {
            name: resource.name,
            duration: resource.duration,
            size: resource.transferSize,
            type: resource.initiatorType,
          })
        }
      }
    }
  })
  
  observer.observe({ entryTypes: ['resource'] })
}
```

## 3. User Analytics

### Privacy-First Analytics with Plausible/Umami
```typescript
// lib/analytics/plausible.ts
export const trackEvent = (name: string, props?: Record<string, any>) => {
  if (typeof window !== 'undefined' && window.plausible) {
    window.plausible(name, { props })
  }
}

export const trackPageView = (url: string) => {
  if (typeof window !== 'undefined' && window.plausible) {
    window.plausible('pageview', {
      props: {
        url,
        referrer: document.referrer,
      }
    })
  }
}
```

### Custom Event Tracking
```typescript
// lib/analytics/events.ts
export const analyticsEvents = {
  // Navigation events
  moduleNavigated: (module: string) => 
    trackEvent('module_navigated', { module }),
  
  // Invoice events
  invoiceViewed: (invoiceId: string) => 
    trackEvent('invoice_viewed', { invoice_id: invoiceId }),
  
  invoiceApproved: (invoiceId: string, amount: number) =>
    trackEvent('invoice_approved', { invoice_id: invoiceId, amount }),
  
  // Search events
  searchPerformed: (query: string, resultCount: number) =>
    trackEvent('search_performed', { query, result_count: resultCount }),
  
  // User actions
  filterApplied: (filterType: string, value: string) =>
    trackEvent('filter_applied', { filter_type: filterType, value }),
}
```

### User Behavior Tracking
```typescript
// lib/analytics/behavior.ts
export const trackUserBehavior = () => {
  // Session duration
  let sessionStart = Date.now()
  
  window.addEventListener('beforeunload', () => {
    const duration = Date.now() - sessionStart
    trackEvent('session_ended', { duration_seconds: duration / 1000 })
  })
  
  // Interaction tracking
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement
    const tracking = target.dataset.track
    
    if (tracking) {
      trackEvent('element_clicked', { element: tracking })
    }
  })
  
  // Scroll depth
  let maxScroll = 0
  window.addEventListener('scroll', throttle(() => {
    const scrollPercent = (window.scrollY / document.body.scrollHeight) * 100
    if (scrollPercent > maxScroll) {
      maxScroll = scrollPercent
      if (scrollPercent > 25 && scrollPercent <= 50) {
        trackEvent('scroll_depth', { depth: '25%' })
      } else if (scrollPercent > 50 && scrollPercent <= 75) {
        trackEvent('scroll_depth', { depth: '50%' })
      } else if (scrollPercent > 75) {
        trackEvent('scroll_depth', { depth: '75%' })
      }
    }
  }, 1000))
}
```

## 4. Application Health Monitoring

### Health Check Endpoints
```typescript
// app/api/health/route.ts
export async function GET() {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    storage: await checkStorage(),
    memory: process.memoryUsage(),
    uptime: process.uptime(),
  }
  
  const isHealthy = Object.values(checks).every(
    check => check !== false
  )
  
  return Response.json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    checks,
  }, {
    status: isHealthy ? 200 : 503,
  })
}

async function checkDatabase() {
  try {
    await db.query('SELECT 1')
    return true
  } catch {
    return false
  }
}
```

### Uptime Monitoring
```typescript
// lib/monitoring/uptime.ts
export const setupUptimeMonitoring = () => {
  // Ping monitoring service
  setInterval(async () => {
    try {
      await fetch(process.env.UPTIME_WEBHOOK_URL!, {
        method: 'POST',
        body: JSON.stringify({
          service: 'invoice-processing',
          timestamp: new Date().toISOString(),
          status: 'up',
        }),
      })
    } catch (error) {
      console.error('Failed to ping uptime service:', error)
    }
  }, 60000) // Every minute
}
```

## 5. Custom Dashboards

### Metrics Dashboard
```typescript
// app/admin/metrics/page.tsx
export default function MetricsDashboard() {
  const metrics = useMetrics()
  
  return (
    <div className="grid grid-cols-2 gap-4">
      <MetricCard
        title="Response Time"
        value={metrics.avgResponseTime}
        unit="ms"
        trend={metrics.responseTimeTrend}
      />
      <MetricCard
        title="Error Rate"
        value={metrics.errorRate}
        unit="%"
        trend={metrics.errorRateTrend}
      />
      <MetricCard
        title="Active Users"
        value={metrics.activeUsers}
        trend={metrics.userTrend}
      />
      <MetricCard
        title="API Calls"
        value={metrics.apiCalls}
        unit="/min"
        trend={metrics.apiCallTrend}
      />
    </div>
  )
}
```

### Real-time Monitoring
```typescript
// lib/monitoring/realtime.ts
import { io } from 'socket.io-client'

export const setupRealtimeMonitoring = () => {
  const socket = io(process.env.NEXT_PUBLIC_MONITORING_URL!)
  
  socket.on('metrics', (data) => {
    updateDashboard(data)
  })
  
  socket.on('alert', (alert) => {
    showAlert(alert)
  })
  
  return socket
}
```

## 6. Logging Infrastructure

### Structured Logging
```typescript
// lib/logging/logger.ts
import winston from 'winston'

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
      ),
    }),
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
    }),
  ],
})

// Request logging middleware
export const requestLogger = (req: Request) => {
  logger.info('Request received', {
    method: req.method,
    url: req.url,
    headers: req.headers,
    timestamp: new Date().toISOString(),
  })
}
```

## 7. Alert Configuration

### Alert Rules
```typescript
// lib/monitoring/alerts.ts
interface AlertRule {
  name: string
  condition: () => boolean | Promise<boolean>
  message: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  channels: ('email' | 'slack' | 'pagerduty')[]
}

const alertRules: AlertRule[] = [
  {
    name: 'high_error_rate',
    condition: async () => {
      const errorRate = await getErrorRate()
      return errorRate > 5 // 5%
    },
    message: 'Error rate exceeded 5%',
    severity: 'high',
    channels: ['slack', 'email'],
  },
  {
    name: 'slow_response_time',
    condition: async () => {
      const avgTime = await getAvgResponseTime()
      return avgTime > 1000 // 1 second
    },
    message: 'Average response time exceeded 1 second',
    severity: 'medium',
    channels: ['slack'],
  },
]

export const checkAlerts = async () => {
  for (const rule of alertRules) {
    if (await rule.condition()) {
      await sendAlert(rule)
    }
  }
}
```

## 8. Database Query Monitoring

### Query Performance Tracking
```typescript
// lib/monitoring/database.ts
export const monitorQuery = async <T>(
  queryName: string,
  query: () => Promise<T>
): Promise<T> => {
  const start = performance.now()
  
  try {
    const result = await query()
    const duration = performance.now() - start
    
    // Log slow queries
    if (duration > 100) {
      logger.warn('Slow query detected', {
        query: queryName,
        duration,
      })
    }
    
    // Track metrics
    trackMetric('db.query.duration', duration, {
      query: queryName,
    })
    
    return result
  } catch (error) {
    trackMetric('db.query.error', 1, {
      query: queryName,
      error: error.message,
    })
    throw error
  }
}
```

## 9. A/B Testing Framework

### Feature Flags
```typescript
// lib/experiments/flags.ts
export const featureFlags = {
  newInvoiceFlow: {
    enabled: process.env.ENABLE_NEW_INVOICE_FLOW === 'true',
    percentage: 50, // Roll out to 50% of users
  },
  advancedSearch: {
    enabled: true,
    percentage: 100,
  },
}

export const isFeatureEnabled = (
  feature: keyof typeof featureFlags,
  userId: string
): boolean => {
  const flag = featureFlags[feature]
  
  if (!flag.enabled) return false
  
  // Consistent bucketing based on user ID
  const hash = hashString(userId + feature)
  const bucket = hash % 100
  
  return bucket < flag.percentage
}
```

## 10. Implementation Checklist

### Week 1
- [ ] Set up Sentry error tracking
- [ ] Implement Web Vitals monitoring
- [ ] Create health check endpoints

### Week 2
- [ ] Add privacy-first analytics
- [ ] Implement custom event tracking
- [ ] Set up structured logging

### Week 3
- [ ] Create monitoring dashboard
- [ ] Configure alerts
- [ ] Add database query monitoring

### Week 4
- [ ] Implement A/B testing framework
- [ ] Set up real-time monitoring
- [ ] Document monitoring practices

## Success Metrics

- Error rate < 1%
- Average response time < 200ms
- 99.9% uptime
- Web Vitals scores all "Good"
- Alert response time < 5 minutes
- Query performance P99 < 100ms