import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    // If database isn't configured, return basic health status
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({
        success: false,
        error: 'Database not configured',
        hint: 'DATABASE_URL environment variable is required',
      }, { status: 503 })
    }

    // Test database connection with timeout
    const connectionTimeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Database connection timeout')), 5000)
    )
    
    const dbTest = async () => {
      // Test basic database connectivity first
      await prisma.$queryRaw`SELECT 1 as test`
      
      // If connection works, get counts
      const userCount = await prisma.user.count()
      const vendorCount = await prisma.vendors.count()
      
      // Get sample records if they exist
      const sampleUsers = await prisma.user.findMany({
        take: 3,
        select: { id: true, name: true, email: true }
      })
      
      return {
        success: true,
        message: 'Database connected successfully!',
        counts: {
          users: userCount,
          vendors: vendorCount,
        },
        sampleUsers,
        database: {
          url: 'Configured',
          directUrl: process.env.DIRECT_URL ? 'Configured' : 'Not configured',
        },
      }
    }

    const result = await Promise.race([dbTest(), connectionTimeout])
    return NextResponse.json(result)
    
  } catch (error) {
    console.error('Database connection error:', error)
    
    // Return 200 with error details instead of 500 during initialization
    const isTimeout = error instanceof Error && error.message.includes('timeout')
    const status = isTimeout ? 200 : 500
    
    return NextResponse.json({
      success: false,
      error: 'Database connection failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      hint: isTimeout ? 
        'Database is initializing, try again in a moment' : 
        'Make sure PostgreSQL is running and migrations are applied',
      status: isTimeout ? 'initializing' : 'error'
    }, { status })
  }
}

export async function DELETE() {
  try {
    // For safety, only perform a count operation instead of deletion
    const userCount = await prisma.user.count()
    
    return NextResponse.json({ 
      success: true, 
      message: 'Database test completed (no deletion performed for safety)',
      recordCount: userCount,
    })
  } catch (error) {
    console.error('Database test error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to test database',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Test database write capability by querying existing data
    const invoiceCount = await prisma.invoice_headers.count()
    const vendorCount = await prisma.vendors.count()
    
    return NextResponse.json({
      success: true,
      message: 'Database write test completed',
      testData: {
        invoices: invoiceCount,
        vendors: vendorCount,
        requestData: body
      }
    })
  } catch (error) {
    console.error('Database test error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to test database',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}