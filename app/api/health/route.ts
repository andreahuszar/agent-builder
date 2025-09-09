import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Simple health check that doesn't depend on database
    return NextResponse.json({
      status: 'ok',
      message: 'Server is running',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    })
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: 'Health check failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}