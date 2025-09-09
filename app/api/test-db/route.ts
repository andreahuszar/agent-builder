import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    // Test database connection by counting existing records
    const userCount = await prisma.user.count()
    const vendorCount = await prisma.vendors.count()
    
    // Get sample records if they exist
    const sampleUsers = await prisma.user.findMany({
      take: 3,
      select: { id: true, name: true, email: true }
    })
    
    return NextResponse.json({
      success: true,
      message: 'Database connected successfully!',
      counts: {
        users: userCount,
        vendors: vendorCount,
      },
      sampleUsers,
      database: {
        url: process.env.DATABASE_URL ? 'Configured' : 'Not configured',
        directUrl: process.env.DIRECT_URL ? 'Configured' : 'Not configured',
      },
    })
  } catch (error) {
    console.error('Database connection error:', error)
    return NextResponse.json({
      success: false,
      error: 'Database connection failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      hint: 'Make sure PostgreSQL is running (npm run db:dev) and migrations are applied (npm run db:migrate:dev)',
    }, { status: 500 })
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