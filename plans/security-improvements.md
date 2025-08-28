# Security Improvements Plan

## Overview
Implement comprehensive security measures to protect against common web vulnerabilities and ensure data protection.

## 1. Content Security Policy (CSP)

### Implementation
```typescript
// middleware.ts
import { NextResponse } from 'next/server'

export function middleware(request: Request) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic';
    style-src 'self' 'nonce-${nonce}';
    img-src 'self' blob: data:;
    font-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    block-all-mixed-content;
    upgrade-insecure-requests;
  `.replace(/\s{2,}/g, ' ').trim()
  
  const response = NextResponse.next()
  response.headers.set('Content-Security-Policy', cspHeader)
  response.headers.set('x-nonce', nonce)
  
  return response
}
```

### Nonce Usage in Components
```tsx
// app/layout.tsx
export default function RootLayout({ children, nonce }) {
  return (
    <html>
      <head>
        <script nonce={nonce} src="/analytics.js" />
        <style nonce={nonce}>{`body { margin: 0; }`}</style>
      </head>
      <body>{children}</body>
    </html>
  )
}
```

## 2. Security Headers

### Essential Headers
```typescript
// middleware.ts additions
const securityHeaders = {
  'X-DNS-Prefetch-Control': 'on',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
}

Object.entries(securityHeaders).forEach(([key, value]) => {
  response.headers.set(key, value)
})
```

## 3. Input Validation & Sanitization

### Schema Validation with Zod
```typescript
// lib/validation/invoice.schema.ts
import { z } from 'zod'

export const invoiceSchema = z.object({
  invoiceNumber: z.string()
    .min(1)
    .max(50)
    .regex(/^[A-Z0-9-]+$/),
  vendor: z.string()
    .min(1)
    .max(100)
    .transform(str => str.trim()),
  amount: z.number()
    .positive()
    .max(1000000),
  date: z.date()
    .max(new Date()),
  description: z.string()
    .max(500)
    .transform(str => sanitizeHtml(str))
})

export type Invoice = z.infer<typeof invoiceSchema>
```

### XSS Prevention
```typescript
// lib/security/sanitize.ts
import DOMPurify from 'isomorphic-dompurify'

export const sanitizeHtml = (dirty: string): string => {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a'],
    ALLOWED_ATTR: ['href']
  })
}

export const escapeHtml = (unsafe: string): string => {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}
```

## 4. CSRF Protection

### Token Generation
```typescript
// lib/security/csrf.ts
import { randomBytes } from 'crypto'

export const generateCSRFToken = (): string => {
  return randomBytes(32).toString('hex')
}

export const validateCSRFToken = (
  token: string, 
  sessionToken: string
): boolean => {
  return token === sessionToken && token.length === 64
}
```

### Implementation in Forms
```tsx
// app/components/SecureForm.tsx
const SecureForm = () => {
  const [csrfToken] = useState(() => generateCSRFToken())
  
  return (
    <form onSubmit={handleSubmit}>
      <input type="hidden" name="csrf_token" value={csrfToken} />
      {/* Other form fields */}
    </form>
  )
}
```

## 5. Authentication & Authorization

### JWT Implementation
```typescript
// lib/auth/jwt.ts
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET!
const JWT_EXPIRES_IN = '7d'

export const signToken = (payload: TokenPayload) => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    algorithm: 'HS256'
  })
}

export const verifyToken = (token: string): TokenPayload => {
  return jwt.verify(token, JWT_SECRET) as TokenPayload
}
```

### Session Management
```typescript
// lib/auth/session.ts
import { cookies } from 'next/headers'

export const createSession = async (userId: string) => {
  const token = signToken({ userId, role: user.role })
  
  cookies().set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/'
  })
}
```

### Role-Based Access Control
```typescript
// middleware/auth.ts
export const requireRole = (roles: string[]) => {
  return async (req: Request) => {
    const session = await getSession(req)
    
    if (!session || !roles.includes(session.role)) {
      throw new UnauthorizedError('Insufficient permissions')
    }
    
    return session
  }
}

// Usage in API routes
export async function POST(req: Request) {
  const session = await requireRole(['admin', 'manager'])(req)
  // Handle request
}
```

## 6. Rate Limiting

### Implementation
```typescript
// lib/security/rate-limit.ts
import { LRUCache } from 'lru-cache'

const tokenCache = new LRUCache<string, number[]>({
  max: 500,
  ttl: 60000 // 1 minute
})

export const rateLimit = async (
  request: Request, 
  limit: number = 10
) => {
  const ip = request.headers.get('x-forwarded-for') || 'unknown'
  const tokenCount = tokenCache.get(ip) || []
  const now = Date.now()
  const windowStart = now - 60000
  
  const recentRequests = tokenCount.filter(t => t > windowStart)
  
  if (recentRequests.length >= limit) {
    throw new Error('Rate limit exceeded')
  }
  
  recentRequests.push(now)
  tokenCache.set(ip, recentRequests)
}
```

## 7. File Upload Security

### Validation
```typescript
// lib/security/file-upload.ts
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png']
const MAX_SIZE = 5 * 1024 * 1024 // 5MB

export const validateFile = (file: File) => {
  // Check file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Invalid file type')
  }
  
  // Check file size
  if (file.size > MAX_SIZE) {
    throw new Error('File too large')
  }
  
  // Check file extension
  const extension = file.name.split('.').pop()?.toLowerCase()
  const validExtensions = ['pdf', 'jpg', 'jpeg', 'png']
  
  if (!extension || !validExtensions.includes(extension)) {
    throw new Error('Invalid file extension')
  }
  
  // Scan for malware (integrate with service)
  // await scanFile(file)
}
```

## 8. Secrets Management

### Environment Variables
```typescript
// lib/config/secrets.ts
const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'ENCRYPTION_KEY',
  'API_KEY'
] as const

export const validateEnv = () => {
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`)
    }
  }
}

// Validate on startup
validateEnv()
```

### Encryption for Sensitive Data
```typescript
// lib/security/encryption.ts
import crypto from 'crypto'

const algorithm = 'aes-256-gcm'
const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex')

export const encrypt = (text: string) => {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(algorithm, key, iv)
  
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  
  const authTag = cipher.getAuthTag()
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  }
}

export const decrypt = (encryptedData: EncryptedData) => {
  const decipher = crypto.createDecipheriv(
    algorithm,
    key,
    Buffer.from(encryptedData.iv, 'hex')
  )
  
  decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'))
  
  let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  
  return decrypted
}
```

## 9. API Security

### API Key Management
```typescript
// middleware/api-auth.ts
export const validateApiKey = async (request: Request) => {
  const apiKey = request.headers.get('x-api-key')
  
  if (!apiKey) {
    throw new Error('Missing API key')
  }
  
  const hashedKey = crypto
    .createHash('sha256')
    .update(apiKey)
    .digest('hex')
  
  const validKey = await db.apiKey.findUnique({
    where: { hashedKey }
  })
  
  if (!validKey || validKey.expiresAt < new Date()) {
    throw new Error('Invalid or expired API key')
  }
  
  // Log API usage
  await db.apiUsage.create({
    data: {
      apiKeyId: validKey.id,
      endpoint: request.url,
      timestamp: new Date()
    }
  })
}
```

## 10. Security Monitoring

### Audit Logging
```typescript
// lib/security/audit.ts
interface AuditLog {
  userId: string
  action: string
  resource: string
  timestamp: Date
  ip: string
  userAgent: string
  success: boolean
  metadata?: Record<string, any>
}

export const auditLog = async (log: AuditLog) => {
  await db.auditLog.create({ data: log })
  
  // Alert on suspicious activity
  if (isSuspicious(log)) {
    await alertSecurityTeam(log)
  }
}
```

### Security Checks Checklist
- [ ] All inputs validated and sanitized
- [ ] CSP headers configured
- [ ] HTTPS enforced
- [ ] Sensitive data encrypted
- [ ] Authentication required for protected routes
- [ ] Rate limiting implemented
- [ ] Security headers set
- [ ] CSRF protection enabled
- [ ] File uploads validated
- [ ] API keys secured
- [ ] Audit logging enabled
- [ ] Dependencies regularly updated
- [ ] Security testing automated

## Implementation Priority

1. **Critical** (Week 1)
   - Security headers
   - Input validation
   - XSS prevention

2. **High** (Week 2)
   - Authentication
   - CSRF protection
   - Rate limiting

3. **Medium** (Week 3)
   - File upload security
   - API security
   - Encryption

4. **Low** (Week 4)
   - Audit logging
   - Advanced monitoring
   - Security automation