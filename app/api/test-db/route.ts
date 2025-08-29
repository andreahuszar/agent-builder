import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    // Create a test record
    const test = await prisma.testMigration.create({
      data: {
        name: 'Test Connection',
        value: new Date().toISOString(),
      },
    })
    
    // Count total records
    const count = await prisma.testMigration.count()
    
    // Get all test records (limit to last 5)
    const records = await prisma.testMigration.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
    })
    
    return NextResponse.json({
      success: true,
      message: 'Database connected successfully!',
      test,
      totalRecords: count,
      recentRecords: records,
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
    // Clear all test records
    const deleted = await prisma.testMigration.deleteMany()
    
    return NextResponse.json({ 
      success: true, 
      message: 'Test records cleared',
      deletedCount: deleted.count,
    })
  } catch (error) {
    console.error('Database delete error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to delete test records',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, value } = body
    
    // Create a custom test record
    const test = await prisma.testMigration.create({
      data: {
        name: name || 'Custom Test',
        value: value || `Test at ${new Date().toLocaleString()}`,
      },
    })
    
    return NextResponse.json({
      success: true,
      message: 'Test record created',
      record: test,
    })
  } catch (error) {
    console.error('Database create error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to create test record',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}