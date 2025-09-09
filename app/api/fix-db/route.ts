import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    console.log('🔧 Attempting to fix database...');
    
    // Try to add the missing column using raw SQL
    await prisma.$executeRawUnsafe(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 
          FROM information_schema.columns 
          WHERE table_name = 'invoice_headers' 
          AND column_name = 'gr_numbers_cached'
        ) THEN
          ALTER TABLE invoice_headers 
          ADD COLUMN gr_numbers_cached text[] DEFAULT '{}' NOT NULL;
          RAISE NOTICE 'Added gr_numbers_cached column';
        END IF;
      END $$;
    `);
    
    // Create index if it doesn't exist
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_invoice_headers_gr_numbers_cached 
      ON invoice_headers USING GIN (gr_numbers_cached);
    `);
    
    // Verify the column exists
    const result = await prisma.$queryRaw<Array<{column_name: string, data_type: string}>>`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'invoice_headers' 
      AND column_name = 'gr_numbers_cached'
    `;
    
    return NextResponse.json({
      success: true,
      message: 'Database fixed successfully',
      column_exists: result.length > 0,
      result
    });
    
  } catch (error) {
    console.error('Error fixing database:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fix database',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}